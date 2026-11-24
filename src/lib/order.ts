import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isOurBlob } from "./blob";
import type { BookSize } from "./types";

/**
 * Printed books: Lulu Print API for printing and shipping, Stripe Checkout for payment.
 * Flow: the browser uploads the interior + cover PDFs → we quote with Lulu → Stripe Checkout →
 * Stripe's webhook tells us the payment cleared → we create the Lulu print job (paid from the
 * card on the Lulu account). Nothing is stored here; the order lives in Stripe and Lulu.
 */

const env = (k: string, d = "") => process.env[k] || d;
const LULU = () => env("LULU_API_BASE", env("LULU_ENV") === "production" ? "https://api.lulu.com" : "https://api.sandbox.lulu.com");
const STRIPE = () => env("STRIPE_API_BASE", "https://api.stripe.com");

export const luluConfigured = () => Boolean(env("LULU_CLIENT_KEY") && env("LULU_CLIENT_SECRET"));
export const stripeConfigured = () => Boolean(env("STRIPE_SECRET_KEY") && env("STRIPE_WEBHOOK_SECRET"));
export const printOrderingConfigured = () => luluConfigured() && stripeConfigured() && Boolean(env("BLOB_READ_WRITE_TOKEN"));
export const luluSandbox = () => !LULU().includes("://api.lulu.com");

/** Full-colour premium hardcover (case wrap), 80# coated white paper, gloss cover. 24–800 pages. */
export const LULU_SKUS: Partial<Record<BookSize, string>> = {
  square85: "0850X0850.FC.PRE.CW.080CW444.GXX",
  landscape11: "1100X0850.FC.PRE.CW.080CW444.GXX",
};
export const LULU_PAGES = { min: 24, max: 800 };
export const SHIPPING_LEVELS = ["MAIL", "PRIORITY_MAIL", "GROUND", "EXPEDITED", "EXPRESS"] as const;
export type ShippingLevel = (typeof SHIPPING_LEVELS)[number];

export class OrderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ---------------- Lulu ---------------- */

let cached: { token: string; until: number } | null = null;

