'use strict';
// glwatch.js (tools/gpu): a page-side watch on WebGL2, put on the page by the harness (addInitScript) before any of its
// scripts: it instruments the exact bytes visitors get (no dev build, no record). It times, on the real clock:
//   - every program's link (compileShader + linkProgram as called, and the first LINK_STATUS / COMPLETION_STATUS read
//     that comes back true: where the page waits for a parallel compile);
//   - the FIRST USE of every pipeline key, as ANGLE's D3D11 back end builds variants inside a draw (fast500 GUARD.md):
//     the program; the draw framebuffer (the canvas, or each colour attachment's internal format and samples, drawBuffers,
//     depth/stencil); each enabled vertex attribute's size, type, normalized, integer, divisor; the primitive class. The
//     first draw of a key is followed by a getError (the GPU process has run the call: a variant compiled inside it is
//     in its time) and the time from just before the draw to after the getError is the key's;
//   - a trail of the boot: the last 200 events (links, first draws, context loss, the canvas's class changes) with times.
// window.__glw() returns { keys: [[key, ms, at]], links: [[name, compileMs, linkMs, at]], trail, frames, lost, gl }.
// Program names: 'p<n>:<vs8>/<fs8>' (link order, then each source's own 32-bit hash), so base and head name the same
// program alike when its sources are the same.
module.exports = `(() => {
  if (window.__glw) return;
  const now = () => performance.now(), W = { keys: new Map(), links: [], trail: [], frames: 0, lost: 0, gl: 0, at0: now() };
  const tr = (s) => { W.trail.push([+now().toFixed(1), s]); if (W.trail.length > 200) W.trail.shift(); };
  const h32 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return ('0000000' + h.toString(16)).slice(-8); };
  const P = WebGL2RenderingContext.prototype, K = new WeakMap(), SH = new WeakMap(), PR = new WeakMap(), FB = new WeakMap(), TX = new WeakMap(), RBF = new WeakMap();
  let nP = 0, nF = 0;
  const raf = window.requestAnimationFrame; window.requestAnimationFrame = function (cb) { return raf.call(window, (t) => { W.frames++; return cb(t); }); };
  const st = (g) => { let s = K.get(g); if (!s) { s = { prog: null, fb: null, rfb: null, db: null, vao: null, attr: {}, fmt: {} }; K.set(g, s); W.gl++; g.canvas.addEventListener && g.canvas.addEventListener('webglcontextlost', () => { W.lost++; tr('context lost'); }); } return s; };
  const wrap = (name, f) => { const o = P[name]; if (o) P[name] = function () { return f.call(this, o, arguments); }; };
  wrap('shaderSource', function (o, a) { SH.set(a[0], { src: String(a[1]) }); return o.apply(this, a); });
  wrap('compileShader', function (o, a) { const t = now(), r = o.apply(this, a), s = SH.get(a[0]); if (s) s.ms = now() - t; return r; });
  wrap('attachShader', function (o, a) { const p = PR.get(a[0]) || { sh: [] }; p.sh.push(a[1]); PR.set(a[0], p); return o.apply(this, a); });
  wrap('linkProgram', function (o, a) { const p = PR.get(a[0]) || { sh: [] }; PR.set(a[0], p); const srcs = p.sh.map((x) => (SH.get(x) || {}).src || '');
    const vs = srcs.find((s) => /gl_Position/.test(s)) || srcs[0] || '', fs = srcs.find((s) => s !== vs) || '';
    p.name = 'p' + (nP++) + ':' + h32(vs) + '/' + h32(fs); p.cms = p.sh.reduce((m, x) => m + ((SH.get(x) || {}).ms || 0), 0); p.t0 = now();
    const r = o.apply(this, a); p.lms = now() - p.t0; W.links.push([p.name, +p.cms.toFixed(1), +p.lms.toFixed(1), +p.t0.toFixed(1)]); tr('link ' + p.name); return r; });
  wrap('getProgramParameter', function (o, a) { const t = now(), r = o.apply(this, a), p = PR.get(a[0]);
    if (p && !p.done && (a[1] === this.LINK_STATUS || a[1] === 0x91B1) && r) { p.done = now(); const L = W.links.find((x) => x[0] === p.name); if (L) { L.push(+(p.done - p.t0).toFixed(1)); } tr('linked ' + p.name + ' (' + (now() - t).toFixed(1) + ' ms read)'); }
    return r; });
  wrap('useProgram', function (o, a) { st(this).prog = a[0]; return o.apply(this, a); });
  wrap('bindFramebuffer', function (o, a) { const s = st(this); if (a[0] === this.FRAMEBUFFER || a[0] === this.DRAW_FRAMEBUFFER) s.fb = a[1]; if (a[0] === this.FRAMEBUFFER || a[0] === this.READ_FRAMEBUFFER) s.rfb = a[1]; return o.apply(this, a); });
  wrap('bindTexture', function (o, a) { st(this)['tex' + a[0]] = a[1]; return o.apply(this, a); });
  const fmtTex = function (o, a, ifmt, samples) { const t = st(this)['tex' + a[0]]; if (t) TX.set(t, ifmt + (samples ? '/' + samples : '')); return o.apply(this, a); };
  wrap('texStorage2D', function (o, a) { return fmtTex.call(this, o, a, a[2]); });
  wrap('texImage2D', function (o, a) { return fmtTex.call(this, o, a, a[2]); });
  wrap('texStorage3D', function (o, a) { return fmtTex.call(this, o, a, a[2]); });
  wrap('bindRenderbuffer', function (o, a) { st(this).rb = a[1]; return o.apply(this, a); });
  wrap('renderbufferStorage', function (o, a) { const r = st(this).rb; if (r) RBF.set(r, String(a[1])); return o.apply(this, a); });
  wrap('renderbufferStorageMultisample', function (o, a) { const r = st(this).rb; if (r) RBF.set(r, a[2] + '/' + a[1]); return o.apply(this, a); });
  const att = function (o, a, what) { const s = st(this), f = (a[0] === this.READ_FRAMEBUFFER ? s.rfb : s.fb); if (f) { const m = FB.get(f) || { id: nF++, at: {} }; m.at[a[1]] = what; FB.set(f, m); } return o.apply(this, a); };
  wrap('framebufferTexture2D', function (o, a) { return att.call(this, o, a, a[3] ? 't' + (TX.get(a[3]) || '?') : null); });
  wrap('framebufferTextureLayer', function (o, a) { return att.call(this, o, a, a[2] ? 't' + (TX.get(a[2]) || '?') : null); });
  wrap('framebufferRenderbuffer', function (o, a) { return att.call(this, o, a, a[3] ? 'r' + (RBF.get(a[3]) || '?') : null); });
  wrap('drawBuffers', function (o, a) { const s = st(this); if (s.fb) { const m = FB.get(s.fb) || { id: nF++, at: {} }; m.db = Array.from(a[0]).join(','); FB.set(s.fb, m); } else s.db = Array.from(a[0]).join(','); return o.apply(this, a); });
  wrap('bindVertexArray', function (o, a) { st(this).vao = a[0]; return o.apply(this, a); });
  const VA = new WeakMap(); const va = (g) => { const s = st(g), k = s.vao || g; let m = VA.get(k); if (!m) { m = {}; VA.set(k, m); } return m; };
  wrap('enableVertexAttribArray', function (o, a) { (va(this)[a[0]] = va(this)[a[0]] || {}).on = 1; return o.apply(this, a); });
  wrap('disableVertexAttribArray', function (o, a) { (va(this)[a[0]] = va(this)[a[0]] || {}).on = 0; return o.apply(this, a); });
  wrap('vertexAttribPointer', function (o, a) { const m = va(this); m[a[0]] = Object.assign(m[a[0]] || {}, { f: a[1] + ':' + a[2] + (a[3] ? 'n' : '') }); return o.apply(this, a); });
  wrap('vertexAttribIPointer', function (o, a) { const m = va(this); m[a[0]] = Object.assign(m[a[0]] || {}, { f: a[1] + ':' + a[2] + 'I' }); return o.apply(this, a); });
  wrap('vertexAttribDivisor', function (o, a) { const m = va(this); m[a[0]] = Object.assign(m[a[0]] || {}, { d: a[1] }); return o.apply(this, a); });
  const prim = (m) => m === 0 ? 'points' : m < 4 ? 'lines' : 'triangles';
  const keyOf = (g, mode) => { const s = st(g), p = PR.get(s.prog), f = s.fb ? FB.get(s.fb) : null;
    const out = s.fb ? (f ? Object.keys(f.at).sort().map((k) => k + '=' + f.at[k]).join(' ') + (f.db ? ' db ' + f.db : '') : 'fb?') : 'canvas' + (s.db ? ' db ' + s.db : '');
    const m = va(g), ins = Object.keys(m).sort((a, b) => a - b).filter((i) => m[i].on).map((i) => i + ':' + (m[i].f || '?') + (m[i].d ? '/d' + m[i].d : '')).join(' ');
    return (p ? p.name : 'p?') + ' | out ' + out + ' | in ' + ins + ' | ' + prim(mode); };
  const draw = function (o, a) { const k = keyOf(this, a[0]); if (W.keys.has(k)) return o.apply(this, a);
    const t = now(), r = o.apply(this, a); this.getError(); const ms = now() - t; W.keys.set(k, [+ms.toFixed(1), +t.toFixed(1)]); tr('first draw ' + ms.toFixed(1) + ' ms ' + k.slice(0, 120)); return r; };
  for (const n of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']) wrap(n, draw);
  new MutationObserver(() => { const c = document.querySelector('canvas.sky'); if (c && c.className !== W.cls) { W.cls = c.className; tr('canvas class "' + c.className + '"'); } }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
  window.__glw = () => ({ keys: [...W.keys.entries()].map(([k, v]) => [k, v[0], v[1]]), links: W.links, trail: W.trail, frames: W.frames, lost: W.lost, gl: W.gl, since: +(now() - W.at0).toFixed(0) });
})();`;
