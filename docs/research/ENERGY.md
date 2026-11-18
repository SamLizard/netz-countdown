# Energy use of the countdown screen (iPhone, OLED, Home Screen app)

Scenario: the app stays in the foreground with the screen kept on by Wake Lock for 10 to 60 minutes before sunrise.
Current code: `useNow()` ticks every 250 ms, `CountdownDisplay.vue` has `transition: background-color 1s` and `color 1s`,
the number is `font-weight: 800` at up to `16rem`, and colors come from `colorFor()` (`hsl(..., 70%, 50%)` on black).

## 1. What drains the battery, ranked

| Rank | Cause | Impact here | Notes |
|---|---|---|---|
| 1 | Screen on + brightness | Dominant | The display is the largest consumer while the screen is on. Only the user can set brightness. |
| 2 | Lit pixel area (colored background vs black) | Large | On OLED a black pixel is off. A full colored background lights 100% of pixels; black mode lights only the digits (rough estimate: 5-15% of the screen with the current bold, wide number). |
| 3 | Color and lightness of lit pixels | Medium | White costs the most; at full brightness white drew close to 2x other colors on a Dell OLED panel [1]. Blue subpixels are the least efficient; red/green cost less for the same perceived brightness [2][3]. Lower lightness = less current. |
| 4 | Continuous CSS transitions | Small to medium | Inside the warning window the color string changes every second, so a 1 s transition restarts every second: the page animates non-stop for 8 minutes. The compositor redraws at the display rate, and ProMotion iPhones cannot drop to a low refresh rate for static content [4]. In colored-background mode this repaints the whole screen. |
| 5 | Timer wakeups (250 ms) | Small | 4 JS wakeups per second, each recomputing `resolveTarget()` and the clocks. The DOM only changes once per second, so 3 of 4 ticks do nothing useful. Browsers batch timers to save power for this reason [5][6]. |
| 6 | Vue re-renders, font size | Negligible (CPU) | Vue patches text nodes only when the string changes. Font size and weight matter only through lit area (rank 2). |

Numbers from studies: Purdue measured dark mode saving 39-47% of phone power at 100% brightness, but only 3-9% at
30-50% brightness [7][8]. So brightness matters more than anything the app does, and dark pixels matter most when
brightness is high. Our screen is almost entirely black in black mode, so the savings are larger than for a typical
dark-mode app with gray surfaces.

iOS facts that matter:
- A web page cannot change screen brightness. There is no Web API for it.
- Wake Lock works in Home Screen apps since iOS 18.4 [9]. Its cost is simply "the screen stays on" [10]. The alternative
  (auto-lock) saves the most power but defeats the purpose. Keep the lock, but make what is shown cheap.
- When the app is hidden or the phone locks, iOS suspends JS. No ticking happens, but the code must resync on return.
- In Low Power Mode, Safari delays/coalesces timers and caps `requestAnimationFrame` (and CSS animations) at 30 fps [11][12].
  Timers may fire late, so always compute from `Date.now()`, never count ticks.
- I found no source saying Home Screen apps get extra foreground timer throttling beyond Low Power Mode.

## 2. Recommendations, ranked by impact / effort

| # | Change | Impact | Effort |
|---|---|---|---|
| 1 | Default to black background (OLED mode). Keep colored background as an option. | High | Trivial |
| 2 | Hidden digits when far: grey `__:__` placeholder until the last N minutes (planned UX). Use a dark grey (e.g. `#333`) and a thin weight. | High | Low |
| 3 | Remove the `background-color`/`color` transitions, or keep only a short one (≤ 200 ms). Also quantize `colorFor()` to about 16 steps so the color changes rarely. | Medium | Trivial |
| 4 | Dim colors on black: lightness 50% → 30-35%, no pure white text; labels at `rgba(255,255,255,0.5)` or grey. Prefer green/red/amber, avoid blue and white. | Medium | Trivial |
| 5 | Thinner number: `font-weight` 800 → 300-400 cuts lit pixels of the digits by roughly 40-50% (estimate, not measured). Keep size for readability. | Medium | Trivial |
| 6 | Adaptive refresh aligned to boundaries: 60 s (or 10 s) when far, 1 s when near. Wake exactly when the near window starts. | Small | Low |
| 7 | Pause ticking when `document.visibilityState === 'hidden'`, tick at once on `visible`. | Small (iOS already suspends) | Trivial |
| 8 | Show a one-time tip: lower brightness, turn off Auto-Brightness if it ramps up, use Reduce White Point and Night Shift, Low Power Mode [13][14]. | High (user side) | Low |

`requestAnimationFrame` vs timers: do not use rAF for a 1 Hz display. rAF runs at the display rate (60-120 Hz) and
keeps the display pipeline busy. A `setTimeout` chain aligned to the next boundary is the right tool.

## 3. Settings UX (proposal)

Keep it to three controls in the existing settings dialog (each string via `t()`):

| Setting | Choices | Default |
|---|---|---|
| Show digits | Always / Only in the last N minutes | Only in the last N minutes, N = warning window (8 min) |
| Refresh when far from sunrise | Every second / Every 10 s / Every minute | Every minute |
| Dim display | On / Off | On in black-background mode |

Rules: inside the warning window the refresh is always every second. "Refresh when far" applies only before that.
Below the controls, a short tip: "To save battery, lower the screen brightness. Low Power Mode also helps."

