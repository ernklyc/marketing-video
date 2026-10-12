#!/bin/bash
# One-time setup: installs the Remotion engine and Playwright for capture.
set -e
SK="$(cd "$(dirname "$0")" && pwd)"
(cd "$SK/engine" && npm i --silent)
(cd "$SK/capture/web" && npm i --silent && npx playwright install chromium)
bash "$SK/music/sfx/fetch.sh"
mkdir -p "$HOME/.config/marketing-video"; [ -f "$HOME/.config/marketing-video/profile.md" ] || cp "$SK/profile.template.md" "$HOME/.config/marketing-video/profile.md"
echo "marketing-video ready"
