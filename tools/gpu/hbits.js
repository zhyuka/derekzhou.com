'use strict';
// hbits.js (fast500 lane D): two checks of a GLSL rewrite in headless Chrome on the RTX 4090 through ANGLE D3D11.
//   node hbits.js translate GLSL_DIR OUT_DIR [program ...]   ANGLE's HLSL (COMPILER INPUT HLSL) of each program's pair
//        <program>.vs.glsl + <program>.fs.glsl, linked as the page links them; written as <program>.<vs|fs>.txt
//   node hbits.js bits OLD_DIR NEW_DIR OUT.json             the land's height, old against new, bit for bit:
//        (a) the land VS's Hd(w) and HdGap(w, Hd(w).x) (world.surface0.vs.glsl, its main swapped for one that reads a
//            grid of points by gl_VertexID and writes vec4(Hd, HdGap) as a point into an RGBA32F target), and
//        (b) the probe FS (world.probe.fs.glsl as it is) in its grid modes uPm 2 (Hd) and 3 (the camera's ground),
//        over grids far and near, several salts and winds, with random weight grids (uKW: the same data both sides).
// Needs PW_CORE (playwright-core) and S2 (for stage2/pctools/pw.js: Chrome on the GPU, renderer checked).
const fs = require('fs'), path = require('path');
const PW = require('./pw.js');
const mode = process.argv[2];

async function browser() {
  const br = await PW.chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-program-cache',
    '--disable-gpu-shader-disk-cache', '--enable-privileged-webgl-extensions'] });
  const page = await (await br.newContext()).newPage();
  const ren = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d.UNMASKED_RENDERER_WEBGL); });
  if (!/RTX 4090/.test(ren) || !/Direct3D11/.test(ren)) { await br.close(); throw new Error('not the 4090 on D3D11: ' + ren); }
  console.error('[hbits] renderer ' + ren);
  return { br, page };
}

async function translate(dir, out, names) {
  fs.mkdirSync(out, { recursive: true });
  if (!names.length) names = [...new Set(fs.readdirSync(dir).filter((f) => /\.vs\.glsl$/.test(f)).map((f) => f.replace(/\.vs\.glsl$/, '')))];
  const { br, page } = await browser();
  try {
    for (const n of names) {
      const vs = fs.readFileSync(path.join(dir, n + '.vs.glsl'), 'utf8'), fsrc = fs.readFileSync(path.join(dir, n + '.fs.glsl'), 'utf8');
      const r = await page.evaluate(([vs, fsrc]) => {
        const g = document.createElement('canvas').getContext('webgl2'), x = g.getExtension('WEBGL_debug_shaders');
        const mk = (t, s) => { const h = g.createShader(t); g.shaderSource(h, s); g.compileShader(h); return h; };
        const a = mk(g.VERTEX_SHADER, vs), b = mk(g.FRAGMENT_SHADER, fsrc), p = g.createProgram();
        g.attachShader(p, a); g.attachShader(p, b); g.linkProgram(p);
        const ok = g.getProgramParameter(p, g.LINK_STATUS);
        return { ok, log: g.getProgramInfoLog(p) + (g.getShaderInfoLog(a) || '') + (g.getShaderInfoLog(b) || ''), vs: x.getTranslatedShaderSource(a), fs: x.getTranslatedShaderSource(b) };
      }, [vs, fsrc]);
      if (!r.ok) throw new Error(n + ': link failed: ' + r.log.slice(0, 2000));
      for (const k of ['vs', 'fs']) {
        if (!/COMPILER INPUT HLSL BEGIN/.test(r[k])) console.error('[hbits] ' + n + '.' + k + ': no COMPILER INPUT HLSL block');
        fs.writeFileSync(path.join(out, n + '.' + k + '.txt'), r[k]);
      }
      console.log('translated ' + n);
    }
  } finally { await br.close(); }
}

