# Interview — ask little, ask well

Read the profile (`~/.config/marketing-video/profile.md`) first and **pre-fill every answer you already know**
(product, path/URL, brand, taste, music source, past feedback). Ask only what is missing, in the user's language,
with AskUserQuestion (2–4 options each, the recommended one first and marked "(Recommended)"). Never ask what the
code, the site or the profile already answers. One round is ideal; never more than three. After the answers,
restate the plan in 3–5 lines and continue.

## Detect the mode

| The user says… | Mode | Next |
|---|---|---|
| "make a promo/launch/ad video for…", "/marketing-video", attaches a URL or repo | **new film** | doctor → Q-sets A → B → C → D → E (skip what's known) |
| "change…", "the text should…", "remove that scene", "faster", "transitions feel jumpy" | **revise** | copy-then-edit; change only what was named |
| "music", "Suno", attaches mp3/wav | **music** | Q-set D |
| "voiceover", "narration", "subtitles" | **voice** | Q-set V |
| "15 s version", "short for Reels", "square/4:5", "App Store preview" | **variants** | Q-set E |
| "what themes are there", "ideas?", "how could it be better" | **advise** | 2–3 concrete directions with stills, no render |
| "set it up", "it doesn't work", missing tools | **setup** | run `tools/doctor.sh`, explain each missing item, offer to install (ask before every install) |

## Setup check (always before the first capture)
Run `bash $SK/tools/doctor.sh` (`web`, `ios` or `all`). For each ✗, explain in one line what it is for and offer
to run the printed fix — **ask before installing anything**; system-level installs (Xcode, Homebrew, Java) are the
user's to approve. If there is no simulator, `tools/sim-setup.sh ios --lang <tag>` creates a dedicated
"Promo iPhone" so the user's own simulators are never touched.

## Q-set A — the film
1. **Where will it play?** Reels/TikTok/Shorts 9:16 (Recommended) · App Store preview · Landing page / web · All (master + cutdowns)
2. **Length:** follow the content (Recommended: every step at real speed, typically 35–60 s, plus 15/30 s cutdowns) · ~30 s · ~15 s · 60–90 s brand film
3. **Message:** draft one sentence from the product docs and ask to confirm — "I want to say ___ in a ___ tone, so the viewer feels ___."
4. **Must show / must not show** (free text, in chat)

## Q-set B — access to the product
1. **What do we film?** Live website (URL) · iOS app in the Simulator (repo or .app build) · Recordings you send from any device · Screenshots / design files
2. **Sign-in:** Public, no login · Test account (the user signs in on the capture device; never type their password) · Only the user can access it
3. **Content:** Real data looks good (Recommended if true) · Needs demo data → offer the methods in `creative/demo-data.md` (proxy, injection, seeded staging, static screens) and recommend one
4. **Server:** Staging/test (Recommended) · Production, read-only (every write call fixtured; no payments, bookings or messages)

## Q-set C — style (show stills before rendering)
1. **Look:** 2–3 options from `creative/looks.md`, built from the brand colours, fonts and logo found in the code or site
2. **Pacing:** Standard (Recommended: one feature per section, callouts with arrows and zooms) · Calm/premium (fewer moves, longer holds) · Fast "focus montage" (one control per beat, a word per beat) · Standard master + fast cut
3. **Explainers:** Callouts with arrows + zoom (Recommended) · Callouts without zoom · Graphic widgets (stat, ring, list) · Titles only
4. **Transitions:** Varied narrative set (Recommended: whip, flood, push, cut — never crossfades) · Calm (cuts, iris) · Energetic (whip, drop, flip)
5. **Text:** caption language, title tone (plain, playful, bold), words to avoid, brand spelling/casing
6. **Banned list:** start from the profile's "Never do" plus the defaults (crossfades, bouncy easing, glow on UI text, particles, text over UI, two phones on screen, dead frames > 1 s) and add anything the user dislikes

## Q-set D — sound
1. **Music source:** Suno prompt, you generate it (Recommended if they use Suno) · I have a licensed/owned track · Generated bed (no external tool) · Silent
2. **Music style** (Suno or generated): App launch / new feature — upbeat and bright (Recommended for apps) · Warm cinematic · Premium minimal · Playful tech · Calm · Cinematic trailer. `tools/suno.mjs --style <name>` writes the prompt; mention that commercial use needs a paid Suno plan
3. **Sound effects:** On (Recommended: real recorded taps, whooshes, pops, logo hit) · Subtle (lower gain) · Off
4. When a track arrives: measure it (`music/beats.mjs` + a per-bar energy map), propose where the drop, the breaks and the final hit land on the cut, splice on bars (`music/bed.mjs`)

## Q-set V — voiceover (only when asked)
1. **Voice:** language and gender, or subtitles only
2. **Source:** ElevenLabs (API key; most natural) · macOS draft voice (instant, for timing) · The user records the lines and sends files (aligned automatically)
3. **Script:** I write it, you approve (Recommended) · You have a script

Requirements check before promising anything: key present (`tools/vo.mjs --voices`), the plan allows that voice via
the API, ≤ 3.5 words/s, music ducks under speech.

## Q-set E — deliverables (multi-select)
15 s cut · 30 s cut · Fast montage cut · 4:5 feed crop · 1:1 crop · App Store preview (886×1920, no device frame, 15–30 s) · 4K master

## Remember
Whenever the user states a preference ("no wavy underlines", "transitions feel jumpy", "this music is too dark for
the product"), append a dated one-liner to the profile's feedback log and apply it from then on. Projects (path,
URL, brand colours, fonts, logo path, how demo data is made) go to the profile's project table.
