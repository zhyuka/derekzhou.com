// test/unit/glory.mjs: the glory and the fogbow on the moonlit cloud sea (delight-weather 4)
// The shader's own ring function (above-glsl's A_glory), run in Node a colour channel at a time (every vec3 in it is a
// constructor of scalars, a scalar times one or a sum: each channel is the same code on its own numbers), swept over
// the angle from the point opposite the moon: the glory's first red ring at 3.9 +- 0.3 deg (the corona's 2.6 deg ring
// is droplets of about 6 um), the fogbow broad and white at 37 +- 3 deg; and nothing of it reaches the sky.
// plant: {"file": "src/glsl/above-glsl.glsl", "find": "const float GLORY_R = 3.9,", "with": "const float GLORY_R = 2.4,", "why": "the glory's ring for 10 um droplets: it no longer matches the corona's 6 um"}
// plant: {"file": "src/glsl/above-glsl.glsl", "find": "float a = degrees(acos(clamp(-dot(rd, uGlory.xyz), -1.0, 1.0)));", "with": "float a = degrees(acos(clamp(dot(rd, uGlory.xyz), -1.0, 1.0)));", "why": "the rings about the moon, not the point opposite it"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  if (uMoon.w > 0.0) {   // the moon:", "with": "  if (uGlory.w > 0.0) c += c * A_glory(rd);\n  if (uMoon.w > 0.0) {   // the moon:", "why": "the glory drawn on the sky"}
import { test, assert, fs, path, vm, ROOT, WORLD, cut } from '../unit-lib.mjs';

const ABOVE = fs.readFileSync(path.join(ROOT, 'src/glsl/above-glsl.glsl'), 'utf8');
const SKYB = fs.readFileSync(path.join(ROOT, 'src/world/glsl/sky-body.glsl'), 'utf8');
const consts = Object.fromEntries([...cut(ABOVE, 'const float GLORY_R', '\n', true).matchAll(/(\w+) = ([\d.]+)/g)].map((m) => [m[1], +m[2]]));

