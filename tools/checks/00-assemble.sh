#!/usr/bin/env bash
# check: The readable scripts, assembled
# kind: build
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# (restructure step 1) src/ keeps the world and the ink birds as small section files (src/world/,
# src/birds/inkbirds/: NNN-slug.js, joined in name order, nothing between). build/src/ is src/ assembled,
# the whole readable scripts under their served names: what every step below reads. Never committed.
# (step 2) build/ship/ is the shipped build: the dev-only parts (src/dev/: the record, the harness) left out
# by file, each stub in its place. minify.mjs minifies that.
# (2026-11-15) assemble writes the plan's stamp into the world (tools/plan.mjs fillStamp, acorn's tokens): terser and
# acorn as package.json pins them, so npm ci comes first, here (01-build used to run it).
npm ci --no-audit --no-fund --ignore-scripts
node tools/parts.mjs assemble src build/src
node tools/parts.mjs assemble --ship src build/ship
