# Auto-dimming the screen (iPhone, Home Screen web app, OLED)

Question: can the app lower the screen brightness about 10 s after it opens (while Wake Lock keeps it on), and restore
normal brightness when the user leaves?

Short answer: the app cannot change the system brightness, and iOS Shortcuts cannot react to a Home Screen web app
opening or closing. The app can dim its own pixels, which on OLED saves most of the same power for the lit area.

## 1. Web APIs for screen brightness

- No browser ships an API to set or lower system brightness. There is no `screen.brightness` in Safari, Chrome or Firefox.
- The proposals only ever covered *raising* brightness (QR codes, face lighting): WICG Screen Brightness [1][2], and a
  "brightness mode" for Wake Lock in the W3C Devices and Sensors WG [3][4]. None reached a shipping browser, and none
  allowed dimming.
- WebKit (Safari) opposed the idea: users already have the Control Center slider [5]. On iOS every browser uses WebKit,
  so Chrome on iPhone has nothing either.
- Chrome on Android also has no such API (it stayed a proposal). Only native apps can do it.

## 2. Apple Shortcuts

- The App trigger ("When <app> is opened / closed") plus the "Set Brightness" action works for native apps [6][7].
- Home Screen web apps do **not** appear in the App trigger list. Shortcuts automations cannot fire when a PWA opens [8].
  This is unchanged on iOS 26: sites added to the Home Screen now open as web apps by default ("Open as Web App") [9][10],
  but they are still not apps for the automation system. iOS 27 notes mention no change [11].
- The "When app is closed" trigger also misfires on iOS 26.6 (opening Control Center counts as closing) [12].
- Workaround to *open dimmed*: a Shortcut on the Home Screen that runs "Set Brightness" and then opens the app. Opening
  the web app itself (not a Safari tab) from a Shortcut is not documented. Reports use the undocumented `webapp://` URL,
  which cannot pick between several web apps [8]. An `https://` "Open URL" usually opens Safari, where the app has no
  installed state; test before recommending it.
- Restoring brightness on leave: no trigger exists for "PWA closed". The realistic option is a time trigger: Shortcuts
  "Time of Day" automations support **Sunrise** with an offset [7], e.g. "Sunrise + 15 min → Set Brightness 60%".
- Auto-Brightness (Settings > Accessibility > Display & Text Size) keeps adjusting after "Set Brightness" when the
  ambient light changes [13][14]. Before dawn the room is dark, so it usually stays low, but it may rise as daylight comes.
- Focus modes cannot set brightness and cannot detect a web app either.

Verdict: a Shortcut recipe is possible but needs a separate launcher icon, cannot dim "after 10 s", and cannot restore
on leave. Document it as optional, not as the feature.

## 3. Dimming the content instead

- OLED power is roughly the sum of each subpixel's current, and each subpixel's power is close to linear in its emitted
  light [15][16]. Emitted light follows the sRGB gamma (about value^2.2), so halving the color value of the number cuts
  its pixel power to roughly 20-25% (estimate from the model, not measured on an iPhone).
- This is close to what lowering the system brightness does for those pixels. It does not cut the panel's fixed cost
  (driver, touch, refresh), which is why dark mode saves little at low brightness [17]. The screen is already mostly
  black, so the remaining gain is modest, but real at high brightness.
- It also makes the screen less glaring in a dark room, which is the main user benefit.
- Implementation cost: change the number's `color` (lower HSL lightness) or set `opacity` on the number element only.
  Both are one cheap repaint of a small area. Avoid `filter: brightness()` on a full-screen wrapper: it adds a filter
  pass over a full-screen layer on every frame that changes, for no benefit on a black page [18]. A one-time fade
  (≤ 300 ms) is fine; it is not a continuous animation (STANDARDS.md, Battery).

## 4. Recommendation

Implement now, as a setting "Dim after 10 s" (default On in black-background mode):

1. After 10 s without a touch, render the number at a lower lightness, e.g. HSL lightness 50% → 20-25% (or opacity
   0.4). Secondary text goes to a darker grey too.
