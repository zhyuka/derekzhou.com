// check.mjs: every static check, from one command (CI's validate job runs exactly this).
//   node tools/check.mjs              build once (tools/checks/00-*, 01-*, in order), then every other check in parallel
//   node tools/check.mjs --fast       no site build: src/ assembled, check-quick.mjs, then the checks marked "kind: fast"
//   node tools/check.mjs --only a,b   just these checks (by slug: 21-absences or absences), after the build
//   node tools/check.mjs --no-build   skip the build (build/site and build/src are already made)
//   node tools/check.mjs --scheduled  build once, then only the checks marked "kind: schedule" (weekly: scheduled.yml)
//   node tools/check.mjs --list       the checks and their kinds
//   node tools/check.mjs --prove      each check with a failure planted must fail: a check's plants are its own `# plant: {json}`
//                                     lines, and the `// plant: {json}` lines of the files its `# plants-also: dir/*.ext` names
//                                     (the unit check: test/unit/*.mjs), so two PRs that add a check or a test never share a file
// Each check is tools/checks/NN-slug.sh, run from the repository's root in bash -eo pipefail, with RUNNER_TEMP its own
// folder (build/.check/<slug>), so checks that run side by side never share a scratch file. A check's output is shown
// whole when it fails, its last line when it passes.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawn, spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'tools/checks'), TMP = path.join(ROOT, 'build/.check');
const argv = process.argv.slice(2), has = (f) => argv.includes(f), val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const all = fs.readdirSync(DIR).filter((f) => /^\d\d-[\w-]+\.sh$/.test(f)).sort().map((f) => {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  return { file: f, slug: f.replace(/\.sh$/, ''), name: (src.match(/^# check: (.*)$/m) || [])[1] || f, kind: (src.match(/^# kind: (\w+)$/m) || [])[1] || '' };
});
const build = all.filter((c) => c.kind === 'build'), rest = all.filter((c) => c.kind !== 'build' && c.kind !== 'schedule'), sched = all.filter((c) => c.kind === 'schedule');

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
    const p = spawn(BASH, ['-eo', 'pipefail', path.join(DIR, c.file)], { cwd: ROOT, env: Object.assign({}, env, { RUNNER_TEMP: tmp }, extraEnv || {}) });
    let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => res({ c, ok: code === 0, code, out, s: (Date.now() - t0) / 1000 }));
  });
}
function report(r, quiet) {
  const last = r.out.trim().split('\n').filter(Boolean).pop() || '';
  console.log((r.ok ? 'ok  ' : 'FAIL') + ' ' + r.c.slug.padEnd(20) + (r.s.toFixed(1) + ' s').padStart(8) + '  ' + (r.ok ? last.slice(0, 100) : ''));
  if (!r.ok && !quiet) console.log(r.out.trim().split('\n').map((l) => '     | ' + l).join('\n'));
}
async function pool(list, n, extraEnv, quiet) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const c = list[i++]; const r = await run(c, extraEnv); report(r, quiet); out.push(r); } }));
  return out;
}
const pick = (names) => names.split(',').map((n) => { const c = all.find((x) => x.slug === n || x.slug.replace(/^\d\d-/, '') === n); if (!c) { console.error('no check ' + n); process.exit(2); } return c; });
const N = Math.max(2, Math.min(os.cpus().length, 8));
const t0 = Date.now();
let results = [];
if (has('--list')) { for (const c of all) console.log(c.slug.padEnd(20) + (c.kind || '').padEnd(9) + c.name); process.exit(0); }
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
      try { P.push(Object.assign(JSON.parse(j), { check: c.slug, at: path.relative(ROOT, g) })); } catch (e) { console.log('FAIL   ' + path.relative(ROOT, g) + ': a plant line that is not JSON: ' + j.slice(0, 80)); bad = 1; }
    }
  }
  for (const c of build) { const r = await run(c); report(r); if (!r.ok) process.exit(1); }
  for (const p of P) {
    const c = pick(p.check)[0];
    if (p.self) { console.log('self   ' + c.slug.padEnd(20) + ' ' + p.why); continue; }
    const f = path.join(ROOT, p.file || p.create), keep = p.create ? null : fs.readFileSync(f);
    if (keep && !keep.toString('utf8').includes(p.find)) { console.log('FAIL   ' + c.slug.padEnd(20) + ' the plant\'s text is not in ' + p.file); bad = 1; continue; }
    fs.writeFileSync(f, keep ? keep.toString('utf8').replace(p.find, p.with) : 'planted\n');
    let r; try { if (p.rebuild) for (const b of build) await run(b); r = await run(c); } finally { if (keep) fs.writeFileSync(f, keep); else fs.rmSync(f); }
    if (p.rebuild) for (const b of build) await run(b);   // (a source plant: the build made from it, then made again from the source put back)
    if (r.ok && /skipped here/.test(r.out)) { console.log('skip   ' + c.slug.padEnd(20) + ' ' + p.why + ' (the check does not run on this machine)'); continue; }
    const want = p.expect === 'pass', ok = r.ok === want;
    console.log((ok ? (want ? 'passes ' : 'caught ') : (want ? 'FAILED ' : 'MISSED ')) + c.slug.padEnd(20) + ' ' + p.why);
    if (!ok) { bad = 1; console.log(r.out.trim().split('\n').slice(-6).map((l) => '     | ' + l).join('\n')); }
  }
  const unproved = rest.concat(sched).filter((c) => !P.some((p) => p.check === c.slug)).map((c) => c.slug);
  if (unproved.length) { console.log('no plant: ' + unproved.join(', ')); bad = 1; }
  process.exit(bad);
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
  if (results.every((r) => r.ok)) results.push(...await pool(val('--only') ? pick(val('--only')) : has('--scheduled') ? sched : rest, N));
}
const failed = results.filter((r) => !r.ok);
console.log((failed.length ? failed.length + ' of ' + results.length + ' checks failed: ' + failed.map((r) => r.c.slug).join(', ') : 'all ' + results.length + ' checks pass') + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
process.exit(failed.length ? 1 : 0);
