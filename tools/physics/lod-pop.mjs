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
import { landAt } from './dune-census.mjs';
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
  return { inner: +m[1], band: +m[2], GN: +gn[1], g0: +def[1], levels: +def[2], morph, rule: nest ? 'nest' : down ? 'down' : 'off', step: STEP[nest ? 'nest' : 'down'] };
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
  const S = clipmapSpec(), sec = +(A.seconds || 60), N = +(A.points || 1500);
  for (const [name, o] of [['flight 1 (wind 0.6, from 0, 0)', { a0: 0.3, x0: 0, z0: 0 }], ['flight 2 (from 4000, -2500, heading 2.1)', { a0: 2.1, x0: 4000, z0: -2500 }]]) {
    for (const [label, s] of [['shipped (' + S.rule + ')', S], ['morph off', { ...S, morph: false }], ['the rule before (c - 1)', { ...S, rule: 'down', step: STEP.down }]]) {
      const r = fly(s, (x, z) => landAt(x, z, 0.6), { ...o, seconds: sec, points: N, log: A.log });
      console.log(JSON.stringify({ flight: name, case: label, ...r }));
    }
  }
}
