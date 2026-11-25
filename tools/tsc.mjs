// tsc.mjs: tsc --checkJs over the assembled world (the dev build: node tools/parts.mjs assemble src), src/realm-*.js,
// the sound (src/sound.js, src/score.js), the page's own scripts (site/hour.js, site/site.js: copies, cast from the
// side) and the ink birds' wing model (src/birds/model/), with tools/types/world.d.ts for what TypeScript's DOM types
// lack. Not a build step and not a dependency (the owner's no-frameworks rule: terser alone to build): it runs a pinned
// TypeScript through npx, into npm's cache.
//   node tools/tsc.mjs           print each error as section:line (the world) or file:line (the realms, the sound, the
//                                page), and the counts; exit 1 if there is any (tools/checks/48-tsc.sh: every gate), 2 if
//                                tsc did not run or a site cast's anchor is gone
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TS = 'typescript@5.6.3';
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'tsc-world-'));
execFileSync(process.execPath, [path.join(ROOT, 'tools/parts.mjs'), 'assemble', path.join(ROOT, 'src'), out], { stdio: 'ignore' });
// the plan's spans keep a CommonJS wrapper (`typeof module`, `module.exports`, `require`) so the worker and the unit
// tests can load them; tsc reads that in a checked script as a module and narrows `module`. The copy checked here has
// the two renamed (world.d.ts declares the new names); the source is untouched
const wf = path.join(out, 'world.js');
fs.writeFileSync(wf, fs.readFileSync(wf, 'utf8').replace(/\bmodule\b/g, 'CJS_MODULE').replace(/\brequire\(/g, 'CJS_REQUIRE(')
  .replace('var CJS_MODULE = undefined', 'var CJS_MODULE = /** @type {any} */ (undefined)'));   // (130 sets module undefined in the page: any to tsc)
const r = spawnSync('npx', ['-y', '-p', TS, 'tsc', '--allowJs', '--checkJs', '--noEmit', '--target', 'es2020', '--lib', 'es2020,dom',
  path.join(out, 'world.js'), path.join(ROOT, 'tools/types/world.d.ts')], { encoding: 'utf8' });
// each assembled line back to its section: the parts in the order assemble joins them (dev parts with the world's)
const asm = fs.readFileSync(path.join(out, 'world.js'), 'utf8');
const parts = [...fs.readdirSync(path.join(ROOT, 'src/world')).filter((f) => /^\d{3}-.*\.js$/.test(f) && !f.endsWith('.ship.js')).map((f) => ['src/world/' + f, f]),
  ...fs.readdirSync(path.join(ROOT, 'src/dev/world')).map((f) => ['src/dev/world/' + f, f])].sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
const starts = []; let pos = 0;
for (const [p] of parts) {
  const t = fs.readFileSync(path.join(ROOT, p), 'utf8'), probe = t.split('\n').find((l) => l.trim().length > 20 && !l.includes('@glsl'));
  const i = probe ? asm.indexOf(probe, pos) : -1; if (i < 0) continue;
  starts.push([asm.slice(0, i).split('\n').length - (t.slice(0, t.indexOf(probe)).split('\n').length - 1), p]); pos = i;
}
let n = 0;
for (const l of (r.stdout || '').split('\n')) {
  const m = /world\.js\((\d+),(\d+)\): (error TS\d+: .*)/.exec(l); if (!m) continue;
  let s = starts[0]; for (const x of starts) if (x[0] <= +m[1]) s = x;
  console.log(`${s[1]}:${+m[1] - s[0] + 1}  ${m[3]}`); n++;
}
if (r.status !== 0 && !n) { process.stderr.write(r.stderr || r.stdout || 'tsc did not run\n'); process.exit(2); }
console.log(`tsc --checkJs: ${n} error(s) in the assembled world`);
// the realm scripts, checked as written (their GLSL is a `@glsl NAME` string until the build inlines it, so each line is
// the source's own): what they read of window.WORLD is world.d.ts's WorldApi
const realms = fs.readdirSync(path.join(ROOT, 'src')).filter((f) => /^realm-.*\.js$/.test(f)).map((f) => path.join(ROOT, 'src', f));
const r2 = spawnSync('npx', ['-y', '-p', TS, 'tsc', '--allowJs', '--checkJs', '--noEmit', '--target', 'es2020', '--lib', 'es2020,dom',
  ...realms, path.join(ROOT, 'tools/types/world.d.ts')], { encoding: 'utf8' });
let n2 = 0;
for (const l of (r2.stdout || '').split('\n')) {
  const m = /(realm-[^/\\]*\.js)\((\d+),\d+\): (error TS\d+: .*)/.exec(l); if (!m) continue;
  console.log(`src/${m[1]}:${m[2]}  ${m[3]}`); n2++;
}
if (r2.status !== 0 && !n2) { process.stderr.write(r2.stderr || r2.stdout || 'tsc did not run\n'); process.exit(2); }
console.log(`tsc --checkJs: ${n2} error(s) in the realm scripts`);
// the sound: the icon's switch (src/sound.js) and the score it plays (src/score.js), checked as written, together (the
// switch reads window.SCORE, world.d.ts's ScoreApi; the score reads window.WORLD.sky)
const r3 = spawnSync('npx', ['-y', '-p', TS, 'tsc', '--allowJs', '--checkJs', '--noEmit', '--target', 'es2020', '--lib', 'es2020,dom',
  path.join(ROOT, 'src/sound.js'), path.join(ROOT, 'src/score.js'), path.join(ROOT, 'tools/types/world.d.ts')], { encoding: 'utf8' });
let n3 = 0;
for (const l of (r3.stdout || '').split('\n')) {
  const m = /((?:sound|score)\.js)\((\d+),\d+\): (error TS\d+: .*)/.exec(l); if (!m) continue;
  console.log(`src/${m[1]}:${m[2]}  ${m[3]}`); n3++;
}
if (r3.status !== 0 && !n3) { process.stderr.write(r3.stderr || r3.stdout || 'tsc did not run\n'); process.exit(2); }
console.log(`tsc --checkJs: ${n3} error(s) in the sound scripts`);
// the page's own scripts (site/hour.js, site/site.js), served as written: never a cast in them (every byte ships; hour.js
// is near its budget). The copies checked here take four casts from the side, each the type the code means (hour.js's
// times of day are [name, from, to, colour] tuples, a shape's ratio is coerced, the still's preload is a link, the email's
// an anchor); each anchor must be found once, so a change that moves one fails here, not silently
const SITE_CASTS = {
  'site/hour.js': [
    ['var DAY = [', 'var DAY = /** @type {[string, number, number, string][]} */ (['],
    ["['night', 21, 29, '#17234f']];", "['night', 21, 29, '#17234f']]);"],
    ["ab = SHAPES[j][0].split('/');", "ab = /** @type {any} */ (SHAPES[j][0].split('/'));"],
    ["pre = document.querySelector('link.still');", "pre = /** @type {HTMLLinkElement | null} */ (document.querySelector('link.still'));"]],
  'site/site.js': [["var link = document.getElementById('email-link');", "var link = /** @type {HTMLAnchorElement | null} */ (document.getElementById('email-link'));"]],
};
const siteCopies = [];
for (const [f, casts] of Object.entries(SITE_CASTS)) {
  let t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const [find, put] of casts) {
    if (t.split(find).length !== 2) { process.stderr.write(`tools/tsc.mjs: ${f} no longer holds, once, its cast's anchor ${JSON.stringify(find)}: update SITE_CASTS\n`); process.exit(2); }
    t = t.replace(find, put);
  }
  const c = path.join(out, path.basename(f)); fs.writeFileSync(c, t); siteCopies.push(c);
}
const r4 = spawnSync('npx', ['-y', '-p', TS, 'tsc', '--allowJs', '--checkJs', '--noEmit', '--target', 'es2020', '--lib', 'es2020,dom',
  ...siteCopies, path.join(ROOT, 'tools/types/world.d.ts')], { encoding: 'utf8' });
