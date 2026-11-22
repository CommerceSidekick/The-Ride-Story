"use client";
import { useMemo } from "react";
import type { Analysis } from "@/lib/analyze";
import { DAY_COLORS } from "./BookPageView";
import { TerrainMap } from "./TerrainMap";

/** Explore the whole trip in 3D: every day's route in its own colour, every located photo pinned. */
export function TripMap({ a }: { a: Analysis }) {
  const tracks = useMemo(
    () => a.days.flatMap((d) => d.groups.map((g) => ({ id: g.primary.id, points: g.primary.points, color: DAY_COLORS[(d.index - 1) % DAY_COLORS.length] }))),
    [a],
  );
  const photos = useMemo(
    () => a.days.flatMap((d) => d.media).filter((m) => !m.hidden && m.plat != null && m.plon != null).map((m) => ({ id: m.id, lat: m.plat!, lon: m.plon!, thumbUrl: m.thumbUrl })),
    [a],
  );
  return (
    <div>
      <TerrainMap tracks={tracks} photos={photos} className="h-[74vh] min-h-[460px] rounded-2xl" />
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-dust">
        {a.days.filter((d) => d.groups.length).map((d) => (
          <span key={d.date} className="inline-flex items-center gap-1.5">
            <span className="h-1 w-5 rounded-full" style={{ background: DAY_COLORS[(d.index - 1) % DAY_COLORS.length] }} /> Day {d.index}
          </span>
        ))}
        <span className="ml-auto">Drag to pan · right-drag or two fingers to tilt and turn</span>
      </div>
    </div>
  );
}
