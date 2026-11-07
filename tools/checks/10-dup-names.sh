#!/usr/bin/env bash
# check: No name declared twice in one scope
# kind: fast
# enforces: no-duplicate-names
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# The world and the ink birds are section files joined into one script with one scope: two sections that
# each declare `function lateWarm()` leave only the later, silently (2026-11-06). tools/dup-names.mjs parses
# every assembled script (both builds, and the wing model) and fails on a name declared twice in one scope,
# naming both section files; its self-test first proves it catches each planted case.
# plant: {"file": "src/world/000-head.js", "find": "  function clockNow() { return performance.now(); }", "with": "  function clockNow() { return performance.now(); } function clockNow() { return 0; }", "why": "a name declared twice in one scope"}
node tools/dup-names.mjs --self-test
node tools/dup-names.mjs
