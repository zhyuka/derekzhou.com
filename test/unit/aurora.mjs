// test/unit/aurora.mjs: the aurora's colour (aurora-colour): its ramp in sky-body.glsl keeps its chroma, and over the
// aurora sky's own low stops it composites green, not cyan
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "vec3(0.45, 0.5, 1.0), clamp(2.0 * t", "with": "vec3(1.006, 0.487, 0.098), clamp(2.0 * t", "why": "a warm overlap: yellow over the sky's blue, a grey-brown band (the review's)"}
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
const TM = AUR.match(/^\s*float t = smoothstep\(([\d.]+), ([\d.]+), x \/ hgt\);\s*$/m);
assert.ok(TM, 'auroraAt\'s ramp place (float t = smoothstep(a, b, x / hgt);) not found in sky-body.glsl');
const ramp = new Function('vec3', 'clamp', 'smoothstep', 'mix', 't', 'return ' + COLM[1].replace(/(\d)\.(?!\d)/g, '$1.0') + ';').bind(null, G.vec3, G.clamp, G.smoothstep, G.mix);

// ------------------------------------------------------------------ the aurora sky as 220 defines it
const line = cut(WORLD, '    aurora: { ', '\n');
const SKY = new Function('return ' + line.trim().replace(/^aurora:\s*/, '').replace(/,\s*$/, ''))();
const SKYE = JSON.parse(WORLD.match(/SKYE_W = (\[[^\]]*\])/)[1]);

test('aurora: the whole curtain over its sky keeps the sky\'s chroma, never through yellow (no grey band)', () => {
  // auroraAt's nearest curtain (j 0: hgt 16, its base about 8 deg) from its foot to where it ends (x to 1.6 hgt), each
  // place's ramp colour at its own strength added to the sky behind it (skyGrad from WSKY.aurora's stops)
  const ss = G.smoothstep, mix = G.mix, sky = SKY.sky.map((c) => lch(...c)), hgt = 16, base = 8;
  const skyAt = (e) => { let c = mix(sky[1], sky[2], ss(0, SKYE[0], e)); c = mix(c, sky[3], ss(SKYE[0], SKYE[1], e)); c = mix(c, sky[4], ss(SKYE[1], SKYE[2], e)); return mix(c, sky[5], ss(SKYE[2], SKYE[3], e)); };
  let worst = Infinity, wx = 0, minC = Infinity;
  for (let x = 0.25; x <= hgt * 1.6; x += 0.25) {
    const t = ss(+TM[1], +TM[2], x / hgt), col = ramp(t);
    const amp = 0.09 * 0.85 * (Math.exp(-x / hgt) + 0.6 * Math.exp(-x / (0.15 * hgt))) * 0.7;
    const s0 = skyAt(base + x), c = s0.map((v, i) => v + col[i] * amp), [, Cs] = LCh(s0), [, Cc, hc] = LCh(c);
    if (Cc / Cs < worst) { worst = Cc / Cs; wx = x; }
    minC = Math.min(minC, Cc);
    assert.ok(!(hc > 40 && hc < 125), `at ${x} deg up the curtain the sky turns h ${hc.toFixed(0)} (yellow or orange over the blue: a grey-brown band)`);
  }
  assert.ok(worst >= 0.7, `at ${wx} deg up the curtain the sky keeps ${(100 * worst).toFixed(0)}% of its own chroma (a grey band: at least 70%)`);
  assert.ok(minC >= 0.035, `the curtain over its sky falls to C ${minC.toFixed(3)} (grey: at least 0.035)`);
  const h0 = LCh(ramp(0))[2];
  assert.ok(h0 >= 130 && h0 <= 155, `the ramp's foot is h ${h0.toFixed(1)} (green, the oxygen line's: 130-155)`);
});

