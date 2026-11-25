// test/unit/cloudshadow.mjs: the clouds' shadows on the land (physics: light/cloud-shadow; the owner, 2026-11-15: "No,
// natural light is fine": the world's own cast shadows are free under the light ceiling, nothing darkened for the
// words). Each cloud lobe, where its layer's wind has carried it, throws along the live key the shadow a sphere throws:
// the key's transmittance exp(-k chord), its edge softened over the key's own disc (the penumbra). The land loses only
// the key's direct share of its light (the clear-sky model, https://www.nrel.gov/docs/legosti/old/761.pdf) and gets
// part back through the cloud (two-stream diffuse transmission, https://doi.org/10.1119/1.15109), read where its
// point meets the plane the lobes were cast on.
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "cshTap(q * 0.5 + 0.5)", "with": "texture(uCSh, q * 0.5 + 0.5).r", "why": "the map read at one bilinear tap: its 39 m texels' steps crawl along a shadow's edge on the sea and the sand as the eye moves (the shimmer measured 2.07% over main)"}
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "  return c * cloudShadow(p, ndl);", "with": "  return c;", "why": "the sand never under the clouds' shadow"}
// plant: {"file": "src/world/glsl/world-glsl.glsl", "find": "A_shadeSea(vec3(p.x, p.y - lv.x, p.z), n, rd, t, fp) * cloudShadow(p, uSun.y);", "with": "A_shadeSea(vec3(p.x, p.y - lv.x, p.z), n, rd, t, fp);", "why": "the cloud sea's top never under the free clouds' shadow (lit as if no cumulus stood over it)"}
// plant: {"file": "src/world/glsl/world-glsl.glsl", "find": "fp) * cloudShadow(p, uSun.y);", "with": "fp) * cloudShadow(p, dot(n, uSun));", "why": "the sea's shadow read by each bumped facet: creases turned from the key lit through it, thin bright lines that flicker as the camera moves"}
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "return 1.0 - f * (1.0 - 1.0 / (1.0 + 0.1125 * tau));", "with": "return 1.0 - f * (1.0 - exp(-tau));", "why": "no light scattered through the cloud: an opaque floor under a thick one"}
// plant: {"file": "src/world/glsl/fs-cshadow.glsl", "find": "exp(-uCShK.x * ch / 32.0)", "with": "exp(-uCShK.x * ch)", "why": "the depth stored whole: 8 bits clip a cloud's past 5.5, and the land reads it 32 times over"}
// plant: {"file": "src/world/262-cloud-shadow.js", "find": "var off = cellOff(C, t, CSHO), S = C.soft;", "with": "var off = cellOff(C, 0, CSHO), S = C.soft;", "why": "the shadows left where the clouds were laid out, not where the wind has carried them"}
// plant: {"file": "src/world/glsl/vs-cshadow.glsl", "find": "float sy = max(uSun.y, 0.02);", "with": "float sy = max(uSun.y, 0.05);", "why": "a low key's shadows drawn short and cut off square (a straight edge across the land at sunset)"}
// plant: {"file": "src/world/glsl/fs-cshadow.glsl", "find": "  float tc = dot(d, uSun);", "with": "  float tc = dot(d, vec3(0.0, 1.0, 0.0));", "why": "the shadows cast straight down, not along the key"}
// plant: {"file": "src/world/262-cloud-shadow.js", "find": "gl.blendFuncSeparate(gl.DST_COLOR, gl.ZERO, gl.ZERO, gl.ONE);", "with": "gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);", "why": "the lobes' light added, not multiplied (overlapping lobes would lighten)"}
import { test, assert, fs, path, ROOT, WORLD } from '../unit-lib.mjs';

const R = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const WG = R('src/world/glsl/world-glsl.glsl'), VS = R('src/world/glsl/vs-cshadow.glsl'), FS = R('src/world/glsl/fs-cshadow.glsl'), DG = R('src/glsl/dunes-glsl.glsl'), JS = R('src/world/262-cloud-shadow.js');
const num = (re, s) => Number(re.exec(s)[1]);
const K = num(/CSH_K = ([\d.]+)/, JS), SUNR = num(/CSH_SUN = ([\d.]+)/, JS);
const smooth = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const unit = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
// fs-cshadow's arithmetic in JS (the lobe [x, y over the plane, z, R], the plane's point [x, z], the key s)
function trans(L, p, s) {
  const d = [L[0] - p[0], L[1], L[2] - p[1]], tc = d[0] * s[0] + d[1] * s[1] + d[2] * s[2];
  if (tc <= 0) return 1;
  const r = Math.sqrt(Math.max(d[0] ** 2 + d[1] ** 2 + d[2] ** 2 - tc * tc, 0)), pen = tc * SUNR, rr = Math.max(r - pen, 0);
  const ch = 2 * Math.sqrt(Math.max(L[3] ** 2 - rr * rr, 0)) * (1 - smooth(L[3] - pen, L[3] + pen, r));
  return Math.exp(-K * ch);
}

