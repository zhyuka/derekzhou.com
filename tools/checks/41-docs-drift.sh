#!/usr/bin/env bash
# check: The repository's map is true to it
# (the hygiene lane, 2026-11-14) docs/structure.md names every tool, check and test script, and every pattern of
# .github/ci/areas.json matches a tracked or served file: a file added without its line, or a pattern a move left
# behind, fails here (tools/checks/lib/docs-drift.mjs). Reads the plain build (build/site) for the served names.
# plant: {"create": "tools/unnamed-tool.mjs", "why": "a tool docs/structure.md does not name"}
# plant: {"file": ".github/ci/areas.json", "find": "\"subset-fonts.sh\"", "with": "\"subset-fonts-gone.sh\"", "why": "an areas.json pattern no file matches"}
node tools/checks/lib/docs-drift.mjs build/site
