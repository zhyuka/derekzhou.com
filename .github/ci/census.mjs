// census.mjs: the shader census. Each build of the site (base and head) is loaded in the gates' browser (harness.mjs:
// SwiftShader, the clock paused and stepped) as each persona, and every source the page hands shaderSource is kept
// until the world shows (every program is issued by then: the first frame's, the ink birds' and the sand's, finished
// after the show, are issued with the rest). Each source is SHA-256'd; the two builds' sets are compared per persona.
//   node .github/ci/census.mjs --base BASE_BUILD --head HEAD_BUILD --out census.json [--base-json F] [--save-head F]
// --base-json: the base's sets, saved by an earlier run (gate.yml caches each main commit's), so only the head loads.
// --save-head: write the head's sets there, for later runs to use as their base's.
// Prints glsl_changed=true|false (and appends it to $GITHUB_OUTPUT when set). Exit 1 only if the head never shows.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { serve } from './serve.mjs';
import * as H from './harness.mjs';

const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const PERSONAS = (A.personas || 'generic,nvidia').split(',');
const VP = [320, 240, 1];   // the sources do not hang on the window (glsl_guard.js holds that); a small one boots fastest
const EPOCH = Date.parse('2026-11-05T22:30:00Z'), SEEDS = [11, 22, 33];
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const t0 = Date.now();
const cached = A['base-json'] && fs.existsSync(A['base-json']) ? JSON.parse(fs.readFileSync(A['base-json'], 'utf8')) : null;
const builds = cached ? { head: A.head } : { base: A.base, head: A.head };
if (cached) console.log(`base: from ${A['base-json']} (cached)`);
const servers = {}; for (const k in builds) servers[k] = await serve(builds[k]);
const browser = await H.launch();
const jobs = [];
for (const k in builds) for (const p of PERSONAS) jobs.push((async () => {
  const arm = await H.openPage(browser, servers[k].url, { vp: VP, persona: p, epoch: EPOCH, seeds: SEEDS, census: true });
  const at = await H.stepToShow(arm, 1500);
  const src = await arm.page.evaluate(() => window.__ci.src);
  await arm.ctx.close();
  const set = {}; for (const s of src) set[sha(s)] = s.length;
  return { build: k, persona: p, shownAt: at, calls: src.length, unique: Object.keys(set).length, bytes: src.reduce((n, s) => n + s.length, 0), set, logs: arm.logs.slice(0, 10) };
})());
const runs = await Promise.all(jobs);
await browser.close(); for (const k in servers) await servers[k].close();
if (cached) for (const r of cached) if (PERSONAS.includes(r.persona)) runs.push({ ...r, build: 'base' });
if (A['save-head']) fs.writeFileSync(A['save-head'], JSON.stringify(runs.filter((r) => r.build === 'head').map(({ logs, ...r }) => r)));

const out = { seconds: (Date.now() - t0) / 1000, personas: {}, glsl_changed: false };
for (const p of PERSONAS) {
  const b = runs.find((r) => r.build === 'base' && r.persona === p), h = runs.find((r) => r.build === 'head' && r.persona === p);
  if (!b) { console.log(`::error::no base census for ${p}`); process.exit(1); }
  const added = Object.keys(h.set).filter((x) => !(x in b.set)), removed = Object.keys(b.set).filter((x) => !(x in h.set));
  out.personas[p] = { base: { shownAt: b.shownAt, calls: b.calls, unique: b.unique, bytes: b.bytes }, head: { shownAt: h.shownAt, calls: h.calls, unique: h.unique, bytes: h.bytes, logs: h.logs }, added, removed };
  if (added.length || removed.length) out.glsl_changed = true;
  console.log(`${p}: base ${b.unique} shaders (${b.calls} calls, ${b.bytes} B), head ${h.unique} (${h.calls} calls, ${h.bytes} B); +${added.length} -${removed.length}; shown at frame ${b.shownAt} / ${h.shownAt}`);
}
out.sources = Object.fromEntries(runs.map((r) => [r.build + ':' + r.persona, Object.keys(r.set).sort()]));
fs.writeFileSync(A.out || 'census.json', JSON.stringify(out, null, 1));
console.log(`glsl_changed=${out.glsl_changed} (${out.seconds.toFixed(1)} s)`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `glsl_changed=${out.glsl_changed}\n`);
if (runs.some((r) => r.build === 'head' && r.shownAt < 0)) { console.log('::error::the head build never showed the world in the census'); process.exit(1); }
