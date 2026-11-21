import { cumulativeKm, locateAtTime, locateNearest } from "./geo";
import type { Media, Ride, Rider, Trip } from "./types";
import { dayKey, dayKeyToMs, sum } from "./util";

export type MediaX = Media & {
  utcMs: number | null;
  localMs: number | null;
  date: string | null;
  rideId?: string;
  km?: number;
  ele?: number;
  plat?: number;
  plon?: number;
};

/** One outing. Several riders recording the same ride collapse into one group. */
export type RideGroup = { primary: Ride; rides: Ride[] };

export type DayStats = {
  distanceKm: number; elevGainM: number; elevLossM: number; movingSec: number;
  maxEleM: number; minEleM: number; maxSpeedKmh: number;
};

export type Day = {
  date: string;
  index: number;
  localMs: number;
  groups: RideGroup[];
  media: MediaX[];
  stats: DayStats;
  startLocalMs: number | null;
};

export type RiderStat = { rider: Rider; distanceKm: number; elevGainM: number; movingSec: number; rides: number; photos: number; maxSpeedKmh: number };

export type Analysis = {
  days: Day[];
  undated: MediaX[];
  totals: DayStats & { days: number; rideDays: number; outings: number; photos: number; videos: number };
  riderStats: RiderStat[];
  startDate: string | null;
  endDate: string | null;
  mediaById: Map<string, MediaX>;
  awards: { label: string; name: string; value: string }[];
};

const zero = (): DayStats => ({ distanceKm: 0, elevGainM: 0, elevLossM: 0, movingSec: 0, maxEleM: 0, minEleM: 0, maxSpeedKmh: 0 });

function groupRides(rides: Ride[]): RideGroup[] {
  const sorted = [...rides].sort((a, b) => a.startUtc - b.startUtc);
  const groups: RideGroup[] = [];
  for (const r of sorted) {
    const rEnd = r.startUtc + r.stats.elapsedSec * 1000;
    const hit = r.startUtc > 0 && groups.find((g) => {
      const p = g.primary;
      if (!p.startUtc || p.riderId === r.riderId) return false;
      const pEnd = p.startUtc + p.stats.elapsedSec * 1000;
      const overlap = Math.min(pEnd, rEnd) - Math.max(p.startUtc, r.startUtc);
      const shorter = Math.min(pEnd - p.startUtc, rEnd - r.startUtc);
      return shorter > 0 && overlap / shorter >= 0.5;
    });
    if (hit) {
      hit.rides.push(r);
      if (r.stats.distanceKm > hit.primary.stats.distanceKm) hit.primary = r;
    } else groups.push({ primary: r, rides: [r] });
  }
  return groups;
}

