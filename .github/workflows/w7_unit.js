// w7_unit.js (CI: validate.yml's "Nothing darkens" step): the words' lift is gone (the owner's word of
// 2026-10-21), so the composite takes nothing from the words, and this test holds it to that. Two parts:
//  1. The shipped world.vN.js (comments stripped) names none of the lift's parts anywhere (liftWords, LIB_LIFT,
//     LIFT-BEGIN, uLiftOn, uVeil*, uLinkCore, worldToe, TOE_*), and the composite's tail (FS_COMP between W7-TAIL-BEGIN
//     and W7-TAIL-END) names no words input (no mask, keep-off, words' box, floor or gain uniform, no mk).
//  2. The tail, cut out of the shipped file and run in headless WebGL2 over N x N random grounds, pixels and clocks, is
//     the encode and the dither and nothing else: every 8-bit code it stores is the reference's (JS: sRGB encode of the
//     ground clamped to [0, 1], plus the one fixed R2 dither step, rounded) within TOL codes (the GPU's pow), never
//     lower (a darkening: a scrim, shadow, outline or dimming) and never higher (a lift: a panel, a floor, a glow).
// --mutate lift|dark|panel puts a fault into the tail before it runs (lift: c = max(c, vec3(0.18)); dark: c *= 0.9;
// panel: the old gain, c *= 1.1 inside a box of the window) and must then fail: the test's own proof that it catches
// what it is for. Exits 1 on any failure, 2 if it cannot run.
//   node w7_unit.js world.v1.js [--n 512] [--engine chromium|webkit|firefox] [--mutate lift|dark|panel]
'use strict';
const PW = require(process.env.PW_CORE || 'playwright-core');
const fs = require('fs');
const A = { _: [] }; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) A[a.slice(2)] = process.argv[++i]; else A._.push(a); }
async function launch() {
  const e = A.engine || 'chromium';
  if (e === 'webkit') return PW.webkit.launch(process.env.WEBKIT_PATH ? { executablePath: process.env.WEBKIT_PATH } : {});
  if (e === 'firefox') return PW.firefox.launch(Object.assign({ firefoxUserPrefs: { 'webgl.force-enabled': true, 'webgl.disabled': false } }, process.env.FIREFOX_PATH ? { executablePath: process.env.FIREFOX_PATH } : {}));
  const args = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  return process.env.CHROME_PATH ? PW.chromium.launch({ executablePath: process.env.CHROME_PATH, args }) : PW.chromium.launch({ channel: 'chrome', args });
}
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1'); }
const LIFT_PARTS = /\b(liftWords|LIB_LIFT|uLiftOn|uVeil\w*|uLinkCore|worldToe|TOE_F|TOE_Y1|TOE_TINT|LIFT_FEATHER|VEILK|veilFor)\b|LIFT-BEGIN/;
const WORDS_INPUTS = /\b(uMask\w*|uInkKeep|uKeep\w*|uWords|uLift\w*On|uVeil\w*|uLinkCore|uWordsK|uFloor\w*|uGainW\w*|mk|mk4|liftWords|worldToe)\b/;
(async () => {
  const file = A._[0];
  if (!file) { console.error('usage: node w7_unit.js world.vN.js'); process.exit(2); }
  const src = fs.readFileSync(file, 'utf8'), code = stripComments(src);
  const fails = [];
  // 1. the lift's parts named nowhere; the tail names no words input
  code.split('\n').forEach((l, i) => { const m = LIFT_PARTS.exec(l); if (m) fails.push(`the lift's part ${m[0]} is named (line ${i + 1}): ${l.trim().slice(0, 120)}`); });
  const t0 = src.indexOf('// W7-TAIL-BEGIN'), t1 = src.indexOf('// W7-TAIL-END');
  if (t0 < 0 || t1 < t0 || src.indexOf('// W7-TAIL-BEGIN', t0 + 1) >= 0) { console.error('could not extract the composite\'s tail (one W7-TAIL-BEGIN, then W7-TAIL-END) from ' + file); process.exit(2); }
  let tail = src.slice(t0, t1);
  stripComments(tail).split('\n').forEach((l) => { const m = WORDS_INPUTS.exec(l); if (m) fails.push(`the composite's tail names a words input (${m[0]}): ${l.trim().slice(0, 120)}`); });
  const fc = /var FS_COMP = [^`]*`([\s\S]*?)`;/.exec(src);
  if (!fc) fails.push('FS_COMP not found as one template');
  else stripComments(fc[1]).split('\n').forEach((l) => { const m = WORDS_INPUTS.exec(l); if (m) fails.push(`the composite names a words input (${m[0]}): ${l.trim().slice(0, 120)}`); });
  // the planted faults (the test's own proof)
  const MUT = { lift: '  c = max(c, vec3(0.18));\n', dark: '  c *= 0.9;\n', panel: '  if (abs(uv.x - 0.5) < 0.3 && abs(uv.y - 0.6) < 0.1) c = min(c * 1.1, vec3(1.0));\n' };
  if (A.mutate) { if (!MUT[A.mutate]) { console.error('--mutate lift|dark|panel'); process.exit(2); } tail = tail.replace('\n', '\n' + MUT[A.mutate]); }
  // 2. the tail run on random grounds against the reference
  const N = +(A.n || 512), TOL = +(A.tol || 1);
  const b = await launch();
  const p = await (await b.newContext({ viewport: { width: 64, height: 64 } })).newPage();
  await p.setContent('<canvas width=4 height=4></canvas>');
  let r; try { r = await p.evaluate(({ N, tail, TOL }) => {
    const gl = document.querySelector('canvas').getContext('webgl2'); if (!gl) return { err: 'no webgl2' };
    const FS = `#version 300 es
precision highp float; precision highp sampler2D;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
uniform sampler2D tC, tX; uniform int uDbg; uniform vec2 uN;
out vec4 oC;
vec3 enc(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  ivec2 q = ivec2(gl_FragCoord.xy);
  vec4 C = texelFetch(tC, q, 0), X = texelFetch(tX, q, 0);
  vec2 px = floor(X.xy * 4096.0) + 0.5, uv = (vec2(q) + 0.5) / uN; float uT = X.z * 600.0;
  vec3 c = clamp(C.rgb, 0.0, 1.0);
${tail}
}`;
    const VS = '#version 300 es\nvoid main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }';
    function sh(t, s) { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
    const P = gl.createProgram(); gl.attachShader(P, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(P, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(P);
    if (!gl.getProgramParameter(P, gl.LINK_STATUS)) return { err: 'the tail: ' + gl.getProgramInfoLog(P) };
    let s = 0x9e3779b9 >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const n = N * N, mk = (fill) => { const a = new Float32Array(n * 4); for (let i = 0; i < n; i++) fill(a, i * 4); return a; };
    const C = mk((a, i) => { const k = rnd(); const sc = k < 0.1 ? 0.002 : k < 0.3 ? 0.06 : 1.2; a[i] = rnd() * sc; a[i + 1] = rnd() * sc; a[i + 2] = rnd() * sc; });
    const X = mk((a, i) => { a[i] = rnd(); a[i + 1] = rnd(); a[i + 2] = rnd(); });
    const texs = [C, X].map((d, u) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, N, N, 0, gl.RGBA, gl.FLOAT, d); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); return t; });
    gl.useProgram(P); gl.uniform1i(gl.getUniformLocation(P, 'tC'), 0); gl.uniform1i(gl.getUniformLocation(P, 'tX'), 1); gl.uniform1i(gl.getUniformLocation(P, 'uDbg'), 0); gl.uniform2f(gl.getUniformLocation(P, 'uN'), N, N);
    const out = gl.createTexture(); gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, out); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, N, N);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, out, 0);
    gl.viewport(0, 0, N, N); gl.drawArrays(gl.TRIANGLES, 0, 3);
    const px = new Uint8Array(n * 4); gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const encJ = (c) => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055, fr = (x) => x - Math.floor(x);
    let lower = 0, higher = 0, exact = 0, worstDown = 0, worstUp = 0; const ex = [];
    for (let i = 0; i < n; i++) {
      const pxx = Math.floor(X[i * 4] * 4096) + 0.5, pxy = Math.floor(X[i * 4 + 1] * 4096) + 0.5, f32 = Math.fround, dith = (fr(f32(f32(f32(pxx) * f32(0.7548776662)) + f32(f32(pxy) * f32(0.5698402910)))) - 0.5) / 255;
      for (let c = 0; c < 3; c++) {
        const ref = Math.min(255, Math.max(0, (encJ(Math.min(1, Math.max(0, C[i * 4 + c]))) + dith) * 255)), got = px[i * 4 + c], d = got - ref;
        if (d < -TOL) { lower++; if (-d > worstDown) worstDown = -d; if (ex.length < 4) ex.push({ ground: C[i * 4 + c], ref, got }); }
        else if (d > TOL) { higher++; if (d > worstUp) worstUp = d; if (ex.length < 4) ex.push({ ground: C[i * 4 + c], ref, got }); }
        else exact++;
      }
    }
    texs.forEach((t) => gl.deleteTexture(t)); gl.deleteTexture(out); gl.deleteFramebuffer(fb);
    return { renderer: gl.getParameter(gl.RENDERER), samples: n, channels: 3 * n, withinTol: exact, lower, higher, worstDown: +worstDown.toFixed(3), worstUp: +worstUp.toFixed(3), tol: TOL, examples: ex };
  }, { N, tail, TOL }); } catch (e) { r = { err: 'the tail does not run alone: ' + String(e.message || e).split('\n').slice(0, 3).join(' / ') }; }
  await b.close();
  if (r.err) { console.log(JSON.stringify({ file, mutate: A.mutate || null, err: r.err, fails }, null, 1)); console.error('w7_unit: ' + r.err); process.exit(fails.length ? 1 : 2); }
  if (r.lower > 0) fails.push(`the tail drew ${r.lower} channels lower than the world's own light (worst ${r.worstDown} codes): a darkening`);
  if (r.higher > 0) fails.push(`the tail drew ${r.higher} channels higher than the world's own light (worst ${r.worstUp} codes): a lift or a panel`);
  console.log(JSON.stringify({ file, mutate: A.mutate || null, run: r, fails }, null, 1));
  console.log((A.engine || 'chromium') + ': ' + (fails.length ? 'W7 unit FAILS: ' + fails.length + ' finding(s)' : 'W7 unit: the composite takes nothing from the words; its tail is the encode and the dither, every code the reference\'s within ' + TOL));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
