#!/usr/bin/env bash
# check: Nothing darkens (W7's unit test)
# enforces: no-darkening
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# The owner's rule ("Don't darken the background anywhere ever"): the
# composite's tail (FS_COMP between W7-TAIL-BEGIN and W7-TAIL-END in
# the world's script), cut out of the shipped file and run in headless WebGL2
# over random grounds, pixels and clocks, is the encode and the dither
# and nothing else: every 8-bit code the reference's, never lower (a
# darkening) and never higher (a lift or a panel). Then the test's own
# proof: a planted lift, darkening and panel must each make it fail.
# The runner's Chrome, driven by playwright-core (pinned, installed for
# this step only, never part of the site; PW_CORE and CHROME_PATH name
# others where they are set). Exit 2 (no WebGL2 context on the runner)
# warns; any lower or higher code fails.
# plant: {"file": "tools/checks/lib/w7_unit.js", "find": "--mutate", "with": "--mutate", "why": "self-proved: the step runs W7 with each mutation and wants each caught", "self": true}
W=build/src/world.js   # (as written: site/'s is its minified build, the same shader text)
[ -n "$W" ] && [ -f "$W" ] || { echo "::error::no build/src/world.js for W7's unit test"; exit 1; }
if [ -z "${PW_CORE:-}" ]; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/w7" playwright-core@1.49.1
  export PW_CORE="$RUNNER_TEMP/w7/node_modules/playwright-core"
fi
rc=0; node tools/checks/lib/w7_unit.js "$W" --engine chromium > "$RUNNER_TEMP/w7.json" || rc=$?
tail -1 "$RUNNER_TEMP/w7.json"
if [ $rc -eq 2 ]; then echo "::warning::W7's unit test could not run (no WebGL2 context on the runner?)"; exit 0; fi
if [ $rc -ne 0 ]; then cat "$RUNNER_TEMP/w7.json"; echo "::error::W7's unit test: the composite's tail is not the encode and the dither"; exit 1; fi
for m in lift dark panel; do
  rc=0; node tools/checks/lib/w7_unit.js "$W" --engine chromium --mutate $m > /dev/null || rc=$?
  if [ $rc -ne 1 ]; then echo "::error::W7's unit test no longer catches a planted $m (exit $rc)"; exit 1; fi
  echo "a planted $m is caught"
done
