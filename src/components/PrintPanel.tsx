"use client";
import { useRef, useState } from "react";
import type { Analysis } from "@/lib/analyze";
import { SIZES } from "@/lib/book";
import { PRINT_CREDIT } from "@/lib/terrain-style";
import { canvasToJpeg, coverSize, DPI, drawCover, estimateSpine, imagesToPdf, padPageCount, PRESETS } from "@/lib/print";
import type { Book, BookPage, BookSize, Trip } from "@/lib/types";
import { slugify, uid } from "@/lib/util";
import { BookPageView } from "./BookPageView";

const THEME_BG = { loam: "#1b1916", paper: "#f5f0e6", agave: "#1f3d35" } as const;
const THEME_INK = { loam: "#f3eee4", paper: "#1f1c18", agave: "#f2ecdc" } as const;
const RENDER_W = 1200; // CSS px width pages are laid out at before rasterising

type Job = { label: string; done: number; total: number } | null;

/**
 * Print-ready files: a full-bleed interior PDF, a wraparound cover PDF (back + spine + front),
 * and a zip of page images for editors like Vistaprint's that take photos instead of PDFs.
 */
export function PrintPanel({ trip, a, book, onSize, publishedUrl }: { trip: Trip; a: Analysis; book: Book; onSize: (s: BookSize) => void; publishedUrl: string | null }) {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = PRESETS.find((p) => p.id === presetId)!;
  const size = SIZES[book.config.size];
  const sizeOk = preset.sizes.includes(book.config.size);
  const interior = book.pages.filter((p) => p.type !== "cover" && p.type !== "back");
  const totalPages = padPageCount(interior.length, preset);
  const [spine, setSpine] = useState<string>("");
  const spineIn = Number(spine) > 0 ? Number(spine) : estimateSpine(totalPages, preset);
  const [job, setJob] = useState<Job>(null);
  const [err, setErr] = useState("");
  const [renderPages, setRenderPages] = useState<BookPage[] | null>(null);
  const host = useRef<HTMLDivElement>(null);

  const theme = book.config.theme;
  const aspect = size.w / size.h;
  const name = slugify(trip.name) || "ride-story";

  /** Lay the given pages out offscreen and rasterise each at 300 dpi of its trim size. */
  const rasterise = async (pages: BookPage[], label: string): Promise<HTMLCanvasElement[]> => {
    setRenderPages(pages);
    await new Promise((r) => setTimeout(r, 60));
    const nodes = Array.from(host.current?.querySelectorAll<HTMLElement>("[data-print-page]") ?? []);
    await Promise.all(Array.from(host.current?.querySelectorAll("img") ?? []).map((im) => (im.complete ? null : new Promise((r) => { im.onload = im.onerror = r; }))));
    await document.fonts.ready;
    const { toCanvas } = await import("html-to-image");
    const out: HTMLCanvasElement[] = [];
    for (const [i, n] of nodes.entries()) {
      setJob({ label, done: i, total: nodes.length });
      out.push(await toCanvas(n, { pixelRatio: (size.w * DPI) / RENDER_W, cacheBust: false, skipAutoScale: true }));
    }
    setRenderPages(null);
    return out;
  };

  const download = (bytes: Uint8Array | Blob, file: string, type = "application/pdf") => {
    const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart], { type });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url; el.download = file; el.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const run = async (fn: () => Promise<void>) => {
    setErr("");
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Export failed"); }
    setJob(null); setRenderPages(null);
  };

  const blank = (): BookPage => ({ id: uid(), type: "photos", photoIds: [] , title: "__blank" });

  const exportInterior = () => run(async () => {
    const pages = [...interior];
    while (pages.length < totalPages) pages.push(blank());
    const canvases = await rasterise(pages, "Rendering pages");
    setJob({ label: "Building interior PDF", done: canvases.length, total: canvases.length });
    const b = preset.bleedIn;
    const wPx = Math.round((size.w + 2 * b) * DPI), hPx = Math.round((size.h + 2 * b) * DPI);
    const out = [];
    for (const [i, c] of canvases.entries()) {
      const bleedC = document.createElement("canvas");
      bleedC.width = wPx; bleedC.height = hPx;
      const ctx = bleedC.getContext("2d")!;
      ctx.fillStyle = THEME_BG[theme]; ctx.fillRect(0, 0, wPx, hPx);
      // Extend the page into the bleed by scaling it just enough to cover the larger sheet.
      if (pages[i].title !== "__blank") drawCover(ctx, c, 0, 0, wPx, hPx);
      out.push({ jpeg: await canvasToJpeg(bleedC), wIn: size.w + 2 * b, hIn: size.h + 2 * b });
    }
    download(await imagesToPdf(out, `${trip.name} — interior`), `${name}-interior.pdf`);
  });

  const exportCover = () => run(async () => {
    const front = book.pages.find((p) => p.type === "cover");
    const back = book.pages.find((p) => p.type === "back");
    const pages = [back ?? blank(), front ?? blank()];
    const [backC, frontC] = await rasterise(pages, "Rendering cover");
    setJob({ label: "Building cover PDF", done: 2, total: 2 });
    const wrap = preset.coverWrapIn;
    const dims = coverSize(size.w, size.h, spineIn, wrap);
    const W = Math.round(dims.w * DPI), H = Math.round(dims.h * DPI);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = THEME_BG[theme]; ctx.fillRect(0, 0, W, H);
    const panelW = Math.round((size.w + wrap) * DPI);
    const spineX = panelW, spineW = Math.round(spineIn * DPI);
    if (back) drawCover(ctx, backC, 0, 0, panelW, H);
    if (front) drawCover(ctx, frontC, spineX + spineW, 0, W - spineX - spineW, H);
    // Spine: title and place, reading top to bottom.
    ctx.fillStyle = THEME_BG[theme]; ctx.fillRect(spineX, 0, spineW, H);
    if (spineIn >= 0.25) {
      const probe = document.querySelector(".tb-display");
      const family = probe ? getComputedStyle(probe).fontFamily : "Georgia, serif";
      ctx.save();
      ctx.translate(spineX + spineW / 2, H / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = THEME_INK[theme];
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `600 ${Math.round(spineW * 0.42)}px ${family}`;
      ctx.fillText([trip.name, trip.location].filter(Boolean).join("  ·  "), 0, 0, H * 0.8);
      ctx.restore();
    }
    download(await imagesToPdf([{ jpeg: await canvasToJpeg(c), wIn: dims.w, hIn: dims.h }], `${trip.name} — cover`), `${name}-cover.pdf`);
  });

  const exportImages = () => run(async () => {
    const pages = book.pages;
    const canvases = await rasterise(pages, "Rendering pages");
    setJob({ label: "Zipping page images", done: canvases.length, total: canvases.length });
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const [i, cv] of canvases.entries()) zip.file(`${name}-page-${String(i + 1).padStart(2, "0")}.jpg`, await canvasToJpeg(cv, 0.93));
    zip.file("README.txt", `${trip.name}\n\nEach file is one finished page at ${size.w} x ${size.h} in, ${DPI} dpi.\nIn a photo-book editor such as Vistaprint's, choose a full-page (single photo, no border) layout for every page and place the images in order.\n\n${PRINT_CREDIT}\n`);
    download(await zip.generateAsync({ type: "blob" }), `${name}-pages.zip`, "application/zip");
  });

  const cover = coverSize(size.w, size.h, spineIn, preset.coverWrapIn);
  return (
    <div className="mt-5 border-t border-[#e2d9c8] pt-5">
      <div className="label">Print</div>
      <select className="field mt-2" value={presetId} onChange={(e) => { setPresetId(e.target.value); setSpine(""); }}>
        {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {!sizeOk && (
        <div className="mt-2 rounded-lg bg-clay/10 p-2.5 text-xs text-clay">
          {preset.name.split(" —")[0]} doesn&apos;t print {size.label}. Switch to{" "}
          {preset.sizes.map((s, i) => (
            <span key={s}>{i ? " or " : ""}<button className="font-semibold underline" onClick={() => onSize(s)}>{SIZES[s].label}</button></span>
          ))}
          .
        </div>
      )}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-loam/80">
        <dt className="text-dust">Pages</dt>
        <dd>{interior.length} {totalPages > interior.length && <span className="text-dust">+ {totalPages - interior.length} blank to reach {totalPages}</span>}</dd>
        <dt className="text-dust">Interior</dt><dd>{(size.w + 2 * preset.bleedIn).toFixed(3)} × {(size.h + 2 * preset.bleedIn).toFixed(3)} in with bleed</dd>
        <dt className="text-dust">Cover</dt><dd>{cover.w.toFixed(3)} × {cover.h.toFixed(3)} in</dd>
      </dl>
      <label className="mt-3 block text-xs">
        <span className="text-dust">Spine width (in)</span>
        <input className="field mt-1 !py-1.5" inputMode="decimal" placeholder={`${estimateSpine(totalPages, preset)} (estimate)`} value={spine} onChange={(e) => setSpine(e.target.value)} />
      </label>
      <p className="mt-1 text-[11px] leading-snug text-dust">Use the spine width from your printer&apos;s cover calculator for {totalPages} pages.</p>
      <div className="mt-3 grid gap-2">
        <button className="btn btn-dark w-full justify-center" disabled={!!job || !sizeOk} onClick={exportInterior}>Interior PDF</button>
        <button className="btn btn-dark w-full justify-center" disabled={!!job || !sizeOk} onClick={exportCover}>Cover PDF</button>
        <button className="btn btn-ghost w-full justify-center" disabled={!!job} onClick={exportImages}>Page images for Vistaprint</button>
      </div>
      {job && (
        <div className="mt-3 text-xs text-dust">
          {job.label}… {job.done}/{job.total}
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bone-2"><div className="h-full bg-marigold transition-all" style={{ width: `${(job.done / Math.max(1, job.total)) * 100}%` }} /></div>
        </div>
      )}
      {err && <p className="mt-2 text-xs text-clay">{err}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-dust">
        {preset.notes} <a className="underline" href={preset.url} target="_blank" rel="noreferrer">Open {preset.name.split(" —")[0]}</a>. Vistaprint&apos;s photo books are made in its own editor, so use the page images there.
      </p>

      {/* Offscreen render target for print rasterising */}
      <div ref={host} aria-hidden style={{ position: "fixed", left: -20000, top: 0, width: RENDER_W, pointerEvents: "none" }}>
        {renderPages?.map((p, i) => (
          <div key={p.id + i} data-print-page style={{ width: RENDER_W }}>
            {p.title === "__blank" ? (
              <div className={`tb-page theme-${theme}`} style={{ aspectRatio: String(aspect) }}><div className="tb-surface" /></div>
            ) : (
              <BookPageView page={p} ctx={{ trip, a, theme, aspect, pageNo: p.type === "cover" || p.type === "back" ? undefined : interior.indexOf(p) + 1, publishedUrl }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
