// check-quick.mjs: the checks that take seconds, for an agent between edits (npm run check:quick; the Stop hook in
// .claude/settings.json runs it with --hook). CI runs the whole of validate.yml; this is its fast front:
//   - src/ assembles, both builds (tools/parts.mjs: the dev build and the shipped one)
//   - every assembled script, every script in site/ and src/birds/model/, and the plan's worker parse (syntax)
//   - the plan's worker is made: its spans found and the world's PW_V their stamp (tools/plan.mjs)
//   - site/ holds none of the files the build writes (built-files-uncommitted)
//   - no name declared twice in one scope of a served script (tools/dup-names.mjs: no-duplicate-names)
//   - RULES.json, .claude/settings.json and every parts.json parse; RULES.json's references exist (rules_check.py,
//     when python3 is there)
//   node tools/check-quick.mjs           run; exit 1 on a failure
//   node tools/check-quick.mjs --hook    as the Stop hook: only when src/, site/, tools/, test/, RULES.json or .claude/
//                                        have uncommitted changes; a failure exits 2 (its report goes back to the agent),
//                                        and never twice in a row (the hook's stop_hook_active)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = process.argv.includes('--hook');
const t0 = Date.now(), fails = [], oks = [];
const ok = (m) => oks.push(m), fail = (m) => fails.push(m);

if (HOOK) {
  let input = {}; try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
  if (input.stop_hook_active) process.exit(0);   // (the agent already answered one report: never loop)
  let changed = '';
  try { changed = execFileSync('git', ['status', '--porcelain', '--', 'src', 'site', 'tools', 'test', 'RULES.json', '.claude'], { cwd: ROOT, encoding: 'utf8' }); } catch { process.exit(0); }
  if (!changed.trim()) process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quick-'));
try {
  // assemble
  const dev = path.join(tmp, 'src'), ship = path.join(tmp, 'ship');
  for (const [args, dir] of [[['assemble', 'src', dev], dev], [['assemble', '--ship', 'src', ship], ship]]) {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'parts.mjs'), ...args], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) fail('tools/parts.mjs ' + args.slice(0, -2).join(' ') + ' src: ' + (r.stderr || r.stdout).trim().split('\n').slice(-3).join(' | '));
    else ok('src/ assembles (' + (args[1] === '--ship' ? 'shipped' : 'dev') + ' build: ' + fs.readdirSync(dir).filter((n) => n.endsWith('.js')).length + ' scripts)');
  }
  // syntax
  const parse = (file, text) => { try { new vm.Script(text, { filename: file }); return true; } catch (e) { fail(file + ': ' + e.message); return false; } };
  let n = 0;
  for (const [d, label] of [[dev, 'the dev build'], [ship, 'the shipped build']]) if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith('.js')) { n++; parse(label + ' ' + f + ' (src/ assembled)', fs.readFileSync(path.join(d, f), 'utf8')); }
  for (const d of ['site', 'src/birds/model']) { const p = path.join(ROOT, d); if (fs.existsSync(p)) for (const f of fs.readdirSync(p)) if (f.endsWith('.js')) { n++; parse(d + '/' + f, fs.readFileSync(path.join(p, f), 'utf8')); } }
  ok(n + ' scripts parse');
  // the plan's worker
  const wp = path.join(dev, 'world.js');
  if (fs.existsSync(wp)) {
    const { makePlan, workerName } = await import(new URL('./plan.mjs', import.meta.url));
    const world = fs.readFileSync(wp, 'utf8'), name = workerName(world);
    if (name) { try { const r = makePlan(world, name); if (parse(name, r.text)) ok('the plan\'s worker is made (stamp ' + r.stamp + ' = the world\'s PW_V)'); } catch (e) { fail(e.message); } }
  }
  // no built file in site/
  const built = fs.existsSync(ship) ? fs.readdirSync(ship).filter((f) => f.endsWith('.js')) : [];
  const ix = fs.readFileSync(path.join(ROOT, 'site', 'index.html'), 'utf8'), sm = ix.match(/\/(start(?:\.v\d+)?\.js)["']/);
  if (sm) built.push(sm[1], sm[1].replace(/^start\./, 'start-table.'));
  if (fs.existsSync(wp)) { const m = fs.readFileSync(wp, 'utf8').match(/new Worker\((['"])\/(plan[^'"]*\.js)\1\)/); if (m) built.push(m[2]); }
  const committed = built.filter((f) => fs.existsSync(path.join(ROOT, 'site', f)));
  if (committed.length) fail('site/ holds built files (git rm them; their sources are in src/): ' + committed.join(', '));
  else ok('site/ holds none of the ' + built.length + ' built files');
  // no name declared twice in one scope (tools/dup-names.mjs)
  {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'dup-names.mjs')], { cwd: ROOT, encoding: 'utf8' });
    const out = (r.stdout || '') + (r.stderr || '');
    if (r.status !== 0) fail('a name declared twice in one scope (tools/dup-names.mjs): ' + out.split('\n').filter((l) => /::error::/.test(l)).map((l) => l.replace('::error::', '')).slice(0, 5).join(' | '));
    else ok(out.trim().split('\n').pop());
  }
  // the data
  const jsons = ['RULES.json', '.claude/settings.json', 'package.json', '.github/ci/areas.json'];
  (function walk(d) { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (e.name === 'parts.json') jsons.push(p); } })('src');
  for (const j of jsons) { const p = path.join(ROOT, j); if (!fs.existsSync(p)) continue; try { JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { fail(j + ' does not parse: ' + e.message); } }
  ok(jsons.length + ' JSON files parse');
  const py = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [path.join('.github', 'workflows', 'rules_check.py')], { cwd: ROOT, encoding: 'utf8' });
  if (py.error) ok('rules_check.py skipped (no python)');
  else if (py.status !== 0) fail('RULES.json: ' + (py.stdout + py.stderr).trim().split('\n').filter((l) => /error|fail/i.test(l)).slice(0, 5).join(' | '));
  else ok((py.stdout.trim().split('\n').pop() || 'RULES.json checked'));
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

const took = ((Date.now() - t0) / 1000).toFixed(1) + ' s';
if (!fails.length) { if (!HOOK) { for (const m of oks) console.log('ok   ' + m); console.log('check:quick: ok (' + took + ')'); } process.exit(0); }
const report = fails.map((m) => 'FAIL ' + m).join('\n') + '\ncheck:quick: ' + fails.length + ' failed (' + took + '); the full checks: npm run check (tools/check.mjs)';
if (HOOK) { process.stderr.write(report + '\n'); process.exit(2); }
for (const m of oks) console.log('ok   ' + m); console.log(report); process.exit(1);
