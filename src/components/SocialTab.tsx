"use client";
import { useRef, useState } from "react";
import { buildSocial, DEFAULT_SOCIAL, FORMATS } from "@/lib/book";
import type { Post, Slide, SocialConfig, SocialSet } from "@/lib/types";
import { cx, slugify } from "@/lib/util";
import { THEMES, TONES } from "./BookTab";
import type { Workspace } from "./CollectTab";
import { PhotoPicker } from "./PhotoPicker";
import { SlideView } from "./SlideView";

export function SocialTab({ ws }: { ws: Workspace }) {
  const { trip, a, updateTrip } = ws;
  const set = trip.social;
  const [config, setConfig] = useState<SocialConfig>(set?.config ?? DEFAULT_SOCIAL);
  const [picker, setPicker] = useState<{ postId: string; slideId: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const hasContent = ws.rides.length + ws.media.length > 0;

  const save = (s: SocialSet) => updateTrip({ social: s });
  const generate = () => {
    if (set && !confirm("Rebuild all posts? Caption edits and photo swaps will be replaced.")) return;
    save(buildSocial(trip, a, config));
  };
  const restyle = (patch: Partial<SocialConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    if (set && ("theme" in patch || "handle" in patch)) save({ ...set, config: { ...set.config, ...patch } });
  };
  const patchPost = (id: string, patch: Partial<Post>) => set && save({ ...set, posts: set.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const patchSlide = (post: Post, slideId: string, patch: Partial<Slide>) => patchPost(post.id, { slides: post.slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s)) });

  const render = async (post: Post, slide: Slide): Promise<Blob> => {
    const node = nodes.current.get(slide.id);
    if (!node) throw new Error("Slide is not on screen");
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(node, { pixelRatio: FORMATS[post.format].w / node.offsetWidth, cacheBust: false });
    if (!blob) throw new Error("Could not render the image");
    return blob;
  };
  const fileName = (post: Post, i: number) => `${slugify(trip.name)}-${slugify(post.label)}-${post.format}-${String(i + 1).padStart(2, "0")}.png`;
  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url; el.download = name; el.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setNote("");
    try { await fn(); } catch (e) { setNote(e instanceof Error ? e.message : "Export failed"); }
    setBusy("");
  };
  const downloadPost = (post: Post) => run(post.id, async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const [i, s] of post.slides.entries()) zip.file(fileName(post, i), await render(post, s));
    zip.file("caption.txt", post.caption);
    download(await zip.generateAsync({ type: "blob" }), `${slugify(trip.name)}-${slugify(post.label)}-${post.format}.zip`);
  });
  const sharePost = (post: Post) => run(post.id, async () => {
    const files: File[] = [];
    for (const [i, s] of post.slides.entries()) files.push(new File([await render(post, s)], fileName(post, i), { type: "image/png" }));
    if (!navigator.canShare?.({ files })) throw new Error("This browser can't share images directly. Use Download instead, then post from your phone.");
    await navigator.clipboard?.writeText(post.caption).catch(() => {});
    await navigator.share({ files, text: post.caption });
  });

  const settings = (
    <div>
      <div className="label">Make</div>
      {([["igCarousel", "Instagram carousels"], ["igStory", "Instagram story set"], ["fbPost", "Facebook album post"], ["perDay", "A carousel for each day"]] as const).map(([k, l]) => (
        <label key={k} className="mt-1.5 flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-[#e8862a]" checked={config[k]} onChange={(e) => setConfig({ ...config, [k]: e.target.checked })} /> {l}
        </label>
      ))}
      <label className="label mt-4 block">Slides per carousel · {config.slidesPerCarousel}</label>
      <input type="range" min={4} max={20} value={config.slidesPerCarousel} onChange={(e) => setConfig({ ...config, slidesPerCarousel: Number(e.target.value) })} className="mt-1 w-full accent-[#e8862a]" />
      <label className="label mt-3 block">Voice</label>
      <div className="mt-1.5 flex gap-1.5">
        {TONES.map((t) => <button key={t.id} onClick={() => setConfig({ ...config, tone: t.id })} className={cx("btn btn-sm flex-1 justify-center", config.tone === t.id ? "btn-dark" : "btn-ghost")}>{t.label}</button>)}
      </div>
      <label className="label mt-4 block">Look</label>
      <div className="mt-1.5 flex gap-2">
        {THEMES.map((t) => (
          <button key={t.id} onClick={() => restyle({ theme: t.id })} className={cx("flex-1 rounded-lg border-2 p-1.5 text-xs font-semibold", config.theme === t.id ? "border-marigold" : "border-transparent")} style={{ background: t.bg, color: t.id === "paper" ? "#1f1c18" : "#f3eee4" }}>{t.label}</button>
        ))}
      </div>
      <label className="label mt-4 block">Your handle (optional)</label>
      <input className="field mt-1" placeholder="@yourcrew" value={config.handle} onChange={(e) => restyle({ handle: e.target.value })} />
      <label className="label mt-3 block">Extra hashtags</label>
      <input className="field mt-1" placeholder="oaxacamtb sierranorte" value={config.hashtags} onChange={(e) => setConfig({ ...config, hashtags: e.target.value })} />
    </div>
  );

  if (!set)
    return (
      <div className="card mx-auto max-w-2xl p-8 text-center">
        <h2 className="font-display text-3xl font-semibold">Build the post set</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-dust">
          {hasContent ? "Pick what you want. We size every image for its platform, write the captions, and you export or share straight from your phone." : "Add photos and ride files in Collect first."}
        </p>
        <div className="mx-auto mt-6 max-w-sm text-left">{settings}</div>
        <button className="btn btn-primary mt-6" disabled={!hasContent} onClick={generate}>Build my posts</button>
      </div>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside>
        <div className="card sticky top-4 p-5">
          <div className="label">Post set</div>
          <div className="mt-1 text-sm text-dust">{set.posts.length} posts · {set.posts.reduce((n, p) => n + p.slides.length, 0)} images</div>
          <div className="mt-4">{settings}</div>
          <button className="btn btn-ghost mt-4 w-full justify-center" onClick={generate}>Rebuild from settings</button>
          <p className="mt-3 text-xs leading-relaxed text-dust">Trailbound makes the images and captions; you post them. On a phone, <b>Share</b> hands the images to Instagram or Facebook and copies the caption.</p>
        </div>
      </aside>
      <div className="min-w-0 space-y-6">
        {note && <p className="rounded-lg bg-clay/10 px-4 py-2 text-sm text-clay">{note}</p>}
        {set.posts.map((post) => {
          const f = FORMATS[post.format];
          return (
            <section key={post.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h3 className="font-display text-xl font-semibold">{post.label}</h3>
                <span className="rounded-full bg-bone-2 px-2.5 py-0.5 text-xs font-semibold">{f.label}</span>
                <span className="font-mono text-xs text-dust">{f.w}×{f.h} · {post.slides.length} images</span>
                <div className="ml-auto flex gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={() => sharePost(post)} disabled={!!busy}>Share</button>
                  <button className="btn btn-dark btn-sm" onClick={() => downloadPost(post)} disabled={!!busy}>{busy === post.id ? "Rendering…" : "Download all"}</button>
                </div>
              </div>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-3">
                {post.slides.map((s, i) => (
                  <div key={s.id} className="shrink-0" style={{ width: post.format === "ig-story" ? 190 : 240 }}>
                    <div ref={(el) => { if (el) nodes.current.set(s.id, el); else nodes.current.delete(s.id); }}>
                      <SlideView
                        slide={s}
                        ctx={{
                          trip, a, theme: set.config.theme, aspect: f.w / f.h, handle: set.config.handle, editable: true,
                          onEdit: (patch) => patchSlide(post, s.id, patch),
                          onPickPhoto: ["cover", "photo", "outro"].includes(s.template) ? () => setPicker({ postId: post.id, slideId: s.id }) : undefined,
                        }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-dust">
                      <span className="font-mono">{i + 1}</span>
                      <button className="ml-auto underline-offset-2 hover:underline" onClick={() => run(s.id, async () => download(await render(post, s), fileName(post, i)))} disabled={!!busy}>{busy === s.id ? "…" : "PNG"}</button>
                      <button className="underline-offset-2 hover:text-clay hover:underline" onClick={() => patchPost(post.id, { slides: post.slides.filter((x) => x.id !== s.id) })}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="label">Caption</span>
                <button className="text-xs font-semibold text-clay hover:underline" onClick={() => navigator.clipboard.writeText(post.caption).then(() => setNote("")).catch(() => setNote("Could not copy — select the text and copy it manually."))}>Copy caption</button>
              </div>
              <textarea className="field mt-1 h-32 resize-y font-mono text-xs leading-relaxed" value={post.caption} onChange={(e) => patchPost(post.id, { caption: e.target.value })} aria-label={`Caption for ${post.label}`} />
            </section>
          );
        })}
      </div>
      {picker && (
        <PhotoPicker
          a={a}
          current={set.posts.find((p) => p.id === picker.postId)?.slides.find((s) => s.id === picker.slideId)?.photoId}
          onClose={() => setPicker(null)}
          onPick={(id) => {
            const post = set.posts.find((p) => p.id === picker.postId);
            if (post) patchSlide(post, picker.slideId, { photoId: id });
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}
