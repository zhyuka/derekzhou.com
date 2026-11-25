# #407 night passage: base|head crops (review branch, never a PR)

960x600, a moonlit opening (2026-11-25T02:00Z), headless SwiftShader on T1's harness, base origin/main, head
claude/birds-night-passage (ab5e4913 tree). The harness gives the birds one fixed visit, and that visit's 60% roll
draws no passage (5 runs, every epoch and seed alike). So the head's scratch twin calls passage() on the page once,
as test/birds.mjs does, then the camera is held facing the skein's leader; the base is held at the same place and
heading. Stars differ by the clock (the head stepped 10 frames more before the hold).

- crop.png: base | head, the whole frame (skein: 9 geese, 1.6 km off, 449 m up; crops.json)
- crop-b.png: a second placement (9 geese, 589 m up; crops-b.json)
- zoom.png: 4x, true pixels. Top: the skein (base | head). Bottom: a night bird that is on main too.

Finding (BIRDS, measured on zoom.png): the skein does not read as a far line of stitches. Its 9 specks are about
10 px apart and each carries the night halo, and the halos add (blend ONE, ONE_MINUS_SRC_ALPHA), so together they
make one saturated white streak with a wide glow, many times a lone night bird's. It reads as a comet. Held out of
draft for the hub's call.
