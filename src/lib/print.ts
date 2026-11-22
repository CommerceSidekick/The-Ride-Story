import type { BookSize } from "./types";

/**
 * Print presets. Values are the printers' published file rules where we could confirm them
 * (Lulu: 0.125 in bleed, single-spread cover, 300 ppi; Prodigi: even page count, 24+ pages).
 * Spine width depends on paper and page count, so it is always shown as an estimate to check
 * against the printer's own cover calculator.
 */
export type PrintPreset = {
  id: string;
  name: string;
  sizes: BookSize[];
  bleedIn: number;
  /** Extra cover material around the trim for hardcover case wraps. */
  coverWrapIn: number;
  minPages: number;
  pageMultiple: number;
  /** Rough spine width per interior page, inches (photo paper, hardcover board added separately). */
  spinePerPageIn: number;
  spineBaseIn: number;
  url: string;
  notes: string;
};

export const PRESETS: PrintPreset[] = [
  {
    id: "lulu-hardcover", name: "Lulu — hardcover case wrap", sizes: ["landscape11", "square85"],
    bleedIn: 0.125, coverWrapIn: 0.75, minPages: 24, pageMultiple: 2, spinePerPageIn: 0.0025, spineBaseIn: 0.25,
    url: "https://www.lulu.com/create/print-books",
    notes: "Upload interior.pdf and cover.pdf as a print-ready book. Lulu's cover template gives the exact spine width for your page count.",
  },
  {
    id: "blurb", name: "Blurb — PDF to Book", sizes: ["landscape", "square12"],
    bleedIn: 0.125, coverWrapIn: 0.125, minPages: 20, pageMultiple: 2, spinePerPageIn: 0.0025, spineBaseIn: 0.25,
    url: "https://www.blurb.com/pdf-to-book",
    notes: "Choose PDF to Book, pick the matching size and paper, and use Blurb's book-size calculator to confirm the cover and spine dimensions.",
  },
  {
    id: "prodigi", name: "Prodigi — hardcover photo book", sizes: ["landscape", "square"],
    bleedIn: 0.125, coverWrapIn: 0.125, minPages: 24, pageMultiple: 2, spinePerPageIn: 0.0025, spineBaseIn: 0.25,
    url: "https://www.prodigi.com/products/books-and-magazines/",
    notes: "Prodigi needs an even page count between 24 and 504 and recommends PDF/X-4. Upload the cover as the cover asset and the interior as the default asset.",
  },
  {
    id: "generic", name: "Mixam, local print shop or other", sizes: ["landscape", "landscape11", "square", "square85", "square12", "a4"],
    bleedIn: 0.125, coverWrapIn: 0.125, minPages: 2, pageMultiple: 2, spinePerPageIn: 0.0025, spineBaseIn: 0.1,
    url: "https://mixam.com",
    notes: "Most printers accept a full-bleed interior PDF and a separate wraparound cover. Ask them for the spine width for your page count and paper.",
  },
];

export const DPI = 300;

export function padPageCount(n: number, p: PrintPreset) {
  let total = Math.max(n, p.minPages);
  if (total % p.pageMultiple) total += p.pageMultiple - (total % p.pageMultiple);
  return total;
}

export const estimateSpine = (interiorPages: number, p: PrintPreset) => Math.round((p.spineBaseIn + interiorPages * p.spinePerPageIn) * 1000) / 1000;

export function coverSize(trimW: number, trimH: number, spine: number, wrap: number) {
  return { w: trimW * 2 + spine + wrap * 2, h: trimH + wrap * 2 };
}

/** Draw `img` covering a target rectangle (scaled up and centre-cropped as needed). */
export function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

export async function canvasToJpeg(c: HTMLCanvasElement, q = 0.92): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode page"))), "image/jpeg", q));
  return new Uint8Array(await blob.arrayBuffer());
}

/** Build a PDF where every page is one full-bleed image. Sizes in inches. */
export async function imagesToPdf(pages: { jpeg: Uint8Array; wIn: number; hIn: number }[], title: string) {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator("The Ride Story");
  doc.setProducer("The Ride Story");
  for (const pg of pages) {
    const img = await doc.embedJpg(pg.jpeg);
    const page = doc.addPage([pg.wIn * 72, pg.hIn * 72]);
    page.drawImage(img, { x: 0, y: 0, width: pg.wIn * 72, height: pg.hIn * 72 });
  }
  return doc.save();
}
