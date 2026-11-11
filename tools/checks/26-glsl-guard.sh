#!/usr/bin/env bash
# check: Every visit compiles the same shaders
# enforces: same-shaders
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# A returning visitor's world is quick only when Chrome's shader cache answers for every program, and it
# answers only for a GLSL source it has seen byte for byte. glsl_guard.js runs the site's own scripts (every
# script index.html loads, as shipped) in node, in a fake browser with a fake WebGL2 context, for 15 visits
# of five devices (other entropy, hours, windows, densities, clocks and frame rates), and keeps every source
# the page hands shaderSource, until the world has shown. Within a device every visit must compile the same
# sources (no per-visit or per-window literal in any GLSL); across devices only the #define lines after
# #version may differ (DEFS, per device). Which programs a change edits (the ones a deploy makes every returning
# visitor compile again) is the gate's to say, from the base's build and the head's (the census: glsl_changed; T2
# names each changed program and reads it back), so nothing derived from the shaders is committed (2026-11-06: no
# derived file for shader PRs to conflict in). --selftest: the guard's own proof (a planted per-visit literal, a
# per-window literal and one program changed must each be caught). Exit 3: the fake browser could not bring the
# world to its show (extend the fake for what the page needs; never relax the rules).
# plant: {"file": ".github/workflows/glsl_guard.js", "find": "--selftest", "with": "--selftest", "why": "self-proved: --selftest plants its own failures first", "self": true}
node .github/workflows/glsl_guard.js build/site --selftest
