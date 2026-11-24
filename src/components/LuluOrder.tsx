"use client";
import { useEffect, useState } from "react";
import { SIZES } from "@/lib/book";
import type { BookSize, Trip } from "@/lib/types";
import { slugify } from "@/lib/util";

type Config = { enabled: boolean; sandbox: boolean; sizes: BookSize[]; pages: { min: number; max: number }; levels: string[] };
type Quote = { currency: string; unitPrice: number; shipping: number; total: number; quantity: number };

const LEVELS: Record<string, string> = { MAIL: "Mail (slowest)", PRIORITY_MAIL: "Priority mail", GROUND: "Ground", EXPEDITED: "Expedited", EXPRESS: "Express" };
const FIELDS = [
  ["name", "Full name", "name"], ["email", "Email", "email"], ["phone_number", "Phone (for the courier)", "tel"],
  ["street1", "Street address", "address-line1"], ["street2", "Apt, suite (optional)", "address-line2"], ["city", "City", "address-level2"],
  ["state_code", "State / province code", "address-level1"], ["postcode", "ZIP / postcode", "postal-code"], ["country_code", "Country code (US, CA, GB…)", "country"],
] as const;
type Addr = Record<(typeof FIELDS)[number][0], string>;

const money = (cents: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase() }).format(cents / 100);
const pad = (n: number, min: number) => { const t = Math.max(n, min); return t % 2 ? t + 1 : t; };

/**
 * Order printed copies from inside the app: Lulu prints and ships, Stripe takes the payment.
 * Shown only when the site has Lulu, Stripe and file storage keys.
 */
