#!/usr/bin/env bash
# check: The recorded ground's inputs are every shader its probe compiles
# plant: {"file": "test/ground.mjs", "find": "'src/world/glsl/fs-probe-split.glsl'", "with": "'src/world/glsl/fs-blit.glsl'", "why": "the probe's own shader left out of the ground's inputs (a land edit would need no re-record)"}
# (CI lane, 2026-11-14) the ground's freshness hash (test/ground.mjs landHash) covers only the .glsl files the world's
# ground probe compiles, so a sky, cloud or star shader edit needs no re-record on the 4090; this proves the list, on
# the built page under SwiftShader (tools/ground-inputs.mjs): text from any other .glsl file in the probe fails
node tools/ground-inputs.mjs build/site
