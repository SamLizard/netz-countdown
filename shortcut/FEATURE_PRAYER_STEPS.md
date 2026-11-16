# Feature spec: prayer steps (milestone countdown)

Status: draft for review. Nothing here is implemented yet.
Base: `shortcut/countdown.html` (single countdown to visible sunrise, injected as `TARGET`).

## 1. Goal

Today the page counts down to one moment: visible sunrise. In a vatikin minyan the real question
is "am I on pace?", which depends on several earlier milestones (Kaddish, Hodu, Yishtabach, Shema...).
This feature replaces the single target with an ordered list of steps. The page shows one countdown
at a time, moves to the next step on its own, and lets the user look at other steps by swiping.

## 2. Glossary

| Term | Meaning |
|---|---|
| Netz / נץ החמה הנראה | Visible sunrise, the moment the sun's edge appears over the horizon at this location. |
| Vatikin / ותיקין | Praying so the Amida starts exactly at netz. |
| Shacharit / שחרית | Morning prayer. |
| Amida / עמידה | Silent standing prayer (Shemoneh Esrei). For vatikin it starts at netz. |
| Kaddish / קדיש | Prayer said by the chazan or mourners at fixed points in the service. |
| Hodu / הודו | Start of Pesukei Dezimra in Nusach Sefard / Edot Hamizrach. |
| Yishtabach / ישתבח | End of Pesukei Dezimra. |
| Shema / קריאת שמע | Recited before the Amida, with its blessings. |
| Chazan / שליח ציבור | Prayer leader. |
| Gabbai / גבאי | Person who organizes the minyan; here, the one who shares the config. |
| Zman / זמן | A halachic time of day (alot hashachar, talit/tefilin, netz, etc.), from `zmanimData.json`. |
| Anchor | The reference time a step is computed from (netz, another zman, or a fixed clock time). |

## 3. User stories

1. As a worshipper, I open the shortcut and see "Start Kaddish in 03:12" for the next step that has not passed yet.
2. When a step's time is reached, the display moves to the next step without any tap.
3. I swipe to look at the previous or next step, then come back to "live" with one tap, or automatically after a few seconds.
4. As the chazan, I see in color whether I am early, close, or late for the current step.
5. As a gabbai, I define the sequence once (labels, offsets) and share one JSON file with the community.
6. As a user, I import that file, and optionally adjust it for myself. Settings stay on my device.
7. Later: the app listens (on-device) and knows where we are in the prayer, and shows if we are ahead or behind.

## 4. Data model

```ts
type AnchorRef =
  | { type: 'zman'; id: string }          // a timeCatalog id, e.g. "visible_sunrise", "back:pose du talith et des tefilin"
  | { type: 'clock'; time: string }       // fixed local time "HH:MM" (24h)
  | { type: 'step'; stepId: string };     // relative to another step (optional, see open questions)

interface PrayerStep {
  id: string;                 // stable id, e.g. "kaddish"
  label: string;              // shown text, e.g. "תחילת קדיש"
  anchor: AnchorRef;
  offsetSeconds: number;      // negative = before anchor; 0 = at anchor
  warningSeconds?: number;    // green -> red fade window; default from config
  lateToleranceSeconds?: number; // how long to stay on this step after it passed (default 0)
  enabled?: boolean;          // default true
}

interface StepsConfig {
  schemaVersion: 1;
  name: string;               // e.g. "Vatikin – Beit Knesset X"
  nusach?: string;            // informational only
  defaults: { warningSeconds: number; lateToleranceSeconds: number; resumeLiveAfterSeconds: number };
  steps: PrayerStep[];        // display order; sorted by computed time at runtime
  updatedAt: string;          // ISO date, for import conflicts
}
```

Sample config. **All offsets are PLACEHOLDERS to be confirmed by the user / rav. They are not halachic guidance.**

