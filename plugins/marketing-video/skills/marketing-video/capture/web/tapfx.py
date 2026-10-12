#!/usr/bin/env python3
"""tapfx.py <framesDir> <fps> <tapsJson> → prints taps with fx (0–100 screen change after the tap) as JSON."""
import json, sys, os
import numpy as np
from PIL import Image
d, fps, taps = sys.argv[1], float(sys.argv[2]), json.loads(sys.argv[3])
n = len([f for f in os.listdir(d) if f.endswith('.jpg')])
def g(i):
    i = max(0, min(n - 1, i))
    return np.asarray(Image.open(os.path.join(d, f'f{i:05d}.jpg')).convert('L').resize((134, 291)), dtype=np.int16)
for t in taps:
    i = int(round(t['t'] * fps))
    a = g(i - 1)
    t['fx'] = round(float(max(np.abs(g(i + k) - a).mean() for k in range(3, int(fps * 0.9), 3))), 1)
print(json.dumps(taps))
