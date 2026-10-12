#!/usr/bin/env python3
"""frames.py pops <video> [cut_seconds,...]   → single-frame pops: frame-difference spikes ≥3× their neighbours
   frames.py color <video> <still.png> <seconds>   → mean |RGB| difference between a Remotion still and the decoded frame
Pops at section changes are expected (cuts, floods, whips); pass section starts as cuts and spikes from 2 frames
before to 0.45 s after each are ignored."""
import json, subprocess, sys
import numpy as np

def probe(v):
    j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', v], capture_output=True, text=True).stdout)['streams'][0]
    n, d = j['r_frame_rate'].split('/'); return j['width'], j['height'], float(n) / float(d)

def pops(v, cuts):
    w, h, fps = probe(v); W, H = w // 6 // 2 * 2, h // 6 // 2 * 2
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', v, '-vf', f'scale={W}:{H},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
    d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    cutf = [round(c * fps) for c in cuts]
    bad = []
    for i in range(4, len(d) - 4):
        nb = np.concatenate([d[i - 4:i], d[i + 1:i + 5]])
        if d[i] > 6 and d[i] > 3 * max(np.median(nb), 0.5) and not any(-2 <= i + 1 - c <= round(0.45 * fps) for c in cutf):
            bad.append((round((i + 1) / fps, 2), round(float(d[i]), 1), round(float(np.median(nb)), 1)))
    print(f'pops: {len(bad)} suspicious frame(s)' + ''.join(f'\n  {t}s  diff {x} vs neighbours {m}' for t, x, m in bad[:30]))
    return bad

def color(v, still, t):
    from PIL import Image
    a = np.asarray(Image.open(still).convert('RGB')).astype(np.int16)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', v, '-frames:v', '1', '-vf', f'scale={a.shape[1]}:{a.shape[0]}:in_color_matrix=auto:in_range=auto:out_range=full,format=rgb24', '-f', 'rawvideo', '-'], capture_output=True).stdout
    b = np.frombuffer(raw, np.uint8).reshape(a.shape).astype(np.int16)
    m = np.abs(a - b).mean(axis=(0, 1)); dark = a.sum(axis=2) < 90
    shift = (b[dark] - a[dark]).mean(axis=0) if dark.any() else np.zeros(3)
    ok = m.mean() < 6 and np.abs(shift).max() < 5
    print(f'color: mean |Δ| R{m[0]:.1f} G{m[1]:.1f} B{m[2]:.1f}; dark-pixel shift {shift.round(1).tolist()} → {"OK" if ok else "CHECK (range/matrix?)"}')
    return ok

if __name__ == '__main__':
    if sys.argv[1] == 'pops': pops(sys.argv[2], [float(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 and sys.argv[3] else [])
    else: color(sys.argv[2], sys.argv[3], float(sys.argv[4]))
