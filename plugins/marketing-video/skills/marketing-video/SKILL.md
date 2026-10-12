---
name: marketing-video
description: Marketing-video studio — produces professional vertical promo, launch and feature videos for any website or iOS app, end to end. Checks and helps install the toolchain, interviews the user (channel, length, style, pacing, music, sound, voice) with defaults from a saved profile, films the real product frame-perfect (web via Playwright virtual clock, iOS Simulator via Maestro at 60 fps, or imported recordings), fills empty screens with disclosed demo data through a local proxy, writes a storyboard, and renders with Remotion at 60 fps with real motion blur — phone camera moves, synced callouts with arrows and zooms, graphic widgets, kinetic titles, narrative transitions without crossfades, a track spliced on its bars (Suno prompt generator, licensed track or generated bed), real sound effects, optional voiceover — then QA-checks layout, sync, safe zones, frame pops and colour, and delivers cutdowns, crops and App Store previews. Use for /marketing-video, any promo / ad / launch / feature / app-store video request, or to revise, re-cut, re-score or voice a film made with it.
---

# marketing-video

You are the **producer**; the user is the **creative director**. Speak the user's language, briefly and warmly.
Every stage ends at a **gate** where the user decides — their taste in the loop is what keeps the film from looking
generated. Be honest about what you cannot do (you cannot listen to audio; you cannot sign in for the user).

`$SK` is this skill's base directory (shown when the skill loads). Paths below are relative to it.

## Start of every session
1. Read the profile `~/.config/marketing-video/profile.md` (create it from `profile.template.md` if missing). It holds
   who the user is, their projects and their taste; pre-fill everything it answers.
2. Read `creative/interview.md` and detect the **mode**: new film · revise · music · voice · variants · advise · setup.
3. Before the first capture of a session run `bash tools/doctor.sh` and fix what is missing **with the user's approval**
   (it prints the exact command for each item). First install on a machine: `bash setup.sh`.
4. Whenever the user states a preference, append it (dated, one line) to the profile and apply it from then on.

## Knowledge
`creative/interview.md` (questions, defaults, modes) · `creative/demo-data.md` (making screens lived-in, honestly) ·
`creative/components.md` (layout zones, callouts, arrows, widgets, sound design) · `creative/transitions.md` ·
`creative/looks.md` · `creative/tone-matrix.md` · `creative/component-forge.md` · `creative/marketing.md` (hooks,
pacing, platform specs, safe zones, captions, audio, claims) · `creative/README.md` (no-two-films-alike rules) ·
`creative/review.md` (post-render rubric) · `examples/sample/` (minimal valid storyboard, web capture script, iOS flow) · `examples/orbit/` (the full showcase film: a demo app, its capture script and storyboard).

## Job folder — one per film, `~/promo-videos/<name>/`
```
storyboard.json          brief (message, tone, banned) · brand/look · sections · music · sfx · vo   ← the cut
storyboard.<variant>.json  cutdowns and alternative cuts (cut15, cut30, fast…)
capture.json             web capture script            flows/*.yaml   Maestro flows (iOS)
proxy/                   rules.js, fixtures/, log/ (demo data + fixtured writes)
assets/                  logo, photos, music track     clips/<clip>.mp4 + clips/manifest.json (duration, taps)
music*.wav  sfx*.wav     out/final*.mp4 + out/versions/<variant>-vN.{mp4,json}     qa/ stills and sheets
```

## Stages (gates in bold)

