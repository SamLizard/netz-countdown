// Research script: can visible sunrise be predicted for future years from one year of data?
// Reads ../../../zmanimData.json at runtime (never embeds data). Prints aggregate stats only.
// Usage (PowerShell):
//   $env:ASTRO_PATH="$env:TEMP\sunres\node_modules\astronomy-engine\astronomy.js"
//   node docs/research/scripts/analyze_sunrise.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const A = require(process.env.ASTRO_PATH || 'astronomy-engine');
const data = JSON.parse(readFileSync(path.join(here, '../../../zmanimData.json'), 'utf8'));
const PLAIN = "back:nets ha'hama במישור";

// ---------- helpers ----------
const parseHMS = (s) => { const [h, m, x] = s.split(':').map(Number); return h * 3600 + m * 60 + (x || 0); };
const lastSunday = (y, m) => { const d = new Date(Date.UTC(y, m + 1, 0)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d; };
// Israel rule (2013 law): DST from Friday before last Sunday of March to last Sunday of October.
function isIsraelDST(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d);
  const start = lastSunday(y, 2).getTime() - 2 * 86400e3;
  const end = lastSunday(y, 9).getTime();
  return t >= start && t < end; // sunrise (~6am) is after the 02:00 switch on switch days
}
const stats = (arr) => {
  const a = arr.filter(Number.isFinite); const n = a.length;
  if (!n) return { n: 0 };
  const mean = a.reduce((s, v) => s + v, 0) / n;
  const abs = a.map(Math.abs).sort((p, q) => p - q);
  const rms = Math.sqrt(a.reduce((s, v) => s + v * v, 0) / n);
  return { n, mean: +mean.toFixed(1), rms: +rms.toFixed(1), p95abs: abs[Math.floor(0.95 * (n - 1))], maxAbs: +abs[n - 1].toFixed(1),
    within15: +(100 * abs.filter((v) => v <= 15.0001).length / n).toFixed(1), within30: +(100 * abs.filter((v) => v <= 30.0001).length / n).toFixed(1) };
};
const fmt = (o) => JSON.stringify(o);
const addDays = (iso, k) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10); };

// ---------- load days (convert to Israel Standard Time, UTC+2) ----------
const days = Object.keys(data.days).sort().map((iso) => {
  const t = data.days[iso].times;
  const dst = isIsraelDST(iso);
  const vis = parseHMS(t.visible_sunrise) - (dst ? 3600 : 0);
  const plain = t[PLAIN] ? parseHMS(t[PLAIN]) - (dst ? 3600 : 0) : NaN;
  return { iso, dst, vis, plain };
});
const byIso = new Map(days.map((d) => [d.iso, d]));

// DST check: after conversion, no day-to-day jump > 5 min should remain.
let jumps = 0; for (let i = 1; i < days.length; i++) if (Math.abs(days[i].vis - days[i - 1].vis) > 300) jumps++;
console.log('days', days.length, 'residual DST-like jumps after rule conversion:', jumps);
const rawJumps = []; for (let i = 1; i < days.length; i++) {
  const a = parseHMS(data.days[days[i - 1].iso].times.visible_sunrise), b = parseHMS(data.days[days[i].iso].times.visible_sunrise);
  if (Math.abs(b - a) > 1800) rawJumps.push(days[i].iso + (b > a ? ' +1h' : ' -1h'));
}
console.log('raw DST jumps in data:', rawJumps.join(', '));

// ---------- 2a: overlap, same calendar day one year apart ----------
const overlap = days.filter((d) => d.iso >= '2027-09-06').map((d) => [byIso.get('2026' + d.iso.slice(4)), d]).filter(([a]) => a);
console.log('\n[2a] overlap pairs', overlap.length);
console.log(' visible 2027-2026 (s, standard time):', fmt(stats(overlap.map(([a, b]) => b.vis - a.vis))));
console.log(' plain   2027-2026 (s, standard time):', fmt(stats(overlap.map(([a, b]) => b.plain - a.plain))));
const naive = overlap.map(([a, b]) => (b.vis + (b.dst ? 3600 : 0)) - (a.vis + (a.dst ? 3600 : 0)));
console.log(' visible, naive local clock (no DST fix):', fmt(stats(naive)), 'days off by ~1h:', naive.filter((v) => Math.abs(v) > 1800).length);

