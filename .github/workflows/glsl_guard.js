// glsl_guard.js (CI: validate.yml's step "Every visit compiles the same shaders"). A returning visitor's world is
// quick only when Chrome's shader cache answers for every program, and it answers only for a source it has seen byte
// for byte. So this guard holds two rules:
//  1. No per-visit, per-window or per-hour value in any GLSL source. The site's scripts (every script index.html
//     loads, in the order the page runs them, as shipped, minified or not) run in node in a small fake browser with a
//     fake WebGL2 context. The fake keeps every source handed to shaderSource, until the world has shown and gone
//     quiet (nothing is compiled after the show). That is done for several visits of several devices. A visit differs
//     in its entropy, its hour, its window and density, its clock's start and its frame rate. The devices are a desktop
//     Chrome (the reference), a phone Chrome, a WebKit phone, a GPU with half-float targets only and one with no float
//     targets. Within a device every visit must compile the same programs with the same sources, byte for byte.
//     Across devices the sources may differ only by #define lines just after "#version 300 es" (DEFS, per device).
//  2. A deploy changes only the programs it edits. CI no longer holds this here (2026-11-06: no derived file is
//     committed): the gate's census compares the base's build with the head's, and T2 names and reads back each changed
//     program. --manifest/--write remain for a local look: the reference device's programs (each one's label and its
//     two sources' hashes and lengths) and each device's count and defines, compared with or written to FILE.
//     Programs are matched by their hashes; the labels (the world's own program names) are for people.
//   node glsl_guard.js SITE_DIR [--manifest FILE] [--write FILE] [--selftest] [--json FILE] [--visits N] [--dump DIR]
//   node glsl_guard.js SITE_DIR --reduced          the reference device's first visit under prefers-reduced-motion: the
//                                                    world one still frame (RULES.json reduced-motion-still): after its
//                                                    0.1 s redraw nothing more is drawn or asked for, a drag included
//   node glsl_guard.js SITE_DIR --first --dump DIR   only the reference device's first visit (its seed, hour and window as in a
//                                                    full run), dumped, nothing judged: test/shaders.mjs reads just that visit
//   --manifest FILE  compare with that manifest (CI); --write FILE  write it (after a deliberate change, then commit it);
//   --selftest  the guard's own proof: the same visits with a planted per-visit literal, a per-window literal and one
//   program changed without its manifest line, each of which must be caught (CI runs it)
// Exit 0: every rule holds. 1: a rule failed (each failure an ::error:: line). 2: usage, or node older than 22.8.
// 3: the fake browser could not bring the world to its show (the page needs something the fake does not give: extend
// the fake, never relax the rules). Plain node, no dependency; deterministic (every visit's inputs are fixed here).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const A = { _: [] };
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a === '--selftest') A.selftest = true; else if (a === '--first') A.first = true; else if (a === '--reduced') A.first = A.reduced = true; else if (a.startsWith('--')) A[a.slice(2)] = process.argv[++i]; else A._.push(a); }
const SITE = A._[0];
if (!SITE || !fs.existsSync(path.join(SITE, 'index.html'))) { console.error('usage: node glsl_guard.js SITE_DIR [--manifest FILE] [--write FILE] [--json FILE] [--visits N] [--dump DIR]'); process.exit(2); }
if (!vm.constants || vm.constants.DONT_CONTEXTIFY === undefined) { console.error('glsl_guard.js needs node 22.8 or later (vm.constants.DONT_CONTEXTIFY)'); process.exit(2); }
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 24);

// ------------------------------------------------------------------ the devices, the page and one visit: test/fakepage.cjs
const FP = require('../../test/fakepage.cjs'), { UA, EXT, DEVICES, HOURS, scriptsOf, loadScripts } = FP;
const run = (V, page) => FP.run(V, page, { reduced: !!A.reduced });

