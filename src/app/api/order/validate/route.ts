import { isOurBlob } from "@/lib/blob";
import { json, sameOrigin } from "@/lib/connect/http";
import { checkValidation, LULU_PAGES, LULU_SKUS, OrderError, printOrderingConfigured, startValidation } from "@/lib/order";
import type { BookSize } from "@/lib/types";

const err = (e: unknown) => json({ error: e instanceof Error ? e.message : "Lulu request failed" }, e instanceof OrderError ? e.status : 502);

/** Start Lulu's file check for the uploaded interior and cover. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  if (!printOrderingConfigured()) return json({ error: "Book ordering is not set up on this site yet." }, 501);
  const b = (await req.json().catch(() => ({}))) as { size?: BookSize; pages?: number; coverUrl?: string; interiorUrl?: string };
  const sku = b.size ? LULU_SKUS[b.size] : undefined;
  const pages = Math.floor(Number(b.pages));
  if (!sku || !(pages >= LULU_PAGES.min && pages <= LULU_PAGES.max)) return json({ error: "Unsupported size or page count" }, 400);
  if (!isOurBlob(b.coverUrl ?? "", "print") || !isOurBlob(b.interiorUrl ?? "", "print")) return json({ error: "Book files are missing. Build them again." }, 400);
  try {
    return json(await startValidation({ sku, pages, coverUrl: b.coverUrl!, interiorUrl: b.interiorUrl! }));
  } catch (e) {
    return err(e);
  }
}

/** Poll: ?interior=<id>&cover=<id> */
export async function GET(req: Request) {
  if (!printOrderingConfigured()) return json({ error: "Book ordering is not set up on this site yet." }, 501);
  const q = new URL(req.url).searchParams;
  const interior = Number(q.get("interior")), cover = Number(q.get("cover"));
  if (!(interior > 0 && cover > 0)) return json({ error: "Bad request" }, 400);
  try {
    return json(await checkValidation({ interior, cover }));
  } catch (e) {
    return err(e);
  }
}
