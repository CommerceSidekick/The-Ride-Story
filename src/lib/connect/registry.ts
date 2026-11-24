import "server-only";
import { rwgps, polar, wahoo } from "./rides";
import { facebook, instagram } from "./social";
import type { ProviderKind, ProviderStatus, RideSummary } from "./types";
import { clearTokens, ProviderError, readTokens, writeTokens, type Tokens } from "./vault";

export type Provider = {
  id: string;
  name: string;
  kind: ProviderKind;
  note?: string;
  configured(): boolean;
  pkce?: boolean;
  authorizeUrl(a: { redirectUri: string; state: string; challenge?: string }): string;
  exchange(a: { code: string; redirectUri: string; verifier?: string; params: URLSearchParams }): Promise<Tokens>;
  refresh?(t: Tokens): Promise<Tokens>;
  /** Refresh this many seconds before expiry (default 5 minutes). */
  refreshWithin?: number;
  revoke?(t: Tokens): Promise<void>;
  listRides?(t: Tokens, w: { after?: number; before?: number }): Promise<RideSummary[]>;
  rideFile?(t: Tokens, id: string): Promise<{ body: ArrayBuffer; ext: "fit" | "gpx" | "tcx" }>;
  targets?(t: Tokens): { id: string; name: string }[];
  publish?(t: Tokens, p: { images: string[]; caption: string; target?: string }): Promise<{ id: string; url?: string }>;
};

/** Strava has its own routes (src/app/api/strava) because its API terms are stricter. */
export const PROVIDERS: Provider[] = [wahoo, polar, rwgps, instagram, facebook];

export const getProvider = (id: string) => PROVIDERS.find((p) => p.id === id) ?? null;

/** Salt for the cookie key when no TOKEN_SECRET is set: the provider's own client secret. */
export const saltFor = (p: Provider) => `${p.id}:${process.env[`${p.id.toUpperCase()}_CLIENT_SECRET`] || process.env[`${p.id.toUpperCase()}_APP_SECRET`] || ""}`;

/** The rider's tokens for a provider, refreshed if they are about to expire. */
export async function session(p: Provider): Promise<Tokens | null> {
  const t = await readTokens(p.id, saltFor(p));
  if (!t) return null;
  const within = p.refreshWithin ?? 300;
  if (!t.expiresAt || t.expiresAt - within > Date.now() / 1000) return t;
  if (!p.refresh) {
    if (t.expiresAt < Date.now() / 1000) { await clearTokens(p.id); return null; }
    return t;
  }
  try {
    const next = await p.refresh(t);
    await writeTokens(p.id, saltFor(p), next);
    return next;
  } catch (e) {
    if (e instanceof ProviderError && (e.status === 400 || e.status === 401)) {
      await clearTokens(p.id);
      return null;
    }
    // Still usable until it actually expires.
    if (t.expiresAt > Date.now() / 1000) return t;
    throw e;
  }
}

export async function statusOf(p: Provider): Promise<ProviderStatus> {
  const configured = p.configured();
  const t = configured ? await session(p).catch(() => null) : null;
  return {
    id: p.id, name: p.name, kind: p.kind, configured, connected: Boolean(t), note: p.note,
    account: t?.account, targets: t && p.targets ? p.targets(t) : undefined,
  };
}
