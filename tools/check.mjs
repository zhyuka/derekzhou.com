// check.mjs: every static check, from one command (CI's validate job runs exactly this).
//   node tools/check.mjs              build once (tools/checks/00-*, 01-*, in order), then every other check in parallel
//   node tools/check.mjs --fast       no site build: src/ assembled, check-quick.mjs, then the checks marked "kind: fast"
//   node tools/check.mjs --only a,b   just these checks (by slug: 21-absences or absences), after the build
//   node tools/check.mjs --no-build   skip the build (build/site and build/src are already made)
//   node tools/check.mjs --scheduled  build once, then only the checks marked "kind: schedule" (weekly: scheduled.yml)
//   node tools/check.mjs --list       the checks and their kinds
//   node tools/check.mjs --shard i/n  the build, then only shard i's share of the checks (0 <= i < n; CI's validate job
//                                     runs n of these side by side, one a runner). The share: tools/checks/costs.json's
//                                     seconds a check (a hosted run's; a check it lacks counts 10 s), longest first, each
//                                     to the shard with the least so far, so every shard computes the same split.
//                                     With --prove, only the plants of the shard's checks. --shards n: the split, printed.
//   node tools/check.mjs --prove [--changed FILE [--base SHA]] [--dry]   (--dry: the plants it would run, listed, none run)
//                                     each check with a failure planted must fail: a check's plants are its own `# plant: {json}`
//                                     lines, and the `// plant: {json}` lines of the files its `# plants-also: dir/*.ext` names
//                                     (the unit check: test/unit/*.mjs), so two PRs that add a check or a test never share a file.
//                                     --changed FILE (the gate: a PR's changed paths, one a line): only the plants a change
//                                     can break: those written in a changed file, and every plant of a check whose script, or a
//                                     tools/checks/lib/ file it names, changed. The whole set: weekly (scheduled.yml), ~8 min.
// Each check is tools/checks/NN-slug.sh, run from the repository's root in bash -eo pipefail, with RUNNER_TEMP its own
// folder (build/.check/<slug>), so checks that run side by side never share a scratch file. A check's output is shown
// whole when it fails, its last line when it passes. A check marked `# alone: <why>` (it measures time: a sound's start,
// a first paint) runs after the others, one at a time, so the checks beside it never slow what it measures (2026-11-23:
// on a 4-core hosted runner 38-sound started 0 notes by 4 s with 34 checks beside it, and 6 on the PC).
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawn, spawnSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url'; import crypto from 'node:crypto';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'tools/checks'), TMP = path.join(ROOT, 'build/.check');
const argv = process.argv.slice(2), has = (f) => argv.includes(f), val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const all = fs.readdirSync(DIR).filter((f) => /^\d\d-[\w-]+\.sh$/.test(f)).sort().map((f) => {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  return { file: f, slug: f.replace(/\.sh$/, ''), name: (src.match(/^# check: (.*)$/m) || [])[1] || f, kind: (src.match(/^# kind: (\w+)$/m) || [])[1] || '', alone: /^# alone: /m.test(src), apart: ((src.match(/^# apart: ([\w -]+?)\s*(?:\(|$)/m) || [])[1] || '').split(/\s+/).filter(Boolean), parts: +((src.match(/^# parts: (\d+)$/m) || [])[1] || 1), inputs: ((src.match(/^# inputs: (.+)$/m) || [])[1] || '').split(/\s+/).filter(Boolean) };
});
// (2026-11-24) a check marked `# parts: N` runs on a push as N checks, slug#0 .. slug#N-1, each with CHECK_PART=i/N, so
// the shards can take its parts side by side (35-birds: 177 s, the gate's long pole on a shard of its own). Its plants
// (--prove) and --only run it whole.
const expand = (list) => list.flatMap((c) => (c.parts > 1 ? Array.from({ length: c.parts }, (_, i) => Object.assign({}, c, { slug: c.slug + '#' + i, base: c.slug, part: i })) : [c]));
const build = all.filter((c) => c.kind === 'build'), rest = expand(all.filter((c) => c.kind !== 'build' && c.kind !== 'schedule')), sched = all.filter((c) => c.kind === 'schedule');

// bash and python3 as CI has them: on Windows, Git's bash (System32's is WSL's) and python3 as `python`
let BASH = 'bash'; const env = Object.assign({}, process.env);
if (process.platform === 'win32') {
  for (const b of ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files (x86)/Git/bin/bash.exe']) if (fs.existsSync(b)) { BASH = b; break; }
  if (!env.LC_ALL) env.LC_ALL = 'C.UTF-8';   // (Git Bash's grep -P wants a UTF-8 locale: security.txt's check)
  if (spawnSync('python3 -c 1', { shell: true }).status !== 0) {
    const shim = path.join(TMP, '_bin'); fs.mkdirSync(shim, { recursive: true });
    fs.writeFileSync(path.join(shim, 'python3'), '#!/bin/sh\nexec python "$@"\n', { mode: 0o755 });
    env.PATH = shim + path.delimiter + env.PATH;
  }
}
function run(c, extraEnv) {
  const tmp = path.join(TMP, c.slug); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  const t0 = Date.now();
  return new Promise((res) => {
    const p = spawn(BASH, ['-eo', 'pipefail', path.join(DIR, c.file)], { cwd: ROOT, env: Object.assign({}, env, { RUNNER_TEMP: tmp }, c.part !== undefined ? { CHECK_PART: `${c.part}/${c.parts}` } : {}, extraEnv || {}) });
    let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => res({ c, ok: code === 0, code, out, s: (Date.now() - t0) / 1000 }));
  });
}
// (CI lane, 2026-11-25, the hub's gate p90) a check marked `# inputs: GLOB ...` reads nothing but those files: its node
// processes run with tools/checks/lib/reads.mjs preloaded, and a run that read a file in the repository no glob matches
// fails, wherever it runs. Its key is the sha256 of its own script, this file, the preload, its part and every tracked
// file the globs match (path and bytes). With CHECK_CACHE (a branch's gate: main's results restored there) a check whose
// key is the one main passed on is not run again; with CHECK_CACHE_SAVE (main's gate) a pass writes its key there.
const READS = path.join(DIR, 'lib/reads.mjs'), CACHE = env.CHECK_CACHE ? path.resolve(ROOT, env.CHECK_CACHE) : null, CACHE_SAVE = env.CHECK_CACHE_SAVE ? path.resolve(ROOT, env.CHECK_CACHE_SAVE) : null;
const globRe = (g) => new RegExp('^' + g.split('**').map((x) => x.split('*').map((y) => y.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*') + '$');
let TRACKED = null; const tracked = () => TRACKED || (TRACKED = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).stdout.split('\0').filter(Boolean));
function inputsOf(c) { const res = c.inputs.map(globRe); return tracked().filter((f) => res.some((r) => r.test(f))).sort(); }
function inputsKey(c) {
  const h = crypto.createHash('sha256');
  for (const f of [path.join(DIR, c.file), fileURLToPath(import.meta.url), READS]) h.update(fs.readFileSync(f)).update('\0');
  h.update(String(c.part ?? '') + '/' + String(c.parts) + '\0');
  for (const f of inputsOf(c)) h.update(f + '\0').update(fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f)) : '(gone)').update('\0');
  return h.digest('hex');
}
// the paths a run read that its inputs do not cover (the check's own scratch under build/, node_modules (package-lock
// is an input where it matters), .git, and the check's own machinery aside)
function strayReads(c, dir) {
  const ins = inputsOf(c), res = c.inputs.map(globRe), out = new Set();
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) for (const a of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    const rel = path.relative(ROOT, a).split(path.sep).join('/');
    if (!a || rel.startsWith('..') || path.isAbsolute(rel) || rel === '' || /^(build|node_modules|\.git)(\/|$)/.test(rel)) continue;
    if (rel === 'tools/checks/' + c.file || rel === 'tools/checks/lib/reads.mjs' || rel === 'tools/checks' || rel === 'tools' || rel === 'tools/checks/lib') continue;
    if (res.some((r) => r.test(rel)) || ins.some((f) => f.startsWith(rel + '/'))) continue;   // (a file it declares, or a folder holding one)
    out.add(rel);
  }
  return [...out].sort();
}
async function runChecked(c) {
  if (!c.inputs.length) return run(c);
  const key = inputsKey(c), kf = (d) => path.join(d, c.slug.replace('#', '.') + '.key');
  if (CACHE && fs.existsSync(kf(CACHE)) && fs.readFileSync(kf(CACHE), 'utf8').trim() === key) return { c, ok: true, code: 0, out: `cached: main's gate passed it on these very inputs (${inputsOf(c).length} files, key ${key.slice(0, 12)})`, s: 0 };
  const reads = path.join(TMP, '_reads', c.slug); fs.rmSync(reads, { recursive: true, force: true }); fs.mkdirSync(reads, { recursive: true });
  const r = await run(c, { NODE_OPTIONS: ((env.NODE_OPTIONS || '') + ' --import ' + pathToFileURL(READS).href).trim(), CHECK_READS: reads });
  const stray = strayReads(c, reads);
  if (stray.length) { r.ok = false; r.out += `\n::error::${c.slug} read ${stray.length} file(s) its # inputs do not name (its result could be reused when they change): ${stray.slice(0, 20).join(', ')}`; }
  if (r.ok && CACHE_SAVE) { fs.mkdirSync(CACHE_SAVE, { recursive: true }); fs.writeFileSync(kf(CACHE_SAVE), key + '\n'); }
  return r;
}
function report(r, quiet) {
  const last = r.out.trim().split('\n').filter(Boolean).pop() || '';
  console.log((r.ok ? 'ok  ' : 'FAIL') + ' ' + r.c.slug.padEnd(20) + (r.s.toFixed(1) + ' s').padStart(8) + '  ' + (r.ok ? last.slice(0, 100) : ''));
  if (!r.ok && !quiet) console.log(r.out.trim().split('\n').map((l) => '     | ' + l).join('\n'));
}
async function pool(list, n, extraEnv, quiet) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const c = list[i++]; const r = extraEnv ? await run(c, extraEnv) : await runChecked(c); report(r, quiet); out.push(r); } }));
  return out;
}
const pick = (names) => names.split(',').map((n) => { const c = all.find((x) => x.slug === n || x.slug.replace(/^\d\d-/, '') === n) || rest.find((x) => x.slug === n); if (!c) { console.error('no check ' + n); process.exit(2); } return c; });
// (2026-11-24) a write to a pipe that does not fit at once is queued, and process.exit() drops the queue: on a busy runner
// Linux gives a new pipe one 4 KB page (pipe-user-pages-soft), so main's gate 45405600566, twice, got check-shards.mjs's
// --prove --dry list without its end (24 KB; the birds plants, about line 220, never arrived). Every exit after output
// waits for stdout and stderr to drain first.
const done = async (code) => { await new Promise((r) => process.stdout.write('', r)); await new Promise((r) => process.stderr.write('', r)); process.exit(code); };
const N = Math.max(2, Math.min(os.cpus().length, 8));
// the shards (CI's validate matrix): a fixed split by recorded cost, so each runner takes its share and no other
function split(list, n) {
  let cost = {}; try { cost = JSON.parse(fs.readFileSync(path.join(DIR, 'costs.json'), 'utf8')); } catch (e) { /* every check 10 s */ }
  const of = (c) => (typeof cost[c.slug] === 'number' ? cost[c.slug] : 10);
  // (2026-11-25) a check marked `# apart: <check> ...` never shares a shard with those checks (any of their parts), either
  // way round, wherever there is a shard free of them: 24-unit beside 35-birds' 20 processes took 119 s, not 22, and
  // 13-rules-data's hook timing failed there. The least-loaded shard that keeps them apart, else the least-loaded.
  const load = Array(n).fill(0), at = new Map(), on = Array.from({ length: n }, () => []), base = (c) => c.base || c.slug;
  const clash = (c, d) => (c.part !== undefined && base(c) === base(d)) || c.apart.includes(base(d)) || d.apart.includes(base(c));   // (a parted check's parts always apart: one a shard)
  // (2026-11-25) the most kept apart placed first (the longest `# apart:` list), then by cost, longest first: placed by
  // cost alone, 43-dune-census took the second shard free of 35-birds before 24-unit's parts came, and a part shared it
  const ties = (c) => c.apart.length + (c.part !== undefined ? 1 : 0);   // (how kept apart: its list, and its own other parts)
  for (const c of [...list].sort((a, b) => ties(b) - ties(a) || of(b) - of(a) || (a.slug < b.slug ? -1 : 1))) {
    let k = -1; for (let j = 0; j < n; j++) if (!on[j].some((d) => clash(c, d)) && (k < 0 || load[j] < load[k])) k = j;
    if (k < 0) { k = 0; for (let j = 1; j < n; j++) if (load[j] < load[k]) k = j; }
    load[k] += of(c); at.set(c.slug, k); on[k].push(c);
  }
  return { at, load };
}
const SH = val('--shard') ? val('--shard').split('/').map(Number) : null;
if (SH && !(SH.length === 2 && Number.isInteger(SH[0]) && Number.isInteger(SH[1]) && SH[1] >= 1 && SH[0] >= 0 && SH[0] < SH[1])) { console.error('--shard i/n: 0 <= i < n'); process.exit(2); }
const inShard = (slug) => !SH || split(rest, SH[1]).at.get(slug) === SH[0];
// --cache-key (with --shard): one key for the shard's checks that declare inputs, for the gate's cache of main's passes
// (validate.yml): "none" when the shard has none
if (has('--cache-key')) { const cs = (SH ? rest.filter((c) => inShard(c.slug)) : rest).filter((c) => c.inputs.length); console.log(cs.length ? crypto.createHash('sha256').update(cs.map((c) => c.slug + ':' + inputsKey(c)).join('\n')).digest('hex').slice(0, 32) : 'none'); await done(0); }
// --cache-keys: each check's key that declares inputs; --strays SLUG DIR: the paths in DIR's read lists its inputs miss (tests)
if (has('--cache-keys')) { for (const c of rest.filter((c) => c.inputs.length)) console.log(c.slug + ' ' + inputsKey(c)); await done(0); }
if (has('--strays')) { const c = rest.find((x) => x.slug === val('--strays')) || all.find((x) => x.slug === val('--strays')); for (const f of strayReads(c, argv[argv.indexOf('--strays') + 2])) console.log(f); await done(0); }
if (has('--list')) { for (const c of (SH ? rest.filter((c) => inShard(c.slug)) : [...build, ...rest, ...sched])) console.log(c.slug.padEnd(20) + (c.kind || '').padEnd(9) + c.name); await done(0); }   // (with --shard: that shard's checks)
if (val('--shards')) {
  const n = Number(val('--shards')), { at, load } = split(rest, n);
  for (let k = 0; k < n; k++) console.log(`shard ${k}/${n}  ${load[k].toFixed(0).padStart(4)} s  ` + rest.filter((c) => at.get(c.slug) === k).map((c) => c.slug).join(' '));
  await done(0);
}
const t0 = Date.now();
let results = [];

