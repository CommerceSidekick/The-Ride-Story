import "server-only";
import { call, env, ProviderError } from "./vault";
import type { Provider } from "./registry";

/**
 * Publishing to Instagram (professional accounts, via Instagram Login) and to Facebook Pages.
 * Images must be public JPEG URLs when Meta fetches them, so the browser uploads each slide to
 * temporary storage first (see /api/upload) and we delete them once the post is live.
 */

const V = () => env("META_GRAPH_VERSION", "v27.0");
const IG_GRAPH = () => env("INSTAGRAM_GRAPH_BASE", "https://graph.instagram.com");
const IG_OAUTH = () => env("INSTAGRAM_OAUTH_BASE", "https://www.instagram.com");
const IG_API = () => env("INSTAGRAM_API_BASE", "https://api.instagram.com");
const FB_GRAPH = () => env("FACEBOOK_GRAPH_BASE", "https://graph.facebook.com");
const FB_WWW = () => env("FACEBOOK_WWW_BASE", "https://www.facebook.com");

const now = () => Math.floor(Date.now() / 1000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const form = (o: Record<string, string>) => new URLSearchParams(o);

export const MAX_IMAGES = 10;

/* ---------------- Instagram ---------------- */

async function igPost(path: string, params: Record<string, string>, label = "Instagram") {
  const r = await call(`${IG_GRAPH()}/${V()}${path}`, { label, method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form(params) });
  return (await r.json()) as { id: string };
}
async function igGet<T>(path: string, params: Record<string, string>) {
  const u = new URL(`${IG_GRAPH()}/${V()}${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return (await (await call(u, { label: "Instagram" })).json()) as T;
}

/** Meta processes each container asynchronously; wait until it can be published. */
async function igWaitReady(id: string, token: string) {
  for (let i = 0; i < 25; i++) {
    const s = await igGet<{ status_code?: string; status?: string }>(`/${id}`, { fields: "status_code,status", access_token: token });
    if (s.status_code === "FINISHED" || s.status_code === "PUBLISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new ProviderError(422, `Instagram couldn't process an image${s.status ? `: ${s.status}` : ""}.`);
    await sleep(i < 5 ? 1500 : 3000);
  }
  throw new ProviderError(504, "Instagram is still processing the images. Check your profile in a minute before trying again.");
}

export const instagram: Provider = {
  id: "instagram", name: "Instagram", kind: "social",
  note: "Works with Instagram professional accounts (Business or Creator). Posts carousels of up to 10 images.",
  configured: () => Boolean(env("INSTAGRAM_APP_ID") && env("INSTAGRAM_APP_SECRET")),
  authorizeUrl({ redirectUri, state }) {
    const u = new URL(`${IG_OAUTH()}/oauth/authorize`);
    u.search = form({
      client_id: env("INSTAGRAM_APP_ID"), redirect_uri: redirectUri, response_type: "code", state,
      scope: "instagram_business_basic,instagram_business_content_publish",
    }).toString();
    return u.toString();
  },
  async exchange({ code, redirectUri }) {
    const r = await call(`${IG_API()}/oauth/access_token`, {
      label: "Instagram", method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({ client_id: env("INSTAGRAM_APP_ID"), client_secret: env("INSTAGRAM_APP_SECRET"), grant_type: "authorization_code", redirect_uri: redirectUri, code: code.replace(/#_$/, "") }),
    });
    const raw = (await r.json()) as { access_token?: string; data?: { access_token: string; permissions?: string | string[] }[]; permissions?: string | string[] };
    const short = raw.access_token ?? raw.data?.[0]?.access_token;
    const perms = String(raw.permissions ?? raw.data?.[0]?.permissions ?? "");
    if (!short) throw new ProviderError(502, "Instagram didn't return an access token.");
    if (perms && !perms.includes("instagram_business_content_publish")) throw new ProviderError(403, "Instagram didn't grant permission to publish. Connect again and allow posting.");
    const longUrl = new URL(`${IG_GRAPH()}/access_token`);
    longUrl.search = form({ grant_type: "ig_exchange_token", client_secret: env("INSTAGRAM_APP_SECRET"), access_token: short }).toString();
    const long = (await (await call(longUrl, { label: "Instagram" })).json()) as { access_token: string; expires_in?: number };
    const me = await igGet<{ user_id?: string; id?: string; username?: string }>("/me", { fields: "user_id,username", access_token: long.access_token });
    return {
      access: long.access_token, expiresAt: now() + (long.expires_in ?? 60 * 86400),
      userId: String(me.user_id ?? me.id), account: me.username ? `@${me.username}` : "Instagram",
      extra: { issuedAt: now() },
    };
  },
  /** Long-lived tokens last 60 days and can be refreshed once they are a day old. */
  async refresh(t) {
    const issued = Number(t.extra?.issuedAt ?? 0);
    if (now() - issued < 86400) return t;
    const u = new URL(`${IG_GRAPH()}/refresh_access_token`);
    u.search = form({ grant_type: "ig_refresh_token", access_token: t.access }).toString();
    const r = (await (await call(u, { label: "Instagram" })).json()) as { access_token: string; expires_in?: number };
    return { ...t, access: r.access_token, expiresAt: now() + (r.expires_in ?? 60 * 86400), extra: { ...t.extra, issuedAt: now() } };
  },
  refreshWithin: 7 * 86400,
  async publish(t, { images, caption }) {
    if (!t.userId) throw new ProviderError(401, "Instagram account not found. Connect again.");
    const ig = `/${t.userId}`;
    let creation: string;
    if (images.length === 1) {
      creation = (await igPost(`${ig}/media`, { image_url: images[0], caption, access_token: t.access })).id;
    } else {
      const children: string[] = [];
      for (const url of images.slice(0, MAX_IMAGES)) children.push((await igPost(`${ig}/media`, { image_url: url, is_carousel_item: "true", access_token: t.access })).id);
      for (const c of children) await igWaitReady(c, t.access);
      creation = (await igPost(`${ig}/media`, { media_type: "CAROUSEL", children: children.join(","), caption, access_token: t.access })).id;
    }
    await igWaitReady(creation, t.access);
    const published = await igPost(`${ig}/media_publish`, { creation_id: creation, access_token: t.access });
    const link = await igGet<{ permalink?: string }>(`/${published.id}`, { fields: "permalink", access_token: t.access }).catch(() => ({ permalink: undefined }));
    return { id: published.id, url: link.permalink };
  },
};

/* ---------------- Facebook Pages ---------------- */

type Page = { id: string; name: string; token: string };
const fbScopes = "pages_show_list,pages_read_engagement,pages_manage_posts";

export const facebook: Provider = {
  id: "facebook", name: "Facebook", kind: "social",
  note: "Posts to a Facebook Page you manage. Facebook doesn't let apps post to personal profiles, so use Share for those.",
  configured: () => Boolean(env("FACEBOOK_APP_ID") && env("FACEBOOK_APP_SECRET")),
  authorizeUrl({ redirectUri, state }) {
    const u = new URL(`${FB_WWW()}/${V()}/dialog/oauth`);
    u.search = form({ client_id: env("FACEBOOK_APP_ID"), redirect_uri: redirectUri, state, response_type: "code", scope: fbScopes }).toString();
    return u.toString();
  },
  async exchange({ code, redirectUri }) {
    const g = (path: string, params: Record<string, string>) => {
      const u = new URL(`${FB_GRAPH()}/${V()}${path}`);
      u.search = form(params).toString();
      return call(u, { label: "Facebook" }).then((r) => r.json());
    };
    const short = (await g("/oauth/access_token", { client_id: env("FACEBOOK_APP_ID"), client_secret: env("FACEBOOK_APP_SECRET"), redirect_uri: redirectUri, code })) as { access_token: string };
    // A long-lived user token makes the Page tokens below long-lived too.
    const long = (await g("/oauth/access_token", { grant_type: "fb_exchange_token", client_id: env("FACEBOOK_APP_ID"), client_secret: env("FACEBOOK_APP_SECRET"), fb_exchange_token: short.access_token })) as { access_token: string; expires_in?: number };
    const me = (await g("/me", { fields: "id,name", access_token: long.access_token })) as { id: string; name?: string };
    const acc = (await g("/me/accounts", { fields: "id,name,access_token,tasks", limit: "25", access_token: long.access_token })) as { data?: { id: string; name: string; access_token: string; tasks?: string[] }[] };
    const pages: Page[] = (acc.data ?? [])
      .filter((p) => !p.tasks || p.tasks.includes("CREATE_CONTENT"))
      .slice(0, 4)
      .map((p) => ({ id: p.id, name: p.name, token: p.access_token }));
    if (!pages.length) throw new ProviderError(403, "No Facebook Pages you can post to were shared. Connect again and pick at least one Page.");
    return { access: long.access_token, expiresAt: long.expires_in ? now() + long.expires_in : undefined, userId: me.id, account: me.name || "Facebook", extra: { pages } };
  },
  targets: (t) => ((t.extra?.pages as Page[] | undefined) ?? []).map(({ id, name }) => ({ id, name })),
  async revoke(t) {
    await fetch(`${FB_GRAPH()}/${V()}/me/permissions?access_token=${encodeURIComponent(t.access)}`, { method: "DELETE", cache: "no-store" }).catch(() => {});
  },
  async publish(t, { images, caption, target }) {
    const pages = (t.extra?.pages as Page[] | undefined) ?? [];
    const page = pages.find((p) => p.id === target) ?? pages[0];
    if (!page) throw new ProviderError(400, "Pick a Facebook Page to post to.");
    const post = (path: string, body: URLSearchParams) =>
      call(`${FB_GRAPH()}/${V()}/${page.id}${path}`, { label: "Facebook", method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body }).then((r) => r.json());
    const ids: string[] = [];
    for (const url of images.slice(0, MAX_IMAGES)) ids.push(((await post("/photos", form({ url, published: "false", access_token: page.token }))) as { id: string }).id);
    const body = form({ message: caption, access_token: page.token });
    ids.forEach((id, i) => body.set(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })));
    const res = (await post("/feed", body)) as { id: string };
    return { id: res.id, url: `https://www.facebook.com/${res.id}` };
  },
};
