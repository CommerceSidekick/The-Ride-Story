import type { Metadata } from "next";
import Link from "next/link";
import { getCheckout, stripeConfigured } from "@/lib/order";

export const metadata: Metadata = { title: "Order placed", robots: { index: false } };

export default async function Thanks({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const s = stripeConfigured() && session_id?.startsWith("cs_") ? await getCheckout(session_id).catch(() => null) : null;
  const paid = s?.payment_status === "paid";
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="font-display text-4xl font-semibold">{paid ? "Your book is on its way to the printer." : "Thanks — we're confirming your payment."}</h1>
      <p className="mt-4 text-loam/80">
        {paid
          ? `We've sent the order to Lulu. Printing takes 3–5 business days, then it ships. A receipt is on its way to ${s?.customer_details?.email ?? "your inbox"}.`
          : "If your payment went through you'll get a receipt by email shortly, and the book goes to print automatically."}
      </p>
      <Link href="/app" className="btn btn-dark mt-8 inline-flex">Back to your trips</Link>
    </main>
  );
}
