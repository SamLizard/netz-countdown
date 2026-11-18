# Predicting visible sunrise (נץ החמה הנראה) for future years from one year of calendar data

## Verdict

**Feasible as an estimate, not as a second-accurate countdown.** In two fall holdouts, one year of training data reproduced the printed calendar within ±15 s after rounding to its 15 s grid. That is an observed result, not a bound for other seasons or future years.

- **Local 2025–26 study:** on 27 strictly later dates, raw RMS error was 7.5 s and worst absolute error was 15.4 s. Nearest-grid rounding matched 18/27 exactly and was 15 s early on the other 9. Rounding up still left one date 15 s early.
- **Earlier 2026–27 study:** on 62 forward holdout dates, raw RMS error was 6.9 s and worst absolute error was 18.2 s. After rounding, all 62 were within ±15 s. Copying the same date from the prior year reached 30 s error in both studies.
- The earlier study's ~85 s leap-year copy error and few-second four-year recurrence are model-based comparisons, not validations against printed calendars for those years.
- **Direct same-date check across both editions:** after removing DST, copying the previous year's Gregorian month and day was off by up to 30 s for 2025→2026 (102 pairs) and 45 s for 2026→2027 (310 pairs). See §8 for the full comparison.

## 1. Theory

- On a flat horizon, sunrise time depends on latitude, longitude, the sun's declination and the equation of time for that instant. Standard sunrise puts the sun's centre at −0.833° (34′ refraction plus 16′ semidiameter). [SunCalc README](https://github.com/mourner/suncalc/blob/master/README.md), [suncalc issue #104](https://github.com/mourner/suncalc/issues/104).
- Visible sunrise replaces the flat horizon with the real topographic horizon: the elevation angle of the eastern skyline (mountains) at each azimuth. The skyline is fixed, so visible sunrise depends only on (sun position at that date) + (skyline at the sun's azimuth) + refraction.
- Calendar makers compute this from digital elevation models. R. Chaim Keller (Chazon Shamayim) compared calculated and observed sunrises in Jerusalem and found the real-horizon sunrise could be modelled to about ±15 s for most of the year ([ResearchGate profile, paper abstracts](https://www.researchgate.net/profile/Chaim-Keller)). Modern open projects do the same with terrain horizons and ray-traced refraction ([Zemaneh-Yosef](https://github.com/orgs/Zemaneh-Yosef/repositories)). MyZmanim publishes weather-aware sunset work with stated ~0.06° accuracy ([MyZmanim](https://hybrid.myzmanim.com/)). Topographic horizon computation itself is a standard technique ([Dozier, NASA NTRS](https://ntrs.nasa.gov/api/citations/20220003481/downloads/Dozier.pdf)).
- Year-to-year repetition is approximate. An ordinary 365-day year is about 0.24 day shorter than the mean tropical year. Adding a leap day brings the calendar back close to the seasonal cycle, but four Gregorian years with one leap day are not exactly four tropical years ([NASA Glenn: Calendar Calculations](https://www.grc.nasa.gov/www/k-12/Numbers/Math/Mathematical_Thinking/calendar_calculations.htm)). The Sun's position can therefore differ even on the same month and day. [NOAA's sunrise calculation](https://gml.noaa.gov/grad/solcalc/main.js) accounts for both solar declination (how far before solar noon sunrise occurs) and the equation of time (when solar noon occurs on the clock). Near the equinoxes sunrise in Israel moves up to ~1 min/day, so same-date differences reach about 20 s (1 year apart) and about 60 s (across the leap-day adjustment) in this flat-horizon calculation. Computed with astronomy-engine for this location:

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
6. **Simple fallback without astronomy:** copying the same date from the previous year reached 30 s error in both fall holdouts and 45 s in the broader direct comparison (§8), even after DST correction. The earlier model-based comparisons suggest it can be worse across a leap day. The four-year copy shortcut is unvalidated against a printed four-year holdout. Feb 29 has no source date in a non-leap year.

## 5. Accuracy vs. vatikin requirement

- Use the printed time for a second-resolution countdown to the calendar value. Outside the imported range, label the prediction as an estimate (`≈`); displaying seconds does not make it second-accurate. Neither rounding up nor adding a fixed buffer is a validated way to avoid an early prediction.
- Neither the calendar nor the model captures daily refraction, which changes real sunrise by tens of seconds to minutes ([Schaefer & Liller](https://ui.adsabs.harvard.edu/abs/1990PASP..102..796S)). The calendar is the halachic reference the users follow anyway.

## 6. Risks and caveats

- **Validation span:** both cross-year holdouts are in fall. The earlier spring/autumn cross-check is within a seasonal cycle, not a forward-year test. Solstice endpoints are least constrained; the model clamps to the learned azimuth range.
- **Coverage:** a complete year is required so that every azimuth is seen. A partial year leaves gaps in the profile.
- **Calendar method:** if the calendar maker changes their method, terrain model or refraction constant in later years, predictions will drift from their new PDFs.
- **DST:** the rules are set by law (2013 Time Determination Law) and have changed before ([ynet 2013](https://www.ynetnews.com/articles/0,7340,L-4402507,00.html)). Compute DST by rule in one place, and allow overriding it, or use the browser's `Intl` with `Asia/Jerusalem`.
- **Rounding:** calendar values on a 15 s grid add ±7.5 s noise to the learned profile. Smoothing removes most of it.
- **Location:** the profile is valid only for the observer point the calendar was computed for. It cannot be moved to another city.
- **Privacy:** the stored profile (~230 numbers) is derived data, but it still encodes the calendar maker's work. Treat it like the PDF.

## 7. Local 2025–26 forward holdout

The ignored 2025 calendar had 392 consecutive visible-sunrise values across two civil years (102 in 2025, 290 in 2026), all on a 15 s grid and with no usable plain-sunrise values. This model comparison uses the recorded results of the earlier 427-day study; the later direct comparison in §8 uses both calendar files and does not fit a model.

**Reproduce offline:** Import `docs/research/scripts/predict_sunrise.py` with Python 3.9+ (`python3 -B` avoids writing bytecode). Call `load_days(path, None)`, keep visible rows in date order, and split at `[:365]` / `[365:]`. Call `learn_profile` on the first split only with the nominal coordinates already listed in §3 (not the coordinates fitted on the later calendar), the existing 0.6° bandwidth and 0.25° grid. No fit or tuning used the holdout. Call `predict_local_seconds(profile, day, None)` with each holdout date only, then subtract its printed value before or after rounding the *prediction* with `round_seconds` (`none`, `nearest`, or `up`). For the copy baseline, match month/day in the training split and add `(target_offset − source_offset) × 3600` to the training value before scoring. Report aggregates only: the CLI's `--compare` prints per-day times and is not appropriate for a shared log.

**Results (27 later dates in 2026; prediction minus calendar).** Errors are in seconds. Quantiles are of absolute errors, linearly interpolated; skew is the signed third central moment divided by the cubed population standard deviation. Coverage counts use inclusive thresholds.

| Method | Mean bias | RMS | Absolute P50 / P90 / P95 | Signed min…max | Skew | Within 1 / 5 / 15 / 30 s (of 27) |
|---|---:|---:|---:|---:|---:|---:|
| Model H, raw | −4.6 | 7.5 | 4.1 / 13.2 / 13.6 | −15.4…+3.5 | −0.29 | 4 / 15 / 26 / 27 |
| Model H, nearest 15 s | −5.0 | 8.7 | 0 / 15 / 15 | −15…0 | −0.71 | 18 / 18 / 27 / 27 |
| Model H, round up to 15 s | +4.4 | 9.1 | 0 / 15 / 15 | −15…+15 | +0.13 | 17 / 17 / 27 / 27 |
| Same date, DST-adjusted | +8.9 | 12.2 | 15 / 15 / 15 | 0…+30 | +0.26 | 12 / 12 / 26 / 27 |

Nearest rounding improved ±15 s coverage (26/27 → 27/27) but increased RMS error. Raw predictions were early on 18/27 days; nearest rounding was 9 early, 18 exact and none late. The result is consistent with the earlier fall holdout, but neither establishes a future error bound or accuracy against observed sunrise.

**DST and leap checks:** Both one-hour jumps in the source matched the rule in date and direction, with none left after offset normalization. The rule also agreed with local `zoneinfo.ZoneInfo("Asia/Jerusalem")` at 06:00 throughout the source span and 2028. The scored holdout had no DST transition. Model H produced valid local predictions for Feb 28, Feb 29, and Mar 1 of 2028, with less than 120 s between adjacent days' predicted times of day. This checks date handling only: no printed leap-year values were available to measure error.

## 8. Direct Gregorian same-date check across the two editions

Both files span parts of two civil years. All 42 dates printed in both editions agreed exactly, so the common dates were counted once. For each distinct date, pair its `visible_sunrise` with the same month and day in the next year where available. To compare like with like, put each time on Israel standard time (UTC+02:00) by subtracting one hour when `Asia/Jerusalem` was on summer time on that date. Then subtract the earlier year's value from the later one's.

| Date pairing | Pairs | Exact | Within ±15 s (including exact) | Mean absolute difference | Range |
|---|---:|---:|---:|---:|---:|
| 2025→2026 | 102 | 22 | 100 | 12.1 s | −30 to 0 s |
| 2026→2027 | 310 | 102 | 290 | 11.1 s | −30 to +45 s |

Without the DST correction, the largest wall-clock difference was 1 h 15 s in each comparison. Matching Gregorian dates is a useful approximation, not an exact rule. The 2025→2026 pairs cover fall and early winter, and the 2026→2027 pairs cover January through early November. Neither pairing tests a leap day, and the comparison measures agreement with the printed calendar, not measured sunrise.

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
python $s zmanimData.json 2028-03-15 --round-up             # round up (not a guarantee against early predictions)
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

In these earlier holdouts, `--round-up` gave a mean bias of +4 to +5 s and kept every day within ±15 s. In the in-sample self-compare, 1 of 427 days landed at +30 s. The local follow-up in §7 shows that rounding up can still predict an early time.
