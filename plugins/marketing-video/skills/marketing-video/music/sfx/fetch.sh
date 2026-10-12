#!/bin/bash
# Downloads the curated sound-effect pack listed in pack.tsv (role, Mixkit id, name) into this folder.
# Mixkit Sound Effects Free License: free for commercial and personal projects, no attribution (https://mixkit.co/license/#sfxFree).
# The files are fetched from Mixkit on your machine; this repo does not redistribute them.
cd "$(dirname "$0")"
while IFS=$'\t' read -r role id name; do
  [ -z "$id" ] && continue; f="${role}_${id}"; ls "$f".* >/dev/null 2>&1 && continue
  curl -sfL -o "$f.wav" "https://assets.mixkit.co/active_storage/sfx/$id/$id.wav" || { rm -f "$f.wav"; curl -sfL -o "$f.mp3" "https://assets.mixkit.co/active_storage/sfx/$id/$id-preview.mp3" || echo "could not fetch $id ($name)"; }
done < pack.tsv
echo "sfx pack: $(ls *.wav *.mp3 2>/dev/null | wc -l | tr -d ' ') files"
