'use strict';
// t2.js (tools/gpu): the T2 graphics check on the RTX 4090 (ANGLE D3D11), base against head in one job.
//   node tools/gpu/t2.js --base BASE_SITE --head HEAD_SITE --out OUT [--cases d11,n23,w303,d707] [--frames 600] [--settle 4000]
//        [--gpuname NAME]   (the page sees NAME as its GPU: another maker's paths, rendered on this GPU)
//        [--par 4] [--profiles DIR] [--port 9600] [--no-null]
// 1. Serves both site folders as Cloudflare Pages serves them (cfserve.js: _headers, so the CSP is the real one).
// 2. FRAMES: every case stepped (gstep.js: the page's clock and entropy fixed, rAF driven at an exact interval, each arm
//    to its own first shown frame), frames +1..+N hashed in the page from readPixels (no screenshots), with each frame's
//    16x16 tile sums. Per case: head, base, and base again (the null test: what this GPU gives a build against itself).
//    A frame head and base disagree on passes as noise only if its tile pyramid is within noise_bounds.json (the kit's
//    rule, calibrated on this GPU: 1.5x the worst of 36,000 frame pairs of one build against itself); the page's state
//    must be equal. frames_identical = every frame of every case equal or noise, every page state equal.
// 3. CSP: any "Content Security Policy" / "Refused to" console line in any visit fails the job (csp_ok).
// 4. GLSL: every shader source each visit compiled (gstep's census: type, length, hashes). glsl_changed when base and head
//    differ. Then each build's programs dumped (glsldump.js) and the changed ones read back on the GPU, old against new,
//    bit for bit: the land VS's height and the probe (hbits.js), every changed fragment shader of a known kind
//    (fsbits.js: land, mesh, sky). bits_identical = all of those 0 differing words. Kinds it cannot read are listed.
// Writes OUT/t2.json and OUT/summary.md; with GITHUB_OUTPUT set, frames_identical, glsl_changed, bits_identical,
// csp_ok (true/false). Exit 1 on a CSP violation, a failed visit or the wrong renderer; 0 otherwise (a change in what is
// seen is the merge bot's to route to the owner, not a failure).
// --profiles DIR: each parallel slot keeps a Chrome profile under DIR (GPU_PROFILE_DIR: the GPU program cache skips FXC
// for shaders compiled before). The frames do not depend on it (gstep reports parallel compiles complete).
const fs = require('fs'), path = require('path'), net = require('net'), { spawn } = require('child_process');
const A = {}; for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i].replace(/^--/, ''), v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } }
const HERE = __dirname, OUT = path.resolve(A.out || 't2out'), N = +(A.frames || 600), PAR = +(A.par || 4);
const CASES = { d11: ['1440x900@1', '2026-10-29T10:30:00Z', 11, false], n23: ['393x852@3', '2026-10-29T23:30:00Z', 23, true],
  w303: ['1440x900@1', '2026-10-29T06:30:00Z', 303, false], d707: ['393x852@3', '2026-10-29T10:30:00Z', 707, true] };
