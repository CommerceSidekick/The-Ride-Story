import { exchangeCode, saveSession, StravaError, takeState } from "@/lib/strava-server";

const back = (origin: string, path: string, result: string) => {
  const u = new URL(path, origin);
  u.searchParams.set("strava", result);
  return Response.redirect(u.toString(), 302);
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = await takeState(url.searchParams.get("state"));
  if (!returnTo) return back(url.origin, "/app", "expired");
  if (url.searchParams.get("error")) return back(url.origin, returnTo, "denied");
  const code = url.searchParams.get("code");
  if (!code) return back(url.origin, returnTo, "error");
  try {
    await saveSession(await exchangeCode(code, url.searchParams.get("scope")));
    return back(url.origin, returnTo, "connected");
  } catch (e) {
    return back(url.origin, returnTo, e instanceof StravaError && e.status === 403 ? "noscope" : "error");
  }
}