```json
{
  "schemaVersion": 1,
  "name": "Vatikin sample (PLACEHOLDER offsets)",
  "nusach": "sefard",
  "defaults": { "warningSeconds": 120, "lateToleranceSeconds": 0, "resumeLiveAfterSeconds": 10 },
  "steps": [
    { "id": "talit",      "label": "טלית ותפילין",        "anchor": { "type": "zman", "id": "back:pose du talith et des tefilin" }, "offsetSeconds": 0 },
    { "id": "kaddish",    "label": "תחילת קדיש",          "anchor": { "type": "zman", "id": "visible_sunrise" }, "offsetSeconds": -2400 },
    { "id": "hodu",       "label": "הודו",                "anchor": { "type": "zman", "id": "visible_sunrise" }, "offsetSeconds": -2100 },
    { "id": "yishtabach", "label": "ישתבח",               "anchor": { "type": "zman", "id": "visible_sunrise" }, "offsetSeconds": -900 },
    { "id": "shema",      "label": "קריאת שמע",           "anchor": { "type": "zman", "id": "visible_sunrise" }, "offsetSeconds": -360 },
    { "id": "gaal",       "label": "גאל ישראל",           "anchor": { "type": "zman", "id": "visible_sunrise" }, "offsetSeconds": -30, "warningSeconds": 60 },
    { "id": "amida",      "label": "עמידה",               "anchor": { "type": "zman", "id": "visible_sunrise" }, "offsetSeconds": 0, "warningSeconds": 480 }
  ],
  "updatedAt": "2026-10-25"
}
```

Data notes from `zmanimData.json`:
- Not every zman exists every day (`count` in `timeCatalog`). Netz has a value daily; others may be missing.
- Formats vary: `"6:25:15"` (seconds), `"5:04½"` (½ = +30 s), `"5:27⁺"` (rounded; treat as the minute, or +1 min, to confirm).
- All values are 12h without AM/PM. Morning zmanim are AM; the parser needs a per-zman AM/PM rule (e.g. by concept).

## 5. Behaviour rules

**Computing the day's plan.** At load, for each enabled step: resolve anchor for today, add offset, get an absolute time.
Sort by time. Steps whose anchor cannot be resolved are kept in the list but marked "no time" and skipped by live mode.

**Live mode (default).** The current step is the first step whose time + `lateToleranceSeconds` is still in the future.
The big number counts down to it. When it is reached (and tolerance ends), the next step becomes current. No user action.

**After the last step.** Show "+MM:SS" in red after the last step, like today's after-netz display, until
end of window (open question: how long, then what).

**Opening late.** If the page opens after some steps passed, jump straight to the first future step. Passed steps
are still reachable by swiping and show "+MM:SS" (time since they passed).

**Swiping (browse mode).** Swipe left/right (respecting RTL: decide direction, see open questions) moves to the
previous/next step. The display shows that step's countdown or "+MM:SS" and a "not live" marker. Return to live
by tapping the marker, or automatically after `resumeLiveAfterSeconds` without touch. Live auto-advance keeps
running in the background while browsing.

**Day rollover.** The plan is for one date. If the page stays open past midnight (or past a configured end hour),
recompute for the new date. With the Shortcut/data-URL version, the plan only covers the injected date; the Shortcut
must inject all steps' times, or the whole day's zmanim, not just `TARGET`.

**Missing data.** No netz for today: same as now ("אין זמן נץ להיום", gray). A step with a missing anchor: shown
with "--:--" when browsed, skipped in live mode. Invalid config: fall back to the single netz countdown.

**Clock source.** Device clock, as today. Tick every 250 ms. Wake lock as today.

## 6. UI wireframe

Colored-background style (current):
```
+-----------------------------------+
|        ● live        2 / 7        |  <- live marker or "↩ חזרה לחי"; step index
|                                   |
|            תחילת קדיש             |  <- step label
|             03:12                 |  <- big countdown (or +00:45 when late)
|                                   |
|    ‹ טלית ותפילין    הודו ›        |  <- prev / next labels (small, dim)
|                                   |
|  יעד: 05:45:15   נץ: 06:25:15     |
|          עכשיו: 05:42:03          |
+-----------------------------------+
```
OLED style: same layout, black background, only the big number (and optionally the label) colored.
Everything else is dim gray. No large colored areas.

## 7. Color rules

Per step, with `r` = seconds remaining to the step's time and `w` = its `warningSeconds`:
- `r > w`: green.
- `0 < r <= w`: linear fade green to red (hue 120 to 0), as `colorFor()` does today with 8 min.
- `r <= 0` (late, still current because of tolerance, or browsed): red, number shown as "+MM:SS".
- Browse mode: same colors, plus reduced opacity or a "not live" marker so it is not mistaken for live.
- No data: gray.

