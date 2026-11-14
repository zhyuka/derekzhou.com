// ground-fresh.mjs: is every recorded ground (test/golden/ground/<seed>.bin, the 4090's: tools/gpu/record-ground.mjs)
// today's world's? (tools/checks/37-ground-fresh.sh)
//   node tools/ground-fresh.mjs [--step 3]
// Builds the page the recorder reads (tools/ground-site.mjs, from this checkout's sources), opens it under SwiftShader
// as the 4090 opens it (the visit's entropy fixed by the seed, the split height's device), and reads the world's own
// probe and kitAt at every step-th point of each recording's grid: a height off by more than TOL.h, or a sea weight by
// more than TOL.w, fails, saying where and how to re-record. Nothing is listed: whatever the ground is made of (the
// seed's opening, the kits, the probe's composition) is read where it lands.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import * as H from '../.github/ci/harness.mjs';
import { serve } from '../.github/ci/serve.mjs';
import { DIR, ROOT, RERECORD } from '../test/ground.mjs';
import { hookedSite, points, measure, TOL } from './ground-site.mjs';

const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const step = +(A.step || 3);
const metas = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))) : [];
if (!metas.length) { console.log('::error::no recorded ground (test/golden/ground/): ' + RERECORD); process.exitCode = 1; }
else {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ground-fresh-')), S = await serve(hookedSite(ROOT, tmp)), br = await H.launch();
  let bad = 0;
  try {
    for (const meta of metas) {
      const b = fs.readFileSync(path.join(DIR, meta.seed + '.bin')), all = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
      const arm = await H.openPage(br, S.url, { vp: [1440, 900, 1], persona: 'nvidia', epoch: Date.parse('2026-11-05T12:00:00Z'), seeds: [meta.seed] });
      await H.stepToShow(arm);
      const { idx, xz } = points(meta, step), got = { h: [], w: [] };
      for (let k = 0; k < xz.length; k += 2 * 16000) { const r = await arm.page.evaluate((a) => self.__GROUND(a), xz.slice(k, k + 2 * 16000)); if (!r) throw new Error('the world did not show its ground: ' + arm.logs.slice(0, 3).join(' / ')); got.h.push(...r.h); got.w.push(...r.w); }
      await arm.ctx.close();
      const m = measure(meta, all, idx, got), say = `seed ${meta.seed}: ${m.n} points, heights within ${m.dh.toFixed(4)} m, sea weights within ${m.dw.toExponential(1)}`;
      if (m.off) { bad = 1; console.log(`::error::test/golden/ground/${meta.seed}.bin is not today's world: ${m.off} of ${m.n} points off (more than ${TOL.h} m or ${TOL.w}), the worst at x ${m.worst.x}, z ${m.worst.z}: recorded ${m.worst.recorded.toFixed(2)} m, now ${m.worst.now.toFixed(2)} m (${say}): re-record: ${RERECORD} --seed ${meta.seed}`); }
      else console.log('ground: ' + say + ', as recorded');
    }
  } finally { await br.close(); await S.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
  process.exitCode = bad;
}
