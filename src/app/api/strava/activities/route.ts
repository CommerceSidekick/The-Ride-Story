import { currentSession, NO_STORE, stravaGet, StravaError } from "@/lib/strava-server";

type SummaryActivity = {
  id: number; name: string; sport_type?: string; type?: string; start_date: string; start_date_local: string;
  distance: number; total_elevation_gain: number; moving_time: number;
};

/**
 * The connected athlete's own activities in a date window. Returned only to that athlete,
 * never stored, never written into the trip.
 */
export async function GET(req: Request) {
  const s = await currentSession().catch(() => null);
  if (!s) return Response.json({ error: "Not connected to Strava" }, { status: 401, headers: NO_STORE });
  const q = new URL(req.url).searchParams;
  const after = Number(q.get("after"));
  const before = Number(q.get("before"));
  const window: Record<string, number> = { per_page: 100, page: 1 };
  if (Number.isFinite(after) && after > 0) window.after = Math.floor(after);
  if (Number.isFinite(before) && before > 0) window.before = Math.floor(before);
  try {
    const list = await stravaGet<SummaryActivity[]>(s, "/athlete/activities", window);
    return Response.json(
      {
        athlete: s.name,
        activities: list.map((a) => ({
          id: a.id, name: a.name, sport: a.sport_type ?? a.type ?? "Ride", start: a.start_date, startLocal: a.start_date_local,
          distanceM: a.distance, elevGainM: a.total_elevation_gain, movingSec: a.moving_time,
        })),
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    const status = e instanceof StravaError ? e.status : 502;
    return Response.json({ error: e instanceof Error ? e.message : "Strava request failed" }, { status, headers: NO_STORE });
  }
}
