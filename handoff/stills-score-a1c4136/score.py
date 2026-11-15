# score.py PNGDIR BOXES.json OUT.csv: each baked still (lossless PNG) scored on CPU.
#   L          OKLab L per pixel (sRGB -> linear -> LMS -> cube root)
#   moon       the brightest compact blob over L 0.53 whose equivalent radius is under 1.5 deg: its centre; the footprint
#              is 4.5 deg about it (px/deg from the frustum: landscape tanX 0.7265; portrait tanY min(tanX/a, tan 40))
#   w8         px over L 0.53 outside the footprint; w8_small: of those, px in blobs under (0.35 deg)^2*pi (bird-sized)
#   busy       mean |grad L| (x100, per CSS px) inside the word boxes (name, words, credit, sound button)
#   underL     mean and max L under the word boxes
#   subject    spectral-residual saliency (luma at 128 px wide); the strongest blob outside the word boxes, its mass
#              times exp(-d^2 / 2 0.08^2), d = distance of its centroid from the nearest third point (x/W, y/H)
#   aurora     share of pixels with OKLab a < -0.03 and L > 0.25 (green light); galaxy: share of the upper 60% with
#              OKLab a > 0.003 and L > 0.29 (the band's warm light; cloud over it reads a < 0)
import sys, os, json, re, csv, math, numpy as np, cv2
from multiprocessing import Pool
PNG, BOXF, OUTF = sys.argv[1:4]
BOX = json.load(open(BOXF))
TL = 0.7265
def oklab(bgr):
    c = bgr[..., ::-1].astype(np.float32) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = lin[..., 0], lin[..., 1], lin[..., 2]
    l = np.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m = np.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s = np.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    return L, A
def pxdeg(W, H):
    a = W / H
    if a >= 1: tx = TL
    else:
        tx = max(TL * a, math.tan(math.radians(21))); ty = min(tx / a, math.tan(math.radians(40))); tx = ty * a
    return (W / 2) / tx * math.tan(math.radians(1))
def one(fn):
    m = re.match(r'([a-z]+)-(\d+)-(hi|lo)-(\d+x\d+)\.png', fn)
    sky, k, tier, shape = m.group(1), int(m.group(2)), m.group(3), m.group(4)
    im = cv2.imread(os.path.join(PNG, fn)); H, W = im.shape[:2]
    L, A = oklab(im)
    B = BOX[tier + '-' + shape]; sc = W / B['css'][0]; pdg = pxdeg(W, H)
    words = np.zeros((H, W), bool)
    for b in B['boxes']:
        if b['sel'].startswith('.stack footer'): continue
        x0, y0 = int(b['x'] * sc), int(b['y'] * sc); x1, y1 = int((b['x'] + b['w']) * sc), int((b['y'] + b['h']) * sc)
        words[max(0, y0):min(H, y1), max(0, x0):min(W, x1)] = True
    # the moon and W8
    hot = (L > 0.53).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(hot, 8)
    moon = None; small = (0.35 * pdg) ** 2 * math.pi
    for i in range(1, n):
        r_eq = math.sqrt(st[i, 4] / math.pi); bw, bh = st[i, 2], st[i, 3]
        if r_eq < 1.5 * pdg and r_eq > 0.15 * pdg and 0.6 < bw / max(1, bh) < 1.6 and st[i, 4] / max(1, bw * bh) > 0.55:
            if moon is None or st[i, 4] > moon[2]: moon = (cen[i][0], cen[i][1], st[i, 4])
    out = hot.astype(bool)
    if moon:
        yy, xx = np.ogrid[:H, :W]; out &= (xx - moon[0]) ** 2 + (yy - moon[1]) ** 2 > (4.5 * pdg) ** 2
    w8 = int(out.sum()); w8s = 0
    if w8:
        n2, lab2, st2, _ = cv2.connectedComponentsWithStats(out.astype(np.uint8), 8)
        w8s = int(sum(st2[i, 4] for i in range(1, n2) if st2[i, 4] < small))
    # busy under the words
    gx = cv2.Sobel(L, cv2.CV_32F, 1, 0, ksize=3) / 8; gy = cv2.Sobel(L, cv2.CV_32F, 0, 1, ksize=3) / 8
    g = np.hypot(gx, gy) * sc   # (per CSS px: the shapes compare)
    busy = float(g[words].mean() * 100); uL = float(L[words].mean()); uLx = float(L[words].max())
    # subject
    w = 128; h = max(8, int(round(H * w / W)))
    sm = cv2.resize(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32), (w, h), interpolation=cv2.INTER_AREA)
    F = np.fft.fft2(sm); la = np.log(np.abs(F) + 1e-6); ph = np.angle(F)
    sr = la - cv2.blur(la, (3, 3)); sal = np.abs(np.fft.ifft2(np.exp(sr + 1j * ph))) ** 2
    sal = cv2.GaussianBlur(sal, (0, 0), 2.5); sal /= sal.max() + 1e-12
    wsm = cv2.resize(words.astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST) > 0
    sal[wsm] = 0
    thr = (sal > 0.35).astype(np.uint8); n3, lab3, st3, cen3 = cv2.connectedComponentsWithStats(thr, 8)
    best = 0.0; bxy = (0, 0)
    thirds = [(1 / 3, 1 / 3), (2 / 3, 1 / 3), (1 / 3, 2 / 3), (2 / 3, 2 / 3)]
    for i in range(1, n3):
        mass = float(sal[lab3 == i].sum()) / (w * h) * 100
        cx, cy = cen3[i][0] / w, cen3[i][1] / h; d = min(math.hypot(cx - tx, cy - ty) for tx, ty in thirds)
        v = mass * math.exp(-d * d / (2 * 0.08 ** 2))
        if v > best: best, bxy = v, (cx, cy)
    # night features
    aur = float(((A < -0.03) & (L > 0.25)).mean())
    hu = int(H * 0.6); gal = float(((A[:hu] > 0.003) & (L[:hu] > 0.29)).mean())   # (the galaxy band's warm light; cloud over it is blue)
    return dict(file=fn, sky=sky, k=k, tier=tier, shape=shape, W=W, H=H, w8=w8, w8_small=w8s, moon=bool(moon),
                moon_x=round(moon[0] / W, 3) if moon else '', moon_y=round(moon[1] / H, 3) if moon else '',
                busy=round(busy, 3), underL=round(uL, 4), underLmax=round(uLx, 4), subject=round(best, 4),
                subj_x=round(bxy[0], 3), subj_y=round(bxy[1], 3), aurora=round(aur, 5), galaxy=round(gal, 4), Lmax=round(float(L.max()), 4))
if __name__ == '__main__':
    fs = sorted(f for f in os.listdir(PNG) if f.endswith('.png'))
    with Pool(max(1, os.cpu_count() - 4)) as p: R = p.map(one, fs, chunksize=8)
    with open(OUTF, 'w', newline='') as f:
        wr = csv.DictWriter(f, fieldnames=list(R[0])); wr.writeheader(); wr.writerows(R)
    print(len(R), 'stills scored')
