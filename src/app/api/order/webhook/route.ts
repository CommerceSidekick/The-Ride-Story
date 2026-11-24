import { fulfil, verifyStripeSignature } from "@/lib/order";

export const maxDuration = 60;

/** Stripe → us: when a book checkout is paid, send the print job to Lulu. Retried by Stripe on failure. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"))) return new Response("bad signature", { status: 400 });
  const evt = JSON.parse(raw) as { type: string; data: { object: { id: string; metadata?: Record<string, string> } } };
  if (evt.type !== "checkout.session.completed" && evt.type !== "checkout.session.async_payment_succeeded") return Response.json({ ignored: evt.type });
  if (!evt.data.object.metadata?.trs_sku) return Response.json({ ignored: "not a book order" });
  try {
    return Response.json(await fulfil(evt.data.object.id));
  } catch (e) {
    console.error("Book order fulfilment failed", evt.data.object.id, e);
    return new Response("fulfilment failed", { status: 500 });
  }
}
