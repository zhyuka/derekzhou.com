// dune-census.mjs (tools/physics): the dunes' slopes, counted on a grid, against the sand physics spec (physics: sand/S1).
// A port of dunes() (src/glsl/dunes-glsl.glsl) to JS in doubles, the noise (gnd, its integer hash) as written, the
// sand weight 1 everywhere, the near family at full strength. Each point's slope from the analytic gradient; stoss and
// lee by the main wave's sign along the wind. Prints the stoss and lee percentiles, the lee's mode, the share over 34
// deg (sand's angle of repose is 32-34 deg: a steeper face slides) and the steepest.
//   node tools/physics/dune-census.mjs [--model old|s1] [--half 1500] [--cell 2] [--wind 0.6]
import { fileURLToPath } from 'node:url';
const MAIN = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
const A = {}; if (MAIN) for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
let MODEL = A.model || 's1', HALF = +(A.half || 1500), CELL = +(A.cell || 2), WA = +(A.wind || 0.6);

// ---- lib.glsl's hash and gradient noise, in JS (uint32 by Math.imul and >>> 0)
const ih = (x) => { x >>>= 0; x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0; x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0; x ^= x >>> 16; return x >>> 0; };
const ih2 = (px, py) => ih((Math.imul(px >>> 0, 0x8da6b343) ^ ih(((py >>> 0) + 0x68e31da4) >>> 0)) >>> 0);
const g2 = (px, py) => { const h = ih2(px, py); return [(h & 0xffff) * (2 / 65535) - 1, (h >>> 16) * (2 / 65535) - 1]; };
function gnd(x, y) {   // vec3(n, dn/dx, dn/dy)
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const dux = 30 * fx * fx * (fx * (fx - 2) + 1), duy = 30 * fy * fy * (fy * (fy - 2) + 1);
  const ga = g2(ix, iy), gb = g2(ix + 1, iy), gc = g2(ix, iy + 1), gd = g2(ix + 1, iy + 1);
  const va = ga[0] * fx + ga[1] * fy, vb = gb[0] * (fx - 1) + gb[1] * fy, vc = gc[0] * fx + gc[1] * (fy - 1), vd = gd[0] * (fx - 1) + gd[1] * (fy - 1);
  const k = va - vb - vc + vd;
  return [va + ux * (vb - va) + uy * (vc - va) + ux * uy * k,
    ga[0] + ux * (gb[0] - ga[0]) + uy * (gc[0] - ga[0]) + ux * uy * (ga[0] - gb[0] - gc[0] + gd[0]) + dux * (uy * k + vb - va),
    ga[1] + ux * (gb[1] - ga[1]) + uy * (gc[1] - ga[1]) + ux * uy * (ga[1] - gb[1] - gc[1] + gd[1]) + duy * (ux * k + vc - va)];
}
// gnd's second derivatives (dunes-glsl's gndH): [xx, xy, yy]
function gndH(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const dux = 30 * fx * fx * (fx * (fx - 2) + 1), duy = 30 * fy * fy * (fy * (fy - 2) + 1);
  const ddx = 60 * fx * (fx * (2 * fx - 3) + 1), ddy = 60 * fy * (fy * (2 * fy - 3) + 1);
  const ga = g2(ix, iy), gb = g2(ix + 1, iy), gc = g2(ix, iy + 1), gd = g2(ix + 1, iy + 1);
  const va = ga[0] * fx + ga[1] * fy, vb = gb[0] * (fx - 1) + gb[1] * fy, vc = gc[0] * fx + gc[1] * (fy - 1), vd = gd[0] * (fx - 1) + gd[1] * (fy - 1);
  const k = va - vb - vc + vd, kx = ga[0] - gb[0] - gc[0] + gd[0], ky = ga[1] - gb[1] - gc[1] + gd[1];
  return [2 * dux * (gb[0] - ga[0] + uy * kx) + ddx * (uy * k + vb - va),
    duy * (gc[0] - ga[0] + ux * kx) + dux * (gb[1] - ga[1] + uy * ky) + dux * duy * k,
    2 * duy * (gc[1] - ga[1] + ux * ky) + ddy * (ux * k + vc - va)];
}
// the swell's second derivatives (40 gnd(p / 760) + 15 gnd(M1 (p + (311, -97)))): M^T Hn M a tap
function swellH(x, y) {
  const a = gndH(x / 760, y / 760), s0 = 40 / (760 * 760), m = M1;
  const X = m[0] * (x + 311) + m[2] * (y - 97), Y = m[1] * (x + 311) + m[3] * (y - 97), b = gndH(X, Y);
  // M = [[m0 m2], [m1 m3]]: (M^T B M)_ij = sum M_ki B_kl M_lj
  const B = [[b[0], b[1]], [b[1], b[2]]], M = [[m[0], m[2]], [m[1], m[3]]];
  const r = (i, j) => { let t = 0; for (let k2 = 0; k2 < 2; k2++) for (let l = 0; l < 2; l++) t += M[k2][i] * B[k2][l] * M[l][j]; return t; };
  return [s0 * a[0] + 15 * r(0, 0), s0 * a[1] + 15 * r(0, 1), s0 * a[2] + 15 * r(1, 1)];
}
// dN(p, M) for M = s I (a diagonal scale), and for a general 2x2 (column-major m = [a, b, c, d]: M = [[a c], [b d]])
const dNs = (x, y, s) => { const g = gnd(x * s, y * s); return [g[0], g[1] * s, g[2] * s]; };
const dNm = (x, y, m) => { const g = gnd(m[0] * x + m[2] * y, m[1] * x + m[3] * y); return [g[0], m[0] * g[1] + m[1] * g[2], m[2] * g[1] + m[3] * g[2]]; };
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const mul = (a, b) => [a[0] * b[0], a[0] * b[1] + b[0] * a[1], a[0] * b[2] + b[0] * a[2]];
function sstep(e0, e1, a) { const x = Math.min(1, Math.max(0, (a[0] - e0) / (e1 - e0))); const d = 6 * x * (1 - x) / (e1 - e0); return [x * x * (3 - 2 * x), a[1] * d, a[2] * d]; }
function smin(a, b, k) { const h = Math.min(1, Math.max(0, 0.5 + 0.5 * (b[0] - a[0]) / k)); return [b[0] + (a[0] - b[0]) * h - k * h * (1 - h), b[1] + (a[1] - b[1]) * h, b[2] + (a[2] - b[2]) * h]; }
function smax(a, b, k) { const h = Math.min(1, Math.max(0, 0.5 + 0.5 * (a[0] - b[0]) / k)); return [b[0] + (a[0] - b[0]) * h + k * h * (1 - h), b[1] + (a[1] - b[1]) * h, b[2] + (a[2] - b[2]) * h]; }

