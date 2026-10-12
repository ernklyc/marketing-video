#!/bin/bash
# Usage: doctor.sh [web|ios|all]   (default: all)
# Checks everything the studio needs and prints the exact fix for anything missing. Changes nothing.
# Core: Node 20+, ffmpeg with tmix, Python 3 + numpy + Pillow, engine installed, SFX pack, profile.
# Web capture: Playwright Chromium. iOS: Xcode + Simulator runtime + Maestro (+ Java).
SK="$(cd "$(dirname "$0")/.." && pwd)"; WHAT="${1:-all}"; MISSING=0
ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
no() { printf '  \033[31m✗\033[0m %s\n      fix: %s\n' "$1" "$2"; MISSING=$((MISSING+1)); }
opt() { printf '  \033[33m•\033[0m %s\n      %s\n' "$1" "$2"; }
has() { command -v "$1" >/dev/null 2>&1; }
MAC=0; [ "$(uname)" = Darwin ] && MAC=1
PKG() { [ $MAC = 1 ] && echo "brew install $1" || echo "sudo apt-get install -y $2"; }

echo "Core"
if has node; then v=$(node -p 'process.versions.node.split(".")[0]'); [ "$v" -ge 20 ] && ok "Node $(node -v)" || no "Node $(node -v) is too old (need 20+)" "$(PKG node nodejs) — or https://nodejs.org"; else no "Node.js" "$(PKG node nodejs) — or https://nodejs.org"; fi
if has ffmpeg; then ffmpeg -hide_banner -filters 2>/dev/null | grep -q " tmix " && ok "ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}') (tmix ok)" || no "ffmpeg without the tmix filter" "$(PKG ffmpeg ffmpeg) (a full build)"; else no "ffmpeg" "$(PKG ffmpeg ffmpeg)"; fi
if has python3; then ok "Python $(python3 -V | awk '{print $2}')"; python3 -c 'import numpy' 2>/dev/null && ok "numpy" || no "numpy" "python3 -m pip install --user numpy"; python3 -c 'import PIL' 2>/dev/null && ok "Pillow" || no "Pillow" "python3 -m pip install --user Pillow"; else no "Python 3" "$(PKG python python3)"; fi
[ -d "$SK/engine/node_modules/remotion" ] && ok "render engine installed" || no "render engine not installed" "bash \"$SK/setup.sh\""
n=$(ls "$SK/music/sfx/"*.wav "$SK/music/sfx/"*.mp3 2>/dev/null | wc -l | tr -d ' '); [ "$n" -ge 20 ] && ok "sound-effect pack ($n files)" || no "sound-effect pack ($n files)" "bash \"$SK/music/sfx/fetch.sh\""
[ -f "$HOME/.config/marketing-video/profile.md" ] && ok "profile ~/.config/marketing-video/profile.md" || no "no profile yet" "mkdir -p ~/.config/marketing-video && cp \"$SK/profile.template.md\" ~/.config/marketing-video/profile.md"
df -k "$HOME" | awk 'NR==2{ if ($4 < 10*1024*1024) exit 1 }' && ok "disk space ≥ 10 GB free" || opt "less than 10 GB free" "a 60 s final uses ~5 GB of temporary frames while rendering"

if [ "$WHAT" = all ] || [ "$WHAT" = web ]; then
  echo "Website capture"
  [ -d "$SK/capture/web/node_modules/playwright" ] && ok "Playwright installed" || no "Playwright not installed" "(cd \"$SK/capture/web\" && npm i && npx playwright install chromium)"
  ls -d "$HOME/Library/Caches/ms-playwright"/chromium* "$HOME/.cache/ms-playwright"/chromium* 2>/dev/null | grep -q . && ok "Chromium for Playwright" || no "Chromium for Playwright" "(cd \"$SK/capture/web\" && npx playwright install chromium)"
fi
MAESTRO=$(command -v maestro || ls "$HOME/.maestro/bin/maestro" 2>/dev/null)
if [ "$WHAT" = all ] || [ "$WHAT" = ios ]; then
  echo "App automation"
  [ -n "$MAESTRO" ] && ok "Maestro ($MAESTRO)" || no "Maestro (drives the app while recording)" "curl -Ls https://get.maestro.mobile.dev | bash"
  if has java || [ -n "$JAVA_HOME" ] || [ -d /opt/homebrew/opt/openjdk@17 ]; then ok "Java (for Maestro)"; else no "Java 17 (Maestro needs it)" "$(PKG openjdk@17 openjdk-17-jre)"; fi
fi
if [ $MAC = 1 ] && { [ "$WHAT" = all ] || [ "$WHAT" = ios ]; }; then
  echo "iOS Simulator"
  if xcrun simctl help >/dev/null 2>&1; then ok "Xcode command-line tools ($(xcode-select -p))"
    r=$(xcrun simctl list runtimes 2>/dev/null | grep -c "iOS"); [ "$r" -gt 0 ] && ok "$r iOS simulator runtime(s)" || no "no iOS simulator runtime" "Xcode → Settings → Components → install an iOS Simulator"
    b=$(xcrun simctl list devices booted 2>/dev/null | grep -c Booted); [ "$b" -gt 0 ] && ok "$b simulator(s) booted" || opt "no simulator booted" "bash \"$SK/tools/sim-setup.sh\" ios   (creates and boots a dedicated 'Promo iPhone')"
  else no "Xcode / simctl" "install Xcode from the App Store, then: sudo xcode-select -s /Applications/Xcode.app && sudo xcodebuild -runFirstLaunch"; fi
fi
echo "Optional"
{ has flutter || has fvm; } && ok "Flutter toolchain (to build a capture build of a Flutter app)" || opt "Flutter not found" "only needed to build a Flutter app for capture"
[ -n "$ELEVENLABS_API_KEY" ] || [ -f "$HOME/.config/marketing-video/elevenlabs.key" ] && ok "ElevenLabs key (voiceover)" || opt "no ElevenLabs key" "voiceover is optional; macOS 'say' gives a draft voice"
echo; [ $MISSING = 0 ] && echo "All required tools are ready." || echo "$MISSING item(s) missing — run the fix lines above (Claude can run them for you after you approve)."
