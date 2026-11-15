// record-ground.mjs (tools/gpu, the PC's RTX 4090): the land's real ground for the sims, read from the world itself.
//   node tools/gpu/record-ground.mjs [--seed 11] [--half 1500] [--cell 10]
// Builds the site, puts the readable world.js in its place with a probe hook at its end (this copy only, never
// served), opens it headless on the 4090 with the visit's entropy fixed by the seed, waits for the world's show, then
// asks its own probe program for the camera's ground (mode 1: what the ink birds' host reads) and its CPU maps for the
// sea of cloud's weight (kitAt) on a grid of cell metres, half metres about the landing. Writes
// test/golden/ground/<seed>.bin (float32: the heights, then the sea's weights, row by row from x0, z0) and <seed>.json
// (the grid, the renderer, the sea's level constants). The page is tools/ground-site.mjs's, the one
// tools/ground-fresh.mjs reads under SwiftShader in every check (37-ground-fresh): a recording that is not today's
// world's fails there.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
import { DIR } from '../../test/ground.mjs';
import { hookedSite } from '../ground-site.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..'), PW = createRequire(import.meta.url)('./pw.js');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const seed = +(A.seed || 11), half = +(A.half || 1500), cell = +(A.cell || 10), n = Math.round(2 * half / cell) + 1, x0 = -half, z0 = -half;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ground-')), site = hookedSite(ROOT, tmp);
const port = 9930 + Math.floor(Math.random() * 40), srv = spawn(process.execPath, [path.join(HERE, 'cfserve.js'), site, String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const br = await PW.chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  // (the moment tools/ground-fresh.mjs reads the ground at, in its time zone: the visit opens on the same sky, and the camera's
  // ground over the mist pools is the same depth (delight-weather 1: the pools' depth is the sky's); the clock runs on from it)
  const p = await (await br.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'UTC' })).newPage();
  await p.clock.install({ time: Date.parse('2026-11-05T12:00:00Z') });
  await p.addInitScript((s) => { crypto.getRandomValues = function (a) { const u = new Uint32Array(a.buffer, a.byteOffset, a.byteLength >> 2); for (let i = 0; i < u.length; i++) u[i] = (s + i * 0x9e3779b9) >>> 0; return a; }; }, seed);
  await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  try { await p.waitForFunction(() => self.__GROUND && self.__GROUND([0, 0]) !== null, null, { timeout: 60000 }); }
  catch (e) { const st = await p.evaluate(() => ({ hook: typeof self.__GROUND, on: document.querySelector('canvas.sky').classList.contains('on') })); throw new Error('record-ground: the world did not show: ' + JSON.stringify(st) + ' ' + errs.slice(0, 3).join(' / ')); }
  const H = new Float32Array(n * n), W = new Float32Array(n * n); let meta = null;
  for (let j0 = 0; j0 < n; j0 += 40) {   // (40 rows a call: under the probe's 16,384 points a batch)
    const xz = []; for (let j = j0; j < Math.min(n, j0 + 40); j++) for (let i = 0; i < n; i++) xz.push(x0 + i * cell, z0 + j * cell);
    const r = await p.evaluate((a) => self.__GROUND(a), xz);
    for (let k = 0; k < r.h.length; k++) { H[j0 * n + k] = r.h[k]; W[j0 * n + k] = r.w[k]; }
    meta = meta || r;
  }
  fs.mkdirSync(DIR, { recursive: true });
  const both = new Float32Array(2 * n * n); both.set(H); both.set(W, n * n);
  fs.writeFileSync(path.join(DIR, seed + '.bin'), Buffer.from(both.buffer));
  let lo = Infinity, hi = -Infinity; for (const v of H) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const J = { seed, x0, z0, cell, n, seaLo: meta.seaLo, rise: meta.rise, renderer: meta.renderer, heights: [+lo.toFixed(2), +hi.toFixed(2)],
    what: "the camera's ground (the world's probe, mode 1) and the sea of cloud's weight (kitAt) on a grid about the landing; float32, heights then weights, row by row from x0, z0" };
  fs.writeFileSync(path.join(DIR, seed + '.json'), JSON.stringify(J, null, 1) + '\n');
  console.log(`record-ground: seed ${seed}: ${n} x ${n} points every ${cell} m about the landing, heights ${J.heights.join(' to ')} m, on ${meta.renderer}`);
} finally { await br.close(); srv.kill(); fs.rmSync(tmp, { recursive: true, force: true }); }
