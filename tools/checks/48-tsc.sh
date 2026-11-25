#!/usr/bin/env bash
# check: tsc --checkJs: no error in the world, the realm scripts, the sound, the page's scripts, the ink birds, their wing model or the plan's worker
# plant: {"file": "src/realm-dunes.js", "find": "var DS = 1500, RS = 4500, A = W.air;", "with": "var DS = 1500, RS = 4500, A = W.airs;", "why": "a realm reads an air WORLD does not export"}
# plant: {"file": "src/world/215-air.js", "find": "upwind: airUpwind, H: AIR_H,", "with": "upwind: airUpwind, H: 40,", "why": "215's export of the air's heights no longer the shape the realms read (world.d.ts's AirApi)"}
# plant: {"file": "src/sound.js", "find": "if (!window.SCORE) throw new Error('no score');", "with": "if (!window.SCORES) throw new Error('no score');", "why": "the sound icon reads a score score.js does not export"}
# plant: {"file": "site/site.js", "find": "link.href = 'mailto:'", "with": "link.hreff = 'mailto:'", "why": "the page's email link given a property an anchor has not"}
# plant: {"file": "src/birds/model/birdwing.js", "find": "sq = Math.sqrt(2 / 3);", "with": "sq = Math.sqr(2 / 3);", "why": "the wing model calls a function Math has not (the model unchecked again)"}
# plant: {"file": "src/birds/inkbirds/260-perches.js", "find": "gbT: 0, roundT: 0, tAt", "with": "gbT: 0, rT: 0, tAt", "why": "two of a perch's fields under one name again (the go-round's time and the turn's rest key)"}
# plant: {"file": "src/world/227-night-bodies.js", "find": "    return [seen >= 0 ? seen : up, seen >= 0];", "with": "    return [seen >= 0, seen >= 0 ? seen : up];", "why": "bodyPick's [eps, seen] swapped"}
# plant: {"file": "tools/plan.mjs", "find": "    close();", "with": "    close(1);", "why": "the plan's worker wrapper calls the worker's close with an argument it takes not (the worker unchecked again)"}
# (HYGIENE lane, 2026-11-24) tools/tsc.mjs (a pinned TypeScript through npx, not a dependency) over the assembled
# world and src/realm-*.js, with tools/types/world.d.ts: the shared objects' types (window.WORLD's air, events and kit,
# EXT, the targets) held to what the sections export and the realms read. It was zero by hand; this keeps it there.
node tools/tsc.mjs
