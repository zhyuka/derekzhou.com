# #427 the sand's ripples at true size: base | head

The page's own renderer, headless Chromium (software GL, the CI harness).
Base: main d67e9123. Head: #427 bad550d5. Opening 4 at sunset (18:30Z).

**The pose.** These are posed cruise frames. A scratch copy of each build
sets the camera after the page's own camPose; nothing posed is served. The
flight seldom brings the camera this low in a frame the harness can reach.

- **The ground:** an interdune flat of opening 4 at (383, -635). Of the
  ground within 60 m, 97% is level and within 1.5 m of the troughs' floor
  (the page's probe and the mist pools' floor).
- **The camera:** 14 m over the flat, 50 m back from its middle. It heads
  across the wind (126.4 deg), so the crests run toward the eye: side-on.
- **The pitch:** set so the bottom row meets the ground 59 m out (laptop
  +11.05 deg, phone +26.4 deg).

| window | render | pixels changed (of 255, by more than 2) | max | where |
|---|---|---|---|---|
| laptop 1440 x 900 @2 | 2880 x 1800 | 154,717 | 9 | rows 1356-1799 (the near band) |
| phone 390 x 844 @3 | 1170 x 2532 | 61,381 | 7 | rows 2151-2531 |

- `*-near-base-over-head.png`: the near band at 1:1, base on top, head
  below (laptop (1040, 1500)-(1840, 1800); phone (185, 2232)-(985, 2532)).
- `*-near-2x-base-head.png`: a 200 x 150 piece of it at 2x, nearest
  neighbour, base left and head right.
- `*-full.png`: the whole frames.

**What the head shows:**

- **The megaripples (0.9 m) cross the interdune flat** as soft, wandering
  crests. In base nothing is drawn there: the old fade by footprint cut off
  at 0.05 m a pixel, and on a phone it never drew at all.
- **The impact ripples (0.15 m) are a fine stripe** running through them,
  near the bottom of the laptop frame only, where they span 5 px a
  wavelength or more side-on. On the phone they are gone, as the numbers
  in #420 said.
- **No speckle or moire at 1:1 or 2x.** The fade is by pixels a wavelength
  (whole from 5, gone under 2.5). test/unit/ripples.mjs holds both classes
  to at most half a level of flicker over the filtered truth in motion.

**The landing frames are unchanged:**

- The gate's T1 on bad550d5: "green, frames identical: every frame, DOM and
  still the base's".
- Here, laptop @2 at the landing: opening 3 at first light differs by at
  most 1 level, no pixel more. Opening 4 at sunset is the same bytes (max difference 0).
