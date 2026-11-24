import { getProvider, saltFor } from "@/lib/connect/registry";
import { newState, safeReturn } from "@/lib/connect/vault";
import { json } from "@/lib/connect/http";

export async function GET(req: Request, ctx: RouteContext<"/api/connect/[provider]/start">) {
  const p = getProvider((await ctx.params).provider);
  if (!p) return json({ error: "Unknown service" }, 404);
  if (!p.configured()) return json({ error: `${p.name} is not set up on this site yet.` }, 501);
  const url = new URL(req.url);
  const { nonce, challenge } = await newState(p.id, safeReturn(url.searchParams.get("return")), Boolean(p.pkce), saltFor(p));
  return Response.redirect(p.authorizeUrl({ redirectUri: `${url.origin}/api/connect/${p.id}/callback`, state: nonce, challenge }), 302);
}
