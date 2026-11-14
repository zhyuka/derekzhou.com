#!/usr/bin/env bash
# check: The recorded ground is today's world's
# plant: {"file": "src/world/glsl/fs-probe-split.glsl", "find": "float h = ((s.xyz + r.xyz) - k1.xyz).x;", "with": "float h = ((s.xyz + r.xyz) - k1.xyz).x + 0.2;", "why": "the ground moved 20 cm, the recording not made again"}
# plant: {"file": "src/world/010-visit-weather.js", "find": "var SEED0 = (11 + (SEEDR % OPENN)", "with": "var SEED0 = (12 + (SEEDR % OPENN)", "why": "what seed 11 opens on moved (the input the old hash missed, b9c42a3), the recording not made again"}
# plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float hgt = 7.0 + 9.0 * sc", "with": "float hgt = 8.0 + 9.0 * sc", "expect": "pass", "why": "a sky shader edit: the ground as it was, no re-record"}
# (the PC fast-checks lane, 2026-11-07) the sims stand on the world's real ground, recorded on the 4090
# (test/golden/ground/<seed>.json and .bin). (CI lane, 2026-11-14) measured, no longer a hash of a list of land
# sources (that list missed what seed 11 opens on, and passed a recording 47 m stale): tools/ground-fresh.mjs reads the
# world's own probe under SwiftShader on the page the recorder reads, at every third point of each recording, and a
# point off by more than 5 cm (the two devices agree to 3 mm) fails, saying how to re-record. A sky, cloud or star
# edit leaves the ground as it is and passes. playwright-core pinned as W7's.
if [ -z "${PW_CORE:-}" ]; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/w7" playwright-core@1.49.1 > /dev/null
  export PW_CORE="$RUNNER_TEMP/w7/node_modules/playwright-core"
fi
node tools/ground-fresh.mjs
