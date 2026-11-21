import type { RideStats, TrackPoint } from "./types";

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversine(aLat: number, aLon: number, bLat: number, bLon: number) {
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Cumulative distance in km at each point. */
export function cumulativeKm(points: TrackPoint[]) {
  const out = new Array<number>(points.length);
  let d = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) d += haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    out[i] = d / 1000;
  }
  return out;
}

export function computeStats(points: TrackPoint[]): RideStats {
  const n = points.length;
  const empty: RideStats = {
    distanceKm: 0, elevGainM: 0, elevLossM: 0, movingSec: 0, elapsedSec: 0,
    maxEleM: 0, minEleM: 0, maxSpeedKmh: 0, avgSpeedKmh: 0,
  };
  if (n < 2) return empty;
  let dist = 0, moving = 0, maxSpeed = 0;
  const hasTime = points[0][3] > 0 && points[n - 1][3] > points[0][3];
  // Smooth elevation before summing gain; raw GPS/baro noise inflates climbing badly.
  const ele = smooth(points.map((p) => p[2]), 5);
  let gain = 0, loss = 0, anchor = ele[0];
  const THRESH = 3; // metres of hysteresis
  let maxEle = -Infinity, minEle = Infinity;
  for (let i = 0; i < n; i++) {
    maxEle = Math.max(maxEle, ele[i]);
    minEle = Math.min(minEle, ele[i]);
    if (i === 0) continue;
    const seg = haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    dist += seg;
    const dt = points[i][3] - points[i - 1][3];
    if (hasTime && dt > 0) {
      const kmh = (seg / dt) * 3.6;
      // Moving = faster than a slow walk, and not a long pause between samples.
      if (kmh > 1.5 && dt < 120) {
        moving += dt;
        if (kmh < 90 && dt >= 2) maxSpeed = Math.max(maxSpeed, kmh);
      }
    }
    const d = ele[i] - anchor;
    if (d >= THRESH) { gain += d; anchor = ele[i]; }
    else if (d <= -THRESH) { loss -= d; anchor = ele[i]; }
  }
  const elapsed = hasTime ? points[n - 1][3] - points[0][3] : 0;
  return {
    distanceKm: dist / 1000,
    elevGainM: gain,
    elevLossM: loss,
    movingSec: moving,
    elapsedSec: elapsed,
    maxEleM: maxEle,
    minEleM: minEle,
    maxSpeedKmh: maxSpeed,
    avgSpeedKmh: moving > 0 ? dist / 1000 / (moving / 3600) : 0,
  };
}

function smooth(xs: number[], win: number) {
  const out = new Array<number>(xs.length);
  const h = Math.floor(win / 2);
  for (let i = 0; i < xs.length; i++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - h); j <= Math.min(xs.length - 1, i + h); j++) { s += xs[j]; c++; }
    out[i] = s / c;
  }
  return out;
}

/** Keep at most `max` points, evenly spaced, always keeping the last one. */
export function downsample(points: TrackPoint[], max = 1500): TrackPoint[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out: TrackPoint[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
}

/** Position on the track at a UTC time (seconds). Null if outside the ride by more than `slackSec`. */
export function locateAtTime(points: TrackPoint[], cum: number[], tSec: number, slackSec = 600) {
  const n = points.length;
  if (n < 2 || points[0][3] === 0) return null;
  const t0 = points[0][3], t1 = points[n - 1][3];
  if (tSec < t0 - slackSec || tSec > t1 + slackSec) return null;
  if (tSec <= t0) return { lat: points[0][0], lon: points[0][1], ele: points[0][2], km: 0 };
  if (tSec >= t1) return { lat: points[n - 1][0], lon: points[n - 1][1], ele: points[n - 1][2], km: cum[n - 1] };
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid][3] <= tSec) lo = mid; else hi = mid;
  }
  const a = points[lo], b = points[hi];
  const f = b[3] === a[3] ? 0 : (tSec - a[3]) / (b[3] - a[3]);
  return {
    lat: a[0] + (b[0] - a[0]) * f,
    lon: a[1] + (b[1] - a[1]) * f,
    ele: a[2] + (b[2] - a[2]) * f,
    km: cum[lo] + (cum[hi] - cum[lo]) * f,
  };
}

/** Nearest point on the track to a coordinate (for photos that carry their own GPS). */
export function locateNearest(points: TrackPoint[], cum: number[], lat: number, lon: number) {
  let best = -1, bestD = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = haversine(lat, lon, points[i][0], points[i][1]);
    if (d < bestD) { bestD = d; best = i; }
  }
  if (best < 0 || bestD > 400) return null;
  return { lat, lon, ele: points[best][2], km: cum[best] };
}

export type Bounds = { minLat: number; maxLat: number; minLon: number; maxLon: number };

export function boundsOf(tracks: TrackPoint[][]): Bounds | null {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const t of tracks) for (const p of t) {
    if (p[0] < minLat) minLat = p[0];
    if (p[0] > maxLat) maxLat = p[0];
    if (p[1] < minLon) minLon = p[1];
    if (p[1] > maxLon) maxLon = p[1];
  }
  return Number.isFinite(minLat) ? { minLat, maxLat, minLon, maxLon } : null;
}

/** Compass bearing (degrees) of travel along the track around a given distance (km). */
export function bearingAt(points: TrackPoint[], cum: number[], km: number, spanKm = 0.6) {
  if (points.length < 2) return 0;
  const idx = (k: number) => {
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < k) lo = m; else hi = m; }
    return hi;
  };
  const a = points[idx(Math.max(0, km - spanKm / 2))];
  const b = points[idx(Math.min(cum[cum.length - 1], km + spanKm / 2))];
  const φ1 = (a[0] * Math.PI) / 180, φ2 = (b[0] * Math.PI) / 180, Δλ = ((b[1] - a[1]) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Overall heading from start to end, used to look "up the route" when framing a whole day. */
export function overallBearing(points: TrackPoint[]) {
  if (points.length < 2) return 0;
  const cum = cumulativeKm(points);
  return bearingAt(points, cum, cum[cum.length - 1] / 2, cum[cum.length - 1]);
}