async function luluToken() {
  if (cached && cached.until > Date.now()) return cached.token;
  const basic = Buffer.from(`${env("LULU_CLIENT_KEY")}:${env("LULU_CLIENT_SECRET")}`).toString("base64");
  const r = await fetch(`${LULU()}/auth/realms/glasstree/protocol/openid-connect/token`, {
    method: "POST", cache: "no-store",
    headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  if (!r.ok) throw new OrderError(502, `Lulu sign-in failed (${r.status})`);
  const t = (await r.json()) as { access_token: string; expires_in?: number };
  cached = { token: t.access_token, until: Date.now() + Math.max(60, (t.expires_in ?? 300) - 60) * 1000 };
  return t.access_token;
}

async function lulu<T>(path: string, body?: unknown, method = body ? "POST" : "GET"): Promise<T> {
  const r = await fetch(`${LULU()}${path}`, {
    method, cache: "no-store",
    headers: { authorization: `Bearer ${await luluToken()}`, "content-type": "application/json", accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) {
    let detail = text.slice(0, 300);
    try {
      const j = JSON.parse(text);
      detail = j.detail || j.message || JSON.stringify(j.shipping_address ?? j).slice(0, 300);
    } catch {}
    throw new OrderError(r.status === 400 ? 400 : 502, `Lulu: ${detail}`);
  }
  return JSON.parse(text) as T;
}

export type Address = {
  name: string; street1: string; street2?: string; city: string; state_code?: string;
  postcode: string; country_code: string; phone_number: string; email: string;
};

export function cleanAddress(a: Partial<Record<keyof Address, unknown>>): Address {
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const out: Address = {
    name: s(a.name, 35), street1: s(a.street1, 30), street2: s(a.street2, 30) || undefined, city: s(a.city, 30),
    state_code: s(a.state_code, 3).toUpperCase() || undefined, postcode: s(a.postcode, 20), country_code: s(a.country_code, 2).toUpperCase(),
    phone_number: s(a.phone_number, 20), email: s(a.email, 80),
  };
  if (!out.name || !out.street1 || !out.city || !out.postcode || out.country_code.length !== 2) throw new OrderError(400, "Fill in the name and full shipping address.");
  if (!/^\+?[\d\s\-./()]{8,20}$/.test(out.phone_number)) throw new OrderError(400, "Enter a phone number for the courier (8–20 digits).");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email)) throw new OrderError(400, "Enter a valid email address.");
  return out;
}

export async function coverDimensions(sku: string, pages: number) {
  const d = await lulu<{ width: string; height: string; unit: string }>("/cover-dimensions/", { pod_package_id: sku, interior_page_count: pages, unit: "inch" });
  return { w: Number(d.width), h: Number(d.height) };
}

type CostCalc = {
  currency: string;
  line_item_costs: { total_cost_incl_tax: string; quantity: number }[];
  total_cost_incl_tax: string;
};

export type Quote = {
  currency: string;
  quantity: number;
  /** What the rider pays, in cents. */
  unitPrice: number;
  shipping: number;
  total: number;
  /** What Lulu charges us, in cents (print + shipping + fulfilment + tax). */
  luluCost: number;
};

const cents = (v: string | number) => Math.round(Number(v) * 100);

export async function quote(o: { sku: string; pages: number; quantity: number; level: ShippingLevel; address: Address }): Promise<Quote> {
  const c = await lulu<CostCalc>("/print-job-cost-calculations/", {
    line_items: [{ pod_package_id: o.sku, page_count: o.pages, quantity: o.quantity }],
    shipping_address: o.address, shipping_option: o.level,
  });
  const print = c.line_item_costs.reduce((s, l) => s + cents(l.total_cost_incl_tax), 0);
  const luluCost = cents(c.total_cost_incl_tax);
  // The book is $25 a copy (BOOK_PRICE_CENTS), but never less than Lulu's print cost plus 10%.
  const floor = Number(env("BOOK_PRICE_CENTS", "2500"));
  const unitPrice = Math.max(floor, Math.ceil(((print / o.quantity) * 1.1) / 100) * 100);
  const shipping = Math.max(0, luluCost - print);
  return { currency: c.currency.toLowerCase(), quantity: o.quantity, unitPrice, shipping, total: unitPrice * o.quantity + shipping, luluCost };
}

export async function createPrintJob(o: {
  externalId: string; title: string; sku: string; quantity: number; level: ShippingLevel; address: Address; coverUrl: string; interiorUrl: string;
}) {
  return lulu<{ id: number; status?: { name: string } }>("/print-jobs/", {
    external_id: o.externalId,
    contact_email: env("LULU_CONTACT_EMAIL") || o.address.email,
    shipping_level: o.level,
    shipping_address: o.address,
    line_items: [{
      external_id: o.externalId, title: o.title.slice(0, 255), quantity: o.quantity, pod_package_id: o.sku,
      printable_normalization: { cover: { source_url: o.coverUrl }, interior: { source_url: o.interiorUrl } },
    }],
  });
}

/* ---------------- Order input ---------------- */

export type OrderInput = {
  title: string; size: BookSize; pages: number; quantity: number; level: ShippingLevel; address: Address; coverUrl: string; interiorUrl: string;
};

export function parseOrder(b: Record<string, unknown>, needFiles: boolean): OrderInput & { sku: string } {
  const size = b.size as BookSize;
  const sku = LULU_SKUS[size];
  if (!sku) throw new OrderError(400, "Lulu prints this book at 8.5 × 8.5 in square or 11 × 8.5 in landscape. Switch size in Book settings.");
  const pages = Math.floor(Number(b.pages));
  if (!(pages >= LULU_PAGES.min && pages <= LULU_PAGES.max) || pages % 2) throw new OrderError(400, `Books need an even page count from ${LULU_PAGES.min} to ${LULU_PAGES.max}.`);
  const quantity = Math.floor(Number(b.quantity));
  if (!(quantity >= 1 && quantity <= 50)) throw new OrderError(400, "Order between 1 and 50 copies. For more, get in touch.");
  const level = SHIPPING_LEVELS.includes(b.level as ShippingLevel) ? (b.level as ShippingLevel) : "GROUND";
  const coverUrl = typeof b.coverUrl === "string" ? b.coverUrl : "";
  const interiorUrl = typeof b.interiorUrl === "string" ? b.interiorUrl : "";
  if (needFiles && !(isOurBlob(coverUrl, "print") && isOurBlob(interiorUrl, "print"))) throw new OrderError(400, "Book files are missing. Build them again.");
  const title = (typeof b.title === "string" ? b.title.trim() : "") || "The Ride Story";
  return { title: title.slice(0, 120), size, sku, pages, quantity, level, address: cleanAddress((b.address ?? {}) as Record<string, unknown>), coverUrl, interiorUrl };
}

/* ---------------- Stripe ---------------- */

async function stripe<T>(path: string, params?: URLSearchParams, method = params ? "POST" : "GET"): Promise<T> {
  const r = await fetch(`${STRIPE()}${path}`, {
    method, cache: "no-store",
    headers: { authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`, "content-type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const j = (await r.json()) as T & { error?: { message?: string } };
  if (!r.ok) throw new OrderError(502, `Payment setup failed: ${j.error?.message ?? r.status}`);
  return j;
}

/** Everything needed to create the print job after payment, carried in Stripe metadata (500 chars per value). */
function orderMetadata(o: OrderInput & { sku: string }) {
  const m: Record<string, string> = {
    trs_title: o.title, trs_sku: o.sku, trs_pages: String(o.pages), trs_qty: String(o.quantity), trs_level: o.level,
    trs_cover: o.coverUrl, trs_interior: o.interiorUrl, trs_address: JSON.stringify(o.address),
  };
  for (const [k, v] of Object.entries(m)) if (v.length > 500) throw new OrderError(400, `Order detail too long (${k.replace("trs_", "")}).`);
  return m;
}

export async function createCheckout(o: OrderInput & { sku: string }, q: Quote, origin: string, returnPath: string) {
  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("customer_email", o.address.email);
  p.set("success_url", `${origin}/order/thanks?session_id={CHECKOUT_SESSION_ID}`);
  p.set("cancel_url", `${origin}${returnPath}`);
  p.set("line_items[0][quantity]", String(o.quantity));
  p.set("line_items[0][price_data][currency]", q.currency);
  p.set("line_items[0][price_data][unit_amount]", String(q.unitPrice));
  p.set("line_items[0][price_data][product_data][name]", `${o.title} — hardcover photo book`);
  p.set("line_items[0][price_data][product_data][description]", `${o.pages} pages, ${o.size === "square85" ? "8.5 × 8.5 in" : "11 × 8.5 in"}, printed by Lulu`);
  if (q.shipping > 0) {
    p.set("line_items[1][quantity]", "1");
    p.set("line_items[1][price_data][currency]", q.currency);
    p.set("line_items[1][price_data][unit_amount]", String(q.shipping));
    p.set("line_items[1][price_data][product_data][name]", `Shipping (${o.level.replace("_", " ").toLowerCase()}), handling and tax`);
  }
  for (const [k, v] of Object.entries(orderMetadata(o))) {
    p.set(`metadata[${k}]`, v);
    p.set(`payment_intent_data[metadata][${k}]`, v);
  }
  return stripe<{ id: string; url: string }>("/v1/checkout/sessions", p);
}

/** Stripe-Signature: t=timestamp,v1=hex(HMAC_SHA256(secret, `${t}.${body}`)). */
export function verifyStripeSignature(raw: string, header: string | null, toleranceSec = 300) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]).filter((kv) => kv.length === 2));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = createHmac("sha256", env("STRIPE_WEBHOOK_SECRET")).update(`${t}.${raw}`).digest();
  return header.split(",").filter((kv) => kv.startsWith("v1=")).some((kv) => {
    const got = Buffer.from(kv.slice(3), "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

type Session = { id: string; payment_status: string; payment_intent: string | null; metadata: Record<string, string>; customer_details?: { email?: string } };

export const getCheckout = (id: string) => stripe<Session & { amount_total?: number; currency?: string }>(`/v1/checkout/sessions/${encodeURIComponent(id)}`);

/** Called from the Stripe webhook once a checkout is paid. Safe to call more than once per session. */
export async function fulfil(sessionId: string) {
  const s = await getCheckout(sessionId);
  if (s.payment_status !== "paid" || !s.payment_intent) return { skipped: "unpaid" };
  const pi = await stripe<{ id: string; metadata: Record<string, string> }>(`/v1/payment_intents/${encodeURIComponent(s.payment_intent)}`);
  if (pi.metadata.lulu_job) return { skipped: "done", job: pi.metadata.lulu_job };
  const m = s.metadata;
  const job = await createPrintJob({
    externalId: s.id, title: m.trs_title, sku: m.trs_sku, quantity: Number(m.trs_qty), level: m.trs_level as ShippingLevel,
    address: JSON.parse(m.trs_address) as Address, coverUrl: m.trs_cover, interiorUrl: m.trs_interior,
  });
  await stripe(`/v1/payment_intents/${encodeURIComponent(pi.id)}`, new URLSearchParams({ "metadata[lulu_job]": String(job.id) }));
  return { job: job.id };
}

/* ---------------- File checks (before payment) ---------------- */

type Validation = { id: number; status: string; errors?: (string | { message?: string })[] | null };

/** Ask Lulu to check both files against the product. Runs asynchronously on Lulu's side. */
export async function startValidation(o: { sku: string; pages: number; coverUrl: string; interiorUrl: string }) {
  const interior = await lulu<Validation>("/validate-interior/", { source_url: o.interiorUrl, pod_package_id: o.sku });
  const cover = await lulu<Validation>("/validate-cover/", { source_url: o.coverUrl, pod_package_id: o.sku, interior_page_count: o.pages });
  return { interior: interior.id, cover: cover.id };
}

const DONE = ["VALIDATED", "NORMALIZED"];
const msg = (v: Validation) => (v.errors ?? []).map((e) => (typeof e === "string" ? e : e.message ?? "")).filter(Boolean).join("; ");

export async function checkValidation(ids: { interior: number; cover: number }) {
  const [i, c] = await Promise.all([lulu<Validation>(`/validate-interior/${ids.interior}/`), lulu<Validation>(`/validate-cover/${ids.cover}/`)]);
  const failed = [i.status === "ERROR" && `Interior: ${msg(i) || "rejected"}`, c.status === "ERROR" && `Cover: ${msg(c) || "rejected"}`].filter(Boolean) as string[];
  return { done: DONE.includes(i.status) && DONE.includes(c.status), failed };
}
