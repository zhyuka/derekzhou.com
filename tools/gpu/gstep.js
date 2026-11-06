// gstep.js (fast500, the look gates): one or more dev builds stepped alike, each arm to ITS OWN first shown frame (the
// canvas 'on'), then frames on from it. The stepping is speedbuild/tools/showdiff.js's (and fast500/tools/bootlen.js's):
// the visit's entropy fixed call by call, the hour's clock faked, requestAnimationFrame driven by the harness at a fixed
// interval with performance.now frozen within a frame, fences reported signalled, parallel compiles reported complete,
// the GPU's name faked (a CPU renderer would be declined by design), preserveDrawingBuffer on; the interval exact in
// binary (68267/4096 ms, the step 0 rule: every frame's interval the same number whatever the absolute time).
// The page's CSS animations and transitions run on the harness's clock too (each one, from the frame it starts, paused
// and set to the harness's time since then, finished once past its end): the canvas's dissolve and today's SVG birds'
// fades are then the same at every run, so the page can be compared exactly (--anim real: the browser's own clock).
// No dev attribute and no hook of the page (unless --rec: the record switched on to read the flight's inputs' wait).
// Headless, on the GPU (pw.js: --use-angle=d3d11 --ignore-gpu-blocklist and the three background flags); each browser's
// real renderer (UNMASKED_RENDERER_WEBGL) read on a blank page before any faking and required to be the RTX 4090.
//   node gstep.js --out DIR --tag NAME --vp 1440x900@1 [--mobile] --hour 2026-10-29T10:30:00Z --seeds 11 \
//        --ks 1,60,300,600 [--save K,K..] [--hash N] [--hashevery E] --arm base=URL [--arm cand=URL] \
//        [--settle T_MS [--settle-extra N] [--settle-quiet Q] [--settle-boot]] [--dt MS] [--maxf 4000] [--rec] \
//        [--yield raf|mc] [--anim harness|real] [--drag K0:N:DX:DY] [--noink] \
//        [--hold birds,inkbirds [--hold-at R] [--hold-max M]] [--fadewatch]
//   --mobile         isMobile and hasTouch (a phone: the world takes the phone's memory tier), with the viewport's DPR
//   --ks / --save    the frames after the show whose canvas is saved as PNG (toDataURL: the drawing buffer, lossless)
//                    with the page's state in full
//   --hash N         every frame +1..+N (every E-th with --hashevery E): the canvas's exact bytes as shown (readPixels of
//                    the drawing buffer, RGBA8, hashed in the page: two 32-bit lanes over the words), each channel's sum
//                    over the frame, and each channel's sum over every 16x16 tile (TILES: uint16, the drawing buffer's
//                    rows from the bottom, written to DIR/NAME_ARM.tiles, a frame a block; the noise rule's local test),
//                    and the page's state (the root's attributes and custom properties, the words' blocks' inks,
//                    theme-color, the canvas's class, computed opacity, visibility, display and animations, every 2D
//                    bird's class, style, viewBox, size, polyline and computed opacity/visibility/display). The ink
//                    birds are drawn in the canvas: their state is in its bytes. The show frame itself (k 0) is recorded
//                    too (not compared: the no-fades assertions read it)
//   --settle T       window.__SETTLE = { t: T, extra, quiet, boot } before the page's scripts: a settled twin
//                    (tools/gsettle.py) holds its first shown frame until its build is idle and the page clock is T ms
//   --drag K0:N:DX:DY  a scripted drag, the same in every run: at frame +K0 after the show a press at (0.5, 0.55) of the
//                    window, then N frames of moves (DX, DY of the window's width and height in all, in equal steps),
//                    the release at +K0+N+1; synthetic PointerEvents dispatched in the page before that frame's
//                    callbacks (a mouse; with --mobile a touch), so no browser input queue's timing enters
//   --noink          the ink birds' draws onto the canvas skipped (the world compared without them; the draws still
//                    counted). Their instances drawn onto the canvas are counted every frame either way (res.ink)
//   --hold LIST      the scripts named (birds, inkbirds: by stem, any version) held back by the harness: the page is
//                    navigated to 'commit' and stepped once parsed; held until frame +R after the show (--hold-at, 30)
//                    or, never shown, until frame M (--hold-max, 120); then released together, and the stepping waits
//                    (the page frozen) until each has run (a marker the harness appends) and the load event is past, so
//                    the frame they land in is the same every run
//   --fadewatch      (kit round k0fin; gates.py --no-fades) every frame from the first, BEFORE the show too: each CSS
//                    animation or transition on the canvas or on a 2D bird (by name: the first frame it ran, how many
//                    frames before the show and after it), and every frame a shown canvas ('on') or a shown 2D bird
//                    stands at a computed opacity strictly between 0 and 1 (a ramp driven some other way); res.fades.
//                    The recorded page states start at the show frame; a 2D bird's appear before the show (the still
//                    sky's birds, while the world boots) is seen only here
// Also recorded: every shader source compiled (its type, length, two 32-bit hashes, and a hash of its skeleton: the text
// with every run of digits as one '#'; res.glsl: the GLSL stability check) and, per arm, the ink birds' canvas instances (res.ink: total, first frame with any after the show).
// Writes DIR/NAME.json (show frames, per K per arm: shown, canvas size, page time, frame count, the root's attributes
// and inks, the 2D birds on, the page's state; per arm the hashes: frames[k] = [canvas, page index, sums, tile block,
// ink instances that frame, LATE.n then (a twin's window.__GATE; -1 without)], pages = the distinct page states, tiles = the tile file and its grid; the settled twin's
// hold; with --rec the record's flight wait, marks and first keys) and DIR/NAME_kK_ARM.png.
'use strict';
const fs = require('fs'), path = require('path');
const PW = require('./pw.js');