let w = [Math.cos(WA), Math.sin(WA)], pp = [-w[1], w[0]];
const M1 = [0.8 / 330, 0.6 / 330, -0.6 / 330, 0.8 / 330];
let Ma = [w[0] / 420, pp[0] / 190, w[1] / 420, pp[1] / 190];   // (mat2(w.x/420, pp.x/190, w.y/420, pp.y/190), column-major)

// today's duneWave: an asymmetric wave with its phase warped in 2D
function waveOld(x, y, ww, lam, c, warp) {
  const ph = [(x * ww[0] + y * ww[1]) / lam + warp[0], ww[0] / lam + warp[1], ww[1] / lam + warp[2]];
  const f = ph[0] - Math.floor(ph[0]); let s, ds;
  if (f < c) { const t = f / c; s = t * t * (2 - t); ds = (4 * t - 3 * t * t) / c; } else { const t = (f - c) / (1 - c); s = 1 - t * t * (3 - 2 * t); ds = -6 * t * (1 - t) / (1 - c); }
  return { h: [s, ph[1] * ds, ph[2] * ds], lee: ds < 0 };
}
// S1: the phase moved along the wind by a noise of the across-wind coordinate only; a stoss rise, a 32 deg slip
// face from the brink (the swell's along-wind slope added back), the brink a smooth min over 2 m, the toe a smooth max
// over 0.15 of the face; H = min(32 amp, 0.13 lambda_local)
const TAN32 = Math.tan(32 * Math.PI / 180);
function waveS1(x, y, lam, Hmax, swell, Hs) {
  const s = x * pp[0] + y * pp[1];   // (the across-wind coordinate)
  const d1 = gnd(s / 340, 3.7), d2 = gnd(s / 95, 11.3);   // (a slice of the noise: its x a function of s alone)
  const D = lam * (0.42 * d1[0] + 0.13 * d2[0]), dD = lam * (0.42 * d1[1] / 340 + 0.13 * d2[1] / 95);
  const ph = (x * w[0] + y * w[1] + D) / lam, gph = [(w[0] + dD * pp[0]) / lam, (w[1] + dD * pp[1]) / lam];
  const k = Math.hypot(gph[0], gph[1]);   // (cycles a metre: 1 / the local wavelength)
  const Hc = 0.13 / k, H = smin(Hmax, [Hc, 0, 0], 2.0);   // (a smooth cap: its slope continuous, so the face's m and fl are)
  // the face's own slope m (along g, the phase's direction) such that the whole surface's steepest descent on the face
  // is 32 deg: |G - m g| = tan 32, G the slope of everything else there (the swell, and the height's change along the
  // crest, taken at the face's middle): m = G.g + sqrt(tan^2 32 - |G across g|^2)
  const gx = gph[0] / k, gy = gph[1] / k;
  // (the face's height H (1 - f) / fl is m (1 - f) / k: H drops out of it, so its slope holds no dH, and m is solved
  // for the ground under it alone (G0); solving it for G0 + dH too held a gradient the surface does not have at 32 deg,
  // and where fl changed fast across the wind the brink turned along it in walls of 48-62 deg)
  const mAt = (Gx, Gy) => { const Gg = Gx * gx + Gy * gy, Gc = -Gx * gy + Gy * gx; return Gg + Math.sqrt(Math.max(TAN32 * TAN32 - Gc * Gc, 0.04)); };
  const m = mAt(swell[1], swell[2]);
  let fl = H[0] * k / Math.max(m, 0.2); const flr = fl; fl = Math.min(0.6, Math.max(0.04, fl));
  // (the hub's round 2: the face's height H (1 - f) / fl carries (1 - f) d(H / fl) too. Unclamped, H / fl = m / k: it
  // changes with the phase's direction across the wind (the slices' second derivatives) and with the swell's slope (its
  // second derivatives Hs, gndH: exact, not differences); clamped, dH / fl)
  const d1s = gndH(s / 340, 3.7)[0], d2s = gndH(s / 95, 11.3)[0];   // (the slices' own second derivatives)
  const dDs = 0.42 * d1s / (340 * 340) + 0.13 * d2s / (95 * 95);   // (d/ds of the phase's gradient, along pp, per lam)
  const dph = [dDs * pp[0], dDs * pp[1]], dk = gx * dph[0] + gy * dph[1], dgx = (dph[0] - gx * dk) / k, dgy = (dph[1] - gy * dk) / k;
  const G0x = swell[1], G0y = swell[2], c = -G0x * gy + G0y * gx, dc = -G0x * dgy + G0y * dgx, rad = TAN32 * TAN32 - c * c;
  const dm = G0x * dgx + G0y * dgy + (rad > 0.04 ? -c * dc / Math.sqrt(rad) : 0);
  const dQs = (m > 0.2 ? dm : 0) / k - Math.max(m, 0.2) * dk / (k * k);
  const dQ = flr < 0.04 || flr > 0.6 ? [H[1] / fl, H[2] / fl] : [dQs * pp[0], dQs * pp[1]];
  if (!(flr < 0.04 || flr > 0.6) && m > 0.2) { const q = rad > 0.04 ? -c / Math.sqrt(rad) : 0, vx = gx - q * gy, vy = gy + q * gx; dQ[0] += (Hs[0] * vx + Hs[1] * vy) / k; dQ[1] += (Hs[1] * vx + Hs[2] * vy) / k; }
  const f = ph - Math.floor(ph);
  const st = (t) => { const v = 0.5 * t + 0.5 * t * t * (3 - 2 * t), dv = 0.5 + 3 * t * (1 - t); return [v, dv]; };   // (the stoss, 0 .. 1 over t 0 .. 1)
  const L = 1 - fl;
  const lin = (v, dvdf) => [H[0] * v, H[0] * dvdf * gph[0] + v * H[1], H[0] * dvdf * gph[1] + v * H[2]];
  const a = st(f / L), A = lin(a[0], a[1] / L);   // (the stoss)
  const F = [H[0] * (1 - f) / fl, -H[0] / fl * gph[0] + (1 - f) * dQ[0], -H[0] / fl * gph[1] + (1 - f) * dQ[1]];   // (the slip face, the plane from the brink at 1 - fl to the toe at 1: no dH, see m)
  const N = lin(0.5 * (f - 1) / L, 0.5 / L);   // (the next stoss, below its toe: its plane there, C1 at the toe; the cubic turned up behind it and,
  // past f 0.5 on wide faces, rose into the smooth max: the land stepped 1.9 m where the toe's choice switched)
  const P = [-H[0] * f / fl, -H[0] / fl * gph[0] - f * dQ[0], -H[0] / fl * gph[1] - f * dQ[1]];   // (the face before, below its toe: the same)
  const kb = Math.max(H[0] * k * (0.5 / L + 1 / fl), 0.05), kt = Math.max(0.15 * H[0], 0.05);   // (the brink rounded over 2 m across)
  const top = smin(A, F, kb), h = f > 0.5 ? smax(top, N, kt) : smax(top, P, kt);
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return [t * t * (3 - 2 * t), 6 * t * (1 - t) / (b - a)]; };
  const e1 = ss(L - 0.06, L, f), e2 = ss(0, 0.06, f);   // (the near family's share: none on the slip face, eased in and out)
  const wv = (1 - e1[0]) * e2[0], dw = -e1[1] * e2[0] + (1 - e1[0]) * e2[1];
  const nearW = [wv, dw * gph[0], dw * gph[1]];
  return { h, lee: f > L - 0.02, f, fl, nearW, ph, gph, H: H[0], dH: [H[1], H[2]], dQ };
}
/* (physics: sand/S2) the slope the land's fragments rebuild from the phase (dunes-glsl's s1Slope): duneS1's pieces and
   their slopes, dH where duneS1 has it (the stoss and the next stoss), the faces' d(H / fl) dQ, the brink's and the
   toe's rounding rb, rt */
