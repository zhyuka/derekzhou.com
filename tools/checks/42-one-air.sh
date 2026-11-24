#!/usr/bin/env bash
# check: One air: the world's one state of wind, light and clock
# enforces: one-world-state
# kind: fast
# (the AIR lane, 2026-11-15) src/world/215-air.js holds the wind, the key light, the sky's sun, the clock, the weather,
# the landing's heading and the cruise band; every other system reads them there. tools/checks/lib/one-air.mjs: the
# air's names declared and written only there (tools/where.mjs), and no wind or sun literal in any other section, the
# realms or the billows' shader; the score's breeze the feed's air (the world's wind by sky), no table of its own. test/unit/air.mjs holds every reader to the one wind and the one key by value.
# plant: {"file": "src/realm-dunes.js", "find": "wind: A.vec3(V, A.H.motes, 0.1)", "with": "wind: [V.wind[0] * 1.6, 0.1, V.wind[1] * 1.6]", "why": "the motes' wind a literal of their own again"}
# plant: {"file": "src/world/320-camera-drawn-between-last-two.js", "find": "CW_V = 0.011, CRUISE_IN = 2;", "with": "CW_V = 0.011, CRUISE_IN = 2, CRUISE = [14, 32];", "why": "a second cruise band"}
# plant: {"file": "src/score.js", "find": "var WK = [[1.2, 0.3], [2, 0.45], [6.5, 0.67], [21, 1]], WIND_DAY = 0.35;", "with": "var WK = [[1.2, 0.3], [2, 0.45], [6.5, 0.67], [21, 1]], WIND_DAY = 0.35, WS = { milkyway: [0.18, 0.5], afterglow: [0.35, 1] };", "why": "the score with a breeze by sky of its own"}
# plant: {"file": "src/world/490-birds-host.js", "find": "  var HOST = {", "with": "  AIR_DIR[0] = 1;\n  var HOST = {", "why": "a section that writes the air's wind"}
# plant: {"file": "src/world/512-score-feed.js", "find": "w = airHeard(CS.x, CS.z,", "with": "w = airHeard(0, 0,", "why": "the score hearing the air somewhere other than the camera"}
node tools/checks/lib/one-air.mjs "$RUNNER_TEMP"