function visits() {
  const out = []; let k = 0;
  for (const d of (A.first ? [DEVICES[0]] : DEVICES)) {
    const n = A.first ? 1 : d === DEVICES[0] ? Math.max(3, +(A.visits || 5)) : Math.max(2, Math.min(+(A.visits || 5), d.wins.length));
    for (let i = 0; i < n; i++, k++) {
      const w = d.wins[i % d.wins.length];
      out.push({ dev: d, n: i, seed: (Math.imul(0x9e3779b9, k + 1) + Math.imul(0x7f4a7c15, i + 3)) >>> 0, hour: HOURS[k % HOURS.length], w: w[0], h: w[1], dpr: w[2],
        hz: [60, 144, 120, 90, 75][k % 5], t0: 200 + 977 * k });
    }
  }
  if (!A.first) out.push(Object.assign({}, out[0], { n: 'again' }));   // (the first visit once more: the fake itself must be deterministic)
  return out;
}

// ------------------------------------------------------------------ the page's scripts, in the order it runs them
// ------------------------------------------------------------------ the rules
const VER = '#version 300 es\n';
function split(src) {   // { defs: the #define lines just after #version (the device's DEFS), rest: the source without them }
  if (!src.startsWith(VER)) return { defs: [], rest: src };
  let i = VER.length; const defs = [];
  for (;;) { const j = src.indexOf('\n', i); if (j < 0) break; const L = src.slice(i, j); if (!/^#define [A-Za-z_]\w*[ \t]*$/.test(L)) break; defs.push(L.slice(8).trim()); i = j + 1; }
  return { defs, rest: VER + src.slice(i) };
}
function firstDiff(a, b) {   // where two sources part: the line and both texts, and whether only numbers differ
  const x = a.split('\n'), y = b.split('\n');
  let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i++;
  const num = (s) => s.replace(/\d+/g, '#');
  const onlyNums = x.length === y.length && x.every((l, k) => l === y[k] || num(l) === num(y[k]));
  return `line ${i + 1}: "${(x[i] || '').trim().slice(0, 110)}" against "${(y[i] || '').trim().slice(0, 110)}"` + (onlyNums ? ' (only its numbers differ: a per-visit or per-window literal)' : '');
}
function label(R, labels) {   // each linked program with its label: the world's own name where the registration shows it
  const used = new Set(), seen = new Map(); let un = 0;
  return R.programs.map((p) => {
    const bv = split(p.vs).rest, bf = split(p.fs).rest;
    let nm = null;
    if (labels) for (let i = 0; i < R.reg.length; i++) if (!used.has(i) && split(R.reg[i].vs).rest === bv && split(R.reg[i].fs).rest === bf) { used.add(i); nm = R.reg[i].name; break; }
    if (!nm) nm = labels ? 'unregistered.' + (++un) : null;
    if (nm) { const c = (seen.get(nm) || 0) + 1; seen.set(nm, c); if (c > 1) nm += '#' + c; }
    return { name: nm, vs: p.vs, fs: p.fs, bv, bf, defs: split(p.vs).defs.join(',') + '|' + split(p.fs).defs.join(',') };
  });
}
const tagOf = (v) => `${v.dev.id}#${v.n} ${v.w}x${v.h}@${v.dpr} ${v.hz}Hz hour ${v.hour}`;


/* the rules over a set of visits: { errs, dev (each device's line), text (the manifest this site gives) } */
function judge(runs, labels, oldLabels) {
  const errs = [], ids = [...new Set(runs.map((x) => x.v.dev.id))];
  // rule 1a: within a device, every visit compiles the same programs, byte for byte
  for (const id of ids) {
    const rs = runs.filter((x) => x.v.dev.id === id), a = rs[0];
    for (const b of rs.slice(1)) {
      const sa = a.r.shaders.slice().sort(), sb = b.r.shaders.slice().sort();
      if (sa.length === sb.length && sa.every((s, i) => s === sb[i]) && a.P.length === b.P.length) continue;
      let told = 0;
      for (let i = 0; i < Math.max(a.P.length, b.P.length) && told < 6; i++) {
        const p = a.P[i], q = labels && p ? b.P.find((x) => x.name === p.name) : b.P[i];
        const who = (p && p.name) || (q && q.name) || 'program ' + (i + 1);
        if (!p || !q) { errs.push(`${id}: ${who} is compiled in ${p ? tagOf(a.v) : tagOf(b.v)} but not in ${p ? tagOf(b.v) : tagOf(a.v)}`); told++; continue; }
        if (p.vs !== q.vs) { errs.push(`${id}: ${who}'s vertex source differs between visits (${tagOf(a.v)} | ${tagOf(b.v)}): ${firstDiff(p.vs, q.vs)}`); told++; }
        if (p.fs !== q.fs) { errs.push(`${id}: ${who}'s fragment source differs between visits (${tagOf(a.v)} | ${tagOf(b.v)}): ${firstDiff(p.fs, q.fs)}`); told++; }
      }
      if (!told) errs.push(`${id}: the visits ${tagOf(a.v)} and ${tagOf(b.v)} hand shaderSource different sources (${sa.length} against ${sb.length})`);
    }
  }
  // rule 1b: across devices only the #define lines after #version differ (every device's programs are the reference's)
  const ref = runs[0], refBodies = new Set(ref.P.map((p) => p.bv + '\u0000' + p.bf)), dev = {};
  for (const id of ids) {
    const x = runs.find((y) => y.v.dev.id === id), defs = new Map();
    for (const p of x.P) {
      defs.set(p.defs, (defs.get(p.defs) || 0) + 1);
      if (!refBodies.has(p.bv + '\u0000' + p.bf)) {
        const near = p.name && ref.P.find((q) => q.name === p.name);
        errs.push(`${id}: ${p.name || 'a program'} is not the reference's (${ref.v.dev.id}) but for its #define lines` + (near ? ': ' + (near.bv !== p.bv ? 'vertex ' + firstDiff(near.bv, p.bv) : 'fragment ' + firstDiff(near.bf, p.bf)) : ''));
      }
    }
    dev[id] = `device ${id} ${x.P.length} ` + [...defs].sort().map(([d, n]) => `${d === '|' ? '-' : d}:${n}`).join(' ');
  }
  // the manifest this site gives: the reference's programs, then each device's count and defines
  const progs = ref.P.map((p) => `program ${p.name || oldLabels.get(sha(p.vs) + ' ' + sha(p.fs)) || 'program.' + sha(p.vs + p.fs).slice(0, 8)} vs ${sha(p.vs)} ${p.vs.length} fs ${sha(p.fs)} ${p.fs.length}`).sort();
  const text = HEADER.concat(progs, ids.map((id) => dev[id])).join('\n') + '\n';
  return { errs, dev, ids, text, nprog: progs.length };
}
const HEADER = ['# glsl_manifest.txt: every program the world compiles on the reference device (a desktop Chrome with float targets), as',
  '# .github/workflows/glsl_guard.js finds it: "program <label> vs <sha256/24> <bytes> fs <sha256/24> <bytes>"; then each device the',
  '# guard runs: "device <id> <programs> <vertex|fragment #defines>:<count> ...". CI fails when this is not what the site compiles.',
  '# A change to any program\'s text comes with its lines here, in the same commit. After a deliberate change, regenerate it:',
  '#   node .github/workflows/glsl_guard.js site --write .github/workflows/glsl_manifest.txt'];
/* the manifest against the one committed: [] when they agree, else the problems (programs matched by their hashes) */
function compare(old, text) {
  const lines = (s) => s.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const want = lines(old), got = lines(text), key = (l) => l.startsWith('program ') ? l.replace(/^program \S+ /, 'program ') : l;
  const wk = new Set(want.map(key)), gk = new Set(got.map(key)), out = [];
  for (const l of got) if (!wk.has(key(l))) out.push('the site compiles a program (or a device compiles a set) the manifest does not list: ' + l);
  for (const l of want) if (!gk.has(key(l))) out.push('the manifest lists a program (or a device\'s set) the site no longer compiles: ' + l);
  if (!out.length && want.length !== got.length) out.push(`the manifest has ${want.length} lines, the site gives ${got.length} (a line listed twice?)`);
  return out;
}
/* the guard's own proof (--selftest, as CI runs it): the same visits with a fault planted in what the fake recorded;
   each must fail. A per-visit literal (a constant from the visit's entropy in one fragment source), a per-window one
   (the window's width), and one program's text changed on every visit alike (the manifest must catch it). Each is
   judged on what it adds to the run as it is (a site that already fails still proves the guard catches the plant) */
function selftest(runs, labels, oldLabels, text) {
  const target = runs[0].P[0].bf;   // (the reference's first program, planted in each device's own copy of it)
  const plant = (f) => runs.map(({ v, r, P }) => {
    const P2 = P.map((p) => p.bf === target ? Object.assign({}, p, { fs: f(p.fs, v), bf: f(p.bf, v) }) : p), was = new Map();
    P.forEach((p, k) => { if (P2[k] !== p) was.set('FRAGMENT_SHADER\n' + p.fs, 'FRAGMENT_SHADER\n' + P2[k].fs); });
    return { v, P: P2, r: Object.assign({}, r, { shaders: r.shaders.map((x) => was.has(x) ? was.get(x) : x) }) };
  });
  const after = (s, x) => s.replace(VER, VER + x);
  const res = [];
  const hit = (J, nm) => J.errs.find((e) => /only its numbers differ/.test(e) && e.includes(nm));
  const a = judge(plant((s, v) => after(s, `const float GG_SELFTEST_SEED = ${v.seed % 9973}.0;\n`)), labels, oldLabels);
  res.push(['a per-visit literal', !!hit(a, 'GG_SELFTEST_SEED'), hit(a, 'GG_SELFTEST_SEED') || a.errs[0]]);
  const b = judge(plant((s, v) => after(s, `const float GG_SELFTEST_WIN = ${v.w}.0;\n`)), labels, oldLabels);
  res.push(['a per-window literal', !!hit(b, 'GG_SELFTEST_WIN'), hit(b, 'GG_SELFTEST_WIN') || b.errs[0]]);
  const c = judge(plant((s) => s + '\n// (selftest: one program\'s text changed)\n'), labels, oldLabels);
  const cm = compare(text, c.text);   // (against the manifest of the run as it is: one line gone, one new)
  res.push(['one program changed, its manifest line not', cm.length === 2 && c.errs.length === judge(runs, labels, oldLabels).errs.length, cm[0] || c.errs[0]]);
  return res;
}

(async () => {
  const scripts = scriptsOf(SITE), page = loadScripts(SITE, scripts), VS = visits(), t0 = Date.now();
  console.log(`glsl_guard: ${SITE}: the page runs ${scripts.join(', ')}; labels ${page.labels ? "from the world's compile()" : 'not shown by the source (minified?): programs matched by hash only'}`);
  const runs = [];
  for (const v of VS) {
    const r = await run(v, page), P = label(r, page.labels);
    runs.push({ v, r, P });
    console.log(`  visit ${tagOf(v)}: ${r.frames} frames, ${r.shown ? 'shown' : 'NOT SHOWN'}, ${r.programs.length} programs, ${r.shaders.length} sources${r.errors.length ? ', ' + r.errors.length + ' page errors' : ''}`);
    for (const e of r.errors.slice(0, 3)) console.log('    page error: ' + e);
  }
  const t = () => ((Date.now() - t0) / 1000).toFixed(1) + ' s';
  // the fake must bring the world to its show (else what the page compiles later was never seen)
  const unshown = runs.filter((x) => !x.r.shown || !x.r.programs.length);
  if (unshown.length) {
    for (const x of unshown) console.log(`::error::the fake browser did not bring the world to its show (${tagOf(x.v)}: ${x.r.programs.length} programs; page errors: ${x.r.errors.slice(0, 2).join(' / ') || 'none'})`);
    console.log('glsl_guard: cannot judge (exit 3): extend the fake browser for what the page now needs; never relax the rules');
    process.exit(3);
  }
  const mf = A.manifest || A.write, old = mf && fs.existsSync(mf) ? fs.readFileSync(mf, 'utf8') : null;
  const oldLabels = new Map();
  if (old) for (const L of old.split('\n')) { const m = /^program (\S+) vs (\w+) \d+ fs (\w+) \d+$/.exec(L.trim()); if (m) oldLabels.set(m[2] + ' ' + m[3], m[1]); }
  if (A.reduced) {   // (RULES.json reduced-motion-still: one still frame; after its 0.1 s of redraws (sky.v2's rule for WebKit) the loop stops, and a drag starts nothing)
    const r = runs[0].r, lim = r.shownF + Math.ceil(0.1 * runs[0].v.hz) + 2, bad = [];
    if (!r.shown) bad.push('the still frame never showed');
    if (r.lastRafF > lim) bad.push(`a frame was still asked for at frame ${r.lastRafF} (shown at ${r.shownF}; the loop must stop by ${lim}, and stay stopped after the drag at ${r.shownF + 60})`);
    if (r.lastDrawF > lim) bad.push(`the page drew at frame ${r.lastDrawF} (shown at ${r.shownF}; nothing after ${lim})`);
    if (r.errors.length) bad.push('page errors: ' + r.errors.slice(0, 2).join(' / '));
    for (const b of bad) console.log('::error::reduced motion: ' + b);
    if (!bad.length) console.log(`reduced motion: one still frame (shown at frame ${r.shownF}, the last frame asked ${r.lastRafF}, the last draw ${r.lastDrawF}; ${r.frames} frames run, a drag at ${r.shownF + 60} inert)`);
    process.exit(bad.length ? 1 : 0);
  }
  if (A.first) {   // (dev-speed: shaders.mjs's one visit, dumped; nothing judged)
  if (A.dump) { fs.mkdirSync(A.dump, { recursive: true }); for (const { v, P } of runs) P.forEach((p, j) => { const b = path.join(A.dump, `${v.dev.id}${v.n}_${String(j).padStart(2, '0')}_${(p.name || 'p').replace(/[^\w.-]/g, '_')}`); fs.writeFileSync(b + '.vert', p.vs); fs.writeFileSync(b + '.frag', p.fs); }); }
    process.exit(runs.length === 1 && runs[0].P.length ? 0 : 1);
  }
  const J = judge(runs, page.labels, oldLabels);
  const fails = J.errs.slice();
  if (A.manifest) { if (old === null) fails.push(`no manifest at ${A.manifest}: write it with --write and commit it`); else fails.push(...compare(old, J.text)); }
  let proof = null;
  if (A.selftest) proof = selftest(runs, page.labels, oldLabels, J.text);
  if (A.json) fs.writeFileSync(A.json, JSON.stringify({ site: SITE, scripts, labels: page.labels, errors: fails, selftest: proof, manifest: J.text,
    visits: runs.map(({ v, r, P }) => ({ visit: tagOf(v), seed: v.seed, frames: r.frames, shown: r.shown, pageErrors: r.errors, programs: P.map((p) => ({ name: p.name, vs: sha(p.vs), vl: p.vs.length, fs: sha(p.fs), fl: p.fs.length, defs: p.defs })) })) }, null, 1));
  if (A.dump) { fs.mkdirSync(A.dump, { recursive: true }); for (const { v, P } of runs) P.forEach((p, j) => { const b = path.join(A.dump, `${v.dev.id}${v.n}_${String(j).padStart(2, '0')}_${(p.name || 'p').replace(/[^\w.-]/g, '_')}`); fs.writeFileSync(b + '.vert', p.vs); fs.writeFileSync(b + '.frag', p.fs); }); }
  let bad = fails.length;
  if (proof) for (const [what, ok, why] of proof) { console.log(`  selftest: ${what}: ${ok ? 'caught' : 'NOT CAUGHT'}${why ? ' (' + String(why).slice(0, 160) + ')' : ''}`); if (!ok) { console.log(`::error::the guard no longer catches ${what}`); bad++; } }
  for (const e of fails) console.log('::error::' + e);
  if (J.errs.length) console.log(`glsl_guard: FAIL: ${J.errs.length} GLSL source(s) not the same on every visit of a device: each misses Chrome's shader cache on every return (${t()})`);
  else console.log(`glsl_guard: every visit of each device compiles the same sources (${runs.length} visits; ${J.ids.map((id) => J.dev[id].replace('device ', '')).join('; ')})`);
  if (A.manifest && old !== null) console.log(fails.length > J.errs.length ? `glsl_guard: FAIL: the manifest is not what the site compiles: a change to a program's text comes with its manifest lines in the same commit (node .github/workflows/glsl_guard.js site --write ${A.manifest}) (${t()})`
    : `glsl_guard: the manifest is what the site compiles (${J.nprog} programs, ${J.ids.length} devices) (${t()})`);
  if (A.write) {
    if (J.errs.length) { console.log(`glsl_guard: not written: fix the sources first (${A.write})`); process.exit(1); }
    fs.writeFileSync(A.write, J.text); console.log(`glsl_guard: wrote ${A.write} (${J.nprog} programs, ${J.ids.length} devices) (${t()})`);
  }
  process.exit(bad ? 1 : 0);
})();