if (has('--prove')) {
  // each plant: one file changed (or made) for one check's run, then put back; the check must fail (or, expect "pass",
  // must pass). A check marked self has its own planted failures in its own run
  const P = []; let bad = 0;
  const lines = (f, mark) => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => l.startsWith(mark)).map((l) => l.slice(mark.length));
  for (const c of all) {
    const f = path.join(DIR, c.file), also = (fs.readFileSync(f, 'utf8').match(/^# plants-also: (\S+)$/m) || [])[1];
    const from = [[f, '# plant: ']];
    if (also) { const d = path.join(ROOT, path.dirname(also)), ext = path.extname(also); for (const g of fs.readdirSync(d).filter((x) => x.endsWith(ext)).sort()) from.push([path.join(d, g), '// plant: ']); }
    for (const [g, mark] of from) for (const j of lines(g, mark)) {
      try { P.push(Object.assign(JSON.parse(j), { check: c.slug, at: path.relative(ROOT, g), line: j })); } catch (e) { console.log('FAIL   ' + path.relative(ROOT, g) + ': a plant line that is not JSON: ' + j.slice(0, 80)); bad = 1; }
    }
  }
  let todo = P;
  if (val('--changed')) {
    const ch = new Set(fs.readFileSync(val('--changed'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
    const libs = [...ch].filter((f) => f.startsWith('tools/checks/lib/')).map((f) => path.basename(f));
    // --base SHA (the gate: the merge base): a changed file whose only change is to its plant lines (a PR adding a plant)
    // runs only its new or changed plants, and a check whose script changed only so keeps its other plants unrun. Any
    // other change to the file, every plant in it; to a check's script (or a lib it names), every plant of the check.
    // (2026-11-24: a PR adding one plant to 35-birds.sh re-ran all 13, each the 55 bird tests: 49 minutes.)
    const base = val('--base'), marks = { '.sh': '# plant: ', '.mjs': '// plant: ', '.js': '// plant: ' };
    const fresh = new Map();   // rel -> the plant lines new at this head (only for a file whose other lines are the base's)
    if (base && /^[0-9a-f]{7,40}$/.test(base)) for (const rel of ch) {
      const mark = marks[path.extname(rel)]; if (!mark || !fs.existsSync(path.join(ROOT, rel))) continue;
      let old; try { old = spawnSync('git', ['show', `${base}:${rel}`], { cwd: ROOT, encoding: 'utf8' }); } catch (e) { continue; }
      if (old.status !== 0) continue;   // (a new file: every plant in it)
      const now = fs.readFileSync(path.join(ROOT, rel), 'utf8'), rest = (t) => t.split(/\r?\n/).filter((l) => !l.startsWith(mark)).join('\n');
      if (rest(old.stdout) !== rest(now)) continue;
      const had = new Set(old.stdout.split(/\r?\n/).filter((l) => l.startsWith(mark)).map((l) => l.slice(mark.length)));
      fresh.set(rel, new Set(now.split(/\r?\n/).filter((l) => l.startsWith(mark)).map((l) => l.slice(mark.length)).filter((l) => !had.has(l))));
    }
    const whole = new Set(all.filter((c) => { const t = 'tools/checks/' + c.file; return (ch.has(t) && !fresh.has(t)) || libs.some((b) => fs.readFileSync(path.join(DIR, c.file), 'utf8').includes(b)); }).map((c) => c.slug));
    todo = P.filter((p) => whole.has(p.check) || (ch.has(p.at) && (!fresh.has(p.at) || fresh.get(p.at).has(p.line))));
    if (fresh.size) console.log(`--base: ${fresh.size} changed file(s) changed only in their plant lines: their ${[...fresh.values()].reduce((n, x) => n + x.size, 0)} new plant(s) run, not the rest`);
    console.log(`--changed: ${ch.size} path(s); ${todo.length} of ${P.length} plants a change there can break` + (whole.size ? ` (every plant of ${[...whole].join(', ')})` : ''));
  }
  // (sharded: every shard holds the whole checkout and builds the site before its plants, so the plants a change selects
  // are dealt out in turn, each to one shard, whatever its check: 2026-11-24, a branch changing test/unit/sky.mjs ran its
  // 31 plants, 25 s each, on the one shard of 24-unit for 13 minutes while the other four sat idle)
  if (SH) todo = todo.filter((p, i) => i % SH[1] === SH[0]);
  if (has('--dry')) { for (const p of todo) console.log('would  ' + p.check.padEnd(20) + ' ' + p.why); await done(bad); }   // (the plants it would run, none run)
  if (todo.length) for (const c of build) { const r = await run(c); report(r); if (!r.ok) process.exit(1); }
  for (const p of todo) {
    const c = pick(p.check)[0];
    if (p.self) { console.log('self   ' + c.slug.padEnd(20) + ' ' + p.why); continue; }
    const f = path.join(ROOT, p.file || p.create), keep = p.create ? null : fs.readFileSync(f);
    if (keep && !keep.toString('utf8').includes(p.find)) { console.log('FAIL   ' + c.slug.padEnd(20) + ' the plant\'s text is not in ' + p.file); bad = 1; continue; }
    fs.writeFileSync(f, keep ? keep.toString('utf8').replace(p.find, p.with) : 'planted\n');
    // (CHECK_PLANT_AT: the file the plant is written in; 24-unit.sh then runs only that area file)
    let r; try { if (p.rebuild) for (const b of build) await run(b); r = await run(c, { CHECK_PLANT_AT: p.at }); } finally { if (keep) fs.writeFileSync(f, keep); else fs.rmSync(f); }
    if (p.rebuild) for (const b of build) await run(b);   // (a source plant: the build made from it, then made again from the source put back)
    if (r.ok && /skipped here/.test(r.out)) { console.log('skip   ' + c.slug.padEnd(20) + ' ' + p.why + ' (the check does not run on this machine)'); continue; }
    const want = p.expect === 'pass', ok = r.ok === want;
    console.log((ok ? (want ? 'passes ' : 'caught ') : (want ? 'FAILED ' : 'MISSED ')) + c.slug.padEnd(20) + ' ' + p.why);
    if (!ok) { bad = 1; console.log(r.out.trim().split('\n').slice(-6).map((l) => '     | ' + l).join('\n')); }
  }
  const unproved = SH && SH[0] !== 0 ? [] : rest.concat(sched).filter((c) => !P.some((p) => p.check === (c.base || c.slug))).map((c) => c.base || c.slug).filter((x, i, a) => a.indexOf(x) === i);   // (sharded: shard 0 says it, once)   // (every check, --changed or not: a new check without a plant fails its own PR)
  if (unproved.length) { console.log('no plant: ' + unproved.join(', ')); bad = 1; }
  await done(bad);
}
if (has('--fast')) {
  results.push(...await pool([build.find((c) => /assemble/.test(c.slug))], 1));
  const quick = new Promise((res) => {   // (check-speed: check-quick side by side with the fast checks)
    const t0 = Date.now(), p = spawn(process.execPath, [path.join(ROOT, 'tools/check-quick.mjs')], { cwd: ROOT }); let out = '';
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => { const r = { c: { slug: 'check-quick' }, ok: code === 0, out, s: (Date.now() - t0) / 1000 }; report(r); res(r); });
  });
  const [fq, fr] = await Promise.all([quick, pool(rest.filter((c) => c.kind === 'fast'), N)]);
  results.push(fq, ...fr);
} else {
  if (!has('--no-build')) for (const c of build) { const r = await run(c); report(r); results.push(r); if (!r.ok) break; }
  if (results.every((r) => r.ok)) {
    const list = val('--only') ? pick(val('--only')) : has('--scheduled') ? sched : rest.filter((c) => inShard(c.slug));
    results.push(...await pool(list.filter((c) => !c.alone), N));
    results.push(...await pool(list.filter((c) => c.alone), 1));   // (after the others, one at a time: they measure time)
  }
}
const failed = results.filter((r) => !r.ok);
console.log((failed.length ? failed.length + ' of ' + results.length + ' checks failed: ' + failed.map((r) => r.c.slug).join(', ') : 'all ' + results.length + ' checks pass') + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
await done(failed.length ? 1 : 0);
