'use strict';
// seams.js (tools/gpu): the land's clipmap rings meet without a crack far from the start, on a real GPU compiler.
// The page's own land programs (the build's index.html in headless Chrome; every program whose VS declares
// `uniform vec4 uLev;`, exactly as the page hands shaderSource) are linked again in the page with vW captured by
// transform feedback (rasteriser off), and drawn over the edge vertices of each pair of rings: a finer ring's outer
// edge, then the next ring's inner edge at the same points. Both rings must put each shared vertex at the same fp32
// bits (vW.x, vW.z): a seam apart is the owner's one-pixel line across the land (2026-11-14). Cameras out to 2e6 m
// (681 km: a tab open for hours). Both land paths: the one-program land (every Mac, iPhone, Android) and the split
// land (HPSPLIT: ANGLE D3D11): the land VS carries both bodies on every device, so each is linked from the one
// source the page gave, with its `#define HPSPLIT` taken out or put in after #version (the heights read from the
// passes' unbound textures, 0: the placement alone is under test, and it is all in the VS).
// The ring uniforms as the draw makes them (whole cells, 414/hpClip), or as main made them (origin metres) when the VS
// still places from metres, so a base build can be read against a head.
//   node tools/gpu/seams.js BUILD_DIR OUT.json            on the RTX 4090 through ANGLE D3D11 (pw.js)
//   PW_CORE=<playwright-core> node tools/gpu/seams.js BUILD_DIR OUT.json --soft   SwiftShader (any machine)
// Prints SEAMS OK or SEAMS APART (exit 0 / 1); exit 2 when no land program was read.
const fs = require('fs'), path = require('path'), url = require('url');
const [dir, outFile] = process.argv.slice(2);
const SOFT = process.argv.includes('--soft');
const PW = SOFT ? require(process.env.PW_CORE || 'playwright-core') : require('./pw.js');
const GN = 96;
// the rings each surface draws, as the world defines them (180's surfaces: `levels`); LEVELS rings meet at LEVELS - 1 seams
const DEF = fs.readFileSync(path.join(__dirname, '../../src/world/180-world-definition-two-kits-by.js'), 'utf8');
const LEV = { land: Number(/height: 'Hd'[^}]*levels: (\d+)/.exec(DEF)[1]), sea: Number(/height: 'HdSea'[^}]*levels: (\d+)/.exec(DEF)[1]) };
let LEVELS = LEV.land;
let G0 = 0.35;   // (the surface's finest cell: the land's 0.35 m, the sea's 2 m: 180-world-definition)
const CAMS = [[0.1, 40, -0.2], [681043.7, 220, 3317.9], [-681043.7, 220, -3317.9], [123456.7, 90, -654321.3], [2e6 - 3.3, 90, -2e6 + 7.1]];

// a fragment shader for a VS: its varyings read in, nothing else (the scene's FS is not under test; the land VS's two
// bodies declare the same ones)
function fsFor(vs) {
  const code = vs.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const ins = [...code.matchAll(/(?<=^|[;{}\s])((?:flat|centroid|smooth)\s+)*out\s+(?:highp\s+)?(float|vec[234])\s+([^;(){}]+);/g)].map((m) => (m[1] || '') + 'in highp ' + m[2] + ' ' + m[3] + ';');
  return '#version 300 es\nprecision highp float;\n' + [...new Set(ins)].join('\n') + '\nout vec4 oZ;\nvoid main() { oZ = vec4(0.0); }\n';
}

// in the page: one program, the pairs of every camera, vW read back
function runInPage([vs, fsrc, jobs]) {
  const cv = document.createElement('canvas'), gl = cv.getContext('webgl2');
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsrc));
  gl.bindAttribLocation(p, 0, 'aG'); gl.transformFeedbackVaryings(p, ['vW'], gl.SEPARATE_ATTRIBS); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  gl.useProgram(p);
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); let unit = 0;
  for (let i = 0; i < n; i++) {   // every sampler its own unit (nothing bound: texelFetch reads 0), the rest left 0
    const u = gl.getActiveUniform(p, i);
    if (/SAMPLER/.test(Object.keys(WebGL2RenderingContext).find((k) => WebGL2RenderingContext[k] === u.type && /SAMPLER/.test(k)) || '')) gl.uniform1i(gl.getUniformLocation(p, u.name), unit++);
  }
  const L = (nm) => gl.getUniformLocation(p, nm);
  if (L('uVP')) gl.uniformMatrix4fv(L('uVP'), false, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const vb = gl.createBuffer(), tb = gl.createBuffer(), tf = gl.createTransformFeedback(), vao = gl.createVertexArray();
  gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.RASTERIZER_DISCARD);
  const draw = (lev, lvl, cam, aG) => {
    gl.uniform4fv(L('uLev'), lev); if (L('uLvl')) gl.uniform1i(L('uLvl'), lvl); gl.uniform3fv(L('uCam'), cam);
    gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(aG), gl.STREAM_DRAW);
    const k = aG.length / 2; gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tb); gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, k * 12, gl.STREAM_READ);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf); gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, tb);
    gl.beginTransformFeedback(gl.POINTS); gl.drawArrays(gl.POINTS, 0, k); gl.endTransformFeedback();
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    const r = new Float32Array(k * 3); gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tb); gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, r); return Array.from(r);
  };
  return jobs.map((J) => ({ fine: draw(J.lf, J.l, J.cam, J.af), coarse: draw(J.lc, J.l + 1, J.cam, J.ac) }));
}

