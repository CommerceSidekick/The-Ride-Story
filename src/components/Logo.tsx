/**
 * The Ride Story logo, drawn from the supplied artwork as a mask so it takes the current text colour
 * (bone on dark backgrounds, carbon on light ones).
 */
const maskStyle = (src: string, w: number, h: number): React.CSSProperties => ({
  display: "inline-block",
  width: w,
  height: h,
  backgroundColor: "currentColor",
  WebkitMaskImage: `url(${src})`,
  maskImage: `url(${src})`,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  flexShrink: 0,
});

/** The peak mark alone. `size` is its height in px; it is twice as wide as it is tall. */
export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <span role="img" aria-label="The Ride Story" className={className} style={maskStyle("/brand/mark.png", size * 2, size)} />;
}

/** Full lockup: mark + wordmark. `size` is the overall height in px. */
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  const h = Math.round(size * 0.62);
  return <span role="img" aria-label="The Ride Story" className={className} style={maskStyle("/brand/lockup.png", Math.round((h * 1812) / 173), h)} />;
}
