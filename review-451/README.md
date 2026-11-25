# #451 slope soaring: base|head crops (review branch, never a PR)

crop.png, zoom.png (4x, true pixels), diff.png: 960x600, 2026-11-25T15:00Z, headless SwiftShader on T1's harness, base
origin/main, head claude/birds-slope-soaring. Both arms' scratch twins place the same gull (a commute goal at its own
height) 25 m over the face with the most lift within 1.5 km of the opening (crops.json: 0.39 m/s there, the page's wind
4.1 m/s), the camera held 250 m short of it, facing it; 240 frames on. Base: mid-beat, wings up. Head: turned along the
face, wings held (gliding). The gull is about 1.1 km off, so it is small: heights.png shows the motion.

heights.png: the headless sim (tools/birds/sim.mjs, the recorded ground), the test's setup: a gull with a commute goal
25 m over a steep windward face in view, wind 6.5 m/s, the eye held; its height over the land for 60 s over 4 faces.
Grey main, blue head; dots where it glides. Head rises to 50-65 m gliding nearly throughout; main holds 25-45 m beating.
