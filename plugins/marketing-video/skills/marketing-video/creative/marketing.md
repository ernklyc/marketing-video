# Marketing rules (research digest, Oct 2026 — sources at the bottom)

## Structure & pacing
- **Hook in 0–3 s.** No logo/splash first. Winning hooks: bold specific claim · start mid-action (the product's most impressive moment on frame 1) · the viewer's problem as text · payoff first, then "how".
- Arc: **problem → solution (real UI) → proof → CTA**. Each feature = input → action → visible result. Deliberate taps with tiny pauses (not expert speed).
- Shots ~1–2 s average; hold a key UI moment 2–3 s. ~1 feature per 5–8 s: 15 s = 1 hero feature, 30 s = 3–4. One benefit story beats a feature list.
- Lengths: TikTok ads 15–34 s · Reels 15–30 s · Shorts 20–40 s · LinkedIn ~15 s · App Store 15–30 s · Play: first 30 s autoplay. **Make a 20–30 s master in modular blocks** (hook / feature×3 / proof / CTA) → 15 s (hook + hero + CTA) and 6 s (hook + payoff) via `tools/cutdown.mjs`. Our 50 s films are "brand films"; always offer the 15/30 s cuts.

## Platform specs (1080×1920 master)
- **Safe zone** (union of TikTok/Reels/Shorts UI): text & CTA inside **x 70–930, y 290–1250** (engine `lib/safe.ts`). Footage may run under the UI; words may not.
- Feed crops: 4:5 (1080×1350) for Meta/LinkedIn, 1:1 legacy, 16:9 YouTube/Play → compose so a centre band crop still reads (`deliver.sh --aspect 4:5,1:1`).
- **App Store app preview**: 15–30 s, ≤ 500 MB, 886×1920 (6.1–6.9") or 1080×1920 (5.5"), ≤ 30 fps, H.264 10–12 Mbps, AAC 256k. Captured on device at native UI; text overlays & touch hotspots OK; **no device frames, hands, prices, dates/seasonal refs, unlicensed music**; poster frame at 5 s; IAP/login → disclaimer. Use `format:"appstore"`, `cam:"flat"`, `deliver.sh --appstore`.
- **Google Play**: YouTube URL (public/unlisted, no ads), real app within 10 s, ≥ 80 % in-app footage, Android devices only.

## Text & captions
- Design for sound-on but the story must work **muted** (LinkedIn ~80 % muted; Meta Reels often muted in feed).
- Burned-in captions for every VO line (3–7 words per card, ≤ 22 chars, active word highlighted). Body ≥ 48–60 px, headlines 80–120 px, heavy weight + plate/stroke, ≤ ~900 px wide.
- Reading time ≈ chars ÷ 12 + 0.5 s (validator warns). ≤ 8 words per card; ~3–4 words/s max overall.

## Audio
- VO + captions converts best for explaining; music-only works for Apple-style reveals when text carries the story.
- One continuous track cut on its beats. UI ticks on taps; whooshes only on real motion, **peak on the landing**, vary them; one riser into the main reveal; room tone under VO (dead silence = AI tell).
- VO ~6–10 dB above music (engine ducks music to ~30 % under VO). Master **−14 LUFS, −1 dBTP** (two-pass in render.sh).

## Demo / mock data — truth rules
- Prefer: route interception with real response shapes (`inject`, `proxy.cjs`), seeded faker (`capture/web/mockgen.mjs`, fakerTR, fixed seed), fixed clock (`capture.json "clock"`), or a seeded real demo account (best for App Store).
- Hand-write hero records (first visible rows, owner); generate only the filler.
- Images: Unsplash/Pexels ok commercially but avoid recognisable faces/brands in ads; initials or illustrated avatars are zero-risk.
- **Never** present simulated metrics/testimonials/customers as real (FTC Colgate-Palmolive; ASA 3.11). UI with demo listings is fine; numbers that look like claims get a small "Demo data" super (in the film's language). Every shown state must be reachable in the real app (store + paid ads).

## Motion craft
- Eases: entrances / zoom-ins / camera settles = **ease-out expo** `cubic-bezier(0.16,1,0.3,1)`; on-screen moves = ease-in-out; never linear (except marquees) and never ease-in for entrances. One easing vocabulary per film.
- Timing: UI micro 150–300 ms · emphasis 400–600 ms · titles/CTA 600–1200 ms; stagger siblings 30–60 ms; camera settles 100–150 ms after the UI lands; hold the payoff 0.8–1.5 s.
- Camera: one virtual camera, one move at a time; zoom into the action, whip between screens, hold the payoff; anticipation (pull back 2–4 %) before a big push.
- Focus: dim/blur non-focal UI (6–12 px, 40–60 %), lift the focal card 1.03–1.08 with a soft shadow.
- Touch/cursor: larger than life, smooth Bézier path, press scale ~0.9 for ~100 ms + ripple, short dwell before each tap.
- Amateur/AI tells to avoid: logo intro, slow fades, text in UI dead zones, thin/tiny text, paragraphs, identical easing on everything, everything centred and static, one stock transition repeated, generic music off-tempo, robotic TTS, inconsistent colour, fake UI that doesn't match the app, too many features, taps with no visible result, clipping/quiet audio, no CTA or CTA under platform UI.

## Sources
Apple app previews (developer.apple.com/app-store/app-previews, …/app-preview-specifications) · TikTok Creative Codes (ads.tiktok.com/business/en/creative-codes) · postplanify.com social safe zones 2026 · applaunchflow.com promo video guides · apptamin.com Play promo video · forasoft.com LUFS targets 2026 · FTC endorsement guides / Colgate-Palmolive 380 U.S. 374 · ASA exaggeration · fakerjs.dev localization · playwright mock docs · screen.studio animation guide · trydemotion.com SaaS motion masterclass · remotion.dev docs (skills, captions, motion-blur, effects) · github: remotion-dev/skills, dojocodinglabs/remotion-superpowers, kendoo-rd/claude-product-video, AbubakrChan/product-launch-motion, AKCodez/promo-video-skill, tugrawork-creator/saas-motion-kit · YouTube "Claude Code Can Now Automate Your Videos (Remotion + Opus 5.5)" (Roboverse).
