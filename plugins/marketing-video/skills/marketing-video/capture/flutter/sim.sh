#!/bin/bash
# Helpers for iOS-simulator capture.
#   sim.sh prep                     clean status bar 9:41, full battery
#   sim.sh go <scheme://host/route> <out.png> [wait]   open a deep link, then screenshot
#   sim.sh rec-start <out.mp4> / sim.sh rec-stop       real-motion screen recording (simctl recordVideo)
case "$1" in
  prep) xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3 --dataNetwork 5g ;;
  go) xcrun simctl openurl booted "$2"; sleep "${4:-4}"; xcrun simctl io booted screenshot "$3" >/dev/null 2>&1 ;;
  rec-start) (xcrun simctl io booted recordVideo --codec=h264 --force "$2" >/dev/null 2>&1 &); sleep 1.5 ;;
  rec-stop) pkill -INT -f "simctl io booted recordVideo"; sleep 2 ;;
  clear) xcrun simctl status_bar booted clear ;;
esac
