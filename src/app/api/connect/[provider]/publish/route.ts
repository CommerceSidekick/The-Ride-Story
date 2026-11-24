import { del } from "@vercel/blob";
import { getProvider, session } from "@/lib/connect/registry";
import { MAX_IMAGES } from "@/lib/connect/social";
import { fail, json, sameOrigin } from "@/lib/connect/http";
import { isOurBlob } from "@/lib/blob";

export const maxDuration = 120;

/** Publishes already-uploaded slide images (public URLs in our blob store) with a caption. */
export async function POST(req: Request, ctx: RouteContext<"/api/connect/[provider]/publish">) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  const p = getProvider((await ctx.params).provider);
  if (!p?.publish) return json({ error: "Unknown social service" }, 404);
  const t = await session(p).catch(() => null);
  if (!t) return json({ error: `Not connected to ${p.name}` }, 401);
  let body: { images?: unknown; caption?: unknown; target?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const images = Array.isArray(body.images) ? body.images.filter((u): u is string => typeof u === "string" && isOurBlob(u)) : [];
  if (!images.length || images.length !== (body.images as unknown[]).length) return json({ error: "Images must be uploaded first." }, 400);
  if (images.length > MAX_IMAGES) return json({ error: `Up to ${MAX_IMAGES} images per post.` }, 400);
  const caption = typeof body.caption === "string" ? body.caption.slice(0, 2200) : "";
  try {
    const out = await p.publish(t, { images, caption, target: typeof body.target === "string" ? body.target : undefined });
    // The images only need to exist while Meta fetches them. (Uploads also expire on their own after a day.)
    await del(images).catch(() => {});
    return json(out);
  } catch (e) {
    return fail(e, `${p.name} publish failed`);
  }
}
