import { json, sameOrigin } from "@/lib/connect/http";
import { createCheckout, OrderError, parseOrder, printOrderingConfigured, quote } from "@/lib/order";
import { safeReturn } from "@/lib/connect/vault";

/** Re-quotes on the server (prices never come from the browser), then opens Stripe Checkout. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  if (!printOrderingConfigured()) return json({ error: "Book ordering is not set up on this site yet." }, 501);
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const o = parseOrder(body, true);
    const q = await quote(o);
    const s = await createCheckout(o, q, new URL(req.url).origin, safeReturn(typeof body.returnTo === "string" ? body.returnTo : null));
    return json({ url: s.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Checkout failed" }, e instanceof OrderError ? e.status : 502);
  }
}