## 4. Implementation sketch: adaptive `useNow`

Idea: the caller passes a function that returns the step (ms) for a given time, and the time of the next mode change
(start of the near window). The delay aligns to the target, so the displayed remaining seconds change exactly on time.

```ts
import { onMounted, onUnmounted, ref, type Ref } from 'vue';

export interface TickPolicy {
  target: Ref<Date | null>;
  nearSeconds: Ref<number>;   // warning window, 1 s refresh inside it
  farStepMs: Ref<number>;     // 1000 | 10000 | 60000
}

const SLACK_MS = 20; // fire just after the boundary, so ceil() gives the new value

/** Pure: next delay from remaining ms. Exported for unit tests (could live in services/). */
export function nextDelay(msLeft: number, nearMs: number, farStepMs: number): number {
  const step = msLeft <= nearMs ? 1000 : farStepMs;
  const mod = ((msLeft % step) + step) % step;   // ms until remaining hits a multiple of step
  let delay = mod === 0 ? step : mod;
  if (msLeft > nearMs) delay = Math.min(delay, msLeft - nearMs); // wake when near window opens
  return Math.max(delay, 0) + SLACK_MS;
}

export function useAdaptiveNow(policy: TickPolicy) {
  const now = ref(new Date());
  let timer: number | undefined;

  function schedule() {
    window.clearTimeout(timer);
    if (document.visibilityState !== 'visible') return;
    const target = policy.target.value;
    const msLeft = target ? target.getTime() - Date.now() : 1000 - (Date.now() % 1000);
    const delay = nextDelay(msLeft, policy.nearSeconds.value * 1000, policy.farStepMs.value);
    timer = window.setTimeout(tick, delay);
  }

  function tick() {
    now.value = new Date();   // always real time; late timers just catch up
    schedule();
  }

  const onVisibility = () => (document.visibilityState === 'visible' ? tick() : window.clearTimeout(timer));

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility);
    tick();
  });
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.clearTimeout(timer);
  });

  return { now, refresh: tick }; // call refresh() when settings or target change
}
```

Notes:
- Negative `msLeft` (after sunrise) works: the modulo keeps alignment to the target, and the near branch applies.
- `HomeView` should `watch` the target time and settings and call `refresh()`.
- Since `target` depends on `now` (`resolveTarget`), pass a computed of the target date; the loop is fine because it only
  reschedules.

Display format per refresh rate:
- Far + placeholder (default): show `__:__` in dark grey. The bottom "now" clock shows `HH:MM` (no seconds) when the step
  is 60 s, otherwise `HH:MM:SS`.
- Far + digits shown + 60 s step: show minutes rounded up, e.g. `23 min` or `23:--`. Never show seconds that are not live.
- Far + digits shown + 10 s step: show `MM:SS` rounded up to the next 10 s (`12:40`); alignment to the target keeps it
  consistent, the value just jumps by 10.
- Near window: `MM:SS` every second, as today.
Formatting belongs in `services/countdown.ts` (e.g. `formatDuration(seconds, stepSeconds)`), per STANDARDS.md.

## Sources

1. [Notebookcheck: Dell XPS 15 OLED power, white almost 2x other colors](https://www.notebookcheck.net/Dell-XPS-15-7590-OLED-Power-Consumption-Measurements-White-Can-Be-Almost-Two-Times-More-Demanding-Than-Other-Colors.430835.0.html)
2. [Dong et al., Power-saving color transformation of GUIs on OLED displays (ISLPED 2009)](http://www.yecl.org/publications/dong09islped.pdf)
3. [Color-perception-guided display power reduction (blue LEDs cost more than red/green)](https://arxiv.org/pdf/2209.07610v2)
4. [ProMotion lowers refresh rate for static content](https://www.digitalcitizen.life/what-is-apple-promotion-display/)
5. [Chrome blog: timers batched once per second to reduce wakeups](https://developer.chrome.com/blog/background_tabs)
6. [WICG interventions: timers aligned/clamped to 1 s in Safari, Chrome, Firefox](https://github.com/WICG/interventions/issues/5)
7. [Purdue: dark mode may not save as much battery as you think](https://engineering.purdue.edu/ECE/News/2021/dark-mode-may-not-save-your-phones-battery-life-as-much-as-you-think-but-there-are-a-few-silver-linings)
8. [Notebookcheck summary of the Purdue numbers (39-47% vs 3-9%)](https://www.notebookcheck.net/New-research-challenges-the-theory-that-dark-mode-on-OLED-saves-battery-on-a-smartphone.553003.0.html)
9. [Progressier: Wake Lock fixed for installed PWAs in iOS 18.4](https://progressier.com/pwa-capabilities/screen-wake-lock)
10. [MDN: Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
11. [Popmotion: iOS throttles rAF to 30 fps in Low Power Mode](https://popmotion.io/blog/20180104-when-ios-throttles-requestanimationframe/)
12. [Stack Overflow: Low Power Mode detectable through delayed setInterval on iOS Safari](https://stackoverflow.com/posts/74651502/revisions)
13. [Apple: adjust brightness and color temperature (Auto-Brightness, Night Shift)](https://support.apple.com/en-my/109351)
14. [Apple: display settings, Reduce White Point](https://support.apple.com/guide/iphone/iph3e2e1fb0/ios)

Content from sources was rephrased for compliance with licensing restrictions.