// --settle T: base and head are SETTLED TWINS (twin.js): every visit holds its first shown frame until its world's build is
// idle and the page clock is T ms (the kit's 4000), so base and head show the same settled world at the same page time
// whatever their compile times; without it, plain arms, each from its own first shown frame
const SETTLE = A.settle ? ['--settle', String(+A.settle === +A.settle && A.settle !== true ? A.settle : 4000), '--settle-extra', '0', '--settle-quiet', '8', '--settle-boot'] : [];
const CS = String(A.cases || 'd11,n23,w303,d707').split(',');
const NB = JSON.parse(fs.readFileSync(path.join(HERE, 'noise_bounds.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const log = (s) => { console.log(s); fs.appendFileSync(path.join(OUT, 't2.log'), s + '\n'); };

const free = (port) => new Promise((r) => { const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true))).listen(port, '127.0.0.1'); });
async function serve(dir, from) {
  for (let port = from; port < from + 40; port++) {
    if (!(await free(port))) continue;
    const lf = fs.openSync(path.join(OUT, 'srv_' + port + '.log'), 'w');
    const p = spawn(process.execPath, [path.join(HERE, 'cfserve.js'), path.resolve(dir), String(port)], { stdio: ['ignore', lf, lf] });
    await new Promise((r) => setTimeout(r, 800));
    return { p, url: 'http://127.0.0.1:' + port + '/', port };
  }
  throw new Error('no free port from ' + from);
}
function run(args, env, tag) {
  return new Promise((res) => {
    const lf = fs.openSync(path.join(OUT, tag + '.log'), 'w');
    const p = spawn(process.execPath, args, { stdio: ['ignore', lf, lf], env: Object.assign({}, process.env, env || {}) });
    p.on('exit', (code) => res(code));
  });
}
async function pool(jobs, n) {   // jobs: [fn(slot)]; n at a time, each its own slot (its own Chrome profile)
  const res = new Array(jobs.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, async (_, slot) => { while (next < jobs.length) { const i = next++; res[i] = await jobs[i](slot); } }));
  return res;
}
const prof = (slot) => (A.profiles ? { GPU_PROFILE_DIR: path.join(path.resolve(A.profiles), 'slot' + slot) } : {});

// the tile pyramid of a frame pair (gates.py's pyramid): the largest |sum| over every 1x1, 2x2, 4x4, 8x8 window of tiles
function tilesOf(R) { const t = R.tiles; if (!t || !t.n) return null; const b = fs.readFileSync(path.join(R.dir, t.file)); return { a: new Uint16Array(b.buffer, b.byteOffset, b.length / 2), th: t.th, tw: t.tw }; }
function pyramid(Ta, ia, Tb, ib) {
  const th = Ta.th, tw = Ta.tw, n = th * tw * 3, oa = ia * n, ob = ib * n, o = {};
  const I = new Float64Array((th + 1) * (tw + 1) * 3), at = (y, x, c) => (y * (tw + 1) + x) * 3 + c;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) for (let c = 0; c < 3; c++) {
    const d = Tb.a[ob + (y * tw + x) * 3 + c] - Ta.a[oa + (y * tw + x) * 3 + c];
    I[at(y + 1, x + 1, c)] = d + I[at(y, x + 1, c)] + I[at(y + 1, x, c)] - I[at(y, x, c)];
  }
  for (const s of [1, 2, 4, 8]) { let m = 0; if (s <= th && s <= tw) for (let y = s; y <= th; y++) for (let x = s; x <= tw; x++) for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(I[at(y, x, c)] - I[at(y - s, x, c)] - I[at(y, x - s, c)] + I[at(y - s, x - s, c)])); o['t' + s] = m; }
  o.frame = Math.max(...[0, 1, 2].map((c) => Math.abs(I[at(th, tw, c)])));
  return o;
}
function compare(Ra, Rb, B) {   // Ra base, Rb head (gstep's json + its dir): per frame equal | noise | real
  const fa = Ra.frames, fb = Rb.frames, Ta = tilesOf(Ra), Tb = tilesOf(Rb), out = { equal: 0, noise: 0, real: [], pages: [] };
  const n = Math.min(fa.length, fb.length);
  for (let i = 1; i < n; i++) {   // (frame 0, the show frame itself, is not compared: the kit's rule)
    const a = fa[i], b = fb[i];
    if (Ra.pages[a[2]] !== Rb.pages[b[2]]) out.pages.push(a[0]);
    if (a[1] === b[1]) { out.equal++; continue; }
    if (Ta && Tb && a[4] >= 0 && b[4] >= 0 && a[1].split(':')[0] === b[1].split(':')[0]) {
      const st = pyramid(Ta, a[4], Tb, b[4]); if (['t1', 't2', 't4', 't8', 'frame'].every((l) => st[l] <= B[l])) { out.noise++; continue; }
      out.real.push([a[0], st]); continue;
    }
    out.real.push([a[0], null]);
  }
  if (fa.length !== fb.length) out.real.push(['frames ' + fa.length + ' vs ' + fb.length, null]);
  return out;
}

