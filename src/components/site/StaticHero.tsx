/**
 * Tier C hero (PRD §5.4): no WebGL / prefers-reduced-motion. Designed static
 * art in CSS only — the obsidian field, a low ember glow where the crater
 * would be, the wordmark as real visible text. Copy and CTAs identical to
 * tier A; no canvas, no Lenis dependency.
 */
export function StaticHero() {
  return (
    <section className="relative flex h-screen flex-col justify-center overflow-hidden px-8">
      {/* The crater glow, abstracted: a low warm horizon line */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[45vh]"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 115%, rgba(255,85,31,0.28) 0%, rgba(140,29,4,0.18) 35%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[28vh] h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 5%, rgba(255,85,31,0.5) 35%, rgba(255,217,160,0.9) 50%, rgba(255,85,31,0.5) 65%, transparent 95%)",
        }}
      />

      <h1
        className="relative text-pumice"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "clamp(3rem, 14vw, 16rem)",
          lineHeight: 0.85,
          letterSpacing: "-0.01em",
        }}
      >
        KALDERA
      </h1>
      <p className="u-mono relative mt-6 !text-pumice">Made on a single GPU.</p>
    </section>
  );
}