// ---------- astronomy ----------
const SEC = 1 / 86400;
function sunGeoAlt(date, obs) { // geometric (airless) altitude of sun centre, and azimuth
  const eq = A.Equator(A.Body.Sun, date, obs, true, true);
  const h = A.Horizon(date, obs, eq.ra, eq.dec, '');
  return h;
}
// Find time (Date) when geometric centre altitude crosses target alt (deg) rising, morning of local date iso.
function riseTime(iso, obs, targetFn) {
  // search 03:00..09:00 UTC+2 => 01:00..07:00 UTC
  let t0 = new Date(iso + 'T01:00:00Z').getTime(), t1 = new Date(iso + 'T08:00:00Z').getTime();
  const f = (t) => { const h = sunGeoAlt(new Date(t), obs); return h.altitude - targetFn(h.azimuth); };
  if (f(t0) > 0 || f(t1) < 0) return NaN;
  for (let i = 0; i < 40; i++) { const m = (t0 + t1) / 2; if (f(m) > 0) t1 = m; else t0 = m; }
  return (t0 + t1) / 2;
}
const toLocalStdSec = (ms, iso) => (ms - new Date(iso + 'T00:00:00Z').getTime()) / 1000 + 7200;

// Fit lon/lat on the plain sunrise (standard: centre at -0.8333 deg geometric, sea level).
const PLAIN_ALT = () => -0.8333;
function plainResid(lat, lon, sample) {
  const obs = new A.Observer(lat, lon, 0);
  return sample.map((d) => d.plain - toLocalStdSec(riseTime(d.iso, obs, PLAIN_ALT), d.iso));
}
const fitSample = days.filter((_, i) => i % 7 === 0 && Number.isFinite(_.plain));
let best = null;
for (let lat = 31.6; lat <= 32.6; lat += 0.1) for (let lon = 34.6; lon <= 35.4; lon += 0.05) {
  const r = plainResid(lat, lon, fitSample); const s = stats(r);
  if (!best || s.rms < best.s.rms) best = { lat, lon, s };
}
// refine
for (let lat = best.lat - 0.1; lat <= best.lat + 0.1; lat += 0.02) for (let lon = best.lon - 0.05; lon <= best.lon + 0.05; lon += 0.01) {
  const s = stats(plainResid(lat, lon, fitSample)); if (s.rms < best.s.rms) best = { lat, lon, s };
}
const LAT = +best.lat.toFixed(2), LON = +best.lon.toFixed(2);
const obs = new A.Observer(LAT, LON, 0);
console.log('\n[2c] fitted location from plain sunrise:', LAT, LON);
const plainAll = days.filter((d) => Number.isFinite(d.plain)).map((d) => d.plain - toLocalStdSec(riseTime(d.iso, obs, PLAIN_ALT), d.iso));
console.log(' plain(calendar) - astro(-0.833deg) all days:', fmt(stats(plainAll)));
const raanana = new A.Observer(32.18, 34.87, 0);
console.log(' same, using Raanana 32.18N 34.87E:', fmt(stats(days.map((d) => d.plain - toLocalStdSec(riseTime(d.iso, raanana, PLAIN_ALT), d.iso)))));

// Per-day: astro plain rise, azimuth at astro rise, sun geometric altitude at the VISIBLE time.
for (const d of days) {
  const msPlain = riseTime(d.iso, obs, PLAIN_ALT);
  d.astroPlain = toLocalStdSec(msPlain, d.iso);
  d.azRise = sunGeoAlt(new Date(msPlain), obs).azimuth;
  const msVis = new Date(d.iso + 'T00:00:00Z').getTime() + (d.vis - 7200) * 1000;
  const h = sunGeoAlt(new Date(msVis), obs);
  d.visAlt = h.altitude; d.visAz = h.azimuth;
  d.decl = A.Equator(A.Body.Sun, new Date(msPlain), obs, true, true).dec;
  d.offset = d.vis - d.plain; // calendar visible - calendar plain
}

