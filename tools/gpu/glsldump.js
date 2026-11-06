'use strict';
// glsldump.js URL OUTDIR [--vp 1440x900@1] [--secs 25]: every program the page links (until the world shows or the time
// runs out), its two GLSL sources exactly as given to shaderSource, written as OUTDIR/<name>.vs.glsl and .fs.glsl, for
// hbits.js and fsbits.js. Names by what the source holds (the world's own names, as fxcdump.js read them):
//   world.surface<i>  a land surface's program (its VS has `uniform vec4 uLev;`), in link order
//   world.probe       the probe (its FS has `uniform int uPm;`)
//   engine.sky        the sky (its FS calls starAt)
//   world.mesh<i>     a mesh's program (its FS reads `in vec4 vC;`: landmarks, scatter), in link order
//   prog<i>           any other, in link order
// Also OUTDIR/programs.json: [name, vs sha-256, fs sha-256]. Headless Chrome on the RTX 4090 (pw.js).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const PW = require('./pw.js');
const [url, out] = process.argv.slice(2);
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const [W, H, DPR] = arg('vp', '1440x900@1').split(/[x@]/).map(Number), SECS = +arg('secs', 25), NAME = arg('gpuname', null);   // (--gpuname: the GPU name the page reads, to dump another maker's programs on this GPU)
const HOOK = () => {
  const P = new Map(), S = new Map(); window.__glsl = [];
  for (const C of [WebGL2RenderingContext.prototype]) {
    const ss = C.shaderSource, at = C.attachShader, lk = C.linkProgram, cs = C.createShader;
    C.createShader = function (t) { const s = cs.call(this, t); if (s) S.set(s, { t, src: '' }); return s; };
    C.shaderSource = function (s, src) { const o = S.get(s); if (o) o.src = src; return ss.call(this, s, src); };
    C.attachShader = function (p, s) { if (!P.has(p)) P.set(p, []); P.get(p).push(s); return at.call(this, p, s); };
    C.linkProgram = function (p) {
      const sh = (P.get(p) || []).map((s) => S.get(s)).filter(Boolean);
      const vs = sh.find((o) => o.t === 0x8B31), fsrc = sh.find((o) => o.t === 0x8B30);
      if (vs && fsrc) window.__glsl.push([vs.src, fsrc.src]);
      return lk.call(this, p);
    };
  }
};
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const br = await PW.chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, timezoneId: 'UTC' });
    const p = await ctx.newPage();
    const ren = await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d.UNMASKED_RENDERER_WEBGL); });
    if (!/RTX 4090/.test(ren) || !/D3D11/.test(ren)) throw new Error('the runner did not get the RTX 4090: ' + ren);
    await p.addInitScript(HOOK);
    if (NAME) await p.addInitScript((n) => { for (const C of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) { const gp = C.getParameter; C.getParameter = function (q) { return q === 0x9246 ? n : gp.call(this, q); }; } }, NAME);
    await p.goto(url, { waitUntil: 'load' });
    let n = -1, still = 0;
    for (let s = 0; s < SECS * 4; s++) {   // until no new program for 3 s (the boot's programs all linked) or the time is up
      await p.waitForTimeout(250); const m = await p.evaluate(() => window.__glsl.length);
      if (m === n) { if (++still >= 12 && m > 0) break; } else { n = m; still = 0; }
    }
    const L = await p.evaluate(() => window.__glsl);
    const cnt = {}, list = [], sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
    const nm = (vs, f) => /uniform vec4 uLev;/.test(vs) ? 'world.surface' : /uniform int uPm;/.test(f) ? 'world.probe' : /starAt\(/.test(f) ? 'engine.sky' : /in vec4 vC;/.test(f) ? 'world.mesh' : 'prog';
    for (const [vs, f] of L) {
      const b = nm(vs, f), i = cnt[b] || 0; cnt[b] = i + 1;
      // world.surface0, world.surface1 ...; world.probe and engine.sky plain the first time (prog0, world.mesh0 ...)
      const fin = (b === 'world.probe' || b === 'engine.sky') && i === 0 ? b : b + i;
      fs.writeFileSync(path.join(out, fin + '.vs.glsl'), vs); fs.writeFileSync(path.join(out, fin + '.fs.glsl'), f);
      list.push([fin, sha(vs), sha(f)]);
    }
    fs.writeFileSync(path.join(out, 'programs.json'), JSON.stringify(list, null, 1));
    console.log('glsldump: ' + list.length + ' programs from ' + url);
  } finally { await br.close(); }
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
