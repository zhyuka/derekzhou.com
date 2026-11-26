// test/unit/duneshadow.mjs: the dunes' cast shadows (physics: sand/cast-shadow; the sand row "cast shadows"; the owner,
// 2026-11-15: "No, natural light is fine"). At the realm's low key (5-14 deg, within 55 deg of upwind) a brink casts
// its shadow past its slip face's toe, over the floor and up the next stoss: dunes-glsl's castShade, run here from the
// shader's own text. Across a brink the share is continuous (the hub's review of #519: a thin dark line ran behind a
// lit crest, seed 5), level ground far from any brink takes none, the shadow reaches as far as the brink's ray does
// (tools/physics/dune-shadow.mjs), and on ground falling away from the sun the brink before the nearest shades the
// next stoss's top on through the brink. And it does not crawl (the hub's ruling on #519: shimmer cannot tell a crisp
// edge's motion from crawl, so crawl is tested directly): fixed world points on the near, middle and far ground, the eye
// flown at 60 Hz, the shadow read at each point every frame with every input as the shader gets it (vSG through the
// clipmap's morphing rings, the 3 px pixel term, the far fade B).
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "smoothstep(-pw, pw, sd) * smoothstep(rw, 2.0 * rw, tb)", "with": "smoothstep(-pw, pw, sd)", "why": "the nearest brink's shadow from its very crest: a dark line behind the lit, rounded brink (seed 5's seam)"}
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "  for (int i = 0; i < 2; i++) {\n    float dp", "with": "  for (int i = 0; i < 1; i++) {\n    float dp", "why": "only the nearest brink: on ground falling away from the sun the shadow over a stoss's top stops dead at its brink"}
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "float sd = H - hf + gb * tb - tb * te,", "with": "float sd = H - hf - tb * te,", "why": "the ground under the dunes left level: the swell's slope toward the sun never lifts or sinks the brink"}
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": " * (1.0 - smoothstep(1.0, 2.0, dp)));", "with": ");", "why": "the brink 2 back counted in full before a crest and not past it: where the swell rises toward the sun faster than its ray, a step at every brink"}
// plant: {"file": "src/world/350-shaders-scene.js", "find": "dot(vSG, sh)", "with": "dot(-vN.xz - vS1g.yz, sh)", "why": "the ground's slope from the morphing vertices (the small dunes in it): the shadow's end swings as the eye moves (the crawl test catches it)"}
// plant: {"file": "src/world/350-shaders-scene.js", "find": "gCS = B * castShade(", "with": "gCS = 0.0 * castShade(", "why": "no cast shadow drawn"}
import { test, assert, fs, path, ROOT } from '../unit-lib.mjs';

