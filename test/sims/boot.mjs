// test/sims/boot.mjs: the boot on the fake page (test/fakepage.cjs), in seconds and without a GPU: each of the five device
// profiles (the reference desktop, a phone, WebKit, a half-float desktop, a byte-target phone) visited once, the world's
// frames to its show counted, against test/golden/boot-frames.json. A boot that needs more frames to show, or no longer
// shows, fails; one that needs fewer passes and says so (node test/sims/boot.mjs SITE --write records the new counts).
// The fake page's compiles and fences finish at once, so the count is the boot's own staging, not a GPU's speed.
//   node test/sims/boot.mjs build/site [--write]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), FP = require('../fakepage.cjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), GOLD = path.join(ROOT, 'test/golden/boot-frames.json');
const site = process.argv[2], WRITE = process.argv.includes('--write');
if (!site || !fs.existsSync(path.join(site, 'index.html'))) { console.error('usage: node test/sims/boot.mjs SITE_DIR [--write]'); process.exit(2); }
const page = FP.loadScripts(site, FP.scriptsOf(site)), now = {}, bad = [];
for (const d of FP.DEVICES) {
  const w = d.wins[0], R = await FP.run({ dev: d, n: 0, seed: 0x9e3779b9, hour: 11.5, w: w[0], h: w[1], dpr: w[2], hz: 60, t0: 200 }, page);
  if (!R.shown) bad.push(`${d.id}: the world never showed (${R.frames} frames${R.errors.length ? '; ' + R.errors[0].slice(0, 120) : ''})`);
  else if (R.errors.length) bad.push(`${d.id}: page errors: ${R.errors[0].slice(0, 160)}`);
  now[d.id] = R.shownF;
}
/* (load-perf, the lab's run 20, 2026-11-14) on a page with the opening's still, no program is issued before the still's
   file is in (its resource entry; then its decode and paint: afterStill), and a still that never comes holds the boot
   no longer than STILL_WAIT (1 s, 60 frames here) past the moment it would have begun: the reference phone, the still in at frame 30
   and never */
{
  const d = FP.DEVICES.find((x) => x.id === 'phone'), w = d.wins[0], V = { dev: d, n: 0, seed: 0x9e3779b9, hour: 11.5, w: w[0], h: w[1], dpr: w[2], hz: 60, t0: 200 };
  const A = await FP.run(V, page, { still: 30 }), B = await FP.run(V, page, { still: 1e9 });
  if (!(A.stillF === 30 && A.firstShaderF > A.stillF && A.shown)) bad.push(`the still in at frame ${A.stillF}: the first program issued at frame ${A.firstShaderF} (it must come after the still), shown ${A.shown}`);
  if (!(B.shown && B.firstShaderF > 0 && B.firstShaderF <= 70)) bad.push(`a still that never comes: the first program at frame ${B.firstShaderF}, shown ${B.shown} (the boot must go on by about frame 62)`);
  if (!bad.length) console.log(`boot: the still in at frame 30, the first program at ${A.firstShaderF}; no still, at ${B.firstShaderF}`);
}
if (WRITE) { fs.writeFileSync(GOLD, JSON.stringify(now, null, 1) + '\n'); console.log('boot: wrote ' + path.relative(ROOT, GOLD) + ': ' + JSON.stringify(now)); process.exit(bad.length ? 1 : 0); }
const gold = JSON.parse(fs.readFileSync(GOLD, 'utf8')), better = [];
for (const [id, f] of Object.entries(now)) {
  if (!(id in gold)) bad.push(`${id}: no count in ${path.relative(ROOT, GOLD)} (node test/sims/boot.mjs ${site} --write)`);
  else if (f > gold[id]) bad.push(`${id}: the world shows at frame ${f}, was ${gold[id]} (a boot regression)`);
  else if (f < gold[id]) better.push(`${id} ${gold[id]} -> ${f}`);
}
for (const b of bad) console.log('::error::boot: ' + b);
if (better.length) console.log('::notice::boot: sooner (' + better.join(', ') + '): node test/sims/boot.mjs ' + site + ' --write');
if (!bad.length) console.log('boot: frames to the show ' + Object.entries(now).map(([k, v]) => k + ' ' + v).join(', ') + ' (at most the golden counts)');
process.exit(bad.length ? 1 : 0);
