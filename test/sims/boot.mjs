// test/sims/boot.mjs: the boot on the fake page (test/fakepage.cjs), in seconds and without a GPU: each of the five device
// profiles (the reference desktop, a phone, WebKit, a half-float desktop, a byte-target phone) visited once, the world's
// frames to its show counted, against test/golden/boot-frames.json. A boot that needs more frames to show, or no longer
// shows, fails; one that needs fewer passes and says so (node test/sims/boot.mjs SITE --write records the new counts).
// The fake page's compiles and fences finish at once, so the count is the boot's own staging, not a GPU's speed.
//   node test/sims/boot.mjs build/site [--write]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), FP = require('../fakepage.cjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), GOLD = path.join(ROOT, 'test/golden/boot-frames.json'), GOLDB = path.join(ROOT, 'test/golden/boot-bakes.json');
const site = process.argv[2], WRITE = process.argv.includes('--write');
if (!site || !fs.existsSync(path.join(site, 'index.html'))) { console.error('usage: node test/sims/boot.mjs SITE_DIR [--write]'); process.exit(2); }
const page = FP.loadScripts(site, FP.scriptsOf(site)), now = {}, bakes = {}, bad = [];
for (const d of FP.DEVICES) {
  const w = d.wins[0], R = await FP.run({ dev: d, n: 0, seed: 0x9e3779b9, hour: 11.5, w: w[0], h: w[1], dpr: w[2], hz: 60, t0: 200 }, page);
  if (!R.shown) bad.push(`${d.id}: the world never showed (${R.frames} frames${R.errors.length ? '; ' + R.errors[0].slice(0, 120) : ''})`);
  else if (R.errors.length) bad.push(`${d.id}: page errors: ${R.errors[0].slice(0, 160)}`);
  now[d.id] = R.shownF; bakes[d.id] = { vox: R.vox, draws: R.draws };
}
/* (load-perf, the lab's runs 20 and 21, 2026-11-14) on a page with the opening's still, the programs' batch and its one
   flush wait for the still's file (its resource entry; then its decode and paint: afterStill), while the boot's stages
   A and B (the context, the objects) do not wait; a still that never comes holds the batch no longer than STILL_WAIT
   (1 s, 60 frames here): the reference phone, the still in at frame 30 and never */
{
  const d = FP.DEVICES.find((x) => x.id === 'phone'), w = d.wins[0], V = { dev: d, n: 0, seed: 0x9e3779b9, hour: 11.5, w: w[0], h: w[1], dpr: w[2], hz: 60, t0: 200 };
  const A = await FP.run(V, page, { still: 30 }), B = await FP.run(V, page, { still: 1e9 });
  if (!(A.stillF === 30 && A.flushF > A.stillF && A.shown)) bad.push(`the still in at frame ${A.stillF}: the programs' batch flushed at frame ${A.flushF} (it must come after the still), shown ${A.shown}`);
  if (!(A.ctxF >= 0 && A.ctxF < A.stillF)) bad.push(`the still in at frame ${A.stillF}: the context made at frame ${A.ctxF} (the boot's stages A and B must not wait for the still)`);
  if (!(B.shown && B.flushF > 0 && B.flushF <= 70)) bad.push(`a still that never comes: the batch flushed at frame ${B.flushF}, shown ${B.shown} (it must go on by about frame 62)`);
  if (!bad.length) console.log(`boot: the still in at frame 30: the context at ${A.ctxF}, the batch at ${A.flushF}; no still: the batch at ${B.flushF}`);
}
/* (load-perf, the audit's boot-fence-gated-poll, 2026-11-14) no program's status is read before the fence behind the
   batch signals: a GPU process busy 40 frames with the batch (a serial compile) holds the first read off 40 frames, and
   the world still shows; a fence that never signals holds it no longer than PFENCE_MAX (600 frames) */
{
  const d = FP.DEVICES.find((x) => x.id === 'phone'), w = d.wins[0], V = { dev: d, n: 0, seed: 0x9e3779b9, hour: 11.5, w: w[0], h: w[1], dpr: w[2], hz: 60, t0: 200 };
  const A = await FP.run(V, page, {}), B = await FP.run(V, page, { fenceLag: 40 });
  if (!(B.shown && B.statusF >= B.flushF + 40)) bad.push(`a fence 40 frames late: the batch flushed at frame ${B.flushF}, the first status read at ${B.statusF} (it must wait for the fence), shown ${B.shown}`);
  if (!(A.statusF > A.flushF && A.statusF <= A.flushF + 2)) bad.push(`a fence at once: the first status read at frame ${A.statusF}, the batch at ${A.flushF} (it must come the next frame)`);
  /* (the hub's review) and the late ink birds' reads too: their file in at frame 10, after stage B, their programs
     issued late with a fence of their own; no status read, theirs or the boot's, before it signals 40 frames on */
  const C = await FP.run(V, page, { fenceLag: 40, lateScript: ['inkbirds.js', 10] });
  if (!(C.shown && C.lateF === 10 && C.lateStatusF >= 50 && C.statusF >= 50)) bad.push(`the ink birds in at frame ${C.lateF} with fences 40 frames late: the first status read after them at ${C.lateStatusF}, the first at all at ${C.statusF} (none before 50), shown ${C.shown}`);
  if (!bad.length) console.log(`boot: the first status read ${A.statusF - A.flushF} frame(s) after the batch; with the fence 40 frames late, ${B.statusF - B.flushF}; the ink birds late at frame 10, the first read at ${C.lateStatusF}`);
}
if (WRITE) {
  fs.writeFileSync(GOLD, JSON.stringify(now, null, 1) + '\n'); fs.writeFileSync(GOLDB, JSON.stringify(bakes, null, 1) + '\n');
  console.log('boot: wrote ' + path.relative(ROOT, GOLD) + ': ' + JSON.stringify(now) + ' and ' + path.relative(ROOT, GOLDB) + ': ' + JSON.stringify(bakes)); process.exit(bad.length ? 1 : 0);
}
const gold = JSON.parse(fs.readFileSync(GOLD, 'utf8')), better = [];
for (const [id, f] of Object.entries(now)) {
  if (!(id in gold)) bad.push(`${id}: no count in ${path.relative(ROOT, GOLD)} (node test/sims/boot.mjs ${site} --write)`);
  else if (f > gold[id]) bad.push(`${id}: the world shows at frame ${f}, was ${gold[id]} (a boot regression)`);
  else if (f < gold[id]) better.push(`${id} ${gold[id]} -> ${f}`);
}
/* (load-perf, 2026-11-25: #494's sixth layout scale, its three empty 16 km cells, moved which cloud bodies the boot
   bakes before the show: the phone's 3D texels +14.5%, its draws +88, the gate's paint +138 ms, while the frames to the
   show stayed 5) the boot's GPU work before the show, on the same fake page: the 3D texels it makes (the noise and every
   cloud body baked for the first frame) and its draw calls (the bakes' slices among them), each device against
   test/golden/boot-bakes.json; more than BAKE_TOL over fails (the fake page is exact: the same build, the same counts),
   less passes and says so */
