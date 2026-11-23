#!/usr/bin/env bash
# check: The shipped dunes meet the sand spec (physics: sand/S1)
# plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "float m = dot(G0, g) + sqrt(", "with": "float m = 1.3 * dot(G0, g) + 0.3 + sqrt(", "why": "the slip faces steeper than the angle of repose"}
# (the LAND lane, 2026-11-15; the hub's review of #271) the slopes of the land the page draws, from its own probe
# under SwiftShader (tools/physics/dune-census-gpu.mjs: the land alone, a 2 m grid over 800 m about the landing, seed 3,
# the split passes), by central differences of the heights, never the gradient the code carries: at most 0.1% of the
# sand over 34 deg (sand slides past its angle of repose), the slip faces' mode 31-33 deg. A 2 m grid sees the faces'
# angle, not walls 2.5 m wide (the face solved for G0 + dH): test/unit/dunes.mjs measures the JS port's surface by
# differences over 0.5 m for those. Past 400 m seed 3 has a few points over 34 deg where plateaux and basins meet the
# dunes (0.11% over 1 km): not the faces. playwright-core pinned as W7's.
if [ -z "${PW_CORE:-}" ]; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/w7" playwright-core@1.49.1 > /dev/null
  export PW_CORE="$RUNNER_TEMP/w7/node_modules/playwright-core"
fi
node tools/physics/dune-census-gpu.mjs --half 400 --cell 2 --seed 3 --check 1