export function s1Slope(f, g, H, fl, rb, rt, dH = [0, 0], dQ = [0, 0]) {
  const L = 1 - fl, a = f / L, n = (f - 1) / L, sa = 0.5 * a + 0.5 * a * a * (3 - 2 * a), da = (0.5 + 3 * a * (1 - a)) / L;
  const A = [H * sa, g[0] * H * da + sa * dH[0], g[1] * H * da + sa * dH[1]], F = [H * (1 - f) / fl, -g[0] * H / fl + (1 - f) * dQ[0], -g[1] * H / fl + (1 - f) * dQ[1]];
  const N = [H * 0.5 * n, g[0] * H * 0.5 / L + 0.5 * n * dH[0], g[1] * H * 0.5 / L + 0.5 * n * dH[1]], P = [-H * f / fl, -g[0] * H / fl - f * dQ[0], -g[1] * H / fl - f * dQ[1]];
  const r = smax(smin(A, F, rb), f > 0.5 ? N : P, rt);
  return [r[1], r[2]];
}
export const s1Rb = (H, k, fl) => Math.max(H * k * (0.5 / (1 - fl) + 1 / fl), 0.05);
/* the main wave alone at (x, y) in wind angle a, its swell and height as dunes() makes them (the S1 model) */
export function mainAt(x, y, a = 0.6) {
  w = [Math.cos(a), Math.sin(a)]; pp = [-w[1], w[0]]; Ma = [w[0] / 420, pp[0] / 190, w[1] / 420, pp[1] / 190];
  const swell = add(sc(dNs(x, y, 1 / 760), 40), sc(dNm(x + 311, y - 97, M1), 15));
  const amp = add(sc(sstep(-0.42, 0.3, dNm(x + 400, y + 400, Ma)), 0.75), [0.25, 0, 0]);
  return waveS1(x, y, 205, sc(amp, 32), swell, swellH(x, y));
}
/* the dunes' land over the swell they stand on at (x, y) in wind angle a: the main wave and the near family, as
   dunes() makes them (the mist pools' floor is the swell: test/unit/mist.mjs) */
