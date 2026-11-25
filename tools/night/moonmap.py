# tools/night/moonmap.py: the moon's face for sky-body.glsl (MOONA): the near side as an orthographic 32 x 32 disc,
# 4 bits a cell, packed 8 cells to a word. Its source, kept out of the repository: the 1k colour map of NASA's Scientific
# Visualization Studio CGI Moon Kit, https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg
# (https://svs.gsfc.nasa.gov/4720/: public domain, credit NASA's Scientific Visualization Studio; docs/licences.md).
#   python3 -I tools/night/moonmap.py lroc_color_poles_1k.jpg out.txt   (out.txt: LO and the 128 words; out.txt.png a look)
# Each cell is the mean of 8 x 8 samples of the map's linear luminance (lunar east to the right, north up), relative to
# the highlands (their 95th percentile over the disc); cells outside the disc take the nearest inside one (bilinear at
# the limb); the levels span the map's darkest 1% to the highlands. The shader maps level 0 to MOON_DARK.
import sys, math
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(float) / 255
lin = np.where(im <= 0.04045, im / 12.92, ((im + 0.055) / 1.055) ** 2.4)
Y = lin @ [0.2126, 0.7152, 0.0722]
H, W = Y.shape
G, S = 32, 8
val = np.full((G, G), np.nan)
for j in range(G):
    for i in range(G):
        acc = []; 
        for b in range(S):
            for a in range(S):
                u = ((i + (a + 0.5) / S) / G) * 2 - 1          # east
                v = 1 - ((j + (b + 0.5) / S) / G) * 2          # north (row 0 at the top)
                r2 = u * u + v * v
                if r2 >= 1: continue
                x = math.sqrt(1 - r2); lat = math.asin(v); lon = math.atan2(u, x)
                px = (math.degrees(lon) + 180) / 360 * W; py = (90 - math.degrees(lat)) / 180 * H
                acc.append(Y[min(H - 1, int(py)), min(W - 1, int(px)) % W])
        if acc: val[j, i] = np.mean(acc)
inside = ~np.isnan(val)
hi = np.percentile(val[inside], 95); rel = val / hi
lo = np.percentile(rel[inside], 1)
print(f'disc cells {inside.sum()}, highland (p95) Y {hi:.4f}, darkest (p1) {lo:.3f}, median {np.median(rel[inside]):.3f}')
# fill outside the disc with the nearest inside value (for bilinear at the limb)
filled = rel.copy()
for j in range(G):
    for i in range(G):
        if not inside[j, i]:
            d = [(abs(j - jj) + abs(i - ii), rel[jj, ii]) for jj in range(G) for ii in range(G) if inside[jj, ii]]
            filled[j, i] = min(d)[1]
LO = round(float(lo), 2)
n = np.clip(np.round((np.minimum(filled, 1) - LO) / (1 - LO) * 15), 0, 15).astype(int)
words = []
for k in range(0, G * G, 8):
    w = 0
    for t in range(8):
        idx = k + t; w |= int(n[idx // G, idx % G]) << (4 * t)
    words.append(w)
open(out, 'w').write(f'LO {LO}\n' + ', '.join(f'0x{w:08x}u' for w in words) + '\n')
Image.fromarray((n * 17).astype(np.uint8)).resize((G * 8, G * 8), Image.NEAREST).save(out + '.png')