let n4 = 0;
for (const l of (r4.stdout || '').split('\n')) {
  const m = /((?:hour|site)\.js)\((\d+),\d+\): (error TS\d+: .*)/.exec(l); if (!m) continue;
  console.log(`site/${m[1]}:${m[2]}  ${m[3]}`); n4++;   // (the copies' lines are the files' own: each cast is within its line)
}
if (r4.status !== 0 && !n4) { process.stderr.write(r4.stderr || r4.stdout || 'tsc did not run\n'); process.exit(2); }
console.log(`tsc --checkJs: ${n4} error(s) in the page's scripts`);
// the ink birds' wing model (src/birds/model/, served as written): each file sets its one global on self (world.d.ts's
// Window: FACETFORM, FACETPOSE, WINGMODEL, WINGMODEL_DATA, LABBIRD, BIRDWING), checked together as the page loads them.
// The four functions' tails also export them as CommonJS (the lab and the generators load them in Node); tsc reads that
// as a module, so the copies checked here have module renamed, as the world's (world.d.ts declares CJS_MODULE); each
// line is the file's own
const modelDir = path.join(ROOT, 'src/birds/model'), modelCopies = [];
for (const f of fs.readdirSync(modelDir).filter((x) => x.endsWith('.js')).sort()) {
  const c = path.join(out, 'model-' + f); fs.writeFileSync(c, fs.readFileSync(path.join(modelDir, f), 'utf8').replace(/\bmodule\b/g, 'CJS_MODULE')); modelCopies.push(c);
}
const r5 = spawnSync('npx', ['-y', '-p', TS, 'tsc', '--allowJs', '--checkJs', '--noEmit', '--target', 'es2020', '--lib', 'es2020,dom',
  ...modelCopies, path.join(ROOT, 'tools/types/world.d.ts')], { encoding: 'utf8' });
let n5 = 0;
for (const l of (r5.stdout || '').split('\n')) {
  const m = /model-([\w-]+\.js)\((\d+),\d+\): (error TS\d+: .*)/.exec(l); if (!m) continue;
  console.log(`src/birds/model/${m[1]}:${m[2]}  ${m[3]}`); n5++;
}
if (r5.status !== 0 && !n5) { process.stderr.write(r5.stderr || r5.stdout || 'tsc did not run\n'); process.exit(2); }
console.log(`tsc --checkJs: ${n5} error(s) in the wing model`);
fs.rmSync(out, { recursive: true, force: true });
process.exit(n || n2 || n3 || n4 || n5 ? 1 : 0);
