# Changelog

## v1.0.0 — first public release

**Studio**
- Interview with modes (new film, revise, music, voice, variants, advise, setup), a persistent user profile in
  `~/.config/marketing-video/`, and gates after every stage.
- `tools/doctor.sh` checks the whole toolchain and prints the exact fix for each missing piece; `setup.sh` installs
  the engine, Playwright and the sound-effect pack.
- `tools/sim-setup.sh` creates a dedicated "Promo iPhone" simulator with a clean status bar and chosen language.

**Capture**
- Websites: frame-by-frame virtual-clock recording (Playwright) with tap logging and in-browser data injection.
- iOS apps: 60 fps Simulator recording driven by Maestro, with tap logging; idle-moment trimming with tap remapping.
- Any device: `tools/import-clip.py` imports screen recordings with tap marks.
- Demo data: a capture proxy (reverse-proxy or header mode) that rewrites API responses into fictional demo
  content and answers every write call locally; a demo-data guide with honesty rules.

**Engine**
- Fixed layout zones (chip, title, caption band, phone stage); optically centred text.
- Callouts with arrows, rings and camera zooms, synced to the app's taps; `clip.holds` pause footage for reading;
  `until` for tap groups; graphic widgets that make room.
- Smooth eased camera with continuous velocity and acceleration; film-clock handheld drift; one phone on screen.
- Transitions: whip, flip, drop, push, iris, split, carry, flood, hold, cut — no crossfades.
- Focus montage for fast cuts (the camera locks onto each control on the beat).
- 240 fps subframe rendering blended to 60 fps for real motion blur; BT.709 output.

**Sound**
- Suno prompt generator with style presets sized to the storyboard.
- Track analysis and bar-consistent splicing (drop, breaks and final hit placed on the cut); generated beds.
- Sound-design layer: real recorded taps, confirms, whooshes, zooms, pops and logo hits, peak-aligned.
- Optional voiceover (ElevenLabs, user-recorded lines with forced alignment, or a draft system voice).

**Examples**
- `examples/orbit`: a fictional habit-tracker app with its capture script and storyboard — reproduces the
  showcase film in the README end to end. `examples/sample`: a minimal storyboard, web capture script and iOS flow.

**QA & delivery**
- Validator for layout, sync, reading time, safe zones, variety and assets; one still per bar for review.
- Automatic frame-pop scan and colour-range check on every render; −14 LUFS master; versioned renders.
- Cutdowns, 4:5 / 1:1 crops and App Store preview export.
