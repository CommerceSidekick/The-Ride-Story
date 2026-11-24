/** Temporary public file storage (Vercel Blob) for files a third party must download: post images and print PDFs. */

export type UploadKind = "social" | "print";

export const UPLOAD_RULES: Record<UploadKind, { types: string[]; maxBytes: number; ttlDays: number }> = {
  // Instagram accepts JPEG only, up to 8 MB.
  social: { types: ["image/jpeg"], maxBytes: 8 * 1024 * 1024, ttlDays: 1 },
  // Kept long enough for the printer to fetch and re-fetch the files.
  print: { types: ["application/pdf"], maxBytes: 1536 * 1024 * 1024, ttlDays: 30 },
};

/** True for a URL in this site's blob store under one of our upload folders. */
export function isOurBlob(u: string, kind?: UploadKind) {
  try {
    const url = new URL(u);
    const hostOk = process.env.BLOB_TEST_HOST ? url.host === process.env.BLOB_TEST_HOST : url.protocol === "https:" && url.host.endsWith(".public.blob.vercel-storage.com");
    const prefix = kind ? [`/${kind}/`] : ["/social/", "/print/"];
    return hostOk && prefix.some((p) => url.pathname.startsWith(p));
  } catch {
    return false;
  }
}

export const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
