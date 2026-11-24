import { json, sameOrigin } from "@/lib/connect/http";
import { OrderError, parseOrder, printOrderingConfigured, quote } from "@/lib/order";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  if (!printOrderingConfigured()) return json({ error: "Book ordering is not set up on this site yet." }, 501);
  try {
    const o = parseOrder((await req.json()) as Record<string, unknown>, false);
    const q = await quote(o);
    return json({ currency: q.currency, unitPrice: q.unitPrice, shipping: q.shipping, total: q.total, quantity: q.quantity });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Quote failed" }, e instanceof OrderError ? e.status : 502);
  }
}
