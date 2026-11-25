# #459 the saltation layer on windy visits: base | head

Opening 8 (U10 7.31, AIR's dust 1) at sunset (18:30Z), headless Chromium,
the page's own renderer (software GL, the CI harness).

- Base: main after #449 (the veils by threshold).
- Head: #459 fcb697b8.
- Cruise frames: a scratch copy of each build sets the camera after
  camPose; nothing posed is served. The camera is 14 m over the landing's
  ground at (-89.9, 178.7), heading -17.8 deg across the wind, pitched
  +11.05 deg (laptop) or +26.4 deg (phone).

| frames | pixels changed (luma, more than 0.5) | most lift | least | where |
|---|---|---|---|---|
| laptop @2, cruise | 30,872 | 1.2 levels | -0.7 | rows 1264-1799, the land |
| laptop @2, landing | 8,649 | 1.0 | -0.7 | rows 1312-1799 |
| phone @3, cruise | 18,666 | 1.2 | -0.7 | rows 2032-2531 |
| phone @3, landing | 14,866 | 1.0 | -0.7 | rows 1479-2531 |

- `*-base-head.png`: the whole frames, base left and head right.
- `*-2x-base-head.png`: 300 x 200 of the near sand at 2x.
- `*-diff-x10.png`: head minus base, x10 about mid-grey. The lift lies on
  the sand alone, most over the shaded troughs, where the gap to the sand's
  lit colour is largest, with faint streaks along the wind. The sky, the
  words and everything above the horizon are untouched.

**The least (-0.7) is quantisation.** About a hundred pixels drop one code
in some channel against over a hundred thousand that rise. The shader's
lift is per-channel max(lit - c, 0), and all after it is monotonic.

**At its physical size the layer is faint: at most 1-2 levels.** That is the
physics. A saltation column's optical depth is a few hundredths, so from
14 m up at 60 m and beyond real blowing sand is near invisible, except
looking toward a low sun. The hub's options to make it read more,
forward scattering into the light or scaling past physical, are for their
own PRs.