test('cloud shadow: the shaders\' arithmetic is the twin\'s (the chord, its penumbra, the key)', () => {
  assert.match(FS, /float tc = dot\(d, uSun\);/, 'the ray along the live key');
  assert.match(FS, /float r = sqrt\(max\(dot\(d, d\) - tc \* tc, 0\.0\)\), R = vL\.w, pen = tc \* uCShK\.y;/, 'the ray\'s nearest pass, the penumbra the ray\'s length times the key\'s angular radius');
  assert.match(FS, /ch = 2\.0 \* sqrt\(max\(R \* R - rr \* rr, 0\.0\)\) \* \(1\.0 - smoothstep\(R - pen, R \+ pen, r\)\);/, 'the chord, softened over the penumbra');
  assert.match(FS, /o = vec4\(vec3\(exp\(-uCShK\.x \* ch \/ 32\.0\)\), 1\.0\);/, 'the depth k chord over 32, as exp(-k chord / 32)');
  assert.match(JS, /gl\.uniform2f\(P\.u\.uCShK, CSH_K, CSH_SUN\);/, 'the shaders\' k and angular radius are the JS\'s');
  assert.ok(Math.abs(SUNR - 0.53 / 2 * Math.PI / 180) < 2e-4, 'the key\'s angular radius the sun\'s 0.53 deg disc\'s');
});

test('cloud shadow: a lobe\'s shadow along the key: the full chord under it, none beyond its penumbra, none from under the plane', () => {
  for (const el of [8, 25, 60]) for (const az of [0, 1.1, 2.7]) {
    const e = el * Math.PI / 180, s = unit([Math.sin(az) * Math.cos(e), Math.sin(e), Math.cos(az) * Math.cos(e)]);
    const L = [120, 600, -80, 90], at = [L[0] - s[0] * L[1] / s[1], L[2] - s[2] * L[1] / s[1]];   // (its centre carried down the key)
    const full = trans(L, at, s);
    assert.ok(Math.abs(full - Math.exp(-K * 2 * L[3])) < 1e-9, `${el} deg: under the centre the whole chord (${full})`);
    // across the key's way the shadow is R wide (plus the penumbra); along it R / sin(el)
    const u = unit([s[0], s[2]]), v = [-u[1], u[0]], tc = Math.hypot(L[1] / s[1] * s[0], L[1], L[1] / s[1] * s[2]), pen = tc * SUNR;
    assert.equal(trans(L, [at[0] + v[0] * (L[3] + pen + 0.5), at[1] + v[1] * (L[3] + pen + 0.5)], s), 1, 'across: none past R and its penumbra');
    assert.ok(trans(L, [at[0] + v[0] * (L[3] - pen - 1), at[1] + v[1] * (L[3] - pen - 1)], s) < 0.98, 'across: shadow just inside R');
    const along = L[3] / s[1];
    assert.ok(trans(L, [at[0] + u[0] * along * 0.9, at[1] + u[1] * along * 0.9], s) < 0.995, 'along: stretched by 1 / sin(el)');
    assert.equal(trans([L[0], -50, L[2], 40], at, s), 1, 'a lobe under the plane casts nothing up');
    // the penumbra: monotone from the centre out, and its width the ray's length times the key's angular radius
    let prev = 0; for (let x = 0; x <= L[3] + 2 * pen; x += 1) { const t = trans(L, [at[0] + v[0] * x, at[1] + v[1] * x], s); assert.ok(t >= prev - 1e-12, 'never darker further out'); prev = t; }
    // the soft edge on the ground: across the key's way the penumbra's own width, along it stretched by 1 / sin(el)
    // (a low key's far and near edges long and soft, never a line)
    const band = (w, step) => { let a = null, b = null; for (let x = 0; x < 40 * along; x += step) { const t = trans(L, [at[0] + w[0] * x, at[1] + w[1] * x], s); if (a === null && t > 0.1) a = x; if (t > 0.9) { b = x; break; } } return b - a; };
    const ratio = band(u, 0.05) / band(v, 0.05);
    assert.ok(Math.abs(ratio * s[1] - 1) < 0.15, `${el} deg: the edge along the key ${ratio.toFixed(2)} times its width across (1 / sin(el) ${(1 / s[1]).toFixed(2)})`);
  }
});

