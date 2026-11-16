#!/usr/bin/env bash
# check: The opening's plans read the words' boxes each still was baked with (226's STILL_WORDS), as the stylesheet lays them out
# plant: {"file": "src/world/226-moonlit-stay.js", "find": "var STILL_WORDS = {\"hi-393x861\":[[25.1,", "with": "var STILL_WORDS = {\"hi-393x861\":[[35.1,", "why": "a table the stylesheet no longer matches: the live plan would hop off the still's at the cut"}
# (the night lane, the hub's round-3 review of #303 and #301) the opening's moon and evening star are planned against
# the still's own shape, its words' boxes from a table measured in each bake window; this measures them again on the
# build in Chromium and fails when a stylesheet change has moved them (fix: node tools/still-words.mjs --write)
if [ -z "${PW_CORE:-}" ] && ! node -e "require.resolve('playwright')" 2>/dev/null; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/w7" playwright-core@1.49.1 >/dev/null
  export PW_CORE="$RUNNER_TEMP/w7/node_modules/playwright-core"
fi
node tools/still-words.mjs build/site --check
