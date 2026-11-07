#!/usr/bin/env bash
# check: The score is opt-in, and measured
# enforces: absence-network-sound-cursor
# enforces: sound-opt-in
# The owner's opt-in score (2026-10-02 "Opt-in generative score"; 2026-11-07 "bring it back, opt-in. using an icon
# that fits with the rest of the design"): tools/sound/measure.mjs renders the built score (build/site/score.js, the
# served bytes) offline in headless Chromium, every light in every place, and measures it: BS.1770 loudness at -26
# +- 1.5 LUFS, no sample over -6 dBFS, two changes with no jolt (no 400 ms block 6 LU over the one before), the audio
# at 8x realtime or more and the scheduler at 50 ms a second or less with the CPU throttled 4x. Then the page, served
# with its own Permissions-Policy: no audio context and no score fetched before the press; the press makes one and
# fetches it once, the icon pressed and the context running; a second press lets it go.
# The runner's Chrome, driven by playwright-core (pinned, installed for this step only, never part of the site), as
# W7's unit test.
# plant: {"file": "build/site/sound.js", "find": "self.SOUND={", "with": "new AudioContext,self.SOUND={", "why": "an audio context made at load, before any press"}
# plant: {"file": "build/site/score.js", "find": "=-14+", "with": "=-4+", "why": "the score 10 dB too loud"}
[ -f build/site/score.js ] && [ -f build/site/sound.js ] || { echo "::error::no build/site/score.js or sound.js"; exit 1; }
if [ -z "${PW_CORE:-}" ]; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/pw" playwright-core@1.49.1 > /dev/null
  export PW_CORE="$RUNNER_TEMP/pw/node_modules/playwright-core"
fi
node tools/sound/measure.mjs build/site --secs 40