export function overSwell(x, y, a = 0.6) {
  w = [Math.cos(a), Math.sin(a)]; pp = [-w[1], w[0]]; Ma = [w[0] / 420, pp[0] / 190, w[1] / 420, pp[1] / 190];
  const g0 = dNs(x, y, 1 / 760), g1 = dNm(x + 311, y - 97, M1);
  return dunes(x, y).h[0] - (40 * g0[0] + 15 * g1[0]);
}
/* the land's height at (x, y) in wind angle a, as dunes() makes it (tools/physics/lod-pop.mjs) */
export function landAt(x, y, a = 0.6) { w = [Math.cos(a), Math.sin(a)]; pp = [-w[1], w[0]]; Ma = [w[0] / 420, pp[0] / 190, w[1] / 420, pp[1] / 190]; return dunes(x, y).h[0]; }
function dunes(x, y) {
  const g0 = dNs(x, y, 1 / 760), g1 = dNm(x + 311, y - 97, M1);
  const swell = add(sc(g0, 40), sc(g1, 15));
  const amp = add(sc(sstep(-0.42, 0.3, dNm(x + 400, y + 400, Ma)), 0.75), [0.25, 0, 0]);
  let main, lee;
  if (MODEL === 'old') {
    const warp = add(sc(dNs(x, y, 1 / 340), 0.42), sc(dNs(x + 71, y + 71, 1 / 95), 0.13));
    const r = waveOld(x, y, w, 205, 0.68, warp); main = sc(mul(r.h, amp), 32); lee = r.lee;
  } else {
    const r = waveS1(x, y, 205, sc(amp, 32), swell, swellH(x, y)); main = r.h; lee = r.lee; var nearW = r.nearW;
  }
  // the near family (64 m), as today (x0.6 and kept off the slip face in S1)
  const w2 = (() => { const v = [w[0] + 1.3 * pp[0], w[1] + 1.3 * pp[1]], l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l]; })();
  const warp2 = sc(dNs(x + 37 + 9, y + 37 + 9, 1 / 80), 0.25);
  const s2 = waveOld(x + 37, y + 37, w2, 64, 0.7, warp2).h;
  let near = sc(mul(s2, sstep(-0.5, 0.4, dNs(x + 900, y + 900, 1 / 160))), 4);
  if (MODEL !== 'old') near = sc(mul(near, nearW), 0.6);
  return { h: add(add(swell, main), near), mainGrad: main, lee };
}