function ringUniform(cam, l, metres) {
  const g = G0 * Math.pow(2, l), ix = Math.floor(cam[0] / (2 * g)) * 2 - GN / 2, iz = Math.floor(cam[2] / (2 * g)) * 2 - GN / 2;
  return metres ? [ix * g, iz * g, g, GN / 2] : [ix, iz, g, GN / 2];
}
function jobsFor(cam, metres) {   // each pair: the fine ring's edge vertices and, in doubles, the coarse vertex each lands on (odd ones pulled to their even neighbour)
  const J = [];
  for (let l = 0; l + 1 < LEVELS; l++) {
    const af = [], ac = [], seen = new Set(), o = (a, ll) => Math.floor(cam[a] / (2 * G0 * Math.pow(2, ll))) * 2 - GN / 2;
    const fx = o(0, l), fz = o(2, l), cx = o(0, l + 1), cz = o(2, l + 1);   // (the rings' corners in their own cells: the fine one's even)
    for (let k = 0; k <= GN; k++) for (const [i, j] of [[k, 0], [k, GN], [0, k], [GN, k]]) {
      if (seen.has(i + ',' + j)) continue; seen.add(i + ',' + j);
      // past the morph's end on the fine edge (m = 1) an odd index is pulled to the even one below: a coarse vertex
      af.push(i, j); ac.push((fx + i - (i & 1)) / 2 - cx, (fz + j - (j & 1)) / 2 - cz);
    }
    J.push({ l, cam, af, ac, lf: ringUniform(cam, l, metres), lc: ringUniform(cam, l + 1, metres) });
  }
  return J;
}

(async () => {
  const { serve } = await import(url.pathToFileURL(path.join(__dirname, '../../.github/ci/serve.mjs')).href);
  const H = await import(url.pathToFileURL(path.join(__dirname, '../../.github/ci/harness.mjs')).href);
  const srv = await serve(dir);
  // (the T1 harness's page: the clock paused and stepped, the visit's entropy fixed, the NVIDIA D3D11 persona; its
  // census keeps every source the page hands shaderSource)
  const br = SOFT ? await H.launch() : await PW.chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const res = { soft: SOFT, paths: [] };
  try {
    const arm = await H.openPage(br, srv.url, { vp: [1440, 900, 1], persona: 'nvidia', epoch: Date.parse('2026-11-05T17:30:00Z'), seeds: [77], census: true });
    const pg = arm.page;
    let land = [];
    for (let s = 0; s < 400 && land.length < 2; s++) { await H.step(arm, 5); land = await pg.evaluate(() => window.__ci.src.filter((x) => /uniform vec4 uLev;/.test(x))); }
    land = [...new Set(land)];
    const ren = await pg.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'), d = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d.UNMASKED_RENDERER_WEBGL); });
    const vars = [];
    for (const vs0 of land) {
      const sea = !/#ifdef HPSPLIT/.test(vs0), base = vs0.replace(/^#define HPSPLIT\n/m, '');
      if (sea) vars.push(['sea', 2, base]);
      else { vars.push(['land (one program)', 0.35, base]); vars.push(['land (split)', 0.35, base.replace(/^(#version[^\n]*\n)/, '$1#define HPSPLIT\n')]); }
    }
    for (const [name, g0, vs] of vars) {
      if (res.paths.some((x) => x.name === name)) continue;
      G0 = g0; LEVELS = name === 'sea' ? LEV.sea : LEV.land; const metres = /uLev\.xy \+ aG \* uLev\.z/.test(vs), f = fsFor(vs);
      let n = 0, apart = 0, first = null;
      for (const cam of CAMS) {
        const jobs = jobsFor(cam, metres), out = await pg.evaluate(runInPage, [vs, f, jobs]);
        out.forEach((o, q) => {
          const J = jobs[q];
          for (let v = 0; v < J.af.length / 2; v++) {
            n++;
            const fx = o.fine[v * 3], fz = o.fine[v * 3 + 2], cx = o.coarse[v * 3], cz = o.coarse[v * 3 + 2];
            if (fx !== cx || fz !== cz) { apart++; if (!first) first = { cam, level: J.l, fine: [J.af[v * 2], J.af[v * 2 + 1], fx, fz], coarse: [J.ac[v * 2], J.ac[v * 2 + 1], cx, cz] }; }
          }
        });
      }
      res.paths.push({ name, renderer: ren, metres, n, apart, first });
      console.log(`${name.padEnd(20)} ${apart ? 'APART' : 'ok   '} ${apart} of ${n} seam vertices${metres ? ' (origin metres)' : ''}${first ? ' first ' + JSON.stringify(first) : ''}`);
    }
    await arm.ctx.close();
  } finally { await br.close(); await srv.close(); }
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
  const lands = res.paths.filter((x) => x.name !== 'sea');
  if (lands.length < 2) { console.log('seams: read ' + lands.length + ' of the 2 land paths'); process.exit(2); }
  const bad = res.paths.some((x) => x.apart);
  console.log(bad ? 'SEAMS APART' : 'SEAMS OK');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e.stack || e); process.exit(2); });
