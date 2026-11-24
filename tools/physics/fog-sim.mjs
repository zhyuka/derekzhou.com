// fog-sim.mjs (tools/physics): the fog pools (src/world/234-fog-pools.js) against the land at AIR's fog sites
// (216-events.js), from the page's own probe. For each opening: the fog sites within --reach m of the landing (after the
// cut, when the read's sites exist), and for each the basin as 234 reads it (its own fogPts, the land's height, mode 0):
// the hollow 234 picks in the ring the site drains (fogPick: its distance from the site, floor, rim, the hollow's depth),
// the pool's depth at --mist m of the flats' mist, whether the rim held it, and the share of the basin under its top
// (a 32 x 32 grid within r: the fine floor beside 234's coarse one). Prints a JSON line a
// site and a summary.
//   node tools/physics/fog-sim.mjs [ROOT] [--seeds 0-15] [--reach 12000] [--mist 10]
import fs from 'fs';
import os from 'os';
import path from 'path';
import url from 'url';
import { execFileSync } from 'child_process';

const A = {}; for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i]; if (k.startsWith('--')) A[k.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true; else A.root = k; }
const HERE = path.dirname(url.fileURLToPath(import.meta.url)), root = path.resolve(A.root || path.join(HERE, '../..'));
const SEEDS = (A.seeds || '0-15').split(',').flatMap((s) => { const [a, b] = s.split('-').map(Number); return b === undefined ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i); });
const REACH = +(A.reach || 12000), MIST = +(A.mist || 10);
const HOOK = `
  /* (tools/physics/fog-sim.mjs, this copy only, never served) the fog sites near a point and their basins, as 234 reads them */
  self.__FOG = function (x, z, reach, mist) {
    var V = SIM.V; if (!V || !READY || !shown || !AFTER) return null;
    var S = eventsNear(x, z, reach).filter(function (s) { return s.kind === 'fogpool'; }), out = [];
    S.forEach(function (s) {
      var p = fogPts(s), J = probeJob(V, new Float32Array(p), p.length / 2, 0, true), b = fogPick(s, p, J.h), row = { id: s.id, d: Math.round(s.d), r: Math.round(s.r), sea: +kitAt(s.x, s.z).wC.toFixed(2), want: evPoolDepth(s, mist) };
      if (!b) { row.hollow = 0; row.depth = 0; out.push(row); return; }
      var top = Math.min(b[2] + evPoolDepth(s, mist), b[3] - FOG_SPILL), N = 32, g = [], i, n = 0, under = 0, lo = 1e9, dx, dz;
      for (i = 0; i < N * N; i++) g.push(b[0] + s.r * (2 * (i % N + 0.5) / N - 1), b[1] + s.r * (2 * (((i / N) | 0) + 0.5) / N - 1));
      var G = probeJob(V, new Float32Array(g), N * N, 0, true);
      for (i = 0; i < N * N; i++) { dx = g[2 * i] - b[0]; dz = g[2 * i + 1] - b[1]; if (dx * dx + dz * dz <= s.r * s.r) { n++; lo = Math.min(lo, G.h[i]); if (G.h[i] < top) under++; } }
      row.moved = Math.round(Math.hypot(b[0] - s.x, b[1] - s.z)); row.floor = +b[2].toFixed(1); row.fineFloor = +lo.toFixed(1); row.rim = +b[3].toFixed(1);
      row.hollow = +(b[3] - b[2]).toFixed(1); row.depth = +Math.max(0, top - b[2]).toFixed(1); row.heldByRim = b[2] + evPoolDepth(s, mist) > b[3] - FOG_SPILL; row.under_pct = +(100 * under / Math.max(1, n)).toFixed(1);
      out.push(row);
    });
    return out;
  };
`;
function site(out) {
  const s = path.join(out, 'site');
  execFileSync(process.execPath, [path.join(root, 'tools/build.mjs'), '--plain', s], { cwd: root, stdio: 'ignore' });
  execFileSync(process.execPath, [path.join(root, 'tools/parts.mjs'), 'assemble', '--min-glsl', path.join(root, 'src'), path.join(out, 'ship')], { cwd: root, stdio: 'ignore' });
  const w = fs.readFileSync(path.join(out, 'ship', 'world.js'), 'utf8'), end = w.lastIndexOf('})();');
  fs.writeFileSync(path.join(s, 'world.js'), w.slice(0, end) + HOOK + w.slice(end));
  return s;
}
const { serve } = await import(url.pathToFileURL(path.join(root, '.github/ci/serve.mjs')).href);
const H = await import(url.pathToFileURL(path.join(root, '.github/ci/harness.mjs')).href);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fog-sim-'));
const S = await serve(site(tmp)), br = await H.launch(), rows = [];
try {
  for (const seed of SEEDS) {
    const arm = await H.openPage(br, S.url, { vp: [480, 300, 1], persona: 'generic', epoch: Date.parse('2026-11-05T06:30:00Z'), seeds: [seed] });
    await H.stepToShow(arm); await H.step(arm, 4);   // (the cut: the frame after the show)
    const r = await arm.page.evaluate(([R, M]) => self.__FOG(0, 0, R, M), [REACH, MIST]);
    if (!r) throw new Error('the world did not show, or the cut has not come (seed ' + seed + ')');
    for (const x of r) { const row = { seed, ...x }; rows.push(row); console.log(JSON.stringify(row)); }
    if (!r.length) console.log(JSON.stringify({ seed, sites: 0 }));
    await arm.ctx.close();
  }
} finally { await br.close(); S.close && S.close(); }
const q = (k) => rows.map((r) => r[k]).sort((a, b) => a - b), med = (k) => { const v = q(k); return v.length ? v[v.length >> 1] : null; };
console.log(JSON.stringify({ mist: MIST, reach: REACH, sites: rows.length, with_pool: rows.filter((r) => r.depth > 0.5).length, held_by_rim: rows.filter((r) => r.heldByRim).length, hollow_p50: med('hollow'), depth_p50: med('depth'), under_p50: med('under_pct') }));
process.exit(0);
