#!/usr/bin/env bash
# P5 Scene 5 — proof strip assets.
# Each shot is the SAME set at three stages of the real pipeline:
#   plate (Krea2, empty set) → board (Qwen-Image-Edit, cast staged) → render (LTX 2.3).
set -e
A="$HOME/Aurea/projects/playground/assets"
OUT="C:/Users/User/kalderastudio/public/media"

img () { # src slug
  ffmpeg -y -loglevel error -i "$A/image/$1.png" \
    -vf "scale=840:-1:flags=lanczos" -q:v 74 "$OUT/proof-$2.webp"
}

vid () { # src slug start
  ffmpeg -y -loglevel error -ss "$3" -t 5 -i "$A/video/$1.mp4" \
    -an -vf "scale=640:-2:flags=lanczos,fps=20" \
    -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 32 -preset slow \
    -movflags +faststart "$OUT/proof-$2.mp4"
  ffmpeg -y -loglevel error -ss "$3" -i "$A/video/$1.mp4" -frames:v 1 \
    -vf "scale=840:-1:flags=lanczos" -q:v 72 "$OUT/proof-$2-poster.webp"
}

# ── Shot 01 · The Coffee Fund (breakroom, three-hander) ──────────────
img "an-empty-office-breakroom-interior-warm-si"      "01-plate"
img "add-one-more-character-to-this-breakroom-sc"     "01-board"
vid "an-office-breakroom-in-warm-late-afternoon-14"   "01-render" 1.0

# ── Shot 02 · The Committee (meeting room, four-hander) ──────────────
img "an-empty-small-office-meeting-room-interior"     "02-plate"
img "the-reference-image-shows-four-characters-i"     "02-board"
vid "a-small-office-meeting-room-in-cool-dayligh"     "02-render" 1.0

# ── Shot 03 · The Loft (five-hander) ─────────────────────────────────
img "an-empty-warm-cluttered-warehouse-loft-inte"     "03-plate"
img "the-first-reference-image-is-a-contact-shee-2"   "03-board"
vid "a-warm-cluttered-warehouse-loft-in-the-even"     "03-render" 1.0

ls -la "$OUT" | grep proof
du -sh "$OUT"
