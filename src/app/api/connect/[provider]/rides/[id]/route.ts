import { getProvider, session } from "@/lib/connect/registry";
import { fail, json } from "@/lib/connect/http";

const TYPES = { fit: "application/vnd.ant.fit", gpx: "application/gpx+xml", tcx: "application/vnd.garmin.tcx+xml" } as const;

/** Downloads one ride file for the browser to add to the trip like any dropped file. */
export async function GET(_req: Request, ctx: RouteContext<"/api/connect/[provider]/rides/[id]">) {
  const { provider, id } = await ctx.params;
  const p = getProvider(provider);
  if (!p?.rideFile) return json({ error: "Unknown ride service" }, 404);
  if (!/^[\w-]{1,64}$/.test(id)) return json({ error: "Bad ride id" }, 400);
  const t = await session(p).catch(() => null);
  if (!t) return json({ error: `Not connected to ${p.name}` }, 401);
  try {
    const f = await p.rideFile(t, id);
    if (f.body.byteLength > 40 * 1024 * 1024) return json({ error: "That ride file is too large." }, 413);
    return new Response(f.body, {
      headers: {
        "content-type": TYPES[f.ext], "content-disposition": `attachment; filename="${p.id}-${id}.${f.ext}"`,
        "x-ride-ext": f.ext, "cache-control": "no-store, private",
      },
    });
  } catch (e) {
    return fail(e, `${p.name} download failed`);
  }
}
