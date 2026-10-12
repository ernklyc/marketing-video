#!/usr/bin/env python3
"""import-clip.py <jobDir> <clipName> <recording.mp4|mov> [--from 2.5] [--to 18] [--taps "1.2@50,30:Filters; 3.4@86,65:Ranked"]
Brings in a screen recording made anywhere (iPhone/Android screen recorder, QuickTime, a teammate) as a film clip:
trims, converts to 60 fps 1206-wide H.264 in <job>/clips/<clip>.mp4 and registers it in clips/manifest.json.
--taps marks where the finger touched (seconds in the trimmed clip @ x%,y% of the screen : label) so the engine draws
the touch indicator and keeps callouts in sync; leave it out and add callouts with `t`/`x`/`y` instead.
Crop the status bar/home indicator yourself if the recording is not full-screen portrait."""
import json, os, subprocess, sys
a = sys.argv[1:]
if len(a) < 3: sys.exit(__doc__)
job, name, src = os.path.abspath(a[0]), a[1], os.path.abspath(a[2])
opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
t0, t1 = float(opt('--from', 0)), opt('--to')
clips = os.path.join(job, 'clips'); os.makedirs(clips, exist_ok=True)
out = os.path.join(clips, f'{name}.mp4')
cmd = ['ffmpeg', '-v', 'error', '-y', '-ss', str(t0)] + (['-to', str(float(t1))] if t1 else []) + ['-i', src, '-vf', 'fps=60,scale=1206:-2,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-an', out]
subprocess.run(cmd, check=True)
taps = []
for part in filter(None, (opt('--taps', '') or '').split(';')):
    when, rest = part.strip().split('@'); xy, *lab = rest.split(':'); x, y = xy.split(',')
    taps.append({'t': float(when), 'x': round(float(x) * 4.02, 1), 'y': round(float(y) * 8.74, 1), 'label': lab[0].strip() if lab else ''})
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout)
mp = os.path.join(clips, 'manifest.json'); man = json.load(open(mp)) if os.path.exists(mp) else {}
man[name] = {'dur': round(dur, 3), 'taps': sorted(taps, key=lambda t: t['t']), 'source': 'import:' + os.path.basename(src)}
json.dump(man, open(mp, 'w'), ensure_ascii=False, indent=1)
print(f'{name}: {dur:.2f}s, {len(taps)} taps → {out}')
