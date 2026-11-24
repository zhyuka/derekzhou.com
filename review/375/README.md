# #375 fog pools: a basin's fog, base | head

Opening 10 (data-seed 10), first light (2026-11-05T06:30Z), 10 m of mist.
AIR's fog site 0:-1:1; the pool's hollow at (-3999, 6860), radius 886 m,
top -26.9 m (a 19.8 m pool, held under the rim). Headless Chromium,
software GL, 1440 x 900 @1, the CI harness (.github/ci/harness.mjs).

The visit is posed 450 m from the hollow's centre, heading -30.2 deg,
at the same pose in base (main 3907dbf2) and head (#375 6d7a33c6). A
scratch copy of each build sets the dev pose; nothing here is served.

- k10-basin-base-head.png: base left, head right, the frame's (100, 620)
  to (780, 820); -x2 is the same at 2x, nearest neighbour.
- k10-basin-*-full.png: the whole frames.

They differ only within (164, 702)-(637, 747): the pool fills the
trough beyond the near ridge, shoreline the ground's own, no edge at r.

The gate's T1: every frame the same as base's (its cases are at the
landing; no fog site within 6 km of it).
