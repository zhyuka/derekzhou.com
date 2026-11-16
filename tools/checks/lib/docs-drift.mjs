// docs-drift.mjs (tools/checks/41-docs-drift.sh): the map of the repository stays true to it.
//   - every tool (tools/*, tools/checks/*, tools/checks/lib/*), every test script (test/*, test/sims/*, test/unit/*) is
//     named by its path in docs/structure.md, and every folder of tools/ by its path (tools/gpu/: one line for the folder)
//   - every pattern of .github/ci/areas.json matches a repository file (tracked, or new and not ignored) or a file of the plain build (build/site: the built
//     scripts' site/ patterns map what is served, areas.mjs's gpu_js), so a pattern left behind by a move is found
//   node tools/checks/lib/docs-drift.mjs [BUILD_SITE]   (default build/site; exit 1 on drift)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const site = process.argv[2] || 'build/site';
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\n').filter(Boolean).filter((f) => fs.existsSync(f));
const doc = fs.readFileSync('docs/structure.md', 'utf8');
const errs = [];
const named = (p) => new RegExp('(^|[\\s(,`])' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[\\s),:;`])', 'm').test(doc);

// the tools and tests, each by its path; tools/' folders by theirs
const own = files.filter((f) => /^tools\/[^/]+$/.test(f) || /^tools\/checks\/(lib\/)?[^/]+$/.test(f) || /^test\/(sims\/|unit\/)?[^/]+\.(mjs|cjs)$/.test(f));
for (const f of own) if (!named(f)) errs.push(`${f} is not named in docs/structure.md (a line: its path and what it is)`);
const dirs = [...new Set(files.filter((f) => /^tools\/[^/]+\//.test(f)).map((f) => f.split('/')[1]))].filter((d) => d !== 'checks');
for (const d of dirs) if (!named('tools/' + d + '/') && !files.some((f) => f.startsWith('tools/' + d + '/') && named(f))) errs.push(`tools/${d}/ is not named in docs/structure.md`);

// areas.json: no dead pattern
const { map } = JSON.parse(fs.readFileSync('.github/ci/areas.json', 'utf8'));
const glob = (g) => new RegExp('^' + g.split('**').map((p) => p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*') + '$');   // (areas.mjs's)
if (!fs.existsSync(path.join(site, 'index.html'))) { console.error(`docs-drift: no build at ${site} (node tools/build.mjs --plain ${site})`); process.exit(2); }
const served = fs.readdirSync(site, { recursive: true }).map(String).filter((f) => fs.statSync(path.join(site, f)).isFile()).map((f) => 'site/' + f.split(path.sep).join('/'));
const all = files.concat(served);
for (const [g] of map) if (!all.some((f) => glob(g).test(f))) errs.push(`.github/ci/areas.json: the pattern ${g} matches no tracked or served file (drop it)`);

for (const e of errs) console.log('::error::' + e);
if (errs.length) { console.log(`docs-drift: ${errs.length} problem(s)`); process.exit(1); }
console.log(`docs-drift: ${own.length} tools and tests and ${dirs.length} tools/ folders named in docs/structure.md; ${map.length} areas.json patterns, each matching a file`);
