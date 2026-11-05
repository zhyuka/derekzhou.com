// start.mjs: the start file (start.v1.js), made from the world's scripts (fast500 lane C, step 5). Never written by
// hand: CI makes it again from src/ (tools/minify.mjs --check) and fails on any byte that differs.
//
//   node tools/start.mjs --build SRC INDEX OUT   write OUT (the start file) from SRC's scripts, as INDEX loads them
//   node tools/start.mjs --check SRC INDEX FILE  exit 1 unless FILE is exactly what --build makes
//   node tools/start.mjs --test SRC INDEX FILE   the start file's own proof in the fake browser (every device, every
//                                                fallback, a context lost before the world adopts it); exit 1 on a miss
//
// What the start file is. index.html loads it `async` right after the canvas: it can run before the world's scripts
// have arrived. Unless WebGL2 is missing, colours are forced, the browser is WebKit (links there are synchronous: the
// world issues one at a time, so nothing is gained), a harness attribute is on <html> (any data-* but the hour's
// data-sky and data-sky-at: the dev pages keep F0's path), it makes the canvas's webgl2 context with the world's
// boot attributes, asks the extensions the world's initExtensions asks, and unless KHR_parallel_shader_compile is
// missing or the renderer is a CPU one by name, it computes the world's DEFS and issues every program of the TABLE:
// for each, its two shaders created, given their text (the device's DEFS put in after "#version 300 es\n", as the
// world's progIssue puts them) and compiled, the program attached and linked; then one flush. It reads no status, no
// layout and no clock. It leaves window.WORLD_START = { gl, defs, progs: { vs + '\u0000' + fs (the texts as issued):
// [{ p, v, f }] }, lost } for the world's getGL, which adopts the context (canvas.getContext gives the same one) and,
// in progIssue (startProg), each program whose issued text is exactly the text it would give itself. A context lost
// before that is marked (lost: its programs died with it) and its event prevented, so the browser may restore it as
// it would the world's own.
//
// The TABLE: the programs the world issues at its stage C (KHR_parallel_shader_compile: every program at once, in
// progOrder's order, the heaviest first) on the reference device (a desktop Chrome with float targets: DEFS empty),
// as the world's scripts (SRC: src/, the readable shipped files) run in node in a fake browser (lane A's
// glsl_guard.js's, extended): for each progIssue call, the text that call handed shaderSource, with whatever the world
// puts in (its computed defines after DEFS, its folds), less only the device's DEFS. The build fails unless every
// visit of every device the start file serves (parallel compiles, not WebKit) issues exactly the TABLE, in its order,
// with that device's DEFS, all in one frame, and nothing more before the show: one table serves every visitor, or
// none is made.
// Plain node (22.8 or later), no dependency; deterministic (every visit's inputs are fixed here).
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import url from 'url';

const VER = '#version 300 es\n';
const UA = {
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
};
const EXT = ['EXT_color_buffer_float', 'EXT_color_buffer_half_float', 'KHR_parallel_shader_compile', 'WEBGL_debug_renderer_info', 'EXT_texture_filter_anisotropic', 'OES_texture_float_linear', 'EXT_float_blend', 'WEBGL_lose_context'];
// (lane A's guard's devices, the first the reference; then two more for the proof: a Mac's Safari, a CPU renderer)
export const DEVICES = [
  { id: 'desktop', ua: UA.win, touch: 0, ext: EXT, samples: 4, renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    wins: [[1440, 900, 1], [1024, 768, 1], [2560, 1440, 1], [1280, 800, 2], [1920, 1080, 1.25]] },
  { id: 'phone', ua: UA.android, touch: 5, ext: EXT, samples: 4, renderer: 'ANGLE (Qualcomm, Adreno (TM) 740, OpenGL ES 3.2)', wins: [[393, 852, 3], [360, 780, 3], [412, 915, 2.625]] },
  { id: 'webkit', ua: UA.iphone, touch: 5, ext: EXT.filter((e) => e !== 'WEBGL_debug_renderer_info'), samples: 4, renderer: 'Apple GPU', wins: [[393, 852, 3], [430, 932, 3]] },
  { id: 'half', ua: UA.win, touch: 0, ext: EXT.filter((e) => e !== 'EXT_color_buffer_float'), samples: 4, renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', wins: [[1366, 768, 1], [1440, 900, 1]] },
  { id: 'byte', ua: UA.android, touch: 5, ext: EXT.filter((e) => !/color_buffer|parallel/.test(e)), samples: 0, renderer: 'ANGLE (ARM, Mali-G52, OpenGL ES 3.2)', wins: [[360, 800, 2], [393, 852, 3]] }
];
const EXTRA = [
  { id: 'safari', ua: UA.mac, touch: 0, ext: EXT.filter((e) => e !== 'WEBGL_debug_renderer_info'), samples: 4, renderer: 'Apple GPU', wins: [[1440, 900, 2]] },
  { id: 'cpu', ua: UA.win, touch: 0, ext: EXT, samples: 4, renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', wins: [[1280, 800, 1]] },
  // (round 4) beside the split height's rule: a desktop AMD and an NVIDIA on OpenGL (no split), an NVIDIA on D3D11 without float32 targets (no split)
  { id: 'amd', ua: UA.win, touch: 0, ext: EXT, samples: 4, renderer: 'ANGLE (AMD, AMD Radeon RX 7900 XTX Direct3D11 vs_5_0 ps_5_0, D3D11)', wins: [[1920, 1080, 1]] },
  { id: 'nvgl', ua: UA.win, touch: 0, ext: EXT, samples: 4, renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 OpenGL 4.5.0)', wins: [[1440, 900, 1]] },
  { id: 'nvhalf', ua: UA.win, touch: 0, ext: EXT.filter((e) => e !== 'EXT_color_buffer_float'), samples: 4, renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Direct3D11 vs_5_0 ps_5_0, D3D11)', wins: [[1366, 768, 1]] }
];
const HOURS = [11.5, 23.5, 6.25, 17.5, 14.5, 20.25, 2.75];
export function visits(devs, per) {
  const out = []; let k = 0;
  for (const d of devs) {
    const n = d === DEVICES[0] ? Math.max(3, per) : Math.max(1, Math.min(per, d.wins.length));
    for (let i = 0; i < n; i++, k++) {
      const w = d.wins[i % d.wins.length];
      out.push({ dev: d, n: i, seed: (Math.imul(0x9e3779b9, k + 1) + Math.imul(0x7f4a7c15, i + 3)) >>> 0, hour: HOURS[k % HOURS.length], w: w[0], h: w[1], dpr: w[2],
        hz: [60, 144, 120, 90, 75][k % 5], t0: 200 + 977 * k });
    }
  }
  return out;
}
// what the start file does on a device (its own tests, as written in RUNTIME below)
const isWebKit = (ua, touch) => /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1) || (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua));
const isCPU = (r) => /SwiftShader|llvmpipe|Software/i.test(r);
const serves = (d) => d.ext.includes('KHR_parallel_shader_compile') && !isWebKit(d.ua, d.touch) && !isCPU(d.renderer);
// (round 4) the split height's rule (fast500 lane G), when the world has one: HP_DEV's body and the line that puts
// HPSPLIT into DEFS, read from the world as written, each exactly once, or the build stops; mirrored in the start file
const HP_FN = /\n  function HP_DEV\(r\) \{ return ([^\n]*); \}\n/, HP_SET = "    EXT.hp = !!(EXT.cbf && EXT.parAll && HP_DEV(EXT.renderer)); if (EXT.hp) DEFS += '#define HPSPLIT\\n';";
let HP = null;   // ({ body, fn }: set by loadPage from the world's script)
function hpOf(c, f) {
  const n = c.split('function HP_DEV(').length - 1;
  if (!n && c.indexOf('HPSPLIT') < 0) return null;
  const m = c.match(HP_FN), k = c.split(HP_SET).length - 1;
  if (n !== 1 || !m || k !== 1) throw new Error(f + ': the split height\'s rule is not as tools/start.mjs reads it (HP_DEV ' + n + ', its one-line form ' + !!m + ', the DEFS line ' + k + '): change start.mjs with it');
  return { body: m[1], fn: new Function('r', 'return ' + m[1] + ';') };
}
const isHP = (d) => !!(HP && d.ext.includes('EXT_color_buffer_float') && serves(d) && HP.fn(d.renderer));   // (the world's EXT.hp: float32 targets, all at once (parallel, not WebKit), HP_DEV)
const defsOf = (d) => { const cbf = d.ext.includes('EXT_color_buffer_float'), cbh = !cbf && d.ext.includes('EXT_color_buffer_half_float'); return (cbf || cbh ? '' : '#define LIND_PACKED\n') + (cbf ? '' : '#define GC_PACKED\n') + (isHP(d) ? '#define HPSPLIT\n' : ''); };
const tag = (v) => `${v.dev.id}#${v.n} ${v.w}x${v.h}@${v.dpr} ${v.hz}Hz hour ${v.hour}`;

