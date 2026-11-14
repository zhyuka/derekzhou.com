// test/unit/aurora.mjs: the aurora's colour (aurora-colour): its ramp in sky-body.glsl keeps its chroma, and over the
// aurora sky's own low stops it composites green, not cyan
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "    vec3 col = mix(mix(vec3(0.225, 1.5, 0.18), vec3(1.006, 0.487, 0.098), clamp(2.0 * t, 0.0, 1.0)), vec3(0.85, 0.25, 0.55), clamp(2.0 * t - 1.0, 0.0, 1.0));", "with": "    vec3 col = mix(vec3(0.25, 1.0, 0.55), vec3(0.85, 0.25, 0.55), t);", "why": "the old two-stop mix between near-complementary ends: grey in the middle, cyan over the sky"}
import { test, assert, fs, path, ROOT, WORLD, cut } from '../unit-lib.mjs';

// ------------------------------------------------------------------ OKLab (the world's own matrices, 030-colour.js)
const oklab2lin = (L, a, b) => {
  let l = L + 0.3963377774 * a + 0.2158037573 * b, m = L - 0.1055613458 * a - 0.0638541728 * b, s = L - 0.0894841775 * a - 1.2914855480 * b;
  l **= 3; m **= 3; s **= 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
};
const lin2lab = (c) => {
  const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]), m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]), s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
};
const lch = (L, C, h) => { const r = h * Math.PI / 180; return oklab2lin(L, C * Math.cos(r), C * Math.sin(r)).map((x) => Math.max(x, 0)); };
const LCh = (c) => { const o = lin2lab(c); return [o[0], Math.hypot(o[1], o[2]), (Math.atan2(o[2], o[1]) * 180 / Math.PI + 360) % 360]; };

// ------------------------------------------------------------------ GLSL's few functions, on arrays, for the ramp's own line
const V = (x) => (Array.isArray(x) ? x : [x, x, x]);
const G = {
  vec3: (a, b, c) => (b === undefined ? V(a) : [a, b, c]),
  clamp: (x, a, b) => Math.min(Math.max(x, a), b),
  smoothstep: (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); },
  mix: (a, b, t) => { const A = V(a), B = V(b), T = V(t); return A.map((x, i) => x + (B[i] - x) * T[i]); },
};
const GLSL = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
const AUR = GLSL.slice(GLSL.indexOf('vec3 auroraAt('), GLSL.indexOf('#endif', GLSL.indexOf('vec3 auroraAt(')));
const COLM = AUR.match(/^\s*vec3 col = (.*);\s*$/m);
assert.ok(COLM, 'auroraAt\'s ramp line (vec3 col = ...) not found in sky-body.glsl');
const ramp = new Function('vec3', 'clamp', 'smoothstep', 'mix', 't', 'return ' + COLM[1].replace(/(\d)\.(?!\d)/g, '$1.0') + ';').bind(null, G.vec3, G.clamp, G.smoothstep, G.mix);

// ------------------------------------------------------------------ the aurora sky as 220 defines it
const line = cut(WORLD, '    aurora: { ', '\n');
const SKY = new Function('return ' + line.trim().replace(/^aurora:\s*/, '').replace(/,\s*$/, ''))();
const SKYE = JSON.parse(WORLD.match(/SKYE_W = (\[[^\]]*\])/)[1]);

test('aurora: the ramp keeps its chroma all the way up (no grey band)', () => {
  let floor = Infinity, at = 0;
  for (let i = 0; i <= 200; i++) { const t = i / 200, C = LCh(ramp(t))[1]; if (C < floor) { floor = C; at = t; } }
  assert.ok(floor >= 0.08, `the ramp's chroma falls to ${floor.toFixed(3)} at t ${at.toFixed(3)} (a grey band: at least 0.08)`);
  const h0 = LCh(ramp(0))[2];
  assert.ok(h0 >= 130 && h0 <= 155, `the ramp's foot is h ${h0.toFixed(1)} (green, the oxygen line's: 130-155)`);
});

test('aurora: its green ribbon over the low sky composites green, not cyan, under the ceiling', () => {
  const ss = G.smoothstep, mix = G.mix, sky = SKY.sky.map((c) => lch(...c)), e = 8;
  // skyGrad at 8 deg (lib-air.glsl), then the warm band toward the key at its strongest (side 1)
  let c = mix(mix(sky[1], sky[2], ss(0, SKYE[0], e)), sky[3], ss(SKYE[0], SKYE[1], e));
  c = mix(c, lch(...SKY.skyW), SKY.skyK[0] * Math.exp(-e / SKY.skyK[1]));
  // the nearest curtain's ribbon (auroraAt at x 0.25, j 0): 0.09 x 0.85 x (e^-x/h + 0.6 e^-x/0.15h) x rays (their mean, 0.65) x fold 1
  const amp = 0.09 * 0.85 * (Math.exp(-0.25 / 16) + 0.6 * Math.exp(-0.25 / 2.4)) * 0.65;
  c = c.map((x, i) => x + ramp(0)[i] * amp);
  // the composite's saturation (post.sat about the luma), its shoulder and the light ceiling (fs-comp.glsl; knee 0.08)
  const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  c = c.map((x) => Math.max(y + (x - y) * SKY.post.sat, 0));
  const m = Math.max(...c); if (m > 0.78) { const mm = 0.78 + 0.22 * (1 - Math.exp(-(m - 0.78) / 0.22)); c = c.map((x) => x * mm / m); }
  let [L] = LCh(c); const Kc = SKY.ceil - 0.08;
  if (L > Kc) { const k = Math.pow((Kc + 0.08 * (1 - Math.exp(-(L - Kc) / 0.08))) / L, 3); c = c.map((x) => x * k); }
  const [Lp, Cp, hp] = LCh(c);
  assert.ok(hp >= 140 && hp <= 165, `the composited peak is h ${hp.toFixed(1)} (green: 140-165; cyan is about 200)`);
  assert.ok(Cp >= 0.08, `the composited peak's chroma ${Cp.toFixed(3)} (at least 0.08)`);
  assert.ok(Lp <= 0.525, `the composited peak's L ${Lp.toFixed(3)} (under the ceiling, 0.525)`);
});

test('aurora: its sky is near neutral where the arc stands, so the arc is the green in it', () => {
  for (let i = 0; i < 4; i++) assert.ok(SKY.sky[i][1] <= 0.05, `the aurora sky's stop ${i} has C ${SKY.sky[i][1]} (at most 0.05)`);
  for (const k of ['skyW', 'hazeC', 'hazeW']) assert.ok(SKY[k][1] <= 0.02, `the aurora sky's ${k} has C ${SKY[k][1]} (at most 0.02)`);
  for (const k of ['key', 'ambU', 'clLit', 'clRim']) assert.ok(SKY[k][1] <= 0.035, `the aurora sky's ${k} has C ${SKY[k][1]} (about 0.03)`);
});
