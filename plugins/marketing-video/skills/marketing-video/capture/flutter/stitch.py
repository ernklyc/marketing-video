# stitch.py out.png top_px bottom_px img1 img2 ... : stitch vertically scrolled screenshots (fixed top/bottom bands)
import sys, numpy as np
from PIL import Image
out, T, B = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ims = [np.asarray(Image.open(p).convert('RGB')).astype(np.int16) for p in sys.argv[4:]]
H = ims[0].shape[0]
win = lambda a: a[T:H - B]
parts = [ims[0][:H - B]]
for a, b in zip(ims, ims[1:]):
    wa, wb = win(a), win(b)
    h = wa.shape[0]
    band = wb[:120]
    best, bd = 0, 1e18
    for d in range(0, h - 120):
        diff = np.abs(wa[d:d + 120] - band).mean()
        if diff < bd: bd, best = diff, d
    new = wb[h - best:]
    print('offset', best, 'diff', round(bd, 2), 'new rows', new.shape[0])
    parts.append(new)
img = np.concatenate(parts, 0).astype(np.uint8)
Image.fromarray(img).save(out)
Image.fromarray(ims[0][H - B:].astype(np.uint8)).save(out.replace('.png', '_nav.png'))
print(out, img.shape)
