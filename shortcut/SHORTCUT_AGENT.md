# Brief for the Apple Shortcut agent: sunrise countdown

## Goal

Build an iOS Shortcut that:
1. Reads `zmanimData.json` (stored on the phone in Files).
2. Finds today's visible sunrise time.
3. Inserts it into `countdown.html`.
4. Opens the page full screen so the user sees a live countdown.

The HTML does no date or data logic. It only counts down to the one value you give it.

## Files

| File | Where | Role |
|---|---|---|
| `zmanimData.json` | Files on the phone | Calendar data, already parsed from the PDF |
| `countdown.html` | Files on the phone (or embedded as Text in the Shortcut) | Template page with a placeholder |

## Step 1: Read today's sunrise from the JSON

Shape (only what you need):

```json
{
  "source": { "firstDate": "2026-09-06", "lastDate": "2027-11-06" },
  "days": {
    "2026-11-15": {
      "hebrewDate": "ה כסלו",
      "times": { "visible_sunrise": "6:15:15" }
    }
  }
}
```

- Key: `days[<today as YYYY-MM-DD>].times.visible_sunrise`.
- Use the phone's **local** date (Israel time), not UTC. Between midnight and 03:00 a UTC date would point at the wrong day.
- The value is `H:MM:SS`, 12-hour, **without AM/PM**. Sunrise is always in the morning, so use the hour as it is (4 to 7).
- Daylight saving changes are already applied in the data (e.g. 2027-03-25 is `5:44:30`, 2027-03-26 is `6:43:15`). Do not add or subtract any hour.
- All 427 days from 2026-09-06 to 2027-11-06 exist, and every one has `visible_sunrise`. After 2027-11-06 the user needs a new JSON file.
- Always use **today's** date, even after sunrise has passed. The page then shows how late we are (`+MM:SS` on red). Do not switch to tomorrow.

## Step 2: Build the target string

Format: `YYYY-MM-DDTHH:MM:SS`, wrapped in double quotes because it is inserted as JavaScript.

Example for 2026-11-15 with `"6:15:15"`: the replacement value is `"2026-11-15T06:15:15"` (quotes included). Zero-padding the hour is optional; the page accepts `6` or `06`.

## Step 3: Insert into the HTML

`countdown.html` contains exactly this token once:

```
/*__TARGET__*/null
```

Replace the **whole token** (comment and `null`) with the quoted string:

```js
const TARGET = "2026-11-15T06:15:15";
```

If today is missing from the JSON (file expired), you can leave the token untouched. The page then shows "אין זמן נץ להיום" on a grey background. No load button is shown, by design.

## Step 4: Open the page (please test this)

The page needs JavaScript running for several minutes with the screen on. Please check which iOS method does this reliably, and report back:

- [ ] **Show Web View** action with the HTML (does it run `setInterval` and keep updating?)
- [ ] Save the HTML to Files and open it in **Safari** (do `file://` pages run JS?)
- [ ] `data:text/html;base64,...` URL opened in Safari
- [ ] **Quick Look** (probably does not run JS; confirm)

For each method, check:
- [ ] The countdown updates every second (it does not freeze).
- [ ] The screen stays on. The page asks for a Wake Lock, but iOS may ignore it in some viewers. If so, tell us; Auto-Lock may need handling in the Shortcut.
- [ ] It still updates after locking and unlocking the phone.
- [ ] Full screen, readable in portrait and landscape.
- [ ] Hebrew text shows correctly.

## Step 5: Test cases

Run the Shortcut with each case and compare to what's expected. You can fake times by putting a hand-made target string in place of the JSON value.

| Case | Target | Expected |
|---|---|---|
| Far before | now + 30 min | `30:00` counting down, green |
| Warning start | now + 8 min | green turning toward yellow/orange |
| Close | now + 1 min | almost fully red |
| At sunrise | now | `00:00` then `+00:01`, red, "אחרי הנץ" |
| After | now - 5 min | `+05:00` counting up, red |
| Over an hour | now + 2 h | `2:00:00` |
| Missing day | token left as is | grey, "אין זמן נץ להיום" |
| DST switch | 2027-03-26 | target shows `06:43:15` |

The bottom of the page shows the target time ("נץ") and the current time ("עכשיו") in small text. Check that the target matches the paper calendar for today.

## Behaviour reference (no changes needed)

- Green until 8 minutes before sunrise, then a smooth fade to fully red at sunrise.
- After sunrise: red, `+MM:SS`, and the label "אחרי הנץ".
