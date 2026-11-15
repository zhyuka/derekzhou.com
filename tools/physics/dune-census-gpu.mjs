// dune-census-gpu.mjs (tools/physics): the dunes' slopes from the shipped GLSL (physics: sand/S1). The page's own probe
// program (the camera's ground, as tools/ground-site.mjs hooks it), under SwiftShader on the T1 harness's NVIDIA persona
// (the split height passes run): the land alone (probe mode 0, Hd), read on a grid; slopes by central differences. Prints the slopes' percentiles, the mode between 20 and 40 deg (a slip face's angle) and the share
// over 34 deg (sand's angle of repose is 32-34 deg).
//   node tools/physics/dune-census-gpu.mjs [ROOT] [--half 500] [--cell 2] [--seed 3] [--where 1]   (where: the over-34 deg points by 50 m cell)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import url from 'node:url';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2), root = args[0] && !args[0].startsWith('--') ? path.resolve(args[0]) : path.resolve(HERE, '../..');
const A = {}; for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) A[args[i].slice(2)] = args[i + 1];
const HALF = +(A.half || 500), CELL = +(A.cell || 2), SEED = +(A.seed || 3);
const { HOOK } = await import(url.pathToFileURL(path.join(HERE, '../ground-site.mjs')).href);
import { execFileSync } from 'node:child_process';
// the ground hook asking the probe for the land alone (mode 0: Hd), not the camera's ground (mode 1: over the cloud sea too)
const LAND_HOOK = HOOK.replace('probeJob(V, pts, m, 1, true)', 'probeJob(V, pts, m, 0, true)');
if (LAND_HOOK === HOOK) throw new Error('dune-census-gpu: the ground hook\'s probe call not found');
function hookedSite(root, out) {   // (as tools/ground-site.mjs's, with the land hook)
  const site = path.join(out, 'site');
  execFileSync(process.execPath, [path.join(root, 'tools/build.mjs'), '--plain', site], { cwd: root, stdio: 'ignore' });
  execFileSync(process.execPath, [path.join(root, 'tools/parts.mjs'), 'assemble', '--min-glsl', path.join(root, 'src'), path.join(out, 'ship')], { cwd: root, stdio: 'ignore' });
  const readable = fs.readFileSync(path.join(out, 'ship', 'world.js'), 'utf8'), end = readable.lastIndexOf('})();');
  fs.writeFileSync(path.join(site, 'world.js'), readable.slice(0, end) + LAND_HOOK + readable.slice(end));
  return site;
}
const { serve } = await import(url.pathToFileURL(path.join(HERE, '../../.github/ci/serve.mjs')).href);
const H = await import(url.pathToFileURL(path.join(HERE, '../../.github/ci/harness.mjs')).href);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dune-census-'));
const site = hookedSite(root, tmp);
const S = await serve(site), br = await H.launch();
try {
  const arm = await H.openPage(br, S.url, { vp: [1440, 900, 1], persona: 'nvidia', epoch: Date.parse('2026-11-05T12:00:00Z'), seeds: [SEED] });
  await H.stepToShow(arm);
  const n = Math.round(2 * HALF / CELL) + 1, h = new Float64Array(n * n), w = new Float64Array(n * n);
  for (let j0 = 0; j0 < n; j0 += 30) {
    const xz = []; for (let j = j0; j < Math.min(n, j0 + 30); j++) for (let i = 0; i < n; i++) xz.push(-HALF + i * CELL, -HALF + j * CELL);
    const r = await arm.page.evaluate((a) => self.__GROUND(a), xz);
    if (!r) throw new Error('the world did not show its ground');
    for (let k = 0; k < r.h.length; k++) { h[j0 * n + k] = r.h[k]; w[j0 * n + k] = r.w[k]; }
  }
  const sl = [], where = {}; let over34 = 0;
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
    const k = j * n + i;
    const gx = (h[k + 1] - h[k - 1]) / (2 * CELL), gz = (h[k + n] - h[k - n]) / (2 * CELL), d = Math.atan(Math.hypot(gx, gz)) * 180 / Math.PI;
    sl.push(d); if (d > 34) { over34++; if (A.where) { const key = Math.floor((-HALF + i * CELL) / 50) + ',' + Math.floor((-HALF + j * CELL) / 50); (where[key] = where[key] || { n: 0, h: h[k], max: 0 }).n++; where[key].max = Math.max(where[key].max, d); } }
  }
  sl.sort((a, b) => a - b);
  const pc = (q) => +sl[Math.min(sl.length - 1, Math.floor(q * sl.length))].toFixed(1);
  const hist = new Array(41).fill(0); for (const d of sl) if (d >= 20 && d < 40) hist[Math.floor(d)]++;
  const out = { root: path.basename(root), seed: SEED, points: sl.length, p50: pc(0.5), p90: pc(0.9), p99: pc(0.99), mode_20_40: hist.indexOf(Math.max(...hist)), over34_pct: +(100 * over34 / sl.length).toFixed(2), steepest: +sl[sl.length - 1].toFixed(1) };
  console.log(JSON.stringify(out));
  if (A.where) console.log('over 34 deg by 50 m cell (x,z: count, height, steepest):', JSON.stringify(Object.entries(where).sort((a, b) => b[1].n - a[1].n).slice(0, 12).map(([k, v]) => k + ': ' + v.n + ', ' + v.h.toFixed(1) + ' m, ' + v.max.toFixed(1))));
  await arm.ctx.close();
} finally { await br.close(); await S.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
