import { getProvider, session } from "@/lib/connect/registry";
import { fail, json } from "@/lib/connect/http";

/** The connected rider's own activities in a date window (unix seconds). */
export async function GET(req: Request, ctx: RouteContext<"/api/connect/[provider]/rides">) {
  const p = getProvider((await ctx.params).provider);
  if (!p?.listRides) return json({ error: "Unknown ride service" }, 404);
  const t = await session(p).catch(() => null);
  if (!t) return json({ error: `Not connected to ${p.name}` }, 401);
  const q = new URL(req.url).searchParams;
  const num = (k: string) => (Number(q.get(k)) > 0 ? Math.floor(Number(q.get(k))) : undefined);
  try {
    return json({ account: t.account, rides: await p.listRides(t, { after: num("after"), before: num("before") }) });
  } catch (e) {
    return fail(e, `${p.name} request failed`);
  }
}
