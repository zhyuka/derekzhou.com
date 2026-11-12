#!/usr/bin/env bash
# check: The recorded ground is today's land
# kind: fast
# plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "float swell(vec2 p) { return 40.0 * ", "with": "float swell(vec2 p) { return 41.0 * ", "why": "a land constant changed, the recording not made again"}
# (the PC fast-checks lane, 2026-11-07) the sims stand on the world's real ground, recorded on the 4090
# (test/golden/ground/<seed>.json and .bin); a recording made under other land sources than today's fails here, saying
# how to make it again, so a stale ground is never judged against (test/ground.mjs refuses it too)
node --input-type=module -e "
import fs from 'node:fs'; import { landHash, DIR, RERECORD } from './test/ground.mjs';
const now = landHash(), metas = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.json')) : [];
let bad = 0;
for (const f of metas) { const m = JSON.parse(fs.readFileSync(DIR + '/' + f, 'utf8')); if (m.hash !== now) { console.log('::error::test/golden/ground/' + f + ': recorded under the land sources ' + m.hash + ', today ' + now + ': re-record: ' + RERECORD + ' --seed ' + m.seed); bad = 1; } }
if (!metas.length) { console.log('::error::no recorded ground (test/golden/ground/): ' + RERECORD); bad = 1; }
if (!bad) console.log('ground: ' + metas.length + ' recording(s), the land sources ' + now + ' as recorded');
process.exit(bad);
"
