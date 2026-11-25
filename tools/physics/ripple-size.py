# ripple-size.py (tools/physics): the dune sand's ripple term (src/glsl/dunes-glsl.glsl, shadeSand: its phase, its
# slope's two cosines, its 0.06 normal tilt, the low sun's diffuse ramp) on a level plane seen from 14 m up, the
# ground from 59 m out, with the laptop's frustum and render size as measured in the page (1440 x 900 at 2: render
# 2880 x 1800, tanY 0.454). For 0.9, 0.2, 0.1 and 0.05 m wavelengths, crests facing the view and side-on, it renders
# the truth (8 x 8 supersampled: the shading filtered at the pixel) and three point-sampled ways (raw; today's fade
# by footprint, 0.012-0.05 m a pixel; a fade by the phase's change a pixel, fwidth, 2-4 px a wavelength), and prints
# each one's mean difference from the truth, its flicker over the truth's own between two frames 0.27 m forward and
# 0.05 m aside (one frame of cruise), and its ripple contrast (luma's spread, of 255). Writes laptop-facing.png and
# laptop-side-on.png (rows the wavelengths; columns truth, raw, today, fwidth) and sim.json to OUT.
#   python3 tools/physics/ripple-size.py OUT
import numpy as np, sys, json
from PIL import Image
OUT = sys.argv[1]
import os; os.makedirs(OUT, exist_ok=True)
def ss(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
LIT, SHD = np.array([0.86, 0.60, 0.50]), np.array([0.42, 0.33, 0.45])
sun = np.array([np.cos(np.radians(10)) * np.sin(np.radians(60)), np.sin(np.radians(10)), np.cos(np.radians(10)) * np.cos(np.radians(60))])
def shade(x, z, rdy, fp, lam, wind, mode, A=0.06, kfw=None):
    # mode: 'raw' point sample, no fade; 'cut' today's footprint fade (0.012-0.05 m/px); 'fade' by px per wavelength
    w = np.array(wind, float); w /= np.linalg.norm(w)
    ph = (x * w[0] + z * w[1]) / lam
    sl = np.cos(2 * np.pi * ph) + 0.35 * np.cos(4 * np.pi * ph + 1.0)
    if mode == 'raw': k = 1.0
    elif mode == 'cut': k = 1 - ss(0.012, 0.05, fp)
    elif mode == 'fw': k = kfw
    else: k = ss(2.0, 4.0, lam * np.maximum(np.abs(rdy), 0.02) / fp)   # (the crests facing the view: the worst case)
    nx, ny, nz = -k * A * sl * w[0], np.ones_like(sl), -k * A * sl * w[1]
    nn = np.sqrt(nx * nx + ny * ny + nz * nz); ndl = (nx * sun[0] + ny * sun[1] + nz * sun[2]) / nn
    dif = ss(-0.08, 0.26, ndl)[..., None]
    return SHD + (LIT - SHD) * dif
def render(dev, lam, wind, mode, sub=1, dz=0.0, dx=0.0, crop=(1200, 1500, 600, 300)):
    H, ty = {'laptop': (1800, 0.454), 'phone': (1688, 0.831)}[dev]; W = H * 1.6 if dev == 'laptop' else 780
    h, pitch = 14.0, np.radians(-13.35) - np.arctan(-ty)   # (the bottom row's ray meets the ground 59 m out)
    x0, y0, cw, ch = crop
    o = (np.arange(sub) + 0.5) / sub
    jx, jy = np.meshgrid(o, o); jx = jx.ravel(); jy = jy.ravel()
    px = x0 + np.arange(cw)[None, :, None] + jx[None, None, :]
    py = (H - y0 - ch) + np.arange(ch)[:, None, None] + jy[None, None, :]   # rows up from the bottom edge
    sx = (2 * px / W - 1) * ty * W / H; sy = 2 * py / H - 1
    e = pitch + np.arctan(sy * ty)
    rdy = np.sin(e) * np.ones_like(sx); dist = h / np.maximum(-rdy, 1e-4)
    z = dist * np.cos(e) + dz; x = sx * dist * np.cos(e) + dx
    t = np.sqrt(dist ** 2); fp = t * 2 * ty / H
    kfw = None
    if mode == 'fw':   # (fwidth(ph): the phase's change a pixel, so 1 / fw is the pixels a wavelength in its own direction)
        w = np.array(wind, float); w /= np.linalg.norm(w); ph = ((x * w[0] + z * w[1]) / lam)[..., 0]
        gy, gx = np.gradient(ph); fw = np.abs(gx) + np.abs(gy); kfw = (1 - ss(0.25, 0.5, fw))[..., None]
    c = shade(x, z, rdy, fp, lam, wind, mode, kfw=kfw).mean(axis=2)
    return np.flipud(c), float(dist.max()), float(dist.min())
res = {}
cases = [('0.90 m (today)', 0.9), ('0.20 m', 0.2), ('0.10 m', 0.1), ('0.05 m', 0.05)]
for wname, wind in (('facing', (0, 1)), ('side-on', (1, 0))):
    rows = []
    for name, lam in cases:
        truth, dmax, dmin = render('laptop', lam, wind, 'raw', sub=8)
        truth2, _, _ = render('laptop', lam, wind, 'raw', sub=8, dz=0.27, dx=0.05)
        tiles = [truth]
        for mode in ('raw', 'cut', 'fw'):
            a, _, _ = render('laptop', lam, wind, mode); b, _, _ = render('laptop', lam, wind, mode, dz=0.27, dx=0.05)
            L = lambda q: q @ np.array([0.2126, 0.7152, 0.0722])
            err = float(np.abs(L(a) - L(truth)).mean() * 255); shim = max(0.0, float((np.abs(L(a) - L(b)).mean() - np.abs(L(truth) - L(truth2)).mean()) * 255))
            res['%s %s %s' % (wname, name, mode)] = {'vs_filtered': round(err, 2), 'flicker_over_truth': round(shim, 2), 'ripple_contrast': round(float(L(a).std() * 255), 2)}
            tiles.append(a)
        res['%s %s truth' % (wname, name)] = {'ripple_contrast': round(float((truth @ np.array([0.2126, 0.7152, 0.0722])).std() * 255), 2)}
        rows.append(np.concatenate([np.pad(tl, ((4, 4), (4, 4), (0, 0)), constant_values=1) for tl in tiles], axis=1))
    img = np.concatenate(rows, axis=0)
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save('%s/laptop-%s.png' % (OUT, wname))
res['ground in crop (m)'] = [round(dmin, 1), round(dmax, 1)]
json.dump(res, open('%s/sim.json' % OUT, 'w'), indent=1)
for k, v in res.items(): print(k, v)
