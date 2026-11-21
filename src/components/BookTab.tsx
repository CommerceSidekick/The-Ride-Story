"use client";
import { useEffect, useMemo, useState } from "react";
import { buildBook, DEFAULT_BOOK, SIZES } from "@/lib/book";
import type { Book, BookConfig, BookPage, BookTheme, Tone } from "@/lib/types";
import { cx, fmtDist, fmtDuration, fmtEle, uid } from "@/lib/util";
import { BookPageView } from "./BookPageView";
import type { Workspace } from "./CollectTab";
import { PhotoPicker } from "./PhotoPicker";

export const THEMES: { id: BookTheme; label: string; bg: string; accent: string }[] = [
  { id: "loam", label: "Loam", bg: "#1b1916", accent: "#e8862a" },
  { id: "paper", label: "Paper", bg: "#f5f0e6", accent: "#b5462f" },
  { id: "agave", label: "Agave", bg: "#1f3d35", accent: "#f0b34a" },
];
export const TONES: { id: Tone; label: string }[] = [
  { id: "stoked", label: "Stoked" }, { id: "dry", label: "Dry" }, { id: "poetic", label: "Poetic" },
];

export function BookTab({ ws, publishedUrl }: { ws: Workspace; publishedUrl: string | null }) {
  const { trip, a, updateTrip } = ws;
  const book = trip.book;
  const [config, setConfig] = useState<BookConfig>(book?.config ?? DEFAULT_BOOK);
  const [picker, setPicker] = useState<{ pageId: string; slot: number } | null>(null);
  const [ai, setAi] = useState<{ enabled: boolean; busy: boolean; msg: string }>({ enabled: false, busy: false, msg: "" });
  const size = SIZES[(book?.config ?? config).size];
  const hasContent = ws.rides.length + ws.media.length > 0;

  useEffect(() => {
    fetch("/api/narrate").then((r) => r.json()).then((d) => setAi((s) => ({ ...s, enabled: !!d.enabled }))).catch(() => {});
  }, []);

  const setBook = (b: Book) => updateTrip({ book: b });
  const generate = () => {
    if (book && !confirm("Rebuild the book from scratch? Text edits and photo swaps you made will be replaced.")) return;
    setBook(buildBook(trip, a, config));
  };
  // Theme and size are purely visual: apply them without rebuilding pages.
  const restyle = (patch: Partial<BookConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    if (book) setBook({ ...book, config: { ...book.config, ...patch } });
  };
  const patchPage = (id: string, patch: Partial<BookPage>) => book && setBook({ ...book, pages: book.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const move = (i: number, d: number) => {
    if (!book) return;
    const pages = [...book.pages];
    const j = i + d;
    if (j < 0 || j >= pages.length) return;
    [pages[i], pages[j]] = [pages[j], pages[i]];
    setBook({ ...book, pages });
  };
  const remove = (id: string) => book && setBook({ ...book, pages: book.pages.filter((p) => p.id !== id) });
  const insert = (i: number, kind: number | "story") => {
    if (!book) return;
    const date = book.pages[i].date;
    const page: BookPage = kind === "story"
      ? { id: uid(), type: "story", date, photoIds: [""], title: "A story from the trail", text: "Click to write what happened here." }
      : { id: uid(), type: "photos", date, photoIds: Array(kind).fill("") };
    const pages = [...book.pages];
    pages.splice(i + 1, 0, page);
    setBook({ ...book, pages });
  };

  const rewrite = async () => {
    if (!book) return;
    setAi((s) => ({ ...s, busy: true, msg: "" }));
    const pages = book.pages.filter((p) => ["overview", "day", "back"].includes(p.type)).map((p) => {
      const day = p.date ? a.days.find((d) => d.date === p.date) : undefined;
      const s = day?.stats;
      return {
        id: p.id, type: p.type, kicker: p.kicker, title: p.title, draft: p.text,
        facts: day && s
          ? day.groups.length
            ? `Rides: ${day.groups.map((g) => g.primary.name).join("; ")}. ${fmtDist(s.distanceKm, trip.units)}, ${fmtEle(s.elevGainM, trip.units)} climbing, ${fmtEle(s.elevLossM, trip.units)} descending, ${fmtDuration(s.movingSec)} moving, high point ${fmtEle(s.maxEleM, trip.units)}. ${day.media.length} photos taken.`
            : `No ride recorded this day. ${day.media.length} photos taken.`
          : `Whole trip: ${a.totals.rideDays} ride days, ${fmtDist(a.totals.distanceKm, trip.units, 0)}, ${fmtEle(a.totals.elevGainM, trip.units)} climbing, high point ${fmtEle(a.totals.maxEleM, trip.units)}.`,
        note: day ? trip.dayNotes?.[day.date] : trip.notes,
      };
    });
    try {
      const res = await fetch("/api/narrate", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ trip: { name: trip.name, location: trip.location, crew: trip.crew.map((c) => c.name), notes: trip.notes, tone: book.config.tone }, pages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI writer failed");
      const byId = new Map<string, { title: string; text: string }>(data.pages.map((p: { id: string; title: string; text: string }) => [p.id, p]));
      setBook({ ...book, pages: book.pages.map((p) => { const w = byId.get(p.id); return w ? { ...p, text: w.text, title: p.type === "back" ? p.title : w.title } : p; }) });
      setAi((s) => ({ ...s, busy: false, msg: `Rewrote ${byId.size} pages. Read them over — every line is editable.` }));
    } catch (e) {
      setAi((s) => ({ ...s, busy: false, msg: e instanceof Error ? e.message : "AI writer failed" }));
    }
  };

  const printCss = useMemo(() => `@page { size: ${size.w}in ${size.h}in; margin: 0; }`, [size]);

  if (!book)
    return (
      <div className="card mx-auto max-w-2xl p-8 text-center">
        <h2 className="font-display text-3xl font-semibold">Build the storybook</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-dust">
          {hasContent
            ? `We'll lay out a cover, a trip map, ${a.days.length} day ${a.days.length === 1 ? "chapter" : "chapters"} with routes and elevation, your best photos, and the numbers. Then every word and photo is yours to change.`
            : "Add photos and ride files in Collect first — the book is built from them."}
        </p>
        <Settings config={config} onChange={(p) => setConfig({ ...config, ...p })} className="mx-auto mt-6 max-w-sm text-left" />
        <button className="btn btn-primary mt-6" disabled={!hasContent} onClick={generate}>Build my book</button>
      </div>
    );

  const ctxBase = { trip, a, theme: book.config.theme, aspect: size.w / size.h, publishedUrl };
  return (
    <div className="print-root grid gap-6 lg:grid-cols-[280px_1fr]">
      <style>{printCss}</style>
      <aside className="no-print">
        <div className="card sticky top-4 p-5">
          <div className="label">Book</div>
          <div className="mt-1 text-sm text-dust">{book.pages.length} pages · {size.label}</div>
          <Settings config={config} onChange={(p) => ("theme" in p || "size" in p ? restyle(p) : setConfig({ ...config, ...p }))} className="mt-4" />
          <button className="btn btn-ghost mt-4 w-full justify-center" onClick={generate}>Rebuild from settings</button>
          {ai.enabled && <button className="btn btn-ghost mt-2 w-full justify-center" onClick={rewrite} disabled={ai.busy}>{ai.busy ? "Writing…" : "✦ Rewrite text with AI"}</button>}
          {ai.msg && <p className="mt-2 text-xs text-dust">{ai.msg}</p>}
          <button className="btn btn-primary mt-2 w-full justify-center" onClick={() => window.print()}>Print / Save as PDF</button>
          <p className="mt-3 text-xs leading-relaxed text-dust">
            In the print dialog choose <b>Save as PDF</b>, margins <b>None</b>, and turn on <b>Background graphics</b>. The PDF is sized {size.label.replace(/ (landscape|square)/, "")} and can be uploaded to any photo-book printer.
          </p>
          <p className="mt-3 text-xs text-dust">Click any text to edit it. Click any photo to swap it.</p>
        </div>
      </aside>

      <div className="min-w-0">
        {book.pages.map((p, i) => (
          <div key={p.id} className="print-wrap mb-6">
            <BookPageView
              page={p}
              className="print-page rounded-md shadow-xl shadow-black/15"
              style={{ ["--print-w" as string]: `${size.w}in`, ["--print-h" as string]: `${size.h}in` }}
              ctx={{ ...ctxBase, editable: true, pageNo: i + 1, onEdit: (patch) => patchPage(p.id, patch), onPickPhoto: (slot) => setPicker({ pageId: p.id, slot }) }}
            />
            <div className="no-print mt-2 flex flex-wrap items-center gap-1.5 text-xs text-dust">
              <span className="mr-1 font-mono">{i + 1} · {p.type}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move page up">↑</button>
              <button className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === book.pages.length - 1} aria-label="Move page down">↓</button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(p.id)}>Remove</button>
              <span className="ml-auto">Add after:</span>
              {[1, 2, 3, 4].map((n) => <button key={n} className="btn btn-ghost btn-sm" onClick={() => insert(i, n)} title={`Photo page with ${n} ${n === 1 ? "photo" : "photos"}`}>{n}▫</button>)}
              <button className="btn btn-ghost btn-sm" onClick={() => insert(i, "story")}>Photo + text</button>
            </div>
          </div>
        ))}
      </div>

      {picker && (
        <PhotoPicker
          a={a}
          current={book.pages.find((p) => p.id === picker.pageId)?.photoIds[picker.slot]}
          onClose={() => setPicker(null)}
          onPick={(id) => {
            const pg = book.pages.find((p) => p.id === picker.pageId);
            if (pg) {
              const photoIds = [...pg.photoIds];
              photoIds[picker.slot] = id;
              patchPage(pg.id, { photoIds });
            }
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

function Settings({ config, onChange, className = "" }: { config: BookConfig; onChange: (p: Partial<BookConfig>) => void; className?: string }) {
  return (
    <div className={className}>
      <div className="label">Look</div>
      <div className="mt-1.5 flex gap-2">
        {THEMES.map((t) => (
          <button key={t.id} onClick={() => onChange({ theme: t.id })} className={cx("flex-1 rounded-lg border-2 p-1.5 text-xs font-semibold", config.theme === t.id ? "border-marigold" : "border-transparent")} style={{ background: t.bg, color: t.id === "paper" ? "#1f1c18" : "#f3eee4" }}>
            <span className="mb-1 block h-1 w-5 rounded-full" style={{ background: t.accent }} />
            {t.label}
          </button>
        ))}
      </div>
      <label className="label mt-4 block">Page size</label>
      <select className="field mt-1" value={config.size} onChange={(e) => onChange({ size: e.target.value as BookConfig["size"] })}>
        {Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <label className="label mt-4 block">Photos per day · {config.photosPerDay}</label>
      <input type="range" min={2} max={20} value={config.photosPerDay} onChange={(e) => onChange({ photosPerDay: Number(e.target.value) })} className="mt-1 w-full accent-[#e8862a]" />
      <label className="label mt-3 block">Voice</label>
      <div className="mt-1.5 flex gap-1.5">
        {TONES.map((t) => <button key={t.id} onClick={() => onChange({ tone: t.id })} className={cx("btn btn-sm flex-1 justify-center", config.tone === t.id ? "btn-dark" : "btn-ghost")}>{t.label}</button>)}
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={config.includeCrew} onChange={(e) => onChange({ includeCrew: e.target.checked })} className="accent-[#e8862a]" /> Crew page with awards</label>
      <label className="mt-1.5 flex items-center gap-2 text-sm"><input type="checkbox" checked={config.includeNumbers} onChange={(e) => onChange({ includeNumbers: e.target.checked })} className="accent-[#e8862a]" /> “By the numbers” page</label>
    </div>
  );
}

