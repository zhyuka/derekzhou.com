// lod-pop.mjs (tools/physics): does the land's level of detail ever pop? The clipmap as the page draws it, replayed in
// doubles: the rings (100's GN cells across, the land's g0 0.35 m doubling over 10 levels), each ring's origin snapped to
// its 2g lattice about the camera, its vertices morphed toward the coarser lattice over the band VS_TERRAIN gives (read
// from 350's source), its triangles cut as 100's index sets cut them, and heights from the dunes as the census port makes
// them. A camera flies 60 s at 12 m/s, 14 m over the land, 60 frames a second; at fixed world points in view (50-600 m
// ahead, in the laptop's frustum) the drawn height is read each frame, from the morphed triangle over the point in the
// finest ring that covers it. The land never moves, so a change from one frame to the next is the LOD's alone: printed as
// metres and as laptop pixels at that range (render 2880 x 1800, tanY 0.454), with the drawn normal's change as
// shading levels (255 |dn|: a bound on n.l's change under any light, in 8-bit codes before the albedo, which only lowers it).
//   node tools/physics/lod-pop.mjs [--seconds 60] [--points 1500] [--json 1]
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
import { landAt, landFull, s1Slope, s1Rb, setRoundNear } from './dune-census.mjs';
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
export function clipmapSpec(root = ROOT) {
  const vs = fs.readFileSync(path.join(root, 'src/world/350-shaders-scene.js'), 'utf8');
  const m = vs.match(/float m = clamp\(\(d - \(uLev\.w - ([0-9.]+)\) \* uLev\.z\) \/ \(([0-9.]+) \* uLev\.z\), 0\.0, 1\.0\);/);
  const gn = fs.readFileSync(path.join(root, 'src/world/100-clipmap-grid.js'), 'utf8').match(/var GN = (\d+);/);
  const def = fs.readFileSync(path.join(root, 'src/world/180-world-definition-two-kits-by.js'), 'utf8').match(/height: 'Hd'[^}]*g0: ([0-9.]+), levels: (\d+)/);
  if (!m || !gn || !def) throw new Error('lod-pop: the clipmap\'s morph, GN or levels not found in the source');
  /* where an odd vertex goes as it morphs, read from the shader's line: toward the coarse lattice's multiple of 4 cells
     (the shipped rule: the fine ring then lies on the coarse ring's own triangles, diagonals and all) or to c - 1 (the
     rule before: half the coarse cells' diagonals crossed, a pop at each ring's handoff) */
  const v0 = vs.indexOf('function VS_TERRAIN('), vt = vs.slice(v0, vs.indexOf('\n  }\n', v0));
  const nest = /w = \(c \+ mod\(c, 2\.0\) \* \(mod\(c, 4\.0\) - 2\.0\) \* m\) \* uLev\.z;/.test(vt), down = /w = \(c - mod\(aG, 2\.0\) \* m\) \* uLev\.z;/.test(vt);
  const morph = nest || down;   // (neither, and no other step: the vertices left on their own lattice, no morph)
  if (!morph && /\* m\) \* uLev\.z;/.test(vt)) throw new Error('lod-pop: VS_TERRAIN\'s morph step not recognised');
  // (S1_FS: the footprint's grazing term from the fragment's own slope (nc), or from the vertices' interpolated normal (n))
  const cpFix = /max\(abs\(dot\(nc, rd\)\), 0\.02\)/.test(vs), cpOld = /max\(abs\(dot\(n, rd\)\), 0\.02\)/.test(vs);
  if (!cpFix && !cpOld) throw new Error('lod-pop: S1_FS\'s footprint not recognised');
  // (dunes-glsl's duneWave: the near family's crest rounded over 2 m, or its kink left sharp)
  const roundNear = /if \(abs\(f - c\) < r\) \{/.test(fs.readFileSync(path.join(root, 'src/glsl/dunes-glsl.glsl'), 'utf8'));
  return { cpFix, roundNear, inner: +m[1], band: +m[2], GN: +gn[1], g0: +def[1], levels: +def[2], morph, rule: nest ? 'nest' : down ? 'down' : 'off', step: STEP[nest ? 'nest' : 'down'] };
}
export const STEP = { nest: (c) => { const r = ((c % 4) + 4) % 4; return (r & 1) * (r - 2); }, down: (c) => -(((c % 2) + 2) % 2) };