Color is computed once as a hue/lightness value and applied either to `body` background (current style) or to
the number's text color (OLED style). A single setting `displayStyle: 'background' | 'oled'` picks the target.
In OLED style, use higher lightness (about 50%) so red and green stay readable on black.

Default `warningSeconds`: 8 min for the netz/Amida step (current behaviour); a shorter default for intermediate
steps, because steps may be only a few minutes apart (value to confirm).

Phase 3 hook: an optional `paceSeconds` (positive = ahead, negative = behind) can shift the hue. Without audio,
`paceSeconds` is undefined and only the clock rules above apply.

## 8. Edge cases

- Two steps with the same computed time: keep config order; show the first, advance after 0 s to the next.
- Steps out of order relative to config (e.g. talit after Kaddish on a given day): sort by time, warn in config UI.
- Gap between steps longer than an hour: countdown shows `H:MM:SS`, as today.
- Offset makes a step fall on the previous day: ignore the step for that date.
- DST change day: times come from JSON with DST applied; build `Date` from local components, as `parseTarget` does.
- Tab in background / phone locked: on return, recompute the current step from the clock (no stored state).
- Imported config references a zman id not in this JSON file: mark the step invalid, keep the rest.
- `warningSeconds` larger than the gap since the previous step: the fade starts while the previous step is current; that is fine since only the current step's color is shown.

## 9. Storage, sharing, PWA

- Config stored in `localStorage` under one key (e.g. `prayerSteps.config.v1`). Browse/live state is not stored.
- Export: download the `StepsConfig` JSON. Import: file picker or paste; validate `schemaVersion` and ids; show a diff summary before replacing.
- The Shortcut version cannot use `localStorage` reliably (data: URL origin). Until the PWA exists, the Shortcut
  injects the config (or the computed step times) the same way it injects `TARGET` today.

## 10. Roadmap

**Phase 1: manual steps, no UI for config.**
Config JSON embedded or injected by the Shortcut. Live mode, auto-advance, per-step color, late display,
opening late, missing data. No swipe. Supports both display styles.

**Phase 2: swipe and config UI (PWA).**
Swipe browse mode with return to live. Config editor (add, remove, reorder, edit label/anchor/offset/warning).
`localStorage`, export/import JSON. Day rollover with local `zmanimData.json`.

**Phase 3: audio-driven position (optional, later).**
The app listens to the chazan or user and recognizes markers (e.g. the words of Kaddish, "הודו לה'", "ישתבח",
"שמע ישראל") to know which step was actually reached. It then advances on detection rather than on the clock and
computes `paceSeconds` (actual time vs planned time) to color "ahead / on time / behind".
Design hooks to keep from Phase 1:
- Step advance goes through one function (`advanceTo(stepId, source: 'clock' | 'user' | 'audio')`).
- Each step may later carry `markers?: string[]` (phrases to detect). Unknown fields are ignored on import.
- Color function accepts an optional `paceSeconds`.
Privacy: off by default, explicit opt-in, microphone used only while the page is open, recognition on device,
no audio recorded, stored, or uploaded. If on-device recognition is not available on the platform, the feature
stays off. Clock-based mode always remains the fallback.

## 11. Open questions

1. What are the real steps and offsets for your minyan (nusach, which milestones, minutes before netz)?
2. Should offsets be relative to netz only, or also chained to the previous step ("Hodu = Kaddish + 3 min")?
3. Default warning window for intermediate steps: 1 min, 2 min, or a fraction of the gap to the previous step?
4. When a step passes, advance immediately, or stay on it as "+MM:SS" for a tolerance period?
5. After the last step (Amida), how long to show "+MM:SS", and what next (blank, "Amida started", close)?
6. Swipe direction in RTL: does swiping left mean "next" or "previous"?
7. Return to live: automatic after N seconds, tap only, or both? Value of N?
8. Which zmanim besides netz may be used as anchors (talit/tefilin, alot hashachar)? How to read `⁺` values?
9. Should the bottom line show the step's target time, netz time, or both?
10. In the Shortcut phase, should it inject computed step times, or the whole day's zmanim plus the config?
11. Is one shared config per community enough, or do users need personal overrides on top of it?
12. Phase 3: is audio detection wanted at all, and should it follow the chazan or the user's own voice?