const A = { arm: [] };
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i].replace(/^--/, ''), v = process.argv[i + 1];
  if (k === 'arm') { A.arm.push(v); i++; } else if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; }
}
const [W, H, DPR] = A.vp.split(/[x@]/).map(Number);
const EPOCH = Date.parse(A.hour), SEEDS = String(A.seeds).split(',').map((x) => Number(x) >>> 0);
const DT = +(A.dt || 68267 / 4096), KS = String(A.ks || '1,60,300,900').split(',').filter(Boolean).map(Number), OUT = A.out, MAXF = +(A.maxf || 4000);
const SAVE = String(A.save || '').split(',').filter(Boolean).map(Number);
const HASHN = +(A.hash || 0), HEVERY = Math.max(1, +(A.hashevery || 1));
const TAG = A.tag || (A.vp.replace('@', '_') + '_' + SEEDS.join('-')), YIELD = A.yield || 'raf', REC = !!A.rec, ANIM = A.anim || 'harness';
const SETTLE = A.settle !== undefined && A.settle !== true ? { t: +A.settle, extra: +(A['settle-extra'] || 0), quiet: +(A['settle-quiet'] || 8), boot: A['settle-boot'] ? 1 : 0 } : null;
const MOBILE = !!A.mobile, NOINK = !!A.noink, FADEWATCH = !!A.fadewatch;
const WALLWAIT = +(A.wallwait || 0);   // (seconds of wall time waited, the page frozen, after the show and before the frames after it)
const ARMS = A.arm.map((s) => { const i = s.indexOf('='); return { name: s.slice(0, i), url: s.slice(i + 1) }; });
const HOLD = A.hold && A.hold !== true ? String(A.hold).split(',').filter(Boolean) : [];
const HOLD_AT = +(A['hold-at'] || 30), HOLD_MAX = +(A['hold-max'] || 120);
let DRAG = null;
if (A.drag && A.drag !== true) { const d = String(A.drag).split(':').map(Number); DRAG = { k0: d[0], n: d[1], dx: d[2], dy: d[3] }; }
fs.mkdirSync(OUT, { recursive: true });
const PNGK = Array.from(new Set(KS.concat(SAVE).concat(HOLD.length ? [HOLD_AT] : []))).sort((a, b) => a - b);
const LASTK = Math.max(HASHN, PNGK.length ? PNGK[PNGK.length - 1] : 0);

// the drag's events, by frame after the show (the window's CSS px)
const DRAGEV = {};
if (DRAG) {
  const x0 = Math.round(0.5 * W), y0 = Math.round(0.55 * H);
  DRAGEV[DRAG.k0] = [['pointerdown', x0, y0]];
  for (let i = 1; i <= DRAG.n; i++) DRAGEV[DRAG.k0 + i] = [['pointermove', Math.round(x0 + DRAG.dx * W * i / DRAG.n), Math.round(y0 + DRAG.dy * H * i / DRAG.n)]];
  DRAGEV[DRAG.k0 + DRAG.n + 1] = [['pointerup', Math.round(x0 + DRAG.dx * W), Math.round(y0 + DRAG.dy * H)]];
}