export function makeLand(H) {   // heights at lattice points, cached: every drawn vertex (morphed or not) is one
  const cache = new Map();
  return (x, z) => { const k = x.toFixed(4) + ',' + z.toFixed(4); let h = cache.get(k); if (h === undefined) { h = H(x, z); cache.set(k, h); if (cache.size > 4e6) cache.clear(); } return h; };
}
/* the drawn height and normal over (px, pz) with the camera at (cx, cz): the finest ring covering the point, the triangles
   of the cells about it with their vertices morphed as VS_TERRAIN morphs them, the one over the point */
export function drawnAt(S, land, cx, cz, px, pz) {
  const half = S.GN / 2;
  for (let l = 0; l < S.levels; l++) {
    const g = S.g0 * Math.pow(2, l), ox = Math.floor(cx / (2 * g)) * 2 - half, oz = Math.floor(cz / (2 * g)) * 2 - half;
    const fi = px / g - ox, fj = pz / g - oz;
    if (fi < 0 || fj < 0 || fi >= S.GN || fj >= S.GN) continue;   // (not in this ring: the next, coarser)
    const vert = (i, j) => {   // the ring's vertex (i, j), placed and morphed
      const c0 = ox + i, c1 = oz + j, d = Math.max(Math.abs(c0 * g - cx), Math.abs(c1 * g - cz));
      const m = S.morph ? Math.min(1, Math.max(0, (d - (half - S.inner) * g) / (S.band * g))) : 0;
      const x = (c0 + S.step(c0) * m) * g, z = (c1 + S.step(c1) * m) * g;
      const h = land(x, z), e = 0.05, n = [-(land(x + e, z) - land(x - e, z)) / (2 * e), 1, -(land(x, z + e) - land(x, z - e)) / (2 * e)];
      return [x, h, z, n];   // (the shading normal: VS_TERRAIN's vN, the height's own gradient at the placed vertex)
    };
    const ci = Math.floor(fi), cj = Math.floor(fj);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {   // (a morphed triangle can reach a neighbouring cell's ground)
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= S.GN || j >= S.GN) continue;
      const a = vert(i, j), b = vert(i + 1, j), c = vert(i, j + 1), dd = vert(i + 1, j + 1);
      const tris = ((i + j) & 1) === 0 ? [[a, c, b], [b, c, dd]] : [[a, c, dd], [a, dd, b]];
      for (const [p0, p1, p2] of tris) {
        const det = (p1[2] - p2[2]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[2] - p2[2]); if (Math.abs(det) < 1e-12) continue;
        const u = ((p1[2] - p2[2]) * (px - p2[0]) + (p2[0] - p1[0]) * (pz - p2[2])) / det, v = ((p2[2] - p0[2]) * (px - p2[0]) + (p0[0] - p2[0]) * (pz - p2[2])) / det, w = 1 - u - v;
        if (u < -1e-9 || v < -1e-9 || w < -1e-9) continue;
        const n = [0, 1, 2].map((q) => u * p0[3][q] + v * p1[3][q] + w * p2[3][q]), nl = Math.hypot(n[0], n[1], n[2]);   // (vN, interpolated, normalised as the fragment does)
        return { h: u * p0[1] + v * p1[1] + w * p2[1], n: [n[0] / nl, n[1] / nl, n[2] / nl], level: l };
      }
    }
  }
  return null;
}
/* a flight: the camera along heading a0 turning slowly, 14 m over the land; fixed points scattered in the corridor ahead.
   Each frame each point in view (50-600 m, in the laptop's half-width tan 0.727) is read; its change since the last frame
   it was read in view is the LOD's. Returns the worst and the percentiles (pixels, shading levels), and the handoffs' own worst: a pop is a step there, where the
   surface drawn over a point changes rings; inside one ring the morph is continuous in the camera's position */
