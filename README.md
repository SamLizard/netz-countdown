# Netz Countdown

A Progressive Web App that counts down to today's visible sunrise (נץ החמה הנראה), using a calendar file each user imports on their own phone.

Live: https://samlizard.github.io/netz-countdown/

## For users

1. Open the link above in Safari on iPhone (or Chrome on Android).
2. Share → **Add to Home Screen**. Open the app from the new icon.
3. Tap **Import calendar file** and pick `zmanimData.json`. Do this once per year, when the new calendar comes out.

The calendar stays on the phone. Nothing is uploaded, and there is no account.

Open Settings (gear icon) to manage your calendar and prayer steps, choose a language, and adjust countdown colors. Under **Screen and battery → Advanced refresh settings**, choose when the countdown switches to one-second updates (20 seconds before the current target by default). The countdown stays visible after the last target by default; **Go dark after the last countdown** is optional. Existing saved preferences are preserved.

The landscape countdown fits on one screen without scrolling. The digits use as much of the available width and height as possible, with the clock details below. If you've added prayer steps, use the previous/next buttons or swipe horizontally to preview another step.

Prayer steps are timed relative to visible sunrise from your imported calendar, not a fixed clock time. If sunrise is at 06:30, a step set to 10 minutes before sunrise is at 06:20. Use **Copy as text** to share a list and **Paste a list** to bring it back; Paste also accepts the contents of an exported steps file.

## For developers

See [docs/STANDARDS.md](docs/STANDARDS.md).

```
npm install
npm run dev        # http://localhost:4173
npm run build
npm run host       # after building, open the printed Network URL on a phone on the same Wi-Fi
npm run deploy     # build + publish dist to the gh-pages branch
```

The calendar data (`zmanimData.json`, PDFs) is private and must never be committed. It is in `.gitignore`.

Other docs:
- `shortcut/` contains the earlier Apple Shortcut version and its brief.
- `shortcut/FEATURE_PRAYER_STEPS.md` describes the planned multi-step prayer countdown.
