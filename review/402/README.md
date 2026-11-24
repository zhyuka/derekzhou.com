# #402 aerial perspective by physics: base | head

Opening 4 (data-seed 4) at its landing, 1440 x 900 @1, headless Chromium,
software GL, the CI harness (.github/ci/harness.mjs). The page as served:
no pose, no hook. Base: main 5e96652d. Head: #402 50a74669.

- sunset: epoch 2026-11-05T18:30Z (data-sky sunset)
- night: epoch 2026-11-05T23:30Z (data-sky night, the moon up)

Each `*-base-over-head.png` is base on top, head below:

| crop | frame box | sunset: mean / max diff (of 255) | night |
|---|---|---|---|
| far: the horizon band, mesas and ridges | (0, 560)-(1440, 760) | 5.98 / 23 | 5.32 / 22 |
| near: the dunes under the eye | (0, 760)-(1440, 900) | 1.51 / 6 | 0.77 / 4 |
| clouds: the left banks | (0, 40)-(700, 560) | 1.09 / 16 | 0.59 / 9 |

The far land now goes to the sky's own colour toward the horizon (at
sunset its warm mauve, at night its blue), where the hand-set tint made
it blue-violet whatever the sky. The near land barely moves. In-scatter
only gives the sky's light: nothing is darker.