// ------------------------------------------------------------------ the page's scripts (lane A's guard's order)
const START_RE = /^start\.v\d+\.js$/, ISSUE = 'function progIssue(P) {';
function scriptsOf(index) {   // classic scripts in document order (an async one as if it arrived at once), then the deferred
  const html = fs.readFileSync(index, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const now = [], later = [];
  for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
    const a = m[1], src = /\bsrc="\/([^"?#]+)"/.exec(a);
    if (src) (/\bdefer\b|type="module"/.test(a) ? later : now).push(src[1]);
  }
  return now.concat(later);
}
export function loadPage(src, index, lib, hook = true) {   // each script from SRC, else beside INDEX, else from LIB (the hour and site.js)
  const names = scriptsOf(index), code = [];
  for (const s of names) {
    if (START_RE.test(s)) { code.push({ s, start: true }); continue; }
    const f = [path.join(src, s), path.join(path.dirname(index), s), lib && path.join(lib, s)].find((p) => p && fs.existsSync(p));
    if (!f) throw new Error('index.html loads /' + s + ', found neither in ' + src + ' nor beside ' + index + (lib ? ' nor in ' + lib : ''));
    let c = fs.readFileSync(f, 'utf8');
    if (c.includes('\r')) throw new Error(f + ' has a CR (a CRLF checkout would change every shader\'s text)');
    if (/^world/.test(s)) HP = hpOf(c, f);   // (round 4: the split height's rule, as the world has it, or none)
    if (hook && /^world/.test(s)) {   // (the world's progIssue, as written, reports each program it issues: P.vs and P.fs, without DEFS)
      const n = c.split(ISSUE).length - 1;
      if (n !== 1) throw new Error(f + ': "' + ISSUE + '" found ' + n + ' times (want 1: the table is read from the world as written, src/)');
      c = c.replace(ISSUE, ISSUE + ' if (globalThis.__startIssue) globalThis.__startIssue(P);');
    }
    code.push({ s, c });
  }
  if (!code.some((x) => /^world/.test(x.s))) throw new Error(index + ' loads no world script');
  return code;
}

// ------------------------------------------------------------------ one visit in the fake browser (lane A's, extended)
/* O: { startCode: the start file's text or null; startWhen: 'page' (where index.html has it), 'afterWorld' (after the
   deferred scripts, before the first frame), or a frame number (the start file arriving after the boot began);
   attrs: extra attributes on <html>; forced, reduced: the media queries; lose: { at, restore } (each 'afterStart',
   'afterScripts' or a frame number: the context lost, then restored) } */