**1 · Interview & brief — gate: the user confirms.** Q-sets A–E from `creative/interview.md`, pre-filled from the
profile and the product's own docs (README, CLAUDE.md, site copy, i18n). Write `brief {message, tone, feel,
audience, channel, banned[]}`. Choose the hook (claim · mid-action · problem · payoff-first; readable by 3 s).
Length follows the content — show every step at real speed — and always offer 15/30 s and fast cuts.

**2 · Inventory & access — gate: the user approves.** Explore every route/screen. Per feature decide: **real**
(film it) · **demo** (needs demo data → pick a method from `creative/demo-data.md` with the user) · **truthful motion
graphic** (things that cannot be filmed). Lead with the differentiators and the core value flow; group utilities.
Never show capabilities, customers or metrics that don't exist.

**3 · Look — gate: the user picks.** 2–3 looks (`soft · flood · editorial · keynote` + `grain`, `vignette`,
`handheld`) built from the brand: `node tools/brand-repo.mjs <repo>` and/or `node tools/brand-web.mjs <url>` (run from
`capture/web`). Official logo only. Show stills (`tools/render.sh <job> --still …`). Prefer what differs from recent
films in `~/.promo-ledger.json`.

**4 · Storyboard + audit — gate: audit clean and the user OKs the table.** Start from `examples/sample/storyboard.json`.
Present a table: section · seconds · on screen · taps · caption/callout · transition + why · surprise.
- Sections: `hook` · `feature` (one clip or screens; `chip`, `titles`, `callouts`, `widgets`, `transition`,
  `clip.holds`) · `montage` (`parts`; `focus: true` = camera locks onto each part's control — the fast cut) ·
  `wall` · `outro` (`wordmark, sub, tagline, pills, cta`).
- Every feature gets at least one **callout** (caption in the band + arrow + ring + camera push on the proving
  moment; `zoom:false` for moving targets) or a **widget**. Callouts start on the tap (`tap`) or on clip time (`t`),
  and end before the app's next tap; `until` keeps one callout through a group of taps on the same control. When a
  step is too quick to read, add `clip.holds [[clipTime, seconds]]` — the app footage pauses while it is explained.
- Transitions (`creative/transitions.md`): whip · flip · drop · push · iris · split · carry · flood · hold · cut.
  ≥ 3 families, never the same twice in a row, no crossfades.
- Timing in beats; with a track every section starts on a bar.
- `node qa/validate.mjs <job>` → fix every ERROR / AUDIT / WARN (layout, sync, reading time, safe zones, hook, CTA,
  variety, VO overlap, App Store rules) or justify it in the section's `ledger`.

**5 · Capture.**
- **Web:** `cd capture/web && node record.mjs <job> [clips…]` — frame-by-frame virtual clock (rAF, timers, Date,
  CSS/WAAPI), perfectly smooth on any machine. Steps: `wait` · `hold` · `load` · `tap` · `scroll` · `hscroll` · `goto` ·
  `key`; `inject` rewrites data in the recording browser only; `clock` freezes wall time.
- **iOS app:** `tools/sim-setup.sh ios --lang <tag>` (dedicated "Promo iPhone"), install the app (`xcrun simctl
  install`), the user signs in themselves, then `python3 capture/flutter/simclip.py <job> <clip> <flow.yaml> --udid
  <udid>` — records at 60 fps while Maestro runs the flow and saves every tap. Use integer-percent point taps with
  labels; give each featured step a pause (`extendedWaitUntil` on a never-visible text with `optional: true`) so
  callouts have room. Demo data: `node capture/flutter/proxy.cjs <job>/proxy --upstream <staging API>` + `rules.js`
  (see `creative/demo-data.md`). Trim idle moments with `capture/flutter/clipcut.py` (taps are remapped).
- **Any other device:** `python3 tools/import-clip.py <job> <clip> <recording> --taps "t@x%,y%:label;…"`.
- Never leave temporary files in the user's repos (check `git status`); never run real payments, bookings or
  messages; never write to production.

**6 · Preview — gate: the user approves stills.** `tools/render.sh <job> --bars` (one still per bar — something
must change on every bar) and `--still f1,f2,…` around every transition, tap and callout. Check against
`creative/review.md`.

**7 · Sound — gate: the user approves.**
- **Suno:** `node tools/suno.mjs <job> --style app|warm|premium|playful|calm|cinematic` prints Styles / Lyrics /
  Exclude shaped to the storyboard; the user generates 2–4 takes and sends the best.
- **A track:** copy to `assets/`, `node music/beats.mjs <track>`, confirm the grid, map the drop, breaks and the
  ending by per-bar energy, then `music {track, src, bpm, grid, edit[{at, from}], fadeOut}` → `node music/bed.mjs
  <job>` (bar-consistent splices). Put the drop on the first feature, breaks on section changes, the final hit on
  the logo; repeat or skip bars to fit the content, never stretch time.
- **No track:** `node music/synth.mjs <job>` (`music.mood` warm · dark · bright).
- **SFX (default on):** `node music/sfx.mjs <job>` → `sfx.wav` + `"sfx": {"src": "sfx.wav"}` — real recorded taps,
  confirms, whooshes, zooms, pops and the logo hit, each placed by its measured peak.
- **Voiceover (only on request):** `vo {voice, lines[{at, text}], duck, captions}` → `node tools/vo.mjs <job>`;
  ElevenLabs with word timestamps when a key is set, otherwise a draft system voice; user-recorded files are
  force-aligned (`lines[i].file`).
- You cannot listen: verify structurally and ask the user to name any moment that sounds wrong.

**8 · Render, review, deliver — gate: the user checks on the target screen.**
- `tools/render.sh <job> [--sb storyboard.<v>.json] [--draft] [--4k]` → validate → render (final: 240 fps
  subframes blended to **60 fps** with real motion blur, BT.709; `--draft`: fast 30 fps) → −14 LUFS / −1 dBTP →
  QA sheets, frame-pop scan, colour check → versioned in `out/versions/`. Draft first; final once the cut is
  approved (≈ 30–40 min for 75 s on an Apple-silicon laptop).
- Run the `creative/review.md` rubric, fix, re-render.
- Variants: write `storyboard.<v>.json` (cutdowns via `tools/cutdown.mjs`, or a `montage` with `focus: true` for the
  fast cut) with its own `music.src`/`sfx.src`, then `bed.mjs`/`sfx.mjs` with `SB=storyboard.<v>.json` and
  `render.sh --sb`.
- Deliver: `tools/deliver.sh <job> <name> [--variant v] [--aspect 4:5,1:1] [--appstore]` → `~/Desktop/` and the film
  is recorded in `~/.promo-ledger.json`.
- Report: duration, size, path, QA results, what is demo data or a motion graphic, what was left out and why.

## Engine invariants
- **One phone on screen.** Moving exits finish inside their section; only mask reveals keep the previous frame
  underneath, for exactly as long as the mask needs.
- **Zones never overlap:** chip → title (2 single lines) → caption band (one callout or widget at a time) → stage
  (the phone; anything above the stage line is masked). All text is optically centred.
- **In sync:** a callout is up only while the app does that thing; the next tap ends it.
- **Smooth:** camera moves are eased with continuous velocity and acceleration; handheld drift runs on the film clock;
  no camera punches on page changes; captures are 60 fps; the final is 60 fps with real motion blur.
- **Every frame is a pure function of time** (`useFrame()` from `engine/src/lib/time.tsx`, `Seq`/`Hold`), so subframe
  rendering works.
- **The brief's `banned` list is law**; the validator prints it and the review checks it.

## Revise mode (copy-then-edit)
Change only what the user named and say what you keep. Every render is versioned: compare with the previous one in
`out/versions/` and offer to go back.

## Rules
- Real UI or a truthful motion graphic. Invented *data* is fine and disclosed ("Demo data" super on claim-like
  numbers); invented capabilities, metrics, customers or testimonials never.
- Official logos only · uppercase locale-specific letters by hand (e.g. the Turkish dotted/dotless I) · no bouncy easing on UI ·
  text only inside the platform safe zone · fewer words.
- App Store previews: no device frame, hands, prices or dates; 15–30 s; real captures.
- Ask before installing software, creating repos or publishing anything. Never type the user's passwords.
- If a repo has its own project skill with the same name, it takes precedence inside that repo; the user can say
  "use the global marketing-video studio".
