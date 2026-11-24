import { json, sameOrigin } from "@/lib/connect/http";
import { coverDimensions, LULU_PAGES, LULU_SKUS, OrderError, printOrderingConfigured } from "@/lib/order";
import type { BookSize } from "@/lib/types";

/** Exact wraparound cover size (inches) Lulu wants for this book and page count. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  if (!printOrderingConfigured()) return json({ error: "Book ordering is not set up on this site yet." }, 501);
  const b = (await req.json().catch(() => ({}))) as { size?: BookSize; pages?: number };
  const sku = b.size ? LULU_SKUS[b.size] : undefined;
  const pages = Math.floor(Number(b.pages));
  if (!sku || !(pages >= LULU_PAGES.min && pages <= LULU_PAGES.max)) return json({ error: "Unsupported size or page count" }, 400);
  try {
    return json(await coverDimensions(sku, pages));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Lulu request failed" }, e instanceof OrderError ? e.status : 502);
  }
}
