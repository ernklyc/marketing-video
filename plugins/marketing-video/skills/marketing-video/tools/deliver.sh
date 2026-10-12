#!/bin/bash
# Usage: deliver.sh <jobDir> <outName> [--variant cut15] [--aspect 4:5,1:1] [--appstore]
# After the user approved the cut: copies the render to ~/Desktop/<outName>[-variant].mp4, optional feed crops
# (4:5 = 1080x1350, 1:1 = 1080x1080, centred on the title/phone band), optional App Store preview (886x1920, 30 fps,
# H.264 ~11 Mbps, AAC 256k — only valid if the film obeys Apple's rules: no device frame, real captures, 15–30 s),
# and records the film in ~/.promo-ledger.json so the next film avoids repeating it.
set -e
SK="$(cd "$(dirname "$0")/.." && pwd)"; JOB="$(cd "$1" && pwd)"; NAME="$2"; shift 2
VAR=""; ASPECTS=""; APPSTORE=""
while [ $# -gt 0 ]; do case "$1" in --variant) VAR="$2"; shift 2;; --aspect) ASPECTS="$2"; shift 2;; --appstore) APPSTORE=1; shift;; *) shift;; esac; done
SRC="$JOB/out/final${VAR:+.$VAR}.mp4"; BASE="$HOME/Desktop/$NAME${VAR:+-$VAR}"
cp "$SRC" "$BASE.mp4"; echo "→ $BASE.mp4"
IFS=',' read -ra AS <<< "$ASPECTS"
for a in "${AS[@]}"; do
  case "$a" in
    4:5) ffmpeg -v error -y -i "$SRC" -vf "crop=1080:1350:0:230" -c:v libx264 -crf 17 -preset slow -c:a copy "$BASE-4x5.mp4"; echo "→ $BASE-4x5.mp4";;
    1:1) ffmpeg -v error -y -i "$SRC" -vf "crop=1080:1080:0:300" -c:v libx264 -crf 17 -preset slow -c:a copy "$BASE-1x1.mp4"; echo "→ $BASE-1x1.mp4";;
  esac
done
if [ -n "$APPSTORE" ]; then
  D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC"); echo "app preview duration ${D}s (must be 15–30 s)"
  ffmpeg -v error -y -i "$SRC" -vf "scale=886:1920:force_original_aspect_ratio=increase,crop=886:1920,fps=30" -c:v libx264 -profile:v high -b:v 11M -maxrate 12M -bufsize 22M -pix_fmt yuv420p -c:a aac -b:a 256k -ar 44100 "$BASE-appstore.mp4"; echo "→ $BASE-appstore.mp4"
fi
SB="storyboard${VAR:+.$VAR}.json" node "$SK/qa/validate.mjs" "$JOB" --append | grep -E "ledger" || true
ffprobe -v error -show_entries stream=width,height -show_entries format=duration,size -of compact "$BASE.mp4"
