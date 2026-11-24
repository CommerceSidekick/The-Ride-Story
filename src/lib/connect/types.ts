/** Shapes shared by the connection API routes and the browser. */

export type ProviderKind = "rides" | "social";

export type ProviderStatus = {
  id: string;
  name: string;
  kind: ProviderKind;
  configured: boolean;
  connected: boolean;
  account?: string;
  /** Where the rider can post to, e.g. their Facebook Pages. */
  targets?: { id: string; name: string }[];
  /** Short note about what this provider can and can't share. */
  note?: string;
};

export type RideSummary = {
  id: string;
  name: string;
  sport?: string;
  /** ISO 8601, UTC. */
  start: string;
  distanceM?: number;
  movingSec?: number;
};
