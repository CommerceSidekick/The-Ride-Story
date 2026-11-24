import { getProvider, session } from "@/lib/connect/registry";
import { clearTokens } from "@/lib/connect/vault";
import { json, sameOrigin } from "@/lib/connect/http";

export async function POST(req: Request, ctx: RouteContext<"/api/connect/[provider]/disconnect">) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  const p = getProvider((await ctx.params).provider);
  if (!p) return json({ error: "Unknown service" }, 404);
  const t = await session(p).catch(() => null);
  if (t && p.revoke) await p.revoke(t);
  await clearTokens(p.id);
  return json({ ok: true });
}