export function analyze(trip: Trip, rides: Ride[], media: Media[]): Analysis {
  const off = trip.utcOffsetMin * 60000;
  const cums = new Map(rides.map((r) => [r.id, cumulativeKm(r.points)]));

  const mx: MediaX[] = media.map((m) => {
    const utcMs = m.takenUtcMs ?? (m.takenLocalMs != null ? m.takenLocalMs - off : null);
    const localMs = m.takenLocalMs ?? (m.takenUtcMs != null ? m.takenUtcMs + off : null);
    const x: MediaX = { ...m, utcMs, localMs, date: localMs != null ? dayKey(localMs) : null, plat: m.lat, plon: m.lon };
    // Place the shot on a ride: prefer the photographer's own track, then anyone's.
    const order = [...rides].sort((a, b) => Number(b.riderId === m.riderId) - Number(a.riderId === m.riderId));
    for (const r of order) {
      const cum = cums.get(r.id)!;
      const loc =
        (utcMs != null ? locateAtTime(r.points, cum, utcMs / 1000) : null) ??
        (m.lat != null && m.lon != null && (utcMs == null || !r.startUtc) ? locateNearest(r.points, cum, m.lat, m.lon) : null);
      if (loc) {
        x.rideId = r.id; x.km = loc.km; x.ele = loc.ele;
        if (x.plat == null) { x.plat = loc.lat; x.plon = loc.lon; }
        break;
      }
    }
    return x;
  });

  const byDay = new Map<string, { rides: Ride[]; media: MediaX[] }>();
  const slot = (k: string) => {
    if (!byDay.has(k)) byDay.set(k, { rides: [], media: [] });
    return byDay.get(k)!;
  };
  const timed = rides.filter((r) => r.startUtc > 0);
  for (const r of timed) slot(dayKey(r.startUtc + off)).rides.push(r);
  for (const m of mx) if (m.date) slot(m.date).media.push(m);
  // Rides with no timestamps (planned routes) go on the first day so they still appear.
  const untimed = rides.filter((r) => !r.startUtc);
  if (untimed.length) {
    const firstKey = [...byDay.keys()].sort()[0] ?? dayKey(trip.createdAt + off);
    slot(firstKey).rides.push(...untimed);
  }

  const keys = [...byDay.keys()].sort();
  const days: Day[] = keys.map((date, i) => {
    const d = byDay.get(date)!;
    const groups = groupRides(d.rides);
    const prim = groups.map((g) => g.primary);
    const stats: DayStats = prim.length
      ? {
          distanceKm: sum(prim.map((r) => r.stats.distanceKm)),
          elevGainM: sum(prim.map((r) => r.stats.elevGainM)),
          elevLossM: sum(prim.map((r) => r.stats.elevLossM)),
          movingSec: sum(prim.map((r) => r.stats.movingSec)),
          maxEleM: Math.max(...prim.map((r) => r.stats.maxEleM)),
          minEleM: Math.min(...prim.map((r) => r.stats.minEleM)),
          maxSpeedKmh: Math.max(...d.rides.map((r) => r.stats.maxSpeedKmh)),
        }
      : zero();
    const firstStart = prim.filter((r) => r.startUtc).map((r) => r.startUtc + off).sort((a, b) => a - b)[0] ?? null;
    return {
      date, index: i + 1, localMs: dayKeyToMs(date), groups,
      media: d.media.sort((a, b) => (a.localMs ?? 0) - (b.localMs ?? 0)),
      stats, startLocalMs: firstStart,
    };
  });

  const rideDays = days.filter((d) => d.groups.length);
  const totals = {
    ...zero(),
    distanceKm: sum(days.map((d) => d.stats.distanceKm)),
    elevGainM: sum(days.map((d) => d.stats.elevGainM)),
    elevLossM: sum(days.map((d) => d.stats.elevLossM)),
    movingSec: sum(days.map((d) => d.stats.movingSec)),
    maxEleM: rideDays.length ? Math.max(...rideDays.map((d) => d.stats.maxEleM)) : 0,
    minEleM: rideDays.length ? Math.min(...rideDays.map((d) => d.stats.minEleM)) : 0,
    maxSpeedKmh: rideDays.length ? Math.max(...rideDays.map((d) => d.stats.maxSpeedKmh)) : 0,
    days: days.length,
    rideDays: rideDays.length,
    outings: sum(days.map((d) => d.groups.length)),
    photos: media.filter((m) => m.kind === "photo" && !m.hidden).length,
    videos: media.filter((m) => m.kind === "video" && !m.hidden).length,
  };

  const riderStats: RiderStat[] = trip.crew.map((rider) => {
    const own = rides.filter((r) => r.riderId === rider.id);
    return {
      rider,
      distanceKm: sum(own.map((r) => r.stats.distanceKm)),
      elevGainM: sum(own.map((r) => r.stats.elevGainM)),
      movingSec: sum(own.map((r) => r.stats.movingSec)),
      maxSpeedKmh: own.length ? Math.max(...own.map((r) => r.stats.maxSpeedKmh)) : 0,
      rides: own.length,
      photos: media.filter((m) => m.riderId === rider.id && !m.hidden).length,
    };
  });

  const awards: Analysis["awards"] = [];
  const top = (f: (r: RiderStat) => number) => [...riderStats].sort((a, b) => f(b) - f(a))[0];
  if (riderStats.length > 1) {
    const climb = top((r) => r.elevGainM);
    if (climb?.elevGainM > 0) awards.push({ label: "Mountain goat", name: climb.rider.name, value: `${Math.round(climb.elevGainM).toLocaleString("en-US")} m climbed` });
    const fast = top((r) => r.maxSpeedKmh);
    if (fast?.maxSpeedKmh > 0) awards.push({ label: "Brakes optional", name: fast.rider.name, value: `${fast.maxSpeedKmh.toFixed(0)} km/h top speed` });
    const shots = top((r) => r.photos);
    if (shots?.photos > 0) awards.push({ label: "Trip photographer", name: shots.rider.name, value: `${shots.photos} shots` });
    const far = top((r) => r.distanceKm);
    if (far?.distanceKm > 0 && far.rider.id !== climb?.rider.id) awards.push({ label: "Longest in the saddle", name: far.rider.name, value: `${far.distanceKm.toFixed(0)} km` });
  }

  return {
    days,
    undated: mx.filter((m) => !m.date),
    totals,
    riderStats,
    startDate: keys[0] ?? null,
    endDate: keys[keys.length - 1] ?? null,
    mediaById: new Map(mx.map((m) => [m.id, m])),
    awards,
  };
}

/** Choose up to n shots for a day: starred first, then spread across the day, skipping bursts. */
export function pickPhotos(media: MediaX[], n: number, exclude: Set<string> = new Set()): MediaX[] {
  const pool = media.filter((m) => !m.hidden && !exclude.has(m.id));
  if (pool.length <= n) return pool;
  const starred = pool.filter((m) => m.starred);
  const chosen = new Map<string, MediaX>(starred.slice(0, n).map((m) => [m.id, m]));
  // Drop near-duplicates (bursts), then take evenly spaced shots, photos before videos.
  const rest = pool.filter((m, i) => !m.starred && !(i > 0 && m.localMs != null && pool[i - 1].localMs != null && m.localMs - pool[i - 1].localMs! < 4000));
  const ordered = [...rest.filter((m) => m.kind === "photo"), ...rest.filter((m) => m.kind === "video")];
  const need = n - chosen.size;
  if (need > 0 && ordered.length) {
    const photos = rest.filter((m) => m.kind === "photo");
    const src = photos.length >= need ? photos : ordered;
    for (let i = 0; i < need && i < src.length; i++) {
      const m = src[Math.min(src.length - 1, Math.round(((i + 0.5) * src.length) / need - 0.5))];
      chosen.set(m.id, m);
    }
    for (const m of ordered) { if (chosen.size >= n) break; chosen.set(m.id, m); }
  }
  return [...chosen.values()].sort((a, b) => (a.localMs ?? 0) - (b.localMs ?? 0));
}

/** The hero shot: a starred landscape photo, else the highest-elevation landscape photo. */
export function pickCover(a: Analysis): MediaX | null {
  const all = a.days.flatMap((d) => d.media).concat(a.undated).filter((m) => !m.hidden && m.kind === "photo");
  if (!all.length) return null;
  const land = all.filter((m) => m.w >= m.h);
  const pool = land.length ? land : all;
  return pool.find((m) => m.starred) ?? [...pool].sort((x, y) => (y.ele ?? 0) - (x.ele ?? 0))[0];
}
