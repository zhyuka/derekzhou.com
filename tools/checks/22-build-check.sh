#!/usr/bin/env bash
# check: The build, the same bytes every time; site/ holds no built file
# enforces: built-files-uncommitted
# enforces: changed-bytes-new-name
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# tools/build.mjs is the site's build in one command (site/ copied, the built scripts written over it:
# tools/minify.mjs, terser as package.json pins it (the lockfile's hashes), the record and the dev harness
# left out of the world by file, every shader's text the same). Built twice at once into two folders: both
# must be the same bytes, and site/ must hold none of the files the build writes (they are never
# committed: their sources are in src/). Whether a change alters a served byte is the gate's plan job
# (the base's build against the head's). (step 5) Then the deploy build, made from each: every
# script and stylesheet named by its content (world.<sha8>.js), every reference rewritten; the same from
# both, every name its bytes' hash, no old name left, every reference resolving, each file immutable.
# plant: {"create": "site/world.js", "why": "a built file committed to site/"}
node tools/build.mjs --check --against build/site   # (dev-speed: build one is 01-build's build/site)
