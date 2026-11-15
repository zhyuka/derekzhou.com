// tools/visit/headings.mjs: each land's first heading, chosen by the visit ruler (delight-visit 5.2, curated openings'
// step 2). For each of the 16 lands: every 5 deg of heading flown SHORT s (the first near pass, the first place in
// sight), then the headings with a near pass by NEAR_BY s flown the whole 2 h for every hour and READS reads (the
// longest stretch with no reward, the place stretch); the pick is the one with the least longest gap, its first near
// pass by NEAR_BY s, the land's own heading kept where it already meets them. The stills' score (the subject, nothing
// busy under the words, the night's feature: PC GPU's) is the bake's to give the picks after.
//   node tools/visit/headings.mjs [--k 0,1] [--top 5] [--reads 2] [--json FILE]
import fs from 'node:fs';
import { flyLand, measure, HOURS } from './ruler.mjs';

const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const K = arg('--k', null) ? arg('--k').split(',').map(Number) : [...Array(16).keys()], TOP = +arg('--top', 5), READS = +arg('--reads', 2), out = arg('--json', null);
const SHORT = 120, NEAR_BY = 40, STEP = 5, DEG = Math.PI / 180, t0 = Date.now(), table = [];
const q50 = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
function whole(k, psi) {
  const land = flyLand(k, 7200, psi), rows = [];
  for (const hour of HOURS) for (let j = 0; j < READS; j++) { const read = (k + 16 * (1 + j * 7919)) >>> 0; rows.push(measure(land, hour, read, ((read * 2654435761) >>> 0) / 4294967296 * 0.999, 7200)); }
  return { psi, firstNear: rows[0].firstNear, kind: rows[0].firstNearKind, firstSight: rows[0].firstSight, placesPerHour: rows[0].placesPerHour, stretch: rows[0].stretch,
    gapP50: q50(rows.map((r) => r.maxGap)), gapMax: Math.max(...rows.map((r) => r.maxGap)), gapOk: rows.filter((r) => r.maxGap < 180).length / rows.length };
}
for (const k of K) {
  const own = flyLand(k, SHORT).heading, cand = [];
  for (let a = 0; a < 360; a += STEP) {
    const L = flyLand(k, SHORT, a * DEG), near = L.places.find((p) => p.d <= 150);
    if (near && near.t <= NEAR_BY) cand.push({ a, t: near.t, kind: near.kind });
  }
  const mine = whole(k, own), picks = cand.sort((x, y) => Math.abs(x.t - 30) - Math.abs(y.t - 30)).slice(0, TOP).map((c) => ({ deg: c.a, ...whole(k, c.a * DEG) }));
  const ok = (r) => r.firstNear !== null && r.firstNear <= NEAR_BY;
  const best = [...(ok(mine) ? [{ deg: +(own / DEG).toFixed(1), own: true, ...mine }] : []), ...picks].sort((x, y) => y.gapOk - x.gapOk || x.gapP50 - y.gapP50)[0] || null;
  table.push({ k, own: +(own / DEG).toFixed(1), ownNear: mine.firstNear, ownGapP50: mine.gapP50, ownGapOk: mine.gapOk, candidates: cand.length, best });
  const f = (x) => (x === null || x === undefined ? '-' : x);
  console.log(`k${String(k).padEnd(2)} own ${String(f(+(own / DEG).toFixed(0))).padStart(3)} deg: near ${String(f(mine.firstNear)).padStart(6)} s, gap p50 ${mine.gapP50} s, under 180 s ${(mine.gapOk * 100).toFixed(0)}% | ` +
    `${cand.length} of 72 headings near by ${NEAR_BY} s` + (best ? ` | pick ${best.deg} deg${best.own ? ' (its own)' : ''}: near ${best.firstNear} s (${best.kind}), sight ${best.firstSight} s, gap p50 ${best.gapP50} s (worst ${best.gapMax}), under 180 s ${(best.gapOk * 100).toFixed(0)}%, places ${best.placesPerHour}/h, stretch ${best.stretch && best.stretch.join('/')}` : ' | no pick') + ` (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
if (out) fs.writeFileSync(out, JSON.stringify(table, null, 1));
