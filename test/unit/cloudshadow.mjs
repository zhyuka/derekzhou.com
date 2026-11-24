// test/unit/cloudshadow.mjs: the clouds' shadows on the land (physics: light/cloud-shadow; the owner, 2026-11-15: "No,
// natural light is fine": the world's own cast shadows are free under the light ceiling, nothing darkened for the
// words). Each cloud lobe, where its layer's wind has carried it, throws along the live key the shadow a sphere throws:
// the key's transmittance exp(-k chord), its edge softened over the key's own disc (the penumbra). The land takes it
// off the key's direct light alone (its shade, the sky's light, untouched), read where its point meets the plane the
// lobes were cast on.
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "  float dif = smoothstep(-0.08, 0.26, ndl) * gSh;", "with": "  float dif = smoothstep(-0.08, 0.26, ndl);", "why": "the sand's direct light never under the clouds' shadow"}
// plant: {"file": "src/world/262-cloud-shadow.js", "find": "var off = cellOff(C, t, CSHO), S = C.soft;", "with": "var off = cellOff(C, 0, CSHO), S = C.soft;", "why": "the shadows left where the clouds were laid out, not where the wind has carried them"}
// plant: {"file": "src/world/glsl/fs-cshadow.glsl", "find": "  float tc = dot(d, uSun);", "with": "  float tc = dot(d, vec3(0.0, 1.0, 0.0));", "why": "the shadows cast straight down, not along the key"}
// plant: {"file": "src/world/262-cloud-shadow.js", "find": "gl.blendFuncSeparate(gl.DST_COLOR, gl.ZERO, gl.ZERO, gl.ONE);", "with": "gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);", "why": "the lobes' light added, not multiplied (overlapping lobes would lighten)"}
import { test, assert, fs, path, ROOT, WORLD } from '../unit-lib.mjs';

const R = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const VS = R('src/world/glsl/vs-cshadow.glsl'), FS = R('src/world/glsl/fs-cshadow.glsl'), DG = R('src/glsl/dunes-glsl.glsl'), JS = R('src/world/262-cloud-shadow.js');
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
  assert.match(FS, /o = vec4\(vec3\(exp\(-uCShK\.x \* ch\)\), 1\.0\);/, 'the transmittance exp(-k chord)');
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
  }
});

test('cloud shadow: the vertex stage\'s ellipse holds the whole shadow (no lobe\'s shadow cut by its own quad)', () => {
  assert.match(VS, /vec2 c = aL\.xz - uSun\.xz \* aL\.y \/ sy;/, 'the centre carried down the key to the plane');
  assert.match(VS, /float pen = \(aL\.y \+ aL\.w\) \/ sy \* uCShK\.y, tx = 2\.0 \* uCShP\.z \/ 512\.0;/, 'the penumbra at the longest ray, a texel\'s margin');
  assert.match(VS, /float a = \(aL\.w \+ pen\) \/ sy \+ tx, b = aL\.w \+ pen \+ tx;/, 'its half axes: (R + penumbra) / s.y along the key\'s way, R + penumbra across');
  for (const el of [6, 20, 70]) {
    const e = el * Math.PI / 180, s = unit([0.6 * Math.cos(e), Math.sin(e), 0.8 * Math.cos(e)]), sy = Math.max(s[1], 0.05);
    const L = [0, 700, 0, 120], c = [-s[0] * L[1] / sy, -s[2] * L[1] / sy], u = unit([s[0], s[2]]), v = [-u[1], u[0]];
    const pen = (L[1] + L[3]) / sy * SUNR, tx = 2 * 6000 / 512, a = (L[3] + pen) / sy + tx, b = L[3] + pen + tx;
    let worst = 1;
    for (let i = 0; i <= 400; i++) {   // the quad's border, a hair outside: no shadow there
      const t = i / 200 - 1;
      for (const [qa, qb] of [[1.01, t], [-1.01, t], [t, 1.01], [t, -1.01]]) worst = Math.min(worst, trans(L, [c[0] + u[0] * qa * a + v[0] * qb * b, c[1] + u[1] * qa * a + v[1] * qb * b], s));
    }
    assert.ok(worst > 0.999, `${el} deg: the shadow at the quad's edge ${worst}`);
  }
});

test('cloud shadow: the land takes it off the key\'s direct light alone, read where its point meets the plane', () => {
  assert.match(DG, /vec2 q = \(p\.xz \+ uSun\.xz \* \(uCShP\.w - p\.y\) \/ max\(uSun\.y, 0\.05\) - uCShP\.xy\) \/ uCShP\.z;/, 'the land\'s point carried along the key to the plane (any height of land: the same line as the lobes\')');
  assert.match(DG, /if \(uCShP\.z <= 0\.0 \|\| uSun\.y <= 0\.02\) return 1\.0;/, 'none without a map this frame, nor with the key at the horizon');
  assert.match(DG, /return mix\(texture\(uCSh, q \* 0\.5 \+ 0\.5\)\.r, 1\.0, smoothstep\(0\.75, 1\.0, e\)\);/, 'eased off over the map\'s last quarter (a place\'s distance, never the clock\'s)');
  const sand = DG.split('vec3 shadeSand(')[1].split('\nvec3 D_shadeStone(')[0], stone = DG.split('vec3 D_shadeStone(')[1].split('\n}\n')[0];
  assert.match(sand, /gSh = cloudShadow\(p\);/); assert.match(sand, /float dif = smoothstep\(-0\.08, 0\.26, ndl\) \* gSh;/, 'the sand\'s key term');
  assert.match(sand, /vec3 c = mix\(shd, lit, dif\);/, 'the sand\'s shade (shd) untouched: a shadow is never darker than the land\'s own shade');
  assert.match(sand, /smoothstep\(-0\.05, 0\.6, ndl\) \* gSh/, 'the sheen is the key\'s light too');
  assert.match(stone, /gSh = cloudShadow\(p\);/); assert.match(stone, /float dif = smoothstep\(-0\.15, 0\.8, ndl\) \* gSh;/, 'the stones\' key term');
  for (const f of ['vec3 rockCol(', 'vec3 rockColL(']) assert.match(DG.split(f)[1].split('\n}\n')[0], /float dif = smoothstep\(-0\.2, 0\.7, ndl\) \* gSh;/, f + ': the rock\'s key term');
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
