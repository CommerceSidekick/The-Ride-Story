import Anthropic from "@anthropic-ai/sdk";

// Optional AI storyteller. Enabled only when ANTHROPIC_API_KEY is set on the server;
// without it the app keeps its built-in template copy.
export const maxDuration = 120;

type PageIn = { id: string; type: string; kicker?: string; title?: string; draft?: string; facts?: string; note?: string };
type Body = { trip: { name: string; location: string; crew: string[]; notes: string; tone: string }; pages: PageIn[] };

const SYSTEM = `You write the text for a printed photo book about a mountain bike trip, in the voice of the riders ("we").

You get facts per page: numbers taken from GPS files, and notes the riders typed. Write a title and body text for each page.

What matters:
- Every number, name, place and event must come from the facts or notes you were given. Riders will spot an invented crash or a wrong distance instantly, and it ruins the book. If a page has few facts, write less.
- The riders' own notes are the heart of the story. Build the page around them and keep their specifics and their humour.
- Do not recite every statistic; the page already shows a stats table. Pick the one or two numbers that tell the story of the day.
- Titles are short (under 6 words) and specific to that day. Keep an existing title if it is a real trail or ride name.
- Body text is 45 to 85 words for a day or overview page and under 30 words for a back page, because that is the room on the printed page.
- Plain text only, no markdown, no hashtags, no emoji.

The requested tone is given with the trip. "stoked" is warm and energetic, "dry" is deadpan and understated, "poetic" is spare and image-driven. In every tone, sound like a rider talking to friends, not an advert.`;

const SCHEMA = {
  type: "object",
  properties: {
    pages: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, title: { type: "string" }, text: { type: "string" } },
        required: ["id", "title", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["pages"],
  additionalProperties: false,
} as const;

export async function GET() {
  return Response.json({ enabled: Boolean(process.env.ANTHROPIC_API_KEY) });
}

const MAX_BODY = 120_000; // bytes; a 60-page book's facts fit comfortably

/** Only this site's own pages may call the AI writer, so the key can't be used as a free proxy. */
function sameOrigin(req: Request) {
  const host = req.headers.get("host");
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!host || !origin) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "AI writing is not configured on this deployment." }, { status: 501 });
  if (!sameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return Response.json({ error: "Request too large" }, { status: 413 });
  let body: Body;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return Response.json({ error: "Request too large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body?.trip || !Array.isArray(body.pages) || body.pages.length === 0 || body.pages.length > 60)
    return Response.json({ error: "Invalid request" }, { status: 400 });

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: `Write the text for these pages. Return one entry per page id.\n\n${JSON.stringify(body, null, 1)}` }],
    });
    if (response.stop_reason === "refusal") return Response.json({ error: "The AI writer declined this request." }, { status: 422 });
    if (response.stop_reason === "max_tokens") return Response.json({ error: "The story was too long to write in one go. Try fewer pages." }, { status: 422 });
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const parsed = JSON.parse(text) as { pages: { id: string; title: string; text: string }[] };
    const known = new Set(body.pages.map((p) => p.id));
    return Response.json({ pages: parsed.pages.filter((p) => known.has(p.id)) });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return Response.json({ error: "The AI key on this deployment is invalid." }, { status: 502 });
    if (error instanceof Anthropic.RateLimitError) return Response.json({ error: "The AI writer is busy. Try again in a minute." }, { status: 429 });
    if (error instanceof Anthropic.APIError) return Response.json({ error: `AI writer error (${error.status ?? "network"}).` }, { status: 502 });
    return Response.json({ error: "The AI writer returned something unreadable. Try again." }, { status: 502 });
  }
}
