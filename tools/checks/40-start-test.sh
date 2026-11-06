#!/usr/bin/env bash
# check: The start file's own proof
# kind: schedule
# (dev-speed: weekly, .github/workflows/scheduled.yml: ~25-50 s in the fake browser, every device and fallback)
node tools/start.mjs --test build/src build/site/index.html build/site/start.js