const BAKE_TOL = 0.03, goldB = fs.existsSync(GOLDB) ? JSON.parse(fs.readFileSync(GOLDB, 'utf8')) : {};
for (const [id, b] of Object.entries(bakes)) {
  const g = goldB[id];
  if (!g) { bad.push(`${id}: no bake counts in ${path.relative(ROOT, GOLDB)} (node test/sims/boot.mjs ${site} --write)`); continue; }
  for (const [k, what] of [['vox', '3D texels'], ['draws', 'draw calls']]) {
    if (b[k] > g[k] * (1 + BAKE_TOL)) bad.push(`${id}: the boot makes ${b[k]} ${what} before the show, was ${g[k]} (+${((b[k] / g[k] - 1) * 100).toFixed(1)}%, over ${BAKE_TOL * 100}%: more GPU work before the first frame)`);
    else if (b[k] < g[k] * (1 - BAKE_TOL)) better.push(`${id} ${what} ${g[k]} -> ${b[k]}`);
  }
}
for (const b of bad) console.log('::error::boot: ' + b);
if (better.length) console.log('::notice::boot: sooner or lighter (' + better.join(', ') + '): node test/sims/boot.mjs ' + site + ' --write');
if (!bad.length) console.log('boot: frames to the show ' + Object.entries(now).map(([k, v]) => k + ' ' + v).join(', ') + ' (at most the golden counts); before it, 3D texels and draws ' + Object.entries(bakes).map(([k, v]) => k + ' ' + v.vox + '/' + v.draws).join(', ') + ' (within ' + BAKE_TOL * 100 + '% of the golden)');
process.exit(bad.length ? 1 : 0);
