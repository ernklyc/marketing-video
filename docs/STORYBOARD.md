# Storyboard reference

A film is one JSON file, `storyboard.json`, in its job folder. Time is in **beats** (at `bpm`). Frames are
storyboard frames (`fps`, usually 30); the final master is rendered at 60 fps automatically. A complete example:
[`examples/sample/storyboard.json`](../plugins/marketing-video/skills/marketing-video/examples/sample/storyboard.json).

## Top level

| Field | Type | Notes |
|---|---|---|
| `name` | string | job name |
| `brief` | `{ message, tone, feel, audience?, channel?, banned?[] }` | `banned` lists things the film must never do; the validator prints it |
| `fps`, `bpm` | number | `bpm` of the music; sections are sized in beats |
| `format` | `reels` \| `appstore` | |
| `brand` | object | see below |
| `sections` | array | see below |
| `music` | `{ src, track?, bpm?, grid?, edit?[{at, from}], fadeOut?, mood?, offset?, volume? }` | `track` + `edit` = splice a song on bars (`music/bed.mjs`); `mood` = generated bed (`music/synth.mjs`) |
| `sfx` | `{ src, gain?{role: n}, off?[roles], pick?{role: id}, volume? }` | sound-design layer from `music/sfx.mjs` |
| `vo` | `{ voice?, lines[{at, text, file?}], duck?, captions? }` | optional voiceover (`tools/vo.mjs`) |

## `brand`

| Field | Notes |
|---|---|
| `colors` | `bg, bg2, card, ink, inkSoft, accent, accent2, squiggle, dark, darkInk, shadow, onAccent` (hex) |
| `fonts` | `{ display, serif?, displayWeight? }` — Google Fonts names |
| `logo`, `logoBg` | path in the job folder (official logo only) |
| `look` | `soft` · `flood` · `editorial` · `keynote` |
| `world` | animated background: `{ kind: "aurora", colors[4], symbols[], rays, floor }` |
| `hlStyle` | how `*highlighted*` words look: `color` · `marker` |
| `calloutStyle` | `zoom` (default) |
| `grain`, `vignette`, `handheld` | 0–1 film finish; handheld drift (0 = locked off) |

## Sections

### `hook`
`{ type: "hook", beats, lines: [{ text, size?, serif? }], photos?[] }` — the opening claim; readable within 3 s.
Prefix a word with `*` to highlight it.

### `feature`
One clip (or screenshots) on the phone.

| Field | Notes |
|---|---|
| `beats`, `chip`, `titles[{ at, l1, l2?, entrance? }]` | chip = small section label; titles are two short lines (≤ 20 characters each) |
| `clip` | `{ name, from, rate?, holds?[[clipTime, seconds]] }` — `holds` pause the app footage so a callout can be read |
| `screens[]` | static screenshots instead of a clip: `{ src, at, scroll?[[beat, y]], tr? }` |
| `transition` | how this section enters: `whip` `flip` `drop` `push` `iris` `split` `carry` `flood` `hold` `cut` `statement` |
| `callouts[]` | see below |
| `widgets[]` | `{ type: stat\|ring\|badge\|list, at, beats, label, value?, from?, suffix?, progress?, items?[], icon? }` — shown centred in the caption band; the phone makes room |
| `ledger` | `{ why, surprise, new_component }` — the reasoning the variety audit reads |

**Callouts** — `{ text, sub?, icon?, beats? }` plus *when* and *where*:

| When | Where |
|---|---|
| `tap: i` — on the i-th recorded tap | the tap's position by default |
| `t: seconds` — at that time in the clip | `x`, `y` — point on the 402×874 phone screen |
| `at: beats` — at that beat of the section | |
| `until: j` — stay up through tap j (a group of taps on one control) | |

Options: `zoom: false` (keep the phone at rest, e.g. for a moving slider), `arrow: false`, `k` (zoom factor), `r`
(ring radius). A callout always ends before the app's next tap. Icons: `ball racket trophy calendar pin star bolt
clock chart heart chat check plane map users sort filter`.

### `montage`
Several clips on one phone, switching on the beat.
`{ type: "montage", beats, focus?, transition?, parts: [{ beats, chip, l1, l2?, clip, fx?, fy?, k? }] }` —
`focus: true` makes the camera lock onto each part's tapped control (`fx`/`fy` override the target): the fast cut.

### `wall`
`{ type: "wall", beats, words[] }` — a curtain with 2–4 words on a musical break.

### `outro`
`{ type: "outro", beats, wordmark?, sub?, tagline?, pills?[], cta? }` — logo, wordmark, tagline, store badges, CTA.

## Clips and taps

`clips/manifest.json` maps each clip to `{ dur, taps: [{ t, x, y, label }] }`. Capture tools write it
(`record.mjs`, `simclip.py`, `import-clip.py`); `clipcut.py` trims idle moments and remaps the taps.

## Validation

```bash
node qa/validate.mjs ~/promo-videos/<name>            # or SB=storyboard.cut15.json node qa/validate.mjs …
```

Checks clip lengths, reading time, title length, safe zones, the caption band (one occupant at a time), callout/tap
sync, the hook, the CTA, transition variety, music length and missing files.
