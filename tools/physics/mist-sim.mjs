// mist-sim.mjs (tools/physics): the mist pools against the land of the 16 openings, from the page's own probe
// (delight-weather 1: mist in the dune troughs and at the mesa feet). For each opening, on a 10 m grid within 1 km of
// the landing: the land (probe mode 0, Hd), the camera's ground (mode 1, over the cloud sea too) and the ground the
// dunes stand on and the sand weight (the swell, the basins' and the sink's change in, and wD: the pools' floor and their reach), read under SwiftShader on
// the T1 harness's generic persona. The pool's top is that floor + D x the sand weight (D the sky's depth: AIR_MIST, airWx).
// Prints, per opening and in all, at the deepest sky: the share of the ground under the mist (its depth over 0.75 m:
// half opaque), the share of the crests clear (local highs over 50 m), the share where the pool's top would stand over
// the camera's lowest (its ground + clear[0], 7 m: in the flight band) without the camera's ground reading the pools,
// and the rim's speed (the level's rate over the slope at the rim) at the rate the level may move.
//   node tools/physics/mist-sim.mjs [ROOT] [--seeds 0-15] [--radius 1000] [--cell 10] [--depth 10] [--rate 0.085]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import url from 'node:url';
import { execFileSync } from 'node:child_process';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2), root = args[0] && !args[0].startsWith('--') ? path.resolve(args[0]) : path.resolve(HERE, '../..');
const A = {}; for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) A[args[i].slice(2)] = args[i + 1];
const R = +(A.radius || 1000), CELL = +(A.cell || 10), D = +(A.depth || 10), RATE = +(A.rate || 0.085), CLEAR0 = 7;
const SEEDS = (A.seeds || '0-15').split(',').flatMap((s) => { const [a, b] = s.split('-').map(Number); return b === undefined ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i); });
const { HOOK } = await import(url.pathToFileURL(path.join(HERE, '../ground-site.mjs')).href);
// the hook: the probe's mode from the page's call; the floor's points asked with x + 1e6, the sand weight's with x + 2e6
// (this copy's probe answers them with the floor, as mistTopAt makes it, and 1000 x wD)
const MHOOK = HOOK.replace('self.__GROUND = function (xz) {', 'self.__GROUND = function (xz, pm) {').replace('probeJob(V, pts, m, 1, true)', 'probeJob(V, pts, m, pm, true)');
const CAMHOOK = '\n  self.__CAM = function () { return [CAM.pos[0], CAM.pos[2], (SIM.V && SIM.V.L && SIM.V.L.mist) || 0]; };\n';   // (and the live pools' depth: the camera's ground reads their top)
if (MHOOK === HOOK || !MHOOK.includes('probeJob(V, pts, m, pm, true)')) throw new Error('mist-sim: the ground hook not as expected');
const PROBE_AT = 'float hgt(vec2 p, bool cam) { ';
const PROBE_FLOOR = PROBE_AT + 'if (p.x > 5e5) { bool wq = p.x > 1.5e6; vec2 q = vec2(p.x - (wq ? 2e6 : 1e6), p.y); vec3 wD, wC, lv, sk; kitW4(q, wD, wC, lv, sk); ' +
  'gMS = vec2(1.0, 0.0); ivec2 c0 = ivec2(floor(q / DS)); for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { Site S = siteOf(c0 + ivec2(i, j)); if (S.kind == 1 || S.kind == 2) basinOf(q, vec3(0.0), S); } ' +
  'return wq ? 1000.0 * wD.x : swell(q) * gMS.x + gMS.y - sk.x; } ';   // (the floor as mistTopAt makes it: the basins and the sink in)