test('cloud shadow: the vertex stage\'s ellipse holds the whole shadow (no lobe\'s shadow cut by its own quad)', () => {
  assert.match(VS, /vec2 c = aL\.xz - uSun\.xz \* aL\.y \/ sy;/, 'the centre carried down the key to the plane');
  assert.match(VS, /float pen = uCShK\.y \* \(aL\.y \+ aL\.w\) \/ \(sy - uCShK\.y\), tx = 2\.0 \* uCShP\.z \/ 1024\.0;/, 'the penumbra at the far end\'s ray (its length grows with it), a texel\'s margin');
  assert.match(VS, /float a = \(aL\.w \+ pen\) \/ sy \+ tx, b = aL\.w \+ pen \+ tx;/, 'its half axes: (R + penumbra) / s.y along the key\'s way, R + penumbra across');
  // the elevation's floor is the pass's own cut (0.02): a higher floor would draw a low key's shadows short, cut off
  // square across the key's way (a straight edge across the land at sunset and dawn)
  const FLOOR = num(/float sy = max\(uSun\.y, ([\d.]+)\);/, VS);
  assert.equal(FLOOR, 0.02); assert.match(JS, /if \(!\(s\[1\] > 0\.02\)\) return;/); assert.match(JS, /var sy = Math\.max\(s\[1\], 0\.02\)/);
  for (const el of [1.5, 3, 6, 20, 70]) {
    const e = el * Math.PI / 180, s = unit([0.6 * Math.cos(e), Math.sin(e), 0.8 * Math.cos(e)]), sy = Math.max(s[1], FLOOR);
    const L = [0, 700, 0, 120], c = [-s[0] * L[1] / sy, -s[2] * L[1] / sy], u = unit([s[0], s[2]]), v = [-u[1], u[0]];
    const pen = SUNR * (L[1] + L[3]) / (sy - SUNR), tx = 2 * 20000 / 1024, a = (L[3] + pen) / sy + tx, b = L[3] + pen + tx;
    let worst = 1;
    for (let i = 0; i <= 400; i++) {   // the quad's border, a hair outside: no shadow there
      const t = i / 200 - 1;
      for (const [qa, qb] of [[1.01, t], [-1.01, t], [t, 1.01], [t, -1.01]]) worst = Math.min(worst, trans(L, [c[0] + u[0] * qa * a + v[0] * qb * b, c[1] + u[1] * qa * a + v[1] * qb * b], s));
    }
    assert.ok(worst > 0.999, `${el} deg: the shadow at the quad's edge ${worst}`);
  }
});

