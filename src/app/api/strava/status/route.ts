import { currentSession, NO_STORE, stravaConfigured } from "@/lib/strava-server";

export async function GET() {
  if (!stravaConfigured()) return Response.json({ configured: false, connected: false }, { headers: NO_STORE });
  try {
    const s = await currentSession();
    return Response.json({ configured: true, connected: !!s, name: s?.name ?? null }, { headers: NO_STORE });
  } catch {
    return Response.json({ configured: true, connected: false, error: "Could not reach Strava" }, { headers: NO_STORE });
  }
}
