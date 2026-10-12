# Sample

- `storyboard.json` — a complete, valid film: hook → feature with a synced arrow callout → feature entered with a
  flood transition, a clip hold and a widget → outro. It expects a clip named `demo` (any 18 s portrait recording,
  e.g. `tools/import-clip.py <job> demo rec.mp4 --taps "1@50,40:Open; 2.5@30,45:Type; 5@60,50:City; 9@40,60:Date; 11@50,70:Evening; 13@50,30:Apply"`)
  and a logo at `assets/app-icon.png`.
- `capture.json` — a website capture script (`capture/web/record.mjs`): wait, scroll, tap a link, cut the page load.
- `flow.ios.yaml` — a Maestro flow for `capture/flutter/simclip.py` with fixed pauses for callouts.

Try it: copy this folder to `~/promo-videos/sample`, add the clip and logo, then
`node music/synth.mjs ~/promo-videos/sample && node music/sfx.mjs ~/promo-videos/sample && tools/render.sh ~/promo-videos/sample --draft`.