// the land's read in JS (dunes-glsl's cloudShadow): the map's texel m, the face's n.l, the key's elevation sine
const CLEAR = { 5: 0.098, 7: 0.110, 10: 0.117, 14: 0.121 }, CLEAR_FD = { 5: 0.472, 14: 0.667 };   // (the clear-sky model's q = DHI / DNI; the beam's share on level ground)
const qFit = (sy) => 0.13 * sy / (sy + 0.02);
function landShadow(m, ndl, sy0) {
  if (ndl <= 0) return 1;
  const tau = -32 * Math.log(Math.max(m, 0.002)), sy = Math.max(sy0, 0.02), f = ndl / (ndl + qFit(sy));
  return 1 - f * (1 - 1 / (1 + 0.1125 * tau));
}
test('cloud shadow: the land loses the key\'s direct share alone, and gets back what the cloud scatters through', () => {
  assert.match(DG, /vec2 q = \(p\.xz \+ uSun\.xz \* \(uCShP\.w - p\.y\) \/ max\(uSun\.y, 0\.02\) - uCShP\.xy\) \/ uCShP\.z;/, 'the land\'s point carried along the key to the plane (any height of land: the same line as the lobes\')');
  assert.match(DG, /if \(uCShP\.z <= 0\.0 \|\| ndl <= 0\.0\) return 1\.0;/, 'none without a map this frame, none on a face from the key');
  assert.match(DG, /float tau = -32\.0 \* log\(max\(mix\(cshTap\(q \* 0\.5 \+ 0\.5\), 1\.0, smoothstep\(0\.75, 1\.0, max\(abs\(q\.x\), abs\(q\.y\)\)\)\), 0\.002\)\);/, 'the depth read back (x 32, over its 3x3 texels), eased off over the map\'s last quarter');
  assert.match(DG, /float sy = max\(uSun\.y, 0\.02\), f = ndl \/ \(ndl \+ 0\.13 \* sy \/ \(sy \+ 0\.02\)\);/, 'the beam\'s share of the face\'s light');
  assert.match(DG, /return 1\.0 - f \* \(1\.0 - 1\.0 \/ \(1\.0 \+ 0\.1125 \* tau\)\);/, 'two-stream diffuse transmission, 3/4 (1 - g), g 0.85');
  // the fit is the clear sky's over the key's 5 to 14 deg
  for (const [el, q] of Object.entries(CLEAR)) assert.ok(Math.abs(qFit(Math.sin(el * Math.PI / 180)) - q) < 0.01, `${el} deg: q ${qFit(Math.sin(el * Math.PI / 180)).toFixed(3)} against ${q}`);
  // level sand under a thick cloud keeps the sky's light: at least 1 - the beam's share (0.53 at 5 deg, 0.33 at 14),
  // more with the light scattered through; with a mean cloud's depth (tau 20) near 0.65 and 0.55
  for (const el of [5, 14]) {
    const sy = Math.sin(el * Math.PI / 180), fd = sy / (sy + qFit(sy));
    assert.ok(Math.abs(fd - CLEAR_FD[el]) < 0.03, `${el} deg: the beam's share ${fd.toFixed(3)} against the clear sky's ${CLEAR_FD[el]}`);
    assert.ok(landShadow(0, sy, sy) > 1 - fd, `${el} deg: never darker than the sky's light alone`);
    const t20 = landShadow(Math.exp(-20 / 32), sy, sy);
    assert.ok(t20 > 0.5 && t20 < 0.75, `${el} deg, tau 20: ${t20.toFixed(3)}`);
  }
  assert.equal(landShadow(1, 0.2, 0.2), 1, 'no cloud, no shadow'); assert.equal(landShadow(0, -0.1, 0.2), 1, 'a face from the key loses nothing');
  // the map's 8 bits hold the depth to a fifth over a cloud's range
  for (let tau = 0; tau <= 120; tau += 0.5) { const m = Math.round(Math.exp(-tau / 32) * 255) / 255, back = -32 * Math.log(Math.max(m, 0.002)); assert.ok(Math.abs(back - tau) < 0.07 * tau + 0.15, `tau ${tau}: read back ${back.toFixed(2)}`); }
  const sand = DG.split('vec3 shadeSand(')[1].split('\nvec3 D_shadeStone(')[0], stone = DG.split('vec3 D_shadeStone(')[1].split('\n}\n')[0];
  assert.match(sand, /return c \* cloudShadow\(p, ndl\);/, 'the sand\'s whole light at its own n.l');
  assert.equal((stone.match(/return c \* cloudShadow\(p, ndl\);/g) || []).length, 2, 'the stones\' and the rock\'s');
  assert.ok(!/gSh/.test(DG), 'no shading term of its own: the split is the read\'s');
  assert.ok(!/cloudShadow|uCSh/.test(R('src/world/glsl/fs-comp.glsl')), 'the composite takes no shadow input (no-darkening: nothing for the words)');
});

