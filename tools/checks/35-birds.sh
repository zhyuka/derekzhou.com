#!/usr/bin/env bash
# check: The ink birds' behaviour, simulated
# test/birds.mjs (about 20 s): the real ink birds module run headless (tools/birds/sim.mjs) over random scenes at
# 960x600 and 390x844, against the research's numbers. The full run: BIRDS_N=16 BIRDS_LONG=1 node test/birds.mjs.
# plant: {"file": "src/birds/inkbirds/262-approach.js", "find": "function airLo(b) { return 0.45 * b.K.v; }", "with": "function airLo(b) { return 2.5 * b.K.v; }", "why": "a landing that can never happen (#89's own plant)"}
node --test test/birds.mjs