// ---------- 2b: smoothness of offset ----------
const dOff = []; for (let i = 1; i < days.length; i++) dOff.push(days[i].offset - days[i - 1].offset);
const offs = days.map((d) => d.offset).filter(Number.isFinite);
console.log('\n[2b] offset visible-plain (s):', fmt(stats(offs)), 'min', Math.min(...offs), 'max', Math.max(...offs), 'days missing plain:', days.length - offs.length);
const dly = days.map((d) => d.vis - d.astroPlain);
console.log(' delay visible - astro plain (s): min', Math.min(...dly).toFixed(0), 'max', Math.max(...dly).toFixed(0));
// offset binned by sunrise azimuth (5 deg bins), mean only
const bins = {}; for (const d of days) { const b = Math.floor(d.azRise / 5) * 5; (bins[b] ||= []).push(d.vis - d.astroPlain); }
console.log(' mean delay by azimuth bin:', Object.keys(bins).sort((a, b) => a - b).map((b) => `${b}:${(bins[b].reduce((s, v) => s + v, 0) / bins[b].length).toFixed(0)}`).join(' '));
// residual of offset after smoothing by azimuth (how noisy is it vs a smooth curve)
{ const f = loess(days.map((d) => d.azRise), dly, 0.6); console.log(' delay residual vs smooth f(azimuth), in-sample (s):', fmt(stats(days.map((d, i) => dly[i] - f(d.azRise))))); }
console.log(' day-to-day change of offset:', fmt(stats(dOff)));
console.log(' sunrise azimuth range:', Math.min(...days.map((d) => d.azRise)).toFixed(1), '..', Math.max(...days.map((d) => d.azRise)).toFixed(1));
console.log(' implied geometric sun-centre altitude at visible time (deg):', fmt(stats(days.map((d) => d.visAlt))),
  'min', Math.min(...days.map((d) => d.visAlt)).toFixed(3), 'max', Math.max(...days.map((d) => d.visAlt)).toFixed(3));

// ---------- models ----------
// Local linear regression (tricube kernel) on x -> y.
function loess(xs, ys, bw) {
  const lo = Math.min(...xs), hi = Math.max(...xs);
  return (x0) => {
    const x = Math.min(hi, Math.max(lo, x0)); // clamp: solstice azimuths can slightly exceed the training range
    let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < xs.length; i++) {
      const u = Math.abs(xs[i] - x) / bw; if (u >= 1) continue;
      const w = (1 - u ** 3) ** 3; sw += w; sx += w * xs[i]; sy += w * ys[i]; sxx += w * xs[i] ** 2; sxy += w * xs[i] * ys[i];
    }
    if (sw === 0) return NaN;
    const den = sw * sxx - sx * sx;
    if (Math.abs(den) < 1e-12) return sy / sw;
    const b = (sw * sxy - sx * sy) / den; return (sy - b * sx) / sw + b * x;
  };
}
const round15 = (s) => Math.round(s / 15) * 15;
const ceil15 = (s) => Math.ceil(s / 15) * 15;