export function fly(S, H, o = {}) {
  const sec = o.seconds || 60, fps = 60, v = 12, N = o.points || 1500, land = makeLand(H), F = 1800 / (2 * 0.454), x0 = o.x0 || 0, z0 = o.z0 || 0, a0 = o.a0 || 0;
  const path = (t) => { const a = a0 + 0.15 * Math.sin(t / 17), s = v * t; return [x0 + s * Math.sin(a0) + 30 * Math.sin(t / 11), z0 + s * Math.cos(a0) + 30 * Math.cos(t / 13) - 30, a]; };
  let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const pts = []; for (let k = 0; k < N; k++) { const s = rnd() * (v * sec + 600), off = (rnd() - 0.5) * 900; pts.push([x0 + s * Math.sin(a0) + off * Math.cos(a0), z0 + s * Math.cos(a0) - off * Math.sin(a0)]); }
  const last = new Array(N).fill(null), dpx = [], dn = []; let worst = { px: 0 }, reads = 0; const ho = { n: 0, px: 0, levels: 0 };
  for (let f = 0; f <= sec * fps; f++) {
    const [cx, cz, a] = path(f / fps), cy = land(cx, cz) + 14, fx = Math.sin(a), fz = Math.cos(a);
    for (let k = 0; k < N; k++) {
      const dx = pts[k][0] - cx, dz = pts[k][1] - cz, fwd = dx * fx + dz * fz, side = dx * fz - dz * fx;
      if (fwd < 50 || fwd > 600 || Math.abs(side) > 0.727 * fwd) { last[k] = null; continue; }
      const r = drawnAt(S, land, cx, cz, pts[k][0], pts[k][1]); if (!r) { last[k] = null; continue; }
      reads++;
      if (last[k]) {
        const dist = Math.hypot(dx, dz, r.h - cy), px = Math.abs(r.h - last[k].h) * F / dist;
        const lv = 255 * Math.hypot(r.n[0] - last[k].n[0], r.n[1] - last[k].n[1], r.n[2] - last[k].n[2]); dpx.push(px); dn.push(lv);
        if (r.level !== last[k].level) { ho.n++; ho.px = Math.max(ho.px, px); ho.levels = Math.max(ho.levels, lv); }   // (a handoff: the point drawn by the next ring since the last frame)
        if (px > worst.px) worst = { px, m: Math.abs(r.h - last[k].h), dist, level: r.level, was: last[k].level, frame: f, levels: 255 * Math.hypot(r.n[0] - last[k].n[0], r.n[1] - last[k].n[1], r.n[2] - last[k].n[2]) };
        if ((px > 0.5 || dn[dn.length - 1] > 2) && o.log) console.log(JSON.stringify({ f, k, px: +px.toFixed(2), sh: +dn[dn.length - 1].toFixed(2), dist: Math.round(dist), lv: r.level, was: last[k].level, dg: +(Math.max(Math.abs(dx), Math.abs(dz)) / (S.g0 * 2 ** r.level)).toFixed(1) }));
      }
      last[k] = r;
    }
  }
  dpx.sort((p, q) => p - q); dn.sort((p, q) => p - q);
  const pc = (arr, q) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(q * arr.length))] : 0;
  return { reads, steps: dpx.length, handoff: ho, px: { p50: pc(dpx, 0.5), p99: pc(dpx, 0.99), p9999: pc(dpx, 0.9999), max: dpx[dpx.length - 1] || 0 }, over_half_px: dpx.filter((p) => p > 0.5).length, levels: { p99: pc(dn, 0.99), p9999: pc(dn, 0.9999), max: dn[dn.length - 1] || 0 }, over_2_levels: dn.filter((q) => q > 2).length, worst };
}
if (process.argv[1] && url.fileURLToPath(import.meta.url) === process.argv[1]) {
  if (A.near) {   // the near family's crests (64 m, its own crest a kink in slope, 1 / 0.7 a cycle: no fragment rebuild)
    const S = clipmapSpec(), sec = +(A.seconds || 60), N = +(A.points || 800);
    for (const [name, o] of [['flight 1', { a0: 0.3 }], ['flight 2', { a0: 2.1, x0: 4000, z0: -2500 }]])
      for (const [sz, size] of [['laptop', [1800, 0.727, 0.454]], ['phone', [2556, 0.384, 0.832]]])
        for (const [cs, rn] of [['shipped (crest ' + (S.roundNear ? 'rounded over 2 m' : 'sharp') + ')', S.roundNear], ['the crest unrounded (before)', false]]) { console.log(JSON.stringify({ flight: name, size: sz, case: cs, ...flyBrink({ ...S, roundNear: rn }, { ...o, size, seconds: sec, points: N, near: true }) })); }
    process.exit(0);
  }
  if (A.brink) {
    const S = clipmapSpec(), sec = +(A.seconds || 60), N = +(A.points || 800);
    for (const [name, o] of [['flight 1', { a0: 0.3 }], ['flight 2', { a0: 2.1, x0: 4000, z0: -2500 }]])
      for (const [sz, size] of [['laptop', [1800, 0.727, 0.454]], ['phone', [2556, 0.384, 0.832]]])
        for (const [cs, SS] of [['shipped (' + (S.cpFix ? 'the fragment\'s slope' : 'the vertices\' normal') + ')', S], ['cp from the vertices\' normal (before)', { ...S, cpFix: false }]]) console.log(JSON.stringify({ flight: name, size: sz, case: cs, ...flyBrink(SS, { ...o, size, seconds: sec, points: N }) }));
    process.exit(0);
  }
  const S = clipmapSpec(), sec = +(A.seconds || 60), N = +(A.points || 1500);
  for (const [name, o] of [['flight 1 (wind 0.6, from 0, 0)', { a0: 0.3, x0: 0, z0: 0 }], ['flight 2 (from 4000, -2500, heading 2.1)', { a0: 2.1, x0: 4000, z0: -2500 }]]) {
    for (const [label, s] of [['shipped (' + S.rule + ')', S], ['morph off', { ...S, morph: false }], ['the rule before (c - 1)', { ...S, rule: 'down', step: STEP.down }]]) {
      const r = fly(s, (x, z) => landAt(x, z, 0.6), { ...o, seconds: sec, points: N, log: A.log });
      console.log(JSON.stringify({ flight: name, case: label, ...r }));
    }
  }
}

