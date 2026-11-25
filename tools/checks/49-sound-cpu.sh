#!/usr/bin/env bash
# check: The score's CPU, the world running beside it
# alone: it times the audio thread and the score's ticks
# (2026-11-25, the hub: "the score's CPU on the slowest phone profile ... a CI bar on it, so it can't creep")
# tools/sound/cpu.mjs, about 30 s: the build in headless Chromium on SwiftShader under a phone GPU's name, as the gate's
# harness, so the world runs; the sound icon pressed, the main thread slowed four times (Lighthouse's mobile), and for
# 10 s the audio thread's own CPU and the score's ticks measured. It fails when the audio thread takes over 15% of
# real time (7-9% measured, 0.36-0.50 ms of each 5.33 ms render quantum), or the score's ticks over 15 ms a second of
# the main thread (2.6-6.1 measured, the longest 4-12 ms), or nothing played. The runner's Chrome, driven by
# playwright-core (pinned as W7's; PW_CORE and CHROME_PATH name others where set).
# plant: {"file": "build/site/score.js", "find": "return{tick:function(n){", "with": "return{tick:function(n){for(var Z=performance.now();performance.now()-Z<20;);", "why": "each tick of the score 20 ms longer"}
# plant: {"file": "tools/sound/cpu.mjs", "find": "audio: 0.15,", "with": "audio: 0.015,", "why": "the audio thread's bar under what it takes: the comparison wired"}
if [ -z "${PW_CORE:-}" ] && ! node -e "require.resolve('playwright')" 2>/dev/null; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/w7" playwright-core@1.49.1 >/dev/null
  export PW_CORE="$RUNNER_TEMP/w7/node_modules/playwright-core"
fi
node tools/sound/cpu.mjs build/site --check
