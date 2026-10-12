#!/usr/bin/env python3
"""Usage: check.py <jobDir> [video.mp4]
1) Flags moments in the *used* range of each clip that look empty/loading (low detail vs the clip's norm).
2) Writes contact sheets of the final video to <jobDir>/qa/sheet_N.jpg (2 fps) for visual review."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
job = os.path.abspath(sys.argv[1]); video = sys.argv[2] if len(sys.argv) > 2 else os.path.join(job, 'out', 'final.mp4')
sb = json.load(open(os.path.join(job, os.environ.get('SB', 'storyboard.json'))))
BT = 60 / sb['bpm']; qa = os.path.join(job, 'qa'); os.makedirs(qa, exist_ok=True)

def frames(path, t0, t1, fps=4, w=201):
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{t0}', '-to', f'{t1}', '-i', path, '-vf', f'fps={fps},scale={w}:-2,format=gray', '-f', 'rawvideo', '-']
    raw = subprocess.run(cmd, capture_output=True).stdout
    h = int(w * 874 / 402) // 2 * 2
    n = len(raw) // (w * h)
    return np.frombuffer(raw[: n * w * h], np.uint8).reshape(n, h, w).astype(np.int16)

def detail(fr):
    h = fr.shape[0]; body = fr[int(h * 0.12): int(h * 0.88)]
    return np.abs(np.diff(body, axis=1)).mean() + np.abs(np.diff(body, axis=0)).mean()

uses = []
for i, s in enumerate(sb['sections']):
    if s['type'] == 'feature' and s.get('clip'): uses.append((f"#{i}", s['clip'], s['beats']))
    if s['type'] == 'montage':
        for k, p in enumerate(s['parts']):
            if p.get('clip'): uses.append((f"#{i}.{k}", p['clip'], p['beats']))
issues = 0
for where, clip, beats in uses:
    path = os.path.join(job, 'clips', clip['name'] + '.mp4')
    if not os.path.exists(path): continue
    a = clip.get('from', 0); b = a + beats * BT * clip.get('rate', 1)
    fr = frames(path, a, b)
    if not len(fr): continue
    d = np.array([detail(x) for x in fr]); ref = np.percentile(d, 75)
    sd = np.array([x[int(x.shape[0] * 0.12): int(x.shape[0] * 0.88)].std() for x in fr]); rsd = np.percentile(sd, 75)
    low = [i for i, v in enumerate(d) if v < ref * 0.38 and sd[i] < rsd * 0.6]
    if low:
        issues += 1
        ts = sorted(set(round(a + i / 4, 1) for i in low))
        print(f"WARN {where} {clip['name']}: possible empty/loading screen at clip t={ts[:6]}{'…' if len(ts) > 6 else ''}")
if not issues: print('clips: no empty/loading moments detected')
if os.path.exists(video):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-vf', 'fps=2,scale=180:-1,tile=12x6', os.path.join(qa, 'sheet_%d.jpg')])
    print('sheets:', sorted(f for f in os.listdir(qa) if f.startswith('sheet_')))