// the land VS's main for the check: a point per grid node, its value exact (a point's varyings are its vertex's)
const VS_MAIN = `uniform vec4 uTG;   // the grid: origin x, z; spacing (m); nodes across
out vec4 vT;
void main() {
  int W = int(uTG.w), i = gl_VertexID; vec2 ij = vec2(float(i % W), float(i / W));
  vec2 w = uTG.xy + ij * uTG.z;
  gLodD = length(w - uCam.xz);
  vec3 hd = Hd(w);
  vT = vec4(hd, HdGap(w, hd.x));
  gl_Position = vec4((ij + 0.5) / uTG.w * 2.0 - 1.0, 0.0, 1.0); gl_PointSize = 1.0;
}`;
const FS_PT = `#version 300 es
precision highp float; in vec4 vT; out vec4 o; void main() { o = vT; }`;

async function bits(oldDir, newDir, outFile) {
  const rd = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');
  // the land VS without its main: cut at its last main, or, where its mains sit in a preprocessor block (#ifdef HPSPLIT
  // ... #else ... #endif: a split's path and the plain one), at that block's #if
  const swapMain = (s) => {
    const first = s.indexOf('void main()'); if (first < 0) throw new Error('no main');
    let cut = s.lastIndexOf('void main()');
    if (s.lastIndexOf('#endif') > cut) { const head = s.slice(0, first), m = [...head.matchAll(/^#if[^\n]*$/gm)].pop(); if (m && head.indexOf('#endif', m.index) < 0) cut = m.index; }
    return s.slice(0, cut) + VS_MAIN + '\n';
  };
  const src = {};
  for (const [tag, d] of [['old', oldDir], ['new', newDir]]) src[tag] = { land: swapMain(rd(d, 'world.surface0.vs.glsl')), probeV: rd(d, 'world.probe.vs.glsl'), probeF: rd(d, 'world.probe.fs.glsl') };
  // the cases: [salt, wind angle, camera x, z, grid x0, z0, spacing, nodes]
  const cases = [];
  const salts = [0x9e3779b9, 12345, 0x51ed27aa, 777, 0xdeadbeef];
  salts.forEach((s, k) => {
    const a = k * 1.1, cx = (k - 2) * 2300.0, cz = (k * 3 - 5) * 1700.0;
    cases.push([s, a, cx, cz, cx - 6000, cz - 6000, 12000 / 512, 512]);   // far: across both weight grids' blends
    cases.push([s, a, cx, cz, cx - 512, cz - 512, 2.0, 512]);              // near: every tap on (gLodD small)
    cases.push([s, a, cx, cz, cx - 1600 + 37.3, cz - 1600 - 11.7, 6.25, 512]);   // between
  });
  const { br, page } = await browser();
  let res;
  try {
    res = await page.evaluate(async ([src, cases]) => {
      const cv = document.createElement('canvas'); const g = cv.getContext('webgl2');
      if (!g.getExtension('EXT_color_buffer_float')) throw new Error('no EXT_color_buffer_float');
      const mk = (t, s) => { const h = g.createShader(t); g.shaderSource(h, s); g.compileShader(h); if (!g.getShaderParameter(h, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(h)); return h; };
      const prog = (v, f) => { const p = g.createProgram(); g.attachShader(p, mk(g.VERTEX_SHADER, v)); g.attachShader(p, mk(g.FRAGMENT_SHADER, f)); g.linkProgram(p); if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(p)); return p; };
      const FS_PT = '#version 300 es\nprecision highp float; in vec4 vT; out vec4 o; void main() { o = vT; }';
      const P = {}; for (const t of ['old', 'new']) P[t] = { land: prog(src[t].land, FS_PT), probe: prog(src[t].probeV, src[t].probeF) };
      // the weights' grids (the same data both sides): KW 128 across (40 m), KF 64 across (400 m) in 32 rows under it
      let seed = 1; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
      const TW = 128, TH = 128 + 32, kw = new Float32Array(TW * TH * 4);
      for (let i = 0; i < TW * TH; i++) { kw[i * 4] = rnd(); kw[i * 4 + 1] = rnd() * rnd(); kw[i * 4 + 2] = -65 + 120 * rnd(); kw[i * 4 + 3] = 30 * rnd(); }
      const tex = g.createTexture(); g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, tex);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA32F, TW, TH, 0, g.RGBA, g.FLOAT, kw);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
      const N = 512, rt = g.createTexture(); g.bindTexture(g.TEXTURE_2D, rt); g.texStorage2D(g.TEXTURE_2D, 1, g.RGBA32F, N, N);
      const fb = g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER, fb); g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, rt, 0);
      g.bindTexture(g.TEXTURE_2D, tex);
      const vao = g.createVertexArray(); g.bindVertexArray(vao);
      const read = () => { const b = new Float32Array(N * N * 4); g.readPixels(0, 0, N, N, g.RGBA, g.FLOAT, b); return b; };
      const setU = (p, c, extra) => {
        g.useProgram(p); const u = (n) => g.getUniformLocation(p, n);
        g.uniform1ui(u('uSalt'), c[0] >>> 0);
        g.uniform3f(u('uCam'), c[2], 150.0, c[3]);
        const P24 = new Float32Array(96); P24[36] = Math.cos(c[1]); P24[37] = Math.sin(c[1]); P24[39] = -160; g.uniform4fv(u('uP[0]') || u('uP'), P24);
        g.uniform4f(u('uKWc'), c[2], c[3], 40.0, 128.0); g.uniform4f(u('uKFc'), c[2], c[3], 400.0, 64.0);
        g.uniform1i(u('uKW'), 0);
        extra(u);
      };
      const out = { cases: [] };
      for (const c of cases) {
        const R = {};
        for (const t of ['old', 'new']) {
          g.viewport(0, 0, N, N); g.clearColor(0, 0, 0, 0);
          g.clear(g.COLOR_BUFFER_BIT); setU(P[t].land, c, (u) => g.uniform4f(u('uTG'), c[4], c[5], c[6], c[7]));
          g.drawArrays(g.POINTS, 0, N * N); const L = read();
          const pr = {};
          for (const pm of [2, 3]) {
            g.clear(g.COLOR_BUFFER_BIT); setU(P[t].probe, c, (u) => { g.uniform1i(u('uPm'), pm); g.uniform4f(u('uGCw'), c[4], c[5], c[6], 0.0); });
            g.drawArrays(g.TRIANGLES, 0, 3); pr[pm] = read();
          }
          R[t] = { L, p2: pr[2], p3: pr[3] };
        }
        const cmp = (a, b, stride, chans) => {
          const ua = new Uint32Array(a.buffer), ub = new Uint32Array(b.buffer); let n = 0, tot = 0, maxd = 0, nan = 0, ex = null;
          for (let i = 0; i < a.length; i += 4) for (const ch of chans) {
            tot++; if (a[i + ch] !== a[i + ch]) nan++;
            if (ua[i + ch] !== ub[i + ch]) { n++; const d = Math.abs(a[i + ch] - b[i + ch]); if (d > maxd) { maxd = d; ex = [i / 4, ch, a[i + ch], b[i + ch]]; } }
          }
          return { differ: n, of: tot, maxAbs: maxd, nan, worst: ex };
        };
        const sum = (a) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i]); return s / (a.length / 4); };
        out.cases.push({ c, land: cmp(R.old.L, R.new.L, 4, [0, 1, 2, 3]), probeHd: cmp(R.old.p2, R.new.p2, 4, [0]), probeCam: cmp(R.old.p3, R.new.p3, 4, [0, 1, 2, 3]),
          meanAbsH: sum(R.old.L), meanAbsProbe: sum(R.old.p2) });
      }
      return out;
    }, [src, cases]);
  } finally { await br.close(); }
  fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
  let bad = 0;
  for (const k of res.cases) {
    const line = ['land', 'probeHd', 'probeCam'].map((x) => x + ' ' + k[x].differ + '/' + k[x].of + (k[x].differ ? ' max ' + k[x].maxAbs.toExponential(2) : '') + (k[x].nan ? ' nan ' + k[x].nan : '')).join('  ');
    bad += k.land.differ + k.probeHd.differ + k.probeCam.differ;
    console.log('salt ' + k.c[0] + ' grid ' + k.c[6].toFixed(2) + ' m: ' + line + '  (mean |h| ' + k.meanAbsH.toFixed(2) + ', probe ' + k.meanAbsProbe.toFixed(2) + ')');
  }
  console.log(bad ? 'DIFFER: ' + bad + ' values' : 'IDENTICAL: every value bit for bit');
}

(async () => {
  if (mode === 'translate') await translate(process.argv[3], process.argv[4], process.argv.slice(5));
  else if (mode === 'bits') await bits(process.argv[3], process.argv[4], process.argv[5]);
  else { console.error('usage: see the header'); process.exit(2); }
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
