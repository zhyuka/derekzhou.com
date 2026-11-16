// tools/clouds/edge-specks.mjs: a cloud edge's specks and high-frequency residual, measured on a frame (a PNG)
// node tools/clouds/edge-specks.mjs FRAME.png x0 y0 x1 y1 [FRAME2.png ...]
// The frame's luma (Rec. 709 on the stored codes) in the box, each pixel against the median of its 3 x 3: the mean
// absolute residual (the box's high-frequency content: a comb or stair-stepped edge raises it) and the specks (pixels
// more than 6 levels off their median: holes and loose pixels). The hub's stair-stepped edge on main (seed 11, first
// light, 1440x900, the small cumulus at 150,415-345,550): main 18 specks, 0.31; the cloud stack 4, 0.27.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

export function readPng(file) {   // 8-bit RGB or RGBA, not interlaced (what the harness's captures are)
  const b = fs.readFileSync(file); let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < b.length) {
    const n = b.readUInt32BE(p), t = b.toString('latin1', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12] !== 0 || (ct !== 2 && ct !== 6)) throw new Error(`${file}: not an 8-bit RGB(A) PNG`); }
    else if (t === 'IDAT') idat.push(d); else if (t === 'IEND') break;
    p += 12 + n;
  }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), st = w * bpp, px = new Uint8Array(w * h * bpp);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (st + 1)], src = raw.subarray(y * (st + 1) + 1, (y + 1) * (st + 1)), o = y * st;
    for (let x = 0; x < st; x++) {
      const a = x >= bpp ? px[o + x - bpp] : 0, up = y ? px[o - st + x] : 0, c = x >= bpp && y ? px[o - st + x - bpp] : 0;
      const pa = Math.abs(up - c), pb = Math.abs(a - c), pc = Math.abs(a + up - 2 * c);
      px[o + x] = (src[x] + [0, a, up, (a + up) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? up : c][f]) & 255;
    }
  }
  return { w, h, bpp, px };
}
export function edgeSpecks(img, x0, y0, x1, y1, thr = 6) {
  const L = (x, y) => { const i = (y * img.w + x) * img.bpp; return 0.2126 * img.px[i] + 0.7152 * img.px[i + 1] + 0.0722 * img.px[i + 2]; };
  let sum = 0, n = 0, specks = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const v = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) v.push(Math.round(L(Math.min(Math.max(x + i, x0), x1 - 1), Math.min(Math.max(y + j, y0), y1 - 1))));
    v.sort((a, b2) => a - b2); const r = Math.abs(Math.round(L(x, y)) - v[4]); sum += r; n++; if (r > thr) specks++;
  }
  return { residual: sum / n, specks };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {   // (pathToFileURL: file:///C:/... on Windows)
  const a = process.argv.slice(2), box = a.filter((s) => /^\d+$/.test(s)).map(Number), files = a.filter((s) => !/^\d+$/.test(s));
  if (box.length !== 4 || !files.length) { console.error('node tools/clouds/edge-specks.mjs FRAME.png x0 y0 x1 y1 [FRAME2.png ...]'); process.exit(2); }
  for (const f of files) { const r = edgeSpecks(readPng(f), ...box); console.log(`${f}: specks ${r.specks}, residual ${r.residual.toFixed(3)}`); }
}