test('aurora: its green ribbon over the low sky composites green, not cyan, under the ceiling', () => {
  const ss = G.smoothstep, mix = G.mix, sky = SKY.sky.map((c) => lch(...c)), e = 8;
  // skyGrad at 8 deg (lib-air.glsl), then the warm band toward the key at its strongest (side 1)
  let c = mix(mix(sky[1], sky[2], ss(0, SKYE[0], e)), sky[3], ss(SKYE[0], SKYE[1], e));
  c = mix(c, lch(...SKY.skyW), SKY.skyK[0] * Math.exp(-e / SKY.skyK[1]));
  // the arc's ribbon at its centre (auroraAt at x 0.25, hgt 16): 0.09 x 0.85 x (e^-x/h + 0.6 e^-x/0.15h) x rays (their mean, 0.7)
  const amp = 0.09 * 0.85 * (Math.exp(-0.25 / 16) + 0.6 * Math.exp(-0.25 / 2.4)) * 0.7;
  c = c.map((x, i) => x + ramp(0)[i] * amp);
  // the composite's saturation (post.sat about the luma), its shoulder and the light ceiling (fs-comp.glsl; its knee 225's CEIL_KNEE)
  const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  c = c.map((x) => Math.max(y + (x - y) * SKY.post.sat, 0));
  const m = Math.max(...c); if (m > 0.78) { const mm = 0.78 + 0.22 * (1 - Math.exp(-(m - 0.78) / 0.22)); c = c.map((x) => x * mm / m); }
  let [L] = LCh(c); const knee = +WORLD.match(/var CEIL_KNEE = ([\d.]+),/)[1], Kc = SKY.ceil - knee;
  if (L > Kc) { const k = Math.pow((Kc + knee * (1 - Math.exp(-(L - Kc) / knee))) / L, 3); c = c.map((x) => x * k); }
  const [Lp, Cp, hp] = LCh(c);
  assert.ok(hp >= 140 && hp <= 165, `the composited peak is h ${hp.toFixed(1)} (green: 140-165; cyan is about 200)`);
  assert.ok(Cp >= 0.08, `the composited peak's chroma ${Cp.toFixed(3)} (at least 0.08)`);
  assert.ok(Lp <= 0.525, `the composited peak's L ${Lp.toFixed(3)} (under the ceiling, 0.525)`);
});

test('aurora: its sky is near neutral where the arc stands, so the arc is the green in it', () => {
  for (let i = 0; i < 4; i++) assert.ok(SKY.sky[i][1] <= 0.05, `the aurora sky's stop ${i} has C ${SKY.sky[i][1]} (at most 0.05)`);
  for (const k of ['skyW', 'hazeC', 'hazeW']) assert.ok(SKY[k][1] <= 0.02, `the aurora sky's ${k} has C ${SKY[k][1]} (at most 0.02)`);
  assert.ok(SKY.clLit[1] <= 0.035, `the aurora sky's clLit has C ${SKY.clLit[1]} (about 0.03)`);
  // (light B) a faint green on the side facing the arc: key, rim and the light from above, never teal again
  for (const k of ['key', 'ambU', 'clRim']) {
    assert.ok(SKY[k][1] <= 0.065, `the aurora sky's ${k} has C ${SKY[k][1]} (faint: at most 0.065)`);
    assert.ok(SKY[k][2] >= 140 && SKY[k][2] <= 165, `the aurora sky's ${k} is h ${SKY[k][2]} (green, never teal: 140-165)`);
  }
});

test('aurora: the arc has no seam round the sky and nothing finer than a few pixels (no glitter)', () => {
  // its azimuth enters only as cos(az - centre) and as u = az / 2 pi times whole numbers (the noise's period), so it is
  // the same either side of az +-180; its finest feature (the rays, u x N) at least 8 px wide on a 1440-px laptop
  // window (60 deg up, 16:10: 92 deg across)
  const uses = AUR.replace(/float az = atan\(rd\.x, rd\.z\), u = az \/ SKYTAU;/, '').match(/\baz\b[^;]*/g) || [];
  for (const m of uses) assert.ok(/^az - uAur\.y\)/.test(m), 'auroraAt reads its azimuth other than by cos(az - centre): ' + m);
  const fr = [...AUR.matchAll(/\bu \* ([\d.]+)/g)].map((m) => +m[1]);
  assert.ok(fr.length > 0, 'no noise read along the arc');
  for (const f of fr) {
    assert.ok(Number.isInteger(f), `a noise along the arc at u x ${f}: not a whole number of periods round the sky (a seam at az 180)`);
    const across = 2 * Math.atan(Math.tan(Math.PI / 6) * 1.6) * 180 / Math.PI, px = 1440 / across * (360 / f);
    assert.ok(px >= 8, `the arc's noise at u x ${f} is ${px.toFixed(1)} px a period (at least 8: finer glitters as the view turns)`);
  }
});
