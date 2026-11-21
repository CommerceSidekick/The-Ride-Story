"use client";
import type { Analysis } from "@/lib/analyze";
import { fmtDate } from "@/lib/util";

export function PhotoPicker({ a, current, onPick, onClose }: { a: Analysis; current?: string; onPick: (id: string) => void; onClose: () => void }) {
  const groups = [
    ...a.days.map((d) => ({ label: `Day ${d.index} · ${fmtDate(d.localMs, { month: "short", day: "numeric" })}`, items: d.media })),
    { label: "No date", items: a.undated },
  ].filter((g) => g.items.some((m) => !m.hidden));
  return (
    <div className="no-print fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#e2d9c8] px-5 py-3">
          <div className="font-display text-xl font-semibold">Choose a photo</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="overflow-y-auto p-5">
          {groups.length === 0 && <p className="text-sm text-dust">No photos in this trip yet.</p>}
          {groups.map((g) => (
            <div key={g.label} className="mb-5">
              <div className="label mb-2">{g.label}</div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {g.items.filter((m) => !m.hidden).map((m) => (
                  <button key={m.id} onClick={() => onPick(m.id)} className={`relative aspect-square overflow-hidden rounded-lg ${m.id === current ? "ring-4 ring-marigold" : "hover:opacity-80"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.thumbUrl} alt="" className="h-full w-full object-cover" />
                    {m.starred && <span className="absolute left-1 top-1 text-xs text-marigold drop-shadow">★</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