export function LuluOrder({ trip, size, interiorPages, busy, onBusy, build, onSize }: {
  trip: Trip; size: BookSize; interiorPages: number; busy: boolean; onSize: (s: BookSize) => void;
  onBusy: (label: string | null) => void;
  build: (pageCount: number, cover: { w: number; h: number }) => Promise<{ interior: Uint8Array; cover: Uint8Array }>;
}) {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [level, setLevel] = useState("GROUND");
  const [addr, setAddr] = useState<Addr>(() => {
    const blank = Object.fromEntries(FIELDS.map(([k]) => [k, ""])) as Addr;
    if (typeof window === "undefined") return { ...blank, country_code: "US" };
    try { return { ...blank, country_code: "US", ...JSON.parse(localStorage.getItem("trs_ship") ?? "{}") }; } catch { return { ...blank, country_code: "US" }; }
  });
  const [q, setQ] = useState<Quote | null>(null);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { fetch("/api/order/config").then((r) => r.json()).then(setCfg).catch(() => setCfg(null)); }, []);
  if (!cfg?.enabled) return null;

  const pages = pad(interiorPages, cfg.pages.min);
  const sizeOk = cfg.sizes.includes(size);
  const tooLong = pages > cfg.pages.max;
  const order = { title: trip.name, size, pages, quantity: qty, level, address: addr };

  const post = async (path: string, body: unknown) => {
    const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? "Request failed");
    return d;
  };

  const getQuote = async () => {
    setErr(""); setQ(null); setStatus("Pricing…");
    try {
      localStorage.setItem("trs_ship", JSON.stringify(addr));
      setQ(await post("/api/order/quote", order));
    } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't price that"); }
    setStatus("");
  };

  const checkout = async () => {
    setErr("");
    try {
      setStatus("Getting the exact cover size from Lulu…");
      const cover = await post("/api/order/cover", { size, pages });
      onBusy("Building print files");
      setStatus("Building print files. This takes a minute or two…");
      const files = await build(pages, cover);
      const { upload } = await import("@vercel/blob/client");
      const base = slugify(trip.name) || "ride-story";
      const send = async (bytes: Uint8Array, part: string) => {
        const blob = await upload(`print/${base}-${part}.pdf`, new Blob([bytes as BlobPart], { type: "application/pdf" }), {
          access: "public", handleUploadUrl: "/api/upload", contentType: "application/pdf", multipart: bytes.byteLength > 20 * 1024 * 1024,
          onUploadProgress: (p) => setStatus(`Uploading ${part}… ${Math.round(p.percentage)}%`),
        });
        return blob.url;
      };
      const interiorUrl = await send(files.interior, "interior");
      const coverUrl = await send(files.cover, "cover");
      setStatus("Lulu is checking the files…");
      const ids = await post("/api/order/validate", { size, pages, coverUrl, interiorUrl });
      for (let i = 0; ; i++) {
        if (i > 60) throw new Error("Lulu is taking a while to check the files. Try again in a few minutes.");
        await new Promise((r) => setTimeout(r, 4000));
        const r = await fetch(`/api/order/validate?interior=${ids.interior}&cover=${ids.cover}`);
        const v = await r.json();
        if (!r.ok) throw new Error(v.error ?? "File check failed");
        if (v.failed?.length) throw new Error(`Lulu can't print these files: ${v.failed.join(" ")}`);
        if (v.done) break;
      }
      setStatus("Opening secure checkout…");
      const { url } = await post("/api/order/checkout", { ...order, interiorUrl, coverUrl, returnTo: `${location.pathname}${location.search}` });
      location.assign(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Checkout failed");
      setStatus("");
    }
    onBusy(null);
  };

  return (
    <div className="mt-5 rounded-xl border border-marigold/50 bg-marigold/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold">Order printed books</div>
          <div className="text-xs text-dust">Hardcover, printed and shipped by Lulu.{cfg.sandbox ? " Test mode: nothing is printed or charged." : ""}</div>
        </div>
        {!open && <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)} disabled={!sizeOk || tooLong}>Order</button>}
      </div>
      {!sizeOk && (
        <p className="mt-2 text-xs text-clay">
          Lulu prints{" "}
          {cfg.sizes.map((s, i) => (
            <span key={s}>{i ? " or " : ""}<button className="font-semibold underline" onClick={() => onSize(s)}>{SIZES[s].label}</button></span>
          ))}
          . Switch to order.
        </p>
      )}
      {tooLong && <p className="mt-2 text-xs text-clay">That&apos;s more than {cfg.pages.max} pages. Remove some pages to order.</p>}
      {open && sizeOk && !tooLong && (
        <div className="mt-3 grid gap-2 text-sm">
          <div className="text-xs text-dust">{SIZES[size].label} · {pages} pages{pages > interiorPages ? ` (${pages - interiorPages} blank added)` : ""}</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs"><span className="text-dust">Copies</span>
              <input className="field mt-1 !py-1.5" type="number" min={1} max={50} value={qty} onChange={(e) => { setQty(Math.max(1, Math.min(50, Number(e.target.value) || 1))); setQ(null); }} />
            </label>
            <label className="text-xs"><span className="text-dust">Shipping</span>
              <select className="field mt-1 !py-1.5" value={level} onChange={(e) => { setLevel(e.target.value); setQ(null); }}>
                {cfg.levels.map((l) => <option key={l} value={l}>{LEVELS[l] ?? l}</option>)}
              </select>
            </label>
          </div>
          {FIELDS.map(([k, label, auto]) => (
            <label key={k} className="text-xs"><span className="text-dust">{label}</span>
              <input className="field mt-1 !py-1.5" autoComplete={auto} value={addr[k]} onChange={(e) => { setAddr({ ...addr, [k]: e.target.value }); setQ(null); }} />
            </label>
          ))}
          {q && (
            <dl className="mt-1 grid grid-cols-[1fr_auto] gap-y-0.5 rounded-lg bg-bone-2 p-3 text-xs">
              <dt>{q.quantity} × book</dt><dd>{money(q.unitPrice * q.quantity, q.currency)}</dd>
              <dt>Shipping, handling and tax</dt><dd>{money(q.shipping, q.currency)}</dd>
              <dt className="font-semibold">Total</dt><dd className="font-semibold">{money(q.total, q.currency)}</dd>
            </dl>
          )}
          <div className="mt-1 grid gap-2">
            {!q
              ? <button className="btn btn-dark w-full justify-center" onClick={getQuote} disabled={busy || !!status}>Get price</button>
              : <button className="btn btn-primary w-full justify-center" onClick={checkout} disabled={busy || !!status}>Pay {money(q.total, q.currency)} and print</button>}
            <button className="text-xs text-dust underline" onClick={() => setOpen(false)}>Cancel</button>
          </div>
          {status && <p className="text-xs text-dust">{status}</p>}
          {err && <p className="text-xs text-clay">{err}</p>}
          <p className="text-[11px] leading-snug text-dust">Payment is handled by Stripe. Your book files are kept for 30 days so Lulu can print them, then deleted.</p>
        </div>
      )}
    </div>
  );
}
