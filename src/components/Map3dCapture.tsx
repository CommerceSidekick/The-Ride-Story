"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Analysis, Day } from "@/lib/analyze";
import { store } from "@/lib/store";
import type { Media, Trip } from "@/lib/types";
import { dayKeyToMs, uid } from "@/lib/util";
import { DAY_COLORS } from "./BookPageView";
import { TerrainMap, type MapController } from "./TerrainMap";

const W = 1500, H = 1200; // CSS px of the render; pixelRatio 1.6 gives 2400 × 1920 (about 240 dpi on a 10 in page)

/**
 * Renders each riding day as a 3D terrain view and saves it to the trip as a full-page book image.
 * Runs one day at a time in an offscreen-sized map so the output is the same on every screen.
 */
export function Map3dCapture({ trip, a, existing, onDone, onCancel }: { trip: Trip; a: Analysis; existing: Media[]; onDone: (added: Media[]) => void; onCancel: () => void }) {
  const days = a.days.filter((d) => d.groups.length);
  const [i, setI] = useState(0);
  const [status, setStatus] = useState("Loading terrain…");
  const added = useRef<Media[]>([]);
  const day: Day | undefined = days[i];
  const aspectH = Math.round(W / (trip.book ? bookAspect(trip) : 1.25));

  useEffect(() => {
    if (!day) onDone(added.current);
  }, [day, onDone]);

  const main = day ? [...day.groups].sort((x, y) => y.primary.stats.distanceKm - x.primary.stats.distanceKm)[0].primary : null;
  const tracks = useMemo(
    () => (day && main ? [{ id: main.id, points: main.points, color: DAY_COLORS[(day.index - 1) % DAY_COLORS.length] }] : []),
    [day, main],
  );
  if (!day || !main) return null;

  const capture = async (c: MapController) => {
    setStatus(`Framing day ${day.index}…`);
    c.focusTrack(main.id, { duration: 0, pitch: 50, padding: { top: 110, bottom: 150, left: 110, right: 110 } });
    await new Promise<void>((res) => {
      const done = () => res();
      c.map.once("idle", done);
      setTimeout(done, 25000);
    });
    await new Promise((r) => setTimeout(r, 600));
    setStatus(`Saving day ${day.index}…`);
    const canvas = c.map.getCanvas();
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not capture the map"))), "image/jpeg", 0.92));
    const thumb = await scaled(canvas, 640);
    for (const old of existing.filter((m) => m.generated === "map3d" && m.takenLocalMs === dayKeyToMs(day.date) + 12 * 3600000)) await store.deleteMedia(old);
    const m = await store.addMedia(
      {
        id: uid(), tripId: trip.id, riderId: trip.crew[0]?.id ?? "", kind: "photo", name: `3D map — Day ${day.index}.jpg`,
        takenLocalMs: dayKeyToMs(day.date) + 12 * 3600000, w: canvas.width, h: canvas.height,
        starred: false, hidden: false, generated: "map3d", caption: `Day ${day.index} in 3D`,
      },
      { display: blob, thumb },
    );
    added.current.push(m);
    setI((x) => x + 1);
  };

  return (
    <div className="no-print fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <div className="card w-full max-w-md p-6 text-center">
        <div className="font-display text-xl font-semibold">Rendering 3D maps</div>
        <p className="mt-1 text-sm text-dust">Day {i + 1} of {days.length} · {status}</p>
        <div className="mx-auto mt-4 h-1.5 overflow-hidden rounded-full bg-bone-2"><div className="h-full bg-marigold transition-all" style={{ width: `${(i / days.length) * 100}%` }} /></div>
        <button className="btn btn-ghost btn-sm mt-4" onClick={onCancel}>Cancel</button>
      </div>
      <div aria-hidden style={{ position: "fixed", left: -20000, top: 0, width: W, height: aspectH }}>
        <TerrainMap
          key={day.date}
          tracks={tracks}
          interactive={false}
          preserveDrawingBuffer
          pixelRatio={1.6}
          initialPitch={50}
          className="h-full w-full"
          onReady={capture}
        />
      </div>
    </div>
  );
}

function bookAspect(trip: Trip) {
  const s = trip.book!.config.size;
  return ({ landscape: 10 / 8, landscape11: 11 / 8.5, a4: 11.69 / 8.27 } as Record<string, number>)[s] ?? 1;
}

async function scaled(src: HTMLCanvasElement, max: number) {
  const s = max / Math.max(src.width, src.height);
  const c = document.createElement("canvas");
  c.width = Math.round(src.width * s); c.height = Math.round(src.height * s);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.8));
}
