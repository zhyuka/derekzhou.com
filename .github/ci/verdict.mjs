// verdict.mjs: the gate's one answer, for merge.yml and the run's summary. Reads the jobs' results (NEEDS, the
// workflow's toJSON(needs)) and the T1 shards' result.json files, writes verdict.json:
//   gate_ok           every gate job green (a skipped T1 or T2 counts as green: it was not needed)
//   (T1 is skipped when T2 runs for the same head: then T2's frames decide)
//   frames_identical  nothing a visitor sees changed (and no input handling did: the gates render with no pointer): the
//                     head's build byte for byte the base's (identical by construction; areas.mjs compares the builds),
//                     or every T1 shard's frames, DOM and stills the base's (and T2's, when it ran)
// Exit 1 when gate_ok is false, so the run itself is red.
//   NEEDS='{...}' node .github/ci/verdict.mjs T1_RESULTS_DIR verdict.json
import fs from 'node:fs';
import path from 'node:path';

const needs = JSON.parse(process.env.NEEDS || '{}');
const [dir, outFile] = process.argv.slice(2);
const c = Object.assign({}, (needs.plan && needs.plan.outputs) || {}, (needs.census && needs.census.outputs) || {});
const result = (j) => (needs[j] ? needs[j].result : 'skipped');
const green = (j) => ['success', 'skipped'].includes(result(j));

const shards = [];
if (dir && fs.existsSync(dir)) for (const f of fs.readdirSync(dir, { recursive: true })) if (path.basename(String(f)) === 'result.json') shards.push(JSON.parse(fs.readFileSync(path.join(dir, String(f)), 'utf8')));
shards.sort((a, b) => a.shard - b.shard);

const v = {
  sha: process.env.GITHUB_SHA, ref: process.env.GITHUB_REF, base: c.base || null, run_id: process.env.GITHUB_RUN_ID,
  t2_key: c.t2_key || null,   // (both served builds' hashes and the T2 code: main reuses a PR's answer when they match)
  areas: c.areas || '', site_changed: c.site_changed === 'true', glsl_changed: c.glsl_changed === 'true', gpu_js: c.gpu_js === 'true',
  jobs: Object.fromEntries(Object.keys(needs).map((k) => [k, needs[k].result])),
  t1: { ran: result('t1') !== 'skipped', shards: shards.length, frames_identical: shards.length > 0 && shards.every((s) => s.frames_identical), null_ok: shards.every((s) => s.null_ok) },
  t2: { required: false, ran: false, frames_identical: null },
};
// T2's read-backs: only a DIFFER stops a merge (the owner, 2026-11-06: "frames decide"). A shader that was not read back
// (bits_identical false, bits_differ false) is decided by the frames; T2's summary names it. An answer from before
// bits_differ existed counts any not-identical read as a difference.
// T2_CACHED: t2-probe found T2's answer for these two builds and this T2 code (gate.yml keeps it by them), so the 4090 was
// not asked again; it counts as T2 having run, with that answer.
let cached = null; try { cached = process.env.T2_CACHED ? JSON.parse(process.env.T2_CACHED) : null; } catch { cached = null; }
// (on main after a fast-forward the frames answer is the PR's (cached) and the 4090 ran only the stall visits: theirs is kept)
const t2 = cached ? Object.assign({}, cached, needs.t2 && needs.t2.outputs && needs.t2.outputs.stall_ok ? { stall_ok: needs.t2.outputs.stall_ok } : {}) : (needs.t2 && needs.t2.outputs);
if (needs.t2) {
  v.t2.wanted = v.glsl_changed || v.gpu_js || c.t2_self === 'true';
  v.t2.required = !!cached || result('t2') !== 'skipped';
  v.t2.ran = v.t2.required;
  v.t2.cached = !!cached;
  if (t2) Object.assign(v.t2, { frames_identical: t2.frames_identical === 'true', glsl_changed: t2.glsl_changed === 'true', bits_identical: t2.bits_identical === 'true', bits_differ: t2.bits_differ === 'true' ? true : t2.bits_differ === 'false' ? false : t2.bits_identical !== 'true', csp_ok: t2.csp_ok === 'true', stall_ok: t2.stall_ok === 'true' ? true : t2.stall_ok === 'false' ? false : null });   // (stall_ok: lane D's stall visits, #47; null where gpu.yml does not report it)
}
v.gate_ok = Object.keys(needs).filter((k) => k !== 'verdict').every(green) && !!c.base;
const expectShards = +(process.env.T1_SHARDS || 4);
v.input_changed = c.input_changed === 'true';
if (v.input_changed) { v.frames_identical = false; v.reason = `input handling changed (${c.input_files || 'see the plan job'}): T1 and T2 render with no pointer, touch or key, so how the page now answers one is for the owner to see`; }
else if (!v.site_changed) { v.frames_identical = true; v.reason = 'the build (what is served) is byte for byte the base\'s'; }
else if (!v.t1.ran && v.t2.ran) { v.frames_identical = !!(v.t2.frames_identical && v.t2.csp_ok && (!v.t2.glsl_changed || !v.t2.bits_differ)); v.reason = v.frames_identical ? 'T2 (the RTX 4090; T1 skipped while T2 runs): every frame the base\'s' : 'T2 (the RTX 4090): frames or bits changed, or a CSP violation'; }
else if (!v.t1.ran || v.t1.shards !== expectShards) { v.frames_identical = false; v.reason = `T1 did not report (${v.t1.shards} of ${expectShards} shards)`; }
else if (!v.t1.frames_identical) { v.frames_identical = false; v.reason = 'T1: frames, DOM or a still changed'; }
else if (v.t2.ran && !(v.t2.frames_identical && v.t2.csp_ok && (!v.t2.glsl_changed || !v.t2.bits_differ))) { v.frames_identical = false; v.reason = 'T2 (the RTX 4090): frames or bits changed, or a CSP violation'; }
else { v.frames_identical = true; v.reason = 'T1' + (v.t2.ran ? ' and T2' : '') + ': every frame, DOM and still the base\'s'; }

fs.writeFileSync(outFile || 'verdict.json', JSON.stringify(v, null, 1));
const md = [`## Gate: ${v.gate_ok ? 'green' : '**red**'}, frames ${v.frames_identical ? 'identical' : '**changed**'}`, '',
  `- ${v.reason}`, `- areas: ${v.areas || '(none)'}; glsl_changed: ${v.glsl_changed}; served changed: ${v.site_changed}`,
  `- jobs: ${Object.entries(v.jobs).map(([k, r]) => `${k} ${r}`).join(', ')}`,
  `- T2: ${v.t2.ran ? JSON.stringify(v.t2) : 'not run'}`];
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
console.log(md.join('\n'));
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `gate_ok=${v.gate_ok}\nframes_identical=${v.frames_identical}\n`);
process.exit(v.gate_ok ? 0 : 1);
