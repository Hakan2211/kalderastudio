import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter } from "#/components/site/SiteFooter";
import { SiteNav } from "#/components/site/SiteNav";

export const Route = createFileRoute("/shop")({
  component: ShopPage,
  head: () => ({
    meta: [
      { title: "Artifacts: the Kaldera shop" },
      {
        name: "description",
        content: "Artifacts from the crater: studio and show merch, cooling now.",
      },
    ],
  }),
});

function ShopPage() {
  return (
    <main id="main" className="relative min-h-screen bg-obsidian text-pumice">
      <SiteNav />
      <section className="px-8 pb-24 pt-40">
        <div className="mx-auto max-w-6xl">
          <p className="u-mono text-ember">The shop</p>
          <h1 className="u-display mt-4 text-6xl md:text-8xl">ARTIFACTS</h1>
          <p className="mt-6 max-w-md text-lg text-pumice/80">
            What comes out of the crater, made solid. Studio and show merch,
            still cooling.
          </p>

          <div className="u-mono mt-12 flex flex-wrap gap-x-8 gap-y-2">
            <span>Status · cooling</span>
            <span>Opens with P6</span>
          </div>

          <div className="u-mono mt-16 border-t border-charcoal pt-6 opacity-60">
            Section under survey. Storefront platform decided before P6.
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
