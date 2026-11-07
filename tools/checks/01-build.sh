#!/usr/bin/env bash
# check: The site, built (what every check of a served file reads)
# kind: build
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# site/ holds only sources: the pages, _headers, the hand-written scripts, the fonts. The files the build
# writes (the five minified scripts from build/ship/, the start file and its table from build/src/) are
# never committed. build/site/ is the plain build (tools/build.mjs --plain: the vN names), byte for byte
# what Cloudflare Pages serves before it names each script by its content. terser as package.json pins it.
npm ci --no-audit --no-fund --ignore-scripts
node tools/build.mjs --plain build/site > /dev/null
