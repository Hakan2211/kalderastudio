import { Link } from "@tanstack/react-router";
import { CoolingEmbers } from "#/components/site/CoolingEmbers";
import { KalderaMark } from "#/components/site/KalderaMark";

/**
 * Scene 6 — COOLING (PRD §4). The two doors restated huge, then the footer
 * proper: nav, docs, socials, and the end-card line played straight.
 *
 * The cooling itself is DOM-side by the P2 structural decision (the caldera
 * canvas is held at its throat frame far above, behind opaque sections): a
 * dying ember horizon along the bottom edge and a settling particle field,
 * which is what the camera pull-back was there to show. Idle ten seconds and
 * one last ember flares — the easter egg lives in `CoolingEmbers`.
 */
export function SiteFooter() {
  return (
    <footer className="relative z-20 overflow-hidden border-t border-charcoal bg-obsidian px-8 pb-10 pt-24 md:pt-32">
      {/* The last of the heat, banked along the floor of the page. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 100% at 50% 118%, rgba(255,85,31,0.16) 0%, rgba(140,29,4,0.09) 38%, transparent 70%)",
        }}
      />
      <CoolingEmbers />

      {/* The two doors, restated */}
      <div className="relative mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
        <Link
          to="/tools"
          data-magnetic
          className="group border border-charcoal px-8 py-14 text-pumice no-underline transition-colors hover:border-ember"
        >
          <span className="u-mono text-ember">Door one</span>
          <div
            className="mt-3 text-4xl md:text-5xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 900, lineHeight: 0.9 }}
          >
            THE TOOLS
          </div>
          <div className="u-mono mt-4 opacity-60 transition-opacity group-hover:opacity-100">
            Aurea · Cinevido → /tools
          </div>
        </Link>
        <Link
          to="/studio"
          data-magnetic
          className="group border border-charcoal px-8 py-14 text-pumice no-underline transition-colors hover:border-ember"
        >
          <span className="u-mono text-ember">Door two</span>
          <div
            className="mt-3 text-4xl md:text-5xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 900, lineHeight: 0.9 }}
          >
            THE STUDIO
          </div>
          <div className="u-mono mt-4 opacity-60 transition-opacity group-hover:opacity-100">
            Who we are · the method → /studio
          </div>
        </Link>
      </div>

      {/* Footer proper */}
      <div className="relative mx-auto mt-20 flex max-w-6xl flex-col gap-6 border-t border-charcoal pt-8 md:flex-row md:items-end md:justify-between">
        <div className="u-mono flex flex-wrap items-center gap-x-7 gap-y-3">
          {/* The mark signs off the page — the one place it appears at rest. */}
          <KalderaMark className="h-6 w-6 shrink-0 text-pumice/70" title="Kaldera Studio" />
          <Link to="/tools" data-magnetic className="!text-pumice no-underline opacity-60 hover:opacity-100">Tools</Link>
          <Link to="/studio" data-magnetic className="!text-pumice no-underline opacity-60 hover:opacity-100">Studio</Link>
          {/* Unreleased — listed, not linked. It lights up when it ships. The
              show is not named anywhere on the site until it releases. */}
          <span className="opacity-40">Shop · soon</span>
        </div>
        <div className="u-mono text-left md:text-right">
          <div>© Kaldera. A Kaldera Production.</div>
          <div className="mt-1 opacity-50">Tools and films, made in the crater</div>
        </div>
      </div>
    </footer>
  );
}
