import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Strava connection, scoped to what Strava's API Agreement (June 2026) allows:
 * - Strava data is shown only to the athlete who connected, never to crew members or public links.
 * - Nothing from the API is stored: activity lists are fetched live and sent with no-store.
 * - Nothing from the API is passed to AI writing or to print vendors.
 * Rides reach the shared trip only when the athlete exports their own GPX from strava.com and adds the file.
 */

export const OAUTH_BASE = process.env.STRAVA_OAUTH_BASE || "https://www.strava.com/oauth";
export const API_BASE = process.env.STRAVA_API_BASE || "https://www.strava.com/api/v3";
const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
export const SCOPE = "activity:read_all";
const COOKIE = "trs_strava";
const STATE_COOKIE = "trs_strava_state";

export const stravaConfigured = () => Boolean(CLIENT_ID && CLIENT_SECRET);

type Session = { access: string; refresh: string; expiresAt: number; athleteId: number; name: string };

function key() {
  return createHash("sha256").update(process.env.STRAVA_TOKEN_SECRET || `${CLIENT_SECRET}:trs-cookie`).digest();
}
function seal(s: Session) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(s), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}
function unseal(v: string): Session | null {
  try {
    const b = Buffer.from(v, "base64url");
    const d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export async function saveSession(s: Session) {
  (await cookies()).set(COOKIE, seal(s), { ...cookieOpts, maxAge: 60 * 60 * 24 * 60 });
}
export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function newState(returnTo: string) {
  const nonce = randomBytes(16).toString("hex");
  (await cookies()).set(STATE_COOKIE, JSON.stringify({ nonce, returnTo }), { ...cookieOpts, maxAge: 600 });
  return nonce;
}
export async function takeState(nonce: string | null): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  if (!raw || !nonce) return null;
  try {
    const s = JSON.parse(raw) as { nonce: string; returnTo: string };
    return s.nonce === nonce ? s.returnTo : null;
  } catch {
    return null;
  }
}

/** Only allow redirects back into this app. */
export const safeReturn = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/app");

export function authorizeUrl(redirectUri: string, state: string) {
  const u = new URL(`${OAUTH_BASE}/authorize`);
  u.searchParams.set("client_id", CLIENT_ID!);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("approval_prompt", "auto");
  u.searchParams.set("scope", SCOPE);
  u.searchParams.set("state", state);
  return u.toString();
}

type TokenResponse = { access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number; firstname?: string; lastname?: string } };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID!, client_secret: CLIENT_SECRET!, ...params }),
    cache: "no-store",
  });
  if (!res.ok) throw new StravaError(res.status, `Strava token request failed (${res.status})`);
  return res.json();
}

export class StravaError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function exchangeCode(code: string, grantedScope: string | null): Promise<Session> {
  if (!grantedScope?.split(",").some((s) => s === "activity:read_all" || s === "activity:read"))
    throw new StravaError(403, "Strava access to activities was not granted");
  const t = await tokenRequest({ code, grant_type: "authorization_code" });
  return {
    access: t.access_token, refresh: t.refresh_token, expiresAt: t.expires_at,
    athleteId: t.athlete?.id ?? 0, name: [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(" ") || "Strava athlete",
  };
}

/** The current session, refreshed if its access token is about to expire. */
export async function currentSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  const s = raw ? unseal(raw) : null;
  if (!s) return null;
  if (s.expiresAt - 300 > Date.now() / 1000) return s;
  try {
    const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: s.refresh });
    const next = { ...s, access: t.access_token, refresh: t.refresh_token, expiresAt: t.expires_at };
    await saveSession(next);
    return next;
  } catch (e) {
    if (e instanceof StravaError && (e.status === 400 || e.status === 401)) {
      await clearSession(); // access revoked on Strava's side
      return null;
    }
    throw e;
  }
}

export async function stravaGet<T>(s: Session, path: string, query: Record<string, string | number> = {}): Promise<T> {
  const u = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers: { authorization: `Bearer ${s.access}` }, cache: "no-store" });
  if (res.status === 429) throw new StravaError(429, "Strava's rate limit was reached. Try again in 15 minutes.");
  if (res.status === 401) throw new StravaError(401, "Strava access expired. Connect again.");
  if (!res.ok) throw new StravaError(res.status, `Strava request failed (${res.status})`);
  return res.json();
}

export async function deauthorize(s: Session) {
  await fetch(`${OAUTH_BASE}/deauthorize`, {
    method: "POST",
    headers: { authorization: `Bearer ${s.access}` },
    cache: "no-store",
  }).catch(() => {});
}

export const NO_STORE = { "cache-control": "no-store, private", "x-robots-tag": "noindex" };
