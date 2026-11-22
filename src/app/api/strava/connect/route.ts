import { authorizeUrl, newState, safeReturn, stravaConfigured } from "@/lib/strava-server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!stravaConfigured()) return Response.json({ error: "Strava is not configured on this deployment." }, { status: 501 });
  const state = await newState(safeReturn(url.searchParams.get("return")));
  const redirectUri = `${url.origin}/api/strava/callback`;
  return Response.redirect(authorizeUrl(redirectUri, state), 302);
}
