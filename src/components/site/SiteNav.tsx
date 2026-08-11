import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { KalderaMark } from "#/components/site/KalderaMark";
import { SoundToggle } from "#/components/site/SoundToggle";

// The show and the shop exist but are not released — no episodes yet, nothing
// to sell yet. They come back into the nav when they have something to show.
const LINKS = [
  { to: "/tools", label: "Tools" },
  { to: "/studio", label: "Studio" },
] as const;

/**
 * Shared shell nav (PRD §4 global interactions): wordmark left, links with an
 * ember-dot active indicator. Hides on scroll-down, returns on
 * scroll-up; always visible near the top. Works under Lenis because Lenis
 * drives real window scroll.
 */
export function SiteNav() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 120) setHidden(false);
      else if (Math.abs(y - lastY) > 8) setHidden(y > lastY);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-6 transition-transform duration-500 sm:px-8"
      style={{
        transform: hidden ? "translateY(-110%)" : "translateY(0)",
        transitionTimingFunction: "var(--ease-mass)",
      }}
    >
      {/* Mark + stacked wordmark, per brand Direction 3. The mark carries the
          ember on its own, so the lockup stays monochrome beside it. */}
      <Link to="/" className="group flex items-center gap-2 text-pumice no-underline sm:gap-3">
        <KalderaMark className="h-7 w-7 shrink-0 transition-transform duration-500 group-hover:rotate-[18deg]" />
        <span
          className="flex flex-col leading-[0.86]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
        >
          {/* Tracking eases off on the narrowest phones — the wordmark is the
              one thing here that cannot shrink any other way. */}
          <span className="text-sm tracking-[0.12em] sm:tracking-[0.2em]">KALDERA</span>
          <span className="hidden text-[11px] tracking-[0.34em] opacity-70 sm:block">
            STUDIO
          </span>
        </span>
      </Link>

      <nav className="flex items-center gap-2 sm:gap-7">
        {LINKS.map(({ to, label }) => (
          <Link key={to} to={to} data-magnetic className="group relative u-mono !text-pumice no-underline">
            {({ isActive }) => (
              <>
                <span className={isActive ? "" : "opacity-60 transition-opacity group-hover:opacity-100"}>
                  {label}
                </span>
                <span
                  className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-ember transition-opacity"
                  style={{ opacity: isActive ? 1 : 0 }}
                />
              </>
            )}
          </Link>
        ))}
        {/* Explicit, never autoplayed (PRD §4). Label collapses on narrow
            viewports so the links keep their room — but the switch itself is
            always present: hiding it left phones with a score they could not
            turn off. */}
        <SoundToggle />
      </nav>
    </header>
  );
}
