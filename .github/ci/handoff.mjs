// handoff.mjs: the gate's jobs hand each other their files on the PC's own disk, not as GitHub artifacts (2026-11-15:
// the repository's artifact storage quota was hit and every gate's plan job failed uploading its two builds). Every
// job of the gate runs on the PC: the Linux runners in WSL and the Windows GPU runner see one folder,
// HANDOFF_ROOT (default /mnt/c/ci-handoff in WSL, C:\ci-handoff on Windows: the same folder).
//   node .github/ci/handoff.mjs put SRC NAME [--run R]   copy the folder SRC to ROOT/gate/R/NAME, with a sha256 manifest;
//                                                        the manifest's own sha256 goes to the step's outputs (sha=...)
//   node .github/ci/handoff.mjs get NAME DEST [--run R]  copy ROOT/gate/R/NAME to DEST (R's newest attempt that has it),
//                                                        every file checked against its manifest: a missing folder, file
//                                                        or byte fails, loudly. --pinned: HANDOFF_SHA (the putting job's
//                                                        output) must be the manifest's sha256 (below)
//   node .github/ci/handoff.mjs has NAME [--run R]       exit 0 when ROOT/gate/R/NAME is there (an optional hand-off)
//   node .github/ci/handoff.mjs drop [--run R]           delete every attempt of R's run (a green verdict, off main: a
//                                                        red one keeps its builds for a re-run, swept after 24 h)
//   node .github/ci/handoff.mjs sweep [--hours 24]       delete every ROOT/gate/* older than that (each gate's start)
//   node .github/ci/handoff.mjs selftest NAME [--run R]  the check proved on the real hand-off: a copy with one byte
//                                                        changed must be caught (every gate's plan job runs it)
//   node .github/ci/handoff.mjs verdict-put FILE         keep FILE as ROOT/verdict/<run id>-<attempt>.json (30 days): a
//                                                        record for people, which nothing reads or trusts (below)
// The trust line (the hub's review, 2026-11-16): the folder is shared by every job on the PC, and a PR's own build code
// runs in its plan job with it writable, so it could rewrite any run's files there, the manifest too. A GitHub artifact
// was scoped to its run; this folder is not. So what decides anything is never read from it alone: a reader of the
// builds or of T1's shards pins the manifest's sha256 to the putting job's output (GitHub keeps job outputs per run,
// out of reach of another run's code), and the verdict the merge bot and T2's probe trust is the gate-verdict artifact,
// never the PC's copy. (The Stills job, after a main gate, reads without a pin: a workflow_run cannot see the gate's job
// outputs. docs/deploy.md, "The hand-off".)
// R: <run id>-<attempt>, from GITHUB_RUN_ID and GITHUB_RUN_ATTEMPT. A job writes its own attempt's folder; a reader takes
// the newest attempt at or below its own that has the name (a re-run of failed jobs keeps the earlier attempt's plan).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';

export function root(env = process.env, platform = process.platform) {
  return env.HANDOFF_ROOT || (platform === 'win32' ? 'C:\\ci-handoff' : '/mnt/c/ci-handoff');
}
export const runKey = (env = process.env) => {
  if (!env.GITHUB_RUN_ID) throw new Error('handoff: no GITHUB_RUN_ID (and no --run)');
  return `${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT || 1}`;
};
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function walk(dir, rel = '', out = []) {
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) walk(dir, r, out); else if (e.isFile()) out.push(r);
  }
  return out;
}
// a plain copy, a folder and its files' bytes: Node's fs.cpSync (native since 22) and fs.copyFileSync carry modes over, and on the PC's
// /mnt/c (drvfs) that failed with EPERM on the first folder (2026-11-16, #321's first gate)
export function copy(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copy(s, d); else if (e.isFile()) fs.writeFileSync(d, fs.readFileSync(s));
  }
}
export function manifest(dir) { const m = {}; for (const f of walk(dir)) m[f] = sha(path.join(dir, f)); return m; }

