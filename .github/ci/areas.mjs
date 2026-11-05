// areas.mjs: which gates a change needs, from the files it touches (areas.json; a file no pattern matches means ALL,
// so a new kind of file is tested everywhere until it is mapped). Also whether site/ is byte for byte the base's:
// then what a visitor is served is identical by construction and the frames need no rendering.
//   node .github/ci/areas.mjs BASE_SHA HEAD_SHA     -> areas=..., site_changed=..., run_t1=..., gpu_js=... (+ $GITHUB_OUTPUT)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { map } = JSON.parse(fs.readFileSync(path.join(here, 'areas.json'), 'utf8'));
const glob = (g) => new RegExp('^' + g.split('**').map((p) => p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*') + '$');
const RULES = map.map(([g, a]) => [glob(g), a]);

export function areasOf(files) {
  const out = new Set(['static']); const unknown = [];
  for (const f of files) {
    const r = RULES.find(([re]) => re.test(f));
    if (!r) { unknown.push(f); continue; }
    for (const a of r[1]) out.add(a);
  }
  if (unknown.length) ['frames', 'gpu'].forEach((a) => out.add(a));
  out.delete('none');
  return { areas: [...out].sort(), unknown };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [base, head] = process.argv.slice(2);
  const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });
  const files = git('diff', '--name-only', base, head).split('\n').filter(Boolean);
  const { areas, unknown } = areasOf(files);
  let siteChanged = true; try { git('diff', '--quiet', base, head, '--', 'site'); siteChanged = false; } catch {}
  // T1 renders only when what is served changed (site/), or when the harness itself did (so it is tested on its own PR);
  // T2 when the world's, the realms' or the birds' served JS changed (the census adds a changed shader).
  const harness = files.some((f) => f.startsWith('.github/ci/') || f === '.github/workflows/gate.yml');
  const gpuJs = files.some((f) => f.startsWith('site/') && areasOf([f]).areas.includes('gpu'));
  const o = { areas: areas.join(','), site_changed: siteChanged, run_t1: siteChanged || harness, gpu_js: gpuJs, files: files.length };
  console.log(`${files.length} files changed${unknown.length ? '; unmapped (ALL): ' + unknown.join(' ') : ''}`);
  for (const [k, v] of Object.entries(o)) console.log(`${k}=${v}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(o).map(([k, v]) => `${k}=${v}\n`).join(''));
}
