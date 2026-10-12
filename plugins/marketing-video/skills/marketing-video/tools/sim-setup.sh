#!/bin/bash
# Usage: sim-setup.sh ios [--lang en-US]
# Creates (once) and boots a dedicated capture device, so recordings never disturb the user's own simulators:
#   ios      "Promo iPhone" on the newest iPhone + iOS runtime installed, clean 9:41 status bar, chosen language
# Prints the device id to use with simclip.py --udid. Install the app to film with: xcrun simctl install <udid> <App.app>
set -e
P="$1"; shift || true; LANGTAG="en-US"
while [ $# -gt 0 ]; do case "$1" in --lang) LANGTAG="$2"; shift 2;; *) shift;; esac; done
if [ "$P" = ios ]; then
  U=$(xcrun simctl list devices | grep "Promo iPhone (" | head -1 | grep -oE '[0-9A-F-]{36}' || true)
  if [ -z "$U" ]; then
    RT=$(xcrun simctl list runtimes | grep -E "^iOS" | tail -1 | grep -oE 'com\.apple\.CoreSimulator\.SimRuntime\.[^ ]+')
    DT=$(xcrun simctl list devicetypes | grep -E "^iPhone [0-9]+ Pro \(" | tail -1 | grep -oE 'com\.apple\.CoreSimulator\.SimDeviceType\.[^)]+')
    [ -z "$DT" ] && DT=$(xcrun simctl list devicetypes | grep -E "^iPhone" | tail -1 | grep -oE 'com\.apple\.CoreSimulator\.SimDeviceType\.[^)]+')
    [ -z "$RT" ] && { echo "no iOS runtime — Xcode → Settings → Components"; exit 1; }
    U=$(xcrun simctl create "Promo iPhone" "$DT" "$RT"); echo "created Promo iPhone ($DT, $RT)"
  fi
  xcrun simctl boot "$U" 2>/dev/null || true
  xcrun simctl spawn "$U" defaults write -g AppleLanguages -array "$LANGTAG"
  xcrun simctl spawn "$U" defaults write -g AppleLocale -string "${LANGTAG/-/_}"
  xcrun simctl status_bar "$U" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3 --dataNetwork 5g
  open -a Simulator --args -CurrentDeviceUDID "$U" 2>/dev/null || true
  echo "ios device: $U   (language $LANGTAG — apps with their own language setting must be switched in-app)"
else
  sed -n 2,8p "$0"; exit 1
fi
