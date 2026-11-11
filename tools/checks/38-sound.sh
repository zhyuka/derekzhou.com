#!/usr/bin/env bash
# check: The sound is opt-in, one recording, looping
# enforces: sound-opt-in
# (2026-11-07, the owner: "bring it back, opt-in. using an icon that fits with the rest of the design") The build
# (build/site) served on 127.0.0.1 with its own Permissions-Policy and opened in headless Chromium, the autoplay
# policy a visitor's (tools/sound/page.mjs, about 10 s): no audio context and no audio request before the press; the
# press makes one context and fetches one recording, once, from /assets/sound/; it loops past its own length; a second
# press suspends the context, a third resumes it, fetching nothing again. The runner's Chrome, driven by
# playwright-core (pinned as W7's; PW_CORE and CHROME_PATH name others where set).
# plant: {"file": "build/site/sound.js", "find": "loop=!0", "with": "loop=!1", "why": "the recording played once, not looped"}
if [ -z "${PW_CORE:-}" ] && ! node -e "require.resolve('playwright')" 2>/dev/null; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/w7" playwright-core@1.49.1 >/dev/null
  export PW_CORE="$RUNNER_TEMP/w7/node_modules/playwright-core"
fi
node tools/sound/page.mjs build/site
