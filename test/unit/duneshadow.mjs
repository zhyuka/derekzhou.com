// test/unit/duneshadow.mjs: the dunes' cast shadows (physics: sand/cast-shadow; the sand row "cast shadows"; the owner,
// 2026-11-15: "No, natural light is fine"). At the realm's low key (5-14 deg, within 55 deg of upwind) a brink casts
// its shadow past its slip face's toe, over the floor and up the next stoss: dunes-glsl's castShade, run here from the
// shader's own text. Across a brink the share is continuous (the hub's review of #519: a thin dark line ran behind a
// lit crest, seed 5), level ground far from any brink takes none, the shadow reaches as far as the brink's ray does
// (tools/physics/dune-shadow.mjs), and on ground falling away from the sun the brink before the nearest shades the
// next stoss's top on through the brink.
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "smoothstep(-pw, pw, sd) * smoothstep(rw, 2.0 * rw, tb)", "with": "smoothstep(-pw, pw, sd)", "why": "the nearest brink's shadow from its very crest: a dark line behind the lit, rounded brink (seed 5's seam)"}
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "  for (int i = 0; i < 2; i++) {\n    float dp", "with": "  for (int i = 0; i < 1; i++) {\n    float dp", "why": "only the nearest brink: on ground falling away from the sun the shadow over a stoss's top stops dead at its brink"}
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "float sd = H - hf + gb * tb - tb * te,", "with": "float sd = H - hf - tb * te,", "why": "the ground under the dunes left level: the swell's slope toward the sun never lifts or sinks the brink"}
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": " * (1.0 - smoothstep(1.0, 2.0, dp)));", "with": ");", "why": "the brink 2 back counted in full before a crest and not past it: where the swell rises toward the sun faster than its ray, a step at every brink"}
// plant: {"file": "src/world/350-shaders-scene.js", "find": "dot(swellG(vW.xz), sh)", "with": "dot(-vN.xz - vS1g.yz, sh)", "why": "the ground's slope from the morphing vertices (the small dunes in it): the shadow's end swings as the eye moves (shimmer)"}
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
  assert.match(SC, /if \(r < -1e-4 && uSun\.y > 0\.0 && B > 0\.0\) gCS = B \* castShade\(/, 'the land does not call castShade only for a sun from upwind, by day, where the dunes are resolved');
  // the ground's slope the swell's own (world-fixed), not the land's vertex slope (the small dunes in it, and the rings' morph)
  assert.match(SC, /castShade\([^;]*dot\(swellG\(vW\.xz\), sh\)/, 'the land does not hand castShade the swell\'s own slope (swellG)');
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