/* ---- the brinks: the shading a fixed point on a slip face's brink takes frame to frame, as FS_TERRAIN shades it.
   Each vertex carries the land's slope (vN, analytic) and the main dune's pieces (vS1: the phase unwrapped, its gradient,
   H; vS1g: fl and the slope s1Slope gives at the vertex; vS1d: dH, dQ); the fragment interpolates them, rebuilds the main
   dune's slope at its own phase (rounded over max(1, 0.5 wpx) x the vertex's rounding) and puts it in place of the
   vertices' as far as B (the band-limit by the phase's cycles a pixel spans) lets it: S1_FS, line for line */
export function makeLandFull(a = 0.6) {
  const cache = new Map();
  return (x, z) => {
    const k = x.toFixed(4) + ',' + z.toFixed(4); let v = cache.get(k); if (v) return v;
    const d = landFull(x, z, a), q = d.s1, g = q.gph, kk = Math.hypot(g[0], g[1]);
    v = { h: d.h[0], vN: [-d.h[1], 1, -d.h[2]], ph: q.ph, g, H: q.H, fl: q.fl, dH: q.dH, dQ: q.dQ,
      s: s1Slope(q.ph - Math.floor(q.ph), g, q.H, q.fl, s1Rb(q.H, kk, q.fl), Math.max(0.15 * q.H, 0.05), q.dH, q.dQ), f: q.ph - Math.floor(q.ph), nf: d.nearF, nA: d.nearA[0] };
    cache.set(k, v); if (cache.size > 3e6) cache.clear(); return v;
  };
}
export function fragAt(S, LF, cam, Fpx, px, pz) {
  const half = S.GN / 2, cx = cam[0], cz = cam[2];
  for (let l = 0; l < S.levels; l++) {
    const g = S.g0 * Math.pow(2, l), ox = Math.floor(cx / (2 * g)) * 2 - half, oz = Math.floor(cz / (2 * g)) * 2 - half;
    const fi = px / g - ox, fj = pz / g - oz;
    if (fi < 0 || fj < 0 || fi >= S.GN || fj >= S.GN) continue;
    const vert = (i, j) => {
      const c0 = ox + i, c1 = oz + j, d = Math.max(Math.abs(c0 * g - cx), Math.abs(c1 * g - cz));
      const m = S.morph ? Math.min(1, Math.max(0, (d - (half - S.inner) * g) / (S.band * g))) : 0;
      const x = (c0 + S.step(c0) * m) * g, z = (c1 + S.step(c1) * m) * g;
      return { x, z, d: LF(x, z) };
    };
    const ci = Math.floor(fi), cj = Math.floor(fj);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= S.GN || j >= S.GN) continue;
      const a = vert(i, j), b = vert(i + 1, j), c = vert(i, j + 1), e = vert(i + 1, j + 1);
      const tris = ((i + j) & 1) === 0 ? [[a, c, b], [b, c, e]] : [[a, c, e], [a, e, b]];
      for (const [p0, p1, p2] of tris) {
        const det = (p1.z - p2.z) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.z - p2.z); if (Math.abs(det) < 1e-12) continue;
        const u = ((p1.z - p2.z) * (px - p2.x) + (p2.x - p1.x) * (pz - p2.z)) / det, v = ((p2.z - p0.z) * (px - p2.x) + (p0.x - p2.x) * (pz - p2.z)) / det, w = 1 - u - v;
        if (u < -1e-9 || v < -1e-9 || w < -1e-9) continue;
        const I = (f) => u * f(p0.d) + v * f(p1.d) + w * f(p2.d);
        const h = I((q) => q.h), vN = [0, 1, 2].map((t) => I((q) => q.vN[t])), ph = I((q) => q.ph), gg = [I((q) => q.g[0]), I((q) => q.g[1])];
        const H = I((q) => q.H), flv = I((q) => q.fl), dH = [I((q) => q.dH[0]), I((q) => q.dH[1])], dQ = [I((q) => q.dQ[0]), I((q) => q.dQ[1])], sv = [I((q) => q.s[0]), I((q) => q.s[1])];
        // S1_FS
        const rd0 = [px - cam[0], h - cam[1], pz - cam[2]], dist = Math.hypot(...rd0), rd = rd0.map((t) => t / dist), fp = dist / Fpx;
        let nl = Math.hypot(...vN), n = vN.map((t) => t / nl);
        if (H > 0.01) {
          const k = Math.hypot(gg[0], gg[1]), fl = Math.min(0.6, Math.max(0.04, flv)), L = 1 - fl, rl = Math.hypot(rd[0] + 1e-6, rd[2]), rh = [(rd[0] + 1e-6) / rl, rd[2] / rl];
          let nc = n;   // (the normal cp's grazing term reads: the vertices' (shipped), or the fragment's own slope at the vertices' rounding (S.cpFix))
          if (S.cpFix) { const s0 = s1Slope(ph - Math.floor(ph), gg, H, fl, s1Rb(H, k, fl), Math.max(0.15 * H, 0.05), dH, dQ), m0 = [vN[0] - (s0[0] - sv[0]), 1, vN[2] - (s0[1] - sv[1])], l0 = Math.hypot(...m0); nc = m0.map((q) => q / l0); }
          const cp = fp * Math.hypot((gg[0] * rh[0] + gg[1] * rh[1]) / Math.max(Math.abs(nc[0] * rd[0] + nc[1] * rd[1] + nc[2] * rd[2]), 0.02), gg[0] * -rh[1] + gg[1] * rh[0]);
          const t = Math.min(1, Math.max(0, (cp - 0.25) / 0.25)), B = 1 - t * t * (3 - 2 * t);
          if (B > 0) {
            const wpx = 1.5 * cp / k, sB = H * k * (0.5 / L + 1 / fl);
            const s = s1Slope(ph - Math.floor(ph), gg, H, fl, Math.max(1, 0.5 * wpx) * sB, Math.max(Math.max(0.15 * H, 0.05), 0.5 * wpx * sB), dH, dQ);
            const m = [vN[0] - B * (s[0] - sv[0]), 1, vN[2] - B * (s[1] - sv[1])]; nl = Math.hypot(...m); n = m.map((q) => q / nl);
          }
        }
        return { h, n, level: l, dist};
      }
    }
  }
  return null;
}
/* fixed points on the brinks (within 2 m of 1 - fl across the face's phase) in the corridor the flight looks into; each
   frame each in view is shaded; its change since the last frame it was in view, 255 |dn| (a bound on n.l's change under
   any light, in 8-bit codes before the albedo). size: [px high, tanX, tanY] (laptop 1800, 0.727, 0.454; phone 2556,
   0.384, 0.832: AIR_GALV's two views) */
