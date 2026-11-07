#!/usr/bin/env bash
# check: Every shader compiles
# enforces: same-shaders
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# (restructure step 3) the shaders' text lives in .glsl files (src/**/glsl/) that tools/parts.mjs writes
# back into the scripts. test/shaders.mjs runs the page in glsl_guard's fake browser, takes every program the
# reference device issues, and compiles and links each in headless Chrome (WebGL2, SwiftShader, playwright-core
# pinned as W7's). Exit 2 (no WebGL2 context on the runner) warns.
# plant: {"file": "build/site/world.js", "find": "void main() { vec2 p = ", "with": "void main() { vec2 p = q; ", "why": "a shader that does not compile"}
if [ -z "${PW_CORE:-}" ]; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/w7" playwright-core@1.49.1
  export PW_CORE="$RUNNER_TEMP/w7/node_modules/playwright-core"
fi
rc=0; node test/shaders.mjs build/site --compile || rc=$?
if [ $rc -eq 2 ]; then echo "::warning::the shaders' compile check could not run (no WebGL2 context on the runner?)"; exit 0; fi
exit $rc
