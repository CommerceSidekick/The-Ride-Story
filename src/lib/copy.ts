import type { Analysis, Day } from "./analyze";
import type { Tone, Trip } from "./types";
import { fmtDate, fmtDateRange, fmtDist, fmtDuration, fmtEle, fmtSpeed, fmtTime, joinNames } from "./util";

/**
 * Deterministic first-draft copy built only from facts in the trip.
 * Everything here is editable in the book, and the AI writer can replace it.
 */

const GENERIC = /^(morning|afternoon|evening|lunch|night|mountain bike|mtb)?\s*(mountain bike\s*)?(ride|activity)?\s*\d*$/i;

export function dayTitle(day: Day, trip: Trip): string {
  const named = day.groups.map((g) => g.primary.name.trim()).filter((n) => n && !GENERIC.test(n));
  if (named.length) return named.length > 2 ? `${named[0]} & more` : named.join(" + ");
  if (!day.groups.length) return "Off the bike";
  return `${fmtDist(day.stats.distanceKm, trip.units, 0)}, ${fmtEle(day.stats.elevGainM, trip.units)} up`;
}

export function tripDates(a: Analysis) {
  return a.startDate && a.endDate ? fmtDateRange(a.startDate, a.endDate) : "";
}

const pick = <T,>(xs: T[], seed: number) => xs[Math.abs(seed) % xs.length];

export function introText(trip: Trip, a: Analysis, tone: Tone): string {
  const crew = joinNames(trip.crew.map((c) => c.name));
  const where = trip.location || trip.name;
  const t = a.totals;
  const facts = `${t.rideDays} ${t.rideDays === 1 ? "day" : "days"} of riding, ${fmtDist(t.distanceKm, trip.units, 0)} of trail and ${fmtEle(t.elevGainM, trip.units)} of climbing`;
  const open =
    tone === "dry"
      ? `${where}. ${crew ? crew + " went" : "We went"}, bikes survived, mostly.`
      : tone === "poetic"
        ? `Some places you ride through. ${where} is one you carry home.`
        : `${where} delivered. ${crew ? crew + " showed up" : "The crew showed up"} with bikes, questionable fitness and big plans.`;
  const mid = t.outings
    ? tone === "dry"
      ? `The numbers: ${facts}, topping out at ${fmtEle(t.maxEleM, trip.units)}.`
      : `What followed was ${facts}, with a high point of ${fmtEle(t.maxEleM, trip.units)}.`
    : "";
  const close = trip.notes?.trim()
    ? trip.notes.trim()
    : tone === "poetic"
      ? "This is how it went, as best we can remember it."
      : "This book is the proof.";
  return [open, mid, close].filter(Boolean).join(" ");
}

export function dayText(day: Day, trip: Trip, tone: Tone, note?: string): string {
  const s = day.stats;
  const parts: string[] = [];
  if (day.groups.length) {
    const start = day.startLocalMs ? fmtTime(day.startLocalMs) : null;
    const rolled = start
      ? pick([`Wheels rolling at ${start}.`, `Out the door at ${start}.`, `First pedal strokes at ${start}.`], day.index)
      : "";
    const body =
      tone === "dry"
        ? `${fmtDist(s.distanceKm, trip.units)} and ${fmtEle(s.elevGainM, trip.units)} of climbing in ${fmtDuration(s.movingSec)} of moving time. Nobody timed the stops.`
        : tone === "poetic"
          ? `${fmtDist(s.distanceKm, trip.units)} of trail unspooled under the tires, ${fmtEle(s.elevGainM, trip.units)} earned on the way up and ${fmtEle(s.elevLossM, trip.units)} spent on the way down.`
          : `${fmtDist(s.distanceKm, trip.units)} with ${fmtEle(s.elevGainM, trip.units)} of climbing and ${fmtEle(s.elevLossM, trip.units)} of descending, ${fmtDuration(s.movingSec)} in the saddle.`;
    parts.push(rolled, body);
    if (s.maxEleM > 0)
      parts.push(
        tone === "poetic"
          ? `The high point sat at ${fmtEle(s.maxEleM, trip.units)}, where the air thins and the view opens.`
          : `High point: ${fmtEle(s.maxEleM, trip.units)}.${s.maxSpeedKmh > 0 ? ` Top speed: ${fmtSpeed(s.maxSpeedKmh, trip.units)}.` : ""}`,
      );
    const multi = day.groups.find((g) => g.rides.length > 1);
    if (multi) parts.push(`${multi.rides.length} of us recorded it, so there is no arguing about the distance.`);
  } else {
    parts.push(pick(["A day off the bike.", "Rest day. Legs voted, legs won.", "No ride logged today."], day.index));
  }
  const shots = day.media.filter((m) => !m.hidden).length;
  if (shots > 3 && tone !== "dry") parts.push(`${shots} photos say the stops were worth it.`);
  if (note?.trim()) parts.push(note.trim());
  return parts.filter(Boolean).join(" ");
}

export function outroText(trip: Trip, a: Analysis, tone: Tone): string {
  const where = trip.location || trip.name;
  return tone === "dry"
    ? `That was ${where}. Same time next year, with fresher brake pads.`
    : tone === "poetic"
      ? `The dust washes off. ${where} doesn't.`
      : `${where}: done and dusted. Until the next one.`;
}

const tags = (trip: Trip, extra: string) => {
  const loc = (trip.location || "").split(/[,·]/)[0].replace(/[^\p{L}\p{N}]+/gu, "");
  const base = ["mtb", "mountainbiking", loc && `${loc.toLowerCase()}mtb`, loc && loc.toLowerCase()].filter(Boolean) as string[];
  const user = extra.split(/[\s,#]+/).filter(Boolean);
  return [...new Set([...user, ...base])].map((t) => `#${t}`).join(" ");
};

export function tripCaption(trip: Trip, a: Analysis, tone: Tone, hashtags: string, long = false): string {
  const t = a.totals;
  const where = trip.location || trip.name;
  const line1 =
    tone === "dry" ? `${where}. It was fine. (It was incredible.)` : tone === "poetic" ? `${where}, in dust and light.` : `${where} absolutely delivered.`;
  const stats = t.outings
    ? `${t.rideDays} ${t.rideDays === 1 ? "day" : "days"} · ${fmtDist(t.distanceKm, trip.units, 0)} · ${fmtEle(t.elevGainM, trip.units)} up · ${fmtEle(t.elevLossM, trip.units)} down`
    : "";
  const crew = trip.crew.length ? `With ${joinNames(trip.crew.map((c) => c.name))}.` : "";
  const more = long
    ? a.days.filter((d) => d.groups.length).map((d) => `Day ${d.index} — ${dayTitle(d, trip)}: ${fmtDist(d.stats.distanceKm, trip.units)}, ${fmtEle(d.stats.elevGainM, trip.units)} up.`).join("\n")
    : "";
  return [line1, stats, more, crew, "", tags(trip, hashtags)].filter((x, i) => x !== "" || i === 4).join("\n").replace(/\n{3,}/g, "\n\n");
}

export function dayCaption(day: Day, trip: Trip, tone: Tone, hashtags: string): string {
  const head = `Day ${day.index} · ${fmtDate(day.localMs, { weekday: "long", month: "short", day: "numeric" })} — ${dayTitle(day, trip)}`;
  const note = trip.dayNotes?.[day.date];
  return [head, dayText(day, trip, tone, note), "", tags(trip, hashtags)].join("\n");
}