const INIT = `(() => {
  const EPOCH = ${EPOCH}, SEEDS = ${JSON.stringify(SEEDS)}, YIELD = ${JSON.stringify(YIELD)}, ANIM = ${JSON.stringify(ANIM)}, NOINK = ${NOINK ? 'true' : 'false'};
  const DRAGEV = ${JSON.stringify(DRAGEV)}, PTYPE = ${JSON.stringify(MOBILE ? 'touch' : 'mouse')}, FWON = ${FADEWATCH ? 'true' : 'false'};
  const REALNAME = ${A.realname ? 'true' : 'false'};
  const GPUNAME = ${A.gpuname && A.gpuname !== true ? JSON.stringify(A.gpuname) : 'null'};   // (tools/gpu --gpuname: another maker's GPU name, so the page takes that maker's paths on this GPU)
  ${SETTLE ? 'window.__SETTLE = ' + JSON.stringify(SETTLE) + ';' : ''}
  let NOW = 0, FR = 0; const Q = []; let QID = 0, CALLS = 0;
  crypto.getRandomValues = function (a) { const s = SEEDS[CALLS % SEEDS.length] >>> 0; CALLS++; for (let i = 0; i < a.length; i++) a[i] = (s + i * 0x9e3779b9) >>> 0; return a; };
  const RD = Date;
  function FD(...a) { if (!new.target) return new RD(EPOCH + NOW).toString(); return a.length ? new RD(...a) : new RD(EPOCH + NOW); }
  FD.prototype = RD.prototype; FD.now = () => EPOCH + NOW; FD.parse = RD.parse; FD.UTC = RD.UTC;
  window.Date = FD;
  const pnow = () => NOW; Performance.prototype.now = pnow; try { performance.now = pnow; } catch (e) {}
  const realRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { Q.push([++QID, cb]); return QID; };
  window.cancelAnimationFrame = (id) => { for (let i = 0; i < Q.length; i++) if (Q[i][0] === id) { Q.splice(i, 1); return; } };
  const G = WebGL2RenderingContext.prototype, gp = G.getParameter, gpp = G.getProgramParameter, gsp = G.getShaderParameter;
  G.getParameter = function (p) { if (GPUNAME && p === 0x9246) return GPUNAME; if (!REALNAME && (p === 0x9246 || p === 0x1F01)) return 'Harness GPU'; return gp.call(this, p); };   // (tools/gpu --realname: the GPU's own name, so the page takes this device's own paths, e.g. the split height on NVIDIA D3D11)
  G.clientWaitSync = function () { return 0x911A; };
  const gsy = G.getSyncParameter; G.getSyncParameter = function (s, p) { return p === 0x9114 ? 0x9119 : gsy.call(this, s, p); };
  G.getProgramParameter = function (pr, p) { return p === 0x91B1 ? true : gpp.call(this, pr, p); };
  G.getShaderParameter = function (sh, p) { return p === 0x91B1 ? true : gsp.call(this, sh, p); };
  const gc = HTMLCanvasElement.prototype.getContext; let CTX = null;
  HTMLCanvasElement.prototype.getContext = function (t, o) { if (t === 'webgl2') o = Object.assign({}, o || {}, { preserveDrawingBuffer: true }); const r = gc.call(this, t, o); if (t === 'webgl2' && r && this.classList && this.classList.contains('sky')) CTX = r; return r; };
  // every shader source compiled (the GLSL stability check), and the ink birds' draws onto the canvas (counted; skipped with --noink)
  const SHT = new WeakMap(), SHS = new WeakMap(), GLSRC = [], INKP = new WeakSet(); let CURP = null, CURFB = null, INKF = 0, INKT = 0, INK1 = -1, INKSKIP = 0;
  function sh32(s, h) { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); }
  const gcs = G.createShader; G.createShader = function (t) { const s = gcs.call(this, t); if (s) SHT.set(s, t === 0x8B30 ? 'fs' : 'vs'); return s; };
  const gss = G.shaderSource; G.shaderSource = function (s, src) { SHS.set(s, String(src)); return gss.call(this, s, src); };
  const gcp = G.compileShader; G.compileShader = function (s) { const src = SHS.get(s); if (src !== undefined) GLSRC.push((SHT.get(s) || '?') + ':' + src.length + ':' + sh32(src, 0x811c9dc5 | 0) + sh32(src, 0x2545f491 | 0) + ':' + sh32(src.replace(/[0-9]+/g, '#'), 0x811c9dc5 | 0)); return gcp.call(this, s); };
  const glp = G.linkProgram; G.linkProgram = function (p) { try { const a = this.getAttachedShaders(p) || []; for (const s of a) { const src = SHS.get(s) || ''; if (SHT.get(s) === 'fs' && src.indexOf('uniform sampler2D uDepth, uCloud, uInkKeep') >= 0) INKP.add(p); } } catch (e) {} return glp.call(this, p); };
  const gup = G.useProgram; G.useProgram = function (p) { CURP = p; return gup.call(this, p); };
  const gbf = G.bindFramebuffer; G.bindFramebuffer = function (t, f) { if (t === 0x8D40 || t === 0x8CA9) CURFB = f; return gbf.call(this, t, f); };
  const gdi = G.drawArraysInstanced; G.drawArraysInstanced = function (m, f, c, n) { if (CURP && INKP.has(CURP) && !CURFB) { INKF += n; INKT += n; if (NOINK) { INKSKIP++; return; } } return gdi.call(this, m, f, c, n); };
  const mc = new MessageChannel(); let mcr = null; mc.port1.onmessage = () => { const r = mcr; mcr = null; if (r) r(); };
  const yieldOnce = () => new Promise((r) => { if (YIELD === 'mc') { mcr = r; mc.port2.postMessage(0); } else realRAF(() => r()); });
  // the page's CSS animations on the harness's clock
  const AT = new WeakMap();
  function anims() {
    if (ANIM !== 'harness' || !document.getAnimations) return;
    for (const a of document.getAnimations()) {
      let t0 = AT.get(a); if (t0 === undefined) { t0 = NOW; AT.set(a, t0); }
      if (t0 === -1) continue;
      const el = NOW - t0, end = a.effect ? a.effect.getComputedTiming().endTime : 0;
      if (el >= end && isFinite(end)) { AT.set(a, -1); a.finish(); continue; }
      if (a.playState !== 'paused') a.pause();
      a.currentTime = el;
    }
  }
  // (--fadewatch) every frame, from the first: animations and transitions on the canvas and the 2D birds, and any shown
  // one at an opacity strictly between 0 and 1
  const FW = { canvas: { anims: {}, partial: null, partialN: 0 }, birds: { anims: {}, partial: null, partialN: 0 }, frames: { pre: 0, post: 0 } };
  function fadeWatch(kk, post) {
    if (!FWON) return;
    const at = post ? '+' + kk : 'frame ' + FR;
    FW.frames[post ? 'post' : 'pre']++;
    if (document.getAnimations) for (const a of document.getAnimations()) {
      const t = a.effect && a.effect.target; if (!t || !t.classList || !t.tagName) continue;
      const tn = t.tagName.toLowerCase(), who = tn === 'canvas' && t.classList.contains('sky') ? 'canvas' : tn === 'svg' && t.classList.contains('bird') ? 'birds' : null; if (!who) continue;
      const nm = a.animationName || a.transitionProperty || '?', o = FW[who].anims[nm] || (FW[who].anims[nm] = { first: at, pre: 0, post: 0 });
      if (post) o.post++; else o.pre++;
    }
    const c = document.querySelector('canvas.sky');
    if (c && c.classList.contains('on')) { const op = +getComputedStyle(c).opacity; if (op > 0 && op < 1) { FW.canvas.partialN++; if (!FW.canvas.partial) FW.canvas.partial = at + ' opacity ' + op; } }
    for (const b of document.querySelectorAll('svg.bird.on')) {
      const cs = getComputedStyle(b); if (cs.display === 'none' || cs.visibility !== 'visible') continue;
      const op = +cs.opacity; if (op > 0 && op < 1) { FW.birds.partialN++; if (!FW.birds.partial) FW.birds.partial = at + ' opacity ' + op; }
    }
  }
  // the scripted drag: synthetic pointer events, dispatched before frame kk's callbacks
  function dragAt(kk) {
    const ev = DRAGEV[kk]; if (!ev) return;
    for (const [type, x, y] of ev) {
      const up = type === 'pointerup';
      const e = new PointerEvent(type, { pointerId: 7, pointerType: PTYPE, isPrimary: true, button: 0, buttons: up ? 0 : 1, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true });
      (document.elementFromPoint(x, y) || document.documentElement).dispatchEvent(e);
    }
  }
  // the canvas's exact bytes as shown: the drawing buffer read back (RGBA8), hashed (two 32-bit lanes over its words);
  // each channel's sum over the frame, and over every 16x16 tile (rows from the bottom, as read)
  let PIX = null, SUMS = null, TILES = null, TW = 0, TH = 0, TB64 = null;
  function hx(v) { return (v >>> 0).toString(16).padStart(8, '0'); }
  function b64(u8) { let s = ''; for (let j = 0; j < u8.length; j += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(j, j + 0x8000)); return btoa(s); }
  function canvasHash() {
    const gl = CTX; if (!gl || gl.isContextLost()) return 'nocontext';
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight; if (!w || !h) return 'empty';
    if (!PIX || PIX.length !== w * h * 4) PIX = new Uint8Array(w * h * 4);
    const rf = gp.call(gl, gl.READ_FRAMEBUFFER_BINDING), pb = gp.call(gl, gl.PIXEL_PACK_BUFFER_BINDING), ra = gp.call(gl, gl.PACK_ROW_LENGTH), sp = gp.call(gl, gl.PACK_SKIP_PIXELS), sr = gp.call(gl, gl.PACK_SKIP_ROWS), al = gp.call(gl, gl.PACK_ALIGNMENT);
    if (rf) gbf.call(gl, gl.READ_FRAMEBUFFER, null); if (pb) gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    if (ra) gl.pixelStorei(gl.PACK_ROW_LENGTH, 0); if (sp) gl.pixelStorei(gl.PACK_SKIP_PIXELS, 0); if (sr) gl.pixelStorei(gl.PACK_SKIP_ROWS, 0); if (al !== 4) gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, PIX);
    if (rf) gbf.call(gl, gl.READ_FRAMEBUFFER, rf); if (pb) gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pb);
    if (ra) gl.pixelStorei(gl.PACK_ROW_LENGTH, ra); if (sp) gl.pixelStorei(gl.PACK_SKIP_PIXELS, sp); if (sr) gl.pixelStorei(gl.PACK_SKIP_ROWS, sr); if (al !== 4) gl.pixelStorei(gl.PACK_ALIGNMENT, al);
    const u = new Int32Array(PIX.buffer); let a = 0x811c9dc5 | 0, b = 0x2545f491 | 0;
    for (let i = 0; i < u.length; i++) { const x = u[i]; a = Math.imul(a ^ x, 16777619); b = Math.imul((b + x) | 0, 0x9e3779b1); b ^= b >>> 15; }
    const tw = (w + 15) >> 4, th = (h + 15) >> 4;
    if (!TILES || TW !== tw || TH !== th) { TILES = new Uint16Array(tw * th * 3); TW = tw; TH = th; } else TILES.fill(0);
    const T = TILES; let i = 0;
    for (let y = 0; y < h; y++) { const rb = (y >> 4) * tw; for (let x = 0; x < w; x++, i += 4) { const t = (rb + (x >> 4)) * 3; T[t] += PIX[i]; T[t + 1] += PIX[i + 1]; T[t + 2] += PIX[i + 2]; } }
    let s0 = 0, s1 = 0, s2 = 0; for (let t = 0; t < T.length; t += 3) { s0 += T[t]; s1 += T[t + 1]; s2 += T[t + 2]; }
    SUMS = [s0, s1, s2]; TB64 = b64(new Uint8Array(T.buffer, 0, T.length * 2));
    return w + 'x' + h + ':' + hx(a) + hx(b);
  }
  // the page's state: what the stylesheet and the scripts put on the page, beside the canvas
  const PROPS = ['--color-text', '--color-dimmed', '--color-focus', '--color-selection'];
  function inkOf(e) { if (!e) return null; const cs = getComputedStyle(e); return [e.getAttribute('style') || '', PROPS.map((p) => cs.getPropertyValue(p).trim()).join(','), cs.color].join(' ; '); }
  function pageState() {
    const d = document, root = d.documentElement, c = d.querySelector('canvas.sky'), o = {};
    o['root.attrs'] = Array.from(root.attributes).map((x) => x.name + '=' + x.value).join(' | ');
    o['root.ink'] = inkOf(root); o['stack.ink'] = inkOf(d.querySelector('.stack')); o['foot.ink'] = inkOf(d.querySelector('footer'));
    o['links'] = Array.from(d.querySelectorAll('footer a')).map((e) => { const cs = getComputedStyle(e); return cs.color + ' ' + cs.textDecorationColor + ' ' + cs.outlineColor; }).join(' | ');
    o['theme'] = (d.querySelector('meta[name="theme-color"]') || {}).content || null;
    if (c) {
      const cs = getComputedStyle(c);
      o['canvas.class'] = c.className; o['canvas.opacity'] = cs.opacity; o['canvas.visibility'] = cs.visibility; o['canvas.display'] = cs.display; o['canvas.size'] = c.width + 'x' + c.height;
      o['canvas.anim'] = [cs.animationName, cs.animationDuration, cs.animationDelay, cs.animationFillMode, cs.transitionProperty, cs.transitionDuration].join(' ') + ' [' + (c.getAnimations ? c.getAnimations().map((x) => (x.animationName || x.transitionProperty || '?') + '@' + Math.round(+x.currentTime || 0)).join(',') : '') + ']';
    }
    o['birds'] = Array.from(d.querySelectorAll('svg.bird')).map((s) => { const cs = getComputedStyle(s), p = s.querySelector('polyline');
      return { class: s.getAttribute('class'), style: s.getAttribute('style') || '', box: [s.getAttribute('viewBox'), s.getAttribute('width'), s.getAttribute('height')].join(' '),
        points: p ? p.getAttribute('points') : '', sw: p ? p.getAttribute('stroke-width') : '', so: p ? p.getAttribute('stroke-opacity') : '', op: cs.opacity, vis: cs.visibility, disp: cs.display,
        anim: s.getAnimations ? s.getAnimations().map((x) => (x.animationName || '?') + '@' + Math.round(+x.currentTime || 0)).join(',') : '' }; });
    return o;
  }
  const PST = new Map(), PLIST = [], RECS = [];
  function record(k) {
    const st = JSON.stringify(pageState());
    let pi = PST.get(st); if (pi === undefined) { pi = PLIST.length; PLIST.push(st); PST.set(st, pi); }
    const h = canvasHash(); RECS.push([k, h, pi, SUMS, TB64, INKF, window.__GATE ? window.__GATE().late[0] : -1, window.__SIG ? window.__SIG() : '']); SUMS = null; TB64 = null; INKF = 0;
  }
  window.__H = {
    now: () => NOW, calls: () => CALLS, frames: () => FR, page: () => pageState(),
    step: async (n, dt, k0, every, hashTo, post) => {
      for (let k = 0; k < n; k++) {
        NOW += dt; FR++; const kk = k0 + k + 1;
        if (post) dragAt(kk);
        const cur = Q.splice(0, Q.length);
        for (const [, cb] of cur) { try { cb(NOW); } catch (e) { console.error('frame: ' + (e && e.stack || e)); } }
        anims(); fadeWatch(kk, post);
        if (post && INK1 < 0 && INKT > 0) INK1 = kk;
        if (hashTo) { if (kk <= hashTo && kk % every === 0) record(kk); else if (post) { /* (the ink count runs on to the next record) */ } }
        await yieldOnce();
      }
      return document.querySelector('canvas.sky').classList.contains('on');
    },
    untilShown: async (maxf, dt) => {   // frames one by one, in the page, until the canvas is 'on' (its frame count), or -1
      const c = document.querySelector('canvas.sky');
      for (let f = 1; f <= maxf; f++) { await window.__H.step(1, dt, 0, 1, 0, false); if (c.classList.contains('on')) return f; }
      return -1;
    },
    showRec: () => { INKF = 0; record(0); INKT = 0; },   // (the show frame itself, k 0; the ink count from here)
    take: () => { const r = { recs: RECS.splice(0, RECS.length), pages: PLIST.slice() }; return r; },
    gl: () => ({ src: GLSRC.slice(), inkTotal: INKT, inkFirst: INK1, inkSkipped: INKSKIP }),
    fades: () => FW
  };
})();`;

