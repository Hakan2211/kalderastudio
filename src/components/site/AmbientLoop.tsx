import { useEffect, useRef } from "react";

/**
 * Muted autoplay background loop (PRD §5.3): plays only while on screen —
 * an IntersectionObserver gates play/pause so off-screen video costs no
 * decode. `preload="none"` + poster keeps it out of the initial payload;
 * the first intersection kicks the load.
 */
export function AmbientLoop({
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

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // play() can reject during rapid scroll-past teardown — ignore.
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: "0px 0px 25% 0px" },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
    />
  );
}
