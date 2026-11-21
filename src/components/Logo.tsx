/** Mark: an open book whose gutter is a switchback trail climbing to a summit dot. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect width="48" height="48" rx="11" fill="#e8862a" />
      <path d="M8 13.5c5-2 10-2 16 1 6-3 11-3 16-1v22c-5-2-10-2-16 1-6-3-11-3-16-1z" fill="#1b1916" />
      <path d="M14 31.5h13.5a3.2 3.2 0 0 0 0-6.4H20.5a3.2 3.2 0 0 1 0-6.4H31" stroke="#f3eee4" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34.2" cy="18.7" r="2.4" fill="#e8862a" />
    </svg>
  );
}

export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark size={size} />
      <span className="font-display font-semibold tracking-tight" style={{ fontSize: size * 0.74 }}>
        The Ride Story
      </span>
    </span>
  );
}
