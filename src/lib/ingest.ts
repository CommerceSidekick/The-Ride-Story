"use client";
import { computeStats, downsample } from "./geo";
import { ingestPhoto, ingestVideo, isPhotoFile, isVideoFile } from "./images";
import { isTrackFile, parseTrackFile } from "./parse";
import { store } from "./store";
import type { Media, Ride, Trip } from "./types";
import { uid } from "./util";

export type ImportResult = { rides: Ride[]; media: Media[]; errors: string[] };

export async function importFiles(
  trip: Trip,
  riderId: string,
  files: File[],
  onProgress: (done: number, total: number, label: string) => void,
): Promise<ImportResult> {
  const out: ImportResult = { rides: [], media: [], errors: [] };
  let done = 0;
  for (const file of files) {
    onProgress(done, files.length, file.name);
    try {
      if (isTrackFile(file.name)) {
        const t = await parseTrackFile(file);
        const ride: Ride = {
          id: uid(), tripId: trip.id, riderId, name: t.name, source: t.source, fileName: file.name,
          startUtc: t.points[0][3] ? t.points[0][3] * 1000 : 0,
          stats: computeStats(t.points),
          points: downsample(t.points),
        };
        await store.addRide(ride);
        out.rides.push(ride);
      } else if (isPhotoFile(file) || isVideoFile(file)) {
        const ing = isVideoFile(file) ? await ingestVideo(file) : await ingestPhoto(file);
        const row = { ...ing.meta, id: uid(), tripId: trip.id, riderId, starred: false, hidden: false };
        out.media.push(await store.addMedia(row, { display: ing.display, thumb: ing.thumb, video: ing.video }));
      } else {
        out.errors.push(`${file.name}: not a photo, video, or GPX/FIT/TCX ride file`);
      }
    } catch (e) {
      out.errors.push(`${file.name}: ${e instanceof Error ? e.message : "could not be read"}`);
    }
    done++;
  }
  onProgress(done, files.length, "");
  return out;
}

/** Rough timezone from longitude; good enough to put photos on the right part of a ride. */
export const offsetFromLon = (lon: number) => Math.round(lon / 15) * 60;
