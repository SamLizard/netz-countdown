# Predicting visible sunrise (נץ החמה הנראה) for future years from one year of calendar data

## Verdict

**Feasible.** One year of calendar data is enough to predict visible sunrise for any later year within about ±15 s after rounding to the calendar's 15 s grid.

- Held-out test: a model fitted on 365 days predicted the other 62 days (same calendar dates, one year later or earlier). Raw error was max 18 s, RMS 7 s, mean −3 s. After rounding to 15 s, every one of the 62 days was within ±15 s, which is one rounding step.
- The real calendar's own year-to-year change for the same date (2026 vs 2027) is max 30 s, RMS 13 s. The model does better than that.
- The simple fallback "copy the same calendar date from the data year" is fine for 2026→2027 (max 30 s), but it reaches **~85 s** for a leap year like 2028. So it is not acceptable for vatikin in general. Copying the date from 4 years earlier is accurate (≤ ~5 s).

So a city needs only one PDF, provided the app runs an astronomy library plus a learned horizon table.

## 1. Theory

- On a flat horizon, sunrise time depends on latitude, longitude, the sun's declination and the equation of time for that instant. Standard sunrise puts the sun's centre at −0.833° (34′ refraction plus 16′ semidiameter). [SunCalc README](https://github.com/mourner/suncalc/blob/master/README.md), [suncalc issue #104](https://github.com/mourner/suncalc/issues/104).
- Visible sunrise replaces the flat horizon with the real topographic horizon: the elevation angle of the eastern skyline (mountains) at each azimuth. The skyline is fixed, so visible sunrise depends only on (sun position at that date) + (skyline at the sun's azimuth) + refraction.
- Calendar makers compute this from digital elevation models. R. Chaim Keller (Chazon Shamayim) compared calculated and observed sunrises in Jerusalem and found the real-horizon sunrise could be modelled to about ±15 s for most of the year ([ResearchGate profile, paper abstracts](https://www.researchgate.net/profile/Chaim-Keller)). Modern open projects do the same with terrain horizons and ray-traced refraction ([Zemaneh-Yosef](https://github.com/orgs/Zemaneh-Yosef/repositories)). MyZmanim publishes weather-aware sunset work with stated ~0.06° accuracy ([MyZmanim](https://hybrid.myzmanim.com/)). Topographic horizon computation itself is a standard technique ([Dozier, NASA NTRS](https://ntrs.nasa.gov/api/citations/20220003481/downloads/Dozier.pdf)).
- Year-to-year repetition: the Gregorian calendar realigns with the tropical year every 4 years. On the same calendar date the sun's declination drifts by up to ~¼ day of motion per year, and resets in a leap year. Near the equinoxes sunrise in Israel moves up to ~1 min/day, so same-date differences reach about 20 s (1 year apart) and about 60 s (across the leap-year reset). Computed with astronomy-engine for this location:

| Same date vs 2027 (flat sunrise) | RMS | Max |
|---|---|---|
| 2026 | 12 s | 20 s |
| 2028 (leap) | 33 s | 59 s |
| 2029 | 24 s | 40 s |
| 2030 | 13 s | 22 s |
| 2031 (4 years later) | 2 s | 3 s |
| 2035 (8 years) | 3 s | 5 s |
| 2040 | 37 s | 66 s |

- Refraction near the horizon varies with weather. Measured horizon refraction ranges from about 0.23° to 1.7° ([Schaefer & Liller 1990](https://ui.adsabs.harvard.edu/abs/1990PASP..102..796S)), and Sampson et al. found an SD of 0.18° at sunrise ([Sampson et al., Edmonton](http://privat.bahnhof.se/wb042294/Birka/prayertimes/prayertimes-references/quoted/sampson-et-al_Refraction-edmonton.pdf)). Real sunrise can therefore differ from any printed value by 1–2 min or more ([NRC Canada](https://nrc.canada.ca/en/research-development/products-services/software-applications/interpreting-results-sunrisesunset-calculator), [Wilson et al. AAS 2019](https://ui.adsabs.harvard.edu/abs/2019AAS...23322502W/abstract)). The target is to reproduce the calendar, not the sky.

## 2. Method (script: `docs/research/scripts/analyze_sunrise.mjs`)

1. The script reads `zmanimData.json` and converts every time to Israel Standard Time (UTC+2) using the legal DST rule: DST starts on the Friday before the last Sunday of March and ends on the last Sunday of October ([Wikipedia: Israel Summer Time](https://en.wikipedia.org/wiki/Israel_Summer_Time), [INN](https://www.israelnationalnews.com/news/435093)). The data contains exactly 3 one-hour jumps (2026-10-25, 2027-03-26, 2027-10-31). These match the rule, and no jump remains after conversion.
2. It computes flat sunrise with [astronomy-engine](https://github.com/cosinekitty/astronomy) (sun centre at −0.833°, sea level). It fits lat/lon to the calendar's plain sunrise ("במישור").
3. For each day it computes the sun's geometric altitude and azimuth at the calendar's visible time. That pair is one point of the "effective horizon": the altitude the sun centre must reach at that azimuth. Refraction and semidiameter are folded into it.
4. Model H (horizon profile) smooths altitude as a function of azimuth (local linear regression, 0.6° window), then solves for the moment the sun reaches that threshold on any date. Model D, a simpler alternative, smooths the delay in seconds (visible minus flat astronomical sunrise) as a function of sunrise azimuth.
5. Validation trains on 365 consecutive days and tests on the 62 days that repeat one year apart, in both directions.

## 3. Results (aggregate only)

Location fit: the calendar's plain sunrise matches astronomy-engine at **32.12 N, 34.84 E** with RMS 6.6 s and max 16 s. The nominal Ra'anana coordinates (32.18 N, 34.87 E) give RMS 12 s and max 24 s. Fitting lat/lon is worthwhile.

**(a) Same calendar day, 2027 vs 2026, overlap Sep 6–Nov 6 (standard time)**

| Series | n | mean | RMS | max abs | within ±15 s |
|---|---|---|---|---|---|
| Visible sunrise | 62 | −10.6 s | 12.9 s | 30 s | 98% |
| Plain sunrise | 34 | −9.7 s | 12.1 s | 15 s | 100% |
| Visible, local clock without DST fix | 62 | n/a | n/a | 3600 s | 6 days off by 1 h |

The −10 s mean is the expected leap-cycle drift (2027 dates are ~¼ day "later" in the solar year). DST must be handled by rule because the end dates differ (Oct 25 vs Oct 31).

**(b) Offset visible − plain:** the offset ranges from 255 s to 405 s (mean 332 s). The plain value is missing on 28 days. As a function of sunrise azimuth (61°–117°) the delay is smooth. In-sample residual after smoothing is RMS 5.7 s, max 17 s, which is about the 15 s rounding noise. The implied effective horizon is +0.03° to +0.53° of geometric sun-centre altitude.

**(c) Prediction of the held-out year (prediction − calendar)**

| Model | Direction | mean | RMS | max abs | within ±15 s |
|---|---|---|---|---|---|
| H, raw seconds | forward (→2027) | −3.3 | 6.9 | 18.2 | 97% |
| H, rounded to 15 s | forward | −3.1 | 8.3 | 15 | 100% |
| H, rounded to 15 s | backward (→2026) | −3.4 | 8.1 | 15 | 100% |
| D, rounded to 15 s | forward | −3.4 | 8.1 | 15 | 100% |
| Fallback: same date previous year | forward | +10.6 | 12.9 | 30 | 98% |

- Smoothing window: 0.6° is best. 0.3° overfits (max 42 s for H; D goes badly wrong near the solstice). 1.0–1.5° gives max 24–34 s raw.
- Model H is safer than D. H is physical and solves time from the sun's position, so it handles any date and leap years correctly. D can misbehave near solstices, where the azimuth turns back.
- Spring/autumn cross-check: the sun passes each azimuth twice a year. A profile learned only on the Dec→Jun half predicts the Jun→Dec half with RMS 7.9 s and max 21 s. The two halves describe the same horizon.
- Far future, using the model learned on all 427 days: predicted visible sunrise for 2031 differs from 2027 by ≤ 4 s and 2035 by ≤ 7 s, as the 4-year cycle implies. For 2028 the gap is up to 86 s. Copying 2027 dates into 2028 would therefore be wrong by up to ~85 s.

## 4. Recommended algorithm for the app

1. **Import (once per city PDF):** for each parsed day, take visible sunrise, convert to standard time using the DST rule, and convert to a UTC instant. Fit lat/lon from the plain sunrise column with a small grid search, or use the city's known coordinates if the plain column is missing.
2. **Learn the horizon:** for each day compute the sun's (azimuth, geometric altitude) at that instant. Smooth onto a fixed grid, for example every 0.25° of azimuth over the observed range (~61°–118°, ~230 numbers). Store this tiny table plus lat/lon in the city profile. The calendar values themselves are not needed afterwards.
3. **Predict date D:** find the morning time when the sun's geometric altitude equals `profile(azimuth)`. Bisection over 03:00–09:00 takes ~40 evaluations. Add the DST offset by rule for D. Round to 15 s to match the calendar. The calendar's rounding direction is unknown. Rounding to nearest gave mean −3 s; ceiling gave mean +4 s, also within 15 s. Show times as "≈" so users are not misled about precision.
4. **Prefer real data when available:** if the date is inside the imported PDF range, show the printed value. Use the prediction only outside that range.
5. **Library:** use [astronomy-engine](https://www.npmjs.com/package/astronomy-engine) (MIT, no dependencies, works offline in the browser, ~116 KB minified / ~47 KB gzipped, ±1′ accuracy; 1′ of altitude ≈ 5 s of sunrise time here). It is tree-shakeable from ESM. A lighter option is [SunCalc](https://github.com/mourner/suncalc) (~2 KB). Its simpler solar formulas are less exact; this was not tested here, so validate it with the script before relying on it.
6. **Simple fallback without astronomy:** use the value from the same date **4 years** earlier, which was accurate to ≤ ~5 s in the tests above. With only one year of data, the same date last year is accurate to ±20–30 s in normal years but up to ~85 s around leap years, so it is not recommended. Feb 29 has no source date in a non-leap data year; the model handles it naturally.

## 5. Accuracy vs. vatikin requirement

- The prediction stays within one rounding step (±15 s) of what the same calendar maker would print, with mean bias ≈ −3 s (slightly early). For the Amida at sunrise, an app can add a +15 s safety margin, or round up, to avoid being early.
- Neither the calendar nor the model captures daily refraction, which changes real sunrise by tens of seconds to minutes ([Schaefer & Liller](https://ui.adsabs.harvard.edu/abs/1990PASP..102..796S)). The calendar is the halachic reference the users follow anyway.

## 6. Risks and caveats

- **Validation span:** the test is only 62 days (Sep–Nov, azimuth ~95°–110°). The spring/autumn cross-check covers the whole azimuth range, but the solstice ends (where azimuth turns back) are least constrained. Extrapolation is clamped to the observed range.
- **Coverage:** a complete year is required so that every azimuth is seen. A partial year leaves gaps in the profile.
- **Calendar method:** if the calendar maker changes their method, terrain model or refraction constant in later years, predictions will drift from their new PDFs.
- **DST:** the rules are set by law (2013 Time Determination Law) and have changed before ([ynet 2013](https://www.ynetnews.com/articles/0,7340,L-4402507,00.html)). Compute DST by rule in one place, and allow overriding it, or use the browser's `Intl` with `Asia/Jerusalem`.
- **Rounding:** calendar values on a 15 s grid add ±7.5 s noise to the learned profile. Smoothing removes most of it.
- **Location:** the profile is valid only for the observer point the calendar was computed for. It cannot be moved to another city.
- **Privacy:** the stored profile (~230 numbers) is derived data, but it still encodes the calendar maker's work. Treat it like the PDF.

## Sources

- R. Chaim Keller, sunrise observation papers: https://www.researchgate.net/profile/Chaim-Keller
- Zemaneh-Yosef (terrain horizons, ray-traced refraction): https://github.com/orgs/Zemaneh-Yosef/repositories
- MyZmanim weather-aware calculations: https://hybrid.myzmanim.com/
- Dozier, topographic horizons: https://ntrs.nasa.gov/api/citations/20220003481/downloads/Dozier.pdf
- Astronomy Engine: https://github.com/cosinekitty/astronomy
- SunCalc: https://github.com/mourner/suncalc/blob/master/README.md
- Schaefer & Liller 1990, refraction near the horizon: https://ui.adsabs.harvard.edu/abs/1990PASP..102..796S
- Sampson et al., refraction at sunrise: http://privat.bahnhof.se/wb042294/Birka/prayertimes/prayertimes-references/quoted/sampson-et-al_Refraction-edmonton.pdf
- NRC Canada, sunrise uncertainty: https://nrc.canada.ca/en/research-development/products-services/software-applications/interpreting-results-sunrisesunset-calculator
- Wilson et al. 2019 (AAS), refraction models: https://ui.adsabs.harvard.edu/abs/2019AAS...23322502W/abstract
- Israel Summer Time rule: https://en.wikipedia.org/wiki/Israel_Summer_Time ; https://www.israelnationalnews.com/news/435093

Content from sources was rephrased for compliance with licensing restrictions.

Reproduce: `npm install --no-save astronomy-engine` in `$env:TEMP\sunres`, then
`$env:ASTRO_PATH="$env:TEMP\sunres\node_modules\astronomy-engine\astronomy.js"; node docs/research/scripts/analyze_sunrise.mjs`

## Python script

`docs/research/scripts/predict_sunrise.py` is a standalone port of Model H. It needs Python 3.9+ and the standard library only. The solar position uses the Meeus/NOAA low-precision formulas. Near the horizon it agrees with astronomy-engine within 0.008° in altitude and azimuth (about 1 s of sunrise time). Geometric altitude is used in both learning and prediction, so refraction and semidiameter fold into the learned horizon. DST is applied by the Israel rule in one function (`israel_utc_offset_hours`). Each run prints a check of the rule against the one-hour jumps found in the input file.

```powershell
$s = "docs/research/scripts/predict_sunrise.py"
python $s zmanimData.json 2028-03-15                        # one date, rounded to nearest 15 s
python $s zmanimData.json 2028-03-15 --round-up             # round up (safer for vatikin)
python $s zmanimData.json 2028-03-15 --no-round             # raw seconds
python $s zmanimData.json --from 2028-03-20 --to 2028-03-31 # one line per day (+ printed value and diff if known)
python $s zmanimData.json --validate                        # held-out one-year test, both directions
python $s zmanimData.json --compare other_year.json         # learn from file 1, predict every date of file 2
python $s zmanimData.json --export-profile profile.json     # lat, lon, azimuth grid, altitudes (no calendar times)
```

Options: `--lat/--lon` override the fitted location (the default fallback is 32.12 N 34.84 E when the plain-sunrise column is too sparse), `--utc-offset-hours` forces a fixed offset for testing, and `--bandwidth` (0.6°) and `--grid-step` (0.25°) control smoothing. Location fitting takes a few seconds. Progress notes go to stderr.

Results on `zmanimData.json` (prediction − calendar):

| Test | raw RMS / max | rounded 15 s: mean / max / within ±15 s |
|---|---|---|
| validate forward (→2027-09-06..11-06, 62 d) | 6.8 s / 17.8 s | −2.4 s / 15 s / 100% |
| validate backward (→2026-09-06..11-06, 62 d) | 7.0 s / 14.5 s | −3.4 s / 15 s / 100% |
| compare against itself (427 d, in-sample) | 5.7 s / 17.5 s | 0.0 s / 15 s / 100% |

With `--round-up`, the mean bias is +4 to +5 s on held-out days and every day stays within ±15 s. In the in-sample self-compare, 1 of 427 days lands at +30 s. 2028 DST transitions land on Fri 2028-03-24 and Sun 2028-10-29.
