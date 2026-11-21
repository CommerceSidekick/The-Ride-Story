import type { Media } from "./types";

export type Ingested = {
  meta: Pick<Media, "kind" | "name" | "w" | "h"> & Partial<Media>;
  display: Blob;
  thumb: Blob;
  video?: Blob;
};

export const isPhotoFile = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(f.name);
export const isVideoFile = (f: File) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name);

const toBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode image"))), "image/jpeg", q));

function drawScaled(src: CanvasImageSource, sw: number, sh: number, max: number) {
  const s = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(sw * s));
  c.height = Math.max(1, Math.round(sh * s));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Browsers other than Safari cannot decode HEIC; convert it first.
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    return createImageBitmap(Array.isArray(out) ? out[0] : out, { imageOrientation: "from-image" });
  }
}

export async function ingestPhoto(file: File): Promise<Ingested> {
  const meta: Ingested["meta"] = { kind: "photo", name: file.name, w: 0, h: 0 };
  try {
    const exifr = (await import("exifr")).default;
    const x = await exifr.parse(file, { tiff: true, exif: true, gps: true });
    const d: Date | undefined = x?.DateTimeOriginal ?? x?.CreateDate;
    if (d instanceof Date && !isNaN(d.getTime())) {
      // exifr builds the Date in the browser's zone; read the fields back to recover wall-clock time.
      meta.takenLocalMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
      const off = /^([+-])(\d\d):(\d\d)$/.exec(String(x?.OffsetTimeOriginal ?? x?.OffsetTime ?? ""));
      if (off) {
        const mins = (off[1] === "-" ? -1 : 1) * (parseInt(off[2]) * 60 + parseInt(off[3]));
        meta.takenUtcMs = meta.takenLocalMs - mins * 60000;
      }
    }
    if (Number.isFinite(x?.latitude) && Number.isFinite(x?.longitude)) {
      meta.lat = x.latitude;
      meta.lon = x.longitude;
    }
  } catch {
    /* no EXIF — fall through to file time */
  }
  if (meta.takenLocalMs == null && meta.takenUtcMs == null && file.lastModified) meta.takenUtcMs = file.lastModified;
  const bmp = await decode(file);
  const display = drawScaled(bmp, bmp.width, bmp.height, 2400);
  const thumb = drawScaled(bmp, bmp.width, bmp.height, 640);
  meta.w = display.width;
  meta.h = display.height;
  bmp.close();
  return { meta, display: await toBlob(display, 0.88), thumb: await toBlob(thumb, 0.8) };
}

export async function ingestVideo(file: File): Promise<Ingested> {
  const meta: Ingested["meta"] = {
    kind: "video", name: file.name, w: 1920, h: 1080,
    takenUtcMs: file.lastModified || undefined,
    videoExt: (file.name.split(".").pop() || "mp4").toLowerCase(),
  };
  const url = URL.createObjectURL(file);
  try {
    const frame = await new Promise<HTMLCanvasElement>((res, rej) => {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      const timer = setTimeout(() => rej(new Error("timeout")), 15000);
      v.onloadedmetadata = () => {
        meta.durationSec = Number.isFinite(v.duration) ? v.duration : undefined;
        v.currentTime = Math.min(1, (v.duration || 2) / 3);
      };
      v.onseeked = () => {
        clearTimeout(timer);
        res(drawScaled(v, v.videoWidth, v.videoHeight, 1920));
      };
      v.onerror = () => { clearTimeout(timer); rej(new Error("decode")); };
      v.src = url;
    });
    meta.w = frame.width;
    meta.h = frame.height;
    const thumb = drawScaled(frame, frame.width, frame.height, 640);
    return { meta, display: await toBlob(frame, 0.86), thumb: await toBlob(thumb, 0.8), video: file };
  } catch {
    // Codec the browser cannot decode (e.g. HEVC on some systems): keep the clip, use a plain poster.
    const c = document.createElement("canvas");
    c.width = 1280; c.height = 720;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#1c1a17"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#e8862a"; ctx.beginPath(); ctx.moveTo(590, 300); ctx.lineTo(590, 420); ctx.lineTo(700, 360); ctx.fill();
    meta.w = c.width; meta.h = c.height;
    const b = await toBlob(c, 0.8);
    return { meta, display: b, thumb: b, video: file };
  } finally {
    URL.revokeObjectURL(url);
  }
}
