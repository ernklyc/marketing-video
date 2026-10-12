# Usage & customization

## Starting a film

Type `/marketing-video` and say what you want, in any language:

```text
/marketing-video a 45 s launch film for the booking flow of https://example.com
/marketing-video show every filter in my iOS app's search screen — repo is ~/code/myapp
/marketing-video I recorded the onboarding on my phone (attached) — make a 30 s Reels video
```

Claude will check your setup, ask only what it can't find out on its own, and stop for your approval after each
stage. Everything for a film lives in `~/promo-videos/<name>/`, and finished files are copied to your Desktop.

## What you can customize

You can set all of these in the interview or change them later in plain words, for example "make it calmer",
"no zooms", "use this track", "the arrow should point at the toggle".

| Area | Options |
|---|---|
| **Format** | 9:16 Reels/TikTok/Shorts · App Store preview · web/landing · 4:5 and 1:1 crops · 4K master |
| **Length** | follows the content (default) · ~30 s · ~15 s · 60–90 s brand film · any cutdown later |
| **Pacing** | standard (one feature per section) · calm/premium · fast *focus montage* (a control per beat) |
| **Look** | soft · flood · editorial · keynote — built from your colours, fonts and logo; grain, vignette, handheld drift |
| **Explainers** | callouts with arrows and zoom · callouts without zoom · widgets (stat, ring, badge, list) · titles only |
| **Titles** | language, tone, highlight style (colour or marker), entrance (pop, rise, mask, type) |
| **Transitions** | whip, flip, drop, push, iris, split, carry, flood, hold, cut — or "calm" / "energetic" sets |
| **Banned list** | anything you never want (default: crossfades, bouncy easing, glow on UI text, particles, text over UI, two phones on screen, dead frames) |
| **Music** | Suno prompt (styles: app launch, warm, premium, playful, calm, cinematic) · your own track · generated bed · silent |
| **Sound effects** | on · subtle · off |
| **Voiceover** | ElevenLabs voice · your own recorded lines (auto-aligned) · draft system voice · subtitles only |
| **Demo data** | real data · capture proxy · web injection · seeded staging · static screens · imported recordings |

Your preferences are saved to `~/.config/marketing-video/profile.md` and applied to every future film. You can edit
that file directly too.

## Music with Suno

1. Ask for a Suno prompt; the studio writes Styles, Lyrics (with structure markers sized to the cut) and Exclude
   Styles, using the style that fits your product.
2. Generate 2–4 takes in Suno (Custom mode) and send the best one back.
3. The track is measured (tempo, bars, drop, breaks, ending) and spliced on bars so the drop lands on the first
   feature, breaks on section changes and the final hit on the logo.

Commercial use of Suno output requires a paid Suno plan. Licensed tracks work the same way. Drop the file in the
chat or give its path.

## Demo data

Test accounts usually look empty. The studio picks one of these with you (details in
[`creative/demo-data.md`](../plugins/marketing-video/skills/marketing-video/creative/demo-data.md)):

- **Capture proxy** (apps and web apps): point the app's API base URL at the local proxy. It forwards to staging,
  rewrites responses into fictional demo content, and answers every write call locally.
- **Web injection** (websites): text is replaced inside the recording browser only.
- **Seeded staging**: your own seed script creates demo records on a test server.
- **Static screens / motion graphics**: for things that can't be filmed.

Invented names are obviously fictional, contact data is placeholder, and numbers that could read as claims are marked
"Demo data".

## Revisions and versions

Say what to change in plain words. The studio changes only that, re-renders, and keeps every version in
`out/versions/` so you can compare or go back. For speed it renders a 30 fps draft first, and the 60 fps master once
you approve.

## Variants

```text
make 15 s and 30 s cuts and a fast version
export a 4:5 and a 1:1 crop
make an App Store preview
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| a tool is missing | ask Claude to run the doctor, or run `tools/doctor.sh` yourself |
| the app shows no data / errors while filming | check `proxy/log/` for the calls the app makes; adjust `rules.js` |
| a callout points at the wrong place | tell Claude which second and which control; positions are set per callout |
| the final render is slow | normal: 240 fps subframes. Use drafts while iterating; render the master once |
| colours look washed out in a player | the master is BT.709 tagged; the QA colour check confirms it — try another player |