const R = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const DG = R('src/glsl/dunes-glsl.glsl'), SC = R('src/world/350-shaders-scene.js'), DEG = Math.PI / 180;
// castShade, cut from the shader and run as JS (its GLSL is scalar: float -> let, the loop's int -> let)
const src = /float castShade\([^)]*\) \{[\s\S]*?\n\}\n/.exec(DG);
assert.ok(src, 'dunes-glsl has no castShade');
const js = src[0].replace(/^float castShade\(([^)]*)\)/, (m, a) => `function castShade(${a.replace(/float /g, '')})`)
  .replace(/for \(int /g, 'for (let ').replace(/float\(i\)/g, 'i').replace(/\bfloat /g, 'let ');
const smoothstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const castShade = new Function('smoothstep', 'max', 'min', `${js}; return castShade;`)(smoothstep, Math.max, Math.min);

// one main dune as duneS1 builds it: wavelength lam, height H, the slip face at 32 deg (fl = H k / tan 32)
function dune(H, lam = 205) { const k = 1 / lam, fl = Math.min(Math.max(H * k / Math.tan(32 * DEG), 0.04), 0.6); return { k, fl, L: 1 - fl }; }
const share = (H, f, eDeg, daDeg, gb = 0, fp = 0.3, lam = 205) => {
  const D = dune(H, lam), r = -D.k * Math.cos(daDeg * DEG);
  return castShade(f, D.L, D.fl, H, D.k, r, gb, Math.tan(eDeg * DEG), fp);
};

test('dune shadow: continuous across the brink, at every key and dune', () => {
  let worst = 0, at = '';
  for (const H of [8, 16, 24, 32]) for (const e of [5, 8, 11, 14]) for (const da of [0, 30, 55]) for (const gb of [-0.1, 0, 0.1, 0.2]) for (const fp of [0.05, 0.3, 1.5]) {
    const { L } = dune(H);
    let prev = share(H, L - 0.03, e, da, gb, fp);
    for (let f = L - 0.03 + 5e-5; f <= L + 0.03; f += 5e-5) {   // (5e-5 of 205 m: a centimetre)
      const s = share(H, f, e, da, gb, fp), d = Math.abs(s - prev); prev = s;
      if (d > worst) { worst = d; at = `H ${H} e ${e} da ${da} gb ${gb} fp ${fp} f-L ${(f - L).toFixed(5)}`; }
    }
  }
  assert.ok(worst < 0.05, `the shadow's share jumps ${worst.toFixed(3)} in a centimetre across a brink (${at})`);
});

test('dune shadow: none on level ground far from any brink, none with the sun downwind', () => {
  for (const e of [5, 8, 11, 14]) for (let f = 0; f < 1; f += 0.01) assert.equal(share(0, f, e, 0), 0, `level ground (no dune) shadowed at f ${f.toFixed(2)}, e ${e}`);
  // an 8 m dune at a 14 deg key: its shadow ends 32 m past the brink (tools/physics/dune-shadow.mjs); 100 m on, none
  const { L, k } = dune(8); assert.equal(share(8, (L + 100 * k) % 1, 14, 0), 0, 'the stoss 100 m past an 8 m brink shadowed at a 14 deg key');
  // the sun from downwind: no brink between it and the lee (castShade is called only with r < 0; the land skips it)
  assert.match(SC, /if \(r < -1e-4 && uSun\.y > 0\.0 && B > 0\.0 && dot\(n, uSun\) > -0\.08\) gCS = B \* castShade\(/, 'the land does not call castShade only for a sun from upwind, by day, where the dunes are resolved');
  // the ground's slope the swell's own (world-fixed), not the land's vertex slope (the small dunes in it, and the rings' morph)
  assert.match(SC, /castShade\([^;]*dot\(vSG, sh\)/, 'the land does not hand castShade the swell\'s own slope (vSG)');
  assert.equal((SC.match(/vSG = swellG\(w\);/g) || []).length, 2, 'both of the land\'s vertex paths do not set vSG from swellG');
});

test('dune shadow: reaches as far as the brink\'s ray (the numbers)', () => {
  // the floor past the toe: on level ground, a 16 m brink at a 5 deg key shadows the floor to 120 m and 45 m up the next
  // stoss (dune-shadow.mjs: 46% of the wavelength past the toe); at 14 deg it ends near 64 m
  const { L, k } = dune(16), at = (m) => share(16, (L + m * k) % 1, 5, 0);
  assert.ok(at(60) > 0.95, `the floor 60 m past a 16 m brink at a 5 deg key is not in its shadow (${at(60).toFixed(2)})`);
  assert.ok(at(180) < 0.05, `the next stoss 180 m past a 16 m brink at 5 deg is still shadowed (${at(180).toFixed(2)})`);
  const at14 = (m) => share(16, (L + m * k) % 1, 14, 0);
  assert.ok(at14(40) > 0.95 && at14(90) < 0.05, `a 14 deg key's shadow of a 16 m brink is not about 64 m long (40 m: ${at14(40).toFixed(2)}, 90 m: ${at14(90).toFixed(2)})`);
});

test('dune shadow: on ground falling away from the sun the brink before shades the next stoss\'s top through its brink', () => {
  // gb 0.2 toward the sun (the swell falling 11 deg downwind) at a 6 deg key: the brink before stands 41 m over the next
  const H = 16, { L } = dune(H), before = share(H, L - 0.001, 6, 0, 0.2), after = share(H, L + 0.001, 6, 0, 0.2);
  assert.ok(before > 0.95, `the stoss's top under the brink before is not in its shadow (${before.toFixed(2)})`);
  assert.ok(after > 0.95, `past the brink the shadow of the brink before stops (${after.toFixed(2)}): it cuts off at the crest`);
});

test('dune shadow: no crawl at cruise: a fixed point changes under 1/255 a frame; the morph moves an edge under 2 cm a frame', async () => {
  const L = await import('../../tools/physics/lod-pop.mjs'), C = await import('../../tools/physics/dune-census.mjs');
  const S = L.clipmapSpec(ROOT), A = 0.6, w = [Math.cos(A), Math.sin(A)];
  // the ground's slope the land hands castShade, read from the shader: the swell's own per vertex (vSG), or the morphing
  // vertex slope (the land's less the main dune's)
  const fromVSG = /castShade\([^;]*dot\(vSG, sh\)/.test(SC), fromVertex = /castShade\([^;]*dot\(-vN\.xz - vS1g\.yz, sh\)/.test(SC);
  assert.ok(fromVSG || fromVertex, 'the land hands castShade a ground slope this test does not know');
  const inp = new Map(), at = (x, z) => { const k = x.toFixed(3) + ',' + z.toFixed(3); let v = inp.get(k); if (!v) { v = C.shadowInputs(x, z, A); inp.set(k, v); } return v; };
  const field = fromVSG ? (x, z) => at(x, z).swell : (x, z) => { const v = at(x, z); return [v.land[0] - v.main[0], v.land[1] - v.main[1]]; };
  // the field as the fragment gets it: at the ring's vertices, placed and morphed as VS_TERRAIN does, across the triangle
  // over the point (lod-pop's drawnAt, for a vector)
  function drawnField(cx, cz, px, pz) {
    const half = S.GN / 2;
    for (let l = 0; l < S.levels; l++) {
      const g = S.g0 * Math.pow(2, l), ox = Math.floor(cx / (2 * g)) * 2 - half, oz = Math.floor(cz / (2 * g)) * 2 - half, fi = px / g - ox, fj = pz / g - oz;
      if (fi < 0 || fj < 0 || fi >= S.GN || fj >= S.GN) continue;
      const vert = (i, j) => { const c0 = ox + i, c1 = oz + j, d = Math.max(Math.abs(c0 * g - cx), Math.abs(c1 * g - cz)), m = S.morph ? Math.min(1, Math.max(0, (d - (half - S.inner) * g) / (S.band * g))) : 0, x = (c0 + S.step(c0) * m) * g, z = (c1 + S.step(c1) * m) * g; return [x, z, field(x, z)]; };
      const ci = Math.floor(fi), cj = Math.floor(fj);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= S.GN || j >= S.GN) continue;
        const a = vert(i, j), b = vert(i + 1, j), c = vert(i, j + 1), dd = vert(i + 1, j + 1);
        for (const [p0, p1, p2] of ((i + j) & 1) === 0 ? [[a, c, b], [b, c, dd]] : [[a, c, dd], [a, dd, b]]) {
          const det = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1]); if (Math.abs(det) < 1e-12) continue;
          const u = ((p1[1] - p2[1]) * (px - p2[0]) + (p2[0] - p1[0]) * (pz - p2[1])) / det, v = ((p2[1] - p0[1]) * (px - p2[0]) + (p0[0] - p2[0]) * (pz - p2[1])) / det, q = 1 - u - v;
          if (u < -1e-9 || v < -1e-9 || q < -1e-9) continue;
          return [0, 1].map((k) => u * p0[2][k] + v * p1[2][k] + q * p2[2][k]);
        }
      }
    }
    return field(px, pz);
  }
  // the key: 8 deg up, 30 deg off upwind (the realm's 5-14 deg within 55); the eye 14 m over the land, at 12 m/s down the
  // wind (the opening's heading), the laptop's frame (1800 px over tan 0.454)
  const e = 8 * Math.PI / 180, az = Math.PI + 30 * Math.PI / 180, sh = [Math.cos(A + az), Math.sin(A + az)], te = Math.tan(e), F = 1800 / (2 * 0.454);
  const shade = (px, pz, eye, sg) => {   // gCS at a ground point: S1_FS's B, castShade with the frame's inputs
    const v = at(px, pz), s1 = v.s1, k = Math.hypot(s1.gph[0], s1.gph[1]), r = s1.gph[0] * sh[0] + s1.gph[1] * sh[1];
    if (!(r < -1e-4)) return 0;
    const dx = px - eye[0], dz = pz - eye[2], dy = v.h - eye[1], t = Math.hypot(dx, dy, dz), fp = t / F, rh = [dx / Math.hypot(dx, dz), dz / Math.hypot(dx, dz)];
    const n = [-v.land[0], 1, -v.land[1]], nl = Math.hypot(...n), ndr = Math.abs((n[0] * dx + n[1] * dy + n[2] * dz) / (nl * t));
    const cp = fp * Math.hypot((s1.gph[0] * rh[0] + s1.gph[1] * rh[1]) / Math.max(ndr, 0.02), s1.gph[0] * -rh[1] + s1.gph[1] * rh[0]), B = 1 - smoothstep(0.25, 0.5, cp);
    if (B <= 0) return 0;
    return B * castShade(s1.f, 1 - s1.fl, s1.fl, s1.H, k, r, sg[0] * sh[0] + sg[1] * sh[1], te, fp);
  };
  const x0 = 1200, z0 = -700, v0 = 12, eyeAt = (t) => { const x = x0 + w[0] * v0 * t, z = z0 + w[1] * v0 * t; return [x, at(x, z).h + 14, z]; };
  // the points: on the line ahead, near (60-120 m), middle (200-320 m) and far (600-800 m): a stoss, a lee toe and an
  // interdune point each (by the main dune's phase), and the band's first 6 shadow edges (gCS through 0.5)
  const bands = { near: [60, 160], middle: [200, 400], far: [600, 1000] }, eye0 = eyeAt(0), pts = [], edges = [];
  for (const [name, [d0, d1]] of Object.entries(bands)) {
    const want = { stoss: (f, Lb) => Math.abs(f - 0.5 * Lb) < 0.02, toe: (f) => f > 0.005 && f < 0.03, interdune: (f) => f > 0.08 && f < 0.15 }, got = {};
    let prev = null;
    for (let d = d0; d < d1; d += 0.5) {
      const px = x0 + w[0] * d, pz = z0 + w[1] * d, s1 = at(px, pz).s1;
      for (const [kind, ok] of Object.entries(want)) if (!got[kind] && ok(s1.f, 1 - s1.fl)) { got[kind] = 1; pts.push({ name, kind, px, pz }); }
      const g = shade(px, pz, eye0, field(px, pz));   // (the edges of the shadow the shader draws, with its own ground slope)
      if (prev !== null && edges.filter((q) => q.name === name).length < 6 && (prev - 0.5) * (g - 0.5) < 0) edges.push({ name, px, pz });
      prev = g;
    }
  }
  for (const b of Object.keys(bands)) assert.ok(edges.some((q) => q.name === b), `no shadow edge found in the ${b} band to watch`);
  const N = 300;   // (5 s at 60 Hz: 60 m of flight)
  // 1. a fixed point's shadow: every input as the shader gets it, each frame; the step a frame
  let worst = 0, wAt = '';
  for (const P of [...pts, ...edges]) {
    let last = null;
    for (let fr = 0; fr <= N; fr++) {
      const eye = eyeAt(fr / 60), g = shade(P.px, P.pz, eye, drawnField(eye[0], eye[2], P.px, P.pz));
      if (last !== null && Math.abs(g - last) > worst) { worst = Math.abs(g - last); wAt = `${P.name} ${P.kind || 'edge'} frame ${fr}`; }
      last = g;
    }
  }
  // 2. the morph alone: the edge's world position each frame with vSG as drawn and the eye-dependent pixel term and B held
  //    at frame 0 (bisection along the sun's way, 2 mm), its move a frame
  let worstMove = 0, mAt = '';
  for (const E of edges) {
    const eyeF = eyeAt(0), at1 = (s, eye) => { const px = E.px + sh[0] * s, pz = E.pz + sh[1] * s; return shade(px, pz, eyeF, drawnField(eye[0], eye[2], px, pz)); };
    let last = null;
    for (let fr = 0; fr <= N; fr += 2) {
      const eye = eyeAt(fr / 60); let lo = -3, hi = 3; const glo = at1(lo, eye) - 0.5;
      if (glo * (at1(hi, eye) - 0.5) > 0) continue;
      for (let it = 0; it < 12; it++) { const mid = 0.5 * (lo + hi); if ((at1(mid, eye) - 0.5) * glo > 0) lo = mid; else hi = mid; }
      const x = 0.5 * (lo + hi);
      if (last !== null && Math.abs(x - last) / 2 > worstMove) { worstMove = Math.abs(x - last) / 2; mAt = `${E.name} edge frame ${fr}`; }
      last = x;
    }
  }
  assert.ok(worst < 1 / 255, `a fixed point's shadow steps ${(worst * 255).toFixed(2)}/255 in a frame (${wAt}): it crawls`);
  assert.ok(worstMove < 0.02, `the morph moves a shadow's edge ${(worstMove * 100).toFixed(1)} cm a frame (${mAt}): it crawls`);
});

