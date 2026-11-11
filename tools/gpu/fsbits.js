'use strict';
// fsbits.js (fast500 lane D): a fragment shader's output, old against new, bit for bit, on the RTX 4090 through ANGLE
// D3D11 (headless Chrome). The program's own fragment shader (GLSL as the page gives it: <program>.fs.glsl of each dir)
// is drawn with a test vertex stage that lays a grid of points (one fragment each, so a point's varyings are its
// vertex's, exact) carrying vW, vN, vX made from a hash of the point (positions near and far, normals from level to
// steep, the coast's gap from under to over its 14 m), into an RGBA32F target: oC before any 8-bit rounding.
// Every active uniform gets a value from a seeded generator by its name (the same both sides, never all zeros: each sky
// seed gives another light, fog, haze, twilight mist and palette); uDbg and uZ stay 0. Every sampler gets a random
// texture of its kind (3D RGBA8 filtered for the noise volume, RGBA32F for the rest; the weights' grids sized as
// world.js makes them).
//   node fsbits.js PROGRAM OLD_DIR NEW_DIR OUT.json [--skies 6]
// Needs PW_CORE and S2 (stage2/pctools/pw.js), as hbits.js.
const fs = require('fs'), path = require('path');
const PW = require('./pw.js');
const [prog, oldDir, newDir, outFile] = process.argv.slice(2);
// --old-att K / --new-att K: read that side's colour attachment K (it draws into K + 1 RGBA32F targets, drawBuffers all):
// a program that moved an output to another location (lane D's kitB: the old kit's o1 is its o0) compared output to output
const ATT = { old: +(process.argv.includes('--old-att') ? process.argv[process.argv.indexOf('--old-att') + 1] : 0), new: +(process.argv.includes('--new-att') ? process.argv[process.argv.indexOf('--new-att') + 1] : 0) };
const SKIES = +(process.argv.includes('--skies') ? process.argv[process.argv.indexOf('--skies') + 1] : 6);

let VS = `#version 300 es
precision highp float; precision highp int;
uniform vec4 uTG;   // the grid: origin x, z; spacing (m); points across
uniform vec3 uCamT; uniform uint uSeedT;
centroid out vec3 vW; centroid out vec3 vN; VX_DECL
uint hh(uint x) { x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16; return x; }
float hr(uint i, uint k) { return float(hh(i * 7u + k + uSeedT) >> 8) * (1.0 / 16777216.0); }
void main() {
  int W = int(uTG.w), i = gl_VertexID; vec2 ij = vec2(float(i % W), float(i / W)); uint u = uint(i);
  vW = vec3(uTG.x + ij.x * uTG.z, uCamT.y - 140.0 + 150.0 * hr(u, 1u), uTG.y + ij.y * uTG.z);
  float steep = hr(u, 2u);   // half the points level-ish, the rest up to vertical
  vN = vec3(hr(u, 3u) * 2.0 - 1.0, mix(1.0, 0.05, steep * steep), hr(u, 4u) * 2.0 - 1.0) * (0.7 + 0.6 * hr(u, 5u));
  VX_LINE
  gl_Position = vec4((ij + 0.5) / uTG.w * 2.0 - 1.0, 0.0, 1.0); gl_PointSize = 1.0;
}`;

