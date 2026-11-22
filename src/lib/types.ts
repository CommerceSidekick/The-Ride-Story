export type Units = "metric" | "imperial";

export type Rider = { id: string; name: string; color: string };

/** [lat, lon, elevation m, epoch seconds (0 when the file has no timestamps)] */
export type TrackPoint = [number, number, number, number];

export type RideStats = {
  distanceKm: number;
  elevGainM: number;
  elevLossM: number;
  movingSec: number;
  elapsedSec: number;
  maxEleM: number;
  minEleM: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
};

export type Ride = {
  id: string;
  tripId: string;
  riderId: string;
  name: string;
  source: "gpx" | "tcx" | "fit" | "sample";
  fileName?: string;
  startUtc: number; // ms, 0 when unknown
  points: TrackPoint[];
  stats: RideStats;
};

export type Media = {
  id: string;
  tripId: string;
  riderId: string;
  kind: "photo" | "video";
  name: string;
  /** Wall-clock capture time encoded as if it were UTC (from EXIF, which has no zone). */
  takenLocalMs?: number;
  /** True UTC capture time, when the source gives one (EXIF offset tag, video file time). */
  takenUtcMs?: number;
  lat?: number;
  lon?: number;
  w: number;
  h: number;
  durationSec?: number;
  videoExt?: string;
  starred: boolean;
  hidden: boolean;
  caption?: string;
  /** Made by the app (e.g. a 3D map render), not uploaded by a rider. */
  generated?: "map3d";
  /** Resolved at load time by the store. */
  url: string;
  thumbUrl: string;
  videoUrl?: string;
};

export type BookTheme = "loam" | "paper" | "agave";
export type BookSize = "landscape" | "landscape11" | "square" | "square85" | "square12" | "a4";

export type PageType = "cover" | "overview" | "crew" | "day" | "photos" | "story" | "numbers" | "back";

export type BookPage = {
  id: string;
  type: PageType;
  date?: string; // day key for day/photos/story pages
  photoIds: string[];
  title?: string;
  kicker?: string;
  text?: string;
};

export type BookConfig = {
  theme: BookTheme;
  size: BookSize;
  photosPerDay: number;
  includeCrew: boolean;
  includeNumbers: boolean;
  tone: Tone;
};

export type Book = { config: BookConfig; pages: BookPage[]; generatedAt: number };

export type Tone = "stoked" | "dry" | "poetic";

export type PostFormat = "ig-carousel" | "ig-story" | "fb-post";

export type SlideTemplate = "cover" | "photo" | "map" | "stats" | "quote" | "outro";

export type Slide = {
  id: string;
  template: SlideTemplate;
  photoId?: string;
  date?: string;
  kicker?: string;
  title?: string;
  text?: string;
};

export type Post = {
  id: string;
  format: PostFormat;
  label: string;
  date?: string;
  caption: string;
  slides: Slide[];
};

export type SocialConfig = {
  igCarousel: boolean;
  igStory: boolean;
  fbPost: boolean;
  perDay: boolean;
  slidesPerCarousel: number;
  tone: Tone;
  theme: BookTheme;
  hashtags: string;
  handle: string;
};

export type SocialSet = { config: SocialConfig; posts: Post[]; generatedAt: number };

export type Trip = {
  id: string;
  name: string;
  location: string;
  utcOffsetMin: number;
  units: Units;
  crew: Rider[];
  notes: string;
  dayNotes: Record<string, string>;
  book?: Book;
  social?: SocialSet;
  inviteCode: string;
  publishedSlug?: string | null;
  sample?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type TripBundle = { trip: Trip; rides: Ride[]; media: Media[] };
