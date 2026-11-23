// test/unit/fork-guard.mjs: the repository is public, and its GPU jobs run on the owner's PC (self-hosted). A job that a
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
  const L = src.replace(/\r\n/g, '\n').split('\n'), on = [], jobs = [];   // (a Windows checkout's CRLF)
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

test('no CI job runs on the owner\'s PC (2026-11-23, the owner: "None on my PC")', () => {
  for (const f of fs.readdirSync(DIR).filter((x) => /\.ya?ml$/.test(x))) {
    for (const j of parse(fs.readFileSync(path.join(DIR, f), 'utf8')).jobs) assert.ok(!/self-hosted|pc-wsl|gpu-4090|gpu-exclusive/.test(j.runsOn), `${f}: job ${j.name} runs on a self-hosted runner (${j.runsOn})`);
  }
});

test('fork guard: every PC job a fork could start runs only for this repository', () => {
  let checked = 0;
  for (const f of fs.readdirSync(DIR).filter((x) => /\.ya?ml$/.test(x))) {
    const { on, jobs } = parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    const risky = on.filter((e) => GUARD[e]);
    for (const j of jobs) {
      // (pull_request_target and workflow_run run main's copy with a write token: guarded on any runner. pull_request
      // runs with a read-only token and no secrets: guarded where it reaches the PC, a self-hosted job or a called one.)
      const pc = /self-hosted/.test(j.runsOn) || !!j.uses;
      for (const e of risky.filter((x) => pc || x !== 'pull_request')) { assert.match(j.if, GUARD[e], `${f}: job ${j.name} can start on ${e}: no fork guard`); checked++; }
    }
  }
  assert.ok(checked >= 3, 'merge.yml (2 events) and stills.yml (its look-up at least) are read: ' + checked);
});

test('fork guard: the parser reads a workflow\'s triggers, jobs and folded ifs', () => {
  const w = parse('name: x\non:\n  pull_request:\n    types: [labeled]\n  push:\njobs:\n  a:\n    if: >-\n      one &&\n      two\n    runs-on: [self-hosted, linux]\n  b:\n    uses: ./y.yml\n');
  assert.deepEqual(w.on, ['pull_request', 'push']);
  assert.deepEqual(w.jobs.map((j) => [j.name, j.if.trim(), !!j.uses]), [['a', 'one && two', false], ['b', '', true]]);
});
// plant: {"file": ".github/workflows/merge.yml", "find": "startsWith(github.event.pull_request.head.ref, 'claude/') && github.event.pull_request.head.repo.full_name == github.repository ||", "with": "startsWith(github.event.pull_request.head.ref, 'claude/') ||", "why": "a fork's PR wakes the merge bot with MERGE_TOKEN"}
// plant: {"file": ".github/workflows/stills.yml", "find": "      && github.event.workflow_run.head_repository.full_name == github.repository", "with": "      && true", "why": "a fork's own Gate run starts the Stills look-up with a write token"}
