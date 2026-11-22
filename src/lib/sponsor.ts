/** Sponsor credit. Every link carries UTM tags so Epoch Cycling can see the leads it gets from here. */
export const SPONSOR = {
  name: "Epoch Cycling",
  logo: "/brand/epoch-cycling.png",
  url: (placement: string) =>
    `https://epochcycling.com/?utm_source=theridestory&utm_medium=referral&utm_campaign=sponsor&utm_content=${encodeURIComponent(placement)}`,
};
