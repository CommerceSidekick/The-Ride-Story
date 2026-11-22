import { clearSession, currentSession, deauthorize, NO_STORE } from "@/lib/strava-server";

/** Revokes this app's access on Strava and forgets the tokens. */
export async function POST() {
  const s = await currentSession().catch(() => null);
  if (s) await deauthorize(s);
  await clearSession();
  return Response.json({ ok: true }, { headers: NO_STORE });
}
