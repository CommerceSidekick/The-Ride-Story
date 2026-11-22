"use client";
import { useEffect, useState } from "react";
import { PALETTES } from "@/lib/palettes";

/** Floating palette switcher, shown only when previewing with ?palette=… so visitors never see it. */
export function PalettePicker() {
  const [show, setShow] = useState(false);
  const [current, setCurrent] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setShow(new URLSearchParams(location.search).has("palette"));
      setCurrent(document.documentElement.dataset.palette ?? "");
    }, 0);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  const pick = (id: string) => {
    document.documentElement.setAttribute("data-palette", id);
    localStorage.setItem("trs-palette", id);
    setCurrent(id);
    const u = new URL(location.href);
    u.searchParams.set("palette", id);
    history.replaceState(null, "", u);
  };
  const active = PALETTES.find((p) => p.id === current);
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[min(94vw,640px)] -translate-x-1/2 rounded-[8px] border border-black/10 bg-white/95 p-3 text-[#1b1a17] shadow-2xl backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[#6b6457]">Palette</span>
        {PALETTES.map((p) => (
          <button key={p.id} onClick={() => pick(p.id)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.8rem] font-semibold ${current === p.id ? "border-[#1b1a17]" : "border-black/10"}`}>
            <span className="flex overflow-hidden rounded-full border border-black/15">
              {p.swatch.map((c) => <span key={c} className="h-3.5 w-3.5" style={{ background: c }} />)}
            </span>
            {p.name}
          </button>
        ))}
      </div>
      {active && <p className="mt-2 px-1 text-[0.78rem] text-[#6b6457]">{active.note}</p>}
    </div>
  );
}
