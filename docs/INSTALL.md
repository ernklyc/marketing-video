# Install

## 1. Install the skill

### Option A — as a skill (recommended; command `/marketing-video`)

```bash
git clone https://github.com/ernklyc/marketing-video /tmp/marketing-video
mkdir -p ~/.claude/skills && cp -R /tmp/marketing-video/plugins/marketing-video/skills/marketing-video ~/.claude/skills/
bash ~/.claude/skills/marketing-video/setup.sh
```

Skills in `~/.claude/skills` are available in every project and every Claude Code session on that computer,
whichever Claude account is signed in.

### Option B — as a plugin

Inside Claude Code:

```text
/plugin marketplace add ernklyc/marketing-video
/plugin install marketing-video@marketing-video
```

The command is then `/marketing-video:marketing-video` (or just describe the video you want). On first use, ask
Claude to run the skill's `setup.sh`.

### Updating

Option A: pull and copy again (your profile lives outside the skill and is kept). Option B: `/plugin update`.

## 2. What `setup.sh` does

1. Installs the render engine (Remotion, React) in `engine/`.
2. Installs Playwright and Chromium for website capture in `capture/web/`.
3. Downloads the curated sound-effect pack (Mixkit free license) into `music/sfx/` — the files are fetched on your
   machine, not redistributed by this repository.
4. Creates your profile at `~/.config/marketing-video/profile.md` from `profile.template.md`.

The engine install is about 1 GB of `node_modules`.

## 3. Check your machine

```bash
bash ~/.claude/skills/marketing-video/tools/doctor.sh          # all
bash ~/.claude/skills/marketing-video/tools/doctor.sh web      # only what website films need
bash ~/.claude/skills/marketing-video/tools/doctor.sh ios      # only what iOS app films need
```

Every missing item comes with the exact command to fix it. In a session you can simply say *"run the doctor and
help me install what's missing"* — Claude explains each item and asks before running anything.

| Need | For | Install (macOS) |
|---|---|---|
| Node.js 20+ | engine, capture | `brew install node` |
| ffmpeg (with `tmix`) | encoding, motion blur, audio | `brew install ffmpeg` |
| Python 3 + numpy + Pillow | music analysis, QA | `python3 -m pip install --user numpy Pillow` |
| Xcode + iOS Simulator runtime | iOS apps | App Store → Xcode; Xcode → Settings → Components |
| Maestro + Java 17 | driving the app while recording | `curl -Ls https://get.maestro.mobile.dev \| bash` · `brew install openjdk@17` |
| Flutter (optional) | building a capture build of a Flutter app | https://docs.flutter.dev/get-started |
| ElevenLabs key (optional) | voiceover | save it to `~/.config/marketing-video/elevenlabs.key` |

On Linux, website films work the same way (use your package manager for Node, ffmpeg and Python); iOS capture
requires macOS.

## 4. A capture device for apps

```bash
bash ~/.claude/skills/marketing-video/tools/sim-setup.sh ios --lang en-US
```

This creates and boots a dedicated **Promo iPhone** simulator (newest iPhone + iOS installed) with a clean 9:41
status bar, so your own simulators are never touched. Install the build you want to film:

```bash
xcrun simctl install <udid> path/to/YourApp.app
```

Sign in to your test account on that simulator yourself; the studio never types passwords.

## Uninstall

```bash
rm -rf ~/.claude/skills/marketing-video ~/.config/marketing-video ~/.promo-ledger.json
xcrun simctl delete "Promo iPhone"    # if you created it
```

Your films stay in `~/promo-videos/` until you delete that folder.
