#!/usr/bin/env bash
# check: The shaders' gust is the JS's, by value
# enforces: one-world-state
# (the AIR lane, 2026-11-15) the veils read the air's gust field in GLSL (airGustGlsl), the birds in JS (gustAt): one
# field. tools/checks/lib/gust-glsl.mjs renders the GLSL in headless Chrome (WebGL2, SwiftShader, playwright-core pinned
# as W7's) at 4096 points a visit for four visits and holds each to gustAt: correlation over 0.9999, every point within
# 0.02 sigma. Exit 2 (no WebGL2 context on the runner) warns.
# plant: {"file": "src/world/215-air.js", "find": "dot(xz, w) - U * t, xz.y * w.x - xz.x * w.y) / L", "with": "dot(xz, w) + U * t, xz.y * w.x - xz.x * w.y) / L", "why": "the shaders' gusts carried upwind"}
# plant: {"file": "src/world/215-air.js", "find": "/ L + vec2(hf(ih(uSalt)), hf(ih(uSalt + 1u))) * 4096.0", "with": "/ L + vec2(0.0)", "why": "the shaders' gusts on no visit's slice"}
# plant: {"file": "src/world/215-air.js", "find": "dot(xz, w) - U * t, xz.y * w.x - xz.x * w.y) / L", "with": "dot(xz, w) - U * t, xz.x * w.y - xz.y * w.x) / L", "why": "the shaders' cross-wind axis flipped"}
if [ -z "${PW_CORE:-}" ]; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/w7" playwright-core@1.49.1
  export PW_CORE="$RUNNER_TEMP/w7/node_modules/playwright-core"
fi
rc=0; node tools/checks/lib/gust-glsl.mjs "$RUNNER_TEMP/gust-glsl" || rc=$?
if [ $rc -eq 2 ]; then echo "::warning::the gust check could not run (no WebGL2 context on the runner?)"; exit 0; fi
exit $rc
