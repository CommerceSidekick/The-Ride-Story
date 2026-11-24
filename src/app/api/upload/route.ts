import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { blobConfigured, UPLOAD_RULES, type UploadKind } from "@/lib/blob";
import { PROVIDERS, session } from "@/lib/connect/registry";
import { json, sameOrigin } from "@/lib/connect/http";
import { printOrderingConfigured } from "@/lib/order";

/**
 * Issues short-lived upload tokens so the browser can send files straight to blob storage.
 * Post images: only for a browser connected to Instagram or Facebook. Print PDFs: only when ordering is on.
 */
export async function POST(req: Request) {
  if (!blobConfigured()) return json({ error: "File storage is not set up on this site yet." }, 501);
  let body: HandleUploadBody;
  try { body = (await req.json()) as HandleUploadBody; } catch { return json({ error: "Bad request" }, 400); }
  // Token requests come from our page; completion callbacks come from Vercel and are signed.
  if (body.type === "blob.generate-client-token" && !sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  try {
    const result = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async (pathname) => {
        const kind = pathname.split("/")[0] as UploadKind;
        const rule = UPLOAD_RULES[kind];
        if (!rule) throw new Error("Unknown upload type");
        if (kind === "social") {
          const social = PROVIDERS.filter((p) => p.kind === "social");
          const connected = await Promise.all(social.map((p) => session(p).then(Boolean).catch(() => false)));
          if (!connected.some(Boolean)) throw new Error("Connect Instagram or Facebook first.");
        }
        if (kind === "print" && !printOrderingConfigured()) throw new Error("Book ordering is not set up on this site yet.");
        return { allowedContentTypes: rule.types, maximumSizeInBytes: rule.maxBytes, addRandomSuffix: true, ttlDays: rule.ttlDays, validUntil: Date.now() + 30 * 60_000 };
      },
    });
    return json(result);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Upload refused" }, 400);
  }
}
