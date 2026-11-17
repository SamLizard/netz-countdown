# Netz Countdown

A Progressive Web App that counts down to today's visible sunrise (נץ החמה הנראה), using a calendar file each user imports on their own phone.

Live: https://samlizard.github.io/netz-countdown/

## For users

1. Open the link above in Safari on iPhone (or Chrome on Android).
2. Share → **Add to Home Screen**. Open the app from the new icon.
3. Tap **Import calendar file** and pick `zmanimData.json`. Do this once per year, when the new calendar comes out.

The calendar stays on the phone. Nothing is uploaded, and there is no account.

Settings (gear icon): language (English / French), black background (only the number is colored, saves battery on OLED screens), keep the screen on, and when to start turning red.

## For developers

See [docs/STANDARDS.md](docs/STANDARDS.md).

```
npm install
npm run dev        # http://localhost:4173
npm run build
npm run deploy     # build + publish dist to the gh-pages branch
```

The calendar data (`zmanimData.json`, PDFs) is private and must never be committed. It is in `.gitignore`.

Other docs:
- `shortcut/` contains the earlier Apple Shortcut version and its brief.
- `shortcut/FEATURE_PRAYER_STEPS.md` describes the planned multi-step prayer countdown.
