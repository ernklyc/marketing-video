# Review pass (after every render, before showing the user)

Read `qa/sheet_*.jpg` (2 fps) and 6–10 full-res frames around each transition and each tap (`ffmpeg -ss t -frames:v 1`). Score each item 0–2; anything < 2 gets fixed or explicitly reported.

| # | Check | Fail looks like |
|---|---|---|
| 1 | Hook: claim or product moment readable by 3 s | logo, empty background, slow fade |
| 2 | Every caption fully inside the safe zone and readable at phone size | text under y 1250 / above y 290, < 48 px, over busy UI without plate |
| 3 | Each tap visibly causes something within 0.5 s | button press with no change (add sheet/popup) |
| 4 | No loading, skeleton, blank or frozen screen in a used range | grey cards, spinner, map without tiles |
| 5 | Transitions: none empty/double-exposed, phone never blank, one move at a time | white phone before a blob, two phones overlapping messily |
| 6 | Variety: no two consecutive sections look the same (cam, transition, entrance) | same rise + same statement every section |
| 7 | Story: problem/value → features (input→action→result) → CTA, in the brief's tone | feature list without a point, no CTA |
| 8 | Brand: colours/fonts/logo correct; locale-specific casing and suffixes | wrong glyphs, invented logo |
| 9 | Truth: demo data disclosed, no fake metrics/testimonials, every state reachable in the real app | made-up "10k users" |
| 10 | Audio (structural): LUFS −14 ±1, splices on downbeats, VO not overlapping, music ducked under VO | clipped, VO buried |
| 11 | Motion: 60 fps master, `pops: 0` from qa/frames.py (single-frame jumps), springs settle without wobble, one phone on screen | stutter, a frame that jumps, double phone |
| 12 | Layout: titles single-line, band holds one caption/widget, arrows land on the target, nothing over UI | text on UI, two cards at once |
| 13 | Sound design: every tap/transition/caption has its real SFX on the frame (sfx.wav), nothing doubled with synth ticks | silent taps, late whoosh |
| 14 | Colour: `color: … OK` (decoded master matches the Remotion still, dark pixels not lifted) | grey blacks, shifted brand colour |
| 15 | The film's `brief.banned` list is respected | a crossfade, a glow, a 2 s hold |

Also read `render.sh --bars` (one still per bar) before the final render: something must change on every bar.

Report to the user: the score line ("Review: 19/20 — 1 issue: …"), what you fixed, and what remains a judgement call for them.
