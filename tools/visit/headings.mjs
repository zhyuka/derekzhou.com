// tools/visit/headings.mjs: each land's first heading, chosen by the visit ruler and the frames' look (delight-visit
// 5.2, curated openings' step 2). For each of the 16 lands: every 5 deg of heading flown SHORT s (the first near pass);
// the headings with a near pass by NEAR_BY s (on a land with none, the earliest by FALL_BY s), nearest 30 s first, up
// to TOP of them at least SPREAD deg apart (so the look has headings that differ to choose from), and the land's own,
// are the candidates (--cands FILE writes them for looks.mjs), with any other heading looks.json has measured. Each is flown the whole 2 h for every hour and READS
// reads (the longest stretch with no reward). The pick (the hub's review of #312: the look is the score's, not a hand
// pick's), among the candidates looks.mjs measured (tools/visit/looks.json):
//   1. never a heading that puts more than WORD_CAP of the words' boxes, or NAME_CAP of the name's, under cloud, nor one
//      that loses the low sun's disc or GLOW_KEEP of the glow the land's own heading shows at dawn or sunset, unless no
//      heading measured on the land keeps both (look-rule.mjs's keeps);
//   2. a first near pass by NEAR_BY s if any candidate left has one;
//   3. the most visits free of a 180 s stretch with no reward, plus lookScore (the opening's feature in frame against
//      the land's best and clear, less the top band under cloud), then the least longest gap.
// A land none of whose candidates keeps the words clear keeps the one that keeps them clearest.
// LOOKS must be of this world (looks.json's world: look-rule.mjs's worldKey); another world's record is refused.
//   node tools/visit/headings.mjs [--k 0,1] [--top 5] [--reads 2] [--looks tools/visit/looks.json] [--json FILE] [--cands FILE]
import fs from 'node:fs';
import { flyLand, measure, HOURS, streamHeading } from './ruler.mjs';
import { lookScore, lookKey, keeps, worldKey } from './look-rule.mjs';

const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const K = arg('--k', null) ? arg('--k').split(',').map(Number) : [...Array(16).keys()], TOP = +arg('--top', 5), READS = +arg('--reads', 2), out = arg('--json', null), candsOut = arg('--cands', null);
const LOOKREC = candsOut ? null : JSON.parse(fs.readFileSync(arg('--looks', 'tools/visit/looks.json'), 'utf8'));
if (LOOKREC && LOOKREC.world !== worldKey()) throw new Error('headings: looks.json was measured on another world: re-run looks.mjs');
const LOOKS = LOOKREC && LOOKREC.lands;
const SHORT = 120, NEAR_BY = 40, FALL_BY = 120, STEP = 5, SPREAD = 20, DEG = Math.PI / 180, t0 = Date.now(), table = [], cands = {};
const q50 = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const apart = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
function whole(k, psi) {
  const land = flyLand(k, 7200, psi), rows = [];
  for (const hour of HOURS) for (let j = 0; j < READS; j++) { const read = (k + 16 * (1 + j * 7919)) >>> 0; rows.push(measure(land, hour, read, ((read * 2654435761) >>> 0) / 4294967296 * 0.999, 7200)); }
  return { psi, firstNear: rows[0].firstNear, kind: rows[0].firstNearKind, firstSight: rows[0].firstSight, placesPerHour: rows[0].placesPerHour, stretch: rows[0].stretch,
    gapP50: q50(rows.map((r) => r.maxGap)), gapMax: Math.max(...rows.map((r) => r.maxGap)), gapOk: rows.filter((r) => r.maxGap < 180).length / rows.length };
}
for (const k of K) {
  const cand = [];
  for (let a = 0; a < 360; a += STEP) {
    const L = flyLand(k, SHORT, a * DEG), near = L.places.find((p) => p.d <= 150);
    if (near && near.t <= FALL_BY) cand.push({ a, t: near.t });
  }
  const by = cand.filter((c) => c.t <= NEAR_BY), fall = !by.length, pool = fall ? cand.sort((x, y) => x.t - y.t) : by.sort((x, y) => Math.abs(x.t - 30) - Math.abs(y.t - 30));
  const spread = []; for (const c of pool) { if (spread.length < TOP && spread.every((a) => apart(a, c.a) >= SPREAD)) spread.push(c.a); }
  cands[k] = [null, ...spread];
  if (candsOut) { console.log(`k${k}: ${JSON.stringify(cands[k])}`); continue; }
  const own = streamHeading(k);
  // (and any other heading looks.json measured on this land: a wider sweep where none of the ruler's keeps the words clear)
  const more = Object.keys(LOOKS[k] || {}).filter((x) => x !== 'own').map(Number).filter((d) => !cands[k].includes(d));
  const rows = [...cands[k], ...more].map((d) => ({ deg: d, look: (LOOKS[k] || {})[lookKey(d)] || null, ...whole(k, d === null ? own : d * DEG) })).filter((r) => r.look);
  const near = (r) => r.firstNear !== null && r.firstNear <= (fall ? FALL_BY : NEAR_BY);
  const ownLook = (rows.find((r) => r.deg === null) || {}).look || {}, bestIn = { galaxyIn: Math.max(...rows.map((r) => r.look.galaxyIn)), sunIn: Math.max(...rows.map((r) => r.look.sunIn)) };
  const clear = rows.filter((r) => keeps(r.look, ownLook, LOOKS[k])), nearClear = clear.filter(near);
  const rank = (x, y) => (y.gapOk + lookScore(y.look, bestIn)) - (x.gapOk + lookScore(x.look, bestIn)) || x.gapP50 - y.gapP50;
  const best = (nearClear.length ? nearClear : clear).sort(rank)[0] || rows.sort((x, y) => x.look.wordCloud - y.look.wordCloud)[0] || null;
  table.push({ k, own: +(own / DEG).toFixed(1), fallback: fall, rows: rows.map(({ psi, ...r }) => r), best: best && { deg: best.deg, firstNear: best.firstNear, gapOk: best.gapOk, gapP50: best.gapP50, look: best.look } });
  const f = (x) => (x === null || x === undefined ? '-' : x), L = (r) => `words ${r.look.wordCloud} name ${r.look.nameCloud} top ${r.look.topCloud} galaxy ${r.look.galaxy} sun ${r.look.sun}`;
  console.log(`k${String(k).padEnd(2)} own ${String(+(own / DEG).toFixed(0)).padStart(3)} deg | ` + rows.map((r) => `${lookKey(r.deg)}: near ${f(r.firstNear)} s, under 180 s ${(r.gapOk * 100).toFixed(0)}%, ${L(r)}`).join(' | ') +
    (best ? ` || pick ${lookKey(best.deg)}` : ' || no pick') + ` (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
if (candsOut) fs.writeFileSync(candsOut, JSON.stringify(cands));
if (out) fs.writeFileSync(out, JSON.stringify(table, null, 1));
if (!candsOut) console.log('airHeading0\'s table: [' + table.sort((a, b) => a.k - b.k).map((t) => (t.best ? (t.best.deg === null ? 'null' : t.best.deg) : 'null')).join(', ') + ']');
