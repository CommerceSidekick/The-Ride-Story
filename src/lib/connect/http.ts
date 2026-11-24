import "server-only";
import { NO_STORE, ProviderError } from "./vault";

/** Reject cross-site POSTs: only pages on this site may trigger a publish, upload or disconnect. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin";
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

export function fail(e: unknown, fallback = "Request failed") {
  const status = e instanceof ProviderError ? e.status : 502;
  return json({ error: e instanceof Error ? e.message : fallback }, status >= 400 && status < 600 ? status : 502);
}
