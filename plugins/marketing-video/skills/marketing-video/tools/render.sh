#!/bin/bash
# Usage: render.sh <jobDir> [--sb storyboard.cut15.json] [--still f1,f2,...] [--bars] [--draft] [--4k]
#   default  final master: 240 fps subframes blended (tmix) to 60 fps = real motion blur, BT.709 tagged
#   --draft  quick 30 fps render (fake blur), same QA
#   --still  stills sheet at the given frames (storyboard fps); --bars = one still per bar (4 beats)
# Validates + audits, renders, two-pass loudness master (−14 LUFS, −1 dBTP), QA (sheets, pops, colour range),
# and keeps every render as out/versions/<variant>-vN.mp4 with its storyboard snapshot (copy-then-edit history).
set -e
SK="$(cd "$(dirname "$0")/.." && pwd)"; JOB="$(cd "$1" && pwd)"; shift
SBF=storyboard.json; STILL=""; SCALE=1; SUB=8; BARS=0
while [ $# -gt 0 ]; do case "$1" in --sb) SBF="$2"; shift 2;; --still) STILL="$2"; shift 2;; --bars) BARS=1; shift;; --draft) SUB=1; shift;; --4k) SCALE=2; shift;; *) shift;; esac; done
export SB="$SBF"; VAR="$(basename "$SBF" .json | sed 's/^storyboard\.\{0,1\}//')"; VAR="${VAR:-main}"
mkdir -p "$JOB/out/versions" "$JOB/qa"
node "$SK/qa/validate.mjs" "$JOB" || { echo "fix storyboard errors first"; exit 1; }
mkprops() { node -e "
const fs=require('fs'),p=require('path');const j=process.argv[1];
const sb=JSON.parse(fs.readFileSync(p.join(j,process.env.SB)));
const m=p.join(j,'clips/manifest.json'); sb.clips=fs.existsSync(m)?JSON.parse(fs.readFileSync(m)):{};
const vr=process.env.SB.replace(/^storyboard\.?|\.json$/g,''); const v=p.join(j,(vr?'vo.'+vr:'vo')+'/vo.json'); if (sb.vo && fs.existsSync(v)) sb.voData=JSON.parse(fs.readFileSync(v));
sb.sub=+process.argv[2]; fs.writeFileSync(process.argv[3],JSON.stringify(sb));" "$JOB" "$1" "$2"; }
# section starts (s), one frame per bar, total frames, fps — from the storyboard timeline
TL=$(node -e "
const sb=JSON.parse(require('fs').readFileSync(require('path').join(process.argv[1],process.env.SB)));const beat=sb.fps*60/sb.bpm;let a=0;const cuts=[];
for(const s of sb.sections){cuts.push((Math.round(a*beat)/sb.fps).toFixed(3));a+=s.beats;}
const bars=[];for(let b=0;b<a;b+=4)bars.push(Math.round(b*beat)+3);
console.log(cuts.slice(1).join(',')+' '+bars.join(',')+' '+Math.round(a*beat)+' '+sb.fps);" "$JOB")
CUTS=$(echo $TL | cut -d' ' -f1); BARF=$(echo $TL | cut -d' ' -f2); TOTALF=$(echo $TL | cut -d' ' -f3); FPS=$(echo $TL | cut -d' ' -f4)
[ "$BARS" = 1 ] && STILL="$BARF"
NAME="$(basename "$JOB")"; PUB="$SK/engine/.cache/$NAME/public"; BUN="$SK/engine/.cache/$NAME/bundle"
rm -rf "$PUB"; mkdir -p "$PUB"
for e in "$JOB"/*; do b="$(basename "$e")"; case "$b" in out|qa|versions|capture.json|storyboard*.json) ;; *) if [ -d "$e" ]; then ln -s "$e" "$PUB/$b"; else cp "$e" "$PUB/$b"; fi ;; esac; done
cd "$SK/engine"
npx remotion bundle src/index.ts --out-dir="$BUN" --public-dir="$PUB" --log=error >/dev/null
mkprops 1 "$JOB/out/props1.json"
if [ -n "$STILL" ]; then
  IFS=',' read -ra FR <<< "$STILL"; files=(); n=${#FR[@]}
  if [ $n -gt 12 ]; then SC=0.25; TW=270; TH=480; COLS=8; else SC=0.4; TW=432; TH=768; COLS=4; fi
  for f in "${FR[@]}"; do npx remotion still "$BUN" Promo "$JOB/qa/st_$f.png" --frame=$f --scale=$SC --props="$JOB/out/props1.json" --log=error & files+=("$JOB/qa/st_$f.png"); while [ $(jobs -r | wc -l) -ge 6 ]; do sleep 0.3; done; done; wait
  args=(); for x in "${files[@]}"; do args+=(-i "$x"); done
  layout=""; for ((i=0;i<n;i++)); do layout+="${layout:+|}$(( (i%COLS)*TW ))_$(( (i/COLS)*TH ))"; done
  ffmpeg -v error -y "${args[@]}" -filter_complex "xstack=inputs=$n:layout=$layout:fill=black" "$JOB/qa/stills.jpg"; rm -f "${files[@]}"
  rm -rf "$SK/engine/.cache/$NAME"; echo "$JOB/qa/stills.jpg"; exit 0
fi
OUT="$JOB/out/final${VAR:+.$VAR}.mp4"; [ "$VAR" = "main" ] && OUT="$JOB/out/final.mp4"
mkprops $SUB "$JOB/out/props.json"
npx remotion render "$BUN" Promo "$JOB/out/raw.mp4" --props="$JOB/out/props.json" --codec=h264 --crf=$([ $SUB -gt 1 ] && echo 12 || echo 16) --color-space=bt709 --audio-bitrate=320k --scale=$SCALE --log=error
M=$(ffmpeg -hide_banner -i "$JOB/out/raw.mp4" -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi=$(echo "$M" | python3 -c "import json,sys;j=json.load(sys.stdin);print(f\"measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}\")")
TAG=(-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv)
if [ $SUB -gt 1 ]; then
  # 8 subframes per 30 fps frame; average 4 (half of each 1/60 s ≈ 180° shutter), keep every 4th → 60 fps with real motion blur
  ffmpeg -loglevel error -y -i "$JOB/out/raw.mp4" -vf "tmix=frames=4,fps=$((FPS*2)),format=yuv420p" -c:v libx264 -crf 15 -preset slow -profile:v high "${TAG[@]}" -movflags +faststart \
    -af "loudnorm=I=-14:TP=-1:LRA=11:$mi:linear=true" -c:a aac -b:a 320k -ar 48000 "$OUT"
else
  ffmpeg -loglevel error -y -i "$JOB/out/raw.mp4" -c:v copy -af "loudnorm=I=-14:TP=-1:LRA=11:$mi:linear=true" -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$OUT"
fi
N=$(ls "$JOB/out/versions" | grep -c "^$VAR-v.*\.mp4$" || true); N=$((N+1))
cp "$OUT" "$JOB/out/versions/$VAR-v$N.mp4"; cp "$JOB/$SBF" "$JOB/out/versions/$VAR-v$N.json"
python3 "$SK/qa/check.py" "$JOB" "$OUT"
python3 "$SK/qa/frames.py" pops "$OUT" "$CUTS" || true
CF=$((TOTALF - 45)); npx remotion still "$BUN" Promo "$JOB/qa/color_ref.png" --frame=$CF --props="$JOB/out/props1.json" --log=error
python3 "$SK/qa/frames.py" color "$OUT" "$JOB/qa/color_ref.png" "$(python3 -c "print($CF/$FPS)")" || true
LUFS=$(ffmpeg -hide_banner -i "$OUT" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
echo "done: $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s, $(ffprobe -v error -select_streams v -show_entries stream=r_frame_rate -of csv=p=0 "$OUT") fps, ${LUFS} LUFS) · saved as versions/$VAR-v$N"
rm -rf "$SK/engine/.cache/$NAME" "$JOB/out/raw.mp4"
