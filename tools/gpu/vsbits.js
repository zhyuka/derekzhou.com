'use strict';
// vsbits.js (tools/gpu): a vertex shader's outputs, old against new, bit for bit, on the RTX 4090 through ANGLE D3D11
// (headless Chrome), by transform feedback: the program's own vertex shader (GLSL as the page gives it:
// <program>.vs.glsl of each dir) run over points (rasteriser off) with every attribute from a seeded generator (each
// vertex its own values; float and integer attributes alike), gl_VertexID and gl_InstanceID as drawn (a VS that reads
// gl_InstanceID is drawn instanced), every active uniform and sampler given as fsbits.js gives them (by name, seeded,
// the same both sides; uDbg, uZ and the like 0), and every varying it declares at global scope captured with
// gl_Position, interleaved. The two sides must declare the same varyings (else no result: unread).
//   node vsbits.js PROGRAM OLD_DIR NEW_DIR OUT.json [--sets 6]
// Prints IDENTICAL or DIFFER (and exits 0), or fails (exit 1: read nothing, so T2 counts the shader unread).
const fs = require('fs'), path = require('path');
const PW = require('./pw.js');
const [prog, oldDir, newDir, outFile] = process.argv.slice(2);
const SETS = +(process.argv.includes('--sets') ? process.argv[process.argv.indexOf('--sets') + 1] : 9);
const NV = 4096, NI = 16;   // vertices a draw; instances where the VS reads gl_InstanceID

// the varyings a VS declares at global scope: `[flat|centroid|smooth] out TYPE a, b;` as a statement of its own (a
// function's `out` parameter is inside its parentheses and never matches: the statement may not hold '(' or ')')
function outsOf(src) {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const out = [];
  for (const m of code.matchAll(/(?<=^|[;{}\s])((?:flat|centroid|smooth|invariant)\s+)*out\s+(?:(?:highp|mediump|lowp)\s+)?(float|vec[234]|int|ivec[234]|uint|uvec[234]|mat[234])\s+([^;(){}]+);/g))
    for (const nm of m[3].split(',').map((x) => x.trim()).filter(Boolean)) {
      if (!/^\w+$/.test(nm)) throw new Error('vsbits: an output it cannot read: ' + nm);
      out.push({ t: m[2], n: nm });
    }
  return out;
}
const COMPS = { float: 1, vec2: 2, vec3: 3, vec4: 4, int: 1, ivec2: 2, ivec3: 3, ivec4: 4, uint: 1, uvec2: 2, uvec3: 3, uvec4: 4, mat2: 4, mat3: 9, mat4: 16 };