export function put(src, name, base) {
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) throw new Error(`handoff put: ${src} is not a folder`);
  const dst = path.join(base, name), tmp = dst + '.part';
  fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  copy(src, tmp);
  const m = manifest(tmp);
  fs.writeFileSync(tmp + '.manifest.json', JSON.stringify(m));
  fs.renameSync(tmp, dst); fs.renameSync(tmp + '.manifest.json', dst + '.manifest.json');   // (a reader never sees half a hand-off)
  return Object.keys(m).length;
}
// every file of the manifest there, byte for byte, and nothing else: then the copy; else an Error naming the first misses
export function check(dir, m) {
  const bad = [], have = new Set(walk(dir));
  for (const [f, h] of Object.entries(m)) { if (!have.has(f)) bad.push('missing ' + f); else if (sha(path.join(dir, f)) !== h) bad.push('changed ' + f); }
  for (const f of have) if (!(f in m)) bad.push('not in the manifest ' + f);
  return bad;
}
export const manifestSha = (mf) => sha(mf);
export function get(name, dest, base, pin) {
  const src = path.join(base, name), mf = src + '.manifest.json';
  if (!fs.existsSync(src) || !fs.existsSync(mf)) throw new Error(`handoff get: ${src} is not there (its run's job did not hand it off, or it was swept)`);
  if (pin !== undefined) {
    if (!/^[0-9a-f]{64}$/.test(pin || '')) throw new Error(`handoff get: ${name} is pinned, but HANDOFF_SHA is not a sha256 ("${pin || ''}": the putting job's output is missing)`);
    if (sha(mf) !== pin) throw new Error(`handoff get: ${name}'s manifest is not the one its job handed off (sha256 ${sha(mf).slice(0, 12)}, the job's output ${pin.slice(0, 12)}): another run's code rewrote it`);
  }
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  fs.rmSync(dest, { recursive: true, force: true }); fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true });
  copy(src, dest);
  const bad = check(dest, m);
  if (bad.length) throw new Error(`handoff get: ${name} is not the bytes handed off (${bad.length}: ${bad.slice(0, 5).join('; ')})`);
  return Object.keys(m).length;
}
export function sweep(r, hours, now = Date.now()) {
  const g = path.join(r, 'gate'); let n = 0;
  if (fs.existsSync(g)) for (const e of fs.readdirSync(g)) { const p = path.join(g, e); if (now - fs.statSync(p).mtimeMs > hours * 3600e3) { fs.rmSync(p, { recursive: true, force: true }); n++; } }
  const v = path.join(r, 'verdict');
  if (fs.existsSync(v)) for (const e of fs.readdirSync(v)) { const p = path.join(v, e); if (now - fs.statSync(p).mtimeMs > 30 * 24 * 3600e3) { fs.rmSync(p, { force: true }); n++; } }
  return n;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2), opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a.splice(i, 2)[1] : null; };
  const pinned = a.includes('--pinned'); if (pinned) a.splice(a.indexOf('--pinned'), 1);
  const run = opt('--run'), hours = +(opt('--hours') || 24), [cmd, x, y] = a, r = root();
  const base = () => path.join(r, 'gate', run || runKey());
  // a reader takes the newest attempt of this run that handed NAME off: a re-run of only the failed jobs (attempt 2)
  // keeps attempt 1's plan, whose hand-off is attempt 1's
  const from = (name) => {
    const [id, at] = (run || runKey()).split('-');
    for (let k = +at || 1; k >= 1; k--) { const b = path.join(r, 'gate', `${id}-${k}`); if (fs.existsSync(path.join(b, name + '.manifest.json'))) return b; }
    return base();
  };
  try {
    if (cmd === 'put') {
      const n = put(x, y, base()), h = sha(path.join(base(), y + '.manifest.json'));
      if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `sha=${h}\n`);
      console.log(`handoff: ${n} files of ${x} handed off as ${path.join(base(), y)} (manifest sha256 ${h})`);
    }
    else if (cmd === 'get') console.log(`handoff: ${get(x, y, from(x), pinned ? (process.env.HANDOFF_SHA || '') : undefined)} files of ${x} checked against their manifest${pinned ? ', pinned to its job\'s output' : ''}, in ${y}`);
    else if (cmd === 'has') process.exitCode = fs.existsSync(path.join(from(x), x + '.manifest.json')) ? 0 : 1;
    else if (cmd === 'drop') {   // (every attempt of the run)
      const id = (run || runKey()).split('-')[0], g = path.join(r, 'gate'); let n = 0;
      if (fs.existsSync(g)) for (const e of fs.readdirSync(g)) if (e.split('-')[0] === id) { fs.rmSync(path.join(g, e), { recursive: true, force: true }); n++; }
      console.log(`handoff: dropped run ${id}'s hand-off (${n} attempt folder(s))`);
    }
    else if (cmd === 'sweep') { fs.mkdirSync(r, { recursive: true }); console.log(`handoff: swept ${sweep(r, hours)} hand-off(s) older than ${hours} h from ${r}`); }
    else if (cmd === 'selftest') {
      const src = path.join(from(x), x), m = JSON.parse(fs.readFileSync(src + '.manifest.json', 'utf8')), f = Object.keys(m).sort()[0];
      if (!f) throw new Error('handoff selftest: ' + x + ' is empty');
      const t = fs.mkdtempSync(path.join(path.dirname(src), '.selftest-')), c = path.join(t, x);
      try {
        copy(src, c);
        if (check(c, m).length) throw new Error('handoff selftest: the untouched copy failed its manifest');
        const b = fs.readFileSync(path.join(c, f)), d = b.length ? Buffer.from(b) : Buffer.alloc(1); d[0] ^= 1; fs.writeFileSync(path.join(c, f), d);
        const bad = check(c, m);
        if (!bad.some((l) => l === 'changed ' + f)) throw new Error('handoff selftest: a byte changed in ' + f + ' was not caught');
        console.log(`handoff selftest: one byte changed in ${x}/${f} is caught ("${bad[0]}"); the untouched copy passes`);
      } finally { fs.rmSync(t, { recursive: true, force: true }); }
    }
    else if (cmd === 'verdict-put') { const d = path.join(r, 'verdict'); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, (run || runKey()) + '.json'), fs.readFileSync(x)); console.log('handoff: verdict kept as ' + path.join(d, (run || runKey()) + '.json')); }
    else { console.error('usage: handoff.mjs put|get|has|drop|sweep|verdict-put ...'); process.exitCode = 2; }
  } catch (e) { console.log('::error::' + e.message); process.exitCode = 1; }
}
