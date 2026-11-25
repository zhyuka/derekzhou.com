// gust-glsl.mjs (tools/checks/44-gust-glsl.sh): the shaders' gust is the JS's, by value (RULES.json one-world-state).
// The air's GLSL (airGustGlsl(): airGust and its noise, with lib.glsl's hash) is rendered in headless Chrome (WebGL2,
// SwiftShader) at 4096 points (x, z, t) a visit for four visits over a sky order (the day, a change into the night), each read back as a float and held to gustAt at the
// same point, height and visit: a field carried the other way, a slice of its own, an axis flipped or a constant apart
// all fail. The world's JS is the assembled world.js's own air, run as the unit tests run it.
//   node tools/checks/lib/gust-glsl.mjs OUT_DIR   (exit 1 on a breach, 2 with no WebGL2 to run it in)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'gust-glsl-'));
execFileSync(process.execPath, [path.join(ROOT, 'tools/parts.mjs'), 'assemble', path.join(ROOT, 'src'), path.join(OUT, 'src')], { stdio: 'ignore' });
const WORLD = fs.readFileSync(path.join(OUT, 'src/world.js'), 'utf8');
const cut = (a, b) => { const i = WORLD.indexOf(a), j = WORLD.indexOf(b, i + a.length); if (i < 0 || j < 0) throw new Error('no anchor: ' + a.slice(0, 60)); return WORLD.slice(i, j); };
const STREAMS = cut('  /* ---------------------------------------------------------------- streams */', '  /* ----------------------------------------------------------------');
const AIR = cut("  /* ---------------------------------------------------------------- the air: the world's one state", '  var AIRAPI');
const G = vm.runInThisContext('(function () {\n  \'use strict\';\n  var PI = Math.PI, DEG = PI / 180, SIM = { V: null, t: 0 }, J = { seed: 0 }, SKY = { seq: [{ id: \'afterglow\', at: -30, hold: 90, move: 58 }, { id: \'bluehour\', at: 118, hold: 80, move: 56 }, { id: \'milkyway\', at: 254, hold: 120, move: 60 }, { id: \'firstlight\', at: 434, hold: 200, move: 55 }], dt: 0 };   // (a sky order: the day, a change into the night, the night)\n  function dirAzEl(az, el) { var a = az * DEG, e = el * DEG; return [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)]; }\n  function moonShown(t, o) { return o; }\n' + STREAMS + AIR +
  '  return { airDraw: airDraw, gustAt: gustAt, gustSigma: gustSigma, AIR_GUST: AIR_GUST, airSpeed: airSpeed, airShare: airShare, weather: weather, airClock: airClock, airGustGlsl: airGustGlsl, subseed: subseed, RNG: RNG };\n})')();
