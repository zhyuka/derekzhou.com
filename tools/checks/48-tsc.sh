#!/usr/bin/env bash
# check: tsc --checkJs: no error in the world or the realm scripts
# plant: {"file": "src/realm-dunes.js", "find": "var DS = 1500, RS = 4500, A = W.air;", "with": "var DS = 1500, RS = 4500, A = W.airs;", "why": "a realm reads an air WORLD does not export"}
# plant: {"file": "src/world/215-air.js", "find": "upwind: airUpwind, H: AIR_H,", "with": "upwind: airUpwind, H: 40,", "why": "215's export of the air's heights no longer the shape the realms read (world.d.ts's AirApi)"}
# plant: {"file": "src/world/227-night-bodies.js", "find": "    return [seen >= 0 ? seen : up, seen >= 0];", "with": "    return [seen >= 0, seen >= 0 ? seen : up];", "why": "bodyPick's [eps, seen] swapped"}
# (HYGIENE lane, 2026-11-24) tools/tsc.mjs (a pinned TypeScript through npx, not a dependency) over the assembled
# world and src/realm-*.js, with tools/types/world.d.ts: the shared objects' types (window.WORLD's air, events and kit,
# EXT, the targets) held to what the sections export and the realms read. It was zero by hand; this keeps it there.
node tools/tsc.mjs
