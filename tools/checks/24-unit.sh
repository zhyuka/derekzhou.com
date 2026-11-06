#!/usr/bin/env bash
# check: The world's pure code, unit-tested
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# test/unit.mjs (restructure step 6, about 10 s): the world's code that runs without a page, read from the
# dev build by its own anchors (src/ exports nothing for it): the streams and integer hashes (values,
# ranges, spread), the sky order's rules (the landing sky the hour's, never one of the last few, near unless
# far, every sky seen), the maps and the kit weights (in [0, 1]; the same plan and flight from the same seed),
# and the plan's worker against the page's own plan, hash for hash. Golden values in test/golden/unit.json:
# after a deliberate change, node test/unit.mjs --write, committed with it.
node --test test/unit.mjs