2. Any `pointerdown` un-dims for 10 s. Reuse the touch tracking in `useAutoSleep.ts` (`lastTouchMs`); put the pure rule
   (`isDimmed(nowMs, lastTouchMs, targetMs, settings)`) in `services/countdown.ts` so it is testable.
3. Un-dim automatically in the last N seconds before the target (suggest the last 60 s, configurable later), so the
   final count is easy to read. Keep the warning colors; dim them by lightness, not by hue.
4. On `visibilitychange` to visible, start undimmed (counts as a touch), matching "dims 10 s after opening".
5. Dim level: one slider or three steps (Light / Medium / Strong). Never below a level readable at minimum brightness.

Document for users (settings tip or README):

- "For the darkest screen, lower brightness in Control Center and consider turning off Auto-Brightness."
- Optional Shortcut: (a) new Shortcut "Netz dim": Set Brightness 20% → Open URLs `webapp://` (only if they have
  one web app), add it to the Home Screen. (b) Automation: Time of Day → Sunrise, +15 min → Set Brightness 60% →
  Run Immediately. Mark it as best-effort.

## Sources

1. [WICG proposals #17: Screen Brightness API](https://github.com/WICG/proposals/issues/17)
2. [WICG screen-brightness #1: element attribute to increase brightness](https://github.com/WICG/screen-brightness/issues/1)
3. [W3C screen-wake-lock: brightness mode explainer](https://github.com/w3c/screen-wake-lock/blob/gh-pages/brightness-mode-explainer.md)
4. [W3C screen-wake-lock #129: need maximum brightness mode](https://github.com/w3c/screen-wake-lock/issues/129)
5. [WebKit standards-positions #19: controlling screen brightness](https://github.com/WebKit/standards-positions/issues/19)
6. [Apple Community: per-app automation with "Is Opened"](https://discussions.apple.com/thread/255904640)
7. [Apple: setting triggers in Shortcuts (App, Time of Day/Sunrise)](https://support.apple.com/en-us/guide/shortcuts/apde31e9638b/ios)
8. [one sec: PWAs cannot trigger Shortcuts automations; `webapp://` workaround](https://tutorials.one-sec.app/en/articles/3312386)
9. [heise: iOS 26 opens Home Screen sites as web apps](https://www.heise.de/en/news/iOS-26-and-iPadOS-26-Changed-web-app-behaviour-on-the-home-screen-10749652.html)
10. [iDownloadBlog: "Open as Web App" toggle in iOS 26](https://www.idownloadblog.com/2025/06/17/apple-ios-26-safari-web-apps-home-screen-bookmarks/)
11. [Apple: new in iOS 27 (Shortcuts)](https://support.apple.com/en-gb/149045)
12. [Apple Developer Forums: "When App Is Closed" regression on iOS 26.6](https://developer.apple.com/forums/thread/841128)
13. [Apple: adjust screen brightness, Auto-Brightness](https://support.apple.com/en-nz/guide/iphone/iph60ba71065/ios)
14. [Automators: Set Brightness vs Auto-Brightness](https://talk.automators.fm/t/setting-brightness-in-shortcuts/8839)
15. [Dong et al., power-saving color transformation for OLED (ISLPED 2009)](http://www.yecl.org/publications/dong09islped.pdf)
16. [Linear fit of OLED R/G/B power vs intensity](https://www.researchgate.net/publication/311759321_Making_Image_More_Energy_Efficient_for_OLED_Smart_Devices)
17. [Purdue: dark mode savings drop at low brightness](https://engineering.purdue.edu/ECE/News/2021/dark-mode-may-not-save-your-phones-battery-life-as-much-as-you-think-but-there-are-a-few-silver-linings)
18. [Paint and compositing costs of filters vs opacity](https://github.com/Intense-Visions/harness-engineering/blob/main/agents/skills/claude-code/perf-paint-compositing/SKILL.md)

Content from sources was rephrased for compliance with licensing restrictions.