export function run(V, page, O = {}) {
  return new Promise((resolve) => {
    const R = { issues: [], links: [], shaders: [], errors: [], shown: false, shownF: -1, frames: 0, by: { start: { createShader: 0, linkProgram: 0, flush: 0 }, world: { createShader: 0, linkProgram: 0, deleteProgram: 0, deleteShader: 0 } },
      ctx: [], issueF: [], ws: null, lostEv: 0, restoredEv: 0, phase: 'world' };
    let clock = V.t0, lost = false;
    const now = () => (clock += 0.02);
    function guard(f, where) { try { f(); } catch (e) { R.errors.push(where + ': ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).map((x) => x.trim()).join(' | ') : String(e))); } }
    const listeners = new Map();
    const lk = (t, type) => (t.__id || 'win') + ':' + type;
    function on(t, type, f) { if (!listeners.has(lk(t, type))) listeners.set(lk(t, type), []); listeners.get(lk(t, type)).push(f); }
    function off(t, type, f) { const a = listeners.get(lk(t, type)); if (a && a.indexOf(f) >= 0) a.splice(a.indexOf(f), 1); }
    function fire(t, type) { for (const f of (listeners.get(lk(t, type)) || []).slice()) guard(() => f.call(t, { type, target: t, preventDefault() { R.prevented = (R.prevented || 0) + 1; }, stopPropagation() {} }), type); }
    let ids = 0;
    function el(tag, attrs, box) {
      const at = Object.assign({}, attrs || {}), cls = new Set(String(at.class || '').split(/\s+/).filter(Boolean)), props = {};
      const e = {
        __id: 'e' + (++ids), tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), nodeType: 1, children: [], childNodes: [], parentNode: null, textContent: '', innerText: '',
        get attributes() { return Object.keys(at).map((n) => ({ name: n, value: at[n] })); },
        getAttribute(n) { return n === 'class' ? [...cls].join(' ') : (n in at ? at[n] : null); },
        setAttribute(n, v) { if (n === 'class') { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => cls.add(c)); } else at[n] = String(v); },
        removeAttribute(n) { delete at[n]; }, hasAttribute(n) { return n in at; },
        classList: { add(...c) { c.forEach((x) => cls.add(x)); }, remove(...c) { c.forEach((x) => cls.delete(x)); }, contains(c) { return cls.has(c); },
          toggle(c, f) { const o = f === undefined ? !cls.has(c) : !!f; if (o) cls.add(c); else cls.delete(c); return o; } },
        style: { setProperty(n, v) { props[n] = v; }, removeProperty(n) { delete props[n]; }, getPropertyValue(n) { return props[n] || ''; } },
        get className() { return [...cls].join(' '); }, set className(v) { this.setAttribute('class', v); },
        addEventListener(t, f) { on(e, t, f); }, removeEventListener(t, f) { off(e, t, f); }, dispatchEvent() { return true; },
        getBoundingClientRect() { const b = box ? box() : [0, 0, V.w, V.h]; return { x: b[0], y: b[1], left: b[0], top: b[1], width: b[2], height: b[3], right: b[0] + b[2], bottom: b[1] + b[3] }; },
        getClientRects() { return [this.getBoundingClientRect()]; },
        get clientWidth() { return this.getBoundingClientRect().width; }, get clientHeight() { return this.getBoundingClientRect().height; },
        get offsetWidth() { return this.getBoundingClientRect().width; }, get offsetHeight() { return this.getBoundingClientRect().height; },
        querySelector() { return null; }, querySelectorAll() { return []; }, closest() { return null; }, contains() { return false; },
        setPointerCapture() {}, releasePointerCapture() {}, hasPointerCapture() { return false; }, focus() {}, blur() {},
        getContext(type, attrs) { if (tag !== 'canvas' || type !== 'webgl2') return null; R.ctx.push({ by: phase(), frame: R.frames, attrs: JSON.stringify(attrs) });
          if (O.lose && O.lose.at === 'inWorldGetContext' && phase() === 'world' && !lost) { lost = true; R.lostEv++; Promise.resolve().then(() => fire(canvas, 'webglcontextlost')); }   // (lost under the world's own boot: its event a moment later)
          return gl; }
      };
      return e;
    }
    const canvas = el('canvas', { class: 'sky', 'aria-hidden': 'true' });
    canvas.width = 300; canvas.height = 150;
    const K = new Map(); let kn = 0x10000;
    const FIX = { NO_ERROR: 0, NONE: 0, ZERO: 0, ONE: 1, FALSE: 0, TRUE: 1, POINTS: 0, LINES: 1, TRIANGLES: 4, TRIANGLE_STRIP: 5, TEXTURE0: 0x84C0, COLOR_ATTACHMENT0: 0x8CE0, DRAW_BUFFER0: 0x8825 };
    const C = (n) => { if (n in FIX) return FIX[n]; if (!K.has(n)) { K.set(n, kn); kn += 64; } return K.get(n); };
    const NAME = (v) => { for (const [n, x] of K) if (x === v) return n; for (const n in FIX) if (FIX[n] === v) return n; return String(v); };
    const PARAM = { VERSION: 'WebGL 2.0 (OpenGL ES 3.0)', SHADING_LANGUAGE_VERSION: 'WebGL GLSL ES 3.00', VENDOR: 'WebKit', RENDERER: 'WebKit WebGL',
      UNMASKED_RENDERER_WEBGL: V.dev.renderer, UNMASKED_VENDOR_WEBGL: 'Google Inc.', MAX_TEXTURE_SIZE: 16384, MAX_3D_TEXTURE_SIZE: 2048, MAX_ARRAY_TEXTURE_LAYERS: 2048,
      MAX_DRAW_BUFFERS: 8, MAX_COLOR_ATTACHMENTS: 8, MAX_SAMPLES: V.dev.samples, MAX_RENDERBUFFER_SIZE: 16384, MAX_TEXTURE_IMAGE_UNITS: 16,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 32, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 16, MAX_VERTEX_ATTRIBS: 16, MAX_VARYING_VECTORS: 30, MAX_VARYING_COMPONENTS: 120,
      MAX_FRAGMENT_UNIFORM_VECTORS: 1024, MAX_VERTEX_UNIFORM_VECTORS: 4096, MAX_UNIFORM_BLOCK_SIZE: 65536, MAX_UNIFORM_BUFFER_BINDINGS: 24,
      MAX_TEXTURE_LOD_BIAS: 15, MAX_CUBE_MAP_TEXTURE_SIZE: 16384, MAX_ELEMENT_INDEX: 4294967295, MAX_SERVER_WAIT_TIMEOUT: 0, MAX_CLIENT_WAIT_TIMEOUT_WEBGL: 0,
      MAX_TEXTURE_MAX_ANISOTROPY_EXT: 16 };
    let gen = 0;   // (the context's generation: an object of an older one is dead)
    const obj = (kind) => ({ __kind: kind, gen });
    function fillRead(d) { if (/^\[object Uint8(Clamped)?Array\]$/.test(Object.prototype.toString.call(d))) for (let i = 0; i < d.length; i++) d[i] = 40 + (i * 7919 + (i >> 2) * 13) % 160; }
    const phase = () => (R.phase === 'start' || /start\.v\d+\.js/.test(new Error().stack || '') ? 'start' : 'world'), who = () => R.by[phase()];   // (after the first paint: the start file's code runs in later tasks too)
    const T = {
      canvas,
      get drawingBufferWidth() { return canvas.width; }, get drawingBufferHeight() { return canvas.height; },
      getExtension(n) { if (lost || !V.dev.ext.includes(n)) return null; return new Proxy({ __ext: n }, { get(t, p) { if (p in t) return t[p]; if (typeof p === 'string' && /^[A-Z0-9_]+$/.test(p)) return C(p); return () => undefined; } }); },
      getSupportedExtensions() { return lost ? null : V.dev.ext.slice(); },
      getContextAttributes() { return lost ? null : { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default' }; },
      isContextLost() { return lost; }, getError() { return 0; },
      getParameter(p) { if (lost) return null; const n = NAME(p); if (n in PARAM) return PARAM[n]; if (n === 'MAX_VIEWPORT_DIMS') return Int32Array.of(32767, 32767); if (/RANGE$/.test(n)) return Float32Array.of(1, 1024); return 0; },
      getShaderPrecisionFormat() { return lost ? null : { rangeMin: 127, rangeMax: 127, precision: 23 }; },
      getInternalformatParameter() { if (lost) return null; return V.dev.samples ? Int32Array.of(V.dev.samples, 2) : new Int32Array(0); },
      createShader(type) { if (lost) return null; const w = who(); if (w.createShader !== undefined) w.createShader++; return { __kind: 'shader', type: NAME(type), src: null, gen }; },
      shaderSource(s, src) { if (s === null || typeof s !== 'object') throw new TypeError('shaderSource: not a WebGLShader'); if (lost || s.gen !== gen) return; s.src = String(src); R.shaders.push(s.type + '\n' + s.src); },
      compileShader(s) { if (s === null || typeof s !== 'object') throw new TypeError('compileShader: not a WebGLShader'); },
      getShaderSource(s) { return s.src; }, getShaderParameter() { return lost ? null : true; }, getShaderInfoLog() { return lost ? null : ''; },
      createProgram() { if (lost) return null; return { __kind: 'program', sh: [], gen }; },
      attachShader(p, s) { if (!p || !s) throw new TypeError('attachShader: null'); if (lost || p.gen !== gen) return; p.sh.push(s); },
      linkProgram(p) { if (!p) throw new TypeError('linkProgram: null'); if (lost || p.gen !== gen) return; const w = who(); if (w.linkProgram !== undefined) w.linkProgram++;
        const v = p.sh.find((s) => s.type === 'VERTEX_SHADER'), f = p.sh.find((s) => s.type === 'FRAGMENT_SHADER'); R.links.push({ vs: v ? v.src : '', fs: f ? f.src : '', frame: R.frames, by: phase() }); p.linked = true; },
      deleteProgram(p) { const w = who(); if (p && w.deleteProgram !== undefined) w.deleteProgram++; if (p && p.gen === gen) p.deleted = true; },
      deleteShader(s) { const w = who(); if (s && w.deleteShader !== undefined) w.deleteShader++; },
      flush() { const p = phase(), w = R.by[p]; if (w.flush !== undefined) w.flush++; if (p === 'start') at('afterGo'); },
      getProgramParameter(p, x) { if (lost) return null; const n = NAME(x); if (/STATUS/.test(n)) return !!(p && p.gen === gen && p.linked && !p.deleted); if (n === 'ATTACHED_SHADERS') return p.sh.length; return 0; },
      getProgramInfoLog() { return lost ? null : ''; }, getUniformLocation() { return lost ? null : {}; }, getAttribLocation() { return lost ? -1 : 0; }, getUniformBlockIndex() { return 0; },
      getActiveUniform() { return null; }, getActiveAttrib() { return null; }, getFragDataLocation() { return 0; },
      checkFramebufferStatus() { return lost ? 0 : C('FRAMEBUFFER_COMPLETE'); },
      fenceSync() { return lost ? null : obj('sync'); }, clientWaitSync() { return lost ? C('WAIT_FAILED') : C('ALREADY_SIGNALED'); }, getSyncParameter(s, x) { return lost ? null : NAME(x) === 'SYNC_STATUS' ? C('SIGNALED') : 0; },
      getQueryParameter(q, x) { return lost ? null : NAME(x) === 'QUERY_RESULT_AVAILABLE' ? true : 0; },
      readPixels(x, y, w, h, f, t, dst) { if (!lost) fillRead(dst); }, getBufferSubData(tg, off, dst) { if (!lost) fillRead(dst); },
      isProgram(p) { return !lost && !!p && p.gen === gen; }, isShader() { return !lost; }, isTexture() { return !lost; }, isBuffer() { return !lost; }, isFramebuffer() { return !lost; }
    };
    const gl = new Proxy(T, { get(t, p) {
      if (p in t) return t[p];
      if (typeof p !== 'string') return undefined;
      if (/^[A-Z0-9_]+$/.test(p)) return C(p);
      if (/^create[A-Z]/.test(p)) return () => (lost ? null : obj(p.slice(6)));
      return () => undefined;
    } });
    const lose = () => { if (lost) return; lost = true; R.lostEv++; fire(canvas, 'webglcontextlost'); };
    const restore = () => { if (!lost) return; lost = false; gen++; R.restoredEv++; fire(canvas, 'webglcontextrestored'); };
    const at = (when) => { if (O.lose && O.lose.at === when) lose(); if (O.lose && O.lose.restore === when) restore(); };
    const root = el('html', Object.assign({ lang: 'en' }, O.attrs || {})), meta = el('meta', { name: 'theme-color', content: '#173a63' }), body = el('body');
    const main = el('main', {}, () => [16, 0, V.w - 32, V.h]);
    const stack = el('div', { class: 'stack' }, () => [Math.round(V.w * 0.1), Math.round(V.h * 0.32), Math.round(V.w * 0.6), 160]);
    const name = el('h1', { class: 'name' }, () => [Math.round(V.w * 0.1), Math.round(V.h * 0.32), Math.min(404, V.w - 32), 97]);
    const footer = el('footer', {}, () => [16, V.h - 64, V.w - 32, 48]);
    const links = [el('a', { href: '#', id: 'email-link' }, () => [16, V.h - 48, 40, 22]), el('a', { href: '#second', rel: 'me' }, () => [72, V.h - 48, 62, 22])];
    const SEL = { 'canvas.sky': canvas, canvas, 'meta[name="theme-color"]': meta, main, footer, '.stack': stack, h1: name, '.name': name, 'h1.name': name, body, html: root };
    const document = {
      __id: 'doc', documentElement: root, body, head: Object.assign(el('head'), { appendChild(x) { if (x && /\/start-table\.v\d+\.js$/.test(String(x.src)) && O.tableCode) { const go = () => guard(() => vm.runInContext(O.tableCode, ctx, { filename: String(x.src).slice(1) }), 'table'); R.tableF = R.frames; if (fcp === 'page') go(); else timers.push([++timerN, clock, go, 0]); } return x; } }), readyState: 'loading', hidden: false, visibilityState: 'visible', referrer: '',
      fonts: { ready: Promise.resolve(), status: 'loaded', addEventListener() {}, check() { return true; } },
      querySelector(s) { s = s.trim(); return SEL[s] || null; },
      querySelectorAll(s) { s = s.trim(); if (s === 'footer a' || s === 'a') return links.slice(); return SEL[s] ? [SEL[s]] : []; },
      getElementById(i) { return i === 'email-link' ? links[0] : null; }, getElementsByTagName(t) { return t === 'canvas' ? [canvas] : []; },
      addEventListener(t, f) { on(document, t, f); }, removeEventListener(t, f) { off(document, t, f); }, hasFocus() { return true; }, createElement(t) { return el(t); }
    };
    let raf = [], rafN = 0, timers = [], timerN = 0;
    const mq = (q) => {
      let m = false;
      if (/min-aspect-ratio:\s*6\s*\/\s*5/.test(q)) m = V.w * 5 >= V.h * 6;
      else if (/pointer:\s*coarse|hover:\s*none/.test(q)) m = V.dev.touch > 0;
      else if (/pointer:\s*fine|hover:\s*hover/.test(q)) m = V.dev.touch === 0;
      else if (/orientation:\s*portrait/.test(q)) m = V.h > V.w;
      else if (/orientation:\s*landscape/.test(q)) m = V.w >= V.h;
      else if (/forced-colors:\s*active/.test(q)) m = !!O.forced;
      else if (/prefers-reduced-motion:\s*reduce/.test(q)) m = !!O.reduced;
      return { matches: m, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
    };
    class Obs { constructor(f) { this.f = f; } observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
    // (after the first paint) the page's FCP reported: O.fcp 'page' (a task after the start file), a frame number (after
    // that frame's callbacks; the default 1), 'none' (no paint timing)
    const POS = [], fcp = O.fcp === undefined ? 1 : O.fcp;
    // (the start file's table, a worker's script: run in a context of its own; its one message delivered a task later,
    // or at once with fcp 'page'; any other worker (the world's plan) refused, as where workers fail)
    class FW {
      constructor(u) {
        u = String(u); this.ls = [];
        if (!/\/start-table\.v\d+\.js$/.test(u) || !O.tableCode) throw new Error('no worker in the fake browser: ' + u);
        let data = null; const box = vm.createContext({}); box.postMessage = (x) => { data = x; }; box.close = () => {};
        guard(() => vm.runInContext(O.tableCode, box, { filename: u.slice(1) }), 'table worker'); R.tableF = R.frames;
        const fire = () => { for (const f of this.ls) guard(() => f({ data }), 'table message'); };
        if (fcp === 'page') Promise.resolve().then(fire); else timers.push([++timerN, clock, fire, 0]);
      }
      addEventListener(t, f) { if (t === 'message') this.ls.push(f); } removeEventListener() {} postMessage() {} terminate() {}
    }
    class PO extends Obs { static get supportedEntryTypes() { return fcp === 'none' ? [] : ['paint']; } observe() { if (fcp !== 'none' && POS.indexOf(this) < 0) POS.push(this); } disconnect() { const i = POS.indexOf(this); if (i >= 0) POS.splice(i, 1); } }
    const paint = () => { for (const o of POS.slice()) guard(() => o.f({ getEntriesByName: (n) => (n === 'first-contentful-paint' ? [{ name: n, entryType: 'paint', startTime: clock }] : []), getEntries: () => [] }, o), 'paint'); };
    const win = {
      __id: 'win', document,
      navigator: { userAgent: V.dev.ua, maxTouchPoints: V.dev.touch, hardwareConcurrency: 8, deviceMemory: 8, language: 'en-US', languages: ['en-US'],
        platform: /iPhone/.test(V.dev.ua) ? 'iPhone' : /Android/.test(V.dev.ua) ? 'Linux armv8l' : /Macintosh/.test(V.dev.ua) ? 'MacIntel' : 'Win32', vendor: /AppleWebKit\/605/.test(V.dev.ua) ? 'Apple Computer, Inc.' : 'Google Inc.', onLine: true },
      innerWidth: V.w, innerHeight: V.h, outerWidth: V.w, outerHeight: V.h, devicePixelRatio: V.dpr, scrollX: 0, scrollY: 0, pageXOffset: 0, pageYOffset: 0,
      screen: { width: V.w, height: V.h, availWidth: V.w, availHeight: V.h, colorDepth: 24, orientation: { type: V.h > V.w ? 'portrait-primary' : 'landscape-primary', angle: 0, addEventListener() {} } },
      visualViewport: { width: V.w, height: V.h, scale: 1, offsetLeft: 0, offsetTop: 0, addEventListener() {}, removeEventListener() {} },
      matchMedia: mq,
      getComputedStyle() { return { getPropertyValue() { return ''; }, color: 'rgb(0, 0, 0)', backgroundColor: 'rgb(255, 255, 255)', opacity: '1', display: 'block', visibility: 'visible' }; },
      requestAnimationFrame(f) { raf.push([++rafN, f]); return rafN; }, cancelAnimationFrame(i) { raf = raf.filter((x) => x[0] !== i); },
      setTimeout(f, ms) { timers.push([++timerN, clock + (+ms || 0), f, 0]); return timerN; }, clearTimeout(i) { timers = timers.filter((x) => x[0] !== i); },
      setInterval(f, ms) { const p = Math.max(4, +ms || 0); timers.push([++timerN, clock + p, f, p]); return timerN; }, clearInterval(i) { timers = timers.filter((x) => x[0] !== i); },
      performance: { now, mark() {}, measure() {}, getEntriesByName() { return []; }, getEntriesByType() { return []; }, timeOrigin: 1.7e12 + V.t0 },
      crypto: { getRandomValues(a) { let s = V.seed; for (let i = 0; i < a.length; i++) { s = (s + 0x9e3779b9) >>> 0; let t = s ^ (s >>> 16); t = Math.imul(t, 0x21f0aaad); t ^= t >>> 15; t = Math.imul(t, 0x735a2d97); a[i] = (t ^ (t >>> 15)) >>> 0; } return a; } },
      addEventListener(t, f) { on(win, t, f); }, removeEventListener(t, f) { off(win, t, f); }, dispatchEvent() { return true; },
      ResizeObserver: Obs, IntersectionObserver: Obs, MutationObserver: Obs, PerformanceObserver: PO, Worker: FW,
      WebGL2RenderingContext: function WebGL2RenderingContext() {}, HTMLCanvasElement: function HTMLCanvasElement() {},
      location: { href: 'https://site.invalid/', origin: 'https://site.invalid', protocol: 'https:', host: 'site.invalid', hostname: 'site.invalid', pathname: '/', search: '', hash: '' },
      console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
      queueMicrotask(f) { Promise.resolve().then(f); },
      __startIssue(P) { R.issues.push({ frame: R.frames, at: R.links.length }); }   // (at: this issue's own link is the next one made: progIssue links before it returns)
    };
    const ctx = vm.createContext(vm.constants.DONT_CONTEXTIFY);
    for (const k of Object.keys(win)) ctx[k] = win[k];
    vm.runInContext('var window = globalThis, self = globalThis, top = globalThis, parent = globalThis, frames = globalThis;', ctx);
    const hourMs = new Date(2026, 10, 4, Math.floor(V.hour), Math.round((V.hour % 1) * 60)).getTime();
    vm.runInContext('(function (T) { var D = Date; function F() { if (!(this instanceof F)) return new D(T).toString(); return arguments.length ? new (Function.prototype.bind.apply(D, [null].concat([].slice.call(arguments))))() : new D(T); }' +
      ' F.prototype = D.prototype; F.now = function () { return T; }; F.UTC = D.UTC; F.parse = D.parse; Date = F; })(' + hourMs + ');', ctx);
    const runStart = () => { if (!O.startCode) return; R.phase = 'start'; guard(() => vm.runInContext(O.startCode, ctx, { filename: 'start.v1.js' }), 'start.v1.js'); if (fcp === 'page') paint(); R.phase = 'world'; R.ws = ctx.WORLD_START; at('afterStart'); };
    const when = O.startWhen || 'page', tick = () => new Promise((r) => setImmediate(r));   // (each script, timer and frame callback a task of its own: the microtasks it queued run before the next)
    const dt = 1000 / V.hz, CAP = O.cap || 6000;
    (async () => {
      for (const x of page) {
        if (x.start) { if (when === 'page') { runStart(); await tick(); } continue; }
        guard(() => vm.runInContext(x.c, ctx, { filename: x.s }), x.s); await tick();
      }
      if (when === 'afterWorld') { runStart(); await tick(); }
      at('afterScripts'); await tick();
      document.readyState = 'interactive'; fire(document, 'DOMContentLoaded');
      document.readyState = 'complete'; fire(win, 'load'); await tick();
      let quiet = 0, lastN = -1;
      for (;;) {
        R.frames++;
        clock = Math.max(clock, V.t0 + R.frames * dt);
        if (when === R.frames) { runStart(); await tick(); }
        at(R.frames); await tick();
        for (const t of timers.filter((x) => x[1] <= clock).sort((a, b) => a[1] - b[1])) { if (t[3]) t[1] += t[3]; else timers = timers.filter((x) => x !== t); guard(t[2], 'timer'); await tick(); }
        const q = raf, ts = clock; raf = [];
        for (const [, f] of q) { guard(() => f(ts), 'frame ' + R.frames); await Promise.resolve(); }   // (a frame's callbacks: the microtasks after each, as a browser runs them)
        if (fcp === R.frames) { paint(); await tick(); }
        await tick();
        if (!R.shown && canvas.classList.contains('on')) { R.shown = true; R.shownF = R.frames; }
        if (R.shaders.length !== lastN) { lastN = R.shaders.length; quiet = 0; } else quiet++;
        const settled = R.shown || (O.stillOk && R.frames > 400);
        if ((settled && quiet > 120) || R.frames >= CAP || R.errors.length > 20) { R.wsEnd = ctx.WORLD_START; R.MK = ctx.MK; return resolve(R); }
      }
    })();
  });
}

// ------------------------------------------------------------------ the table
function firstDiff(a, b) { const x = a.split('\n'), y = b.split('\n'); let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i++; return `line ${i + 1}: "${(x[i] || '').slice(0, 90)}" against "${(y[i] || '').slice(0, 90)}"`; }
function linksBeforeShow(r) { return r.links.filter((l) => r.shownF < 0 || l.frame < r.shownF); }
export async function makeTable(src, index, lib, per = 5, log = () => {}) {
  const page = loadPage(src, index, lib), VS = visits(DEVICES, per), ref = DEVICES[0];
  if (!serves(ref)) throw new Error('the reference device must be one the start file serves');
  const errs = [], tables = {};   // (round 4: one table for each program set the world issues: 'base', and 'hp' on the split height's devices)
  for (const v of VS) {
    const r = await run(v, page);
    log(`  visit ${tag(v)}: ${r.frames} frames, ${r.shown ? 'shown at ' + r.shownF : 'NOT SHOWN'}, ${r.links.length} links${r.errors.length ? ', ' + r.errors.length + ' page errors' : ''}`);
    if (!r.shown || r.errors.length) { errs.push(`${tag(v)}: the fake browser did not bring the world to its show cleanly (${r.errors.slice(0, 2).join(' / ') || 'no error'})`); continue; }
    if (!serves(v.dev)) continue;
    // what each progIssue call handed shaderSource (its own link, the next made after the call began: the text as the
    // world issues it, with every define and fold it puts in), less this device's DEFS just after "#version 300 es\n"
    const frames = [...new Set(r.issues.map((l) => l.frame))], D = defsOf(v.dev), bad = [];
    if (frames.length !== 1) { errs.push(`${tag(v)}: the world issued its programs in ${frames.length} frames (${frames.join(', ')}), not in stage C's one`); continue; }
    if (r.shownF >= 0 && frames[0] >= r.shownF) { errs.push(`${tag(v)}: the programs were issued after the show`); continue; }
    const L = r.issues.map((l, i) => {
      const k = r.links[l.at], un = (s) => (s.startsWith(VER + D) ? VER + s.slice(VER.length + D.length) : null);
      if (!k || k.by !== 'world' || k.frame !== l.frame || (i + 1 < r.issues.length && r.issues[i + 1].at <= l.at)) { bad.push(`program ${i + 1}: no link of its own in its issue`); return { vs: '', fs: '' }; }
      const vs = un(k.vs), fs = un(k.fs);
      if (vs === null || fs === null) bad.push(`program ${i + 1}: its text does not begin "#version 300 es\\n" + this device's DEFS`);
      return { vs: vs || '', fs: fs || '' };
    });
    if (bad.length) { errs.push(`${tag(v)}: ${bad.slice(0, 3).join('; ')}`); continue; }
    const cls = isHP(v.dev) ? 'hp' : 'base', table = tables[cls];
    if (!table) {   // the class's first visit
      tables[cls] = L;
      continue;
    }
    if (table.length !== L.length) { errs.push(`${tag(v)}: ${L.length} programs issued at stage C, the table has ${table.length}`); continue; }
    for (let i = 0; i < table.length; i++) if (table[i].vs !== L[i].vs || table[i].fs !== L[i].fs) { const k = table[i].vs !== L[i].vs ? 'vs' : 'fs', j = L.findIndex((l) => l.vs === table[i].vs && l.fs === table[i].fs); errs.push(`${tag(v)}: program ${i + 1} issued at stage C is not the table's (${k}: ${firstDiff(table[i][k], L[i][k])}; ${j >= 0 ? 'the table\'s is its program ' + (j + 1) + ': the order differs' : 'not found at all: not visit-invariant'})`); break; }
  }
  if (!tables.base) errs.push('no table: no device without the split height showed');
  if (HP && !tables.hp) errs.push('no table for the split height\'s devices: none of them showed');
  if (errs.length) throw new Error('the start file\'s table cannot be made:\n  ' + errs.join('\n  '));
  return tables;
}

// ------------------------------------------------------------------ the start file's text
const RUNTIME = String.raw`  var d = document, canvas = d.querySelector('canvas.sky');
  if (!canvas || typeof WebGL2RenderingContext === 'undefined' || window.WORLD_START !== undefined) return;   // (none, or the world's getGL has run: it leaves WORLD_START false)
  var A = d.documentElement.attributes || [], i;
  for (i = 0; i < A.length; i++) if (/^data-/.test(A[i].name) && !/^data-sky(-at)?$/.test(A[i].name)) return;   // (a harness attribute: the dev pages keep the world's own path)
  try { if (window.matchMedia && window.matchMedia('(forced-colors: active)').matches) return; } catch (e) { return; }
  var ua = navigator.userAgent || '';   // (the world's WebKit test: there links are synchronous, so the world issues one at a time)
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua))) return;
  /* (after the first paint) nothing more until the page's first contentful paint is reported (two frames where paint
     timing is missing): then the table (the programs' GLSL, its own file: parsed before the first paint, its 1 MB held
     it back on a slow phone) is read by a worker (its script: no DOM, no fetch), and when its sources are in the
     programs are issued here; issued at once, their compiles
     held the first frame on a starved GPU process (FCP 0.07 -> 1.08 s on 4 cores). The world asking for its context
     first (its getContext, wrapped once here): issued just before it takes the context if the table is in, else the
     start file stands aside and the world compiles its own, as without it */
  var pc = canvas.getContext, done = 0, asked = 0, TB = null;
  canvas.getContext = function (t, o) { asked = 1; go(); return pc.call(this, t, o); };
  function go() {
  if (done || (!TB && !asked)) return;
  done = 1; canvas.getContext = pc;
  if (!TB || window.WORLD_START !== undefined) return;   // (the world first, before the table: its own path)
  var Q = TB.Q, T = TB.T, TH = TB.TH;
  var gl = pc.call(canvas, 'webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default' });   // (the world's boot attributes, as shipped)
  if (!gl) return;
  var S = window.WORLD_START = { gl: gl, defs: null, progs: {}, lost: 0 };
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); S.lost = 1; });   // (lost before the world listens: it may still be restored)
  var cbf = gl.getExtension('EXT_color_buffer_float'), cbh = cbf ? null : gl.getExtension('EXT_color_buffer_half_float'), par = gl.getExtension('KHR_parallel_shader_compile');
  var dbg = gl.getExtension('WEBGL_debug_renderer_info'), ren = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER) || '');
  if (!par || /SwiftShader|llvmpipe|Software/i.test(ren)) return;   // (one at a time, or the still sky: the world's own path)
  var hp = !!(HP && cbf && HP(ren)), TT = hp ? TH : T;   // (the world's EXT.hp: its split height's devices issue their own set)
  var V = '#version 300 es\n', W = V + (S.defs = (cbf || cbh ? '' : '#define LIND_PACKED\n') + (cbf ? '' : '#define GC_PACKED\n') + (hp ? '#define HPSPLIT\n' : '')), P = S.progs;   // (the world's DEFS)
  for (i = 0; i < TT.length; i += 2) {
    if (S.lost || gl.isContextLost()) return;
    var vs = Q[TT[i]].replace(V, W), fs = Q[TT[i + 1]].replace(V, W), p = gl.createProgram(), v = gl.createShader(gl.VERTEX_SHADER), f;
    gl.shaderSource(v, vs); gl.compileShader(v);
    f = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(f, fs); gl.compileShader(f);
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    var k = vs + '\u0000' + fs; (P[k] || (P[k] = [])).push({ p: p, v: v, f: f });   // (keyed by the text as issued: the world adopts only a program whose text it would issue itself)
  }
  gl.flush();
  }
  function load() {   // (the table read off the main thread and off the DOM: the worker's script posts the sources and closes)
    if (done || typeof Worker !== 'function') return;
    try { var w = new Worker('/@TABLE@'); w.addEventListener('message', function (e) { try { w.terminate(); } catch (x) {} if (e.data && e.data.Q && e.data.T) { TB = e.data; go(); } }); } catch (x) { /* no worker: the world's own path */ }
  }
  var PO = window.PerformanceObserver, two = function () { requestAnimationFrame(function () { requestAnimationFrame(load); }); };
  if (PO && PO.supportedEntryTypes && PO.supportedEntryTypes.indexOf('paint') >= 0) {
    try { new PO(function (l, o) { if (l.getEntriesByName('first-contentful-paint').length) { o.disconnect(); load(); } }).observe({ type: 'paint', buffered: true }); } catch (e) { two(); }
  } else two();`;
export const tableName = (start) => start.replace(/^start\.v(\d+)\.js$/, 'start-table.v$1.js');   // (the start file's table: start.vN.js's is start-table.vN.js)
export function startText(tables, name) {
  const pool = [], at = new Map(), table = tables.base, tn = tableName(name);
  if (tn === name) throw new Error('the start file\'s name (' + name + ') is not start.vN.js');
  const ix = (s) => { if (!at.has(s)) { at.set(s, pool.length); pool.push(s); } return at.get(s); };
  const idx = (t) => { const o = []; for (const p of t) o.push(ix(p.vs), ix(p.fs)); return o; };
  const T = idx(table), TH = tables.hp ? idx(tables.hp) : null;
  for (const s of pool) if (/[\u2028\u2029\r]/.test(s)) throw new Error('a shader source holds a CR or a line separator');
  const kb = Math.round(table.reduce((a, t) => a + t.vs.length + t.fs.length, 0) / 1024);
  const start = '/* ' + name + ': the start file: the world\'s context and its first frame\'s programs, issued once the page has painted\n' +
    '   (fast500 step 5). MADE by tools/start.mjs from src/ (the world\'s scripts as written, run in a fake browser): never edit it\n' +
    '   by hand; CI makes it again and fails on any difference. A new text needs a new name (start.vN+1.js, its table\n' +
    '   start-table.vN+1.js): both are cached as immutable. The programs are in ' + tn + ', loaded after the first paint.\n' +
    '   The world (getGL, progIssue) adopts the context and every program whose text it would issue itself; it frees the rest. */\n' +
    '(function () {\n  \'use strict\';\n' +
    '  var HP = ' + (TH ? 'function (r) { return ' + HP.body + '; }' : 'null') + ';   // (' + (TH ? 'the split height\'s devices: their own set, HPSPLIT in their DEFS: the world\'s HP_DEV' : 'no split height in this world') + ')\n' +
    RUNTIME.replace('@TABLE@', tn) + '\n})();\n';
  const tab = '/* ' + tn + ': the start file\'s table, a worker\'s script (' + name + ' starts it after the first paint; it posts the sources\n' +
    '   and closes). MADE by tools/start.mjs from src/: never\n' +
    '   edit it by hand. ' + `${table.length} programs (${pool.length} distinct sources, ${kb} KB)` + ', in the order the world issues them at its stage C, without\n' +
    '   its DEFS' + (TH ? '; on the split height\'s devices their own set of ' + tables.hp.length + ' (HPSPLIT in their DEFS: the world\'s HP_DEV)' : '') + '. */\n' +
    'postMessage({\n' +
    '  Q: [\n' + pool.map((s) => '    ' + JSON.stringify(s)).join(',\n') + '\n  ],\n' +
    '  T: [' + T.join(', ') + '],\n' +
    '  TH: ' + (TH ? '[' + TH.join(', ') + ']' : 'null') + '\n});\nclose();\n';
  return { start, table: tab, tableName: tn };
}
export async function makeStart(src, index, lib, log, name) { return startText(await makeTable(src, index, lib, 5, log), name); }

// ------------------------------------------------------------------ the proof (--test)
async function test(src, index, lib, file, log) {
  const page = loadPage(src, index, lib), startCode = fs.readFileSync(file, 'utf8'), tableCode = fs.readFileSync(path.join(path.dirname(file), tableName(path.basename(file))), 'utf8'), fails = [];
  if (!page.some((x) => x.start)) fails.push(index + ' does not load the start file');
  let nTable = 0;   // (round 4: N, the programs the world issues without the start file: each visit's in 1, the reference's from 2 on)
  const bag = (r) => r.shaders.slice().sort().join('\u0001');
  const check = (what, ok, why) => { log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}${why ? ': ' + why : ''}`); if (!ok) fails.push(what + (why ? ': ' + why : '')); };
  const clean = (r) => r.errors.length ? 'page errors: ' + r.errors.slice(0, 2).join(' / ') : '';
  // 1. every device, start file and none: the same sources, the same show frame; adopted where it serves
  for (const v of visits(DEVICES.concat(EXTRA), 2)) {
    const a = await run(v, page), b = await run(v, page, { startCode, tableCode, fcp: 'page' }), s = serves(v.dev), kind = v.dev.id === 'cpu' ? 'cpu' : 'world';
    const t = tag(v);
    if (kind === 'cpu') { check(`${t}: a CPU renderer: no program issued by the start file, the still sky as without it`, b.by.start.createShader === 0 && a.shown === b.shown && a.links.length === b.links.length && !b.errors.length, clean(b) || `start shaders ${b.by.start.createShader}`); continue; }
    check(`${t}: shown at the same frame as without the start file (${a.shownF})`, a.shown && b.shown && a.shownF === b.shownF && !a.errors.length && !b.errors.length, clean(b) || clean(a) || `${a.shownF} / ${b.shownF}`);
    check(`${t}: the same shader sources handed over as without it`, bag(a) === bag(b), `${a.shaders.length} / ${b.shaders.length}`);
    check(`${t}: one context, the boot's attributes`, new Set(b.ctx.map((c) => c.attrs)).size === 1 && new Set(a.ctx.map((c) => c.attrs)).size === 1 && a.ctx[0].attrs === b.ctx[0].attrs, JSON.stringify(b.ctx.map((c) => c.by + ' ' + c.attrs)));
    nTable = a.issues.length;
    if (s) check(`${t}: the start file issued all ${nTable} programs, the world adopted every one (it made none of them, freed none: only its own filter probe, as without the start file)`,
      b.by.start.linkProgram === nTable && b.by.start.flush === 1 && b.by.world.createShader === a.by.world.createShader - 2 * nTable && b.by.world.linkProgram === a.by.world.linkProgram - nTable &&
      b.by.world.deleteProgram === a.by.world.deleteProgram && b.by.world.deleteShader === a.by.world.deleteShader && b.issues.length === nTable && b.wsEnd === false,
      `start ${JSON.stringify(b.by.start)} world ${JSON.stringify(b.by.world)} plain ${JSON.stringify(a.by.world)} WORLD_START ${typeof b.wsEnd}`);
    else check(`${t}: not served (${isWebKit(v.dev.ua, v.dev.touch) ? 'WebKit' : 'no parallel compile'}): the start file issued nothing`, b.by.start.createShader === 0 && b.by.start.linkProgram === 0, JSON.stringify(b.by.start));
  }
  const v0 = visits(DEVICES, 3)[0], plain = await run(v0, page);
  nTable = plain.issues.length;
  // adopted: the world made none of the table's programs, only its own filter probe, as on BASE (a run without the start file)
  const adopted = (r, base) => r.by.start.linkProgram === nTable && r.by.world.linkProgram === base.by.world.linkProgram - nTable && r.by.world.createShader === base.by.world.createShader - 2 * nTable && r.by.world.deleteProgram === base.by.world.deleteProgram;
  const own = (r, base) => r.by.world.linkProgram === base.by.world.linkProgram && r.by.world.createShader === base.by.world.createShader;   // (the world made every program itself, as on BASE)
  // 2. the fallbacks on the reference device
  const S = async (what, O, expect) => { const r = await run(v0, page, Object.assign({ startCode, tableCode }, O)); expect(r, what); return r; };
  await S('start file arriving after the world made its context (frame 3): it does nothing', { startWhen: 3 }, (r, w) => check(w, r.shown && r.shownF === plain.shownF && r.by.start.createShader === 0 && r.ctx.filter((c) => c.by === 'start').length === 0 && own(r, plain) && bag(r) === bag(plain) && !r.errors.length, clean(r) || JSON.stringify(r.by)));
  await S('start file arriving after the world\'s scripts, before the boot: adopted', { startWhen: 'afterWorld', fcp: 'page' }, (r, w) => check(w, r.shown && r.shownF === plain.shownF && adopted(r, plain) && bag(r) === bag(plain) && !r.errors.length, clean(r) || JSON.stringify(r.by)));
  // (after the first paint) the table comes after the page's first paint: all of it adopted, or none issued (the world
  // asked for its context first and compiled its own), never a part
  const allOrNone = (r) => adopted(r, plain) || (r.by.start.createShader === 0 && own(r, plain));
  const which = (r) => (adopted(r, plain) ? 'adopted' : r.by.start.createShader === 0 && own(r, plain) ? 'stood aside, the world its own' : 'NEITHER') + ' ' + JSON.stringify(r.by);
  await S('after the first paint: first paint reported at once (the table in before the boot): adopted', { fcp: 'page' }, (r, w) => check(w, r.shown && r.shownF === plain.shownF && adopted(r, plain) && bag(r) === bag(plain) && !r.errors.length, clean(r) || JSON.stringify(r.by)));
  await S('after the first paint: first paint at frame 1, the table a frame after: all or none', { fcp: 1 }, (r, w) => check(w, r.shown && r.shownF === plain.shownF && allOrNone(r) && bag(r) === bag(plain) && !r.errors.length, clean(r) || which(r)));
  await S('after the first paint: no paint timing (the double frame): all or none', { fcp: 'none' }, (r, w) => check(w, r.shown && r.shownF === plain.shownF && allOrNone(r) && bag(r) === bag(plain) && !r.errors.length, clean(r) || which(r)));
  await S('after the first paint: first paint late (frame 40): the world asks for its context first, the start file stands aside', { fcp: 40 }, (r, w) => check(w, r.shown && r.shownF === plain.shownF && r.by.start.createShader === 0 && own(r, plain) && bag(r) === bag(plain) && !r.errors.length, clean(r) || which(r)));
  await S('a harness attribute on <html> (data-dev): the start file does nothing', { attrs: { 'data-dev': '' } }, (r, w) => check(w, r.by.start.createShader === 0 && r.ctx.every((c) => c.by === 'world') && own(r, plain), JSON.stringify(r.by)));
  await S('the hour\'s attributes only (data-sky, data-sky-at): served', { fcp: 'page', attrs: { 'data-sky': 'day', 'data-sky-at': '0.5' } }, (r, w) => check(w, adopted(r, plain), JSON.stringify(r.by)));
  const pf = await run(v0, page, { forced: true, stillOk: true });
  await S('forced colours: the start file does nothing; the world as without it', { forced: true, stillOk: true }, (r, w) => check(w, r.by.start.createShader === 0 && r.ctx.every((c) => c.by === 'world') && own(r, pf) && bag(r) === bag(pf) && r.shown === pf.shown && !r.errors.length, clean(r) || JSON.stringify(r.by)));
  const pr = await run(v0, page, { reduced: true, stillOk: true });
  await S('reduced motion: issued and adopted; the world as without the start file', { fcp: 'page', reduced: true, stillOk: true }, (r, w) => check(w, adopted(r, pr) && bag(r) === bag(pr) && r.shown === pr.shown && r.shownF === pr.shownF && !r.errors.length, clean(r) || `${JSON.stringify(r.by)} shown ${r.shownF}/${pr.shownF}`));
  // 3. a context lost before the world adopts it: the world's own lost path (F0's), then its restore, every program its own
  const fl = await run(v0, page, { lose: { at: 4, restore: 14 } });   // (F0's own: lost in the boot, restored)
  check(`F0 (no start file), lost at frame 4 and restored at 14: shown at ${fl.shownF}`, fl.shown && !fl.errors.length, clean(fl));
  // F0's own case is a context lost under the world's boot (its getContext; the event a moment later): the start file's
  // context lost before adoption must give exactly that run (shown or not, at the same frame, the same programs issued)
  const why = (r) => clean(r) || `shown ${r.shownF} issues ${r.issues.length} start ${JSON.stringify(r.by.start)} world ${JSON.stringify(r.by.world)} restored ${r.restoredEv} prevented ${r.prevented || 0}`;
  const same = (r, f) => r.shown === f.shown && r.shownF === f.shownF && r.issues.length === f.issues.length && r.by.world.linkProgram === f.by.world.linkProgram && r.by.world.createShader === f.by.world.createShader && !r.errors.length && !f.errors.length;
  for (const rs of [3, 12]) {
    const f0 = await run(v0, page, { lose: { at: 'inWorldGetContext', restore: rs }, cap: 1500, stillOk: true });
    log(`  ..   F0's own: lost under the boot's getContext, restored at frame ${rs}: ${f0.shown ? 'shown at ' + f0.shownF : 'NOT shown (F0 itself)'}`);
    await S(`lost right after the start file ran (its event prevented), restored at frame ${rs}: as F0's own`, { fcp: 'page', lose: { at: 'afterGo', restore: rs }, cap: 1500, stillOk: true }, (r, w) => check(w, same(r, f0) && r.prevented >= 1 && r.by.start.linkProgram === nTable, why(r) + ' | F0 ' + why(f0)));
    await S(`lost after the world's scripts, before the boot, restored at frame ${rs}: as F0's own`, { fcp: 'page', lose: { at: 'afterScripts', restore: rs }, cap: 1500, stillOk: true }, (r, w) => check(w, same(r, f0), why(r) + ' | F0 ' + why(f0)));
  }
  await S('lost and restored before the boot: nothing adopted, the world compiles its own, shown as without the start file', { fcp: 'page', lose: { at: 'afterGo', restore: 'afterScripts' } }, (r, w) => check(w, r.shown && r.shownF === plain.shownF && !r.errors.length && own(r, plain) && r.by.world.deleteProgram === plain.by.world.deleteProgram, why(r)));
  const f2 = await run(v0, page, { lose: { at: 2, restore: 10 } });
  await S('lost after the world adopted it, before stage C (frame 2), restored at 10: as F0 lost there (nothing of the start file used after the loss)', { fcp: 'page', lose: { at: 2, restore: 10 } }, (r, w) => check(w, same(r, f2), why(r) + ' | F0 ' + why(f2)));
  const fn = await run(v0, page, { lose: { at: 'inWorldGetContext' }, stillOk: true, cap: 700 });
  await S('lost, never restored: as F0 (the still sky, no page error)', { fcp: 'page', lose: { at: 'afterGo' }, stillOk: true, cap: 700 }, (r, w) => check(w, same(r, fn) && !r.shown, why(r) + ' | F0 ' + why(fn)));
  return fails;
}

// ------------------------------------------------------------------ the command line
const me = url.fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(me)) {
  const a = process.argv.slice(2), die = (m, c = 1) => { console.error('start.mjs: ' + m); process.exit(c); };
  if (!vm.constants || vm.constants.DONT_CONTEXTIFY === undefined) die('needs node 22.8 or later (vm.constants.DONT_CONTEXTIFY)', 2);
  const lib = a.indexOf('--lib') >= 0 ? a.splice(a.indexOf('--lib'), 2)[1] : null;
  const [cmd, src, index, file] = a, log = (s) => console.error(s);
  if (!['--build', '--check', '--test'].includes(cmd) || !src || !index || !file) die('usage: start.mjs --build|--check|--test SRC INDEX FILE [--lib DIR]', 2);
  try {
    if (cmd === '--test') { const f = await test(src, index, lib, file, log); console.log(f.length ? `start.mjs: FAIL: ${f.length} check(s)` : 'start.mjs: every check holds'); process.exit(f.length ? 1 : 0); }
    const out = await makeStart(src, index, lib, log, path.basename(file)), pairs = [[file, out.start], [path.join(path.dirname(file), out.tableName), out.table]];
    if (cmd === '--build') for (const [f, t] of pairs) { fs.writeFileSync(f, t); console.log(`start.mjs: ${f} made (${Buffer.byteLength(t)} bytes)`); }
    else for (const [f, t] of pairs) {
      if (fs.existsSync(f) && fs.readFileSync(f).equals(Buffer.from(t, 'utf8'))) console.log(`ok   ${f} is what tools/start.mjs makes from ${src}`);
      else die(`::error::${f} is not what tools/start.mjs makes from ${src}`);
    }
  } catch (e) { die(e && e.message || String(e)); }
}