function args(s, i) {   // the comma-separated arguments of the call whose '(' is at s[i]; returns [list, index after ')']
  const out = []; let d = 0, a = i + 1;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '(') d++;
    else if (s[j] === ')') { d--; if (d === 0) { out.push(s.slice(a, j)); return [out, j + 1]; } }
    else if (s[j] === ',' && d === 1) { out.push(s.slice(a, j)); a = j + 1; }
  }
  throw new Error('unbalanced');
}
function channel(src, ch) {   // every vec3(...) to its channel's own scalar
  let out = '', i = 0;
  for (;;) {
    const k = src.indexOf('vec3(', i); if (k < 0) return out + src.slice(i);
    const [as, e] = args(src, k + 4), pick = as.length === 3 ? as[ch] : as[0];
    out += src.slice(i, k) + '(' + channel(pick, ch) + ')'; i = e;
  }
}
const BODY = cut(ABOVE, 'vec3 A_glory(vec3 rd) {\n', '\n}\n');
function gloryJs(ch) {
  let b = BODY.replace(/^vec3 A_glory\(vec3 rd\) \{\n/, '').replace(/\/\/[^\n]*/g, '');
  assert.match(b, /float a = degrees\(acos\(clamp\(-dot\(rd, uGlory\.xyz\), -1\.0, 1\.0\)\)\);/, 'the angle is not from the point opposite the moon');
  b = b.replace(/[^\n]*uGlory\.w <= 0\.0[^\n]*\n/, '').replace(/[^\n]*float a = degrees[^\n]*\n/, '').replace(/uGlory\.w/g, '1.0');
  b = channel(b, ch).replace(/\b(float|vec3|int)\s+/g, 'let ').replace(/float\(k\)/g, 'k');
  const C = Object.entries(consts).map(([k, v]) => `const ${k} = ${v};`).join(' ');
  return vm.runInThisContext(`(function (a) { const pow = Math.pow, exp = Math.exp; ${C} ${b} })`);
}
const G = [0, 1, 2].map(gloryJs), at = (a) => G.map((f) => f(a));
const sweep = (a0, a1, f) => { let best = -1, arg = a0; for (let a = a0; a <= a1; a += 0.01) { const v = f(a); if (v > best) { best = v; arg = a; } } return [arg, best]; };

test('glory: the first red ring at 3.9 +- 0.3 deg (6 um, the corona\'s droplets), a bright centre, fainter rings outside', () => {
  const corona = /exp\(-pow\(\(ma - ([\d.]+)\) \/ 0\.3, 2\.0\)\)/.exec(SKYB);
  assert.ok(corona, 'the corona\'s first ring is not where sky-body draws it');
  // (both go as 1/r: the corona's first red ring 2.6 deg at about 6 um, a glory's 2.4 deg at 10 um)
  const rum = 2.6 * 6 / +corona[1], ring = 2.4 * 10 / rum;
  assert.ok(rum > 4 && rum < 25, `the corona's droplets (${rum.toFixed(1)} um) are not a glory's (4-25 um)`);
  // the red excess (red over blue) peaks on the first ring
  const [rA] = sweep(2.5, 5.5, (a) => { const c = at(a); return c[0] - c[2]; });
  console.log(`glory: the first red ring at ${rA.toFixed(2)} deg (the corona's droplets: ${ring.toFixed(2)} deg)`);
  assert.ok(Math.abs(rA - 3.9) <= 0.3, `the first red ring at ${rA.toFixed(2)} deg`);
  assert.ok(Math.abs(rA - ring) <= 0.4, `the first ring ${rA.toFixed(2)} deg is not the corona's droplets' (${ring.toFixed(2)} deg)`);
  const centre = at(0), r1 = at(rA), r2 = at(sweep(5.5, 8.5, (a) => at(a)[0] - at(a)[2])[0]);
  assert.ok(centre[1] > r1[1], 'the centre is not the brightest');
  assert.ok(r2[0] - r2[2] < r1[0] - r1[2], 'the second ring is not fainter than the first');
  // inside each ring blue, outside red
  const [bA] = sweep(2.0, rA, (a) => { const c = at(a); return c[2] - c[0]; });
  assert.ok(bA < rA, 'the ring\'s blue is not inside its red');
});

test('glory: the fogbow broad and white at 37 +- 3 deg, red outside, blue inside; nothing past it', () => {
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const [bA, bL] = sweep(20, 50, (a) => lum(at(a)));
  console.log(`glory: the fogbow at ${bA.toFixed(2)} deg`);
  assert.ok(Math.abs(bA - 37) <= 3, `the bow at ${bA.toFixed(2)} deg`);
  const c = at(bA), sat = (Math.max(...c) - Math.min(...c)) / Math.max(...c);
  assert.ok(sat < 0.15, `the bow is not white (saturation ${sat.toFixed(3)})`);
  // broad: its half width at least 2 deg each side
  let w = 0; while (lum(at(bA + w)) > bL / 2) w += 0.05;
  assert.ok(w >= 2, `the bow is ${w.toFixed(2)} deg wide (half width): a thin rainbow, not a fogbow`);
  const out = at(bA + 3), inn = at(bA - 3);
  assert.ok(out[0] - out[2] > inn[0] - inn[2], 'the bow is not red outside and blue inside');
  // the rings stop: beyond the bow's reach, nothing
  assert.deepEqual(at(consts.BOW_R + 4 * consts.BOW_W + 0.5).map((v) => +v.toFixed(12)), at(90).map((v) => +v.toFixed(12)));
  assert.match(BODY, /if \(a > BOW_R \+ 4\.0 \* BOW_W\) return vec3\(0\.0\);/, 'the rings are worked out over the whole sea');
});

test('glory: light added to the sea\'s own (its brightness), on the cloud sea\'s surface only; no sky program reads it', () => {
  assert.match(ABOVE, /c \+= dot\(c, vec3\(0\.2126, 0\.7152, 0\.0722\)\) \* A_glory\(rd\);/, 'the glory is not the sea\'s own light');
  assert.equal(ABOVE.split('A_glory(').length - 1, 2, 'A_glory is called anywhere but A_shadeSea');
  const sea = cut(ABOVE, 'vec3 A_shadeSea(', '\nvec3 A_shadeStone(');
  assert.match(sea, /A_glory\(rd\)/, 'the sea does not take it');
  for (const f of fs.readdirSync(path.join(ROOT, 'src/world/glsl'))) {
    const t = fs.readFileSync(path.join(ROOT, 'src/world/glsl', f), 'utf8');
    assert.ok(!/A_glory|uGlory/.test(t), `${f} reads the glory`);
  }
  // the sky's programs are built without the realm's glsl (where A_glory lives)
  assert.match(WORLD, /var FS_SKY = HEAD \+ FRAME_U \+ LIB \+ SKY_BODY;/, 'the sky\'s program takes more than its own');
  // every term of the rings is light added: a sum of exps with positive weights, times a positive amount
  for (const a of [0, 1, 2, 3.9, 6, 9, 20, 30, 37, 45, 60, 120, 180]) for (const v of at(a)) assert.ok(v >= 0, `a negative light at ${a} deg`);
});

test('glory: its uniform is the air\'s moon, at the sky\'s drawn time; nought with no moon or under the horizon', () => {
  const SRC = cut(WORLD, '  var GLORYU = new Float32Array(4)', '  function skyNightUniforms(');
  assert.match(SRC, /var m = airMoon\(tD\);/, 'the glory reads a moon of its own (map.md disconnect 4: the air\'s airMoon)');
  const run = (moon, V) => vm.runInThisContext('(function (M, V) { var SIM = { V: V, t: 100, alpha: 1 }, SIM_DT = 1 / 60, SKY = { dt: 0 }, DEVMODE = false, MOONF = {};' +
    ' function airMoon(t) { return M; } function mrSmooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }\n' + SRC + ' return Array.from(gloryUniform()); })')(moon, V);
  const up = run({ d: [0.5, 0.4, 0.7], w: 1, el: 23 }, {});
  assert.deepEqual(up.map((v) => +v.toFixed(5)), [0.5, 0.4, 0.7, 1]);
  assert.equal(run({ d: [0, -0.1, 1], w: 0.6, el: -5 }, {})[3], 0, 'a moon under the horizon has a glory');
  assert.equal(run({ d: [0, 0.5, 0.8], w: 0, el: 30 }, {})[3], 0, 'a sky with no moon has a glory');
  assert.equal(run({ d: [0, 0.5, 0.8], w: 1, el: 30 }, null)[3], 0, 'no visit, a glory');
  assert.match(WORLD, /if \(u\.uGlory\) gl\.uniform4fv\(u\.uGlory, gloryUniform\(\)\);/);
});