(async () => {
  const t0 = Date.now(), R = { cases: {}, csp: [], errors: [], glsl: {}, bits: [] };
  const S = { base: await serve(A.base, +(A.port || 9600)), head: null }; S.head = await serve(A.head, S.base.port + 1);
  try {
    // FRAMES (+ the census and the console, from the same visits)
    const runs = [];
    for (const c of CS) for (const [arm, r] of [['head', 1], ['base', 1]].concat(A['no-null'] ? [] : [['base', 2]])) runs.push({ c, arm, r });
    const done = await pool(runs.map((j) => async (slot) => {
      const [vp, hour, seed, mob] = CASES[j.c], tag = j.c + '_' + j.arm + '_r' + j.r, dir = path.join(OUT, 'frames');
      fs.mkdirSync(dir, { recursive: true });
      const args = [path.join(HERE, 'gstep.js'), '--out', dir, '--tag', tag, '--vp', vp, '--hour', hour, '--seeds', String(seed), '--ks', '1,' + N, '--hash', String(N), '--arm', j.arm + '=' + S[j.arm].url, '--yield', 'raf', '--watch', '--realname'].concat(A.gpuname ? ['--gpuname', A.gpuname] : []).concat(mob ? ['--mobile'] : [], SETTLE);
      // a visit whose world never showed (gstep's frame limit reached: show -1 or the limit) is retried once with a fresh
      // profile (no kept GPU cache); if it never shows again, the visit fails (it is never compared as a pass)
      const shown = (r) => r && r.show && r.show[j.arm] >= 0 && r.show[j.arm] < 4000;   // (first-paint preview: 0, shown in the page's own load: the hold)
      let code, res = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        code = await run(args, attempt ? {} : prof(slot), 'gstep_' + tag + (attempt ? '_retry' : ''));
        res = null; try { res = JSON.parse(fs.readFileSync(path.join(dir, tag + '.json'), 'utf8')); } catch (e) { /* none */ }
        log('visit ' + tag + (attempt ? ' (retry, fresh profile)' : '') + ': exit ' + code + (res ? ', shown at frame ' + res.show[j.arm] : ', no result'));
        if (shown(res)) break;
        // (kept for the diagnosis: harness or site? the visit's whole result, its page's console and its page state,
        // copied to OUT's top level so the job's report carries them)
        if (res) { fs.writeFileSync(path.join(OUT, 'noshow_' + tag + (attempt ? '_retry' : '') + '.json'), JSON.stringify({ show: res.show, logs: res.logs, wall: res.wall, watch: res.watch, pages: res.pages, glsl: (res.glsl[j.arm] || []).length, renderer: res.renderer }, null, 1)); log('NEVER SHOWN ' + tag + ': console ' + JSON.stringify(res.logs[j.arm]).slice(0, 1500)); }
      }
      if (!res) return Object.assign(j, { ok: false });
      if (!shown(res)) { R.errors.push('visit ' + tag + ' failed: the world never showed (twice)'); return Object.assign(j, { ok: false, noshow: true }); }
      const one = { frames: res.frames[j.arm], pages: res.pages[j.arm], tiles: res.tiles[j.arm], glsl: res.glsl[j.arm], logs: res.logs[j.arm], dir, show: res.show[j.arm], renderer: res.renderer };
      return Object.assign(j, { ok: code === 0, res: one });
    }), PAR);
    for (const j of done) {
      if (!j.ok) { R.errors.push('visit ' + j.c + ' ' + j.arm + ' r' + j.r + ' failed (see gstep_*.log)'); continue; }
      if (!/RTX 4090/.test(String(j.res.renderer))) R.errors.push('the runner did not get the RTX 4090: ' + j.res.renderer);
      R.renderer = R.renderer || String(j.res.renderer);   // (the job reports the GPU Chrome got)
      for (const l of j.res.logs || []) if (/Content Security Policy|Refused to/i.test(l)) R.csp.push(j.c + ' ' + j.arm + ': ' + l);
    }
    const get = (c, arm, r) => (done.find((j) => j.c === c && j.arm === arm && j.r === r && j.ok) || {}).res;
    let identical = true, glslChanged = false;
    for (const c of CS) {
      const b1 = get(c, 'base', 1), h1 = get(c, 'head', 1), b2 = get(c, 'base', 2), key = CASES[c][0] + (CASES[c][3] ? ' mobile' : '');
      const B = NB.bounds[key];
      if (!b1 || !h1) { identical = false; R.cases[c] = { error: 'a visit failed' }; continue; }
      const cmp = compare(b1, h1, B), nul = b2 ? compare(b1, b2, B) : null;
      const same = !cmp.real.length && !cmp.pages.length;
      identical = identical && same;
      // (as sets: programs link in parallel, so the order a visit compiles its sources in varies from run to run)
      const gb = JSON.stringify([...new Set(b1.glsl)].sort()), gh = JSON.stringify([...new Set(h1.glsl)].sort()); if (gb !== gh) glslChanged = true;
      R.cases[c] = { shown: { base: b1.show, head: h1.show }, equal: cmp.equal, noise: cmp.noise, real: cmp.real.slice(0, 20), realN: cmp.real.length, pages: cmp.pages.slice(0, 20),
        nullTest: nul ? { equal: nul.equal, noise: nul.noise, realN: nul.real.length } : null, glslSame: gb === gh };
      log(c + ': ' + (same ? 'IDENTICAL' : 'CHANGED') + ' (' + cmp.equal + ' equal, ' + cmp.noise + ' noise, ' + cmp.real.length + ' changed, ' + cmp.pages.length + ' page states differ' + (nul ? '; null test ' + nul.real.length + ' changed' : '') + ')');
      if (nul && nul.real.length) R.errors.push(c + ': the null test (base against itself) changed ' + nul.real.length + ' frames: the noise bounds or the GPU are off; frames_identical is not trusted');
    }
    // GLSL: dump both builds' programs, read the changed ones back bit for bit
    let bitsIdentical = true;
    if (glslChanged) {
      const dd = { base: path.join(OUT, 'glsl_base'), head: path.join(OUT, 'glsl_head') };
      await pool(['base', 'head'].map((arm) => async (slot) => run([path.join(HERE, 'glsldump.js'), S[arm].url, dd[arm]].concat(A.gpuname ? ['--gpuname', A.gpuname] : []), prof(slot), 'glsldump_' + arm)), 2);
      const P = {}; for (const arm of ['base', 'head']) { try { P[arm] = JSON.parse(fs.readFileSync(path.join(dd[arm], 'programs.json'), 'utf8')); } catch (e) { P[arm] = []; R.errors.push('glsldump ' + arm + ' failed'); } }
      // pairs by content, not by link order (a program added or removed shifts every name after it): a head program whose
      // two sources are a base program's is unchanged; else it is paired with the unpaired base program of its own name,
      // if their fragment sources are at least half alike; else with the unpaired base program of the same vertex source
      // (else any) whose fragment source is the most alike, if that is at least half; else it is new. Alike: the lines
      // the two share (each line matched once, counted by length) over the longer text. The name comes first because the
      // land's variants differ by a few lines (0.996 alike) and content alone could pair a changed one with its
      // sibling; content decides only when no program of that name is left (one was added or removed). Not the common
      // head and tail, as before: edits near both ends, as #66 made to the cloud bodies, left that at 0.45 and the
      // changed shader was never read back. Each pair is copied under the head's name into pairs/base and pairs/head.
      // The text is compared minified (tools/glslmin.mjs: no comment, no spare space, the same tokens), so a program
      // whose text only lost its comments and spacing (the build's shader minifier) still pairs with its old self and is
      // read back; where tools/glslmin.mjs is missing (an older base), as written.
      let norm = (t) => t; try { const g = await import(require('url').pathToFileURL(path.join(HERE, '..', 'glslmin.mjs')).href); norm = (t) => g.minGlsl(t); } catch (e) { /* as written */ }
      const NC = new Map(), rd = (arm, n, k) => fs.readFileSync(path.join(dd[arm], n + '.' + k + '.glsl'), 'utf8');
      const rdn = (arm, n, k) => { const key = arm + '/' + n + '.' + k; if (!NC.has(key)) NC.set(key, norm(rd(arm, n, k))); return NC.get(key); };
      const alike = (a, b) => { const m = new Map(); for (const l of b.split('\n')) m.set(l, (m.get(l) || 0) + 1); let s = 0; for (const l of a.split('\n')) { const c = m.get(l); if (c) { m.set(l, c - 1); s += l.length + 1; } } return s / Math.max(a.length, b.length, 1); };
      const used = new Set(), pair = {};
      for (const x of P.head) { const m = P.base.find((y) => y[1] === x[1] && y[2] === x[2] && !used.has(y[0])); if (m) { used.add(m[0]); pair[x[0]] = null; } }
      for (const x of P.head) {
        if (x[0] in pair) continue;
        const fsH = rdn('head', x[0], 'fs'), vsH = rdn('head', x[0], 'vs'), cand = P.base.filter((y) => !used.has(y[0])), pool2 = cand.some((y) => y[1] === x[1] || rdn('base', y[0], 'vs') === vsH) ? cand.filter((y) => y[1] === x[1] || rdn('base', y[0], 'vs') === vsH) : cand;
        const own = cand.find((y) => y[0] === x[0]);
        if (own && alike(fsH, rdn('base', own[0], 'fs')) >= 0.5) { used.add(own[0]); pair[x[0]] = own; continue; }
        let best = null, bs = -1; for (const y of pool2) { const s = alike(fsH, rdn('base', y[0], 'fs')); if (s > bs) { bs = s; best = y; } }
        if (best && bs >= 0.5) { used.add(best[0]); pair[x[0]] = best; } else pair[x[0]] = undefined;
      }
      const pd = { base: path.join(OUT, 'pairs', 'base'), head: path.join(OUT, 'pairs', 'head') }; fs.mkdirSync(pd.base, { recursive: true }); fs.mkdirSync(pd.head, { recursive: true });
      for (const [n, y] of Object.entries(pair)) if (y) for (const k of ['vs', 'fs']) { fs.writeFileSync(path.join(pd.base, n + '.' + k + '.glsl'), rd('base', y[0], k)); fs.writeFileSync(path.join(pd.head, n + '.' + k + '.glsl'), rd('head', n, k)); }
      const hb = Object.fromEntries(Object.entries(pair).filter(([, y]) => y)), changed = Object.keys(pair).filter((n) => pair[n] !== null);
      const gone = P.base.filter((y) => !used.has(y[0])).map((y) => y[0]);
      if (gone.length) log('in base only (removed in head): ' + gone.join(', '));
      R.glsl = { programs: { base: P.base.length, head: P.head.length }, changed, unread: [] };
      const jobs = [];
      if (changed.some((n) => n === 'world.surface0' || n === 'world.probe') && hb['world.surface0'] && hb['world.probe'])
        jobs.push({ what: 'land height and probe (hbits)', args: [path.join(HERE, 'hbits.js'), 'bits', pd.base, pd.head, path.join(OUT, 'bits_land.json')] });
      for (const n of changed) {
        if (!hb[n]) { R.glsl.unread.push(n + ' (new in head)'); continue; }
        const fsrc = rd('head', n, 'fs'), me = P.head.find((x) => x[0] === n), vsChanged = hb[n][1] !== me[1];
        // (a kind fsbits feeds: every input the FS declares is the land's (vW, vN, vX), a mesh's (vW, vN, vC, vY, vE), or
        // none (full screen))
        const ins = [...fsrc.matchAll(/(?:^|;)\s*(?:centroid |flat |smooth )*in\s+(?:highp |mediump |lowp )?\w+\s+(\w+)\s*;/gm)].map((m) => m[1]);
        const known = ins.every((v) => ['vW', 'vN', 'vX'].includes(v)) || ins.every((v) => ['vW', 'vN', 'vC', 'vY', 'vE'].includes(v));
        if (hb[n][2] !== me[2] && known) jobs.push({ what: n + ' FS (fsbits; base ' + hb[n][0] + ')', args: [path.join(HERE, 'fsbits.js'), n, pd.base, pd.head, path.join(OUT, 'bits_' + n + '.json')] });
        else if (hb[n][2] !== me[2]) R.glsl.unread.push(n + ' FS (its varyings are not a kind fsbits feeds)');
        if (vsChanged && n !== 'world.surface0') R.glsl.unread.push(n + ' VS (no vertex read-back for it; the frames decide)');
      }
      const codes = await pool(jobs.map((jb, i) => async (slot) => { const tag = 'bits_' + i; const code = await run(jb.args, prof(slot), tag); const txt = fs.readFileSync(path.join(OUT, tag + '.log'), 'utf8'); const m = /(IDENTICAL|DIFFER)[^\n]*/.exec(txt); return { what: jb.what, code, line: m ? m[0] : 'no result (exit ' + code + ')' }; }), PAR);
      R.bits = codes; for (const c of codes) { log('bits ' + c.what + ': ' + c.line); if (!/^IDENTICAL/.test(c.line)) bitsIdentical = false; }
      // (a changed shader this job cannot read back leaves bits_identical false: the merge bot then asks the owner)
      if (R.glsl.unread.length) { bitsIdentical = false; log('GLSL changed but not read back: ' + R.glsl.unread.join('; ')); }
    }
    R.frames_identical = identical && !R.errors.length; R.glsl_changed = glslChanged; R.bits_identical = bitsIdentical; R.csp_ok = !R.csp.length;
    R.seconds = Math.round((Date.now() - t0) / 1000);
    fs.writeFileSync(path.join(OUT, 't2.json'), JSON.stringify(R, null, 1));
    const md = ['## T2: the graphics check on the RTX 4090 (D3D11)', '', '| case | result | equal | noise | changed | page states | null test |', '|---|---|---:|---:|---:|---:|---|']
      .concat(CS.map((c) => { const x = R.cases[c]; return x.error ? '| ' + c + ' | ERROR | | | | | |' : '| ' + c + ' | ' + (x.realN || x.pages.length ? 'CHANGED' : 'identical') + ' | ' + x.equal + ' | ' + x.noise + ' | ' + x.realN + ' | ' + x.pages.length + ' | ' + (x.nullTest ? x.nullTest.realN + ' changed' : '-') + ' |'; }))
      .concat(['', '- frames_identical: **' + R.frames_identical + '**', '- glsl_changed: ' + glslChanged + (glslChanged ? ' (' + R.glsl.changed.join(', ') + ')' : ''), '- bits_identical: ' + bitsIdentical + (R.bits.length ? ' (' + R.bits.map((b) => b.what + ': ' + b.line).join('; ') + ')' : ''),
        R.glsl.unread && R.glsl.unread.length ? '- not read back (the frames decide): ' + R.glsl.unread.join('; ') : '', '- renderer: ' + R.renderer, '- csp_ok: ' + R.csp_ok + (R.csp.length ? ' (' + R.csp.slice(0, 5).join(' | ') + ')' : ''),
        R.errors.length ? '- errors: ' + R.errors.join('; ') : '', '- ' + R.seconds + ' s'].filter(Boolean));
    fs.writeFileSync(path.join(OUT, 'summary.md'), md.join('\n') + '\n');
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, ['frames_identical', 'glsl_changed', 'bits_identical', 'csp_ok'].map((k) => k + '=' + R[k]).join('\n') + '\n');
    log(md.join('\n'));
    process.exitCode = R.csp.length || R.errors.some((e) => /failed|RTX 4090/.test(e)) ? 1 : 0;
  } finally { S.base.p.kill(); S.head.p.kill(); }
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
