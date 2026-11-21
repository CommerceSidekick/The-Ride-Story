"use client";
import { computeStats, downsample, haversine } from "./geo";
import { store } from "./store";
import type { Ride, Rider, TrackPoint, Trip } from "./types";
import { RIDER_COLORS, shortCode, uid } from "./util";

/**
 * A made-up three-day Oaxaca trip so a new user can see a finished storybook in one click.
 * Tracks and "photos" are generated in the browser; nothing here is a real GPS recording.
 */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type WP = [number, number, number]; // lat, lon, ele

function makeTrack(seed: number, wps: WP[], startUtcMs: number, jitter = 0) {
  const r = rng(seed);
  const pts: TrackPoint[] = [];
  const stops: number[] = []; // epoch seconds of photo stops
  let t = startUtcMs / 1000;
  const ph1 = r() * 6, ph2 = r() * 6;
  for (let w = 0; w < wps.length - 1; w++) {
    const a = wps[w], b = wps[w + 1];
    const segM = haversine(a[0], a[1], b[0], b[1]);
    const steps = Math.max(8, Math.round((segM * 1.5) / 22));
    const dLat = b[0] - a[0], dLon = b[1] - a[1];
    const len = Math.hypot(dLat, dLon) || 1;
    const nLat = -dLon / len, nLon = dLat / len; // perpendicular, for trail wiggle
    for (let i = 0; i < steps; i++) {
      const f = i / steps;
      const ease = Math.sin(f * Math.PI); // wiggle fades at waypoints
      const wig = (Math.sin(f * 19 + ph1 + w) * 0.0011 + Math.sin(f * 47 + ph2) * 0.0005) * ease;
      const lat = a[0] + dLat * f + nLat * wig + (r() - 0.5) * jitter;
      const lon = a[1] + dLon * f + nLon * wig + (r() - 0.5) * jitter;
      const ele = a[2] + (b[2] - a[2]) * f + Math.sin(f * 9 + ph1) * 14 * ease;
      const prev = pts[pts.length - 1];
      if (prev) {
        const d = haversine(prev[0], prev[1], lat, lon);
        const grade = d > 0 ? (ele - prev[2]) / d : 0;
        const kmh = grade > 0.03 ? 6.5 + r() * 2 : grade < -0.03 ? 21 + r() * 14 : 14 + r() * 4;
        t += d / (kmh / 3.6);
        if (r() < 0.012) { stops.push(t + 40); t += 150 + r() * 320; }
      }
      pts.push([lat, lon, ele, Math.round(t)]);
    }
  }
  stops.push(pts[0][3] + 120, pts[pts.length - 1][3] - 60);
  return { pts, stops: stops.sort((x, y) => x - y) };
}

/* ───────── Procedural "photos": layered ridgelines, a sun, pines, sometimes a rider ───────── */

const PALETTES = [
  { sky: ["#3f6fa8", "#a8c8e4", "#f1dcc0"], far: "#9db4c8", near: "#1f3a2c", sun: "#fff3d0" }, // morning
  { sky: ["#2f73c4", "#8ebbe8", "#dbe9f2"], far: "#a9c0cf", near: "#24452f", sun: "#ffffff" }, // midday
  { sky: ["#3a3f73", "#d9785a", "#f6c56f"], far: "#b9858a", near: "#2a2420", sun: "#ffe08a" }, // golden hour
  { sky: ["#586f8a", "#b9c4cc", "#e6e0d2"], far: "#a3aeb0", near: "#27352c", sun: "#f4f1e6" }, // cloud forest
];

