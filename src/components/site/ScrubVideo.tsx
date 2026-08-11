import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { damp } from "#/lib/scroll-store";

/**
 * Scroll-scrubbed product footage (PRD §5.3): the clip must be encoded
 * all-keyframe (I-frame only) so `currentTime` seeks land instantly —
 * a normally-encoded mp4 stutters hard here, that's an asset bug, not a
 * component bug. Scroll maps the element's viewport transit to 0..duration
 * and the actual currentTime chases it with damped lerp so Lenis's smooth
 * scroll reads as smooth footage.
 *
 * Fallback: before metadata arrives (or on tier C / reduced motion) the
 * poster shows and nothing scrubs — the slab is still a real screenshot.
 */
export function ScrubVideo({
  src,
  poster,
  className,
  label,
}: {
  src: string;
  poster?: string;
  className?: string;
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    let target = 0;
    let current = 0;
    let duration = 0;
    let rafId = 0;
    let lastT = performance.now();

    const onMeta = () => {
      duration = video.duration;
    };
    video.addEventListener("loadedmetadata", onMeta);
    if (video.readyState >= 1) onMeta();

    const st = ScrollTrigger.create({
      trigger: video,
      // Full viewport transit: starts scrubbing as the slab enters from the
      // bottom, ends as it leaves the top — the whole pass is footage.
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        target = self.progress;
      },
    });

    const tick = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.1);
      lastT = t;
      if (duration > 0) {
        current = damp(current, target, 8, dt);
        // seekable guard: metadata can arrive before the moov index is usable.
        const time = current * duration;
        if (Math.abs(video.currentTime - time) > 1 / 60) {
          video.currentTime = time;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      st.kill();
      video.removeEventListener("loadedmetadata", onMeta);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      poster={poster}
      muted
      playsInline
      preload="auto"
      aria-label={label}
      // Never a playing video — scrub only. Belt-and-braces against
      // browsers that autoplay muted inline video.
      onPlay={(e) => e.currentTarget.pause()}
    />
  );
}
