import { getProvider, saltFor } from "@/lib/connect/registry";
import { ProviderError, takeState, writeTokens } from "@/lib/connect/vault";

const back = (origin: string, path: string, provider: string, result: string, message?: string) => {
  const u = new URL(path, origin);
  u.searchParams.set("connect", `${provider}:${result}`);
  if (message) u.searchParams.set("connect_msg", message.slice(0, 200));
  return Response.redirect(u.toString(), 302);
};

export async function GET(req: Request, ctx: RouteContext<"/api/connect/[provider]/callback">) {
  const url = new URL(req.url);
  const id = (await ctx.params).provider;
  const p = getProvider(id);
  if (!p) return back(url.origin, "/app", id, "error");
  const s = await takeState(p.id, url.searchParams.get("state"), saltFor(p));
  if (!s) return back(url.origin, "/app", p.id, "expired");
  if (url.searchParams.get("error")) return back(url.origin, s.returnTo, p.id, "denied");
  const code = url.searchParams.get("code");
  if (!code) return back(url.origin, s.returnTo, p.id, "error");
  try {
    const t = await p.exchange({ code, redirectUri: `${url.origin}/api/connect/${p.id}/callback`, verifier: s.verifier, params: url.searchParams });
    await writeTokens(p.id, saltFor(p), t);
    return back(url.origin, s.returnTo, p.id, "connected");
  } catch (e) {
    const msg = e instanceof ProviderError && e.status === 403 ? e.message : undefined;
    return back(url.origin, s.returnTo, p.id, "error", msg);
  }
}