async function capture(p) {
  return p.evaluate(async () => {
    const c = document.querySelector('canvas.sky'), root = document.documentElement;
    const r = { shown: c.classList.contains('on'), cw: c.width, ch: c.height, now: window.__H.now(), fr: window.__H.frames(), calls: window.__H.calls() };
    r.root = Array.from(root.attributes).map((a) => a.name + '=' + a.value).join(' | ');
    const st = getComputedStyle(root); r.ink = ['--color-text', '--color-dimmed', '--color-focus'].map((k) => st.getPropertyValue(k).trim()).join(' ');
    r.theme = (document.querySelector('meta[name="theme-color"]') || {}).content || null;
    r.birds = Array.from(document.querySelectorAll('svg.bird')).filter((s) => s.classList.contains('on')).length;
    r.page = window.__H.page();
    if (c.width && c.height) r.png = c.toDataURL('image/png');
    return r;
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const P = [];
  for (const arm of ARMS) {
    const b = await PW.chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
    const ctx = await b.newContext(Object.assign({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, timezoneId: 'UTC' }, MOBILE ? { isMobile: true, hasTouch: true } : {}));
    const p0 = await ctx.newPage();
    const ren = await p0.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none'; });
    await p0.close();
    if (!/RTX 4090/.test(ren) || !/D3D11/.test(ren)) { console.error('FAIL renderer: ' + ren); process.exit(2); }
    const p = await ctx.newPage(); const logs = [];
    if (+process.env.GSTEP_CPU > 1) await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: +process.env.GSTEP_CPU });   // (GSTEP_CPU=4: the page's CPU throttled, as DevTools does; the frames are on the harness's clock, so they must not change)
    p.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 300)); });
    p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
    await p.addInitScript(INIT);
    if (A.watch) await p.addInitScript(require('./glwatch.js'));   // (tools/gpu: --watch, WebGL watched in the harness: a never-shown visit's trail)
    if (REC) await p.route(/^http:\/\/127\.0\.0\.1:\d+\/(index\.html)?(\?.*)?$/, async (r) => {
      const res = await r.fetch(); let body = await res.text();
      if (!/<html lang="en">/.test(body)) throw new Error('no <html lang="en"> to mark');
      await r.fulfill({ response: res, body: body.replace('<html lang="en">', '<html lang="en" data-dev-switch="rec=1 ab=none">') });
    });
    const o = { arm, b, ctx, p, logs, f: 0, ren, recs: [], pages: [], held: [], hold: { n: 0, released: null, ran: null } };
    if (HOLD.length) await p.route((u) => HOLD.indexOf(path.basename(u.pathname).split('.')[0]) >= 0 && /\.js$/.test(u.pathname), (r) => { o.held.push(r); o.hold.n++; });
    const tf = path.join(OUT, TAG + '_' + arm.name + '.tiles');
    o.tf = tf; o.tfd = fs.openSync(tf, 'w'); o.tn = 0; o.tw = 0; o.th = 0;
    P.push(o);
  }
  // the held scripts let go together; the page frozen until each has run and the load event is past
  async function release(o) {
    o.hold.released = { f: o.f, k: o.k === undefined ? null : o.k };
    const n = o.held.length;
    for (const r of o.held.splice(0)) {
      const res = await r.fetch(); const body = await res.text();
      await r.fulfill({ response: res, body: body + '\n;(window.__HELD = window.__HELD || []).push(' + JSON.stringify(path.basename(new URL(r.request().url()).pathname)) + ');\n' });
    }
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const st = await o.p.evaluate(() => [(window.__HELD || []).length, document.readyState]);
      if (st[0] >= n && st[1] === 'complete') { o.hold.ran = { names: await o.p.evaluate(() => window.__HELD.slice()), ms: Date.now() - t0 }; return; }
      await sleep(5);
    }
    o.logs.push('harness: the held scripts did not all run within 60 s of their release');
  }
  const t0 = Date.now();
  await Promise.all(P.map(async (o) => {
    if (!HOLD.length) await o.p.goto(o.arm.url, { waitUntil: 'load', timeout: 600000 });
    else {
      await o.p.goto(o.arm.url, { waitUntil: 'commit', timeout: 600000 });
      const tq = Date.now();
      while (Date.now() - tq < 60000 && (await o.p.evaluate(() => document.readyState)) === 'loading') await sleep(5);
    }
  }));
  await Promise.all(P.map((o) => o.p.evaluate(() => document.fonts.ready.then(() => true))));
  const res = { tag: TAG, vp: A.vp, mobile: MOBILE, hour: A.hour, seeds: SEEDS, dt: DT, ks: KS, save: SAVE, hash: HASHN, hashevery: HEVERY, yield: YIELD, anim: ANIM, rec: REC, settleOpt: SETTLE,
    drag: DRAG, noink: NOINK, holdOpt: HOLD.length ? { names: HOLD, at: HOLD_AT, max: HOLD_MAX } : null,
    arms: ARMS, renderer: P.map((o) => o.ren), show: {}, showT: {}, samples: [], logs: {}, wall: {}, settle: {}, frames: {}, pages: {}, tiles: {}, glsl: {}, ink: {}, hold: {} };
  if (FADEWATCH) res.fades = {};
  await Promise.all(P.map(async (o) => {
    if (!HOLD.length) {
      while (o.f < MAXF) { const n = await o.p.evaluate(([m, dt]) => window.__H.untilShown(m, dt), [Math.min(200, MAXF - o.f), DT]); if (n > 0) { o.f += n; break; } o.f += Math.min(200, MAXF - o.f); }
    } else {
      // frame by frame: let go at HOLD_MAX if the world has not shown by then (a page whose world waits on a held script)
      let on = false;
      while (o.f < MAXF) {
        if (o.held.length && o.f >= HOLD_MAX) await release(o);
        on = await o.p.evaluate(([dt]) => window.__H.step(1, dt, 0, 1, 0, false), [DT]); o.f++;
        if (on) break;
      }
    }
    res.show[o.arm.name] = o.f < MAXF ? o.f : -1; res.showT[o.arm.name] = await o.p.evaluate(() => window.__H.now());
    await o.p.evaluate(() => window.__H.showRec());
    console.error(TAG + ' ' + o.arm.name + ' shown at frame ' + o.f);
  }));
  res.wall.boot = (Date.now() - t0) / 1000;
  if (WALLWAIT > 0) await new Promise((r) => setTimeout(r, WALLWAIT * 1000));
  const take = async (o) => {
    const r = await o.p.evaluate(() => window.__H.take());
    for (const x of r.recs) {
      let ti = -1;
      if (x[4]) { const buf = Buffer.from(x[4], 'base64'); fs.writeSync(o.tfd, buf); ti = o.tn++; }
      o.recs.push([x[0], x[1], x[2], x[3], ti, x[5], x[6]]);
    }
    o.pages = r.pages;
  };
  let k0 = 0;
  const marks = PNGK.slice(); if (!marks.length || marks[marks.length - 1] < LASTK) marks.push(LASTK);
  for (const K of marks) {
    await Promise.all(P.map(async (o) => { for (let d = k0; d < K;) { const k = Math.min(60, K - d); await o.p.evaluate(([k, dt, kk, ev, ht]) => window.__H.step(k, dt, kk, ev, ht, true), [k, DT, d, HEVERY, HASHN]); d += k; if (d % 120 === 0) await take(o); } }));
    k0 = K;
    if (HOLD.length && K === HOLD_AT) for (const o of P) if (o.held.length) { o.k = K; await release(o); }
    if (KS.concat(SAVE).indexOf(K) < 0) continue;
    const caps = await Promise.all(P.map((o) => capture(o.p)));
    const S = { k: K, arms: {} };
    P.forEach((o, i) => { const c = caps[i]; if (c.png) { fs.writeFileSync(path.join(OUT, TAG + '_k' + K + '_' + o.arm.name + '.png'), Buffer.from(c.png.split(',')[1], 'base64')); delete c.png; c.file = TAG + '_k' + K + '_' + o.arm.name + '.png'; } S.arms[o.arm.name] = c; });
    res.samples.push(S);
    console.error(TAG + ' +' + K + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s): ' + P.map((o) => o.arm.name + ' fr ' + S.arms[o.arm.name].fr).join(', '));
  }
  res.wall.total = (Date.now() - t0) / 1000;
  for (const o of P) {
    await take(o);
    fs.closeSync(o.tfd);
    const g = await o.p.evaluate(() => window.__H.gl());
    const sz = await o.p.evaluate(() => { const c = document.querySelector('canvas.sky'); const gl = c && c.getContext('webgl2'); return gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : [0, 0]; });
    res.tiles[o.arm.name] = { file: path.basename(o.tf), n: o.tn, w: sz[0], h: sz[1], tw: (sz[0] + 15) >> 4, th: (sz[1] + 15) >> 4, tile: 16, dtype: 'uint16le', order: 'rows from the bottom, then columns, then r g b' };
    res.glsl[o.arm.name] = g.src; res.ink[o.arm.name] = { total: g.inkTotal, first: g.inkFirst, skipped: g.inkSkipped };
    res.hold[o.arm.name] = HOLD.length ? Object.assign({ stillHeld: o.held.length }, o.hold) : null;
    if (FADEWATCH) res.fades[o.arm.name] = await o.p.evaluate(() => window.__H.fades());
    res.frames[o.arm.name] = o.recs; res.pages[o.arm.name] = o.pages;
    res.logs[o.arm.name] = o.logs.slice(0, 20);
    res.settle[o.arm.name] = await o.p.evaluate(() => (window.__SETTLED ? window.__SETTLED() : null));
    if (A.watch) { (res.watch = res.watch || {})[o.arm.name] = await o.p.evaluate(() => { if (!window.__glw) return null; const w = window.__glw(); const sky = document.querySelector('canvas.sky'); return Object.assign(w, { canvas: sky ? { cls: sky.className, w: sky.width, h: sky.height } : null, ready: document.readyState, scripts: [...document.scripts].map((s) => (s.src || '').replace(/^.*\//, '')).filter(Boolean) }); }); }
    res[o.arm.name + '_gate'] = await o.p.evaluate(() => (window.__GATE ? window.__GATE() : null));
    if (REC) res[o.arm.name + '_rec'] = await o.p.evaluate(() => { const r = window.__worldRec && window.__worldRec.get(false); return r ? { waits: r.bootStages.waits || null, marks: (r.bootStages.marks || []).filter((m) => /flight|D world|shown|H first/.test(m[0])), keys: r.bootStages.firstKeys ? r.bootStages.firstKeys.keys.map((e) => [e[0], e[2], e[3]]) : null, regs: r.scripts || r.regs || null } : null; });
  }
  fs.writeFileSync(path.join(OUT, TAG + '.json'), JSON.stringify(res, null, 1));
  for (const o of P) await o.b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
