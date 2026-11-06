#!/usr/bin/env bash
# check: The world's rules
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
python3 .github/workflows/world_rules.py build/site build/src
# the realm lint: reported (the realms predate the namespaced API)
node .github/workflows/lint_realms.js report build/src/realm-kit.js $(ls build/src/realm-*.js | grep -v realm-kit)
