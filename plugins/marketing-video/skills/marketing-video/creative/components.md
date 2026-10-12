# Motion components (use them — UI footage alone looks like a screen recording)

## Layout zones (engine/src/lib/safe.ts → LAYOUT) — nothing crosses a zone
chip 284–354 · title 360–560 (two single lines, fitSize) · **band 590–720** (callout caption or widget) · **stage ≥ 760** (the phone; anything of the phone above the stage line is masked, so zoomed UI never runs under text). Phone rest k 1.24 @ y 1318. All text is optically centred with symmetric margins (`SIDE` = 100); hook block and outro stack are centred vertically around y 860.

## Callouts — point at the UI and say why it matters
`feature.callouts: [{ tap: i | at: beat, x?, y?, text, sub?, icon?, beats?: 5, r?: 46, zoom?: true, arrow?: true, k?: 1.9 }]`
- Caption card centred in the band (icon · `text` · `sub` on its own line) + an **arrow** that draws from the band down to the target and follows the camera + soft ring on the target. Camera pushes in (k≈1.9, half-centres the target horizontally) unless `zoom:false` (use for moving targets like sliders, or near a section end).
- `x/y` override the target. When the tap opens a dropdown/sheet, don't point at the field on the tap — use `at` = tap + ~0.5 s so the ring lands on the closed field showing the chosen value.
- Callouts/widgets end automatically before a moving exit; zooms are clamped to finish 22 frames before it.
- `text` ≤ 3 words, `sub` ≤ ~26 chars. One at a time; ≥ 2.5 s apart when they zoom.

## Widgets — graphic proof cards (motion graphics, not app UI)
`feature.widgets: [{ type, at, beats, side, y, ... }]`
- `stat` — counting number (`from`, `value`, `suffix`, `label`), e.g. 0→12,400 "steps today".
- `ring` — progress ring (`progress` 0–1, `label`).
- `badge` — icon + short label pill (`icon`, `label`), e.g. 🏆 "#37 / 1248".
- `list` — check list (`label`, `items`).
Centred in the band; while one is up the phone sinks (+230 px) and shrinks 10% to free the band. Don't overlap a widget with a callout. Numbers must be true or disclosed demo data.

## Icons / symbols
Outline set in `engine/src/lib/Backdrop.tsx → SYMBOLS`: ball, racket, trophy, calendar, pin, star, bolt, clock, chart, heart, chat, check, plane, map, users, sort, filter. Used by callouts (`icon`), widgets and the background (`brand.world.symbols`). Add brand-relevant paths there.

## Sound design (music/sfx.mjs → sfx.wav)
Real recorded effects (music/sfx/, Mixkit free licence, roles: tap · toggle · confirm · whoosh · zoom · pop · impact) placed from the storyboard exactly as the engine times them, each by its measured peak: taps click on the touch, Apply/Kaydet taps confirm, moving transitions whoosh on the cut, callouts get a zoom swoosh + soft pop, widgets pop, the outro logo hits. One sound per role per film; `sfx.gain`, `sfx.off`, `sfx.pick` tune it. With sfx on, synth tap ticks are off.

## Background (brand.world)
`{ kind: "aurora", colors: [4 brand-ish colours], symbols: [...], rays: true, floor: true }` → animated mesh gradient + floating outline symbols with depth of field + light rays + perspective floor grid. Prefer this over flat backgrounds.

## Highlights
`brand.hlStyle`: `marker` (default — soft accent band wipes in behind the *word*) · `color` · `squiggle` (opt-in only; the user found wavy underlines unnecessary).

## Tap labels
Off by default (a pill repeating the tapped button's text, e.g. "90 dk", reads as noise). Enable per section with `tapLabels: true` only when the tapped thing is tiny or unreadable.
