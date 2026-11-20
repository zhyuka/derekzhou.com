#!/usr/bin/env bash
# check: Reduced motion is one still frame
# enforces: reduced-motion-still
# (RULES.json reduced-motion-still, automated 2026-11-07) the reference desktop's first visit in glsl_guard's fake page
# under prefers-reduced-motion: the world shows one still frame, its loop stops after the 0.1 s of redraws, and a
# press, a drag and a release on the page start nothing (no frame asked, nothing drawn)
# plant: {"file": "src/world/460-boot-staged.js", "find": "if (ts - STILLTS >= 100) { STILLTS = -1; stop(); }", "with": "if (ts - STILLTS >= 1e9) { STILLTS = -1; stop(); }", "why": "a reduced-motion still whose loop never stops", "rebuild": true}
node tools/checks/lib/glsl_guard.js build/site --reduced