const lib = fs.readFileSync(path.join(ROOT, 'src/world/glsl/lib.glsl'), 'utf8').split('\n').filter((l) => /^(uint ih\(|uint ih2\(|float hf\()/.test(l)).join('\n');
const FS = '#version 300 es\nprecision highp float; precision highp int; precision highp sampler2D;\nuniform uint uSalt; uniform sampler2D uIn, uIn2; uniform vec2 uW; uniform float uU; out vec4 o;\n' + lib + '\n' + G.airGustGlsl() +
  'void main() { ivec2 q = ivec2(gl_FragCoord.xy); vec4 a = texelFetch(uIn, q, 0), b = texelFetch(uIn2, q, 0); o = vec4(airGust(a.xy, uW, uU, b.x, a.z), 0.0, 0.0, 1.0); }   // (a: x, z, the surface\'s clock; b.x: the gust\'s wind there and then)\n';
const N = 64, Y = 5, visits = [];
for (const seed of [7, 1234567, 0x9e3779b9, 31337]) {
  const V = { seed, salt: G.subseed(seed, 7) >>> 0 }; G.airDraw(G.RNG(G.subseed(seed, 5)), V);
  const inp = new Float32Array(N * N * 4), inp2 = new Float32Array(N * N * 4), want = new Float64Array(N * N), R = G.RNG(G.subseed(seed, 99));
  for (let i = 0; i < N * N; i++) {
    const x = Math.fround(R.r(-20000, 20000)), z = Math.fround(R.r(-20000, 20000)), t = R.r(0, 600), T = G.airClock(t);
    inp.set([x, z, T[0], 0], i * 4); inp2.set([G.gustSigma(Y, V, t) / G.AIR_GUST[0], 0, 0, 0], i * 4);
    want[i] = G.gustAt(x, z, Y, t, V);
  }
  visits.push({ seed, salt: V.salt, w: V.wind, U: V.u10, inp: Array.from(inp), inp2: Array.from(inp2), want: Array.from(want), sigma: G.AIR_GUST[0] * V.u10 * Math.exp(-1.5 * Y / G.AIR_GUST[3]) });
}
let PW; for (const n of [process.env.PW_CORE, 'playwright-core', 'playwright'].filter(Boolean)) { try { PW = createRequire(import.meta.url)(n); break; } catch {} }
if (!PW) { console.log('::warning::gust-glsl: no playwright-core'); process.exit(2); }
const args = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const b = await PW.chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args } : { args });
let res;
try {
  const page = await b.newPage();
  await page.setContent('<canvas width="64" height="64"></canvas>');
  res = await page.evaluate(([FS, N, visits]) => {
    const gl = document.querySelector('canvas').getContext('webgl2'); if (!gl) return { err: 'no webgl2' };
    if (!gl.getExtension('EXT_color_buffer_float')) return { err: 'no float target' };
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, '#version 300 es\nvoid main() { vec2 v = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 4.0 - 1.0; gl_Position = vec4(v, 0.0, 1.0); }'));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); gl.useProgram(p);
    const tin = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tin); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const tin2 = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tin2); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const tout = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tout); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, N, N);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tout, 0);
    gl.viewport(0, 0, N, N); const out = [];
    for (const v of visits) {
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tin); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, N, N, 0, gl.RGBA, gl.FLOAT, new Float32Array(v.inp));
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tin2); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, N, N, 0, gl.RGBA, gl.FLOAT, new Float32Array(v.inp2));
      gl.uniform1i(gl.getUniformLocation(p, 'uIn'), 0); gl.uniform1i(gl.getUniformLocation(p, 'uIn2'), 1); gl.uniform1ui(gl.getUniformLocation(p, 'uSalt'), v.salt);
      gl.uniform2f(gl.getUniformLocation(p, 'uW'), v.w[0], v.w[1]); gl.uniform1f(gl.getUniformLocation(p, 'uU'), v.U);
      gl.drawArrays(gl.TRIANGLES, 0, 3); const px = new Float32Array(N * N * 4); gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, px);
      out.push(Array.from({ length: N * N }, (_, i) => px[i * 4]));
    }
    return { out };
  }, [FS, N, visits]);
} catch (e) { res = { err: String(e && e.message || e) }; } finally { await b.close(); }
if (res.err) { const fatal = !/no webgl2|no float target/.test(res.err); console.log((fatal ? '::error::' : '::warning::') + 'gust-glsl: ' + res.err); process.exit(fatal ? 1 : 2); }
const errs = [];
visits.forEach((v, k) => {
  const g = res.out[k]; let worst = 0, sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < g.length; i++) { const d = Math.abs(g[i] - v.want[i]); worst = Math.max(worst, d); sab += g[i] * v.want[i]; saa += g[i] * g[i]; sbb += v.want[i] * v.want[i]; }
  const r = sab / Math.sqrt(saa * sbb), rel = worst / v.sigma;
  console.log(`gust-glsl: visit ${v.seed}: the shaders' gust against the JS's at ${g.length} points: correlation ${r.toFixed(6)}, worst ${rel.toFixed(4)} sigma`);
  if (!(r > 0.9999) || !(rel < 0.02)) errs.push(`visit ${v.seed}: the shaders' gust is not the JS's (correlation ${r.toFixed(4)}, worst ${rel.toFixed(3)} sigma)`);
});
if (errs.length) { for (const e of errs) console.log('::error::' + e); process.exit(1); }
console.log('gust-glsl: the shaders\' gust is the JS\'s, by value, on 4 visits');