const mix = (a: string, b: string, f: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * f)).join(",")})`;
};

function drawScene(seed: number, w: number, h: number, pal: number): HTMLCanvasElement {
  const r = rng(seed);
  const P = PALETTES[pal % PALETTES.length];
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, h * 0.75);
  sky.addColorStop(0, P.sky[0]); sky.addColorStop(0.6, P.sky[1]); sky.addColorStop(1, P.sky[2]);
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const sx = w * (0.2 + r() * 0.6), sy = h * (0.18 + r() * 0.25), sr = Math.min(w, h) * 0.05;
  const glow = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 7);
  glow.addColorStop(0, P.sun); glow.addColorStop(0.12, P.sun + "cc"); glow.addColorStop(1, P.sun + "00");
  g.fillStyle = glow; g.fillRect(0, 0, w, h);
  const layers = 5;
  let lastRidge: number[] = [];
  for (let L = 0; L < layers; L++) {
    const f = L / (layers - 1);
    const base = h * (0.42 + f * 0.4), amp = h * (0.07 + f * 0.05);
    const k1 = 1.2 + r() * 2, k2 = 3 + r() * 4, k3 = 9 + r() * 8;
    const p1 = r() * 9, p2 = r() * 9, p3 = r() * 9;
    const ridge: number[] = [];
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const u = x / w;
      const y = base - amp * (Math.sin(u * k1 * 3 + p1) * 0.6 + Math.sin(u * k2 * 3 + p2) * 0.28 + Math.sin(u * k3 * 3 + p3) * 0.1);
      ridge.push(y); g.lineTo(x, y);
    }
    g.lineTo(w, h); g.closePath();
    g.fillStyle = mix(P.far, P.near, Math.pow(f, 1.3)); g.fill();
    if (L >= layers - 2) {
      g.fillStyle = mix(P.far, P.near, Math.min(1, f + 0.15));
      for (let i = 0; i < ridge.length; i += 3 + Math.floor(r() * 5)) {
        const x = i * 4, y = ridge[i], th = h * (0.018 + r() * 0.03) * (L === layers - 1 ? 1.7 : 1);
        g.beginPath(); g.moveTo(x, y - th); g.lineTo(x - th * 0.32, y + 2); g.lineTo(x + th * 0.32, y + 2); g.fill();
      }
    }
    lastRidge = ridge;
  }
  if (r() < 0.6) {
    // tiny rider on the nearest ridgeline
    const i = Math.floor(lastRidge.length * (0.25 + r() * 0.5));
    const x = i * 4, y = lastRidge[i] - h * 0.012, s = h * 0.022;
    g.strokeStyle = "#0e0d0b"; g.fillStyle = "#0e0d0b"; g.lineWidth = s * 0.16; g.lineCap = "round";
    for (const dx of [-s, s]) { g.beginPath(); g.arc(x + dx, y, s * 0.62, 0, 7); g.stroke(); }
    g.beginPath(); g.moveTo(x - s, y); g.lineTo(x - s * 0.1, y - s * 0.9); g.lineTo(x + s * 0.75, y - s * 0.95); g.lineTo(x + s, y); g.stroke();
    g.beginPath(); g.moveTo(x - s * 0.1, y - s * 0.9); g.lineTo(x + s * 0.1, y - s * 1.9); g.lineTo(x + s * 0.75, y - s * 1.2); g.stroke();
    g.beginPath(); g.arc(x + s * 0.2, y - s * 2.25, s * 0.3, 0, 7); g.fill();
  }
  // film grain
  for (let i = 0; i < (w * h) / 260; i++) {
    g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    g.fillRect(r() * w, r() * h, 2, 2);
  }
  return c;
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.86));
function scaled(src: HTMLCanvasElement, max: number) {
  const s = max / Math.max(src.width, src.height);
  const c = document.createElement("canvas");
  c.width = Math.round(src.width * s); c.height = Math.round(src.height * s);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export async function createSampleTrip(onProgress?: (label: string) => void): Promise<Trip> {
  const OFF = -360; // Oaxaca is UTC−6 year-round
  const crew: Rider[] = ["Maya", "Tom", "Diego", "Sam"].map((name, i) => ({ id: uid(), name, color: RIDER_COLORS[i] }));
  const now = Date.now();
  const trip: Trip = {
    id: uid(), name: "Oaxaca", location: "Sierra Norte, Oaxaca, México", utcOffsetMin: OFF, units: "metric", crew,
    notes: "", inviteCode: shortCode(), sample: true, createdAt: now, updatedAt: now,
    dayNotes: {
      "2026-11-07": "Tom flatted twice before the first overlook and blamed the cactus both times. Tlayudas and mezcal at the bottom fixed everything.",
    },
  };
  await store.saveTrip(trip);

  const local = (d: string, hm: string) => Date.parse(`${d}T${hm}:00Z`) - OFF * 60000;
  const plans: { name: string; date: string; start: string; wps: WP[]; riders: number[]; pal: number }[] = [
    {
      name: "Ixtepeji ridge laps", date: "2026-11-06", start: "09:20", riders: [0, 1], pal: 0,
      wps: [[17.186, -96.633, 2905], [17.201, -96.622, 3040], [17.214, -96.637, 2960], [17.207, -96.655, 2760], [17.192, -96.651, 2840], [17.186, -96.633, 2905]],
    },
    {
      name: "La Cumbre to San Felipe", date: "2026-11-07", start: "08:45", riders: [0, 2], pal: 2,
      wps: [[17.186, -96.633, 2950], [17.172, -96.648, 2700], [17.158, -96.642, 2810], [17.143, -96.668, 2380], [17.127, -96.684, 2050], [17.118, -96.702, 1900], [17.105, -96.713, 1720]],
    },
    {
      name: "Cuajimoloyas – Latuvi – Benito Juárez", date: "2026-11-08", start: "09:05", riders: [0, 3, 1], pal: 3,
      wps: [[17.117, -96.447, 3150], [17.139, -96.462, 2900], [17.163, -96.481, 2600], [17.18, -96.497, 2400], [17.162, -96.512, 2620], [17.141, -96.521, 2790], [17.13, -96.525, 2850]],
    },
  ];

  let seed = 11;
  for (const [di, plan] of plans.entries()) {
    onProgress?.(`Day ${di + 1}: ${plan.name}`);
    let stops: number[] = [];
    for (const [k, ri] of plan.riders.entries()) {
      const tr = makeTrack(100 + di, plan.wps, local(plan.date, plan.start) + k * 45000, k ? 0.00012 : 0);
      if (k === 0) stops = tr.stops;
      const ride: Ride = {
        id: uid(), tripId: trip.id, riderId: crew[ri].id, name: plan.name, source: "sample",
        startUtc: tr.pts[0][3] * 1000, stats: computeStats(tr.pts), points: downsample(tr.pts),
      };
      await store.addRide(ride);
    }
    const picks = stops.filter((_, i) => i % Math.max(1, Math.floor(stops.length / 9)) === 0).slice(0, 10);
    for (const [pi, tSec] of picks.entries()) {
      const portrait = pi % 4 === 2;
      const full = drawScene(seed++, portrait ? 1200 : 1800, portrait ? 1600 : 1200, plan.pal + (pi % 3 === 1 ? 1 : 0));
      const id = uid();
      await store.addMedia(
        {
          id, tripId: trip.id, riderId: crew[(pi + di) % crew.length].id, kind: "photo", name: `sample-${di + 1}-${pi + 1}.jpg`,
          takenUtcMs: tSec * 1000 + pi * 7000, w: full.width, h: full.height, starred: pi === 3, hidden: false,
        },
        { display: await toBlob(full), thumb: await toBlob(scaled(full, 640)) },
      );
    }
  }
  return trip;
}