(async () => {
  const vsOld = fs.readFileSync(path.join(oldDir, prog + '.vs.glsl'), 'utf8'), vsNew = fs.readFileSync(path.join(newDir, prog + '.vs.glsl'), 'utf8');
  const oO = outsOf(vsOld), oN = outsOf(vsNew);
  if (JSON.stringify(oO) !== JSON.stringify(oN)) throw new Error('vsbits: the two sides declare other varyings');
  const inst = /\bgl_InstanceID\b/.test(vsOld) || /\bgl_InstanceID\b/.test(vsNew);
  const br = await PW.chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-program-cache', '--disable-gpu-shader-disk-cache', '--enable-privileged-webgl-extensions'] });
  let res;
  try {
    const page = await (await br.newContext()).newPage();
    const ren = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d.UNMASKED_RENDERER_WEBGL); });
    if (!/RTX 4090/.test(ren) || !/Direct3D11/.test(ren)) throw new Error('not the 4090 on D3D11: ' + ren);
    console.error('[vsbits] renderer ' + ren + '; ' + oO.length + ' varyings' + (inst ? ', instanced' : ''));
    res = await page.evaluate(async ([VS0, VS1, OUTS, COMPS, SETS, NV, NI, INST]) => {
      const g = document.createElement('canvas').getContext('webgl2');
      const FS = '#version 300 es\nprecision highp float; out vec4 o; void main() { o = vec4(0.0); }';
      const mk = (t, s) => { const h = g.createShader(t); g.shaderSource(h, s); g.compileShader(h); if (!g.getShaderParameter(h, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(h)); return h; };
      const names = OUTS.map((o) => o.n).concat(['gl_Position']);
      const link = (v) => { const p = g.createProgram(); g.attachShader(p, mk(g.VERTEX_SHADER, v)); g.attachShader(p, mk(g.FRAGMENT_SHADER, FS));
        g.transformFeedbackVaryings(p, names, g.INTERLEAVED_ATTRIBS); g.linkProgram(p); if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(p)); return p; };
      const P = [link(VS0), link(VS1)];
      const words = OUTS.reduce((s, o) => s + COMPS[o.t], 0) + 4, nOut = NV * (INST ? NI : 1);
      let seed = 1; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
      const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
      // textures, by kind (one set for the run: the same both sides), as fsbits.js's
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
      const val = (name, n, set) => { seed = (hash(name) ^ (set * 2654435761)) >>> 0 || 1; const a = []; for (let i = 0; i < n; i++) a.push(rnd()); const nm = name.replace(/\[0\]$/, '');
        const R = { uKWc: [0, 0, 40, 128], uKFc: [0, 0, 400, 64], uGC: [-320, -320, 4, 160], uRes: [1440, 900], uProj: [1.6, 1.0, 0.1, 0.0], uOut: [1440, 900] };
        if (R[nm]) return R[nm].slice(0, n);
        if (nm === 'uSun' || nm === 'uSkyS') { const y = 0.05 + 0.9 * a[1], r = Math.sqrt(1 - y * y), th = 6.283 * a[0]; return [r * Math.cos(th), y, r * Math.sin(th)]; }
        if (nm === 'uVP') return [1.2, 0, 0, 0, 0, 1.6, 0, 0, 0, 0, -1.0002, 1, 0, 0, -0.2, 0];   // (a camera looking down +z: half the points before it)
        // the rest by the set: [-2, 2]; small whole numbers (a mode a shader switches on: 0 .. 4); [0, 1]
        return set % 3 === 0 ? a.map((x) => 4 * x - 2) : set % 3 === 1 ? a.map((x) => Math.floor(5 * x)) : a; };
      // coverage: the share of points whose outputs are not the most common one (a vertex shader that sent every point
      // down one path, its hidden one, proves nothing: that read is unread)
      const live = (A) => { const m = new Map(); let best = 0; for (let i = 0; i < nOut; i++) { const k = Array.prototype.join.call(A.subarray(i * words, i * words + words), ','); const c = (m.get(k) || 0) + 1; m.set(k, c); if (c > best) best = c; } return 1 - best / nOut; };
      const cmp = (A, B) => { const ua = new Uint32Array(A.buffer), ub = new Uint32Array(B.buffer); let n = 0, nan = 0, maxd = 0;
        for (let i = 0; i < A.length; i++) { if (A[i] !== A[i]) nan++; if (ua[i] !== ub[i]) { n++; const d = Math.abs(A[i] - B[i]); if (d > maxd) maxd = d; } }
        return { differ: n, of: A.length, maxAbs: maxd, nan }; };
      g.enable(g.RASTERIZER_DISCARD);
      const out = [];
      for (let set = 0; set < SETS; set++) {
        const R = [];
        for (const p of P) {
          g.useProgram(p);
          // attributes: every active one, each vertex its own values (float or integer by its type)
          const vao = g.createVertexArray(); g.bindVertexArray(vao); const bufs = [];
          const na = g.getProgramParameter(p, g.ACTIVE_ATTRIBUTES);
          for (let i = 0; i < na; i++) {
            const info = g.getActiveAttrib(p, i); if (/^gl_/.test(info.name)) continue;
            const loc = g.getAttribLocation(p, info.name), t = info.type;
            const n = { [g.FLOAT]: 1, [g.FLOAT_VEC2]: 2, [g.FLOAT_VEC3]: 3, [g.FLOAT_VEC4]: 4, [g.INT]: 1, [g.INT_VEC2]: 2, [g.INT_VEC3]: 3, [g.INT_VEC4]: 4, [g.UNSIGNED_INT]: 1, [g.UNSIGNED_INT_VEC2]: 2, [g.UNSIGNED_INT_VEC3]: 3, [g.UNSIGNED_INT_VEC4]: 4 }[t];
            if (!n) throw new Error('attribute type ' + t + ' of ' + info.name);
            const isI = [g.INT, g.INT_VEC2, g.INT_VEC3, g.INT_VEC4].includes(t), isU = [g.UNSIGNED_INT, g.UNSIGNED_INT_VEC2, g.UNSIGNED_INT_VEC3, g.UNSIGNED_INT_VEC4].includes(t);
            seed = (hash(info.name) ^ (set * 2246822519)) >>> 0 || 1;
            const d = isI ? new Int32Array(NV * n) : isU ? new Uint32Array(NV * n) : new Float32Array(NV * n);
            for (let k = 0; k < d.length; k++) d[k] = isI ? Math.floor(rnd() * 16) - 4 : isU ? Math.floor(rnd() * 16) : (rnd() * 2 - 1) * (k % n === 3 ? 1 : 60);
            const b = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, b); g.bufferData(g.ARRAY_BUFFER, d, g.STATIC_DRAW); bufs.push(b);
            g.enableVertexAttribArray(loc);
            if (isI || isU) g.vertexAttribIPointer(loc, n, isI ? g.INT : g.UNSIGNED_INT, 0, 0); else g.vertexAttribPointer(loc, n, g.FLOAT, false, 0, 0);
          }
          // uniforms and samplers, as fsbits.js gives them
          const nu = g.getProgramParameter(p, g.ACTIVE_UNIFORMS); let unit = 1;
          for (let i = 0; i < nu; i++) {
            const info = g.getActiveUniform(p, i), L = g.getUniformLocation(p, info.name), base = info.name.replace(/\[0\]$/, '');
            if (base === 'uZ' || base === 'uDbg' || base === 'uPm' || base === 'uZs') continue;
            const t = info.type, sz = info.size;
            if (t === g.SAMPLER_3D) { g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_3D, T3); g.uniform1i(L, 0); continue; }
            if (t === g.SAMPLER_2D) { g.activeTexture(g.TEXTURE0 + unit); g.bindTexture(g.TEXTURE_2D, base === 'uKW' ? TKW : base === 'uGround' ? TG : TX); g.uniform1i(L, unit); unit++; continue; }
            const comps = { [g.FLOAT]: 1, [g.FLOAT_VEC2]: 2, [g.FLOAT_VEC3]: 3, [g.FLOAT_VEC4]: 4, [g.FLOAT_MAT3]: 9, [g.FLOAT_MAT4]: 16, [g.INT]: 1, [g.UNSIGNED_INT]: 1 }[t];
            if (!comps) throw new Error('uniform type ' + t + ' of ' + info.name);
            const v = []; for (let k = 0; k < sz; k++) v.push(...val(base + (sz > 1 ? '#' + k : ''), comps, set));
            if (t === g.FLOAT) g.uniform1fv(L, v); else if (t === g.FLOAT_VEC2) g.uniform2fv(L, v); else if (t === g.FLOAT_VEC3) g.uniform3fv(L, v);
            else if (t === g.FLOAT_VEC4) g.uniform4fv(L, v); else if (t === g.FLOAT_MAT3) g.uniformMatrix3fv(L, false, v); else if (t === g.FLOAT_MAT4) g.uniformMatrix4fv(L, false, v);
            else if (t === g.INT) g.uniform1i(L, Math.floor(v[0] * 4)); else if (t === g.UNSIGNED_INT) g.uniform1ui(L, (((v[0] + 2) / 4) * 4294967295) >>> 0);
          }
          const tb = g.createBuffer(); g.bindBuffer(g.TRANSFORM_FEEDBACK_BUFFER, tb); g.bufferData(g.TRANSFORM_FEEDBACK_BUFFER, nOut * words * 4, g.STATIC_READ);
          const tf = g.createTransformFeedback(); g.bindTransformFeedback(g.TRANSFORM_FEEDBACK, tf); g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER, 0, tb);
          g.beginTransformFeedback(g.POINTS);
          if (INST) g.drawArraysInstanced(g.POINTS, 0, NV, NI); else g.drawArrays(g.POINTS, 0, NV);
          g.endTransformFeedback(); g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER, 0, null); g.bindTransformFeedback(g.TRANSFORM_FEEDBACK, null);
          const back = new Float32Array(nOut * words); g.bindBuffer(g.TRANSFORM_FEEDBACK_BUFFER, tb); g.getBufferSubData(g.TRANSFORM_FEEDBACK_BUFFER, 0, back);
          if (g.getError()) throw new Error('a GL error in the draw or the read');
          R.push(back);
          for (const b of bufs.concat([tb])) g.deleteBuffer(b); g.deleteTransformFeedback(tf); g.deleteVertexArray(vao);
        }
        out.push(Object.assign({ set, live: +live(R[0]).toFixed(4) }, cmp(R[0], R[1])));
      }
      return out;
    }, [vsOld, vsNew, oO, COMPS, SETS, NV, NI, inst]);
  } finally { await br.close(); }
  fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
  let bad = 0, tot = 0;
  let liveSets = 0;
  for (const r of res) { bad += r.differ; tot += r.of; if (r.live >= 0.05) liveSets++; console.log('set ' + r.set + ': ' + r.differ + '/' + r.of + (r.differ ? ' max ' + r.maxAbs.toExponential(2) : '') + (r.nan ? ' nan ' + r.nan : '') + ' (live ' + (100 * r.live).toFixed(1) + '%)'); }
  // IDENTICAL only where the read ran the shader's work: at least a third of the sets with 5% or more of the points
  // off its most common output; else nothing is claimed (exit 1: T2 counts the shader unread, the safe side)
  if (!bad && liveSets * 3 < res.length) { console.log('UNREAD: the outputs were constant (' + liveSets + ' of ' + res.length + ' sets live)'); process.exit(1); }
  console.log((bad ? 'DIFFER: ' : 'IDENTICAL: ') + bad + ' of ' + tot + ' words (' + liveSets + ' of ' + res.length + ' sets live)');
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
