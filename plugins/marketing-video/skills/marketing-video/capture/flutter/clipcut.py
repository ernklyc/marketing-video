#!/usr/bin/env python3
"""clipcut.py <jobDir> <srcClip> <newClip> "a-b,c-d,..."
Builds clips/<newClip>.mp4 from time ranges of clips/<srcClip>.mp4 (seconds), e.g. to drop loaders or dead air between
Maestro steps, and remaps the recorded taps into the new timeline (taps outside the kept ranges are dropped).
Joins are hard cuts — keep them on moments where the screen is still, or right after a tap (reads like an app transition)."""
import json, os, subprocess, sys
job, src, new, spec = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
rng = [tuple(float(x) for x in p.split('-')) for p in spec.split(',')]
clips = os.path.join(job, 'clips'); mp = os.path.join(clips, 'manifest.json'); man = json.load(open(mp))
inp = os.path.join(clips, f'{src}.mp4'); out = os.path.join(clips, f'{new}.mp4')
parts = ''.join(f'[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}];' for i, (a, b) in enumerate(rng))
fc = parts + ''.join(f'[v{i}]' for i in range(len(rng))) + f'concat=n={len(rng)}:v=1:a=0[o]'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', inp, '-filter_complex', fc, '-map', '[o]', '-r', '60', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', out], check=True)
taps, off = [], 0.0
for a, b in rng:
    for t in man[src]['taps']:
        if a <= t['t'] < b: taps.append({**t, 't': round(off + t['t'] - a, 3)})
    off += b - a
man[new] = {'dur': round(off, 3), 'taps': taps, 'source': f'{src}[{spec}]'}
json.dump(man, open(mp, 'w'), ensure_ascii=False, indent=1)
print(f'{new}: {off:.2f}s from {src} ({len(rng)} ranges), {len(taps)} taps')
