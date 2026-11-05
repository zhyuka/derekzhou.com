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
  const mesh = /in vec4 vC;/.test(fsOld), full = !/in vec3 vW;/.test(fsOld);   // full: a full-screen pass (the sky): no varyings, gl_FragCoord
  if (full) VS = `#version 300 es
precision highp float; uniform vec4 uTG; uniform vec3 uCamT; uniform uint uSeedT;
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
  VS = VS.replace('VX_DECL', mesh ? 'centroid out vec4 vC; centroid out float vY; centroid out vec2 vE;' : 'out float vX;')
    .replace('VX_LINE', mesh ? 'vC = vec4(hr(u, 6u), hr(u, 7u), hr(u, 8u), 1.0 + floor(hr(u, 9u) * 6.0) + 0.25 * hr(u, 10u)); vY = 20.0 * hr(u, 11u); vE = vec2(hr(u, 12u), hr(u, 13u));'
      : 'vX = -6.0 + 30.0 * hr(u, 6u);   // the coast\'s gap: under and over COAST_H (14 m)');
  const br = await PW.chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-program-cache', '--disable-gpu-shader-disk-cache', '--enable-privileged-webgl-extensions'] });
  let res;
  try {
    const page = await (await br.newContext()).newPage();
    const ren = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d.UNMASKED_RENDERER_WEBGL); });
    if (!/RTX 4090/.test(ren) || !/Direct3D11/.test(ren)) throw new Error('not the 4090 on D3D11: ' + ren);
    console.error('[fsbits] renderer ' + ren);
    res = await page.evaluate(async ([VS, FS0, FS1, SKIES, FULL]) => {
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
      const N = 512, rt = g.createTexture(); g.bindTexture(g.TEXTURE_2D, rt); g.texStorage2D(g.TEXTURE_2D, 1, g.RGBA32F, N, N);
      const fb = g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER, fb); g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, rt, 0);
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
        for (const p of P) {
          g.useProgram(p); g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT);
          const cam = [37.5 + sky * 911, 120 + 40 * sky, -18.25 - sky * 613];
          const nu = g.getProgramParameter(p, g.ACTIVE_UNIFORMS); let unit = 1;
          for (let i = 0; i < nu; i++) {
            const info = g.getActiveUniform(p, i), L = g.getUniformLocation(p, info.name), base = info.name.replace(/\[0\]$/, '');
            if (base === 'uTG' || base === 'uCamT' || base === 'uSeedT' || base === 'uZ' || base === 'uDbg' || base === 'uPm') continue;
            const t = info.type, sz = info.size;
            if (t === g.SAMPLER_3D) { g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_3D, T3); g.uniform1i(L, 0); continue; }
            if (t === g.SAMPLER_2D) { g.activeTexture(g.TEXTURE0 + unit); g.bindTexture(g.TEXTURE_2D, base === 'uKW' ? TKW : base === 'uGround' ? TG : TX); g.uniform1i(L, unit); unit++; continue; }
            const comps = { [g.FLOAT]: 1, [g.FLOAT_VEC2]: 2, [g.FLOAT_VEC3]: 3, [g.FLOAT_VEC4]: 4, [g.FLOAT_MAT4]: 16, [g.INT]: 1, [g.UNSIGNED_INT]: 1 }[t];
            if (!comps) throw new Error('uniform type ' + t + ' of ' + info.name);
            const v = []; for (let k = 0; k < sz; k++) v.push(...val(base + (sz > 1 ? '#' + k : ''), comps, sky));
            if (base === 'uCam') { v[0] = cam[0]; v[1] = cam[1]; v[2] = cam[2]; }
            if (base === 'uT') v[0] = 37.7 * sp + 3.1 * sky;   // (three times a sky: the stars' twinkle, the wisps)
            if (base === 'uP') { v[36] = Math.cos(sky); v[37] = Math.sin(sky); v[39] = -160; v[60] = 1; }   // uP[9]: the wind, SEA_Y; uP[15].x the sea's light
            if (t === g.FLOAT) g.uniform1fv(L, v); else if (t === g.FLOAT_VEC2) g.uniform2fv(L, v); else if (t === g.FLOAT_VEC3) g.uniform3fv(L, v);
            else if (t === g.FLOAT_VEC4) g.uniform4fv(L, v); else if (t === g.FLOAT_MAT4) g.uniformMatrix4fv(L, false, v);
            else if (t === g.INT) g.uniform1i(L, 0); else if (t === g.UNSIGNED_INT) g.uniform1ui(L, (v[0] * 4294967295) >>> 0);
          }
          g.uniform4f(g.getUniformLocation(p, 'uTG'), cam[0] - sp * N / 2, cam[2] - sp * N / 2, sp, N);
          g.uniform3f(g.getUniformLocation(p, 'uCamT'), cam[0], cam[1], cam[2]); g.uniform1ui(g.getUniformLocation(p, 'uSeedT'), sky * 7919 + 13);
          if (FULL) g.drawArrays(g.TRIANGLES, 0, 3); else g.drawArrays(g.POINTS, 0, N * N);
          const b = new Float32Array(N * N * 4); g.readPixels(0, 0, N, N, g.RGBA, g.FLOAT, b); R.push(b);
        }
        out.push(Object.assign({ sky, spacing: sp, what }, cmp(R[0], R[1])));
      }
      return out;
    }, [VS, fsOld, fsNew, SKIES, full]);
  } finally { await br.close(); }
  fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
  let bad = 0, tot = 0;
  for (const r of res) { bad += r.differ; tot += r.of; console.log('sky ' + r.sky + ' ' + r.what + ': ' + r.differ + '/' + r.of + (r.differ ? ' max ' + r.maxAbs.toExponential(2) : '') + (r.nan ? ' nan ' + r.nan : '') + ' (mean |oC| ' + r.meanAbs.toFixed(3) + ')'); }
  console.log((bad ? 'DIFFER: ' : 'IDENTICAL: ') + bad + ' of ' + tot + ' words');
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