export function flyBrink(S, o = {}) {
  if (S.roundNear !== undefined) setRoundNear(S.roundNear);   // (the port's near crest as the shader draws it)
  const sec = o.seconds || 60, fps = 60, v = 12, N = o.points || 800, a = o.wind ?? 0.6, LF = makeLandFull(a), x0 = o.x0 || 0, z0 = o.z0 || 0, a0 = o.a0 || 0;
  const [hpx, tanX, tanY] = o.size || [1800, 0.727, 0.454], Fpx = hpx / (2 * tanY);
  const path = (t) => { const aa = a0 + 0.15 * Math.sin(t / 17), s = v * t; return [x0 + s * Math.sin(a0) + 30 * Math.sin(t / 11), z0 + s * Math.cos(a0) + 30 * Math.cos(t / 13) - 30, aa]; };
  let seed = 4242; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const pts = []; let tries = 0;
  while (pts.length < N && tries < N * 400) {
    tries++; const s = rnd() * (v * sec + 600), off = (rnd() - 0.5) * 900, x = x0 + s * Math.sin(a0) + off * Math.cos(a0), z = z0 + s * Math.cos(a0) - off * Math.sin(a0);
    const q = LF(x, z); if (o.near ? q.nA > 0.4 && Math.abs(q.nf - 0.7) * 64 < 1 : q.H > 2 && Math.abs(q.f - (1 - q.fl)) * 205 < 2) pts.push([x, z]);
  }
  const last = new Array(N).fill(null), per = pts.map(() => [0, 0]), all = []; let worst = { lv: 0 };
  for (let f = 0; f <= sec * fps; f++) {
    const [cx, cz, aa] = path(f / fps), cy = LF(cx, cz).h + 14, fx = Math.sin(aa), fz = Math.cos(aa);
    for (let k = 0; k < pts.length; k++) {
      const dx = pts[k][0] - cx, dz = pts[k][1] - cz, fwd = dx * fx + dz * fz, side = dx * fz - dz * fx;
      if (fwd < 50 || fwd > 600 || Math.abs(side) > tanX * fwd) { last[k] = null; continue; }
      const r = fragAt(S, LF, [cx, cy, cz], Fpx, pts[k][0], pts[k][1]); if (!r) { last[k] = null; continue; }
      if (last[k]) {
        const lv = 255 * Math.hypot(r.n[0] - last[k].n[0], r.n[1] - last[k].n[1], r.n[2] - last[k].n[2]);
        all.push(lv); per[k][0]++; if (lv > 2) per[k][1]++;
        if (lv > worst.lv) worst = { lv, dist: r.dist, level: r.level, was: last[k].level, frame: f };
      }
      last[k] = r;
    }
  }
  all.sort((p, q) => p - q);
  const pc = (q) => all.length ? all[Math.min(all.length - 1, Math.floor(q * all.length))] : 0, seen = per.filter((p) => p[0] > 0);
  const frac = seen.map((p) => p[1] / p[0]).sort((p, q) => p - q);
  return { points: pts.length, steps: all.length, levels: { p50: pc(0.5), p99: pc(0.99), p9999: pc(0.9999), max: all[all.length - 1] || 0 },
    over2: all.filter((q) => q > 2).length, over2_frac: all.filter((q) => q > 2).length / Math.max(1, all.length),
    worst_point_frac: frac[frac.length - 1] || 0, points_over_0p1pct: frac.filter((q) => q > 0.001).length, worst };
}