(async () => {
  const fsOld = fs.readFileSync(path.join(oldDir, prog + '.fs.glsl'), 'utf8'), fsNew = fs.readFileSync(path.join(newDir, prog + '.fs.glsl'), 'utf8');
  // the varyings the fragment shader reads: the land's (vX, the coast's gap) or a mesh's (vC its colour and material,
  // every material 1-6 of both kits; vY the height above the ground; vE the emission)
  /* the varyings: the fragment shader's own inputs, each declared by the test vertex stage as the shader declares it
     (its interpolation qualifier, type and name), so any program pairs: the land's (vW, vN, vX: positions near and
     far, normals level to steep, the coast's gap under and over its 14 m) and a mesh's (vC its colour and material,
     every material 1-6; vY the height above the ground; vE the emission) keep their meaningful values; any other
     input (the beams' vA.., the paper birds' flat vK1..) its components from the point's hash, in [-1, 1]. No input
     at all: a full-screen pass (the sky), gl_FragCoord only, as before */
  const IN = [];
  for (const m of fsOld.matchAll(/(?<=^|[;\s}])((?:centroid|flat|smooth)\s+)?in\s+(?:(?:highp|mediump|lowp)\s+)?(float|vec[234]|int|ivec[234]|uint|uvec[234])\s+([^;]+);/g))
    for (const nm of m[3].split(',').map((x) => x.trim()).filter(Boolean)) IN.push({ q: (m[1] || '').trim(), t: m[2], n: nm });
  const full = IN.length === 0, mesh = IN.some((v) => v.n === 'vC' && v.t === 'vec4') && IN.some((v) => v.n === 'vY');
  let K = 6;
  const KNOWN = {
    'vW:vec3': 'vW = vec3(uTG.x + ij.x * uTG.z, uCamT.y - 140.0 + 150.0 * hr(u, 1u), uTG.y + ij.y * uTG.z);',
    'vN:vec3': 'vN = vec3(hr(u, 3u) * 2.0 - 1.0, mix(1.0, 0.05, hr(u, 2u) * hr(u, 2u)), hr(u, 4u) * 2.0 - 1.0) * (0.7 + 0.6 * hr(u, 5u));',
    'vX:float': "vX = -6.0 + 30.0 * hr(u, 6u);   // the coast's gap: under and over COAST_H (14 m)",
    'vC:vec4': mesh ? 'vC = vec4(hr(u, 6u), hr(u, 7u), hr(u, 8u), 1.0 + floor(hr(u, 9u) * 6.0) + 0.25 * hr(u, 10u));' : null,
    'vY:float': mesh ? 'vY = 20.0 * hr(u, 11u);' : null,
    'vE:vec2': mesh ? 'vE = vec2(hr(u, 12u), hr(u, 13u));' : null };
  /* a beam's (the FS reads flat vA, vB: its ends and radii, vC its colour and core, vD its drawing, vE its windows): one
     beam 6-30 m before the camera, 12-18 m across (a good share of the rays through it), drawn whole (vD.z under -1e8), its points' rays from the camera
     (vW the grid's points) through it or past it */
  if (IN.some((v) => v.n === 'vA' && v.q === 'flat') && IN.some((v) => v.n === 'vB' && v.q === 'flat')) Object.assign(KNOWN, {
    'vA:vec4': 'vA = vec4(uCamT + vec3(0.0, -6.0, 6.0), 6.0);',
    'vB:vec4': 'vB = vec4(uCamT + vec3(3.0, 12.0, 30.0), 9.0);',
    'vC:vec4': 'vC = vec4(hr(u, 61u), hr(u, 62u), hr(u, 63u), hr(u, 64u));',
    'vD:vec4': 'vD = vec4(0.0, 0.0, -2e8, 1.0);',
    'vE:vec4': 'vE = vec4(0.2, 0.2, 0.0, 0.0);',
    'vW:vec3': 'vW = vec3(uTG.x + ij.x * uTG.z, uCamT.y - 30.0 + 60.0 * hr(u, 1u), uTG.y + ij.y * uTG.z);' });
  /* a paper bird's (the FS reads its row of points from uPts by vK1.x): the row one of eight, the wing's state (vK1.y),
     its stroke and its width (vK1.z, w); uPts' points spread over the whole target (below), so its facets cover it */
  const BIRD = /\buPts\b/.test(fsOld) && IN.some((v) => v.n === 'vK1');
  if (BIRD) KNOWN['vK1:vec4'] = 'vK1 = vec4(floor(hr(u, 71u) * 8.0), step(0.5, hr(u, 72u)), 2.0 + 4.0 * hr(u, 73u), 0.5 + 2.0 * hr(u, 74u));';
  const gen = (v) => {   // any other input: each component from the hash (another key a component), in [-1, 1]
    const n = { float: 1, int: 1, uint: 1 }[v.t] || +v.t.slice(-1), base = v.t.replace(/[234]$/, '').replace(/^vec$/, 'float').replace(/^ivec$/, 'int').replace(/^uvec$/, 'uint');
    const c = []; for (let k = 0; k < n; k++) { K++; c.push(base === 'float' ? 'hr(u, ' + (100 + K) + 'u) * 2.0 - 1.0' : base === 'int' ? 'int(hr(u, ' + (100 + K) + 'u) * 8.0)' : 'uint(hr(u, ' + (100 + K) + 'u) * 8.0)'); }
    return v.n + ' = ' + (n === 1 ? c[0] : v.t + '(' + c.join(', ') + ')') + ';';
  };
  if (full) VS = `#version 300 es
precision highp float; uniform vec4 uTG; uniform vec3 uCamT; uniform uint uSeedT;
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
  else VS = VS.replace('centroid out vec3 vW; centroid out vec3 vN; VX_DECL', IN.map((v) => (v.q ? v.q + ' ' : '') + 'out ' + v.t + ' ' + v.n + ';').join(' '))
    .replace(/  vW = vec3\(uTG\.x[^\n]*\n  float steep[^\n]*\n  vN = [^\n]*\n  VX_LINE/, IN.map((v) => '  ' + (KNOWN[v.n + ':' + v.t] || gen(v))).join('\n'));
  if (!full && (/VX_LINE|VX_DECL/.test(VS))) throw new Error('fsbits: the test vertex stage was not made');
  const br = await PW.chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-program-cache', '--disable-gpu-shader-disk-cache', '--enable-privileged-webgl-extensions'] });
  let res;
  try {
    const page = await (await br.newContext()).newPage();
    const ren = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d.UNMASKED_RENDERER_WEBGL); });
    if (!/RTX 4090/.test(ren) || !/Direct3D11/.test(ren)) throw new Error('not the 4090 on D3D11: ' + ren);
    console.error('[fsbits] renderer ' + ren);
    res = await page.evaluate(async ([VS, FS0, FS1, SKIES, FULL, ATT]) => {
      const g = document.createElement('canvas').getContext('webgl2');
      if (!g.getExtension('EXT_color_buffer_float')) throw new Error('no EXT_color_buffer_float');
      const mk = (t, s) => { const h = g.createShader(t); g.shaderSource(h, s); g.compileShader(h); if (!g.getShaderParameter(h, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(h)); return h; };
      const link = (f) => { const p = g.createProgram(); g.attachShader(p, mk(g.VERTEX_SHADER, VS)); g.attachShader(p, mk(g.FRAGMENT_SHADER, f)); g.linkProgram(p); if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(p)); return p; };
      const P = [link(FS0), link(FS1)];
      let seed = 1; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
      const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
      // textures, by kind (one set for the whole run: the same both sides)
      const T3 = g.createTexture(); g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_3D, T3);
      { const n = 32, d = new Uint8Array(n * n * n * 4); for (let i = 0; i < d.length; i++) d[i] = (rnd() * 256) | 0;
        g.texImage3D(g.TEXTURE_3D, 0, g.RGBA8, n, n, n, 0, g.RGBA, g.UNSIGNED_BYTE, d);
        for (const k of [g.TEXTURE_WRAP_S, g.TEXTURE_WRAP_T, g.TEXTURE_WRAP_R]) g.texParameteri(g.TEXTURE_3D, k, g.REPEAT);
        g.texParameteri(g.TEXTURE_3D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_3D, g.TEXTURE_MAG_FILTER, g.LINEAR); }
      const t2 = (w, h, f) => { const t = g.createTexture(); g.bindTexture(g.TEXTURE_2D, t); const d = new Float32Array(w * h * 4); for (let i = 0; i < w * h; i++) { const v = f(i); for (let k = 0; k < 4; k++) d[i * 4 + k] = v[k]; }
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA32F, w, h, 0, g.RGBA, g.FLOAT, d); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST); return t; };
      const TKW = t2(128, 160, () => [rnd(), rnd() * rnd(), -65 + 120 * rnd(), 30 * rnd()]);
      const TG = t2(160, 160, () => [-40 + 120 * rnd(), rnd(), rnd(), rnd()]);
      const TX = t2(64, 64, () => [rnd(), rnd(), rnd(), rnd()]);
      /* the land's height passes (HPSPLIT: an FS with uHsrc): their inputs as the page gives them. uHP0..4 the earlier
         passes' texels over the whole target (heights -60..120 m, slopes, weights); uTex the probe's points (x, z within
         5 km of the camera); uLevA the clipmap's ten levels about the camera, as hpClip makes them; uGCw a grid 20 m a
         texel; uHsrc each mode in turn (the sky's index, mod 3) */
      const HPS = /uniform\s+int\s+uHsrc\b/.test(FS0);
      // (a paper bird's points: eight rows of 46, each point's x, y on the 512 x 512 target and its depth)
      const BRD = /\buPts\b/.test(FS0), TPTS = BRD ? t2(46, 8, () => [512 * rnd(), 512 * rnd(), rnd(), 1]) : null;
      const THP = HPS ? t2(512, 512, () => [-60 + 180 * rnd(), rnd() - 0.5, rnd() - 0.5, rnd()]) : null;
      const camOf = (sky) => [37.5 + sky * 911, 120 + 40 * sky, -18.25 - sky * 613];
      /* the clouds' bakes and their body: the density bake (an FS with uLobeN: 24 lobes inside its box, the layer by the
         sky) and the body's march (an FS with uVH: a box about the camera, its own steps, the land's depth far behind) */
      const VDN = /uniform\s+int\s+uLobeN\b/.test(FS0), VBD = /uniform\s+vec3\s+uVC\s*,\s*uVH\b/.test(FS0);
      const TLD = t2(512, 512, () => [500 + 4500 * rnd(), 0, 0, 1]);   // (the land's linear depth, 0.5-5 km: any FS that reads uLinD)
      const TPT = HPS ? (() => { const c = camOf(0); return t2(512, 512, () => [c[0] + 10000 * (rnd() - 0.5), c[2] + 10000 * (rnd() - 0.5), 0, 1]); })() : null;
      const N = 512, rt = g.createTexture(); g.bindTexture(g.TEXTURE_2D, rt); g.texStorage2D(g.TEXTURE_2D, 1, g.RGBA32F, N, N);
      const fb = g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER, fb); g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, rt, 0);
      // (--old-att / --new-att) a framebuffer of K + 1 targets per side that reads attachment K
      const fbOf = (K) => { if (!K) return fb; const f = g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER, f); const db = [];
        for (let a = 0; a <= K; a++) { const x = g.createTexture(); g.bindTexture(g.TEXTURE_2D, x); g.texStorage2D(g.TEXTURE_2D, 1, g.RGBA32F, N, N); g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0 + a, g.TEXTURE_2D, x, 0); db.push(g.COLOR_ATTACHMENT0 + a); }
        g.drawBuffers(db); g.readBuffer(g.COLOR_ATTACHMENT0 + K); return f; };
      const FBS = [fbOf(ATT.old), fbOf(ATT.new)]; g.bindFramebuffer(g.FRAMEBUFFER, fb);
      g.bindVertexArray(g.createVertexArray()); g.viewport(0, 0, N, N);
      // a uniform's value for a sky: by its name, seeded; the few with a meaning get a range that makes sense
      const val = (name, n, sky) => {
        seed = (hash(name) ^ (sky * 2654435761)) >>> 0 || 1; const a = []; for (let i = 0; i < n; i++) a.push(rnd()); const nm = name.replace(/\[0\]$/, '');
        const R = { uFog: [3e-4 * a[0], 2e-3 * a[1], 200 * a[2] - 100, 1e-5 * a[3]], uFog2: [0.5 + a[0], 0.2 * a[1] - 0.1], uFogB: [a[0], a[1], a[2], a[3]],
          uHaze: [sky % 3 === 0 ? 0 : 0.01 * a[0], 20 + 180 * a[1], 100 * a[2], 0], uTwM: [sky % 2 ? 0.6 * a[0] : 0, 0.05 + 0.1 * a[1], 0.02 + 0.1 * a[2], 0],
          uSkyK: [a[0], 2 + 20 * a[1], a[2], a[3]], uGlow: [a[0], 2 + 60 * a[1], a[2], 2 + 400 * a[3]], uRes: FULL ? [512, 512] : [1440, 900], uProj: FULL ? [0.3 + 1.5 * a[0], 0.3 + 1.2 * a[1], 0.1, 0.0] : [1.6, 1.0, 0.1, 0.0], uCamF: [0.3 * a[0] - 0.15, 0.4 + 0.6 * a[1], 0.3 * a[2] - 0.15], uSunD: [0.9995 + 0.0005 * a[0], a[1], 0.2 + 0.8 * a[2], a[3]], uNight: [a[0], a[1], a[2], 0.05 + 0.4 * a[3]],
          uKWc: [0, 0, 40, 128], uKFc: [0, 0, 400, 64], uGC: [-320, -320, 4, 160], uT: [100 * a[0]] };
        if (R[nm]) return R[nm].slice(0, n);
        if (nm === 'uSun' || nm === 'uSkyS') { const y = 0.05 + 0.9 * a[1], r = Math.sqrt(1 - y * y), th = 6.283 * a[0]; return [r * Math.cos(th), y, r * Math.sin(th)]; }
        return a;
      };
      const cmp = (A, B) => { const ua = new Uint32Array(A.buffer), ub = new Uint32Array(B.buffer); let n = 0, nan = 0, maxd = 0, sum = 0;
        for (let i = 0; i < A.length; i++) { if (A[i] !== A[i]) nan++; sum += Math.abs(A[i]); if (ua[i] !== ub[i]) { n++; const d = Math.abs(A[i] - B[i]); if (d > maxd) maxd = d; } }
        return { differ: n, of: A.length, maxAbs: maxd, nan, meanAbs: sum / A.length }; };
      const out = [];
      const grids = FULL ? [[1, 'frame a'], [2, 'frame b'], [3, 'frame c']] : [[0.25, 'near (ripples, grain)'], [3.0, 'mid'], [40.0, 'far']];
      for (let sky = 0; sky < SKIES; sky++) for (const [sp, what] of grids) {
        const R = [];
        for (const [pi, p] of [[0, P[0]], [1, P[1]], [0, P[0]]]) {   // (old, new, and old again: is the old one steady?)
          g.bindFramebuffer(g.FRAMEBUFFER, FBS[pi]); g.useProgram(p); g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT);
          const cam = [37.5 + sky * 911, 120 + 40 * sky, -18.25 - sky * 613];
          const nu = g.getProgramParameter(p, g.ACTIVE_UNIFORMS); let unit = 1;
          for (let i = 0; i < nu; i++) {
            const info = g.getActiveUniform(p, i), L = g.getUniformLocation(p, info.name), base = info.name.replace(/\[0\]$/, '');
            if (base === 'uTG' || base === 'uCamT' || base === 'uSeedT' || base === 'uZ' || base === 'uDbg' || base === 'uPm') continue;
            const t = info.type, sz = info.size;
            if (t === g.SAMPLER_3D) { g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_3D, T3); g.uniform1i(L, 0); continue; }
            if (t === g.SAMPLER_2D) { g.activeTexture(g.TEXTURE0 + unit); g.bindTexture(g.TEXTURE_2D, base === 'uKW' ? TKW : base === 'uGround' ? TG : HPS && /^uHP\d$/.test(base) ? THP : HPS && base === 'uTex' ? TPT : base === 'uLinD' ? TLD : BRD && base === 'uPts' ? TPTS : TX); g.uniform1i(L, unit); unit++; continue; }
            const comps = { [g.FLOAT]: 1, [g.FLOAT_VEC2]: 2, [g.FLOAT_VEC3]: 3, [g.FLOAT_VEC4]: 4, [g.FLOAT_MAT4]: 16, [g.INT]: 1, [g.UNSIGNED_INT]: 1 }[t];
            if (!comps) throw new Error('uniform type ' + t + ' of ' + info.name);
            const v = []; for (let k = 0; k < sz; k++) v.push(...val(base + (sz > 1 ? '#' + k : ''), comps, sky));
            if (base === 'uCam') { v[0] = cam[0]; v[1] = cam[1]; v[2] = cam[2]; }
            if (base === 'uT') v[0] = 37.7 * sp + 3.1 * sky;   // (three times a sky: the stars' twinkle, the wisps)
            if (base === 'uP') { v[36] = Math.cos(sky); v[37] = Math.sin(sky); v[39] = -160; v[60] = 1; }   // uP[9]: the wind, SEA_Y; uP[15].x the sea's light
            if (HPS && base === 'uLevA') for (let l = 0; l < 10; l++) { const gg = 0.35 * Math.pow(2, l); v[l * 4] = cam[0] - 48 * gg; v[l * 4 + 1] = cam[2] - 48 * gg; v[l * 4 + 2] = gg; v[l * 4 + 3] = 48; }
            if (HPS && base === 'uGCw') { v[0] = cam[0] - 256 * 20; v[1] = cam[2] - 256 * 20; v[2] = 20; v[3] = 0; }
            if (HPS && base === 'uHsrc') { g.uniform1i(L, sky % 3); continue; }
            if (VDN && base === 'uLobeN') { g.uniform1i(L, 24); continue; }
            if (VDN && base === 'uLobe') for (let k = 0; k < sz; k++) { const r = val('uLobe#' + k, 4, sky); v[k * 4] = (r[0] - 0.5) * 120; v[k * 4 + 1] = (r[1] - 0.5) * 40; v[k * 4 + 2] = (r[2] - 0.5) * 120; v[k * 4 + 3] = 8 + 20 * r[3]; }
            if (VDN && base === 'uHalf') { v[0] = 80; v[1] = 30; v[2] = 80; }
            if (VDN && base === 'uDims') { v[0] = 512; v[1] = 512; v[2] = 44; }
            if (VDN && base === 'uLayer') v[0] = (sky * 7) % 44;
            if (VDN && base === 'uVK') { v[0] = 0.3; v[1] = 4; v[2] = 30; v[3] = 12; }
            if (VDN && base === 'uVK2') { v[0] = 0; v[1] = 1; v[2] = 6; v[3] = 0.5; }
            if (VBD && base === 'uVC') { v[0] = cam[0]; v[1] = cam[1] - 40; v[2] = cam[2]; }
            if (VBD && base === 'uVH') { v[0] = 300; v[1] = 120; v[2] = 300; }
            if (VBD && base === 'uVY') { v[0] = Math.cos(0.4 * sky); v[1] = Math.sin(0.4 * sky); }
            if (VBD && base === 'uVR') { v[1] = 32; v[3] = 1; }
            if (VBD && base === 'uVS') { v[0] = 10; v[1] = 2; v[2] = 1e4; }
            if (VBD && base === 'uVR2') v[3] = -1e4;
            if (base === 'uLinS') { v[0] = 255; v[1] = 255; }
            if (BRD && base === 'uOut') { v[0] = 512; v[1] = 512; }
            if (BRD && base === 'uLand') v[2] = 1;
            if (BRD && base === 'uBl') v[3] = 0;
            if (BRD && base === 'uMode') v[0] = 0;   // (the depth's half-resolution size: the texel the FS clamps to)
            if (t === g.FLOAT) g.uniform1fv(L, v); else if (t === g.FLOAT_VEC2) g.uniform2fv(L, v); else if (t === g.FLOAT_VEC3) g.uniform3fv(L, v);
            else if (t === g.FLOAT_VEC4) g.uniform4fv(L, v); else if (t === g.FLOAT_MAT4) g.uniformMatrix4fv(L, false, v);
            else if (t === g.INT) g.uniform1i(L, 0); else if (t === g.UNSIGNED_INT) g.uniform1ui(L, (v[0] * 4294967295) >>> 0);
          }
          g.uniform4f(g.getUniformLocation(p, 'uTG'), cam[0] - sp * N / 2, cam[2] - sp * N / 2, sp, N);
          g.uniform3f(g.getUniformLocation(p, 'uCamT'), cam[0], cam[1], cam[2]); g.uniform1ui(g.getUniformLocation(p, 'uSeedT'), sky * 7919 + 13);
          if (FULL) g.drawArrays(g.TRIANGLES, 0, 3); else g.drawArrays(g.POINTS, 0, N * N);
          const b = new Float32Array(N * N * 4); g.readPixels(0, 0, N, N, g.RGBA, g.FLOAT, b); R.push(b);
        }
        // coverage: the share of pixels off the most common output (a read where every pixel came out alike, a shader
        // that discarded or took one path everywhere, proves nothing: unread)
        const live = (() => { const m = new Map(); let best = 0, n = R[0].length / 4; for (let i = 0; i < n; i++) { const k = R[0][i * 4] + ',' + R[0][i * 4 + 1] + ',' + R[0][i * 4 + 2] + ',' + R[0][i * 4 + 3]; const c = (m.get(k) || 0) + 1; m.set(k, c); if (c > best) best = c; } return 1 - best / n; })();
        // steadiness: the old shader drawn twice must give the same words (the clouds' density bake, measured, does not
        // always on this GPU: a draw a run 1e-6 apart); an unsteady read proves nothing either way: unread
        out.push(Object.assign({ sky, spacing: sp, what, live: +live.toFixed(4), unsteady: cmp(R[0], R[2]).differ }, cmp(R[0], R[1])));
      }
      return out;
    }, [VS, fsOld, fsNew, SKIES, full, ATT]);
  } finally { await br.close(); }
  fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
  let bad = 0, tot = 0, liveN = 0;
  for (const r of res) { bad += r.differ; tot += r.of; if (r.live >= 0.05) liveN++; console.log('sky ' + r.sky + ' ' + r.what + ': ' + r.differ + '/' + r.of + (r.differ ? ' max ' + r.maxAbs.toExponential(2) : '') + (r.nan ? ' nan ' + r.nan : '') + ' (mean |oC| ' + r.meanAbs.toFixed(3) + ', live ' + (100 * r.live).toFixed(1) + '%)'); }
  // IDENTICAL only where the read ran the shader's work: a third of the draws or more with 5% or more of the pixels off
  // the most common output; else nothing is claimed (exit 1: T2 counts the shader unread, the safe side)
  const unsteady = res.filter((r) => r.unsteady).length;
  if (unsteady) { console.log('UNREAD: the old shader drawn twice disagreed in ' + unsteady + ' of ' + res.length + ' draws (not steady on this GPU)'); process.exit(1); }
  if (!bad && liveN * 3 < res.length) { console.log('UNREAD: the output was constant (' + liveN + ' of ' + res.length + ' draws live)'); process.exit(1); }
  console.log((bad ? 'DIFFER: ' : 'IDENTICAL: ') + bad + ' of ' + tot + ' words');
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
