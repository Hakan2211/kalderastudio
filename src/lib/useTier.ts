import { useEffect, useState } from "react";

let webglChecked: boolean | null = null;

function webglOk(): boolean {
  if (webglChecked !== null) return webglChecked;
  try {
    const c = document.createElement("canvas");
    webglChecked = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglChecked = false;
  }
  return webglChecked;
}

/**
 * Tier C (PRD §5.4): no WebGL or `prefers-reduced-motion` → designed static
 * art, instant content, identical copy and CTAs. SSR and first client render
 * assume tier A; the flag flips once, client-side, before the canvas (which is
 * ClientOnly anyway) would have mounted.
 */
export function useTierC(): boolean {
  const [tierC, setTierC] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !webglOk()) setTierC(true);
  }, []);
  return tierC;
}
