#!/usr/bin/env python3
"""Predict visible sunrise (netz hachama) for any date from one year of calendar data.

Python port of "Model H" from docs/research/scripts/analyze_sunrise.mjs
(see docs/research/SUNRISE_PREDICTION.md). Standard library only.

Method:
  1. Convert every printed local time to UTC with the Israel DST rule.
  2. Fit observer lat/lon on the plain ("flat") sunrise column: sun centre at
     -0.8333 deg geometric altitude.
  3. For every day, compute the sun's geometric altitude and azimuth at the
     printed visible-sunrise instant. These points form an "effective horizon"
     (refraction and semidiameter folded in).
  4. Smooth altitude vs azimuth (local linear regression, tricube kernel,
     0.6 deg window) and sample it on a fixed azimuth grid.
  5. To predict a date, solve for the morning instant at which the sun's
     geometric altitude equals profile(azimuth), then convert to local time.

The calendar data is never embedded here; the script reads it at run time and
prints aggregates (plus per-day lines only when explicitly asked for).

Examples (PowerShell):
  python predict_sunrise.py zmanimData.json 2028-03-15
  python predict_sunrise.py zmanimData.json --from 2028-03-20 --to 2028-03-27
  python predict_sunrise.py zmanimData.json --validate
  python predict_sunrise.py zmanimData.json --compare other.json
  python predict_sunrise.py zmanimData.json --export-profile profile.json
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Iterable, Optional, Sequence

# ---------------------------------------------------------------- constants
METHOD_NAME = "model-H-horizon-profile"
METHOD_VERSION = 1
VISIBLE_KEY = "visible_sunrise"
PLAIN_KEY = "back:nets ha'hama במישור"
DEFAULT_LAT = 32.12
DEFAULT_LON = 34.84
FLAT_SUNRISE_ALT_DEG = -0.8333     # sun centre at standard sunrise (refraction + semidiameter)
DEFAULT_BANDWIDTH_DEG = 0.6        # loess window, best value in the JS study
DEFAULT_GRID_STEP_DEG = 0.25       # azimuth grid of the stored profile
ROUND_STEP_S = 15                  # calendar grid
DELTA_T_S = 69.0                   # TT - UT, ~2025-2030 (effect on the sun is negligible)
SUN_HORIZONTAL_PARALLAX_DEG = 8.794 / 3600.0
SEARCH_START_UTC_H = 0.0           # rise search window, hours UTC on the local date
SEARCH_END_UTC_H = 8.0
BISECTION_STEPS = 26               # 8 h / 2^26 ~ 0.0004 s
MIN_PLAIN_DAYS_FOR_FIT = 20
DEG = math.pi / 180.0


# ---------------------------------------------------------------- time zone
def israel_utc_offset_hours(local_day: date, local_hour: float = 6.0) -> int:
    """ISRAEL TIME ZONE RULE (the only place DST is defined).

    2013 Time Determination Law: daylight time (UTC+3) runs from the Friday
    before the last Sunday of March at 02:00 until the last Sunday of October
    at 02:00 (clocks go back from 02:00 to 01:00). Otherwise UTC+2.

    `local_hour` is the local wall-clock hour of the event. Sunrise is always
    after 02:00, so on both switch days it falls on the new offset. On the
    October switch day, the repeated hour 01:00-02:00 is treated as DST.
    """
    y = local_day.year
    start = _last_sunday(y, 3) - timedelta(days=2)   # Friday
    end = _last_sunday(y, 10)
    if local_day < start or local_day > end:
        return 2
    if local_day == start:
        return 3 if local_hour >= 2.0 else 2
    if local_day == end:
        return 3 if local_hour < 2.0 else 2
    return 3


def _last_sunday(year: int, month: int) -> date:
    """Return the last Sunday of the given month."""
    nxt = date(year + (month == 12), month % 12 + 1, 1)
    last = nxt - timedelta(days=1)
    return last - timedelta(days=(last.weekday() + 1) % 7)   # Monday=0 .. Sunday=6


def utc_offset_hours(local_day: date, fixed_offset: Optional[float], local_hour: float = 6.0) -> float:
    """Offset used everywhere: the fixed override if given, else the Israel rule."""
    if fixed_offset is not None:
        return fixed_offset
    return float(israel_utc_offset_hours(local_day, local_hour))


def local_to_unix(local_day: date, local_seconds: float, offset_h: float) -> float:
    """Convert local wall-clock seconds-of-day on `local_day` to a Unix timestamp."""
    midnight = datetime(local_day.year, local_day.month, local_day.day, tzinfo=timezone.utc).timestamp()
    return midnight + local_seconds - offset_h * 3600.0


def unix_to_local_seconds(unix_s: float, local_day: date, offset_h: float) -> float:
    """Convert a Unix timestamp to local seconds-of-day relative to `local_day`."""
    midnight = datetime(local_day.year, local_day.month, local_day.day, tzinfo=timezone.utc).timestamp()
    return unix_s - midnight + offset_h * 3600.0


# ---------------------------------------------------------------- solar position
def sun_alt_az(unix_s: float, lat_deg: float, lon_deg: float) -> tuple[float, float]:
    """Geometric (no refraction) topocentric altitude and azimuth of the sun centre, degrees.

    Meeus "Astronomical Algorithms" ch. 25 low-precision sun (NOAA solar
    calculator equations): apparent longitude with nutation/aberration
    approximation, true obliquity, apparent sidereal time. Azimuth is measured
    from north through east. Accuracy is about 0.01 deg.
    """
    jd_ut = unix_s / 86400.0 + 2440587.5
    t = (jd_ut + DELTA_T_S / 86400.0 - 2451545.0) / 36525.0
    l0 = 280.46646 + t * (36000.76983 + 0.0003032 * t)
    m = (357.52911 + t * (35999.05029 - 0.0001537 * t)) * DEG
    c = ((1.914602 - t * (0.004817 + 0.000014 * t)) * math.sin(m)
         + (0.019993 - 0.000101 * t) * math.sin(2 * m)
         + 0.000289 * math.sin(3 * m))
    omega = (125.04452 - 1934.136261 * t) * DEG
    lam = (l0 + c - 0.00569 - 0.00478 * math.sin(omega)) * DEG
    eps0 = 23.0 + (26.0 + (21.448 - t * (46.815 + t * (0.00059 - 0.001813 * t))) / 60.0) / 60.0
    eps = (eps0 + 0.00256 * math.cos(omega)) * DEG
    sin_lam = math.sin(lam)
    ra = math.atan2(math.cos(eps) * sin_lam, math.cos(lam))
    dec = math.asin(math.sin(eps) * sin_lam)
    # apparent sidereal time = mean + equation of the equinoxes
    d = jd_ut - 2451545.0
    gmst = 280.46061837 + 360.98564736629 * d + t * t * (0.000387933 - t / 38710000.0)
    dpsi = -0.004778 * math.sin(omega) - 0.000367 * math.sin(2 * l0 * DEG)
    gast = gmst + dpsi * math.cos(eps)
    h = (gast + lon_deg) * DEG - ra
    phi = lat_deg * DEG
    sin_alt = math.sin(phi) * math.sin(dec) + math.cos(phi) * math.cos(dec) * math.cos(h)
    alt = math.asin(max(-1.0, min(1.0, sin_alt)))
    az = math.atan2(-math.sin(h), math.tan(dec) * math.cos(phi) - math.sin(phi) * math.cos(h))
    alt_deg = alt / DEG - SUN_HORIZONTAL_PARALLAX_DEG * math.cos(alt)
    return alt_deg, (az / DEG) % 360.0


def solve_rise(local_day: date, lat: float, lon: float, target: Callable[[float], float]) -> float:
    """Unix time on the morning of `local_day` when geometric altitude reaches target(azimuth).

    Bisection over SEARCH_START_UTC_H..SEARCH_END_UTC_H UTC. Raises ValueError
    if the crossing is not bracketed.
    """
    t0 = local_to_unix(local_day, SEARCH_START_UTC_H * 3600.0, 0.0)
    t1 = local_to_unix(local_day, SEARCH_END_UTC_H * 3600.0, 0.0)

    def f(t: float) -> float:
        alt, az = sun_alt_az(t, lat, lon)
        return alt - target(az)

    if f(t0) > 0 or f(t1) < 0:
        raise ValueError(f"no sunrise crossing found on {local_day.isoformat()}")
    for _ in range(BISECTION_STEPS):
        mid = 0.5 * (t0 + t1)
        if f(mid) > 0:
            t1 = mid
        else:
            t0 = mid
    return 0.5 * (t0 + t1)


# ---------------------------------------------------------------- data loading
@dataclass
class Day:
    """One calendar day, times as local seconds-of-day."""
    day: date
    visible_s: Optional[float]
    plain_s: Optional[float]
    offset_h: float


def parse_hms(value: str) -> float:
    """Parse 'H:MM:SS' (or 'H:MM') to seconds. Morning times, no AM/PM."""
    parts = [int(p) for p in value.strip().split(":")]
    if len(parts) not in (2, 3):
        raise ValueError(f"bad time {value!r}")
    h, mnt = parts[0], parts[1]
    sec = parts[2] if len(parts) == 3 else 0
    return h * 3600.0 + mnt * 60.0 + sec


def parse_iso_date(value: str) -> date:
    """Parse YYYY-MM-DD with a clear error message."""
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise SystemExit(f"error: invalid date {value!r}, expected YYYY-MM-DD") from exc


def load_days(path: Path, fixed_offset: Optional[float]) -> list[Day]:
    """Read a zmanim JSON file: {"days": {"YYYY-MM-DD": {"times": {...}}}}."""
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SystemExit(f"error: file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"error: {path} is not valid JSON ({exc})") from exc
    if not isinstance(raw, dict) or not isinstance(raw.get("days"), dict):
        raise SystemExit(f"error: {path} has no top-level 'days' object")
    out: list[Day] = []
    bad = 0
    for key in sorted(raw["days"]):
        try:
            d = date.fromisoformat(key)
        except ValueError:
            bad += 1
            continue
        times = (raw["days"][key] or {}).get("times") or {}
        vis = _try_time(times.get(VISIBLE_KEY))
        plain = _try_time(times.get(PLAIN_KEY))
        if vis is None and plain is None:
            bad += 1
            continue
        out.append(Day(d, vis, plain, utc_offset_hours(d, fixed_offset)))
    if not any(x.visible_s is not None for x in out):
        raise SystemExit(f"error: {path} has no '{VISIBLE_KEY}' values")
    if bad:
        print(f"note: {path.name}: skipped {bad} entries without a usable date/time", file=sys.stderr)
    return out


def _try_time(value: object) -> Optional[float]:
    """Parse a time field, returning None if missing or malformed."""
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return parse_hms(value)
    except ValueError:
        return None


def dst_check(days: Sequence[Day], label: str, fixed_offset: Optional[float]) -> None:
    """Compare one-hour jumps in the printed visible sunrise with the offset rule."""
    vis = [d for d in days if d.visible_s is not None]
    data_jumps, rule_jumps = [], []
    for a, b in zip(vis, vis[1:]):
        if (b.day - a.day).days != 1:
            continue
        diff = b.visible_s - a.visible_s
        if abs(diff) > 1800:
            data_jumps.append(f"{b.day.isoformat()} {'+' if diff > 0 else '-'}1h")
        if b.offset_h != a.offset_h:
            rule_jumps.append(f"{b.day.isoformat()} {'+' if b.offset_h > a.offset_h else '-'}1h")
    rule_name = f"fixed UTC{fixed_offset:+g}" if fixed_offset is not None else "Israel rule"
    ok = data_jumps == rule_jumps
    print(f"DST check [{label}]: data jumps: {', '.join(data_jumps) or 'none'}; "
          f"{rule_name} transitions: {', '.join(rule_jumps) or 'none'} -> {'MATCH' if ok else 'MISMATCH'}")


# ---------------------------------------------------------------- location fit
def fit_location(days: Sequence[Day]) -> tuple[float, float, Optional[float]]:
    """Grid-search lat/lon minimising RMS of (printed plain - computed flat sunrise).

    Returns (lat, lon, rms_seconds) or the defaults with rms None if there is
    not enough plain-sunrise data.
    """
    sample = [d for d in days if d.plain_s is not None][::7]
    if len(sample) < MIN_PLAIN_DAYS_FOR_FIT // 7 + 3:
        return DEFAULT_LAT, DEFAULT_LON, None

    def rms(lat: float, lon: float) -> float:
        s = 0.0
        for d in sample:
            t = solve_rise(d.day, lat, lon, lambda _az: FLAT_SUNRISE_ALT_DEG)
            r = d.plain_s - unix_to_local_seconds(t, d.day, d.offset_h)
            s += r * r
        return math.sqrt(s / len(sample))

    best = (math.inf, DEFAULT_LAT, DEFAULT_LON)
    for i in range(11):
        for j in range(17):
            lat, lon = 31.6 + 0.1 * i, 34.6 + 0.05 * j
            best = min(best, (rms(lat, lon), lat, lon))
    _, lat0, lon0 = best
    for i in range(-5, 6):
        for j in range(-5, 6):
            lat, lon = lat0 + 0.02 * i, lon0 + 0.01 * j
            best = min(best, (rms(lat, lon), lat, lon))
    _, lat, lon = best
    lat, lon = round(lat, 2), round(lon, 2)
    return lat, lon, rms(lat, lon)


# ---------------------------------------------------------------- horizon profile
@dataclass
class HorizonProfile:
    """Effective horizon: geometric sun-centre altitude vs azimuth on a regular grid."""
    lat: float
    lon: float
    az_start: float
    az_step: float
    altitudes: list[float]
    bandwidth: float
    train_from: str
    train_to: str
    train_days: int

    def altitude_at(self, az: float) -> float:
        """Linear interpolation on the grid, clamped to the learned azimuth range."""
        n = len(self.altitudes)
        x = (az - self.az_start) / self.az_step
        if x <= 0:
            return self.altitudes[0]
        if x >= n - 1:
            return self.altitudes[-1]
        i = int(x)
        f = x - i
        return self.altitudes[i] * (1 - f) + self.altitudes[i + 1] * f

    def to_json(self) -> dict:
        """Serialisable model (no calendar times inside)."""
        return {
            "method": METHOD_NAME,
            "version": METHOD_VERSION,
            "lat": self.lat,
            "lon": self.lon,
            "altitude_kind": "geometric sun-centre altitude (deg), no refraction, topocentric",
            "solar_algorithm": "Meeus/NOAA low-precision sun, apparent sidereal time",
            "azimuth_start_deg": round(self.az_start, 4),
            "azimuth_step_deg": self.az_step,
            "altitudes_deg": [round(a, 5) for a in self.altitudes],
            "interpolation": "linear, clamped at ends",
            "loess_bandwidth_deg": self.bandwidth,
            "timezone": "Israel rule: UTC+3 from Friday before last Sunday of March 02:00 "
                        "to last Sunday of October 02:00, else UTC+2",
            "calendar_rounding_s": ROUND_STEP_S,
            "trained_on": {"from": self.train_from, "to": self.train_to, "days": self.train_days},
        }


def loess(xs: Sequence[float], ys: Sequence[float], bw: float, x0: float) -> float:
    """Local linear regression with tricube weights at x0; NaN if no points in window."""
    sw = sx = sy = sxx = sxy = 0.0
    for x, y in zip(xs, ys):
        u = abs(x - x0) / bw
        if u >= 1:
            continue
        w = (1 - u ** 3) ** 3
        sw += w; sx += w * x; sy += w * y; sxx += w * x * x; sxy += w * x * y
    if sw == 0:
        return math.nan
    den = sw * sxx - sx * sx
    if abs(den) < 1e-12:
        return sy / sw
    b = (sw * sxy - sx * sy) / den
    return (sy - b * sx) / sw + b * x0


def learn_profile(days: Sequence[Day], lat: float, lon: float,
                  bandwidth: float = DEFAULT_BANDWIDTH_DEG,
                  grid_step: float = DEFAULT_GRID_STEP_DEG) -> HorizonProfile:
    """Learn Model H from days with a visible-sunrise value."""
    pts_az, pts_alt = [], []
    used = [d for d in days if d.visible_s is not None]
    if len(used) < 30:
        raise SystemExit("error: need at least 30 days with visible sunrise to learn a profile")
    for d in used:
        alt, az = sun_alt_az(local_to_unix(d.day, d.visible_s, d.offset_h), lat, lon)
        pts_az.append(az)
        pts_alt.append(alt)
    lo, hi = min(pts_az), max(pts_az)
    start = math.floor(lo / grid_step) * grid_step
    n = int(math.ceil((hi - start) / grid_step)) + 1
    grid = [loess(pts_az, pts_alt, bandwidth, min(hi, max(lo, start + k * grid_step))) for k in range(n)]
    grid = _fill_gaps(grid)
    return HorizonProfile(lat, lon, start, grid_step, grid, bandwidth,
                          used[0].day.isoformat(), used[-1].day.isoformat(), len(used))


def _fill_gaps(values: list[float]) -> list[float]:
    """Linearly interpolate NaN gaps (azimuths not covered by data)."""
    idx = [i for i, v in enumerate(values) if not math.isnan(v)]
    if not idx:
        raise SystemExit("error: could not learn any horizon point")
    out = values[:]
    for i, v in enumerate(values):
        if not math.isnan(v):
            continue
        left = max((k for k in idx if k < i), default=None)
        right = min((k for k in idx if k > i), default=None)
        if left is None:
            out[i] = values[right]
        elif right is None:
            out[i] = values[left]
        else:
            f = (i - left) / (right - left)
            out[i] = values[left] * (1 - f) + values[right] * f
    gaps = len(values) - len(idx)
    if gaps:
        print(f"note: {gaps} azimuth grid points had no data and were interpolated", file=sys.stderr)
    return out


def predict_local_seconds(profile: HorizonProfile, local_day: date, fixed_offset: Optional[float]) -> float:
    """Predicted visible sunrise for `local_day` as local seconds-of-day (unrounded)."""
    t = solve_rise(local_day, profile.lat, profile.lon, profile.altitude_at)
    hour_guess = unix_to_local_seconds(t, local_day, 2.0) / 3600.0
    return unix_to_local_seconds(t, local_day, utc_offset_hours(local_day, fixed_offset, hour_guess))


# ---------------------------------------------------------------- formatting / stats
def round_seconds(s: float, mode: str) -> float:
    """Round to the 15 s grid: mode 'nearest', 'up' or 'none'."""
    if mode == "none":
        return s
    if mode == "up":
        return math.ceil(s / ROUND_STEP_S - 1e-9) * ROUND_STEP_S
    return math.floor(s / ROUND_STEP_S + 0.5) * ROUND_STEP_S


def fmt_time(s: float, mode: str) -> str:
    """Format local seconds-of-day as HH:MM:SS (with one decimal when unrounded)."""
    if mode == "none":
        whole = int(math.floor(s))
        frac = s - whole
        return f"{whole // 3600:02d}:{whole % 3600 // 60:02d}:{whole % 60 + frac:04.1f}"
    v = int(round(s))
    return f"{v // 3600:02d}:{v % 3600 // 60:02d}:{v % 60:02d}"


def stats_line(errors: Sequence[float]) -> str:
    """Aggregate stats: n, mean, RMS, max abs, % within +/-15 s."""
    n = len(errors)
    if n == 0:
        return "n=0"
    mean = sum(errors) / n
    rms = math.sqrt(sum(e * e for e in errors) / n)
    mx = max(abs(e) for e in errors)
    w15 = 100.0 * sum(1 for e in errors if abs(e) <= 15.0001) / n
    return f"n={n} mean={mean:+.1f}s rms={rms:.1f}s maxAbs={mx:.1f}s within15={w15:.1f}%"


def date_range(a: date, b: date) -> Iterable[date]:
    """Inclusive range of dates."""
    for k in range((b - a).days + 1):
        yield a + timedelta(days=k)


# ---------------------------------------------------------------- commands
def build_model(days: Sequence[Day], args: argparse.Namespace) -> HorizonProfile:
    """Fit (or take) the location, then learn the profile."""
    if args.lat is not None and args.lon is not None:
        lat, lon, rms = args.lat, args.lon, None
        src = "from --lat/--lon"
    else:
        lat, lon, rms = fit_location(days)
        if args.lat is not None:
            lat = args.lat
        if args.lon is not None:
            lon = args.lon
        src = "defaults (not enough plain sunrise data)" if rms is None else f"fitted, plain-sunrise RMS {rms:.1f}s"
    print(f"location: {lat:.2f} N {lon:.2f} E ({src})", file=sys.stderr)
    return learn_profile(days, lat, lon, args.bandwidth, args.grid_step)


def evaluate(profile: HorizonProfile, test: Sequence[Day], fixed_offset: Optional[float]
             ) -> list[tuple[Day, float]]:
    """Return (day, raw predicted local seconds) for days that have a visible value."""
    return [(d, predict_local_seconds(profile, d.day, fixed_offset)) for d in test if d.visible_s is not None]


def print_eval(label: str, results: Sequence[tuple[Day, float]]) -> None:
    """Print raw, rounded-nearest and rounded-up error statistics (pred - printed)."""
    print(f"[{label}]")
    for mode in ("none", "nearest", "up"):
        errs = [round_seconds(p, mode) - d.visible_s for d, p in results]
        name = {"none": "raw", "nearest": "round15", "up": "ceil15"}[mode]
        print(f"  {name:8s} {stats_line(errs)}")


def cmd_validate(days: Sequence[Day], args: argparse.Namespace) -> None:
    """Held-out test: train on 365 consecutive days, test on the rest, both directions."""
    first, last = days[0].day, days[-1].day
    if (last - first).days < 366:
        raise SystemExit("error: --validate needs more than one year of data")
    cut_f = first + timedelta(days=364)
    cut_b = last - timedelta(days=364)
    splits = [
        ("forward", [d for d in days if d.day <= cut_f], [d for d in days if d.day > cut_f]),
        ("backward", [d for d in days if d.day >= cut_b], [d for d in days if d.day < cut_b]),
    ]
    for name, train, test in splits:
        prof = build_model(train, args)
        res = evaluate(prof, test, args.utc_offset_hours)
        print_eval(f"validate {name}: train {train[0].day}..{train[-1].day} ({len(train)} d), "
                   f"test {test[0].day}..{test[-1].day}", res)


def cmd_compare(profile: HorizonProfile, other: Path, args: argparse.Namespace) -> None:
    """Predict every date of another calendar file and report stats + worst 10 days."""
    odays = load_days(other, args.utc_offset_hours)
    dst_check(odays, other.name, args.utc_offset_hours)
    res = evaluate(profile, odays, args.utc_offset_hours)
    print_eval(f"compare {other.name}: {odays[0].day}..{odays[-1].day}", res)
    mode = rounding_mode(args)
    ranked = sorted(res, key=lambda r: -abs(round_seconds(r[1], mode) - r[0].visible_s))[:10]
    print(f"  worst 10 ({'raw' if mode == 'none' else mode}): date predicted printed diff")
    for d, p in ranked:
        pr = round_seconds(p, mode)
        print(f"  {d.day} {fmt_time(pr, mode)} {fmt_time(d.visible_s, 'nearest')} {pr - d.visible_s:+.1f}s")


def cmd_range(profile: HorizonProfile, days: Sequence[Day], a: date, b: date, args: argparse.Namespace) -> None:
    """Print one line per day; include the printed value and difference when known."""
    known = {d.day: d for d in days}
    mode = rounding_mode(args)
    for day in date_range(a, b):
        p = round_seconds(predict_local_seconds(profile, day, args.utc_offset_hours), mode)
        off = utc_offset_hours(day, args.utc_offset_hours)
        line = f"{day} {day.strftime('%a')} UTC{off:+g} {fmt_time(p, mode)}"
        k = known.get(day)
        if k and k.visible_s is not None:
            line += f"  printed {fmt_time(k.visible_s, 'nearest')} diff {p - k.visible_s:+.1f}s"
        print(line)


def rounding_mode(args: argparse.Namespace) -> str:
    """Map CLI flags to a rounding mode."""
    if args.no_round:
        return "none"
    return "up" if args.round_up else "nearest"


def parse_args(argv: Optional[Sequence[str]]) -> argparse.Namespace:
    """Command-line interface."""
    p = argparse.ArgumentParser(description="Predict visible sunrise from one year of zmanim calendar data (Model H).")
    p.add_argument("data", type=Path, help="zmanim JSON used for learning")
    p.add_argument("date", nargs="?", help="single date to predict, YYYY-MM-DD")
    p.add_argument("--from", dest="date_from", help="range start, YYYY-MM-DD")
    p.add_argument("--to", dest="date_to", help="range end, YYYY-MM-DD (inclusive)")
    p.add_argument("--validate", action="store_true", help="held-out one-year test on the data file")
    p.add_argument("--compare", type=Path, metavar="OTHER.json", help="predict every date of another calendar file")
    p.add_argument("--export-profile", type=Path, metavar="PROFILE.json", help="write the learned model")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--no-round", action="store_true", help="print raw seconds")
    g.add_argument("--round-up", action="store_true", help="round up to the next 15 s (safer for vatikin)")
    p.add_argument("--lat", type=float, help="override latitude (deg N)")
    p.add_argument("--lon", type=float, help="override longitude (deg E)")
    p.add_argument("--utc-offset-hours", type=float, help="force a fixed UTC offset instead of the Israel DST rule")
    p.add_argument("--bandwidth", type=float, default=DEFAULT_BANDWIDTH_DEG, help="loess window, deg (default 0.6)")
    p.add_argument("--grid-step", type=float, default=DEFAULT_GRID_STEP_DEG, help="profile azimuth step, deg (default 0.25)")
    args = p.parse_args(argv)
    if (args.date_from is None) != (args.date_to is None):
        p.error("--from and --to must be used together")
    if not (args.date or args.date_from or args.validate or args.compare or args.export_profile):
        p.error("nothing to do: give a date, --from/--to, --validate, --compare or --export-profile")
    return args


def main(argv: Optional[Sequence[str]] = None) -> int:
    """Entry point."""
    args = parse_args(argv)
    single = parse_iso_date(args.date) if args.date else None
    span = (parse_iso_date(args.date_from), parse_iso_date(args.date_to)) if args.date_from else None
    if span and span[1] < span[0]:
        raise SystemExit("error: --to is before --from")
    days = load_days(args.data, args.utc_offset_hours)
    dst_check(days, args.data.name, args.utc_offset_hours)
    if args.validate:
        cmd_validate(days, args)
    needs_model = args.date or args.date_from or args.compare or args.export_profile
    if not needs_model:
        return 0
    profile = build_model(days, args)
    if args.export_profile:
        args.export_profile.write_text(json.dumps(profile.to_json(), indent=2), encoding="utf-8")
        print(f"profile written to {args.export_profile} ({len(profile.altitudes)} grid points)")
    if single:
        mode = rounding_mode(args)
        p = predict_local_seconds(profile, single, args.utc_offset_hours)
        print(f"{single} {fmt_time(round_seconds(p, mode), mode)}")
    if span:
        cmd_range(profile, days, span[0], span[1], args)
    if args.compare:
        cmd_compare(profile, args.compare, args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
