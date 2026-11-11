#!/usr/bin/env bash
# check: The world's rules
# enforces: no-darkening
# enforces: no-masking-boxes
# enforces: csp-scoping
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# Every script tagged for Rocket Loader; production blind (every home-scope
# CSP lets in Cloudflare Web Analytics' two origins and nothing else, no
# diagnostics, control or lab page);
# the world's files' absences (DOM, URL hooks, storage, sound, network,
# one entropy draw above INIT-END, no clock but clockNow, listeners only
# in the world and only by name, pointer moves only during a drag); the
# scripts' order; and the owner's rule, nothing darkens: the composite
# takes no words input (its uniforms a fixed list), the old lift's parts
# are named nowhere, nothing is drawn onto the canvas after it but what
# is named.
# plant: {"file": "build/src/world.js", "find": "  function clockNow() { return performance.now(); }", "with": "  function clockNow() { document.createElement('i'); return performance.now(); }", "why": "DOM built in the world"}
python3 .github/workflows/world_rules.py build/site build/src
