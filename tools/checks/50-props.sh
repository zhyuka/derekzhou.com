#!/usr/bin/env bash
# check: The ink birds' renamed properties cross no script boundary
# (the hub's bird bytes, PR B, 2026-11-25) tools/minify.mjs renames the ink birds' own properties (terser's
# mangle.properties, every name another served file or a string of theirs has kept). tools/props.mjs builds the shipped
# scripts itself, lists every property the input inkbirds.js has and the output has not (renamed), and fails if one of
# them is a property, a global or a string's word in another minified script, any word of site/'s pages, stylesheet and
# scripts or the wing model's, a word of the ink birds' own strings (read by string or as a JSON key), or a DOM or
# built-in property: a name HOST, the engine, the model or the score reads under its old name.
# (the hub's review of #531) And a property reached only by a key built at run time (obj[a + b], Object.keys, JSON) passes
# that list and the suites (they run the source): tools/birds/twin.mjs runs the shipped, minified ink birds and the
# source side by side in the bird sim, 6 seeds x the six skies x 10 sim-minutes, a pointer and clicks, and every array
# the draw uploads (each bird's place, pose and kind) and the score's feed must be equal, step for step.
# plant: {"file": "src/birds/inkbirds/240-pass-one-instanced-draw-every.js", "find": "N, s.haloE, -1, 1,", "with": "N, s[['halo', 'E'].join('')], -1, 1,", "why": "a bird's halo read by a key built at run time: the minifier renames haloE, the shipped birds draw no halo (twin.mjs)"}
# plant: {"file": "tools/minify.mjs", "find": "    for (const x of (await globalsOf(T, read(path.join(dir, n)))).code.match(WORD) || []) keep.add(x);", "with": "    void n;", "why": "the other scripts' names no longer kept: HOST's, the engine's and the model's properties renamed in the ink birds alone"}
node tools/props.mjs
node tools/birds/twin.mjs
