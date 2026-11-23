#!/usr/bin/env bash
# check: With no stills, the first paint is the words, then the world as a cut
# alone: it steps the world to its show under SwiftShader
# plant: {"file": "build/site/style.css", "find": ".sky.on {", "with": ".sky.on { transition: opacity 0.4s;", "why": "the world fades in instead of cutting in"}
# plant: {"file": "build/site/index.html", "find": "</head>", "with": "<link rel=\"preload\" as=\"image\" class=\"still\" href=\"/assets/still/day-1-hi-393x852.avif\"></head>", "why": "a still preload left in a build with no set (a stale still)"}
# A served change whose world has no baked set ships without stills (CI no longer bakes): the plain build CI checks is
# that build. tools/first-paint.mjs opens it on a phone and a laptop and fails on a blank first paint, a fade, an
# undrawn first frame or any still. playwright-core pinned as W7's.
if [ -z "${PW_CORE:-}" ]; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/w7" playwright-core@1.49.1 > /dev/null
  export PW_CORE="$RUNNER_TEMP/w7/node_modules/playwright-core"
fi
node tools/first-paint.mjs build/site