test('cloud shadow: one pass a frame, before the land, along the live key, where the wind has carried the clouds', () => {
  assert.match(JS, /var s = airLightDir\(V\.L \|\| V\.light\);/, 'the live key (the sun, or the moon\'s disc on the moonlit sky): the land\'s own uSun');
  assert.match(JS, /var L = V\.cellList, n = 0, a = CSH\.a, t = cloudT\(\)/, 'on the clouds\' own clock');
  assert.match(JS, /var off = cellOff\(C, t, CSHO\), S = C\.soft;/, 'each cell\'s lobes where its layer\'s wind has carried them (cellOff: the drift and the lift)');
  assert.match(JS, /gl\.blendFuncSeparate\(gl\.DST_COLOR, gl\.ZERO, gl\.ZERO, gl\.ONE\);/, 'each lobe\'s transmittance multiplied in (exp of the summed depth)');
  assert.match(JS, /gl\.clearColor\(1, 1, 1, 1\); gl\.clear\(gl\.COLOR_BUFFER_BIT\);/, 'cleared to full light');
  assert.match(WORLD, /cshPass\(V\);[^\n]*\n[^\n]*gl\.activeTexture\(gl\.TEXTURE12\); gl\.bindTexture\(gl\.TEXTURE_2D, CSH\.ok \? CSH\.T\.t : null\);[^\n]*\n\s*prof\('start'\);[\s\S]{0,400}drawScene\(V, u\);/, 'drawn and bound before the scene');
  assert.match(WORLD, /uGround: 11, uCSh: 12,/, 'its sampler\'s unit');
  assert.match(WORLD, /if \(u\.uCShP\) gl\.uniform4f\(u\.uCShP, CSHU\[0\], CSHU\[1\], CSH\.ok \? CSHU\[2\] : 0, CSHU\[3\]\);/, 'every program that reads it, none without a map');
  assert.match(WORLD, /\['cshadow', HEAD \+ VS_CSH, HEAD \+ FS_CSH\]/, 'an engine program');
  assert.match(WORLD, /E\('cshadow', EP\.cshadow, CSH\.vao, TS, 4, 1, false, 'rgba8', BL_MUL, 0, false\);/, 'warmed with its own blend');
  assert.match(WORLD, /sandFx: true, cloudShadow: true,/, 'the dunes\' world casts them');
  assert.match(WORLD, /CSH\.T = null; CSH\.ok = false;/, 'a lost context makes its map again');
});

// (physics: light/cloud-shadow) the cloud sea's top under a cumulus: a cloud top is lit as the land is, by the key's beam
// and the sky's light, and loses the same share (a deck's shadow seen from above: the beam's light gone, the sky's kept)
test('cloud shadow: the cloud sea\'s top lies in the free clouds\' shadow, read as the land reads it', () => {
  assert.match(WG, /return A_shadeSea\(vec3\(p\.x, p\.y - lv\.x, p\.z\), n, rd, t, fp\) \* cloudShadow\(p, uSun\.y\);/, 'the sea\'s light times the shadow at its own point (world height), read for the level top: the beam enters a cloud through its volume, so no facet turned from the key escapes it (the crease lines, flickering)');
  for (const el of [5, 14]) {
    const sy = Math.sin(el * Math.PI / 180), fd = sy / (sy + qFit(sy)), top = landShadow(Math.exp(-20 / 32), sy, sy);
    assert.ok(top > 1 - fd && top < 1, `${el} deg, a level top under tau 20: ${top.toFixed(3)}, between the sky's light alone and none lost`);
  }
});

// (physics: light/cloud-shadow) the map read over its 3x3 texels (four bilinear taps half a texel off, weights 1-2-1 by
// 1-2-1): a texel's edge spread over three texels, the shading's step per frame halved where it crosses one, so the
// edge never crawls as the eye moves (#471: 2.07% of edge pixels stepping over main's own motion at one tap)
test('cloud shadow: the map is read over its 3x3 texels, so an edge never crawls', () => {
  const D = R('src/glsl/dunes-glsl.glsl');
  const tap = D.match(/float cshTap\(vec2 u\) \{([\s\S]*?)\n\}/);
  assert.ok(tap, 'cshTap: the 3x3 read');
  assert.match(tap[1], /const float h = 0\.5 \/ 1024\.0;/, 'half a texel of the 1024 map');
  assert.equal((tap[1].match(/texture\(uCSh, u [+-] vec2\(/g) || []).length, 4, 'four bilinear taps, one each corner');
  assert.match(D, /log\(max\(mix\(cshTap\(q \* 0\.5 \+ 0\.5\), 1\.0,/, 'cloudShadow reads the map through it (the sand, the stones and the sea alike)');
  // a hard edge between two texels (0 | 1), read as the eye's sample slides over it: the steepest change per texel
  const lin = (x) => Math.min(1, Math.max(0, x));   // (one bilinear tap: 0 at texel 0's centre, 1 at texel 1's)
  const tent = (x) => 0.5 * (lin(x - 0.5) + lin(x + 0.5));
  let s1 = 0, s3 = 0;
  for (let x = -2; x < 3; x += 1 / 64) { s1 = Math.max(s1, (lin(x + 1 / 64) - lin(x)) * 64); s3 = Math.max(s3, (tent(x + 1 / 64) - tent(x)) * 64); }
  assert.ok(Math.abs(s1 - 1) < 1e-9 && Math.abs(s3 - 0.5) < 1e-9, `the edge's steepest slope per texel: one tap ${s1}, 3x3 ${s3}`);
});
