// test/unit/fork-guard.mjs: the repository is public and every job runs on the owner's PC (self-hosted). A job that a
// fork's pull request can start (pull_request, pull_request_target, or workflow_run, which a fork's own run of a
// workflow can trigger) runs only when the head repository is this one (2026-11-23, the hub; RUNNER-SETUP.md). What a
// guard cannot stop: a fork's PR that edits a pull_request workflow runs its own copy, guard removed; only the
// repository's setting "Require approval for all external contributors" stops that (docs/security.md).
import { test, assert, fs, path, ROOT } from '../unit-lib.mjs';

const DIR = path.join(ROOT, '.github/workflows');
const GUARD = {
  pull_request: /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/,
  pull_request_target: /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/,
  workflow_run: /github\.event\.workflow_run\.head_repository\.full_name == github\.repository/,
};
// a workflow's triggers (the keys under on:) and its jobs (name, runs-on, if), from the file's own indentation
export function parse(src) {
  const L = src.split('\n'), on = [], jobs = [];
  let sec = '', job = null, inIf = false;
  for (const l of L) {
    if (/^\S/.test(l)) { sec = l.replace(/:.*$/, ''); job = null; inIf = false; if (/^on:\s*\[/.test(l)) on.push(...l.replace(/^on:\s*\[|\].*$/g, '').split(',').map((s) => s.trim())); continue; }
    if (sec === 'on' && /^  [a-z_]+:/.test(l)) on.push(l.trim().replace(/:.*$/, ''));
    if (sec !== 'jobs') continue;
    const m = /^  ([\w-]+):\s*$/.exec(l);
    if (m) { job = { name: m[1], runsOn: '', uses: '', if: '' }; jobs.push(job); inIf = false; continue; }
    if (!job) continue;
    const k = /^    ([\w-]+):\s*(.*)$/.exec(l);
    if (k) { inIf = k[1] === 'if' && /^>-?\s*$/.test(k[2]); if (k[1] === 'runs-on') job.runsOn = k[2]; if (k[1] === 'uses') job.uses = k[2]; if (k[1] === 'if') job.if = inIf ? '' : k[2]; continue; }
    if (inIf && /^      \S/.test(l)) job.if += ' ' + l.trim(); else inIf = false;
  }
  return { on, jobs };
}

test('fork guard: every PC job a fork could start runs only for this repository', () => {
  let checked = 0;
  for (const f of fs.readdirSync(DIR).filter((x) => /\.ya?ml$/.test(x))) {
    const { on, jobs } = parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    const risky = on.filter((e) => GUARD[e]);
    for (const j of jobs) {
      if (!/self-hosted/.test(j.runsOn) && !j.uses) continue;   // (a job on GitHub's runners, or none)
      for (const e of risky) { assert.match(j.if, GUARD[e], `${f}: job ${j.name} can start on ${e} and runs on the PC: no fork guard`); checked++; }
    }
  }
  assert.ok(checked >= 6, 'gpu.yml (3 jobs), merge.yml (2 events) and stills.yml (3 jobs) are read: ' + checked);
});

test('fork guard: the parser reads a workflow\'s triggers, jobs and folded ifs', () => {
  const w = parse('name: x\non:\n  pull_request:\n    types: [labeled]\n  push:\njobs:\n  a:\n    if: >-\n      one &&\n      two\n    runs-on: [self-hosted, linux]\n  b:\n    uses: ./y.yml\n');
  assert.deepEqual(w.on, ['pull_request', 'push']);
  assert.deepEqual(w.jobs.map((j) => [j.name, j.if.trim(), !!j.uses]), [['a', 'one && two', false], ['b', '', true]]);
});
// plant: {"file": ".github/workflows/merge.yml", "find": "github.event_name == 'pull_request_target' && github.event.pull_request.head.repo.full_name == github.repository && ", "with": "github.event_name == 'pull_request_target' && ", "why": "a fork's PR starts the merge bot on the PC"}
// plant: {"file": ".github/workflows/stills.yml", "find": "    if: needs.need.outputs.bake == 'true' && github.event.workflow_run.head_repository.full_name == github.repository", "with": "    if: needs.need.outputs.bake == 'true'", "why": "a fork's own Gate run bakes on the PC's GPU"}
