#!/usr/bin/env bash
# check: The sound is opt-in, a live score
# enforces: sound-opt-in
# alone: it times the score's first notes (want 3 or more by 4 s)
# (2026-11-07, the owner: "bring it back, opt-in. using an icon that fits with the rest of the design"; 2026-11-12,
# "ship it", of the live score that follows the sky) The build (build/site) served on 127.0.0.1 with its own
# Permissions-Policy and opened in headless Chromium, the autoplay policy a visitor's (tools/sound/page.mjs, about
# 25 s): no audio context and no audio request before the press, the score registered; the press makes one context
# and fetches one sheet of notes, once, from /assets/sound/, and the score plays notes from it and keeps planning; a
# second press suspends the context, a third resumes it, fetching nothing again. On the slow profile (10 Mbps, 70 ms:
# docs/sound.md), the first note begins within 1.2 s of the press (the hub's mark, 2026-11-25: under 1 s; about 0.8 s
# measured, 0.83 with the CPU four times slower; 4.9 s before the sheet came in parts). The runner's Chrome, driven by
# playwright-core (pinned as W7's; PW_CORE and CHROME_PATH name others where set).
# plant: {"file": "build/site/score.js", "find": "window.SCORE=", "with": "window.SCORX=", "why": "the score never registers: the press plays nothing"}
# plant: {"file": "build/site/sound.js", "find": "getReader", "with": "getReaderX", "why": "the sheet decoded only once it has all come: the first note late on a slow network"}
if [ -z "${PW_CORE:-}" ] && ! node -e "require.resolve('playwright')" 2>/dev/null; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/w7" playwright-core@1.49.1 >/dev/null
  export PW_CORE="$RUNNER_TEMP/w7/node_modules/playwright-core"
fi
node tools/sound/page.mjs build/site --net 10,70 --first 1200
