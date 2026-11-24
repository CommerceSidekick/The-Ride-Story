import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Connection tokens live only in an encrypted, httpOnly cookie in the rider's own browser.
 * Nothing is written to a database, so a connection belongs to one browser and ends when it is
 * disconnected, revoked on the provider's side, or the cookie expires.
 */

export type Tokens = {
  access: string;
  refresh?: string;
  /** Unix seconds. */
  expiresAt?: number;
  /** Display name of the connected account. */
  account: string;
  userId?: string;
  /** Provider-specific extras (e.g. Facebook Pages and their tokens). */
  extra?: Record<string, unknown>;
};

function key(salt: string) {
  const secret = process.env.TOKEN_SECRET || process.env.STRAVA_TOKEN_SECRET || salt;
  return createHash("sha256").update(`${secret}:trs-connect`).digest();
}

export function seal(v: unknown, salt: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(salt), iv);
  const body = Buffer.concat([c.update(JSON.stringify(v), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

export function unseal<T>(v: string, salt: string): T | null {
  try {
    const b = Buffer.from(v, "base64url");
    const d = createDecipheriv("aes-256-gcm", key(salt), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}

const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
const cookieName = (id: string) => `trs_c_${id}`;

export async function readTokens(id: string, salt: string): Promise<Tokens | null> {
  const raw = (await cookies()).get(cookieName(id))?.value;
  return raw ? unseal<Tokens>(raw, salt) : null;
}
export async function writeTokens(id: string, salt: string, t: Tokens) {
  const v = seal(t, salt);
  if (v.length > 3900) throw new Error("Connection data is too large to keep in this browser.");
  (await cookies()).set(cookieName(id), v, { ...opts, maxAge: 60 * 60 * 24 * 60 });
}
export async function clearTokens(id: string) {
  (await cookies()).delete(cookieName(id));
}

type State = { nonce: string; returnTo: string; provider: string; verifier?: string };

/** Starts an OAuth round trip: CSRF nonce plus an optional PKCE verifier, kept for 10 minutes. */
export async function newState(provider: string, returnTo: string, pkce: boolean, salt: string) {
  const nonce = randomBytes(16).toString("hex");
  const verifier = pkce ? randomBytes(48).toString("base64url") : undefined;
  const s: State = { nonce, returnTo, provider, verifier };
  (await cookies()).set("trs_c_state", seal(s, salt), { ...opts, maxAge: 600 });
  const challenge = verifier ? createHash("sha256").update(verifier).digest("base64url") : undefined;
  return { nonce, challenge };
}

export async function takeState(provider: string, nonce: string | null, salt: string) {
  const jar = await cookies();
  const raw = jar.get("trs_c_state")?.value;
  jar.delete("trs_c_state");
  const s = raw ? unseal<State>(raw, salt) : null;
  if (!s || !nonce || s.nonce !== nonce || s.provider !== provider) return null;
  return s;
}

/** Only allow redirects back into this app. */
export const safeReturn = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/app");

export const NO_STORE = { "cache-control": "no-store, private", "x-robots-tag": "noindex" };

export class ProviderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** fetch wrapper that turns provider failures into readable errors. */
export async function call(url: string | URL, init: RequestInit & { label: string }): Promise<Response> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  if (res.ok) return res;
  let detail = "";
  try {
    const body = await res.text();
    const j = JSON.parse(body);
    detail = j.error?.message || j.error_description || j.message || (typeof j.error === "string" ? j.error : "");
  } catch {}
  if (res.status === 429) throw new ProviderError(429, `${init.label} is rate limiting requests. Try again in a few minutes.`);
  if (res.status === 401) throw new ProviderError(401, `${init.label} access expired or was revoked. Connect again.`);
  throw new ProviderError(res.status >= 500 ? 502 : res.status, `${init.label} request failed (${res.status})${detail ? `: ${String(detail).slice(0, 200)}` : ""}`);
}

export const env = (name: string, fallback = "") => process.env[name] || fallback;