function site(out) {
  const s = path.join(out, 'site');
  execFileSync(process.execPath, [path.join(root, 'tools/build.mjs'), '--plain', s], { cwd: root, stdio: 'ignore' });
  execFileSync(process.execPath, [path.join(root, 'tools/parts.mjs'), 'assemble', '--min-glsl', path.join(root, 'src'), path.join(out, 'ship')], { cwd: root, stdio: 'ignore' });
  let w = fs.readFileSync(path.join(out, 'ship', 'world.js'), 'utf8');
  if (w.split(PROBE_AT).length !== 2) throw new Error('mist-sim: the probe\'s hgt() not found once');
  w = w.replace(PROBE_AT, PROBE_FLOOR);
  // (the one-program probe, which this copy patches: never the split's passes)
  if (w.split('EXT.hp = !!(').length !== 2) throw new Error('mist-sim: the split\'s switch not found once');
  w = w.replace('EXT.hp = !!(', 'EXT.hp = false && !!(');
  const end = w.lastIndexOf('})();');
  fs.writeFileSync(path.join(s, 'world.js'), w.slice(0, end) + MHOOK + CAMHOOK + w.slice(end));
  return s;
}
const { serve } = await import(url.pathToFileURL(path.join(HERE, '../../.github/ci/serve.mjs')).href);
const H = await import(url.pathToFileURL(path.join(HERE, '../../.github/ci/harness.mjs')).href);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mist-sim-'));
const S = await serve(site(tmp)), br = await H.launch(), all = { pts: 0, under: 0, crests: 0, clear: 0, band: 0, rims: [] }, rows = [];
try {
  for (const seed of SEEDS) {
    const arm = await H.openPage(br, S.url, { vp: [480, 300, 1], persona: 'generic', epoch: Date.parse('2026-11-05T06:30:00Z'), seeds: [seed] });
    await H.stepToShow(arm);
    const c = await arm.page.evaluate(() => self.__CAM());
    const n = Math.round(2 * R / CELL) + 1, at = (i, j) => [c[0] - R + i * CELL, c[1] - R + j * CELL];
    const read = async (pm, off) => {
      const out = new Float64Array(n * n);
      for (let j0 = 0; j0 < n; j0 += 20) {
        const xz = []; for (let j = j0; j < Math.min(n, j0 + 20); j++) for (let i = 0; i < n; i++) { const p = at(i, j); xz.push(p[0] + off, p[1]); }
        const r = await arm.page.evaluate(([a, m]) => self.__GROUND(a, m), [xz, pm]);
        if (!r) throw new Error('the world did not show its ground (seed ' + seed + ')');
        for (let k = 0; k < r.h.length; k++) out[j0 * n + k] = r.h[k];
      }
      return out;
    };
    const land = await read(0, 0), cam = await read(1, 0), floor = await read(0, 1e6), wk = await read(0, 2e6);
    const wt = wk.map((v) => v / 1000);
    if (A.debug) console.log('floor', Array.from(floor.slice(0, 4)), 'wt', Array.from(wt.slice(0, 4)), 'land', Array.from(land.slice(0, 4)));
    const s = { seed, pts: 0, under: 0, crests: 0, clear: 0, band: 0, rims: [] };
    for (let j = 2; j < n - 2; j++) for (let i = 2; i < n - 2; i++) {
      const k = j * n + i, [x, z] = at(i, j); if (Math.hypot(x - c[0], z - c[1]) > R) continue;
      if (cam[k] > Math.max(land[k], c[2] > 0 ? floor[k] + c[2] * wt[k] : -1e4) + 0.5) continue;   // (under the cloud sea: not land; the camera's ground over the live pools' top too)
      const top = floor[k] + D * wt[k], depth = top - land[k];
      s.pts++; if (depth > 0.75) s.under++;
      if (top > Math.max(land[k], cam[k] > land[k] + 0.5 && c[2] <= 0 ? cam[k] : land[k]) + CLEAR0 - 1) s.band++;   // (the camera's lowest over the land, had its ground not read the pools)
      let hi = true; for (let b = -5; b <= 5 && hi; b++) for (let a = -5; a <= 5; a++) { const q = (j + b) * n + i + a; if (q >= 0 && q < n * n && land[q] > land[k]) { hi = false; break; } }
      if (hi && i > 5 && j > 5 && i < n - 6 && j < n - 6) { s.crests++; if (depth < 0.75) s.clear++; }
      if (Math.abs(depth - 0.75) < 0.75) { const gx = (land[k + 1] - land[k - 1]) / (2 * CELL), gz = (land[k + n] - land[k - n]) / (2 * CELL); s.rims.push(RATE / Math.max(Math.hypot(gx, gz), 1e-3)); }
    }
    s.rims.sort((a, b) => a - b);
    const q = (a, f) => a.length ? +a[Math.min(a.length - 1, Math.floor(f * a.length))].toFixed(2) : null;
    if (!s.pts) { console.log(JSON.stringify({ seed, land: 0 })); await arm.ctx.close(); continue; }
    const row = { seed, under_pct: +(100 * s.under / s.pts).toFixed(1), crests_clear_pct: +(100 * s.clear / Math.max(1, s.crests)).toFixed(1), crests: s.crests, band_pct: +(100 * s.band / s.pts).toFixed(2), rim_speed_p50: q(s.rims, 0.5), rim_speed_p90: q(s.rims, 0.9), sand: +(wt.reduce((a, b) => a + b, 0) / wt.length).toFixed(2) };
    rows.push(row); console.log(JSON.stringify(row));
    for (const key of ['pts', 'under', 'crests', 'clear', 'band']) all[key] += s[key]; all.rims.push(...s.rims);
    await arm.ctx.close();
  }
  all.rims.sort((a, b) => a - b);
  const q = (f) => +all.rims[Math.min(all.rims.length - 1, Math.floor(f * all.rims.length))].toFixed(2);
  console.log(JSON.stringify({ depth: D, rate: RATE, openings: rows.length, under_pct: +(100 * all.under / all.pts).toFixed(1), under_range: [Math.min(...rows.map((r) => r.under_pct)), Math.max(...rows.map((r) => r.under_pct))], crests_clear_pct: +(100 * all.clear / all.crests).toFixed(1), band_pct: +(100 * all.band / all.pts).toFixed(2), rim_speed_p50: q(0.5), rim_speed_p90: q(0.9), rim_speed_p99: q(0.99) }));
} finally { await br.close(); await S.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
