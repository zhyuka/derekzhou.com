# #449 the sand veils only when sand moves: base | head

Headless Chromium, the page's own renderer (software GL, the CI harness), at
sunset (18:30Z). The cruise frames reuse #434's side-on poses, set by a
scratch copy of each build after the page's camPose; nothing posed is served.

- Base: main at 83651e08 (nothing since touches the veils or these views).
- Head: #449 d62bdb37.

| frames | the opening's U10 | veils, base to head | pixels changed by more than 2 levels (laptop / phone) |
|---|---|---|---|
| opening 3, calm (cruise pose) | 3.97 m/s | 0.49 to none | 15 (max 5) / 5 (max 4) |
| opening 4 (cruise pose) | 6.25 m/s | 0.95 to 0.31 | 0 / 0 (max 1) |
| opening 3, landing | 3.97 m/s | 0.49 to none | 0 / 0 |
| opening 8, windy, landing | 7.31 m/s | 1 to 1 | 0 / 0 |

- `opening3-calm-*-4x-base-head.png`: the spot where opening 3's one visible
  veil was, at 4x, base left and head right. The veil's trace is gone.
- `opening*-*-base-head.png`: the whole cruise frames.

**The veils are near invisible on main already.** They are 20 in a 260 m box,
drawn 6-230 m from the eye, at a quarter opacity. realm-dunes' own note puts
them at one level on 19 pixels in T1's views, and in these frames a calm
visit loses one veil's 15 pixels.

The change is right by the physics (no sand moving under the threshold) and
shows little. On a windy visit, in view of the brinks, it would show where
the veils lie: the same as base past 7 m/s, fewer between 5.8 and 7.