const E = 0.25;
export function census(o = {}) {
  MODEL = o.model || MODEL; HALF = o.half || HALF; CELL = o.cell || CELL;
  if (o.wind !== undefined) { w = [Math.cos(o.wind), Math.sin(o.wind)]; pp = [-w[1], w[0]]; Ma = [w[0] / 420, pp[0] / 190, w[1] / 420, pp[1] / 190]; }
  const n = Math.round(2 * HALF / CELL) + 1, st = [], le = [];
  let over34 = 0, total = 0, steepest = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -HALF + i * CELL, y = -HALF + j * CELL, r = dunes(x, y);
    // (fd: the slope from the heights themselves, central differences over 2 E: what the surface is, whatever the gradient the code carries says)
    const g = o.fd ? [(dunes(x + E, y).h[0] - dunes(x - E, y).h[0]) / (2 * E), (dunes(x, y + E).h[0] - dunes(x, y - E).h[0]) / (2 * E)] : [r.h[1], r.h[2]];
    const deg = Math.atan(Math.hypot(g[0], g[1])) * 180 / Math.PI;
    total++; if (deg > 34) over34++; if (deg > steepest) steepest = deg;
    (r.lee ? le : st).push(deg);
  }
  const pc = (a, q) => a[Math.min(a.length - 1, Math.floor(q * a.length))];
  st.sort((a, b) => a - b); le.sort((a, b) => a - b);
  const hist = new Array(60).fill(0); for (const d of le) if (d >= 15) hist[Math.min(59, Math.floor(d))]++;
  const mode = hist.indexOf(Math.max(...hist));
  const out = { model: MODEL, points: total, stoss: { p50: +pc(st, 0.5).toFixed(1), p90: +pc(st, 0.9).toFixed(1), share: +(st.length / total).toFixed(3) },
    lee: { p50: +pc(le, 0.5).toFixed(1), p99: +pc(le, 0.99).toFixed(1), mode_deg: mode, share: +(le.length / total).toFixed(3) },
    over34_pct: +(100 * over34 / total).toFixed(2), steepest_deg: +steepest.toFixed(1) };
  return out;
}
if (MAIN) console.log(JSON.stringify(census()));