function evaluate(train, test, label, bwAz = 0.6) {
  // Model H (horizon profile): learn geometric altitude threshold vs azimuth at visible time; solve for future dates.
  const prof = loess(train.map((d) => d.visAz), train.map((d) => d.visAlt), bwAz);
  // Model D (delay): learn (visible - astroPlain) seconds vs sunrise azimuth.
  const del = loess(train.map((d) => d.azRise), train.map((d) => d.vis - d.astroPlain), bwAz);
  const eH = [], eHr = [], eHc = [], eD = [], eDr = [];
  for (const d of test) {
    const p = toLocalStdSec(riseTime(d.iso, obs, prof), d.iso);
    eH.push(p - d.vis); eHr.push(round15(p) - d.vis); eHc.push(ceil15(p) - d.vis);
    const q = d.astroPlain + del(d.azRise); eD.push(q - d.vis); eDr.push(round15(q) - d.vis);
  }
  console.log(`\n[${label}] train ${train.length} days, test ${test.length} days (pred - calendar, s)`);
  console.log('  horizon-profile model raw     :', fmt(stats(eH)));
  console.log('  horizon-profile model round15 :', fmt(stats(eHr)));
  console.log('  horizon-profile model ceil15  :', fmt(stats(eHc)));
  console.log('  delay(azimuth) model raw      :', fmt(stats(eD)));
  console.log('  delay(azimuth) model round15  :', fmt(stats(eDr)));
  return { prof, del };
}
const Y1 = days.filter((d) => d.iso < '2027-09-06'), T1 = days.filter((d) => d.iso >= '2027-09-06');
const Y2 = days.filter((d) => d.iso > '2026-11-06'), T2 = days.filter((d) => d.iso <= '2026-11-06');
const m1 = evaluate(Y1, T1, '2c forward: train 2026-09-06..2027-09-05 -> test 2027-09-06..11-06');
evaluate(Y2, T2, '2c backward: train 2026-11-07..2027-11-06 -> test 2026-09-06..11-06');
for (const bw of [0.3, 1.0, 1.5]) evaluate(Y1, T1, `bandwidth ${bw} deg`, bw);

// Fallback: same calendar day last year (standard time), then re-apply DST by rule.
console.log('\n[3 fallback] same calendar day previous year, standard time:', fmt(stats(overlap.map(([a, b]) => a.vis - b.vis))));

// In-sample fit and spring/autumn cross-check (sun passes each azimuth twice a year).
const fitRes = Y1.map((d) => m1.prof(d.visAz) - d.visAlt);
console.log('\n[cross] in-sample altitude residual (deg):', fmt(stats(fitRes.map((v) => +(v * 1000).toFixed(1)))), '(x1e-3 deg)');
const rising = Y1.filter((d) => { const n = byIso.get(addDays(d.iso, 1)); return n && n.azRise < d.azRise; }); // azimuth decreasing: Dec->Jun (northward)
const falling = Y1.filter((d) => !rising.includes(d));
const profR = loess(rising.map((d) => d.visAz), rising.map((d) => d.visAlt), 0.6);
const xs = []; for (const d of falling) { const p = toLocalStdSec(riseTime(d.iso, obs, profR), d.iso); if (Number.isFinite(p)) xs.push(p - d.vis); }
console.log('[cross] profile from Dec->Jun half predicts Jun->Dec half (s):', fmt(stats(xs)));

// ---------- 1: year-to-year drift of astronomical sunrise for same calendar date ----------
console.log('\n[1] astro plain sunrise, same calendar date, year Y vs 2027 (s):');
const baseDates = []; for (let k = 0; k < 365; k += 1) baseDates.push(addDays('2027-01-01', k));
for (const y of [2026, 2028, 2029, 2030, 2031, 2035, 2040]) {
  const diffs = baseDates.map((iso) => { const j = y + iso.slice(4);
    return toLocalStdSec(riseTime(j, obs, PLAIN_ALT), j) - toLocalStdSec(riseTime(iso, obs, PLAIN_ALT), iso); });
  console.log(`  ${y}:`, fmt(stats(diffs)));
}
console.log('\n[1] predicted VISIBLE (profile model, all data), same date, year Y vs 2027 (s):');
const profAll = loess(days.map((d) => d.visAz), days.map((d) => d.visAlt), 0.6);
for (const y of [2028, 2030, 2031, 2035]) {
  const diffs = baseDates.map((iso) => { const j = y + iso.slice(4);
    return toLocalStdSec(riseTime(j, obs, profAll), j) - toLocalStdSec(riseTime(iso, obs, profAll), iso); });
  console.log(`  ${y}:`, fmt(stats(diffs)));
}
// Fallback error for far years: same calendar date of the data year vs model prediction.
console.log('\n[3 fallback far] "copy 2027 date" vs profile-model prediction for year Y (s):');
for (const y of [2028, 2030, 2035]) {
  const diffs = baseDates.filter((iso) => byIso.has(iso)).map((iso) => { const j = y + iso.slice(4);
    return byIso.get(iso).vis - toLocalStdSec(riseTime(j, obs, profAll), j); });
  console.log(`  ${y}:`, fmt(stats(diffs)));
}
