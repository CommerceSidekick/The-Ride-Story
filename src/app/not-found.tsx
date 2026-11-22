import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="site topo flex flex-1 items-center">
      <div className="topo-layer" aria-hidden />
      <div className="wrap py-24">
        <Link href="/" aria-label="The Ride Story home" className="text-[var(--bone-s)]"><Logo size={30} /></Link>
        <h1 className="x-display mt-16 !text-[clamp(3rem,9vw,7rem)]">Wrong turn.</h1>
        <p className="x-lead x-muted mt-6 max-w-[40ch]">That page isn&apos;t on the map. The trail back is this way.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="s-btn">Back to the start</Link>
          <Link href="/examples/oaxaca" className="s-btn s-btn-ghost">See a real story</Link>
        </div>
      </div>
    </main>
  );
}
