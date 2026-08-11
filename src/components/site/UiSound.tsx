import { useEffect } from "react";
import { tick } from "#/lib/sound";

/**
 * The UI's ticks (PRD §4). Delegated at the document so every current and
 * future `[data-magnetic]` control is wired without touching the control —
 * and so nothing at all happens while sound is off (`tick` is a no-op until
 * the graph is running).
 */
export function UiSound() {
  useEffect(() => {
    let last: Element | null = null;

    const onOver = (e: PointerEvent) => {
      const hit = (e.target as Element | null)?.closest?.("[data-magnetic]") ?? null;
      // Only on entering a new control — moving within one must stay silent.
      if (hit && hit !== last) tick("hover");
      last = hit;
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.("[data-magnetic], a, button")) tick("press");
    };

    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return null;
}
