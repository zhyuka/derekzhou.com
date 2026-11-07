#!/usr/bin/env bash
# check: Reduced motion is one still frame
# (RULES.json reduced-motion-still, automated 2026-11-07) the reference desktop's first visit in glsl_guard's fake page
# under prefers-reduced-motion: the world shows one still frame, its loop stops after the 0.1 s of redraws, and a
# press, a drag and a release on the page start nothing (no frame asked, nothing drawn)
node .github/workflows/glsl_guard.js build/site --reduced
