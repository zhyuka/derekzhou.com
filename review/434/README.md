# #434 slip faces: base | head, a dune side-on

Posed frames from the page's own renderer, headless Chromium (software GL,
the CI harness), at sunset (18:30Z). Base: main 83651e08. Head: #434
72bf48bd.

**The pose.** A scratch copy of each build sets the camera after the page's
own camPose; nothing posed is served. A slip face (29-34 deg, falling
downwind) about 150 m from each landing, found on the page's own land grid:

| opening | the face | the camera | heading |
|---|---|---|---|
| 4 | (135, -67) | (200, -12, -115) | -53.6 deg |
| 3 | (-31, -151) | (-60, 3, -225) | 21.7 deg |

- The camera is 80 m across the wind from the face, 14 m over its own
  ground, looking along the crests (the dune side-on).
- Pitch as #427's: laptop +11.05 deg, phone +26.4 deg.
- `opening*-*-base-head.png`: base left, head right.

**The result: no pixel differs, in all four frames** (max difference 0).

**Why:** the world lights every opening from upwind.

- The key light's horizontal direction against the wind, by opening 0-15:
  -0.90, -0.60, -0.69, -0.85, -0.80, -0.98, -0.73, -0.93, -0.64, -0.62,
  -0.94, -0.99, -0.82, -0.84, -0.86, -0.65. It is fixed per opening, the
  same at every hour.
- So every slip face, which faces downwind, stands in shade.
- In shade the sand's diffuse ramp is flat (ndl under -0.08), and #427's
  ripples there tilted a normal that changed no pixel.

The change is right by the physics (avalanches wipe a slip face's ripples)
and holds if a light ever comes from downwind. On today's skies it changes
nothing a visitor sees. The stoss faces the light, keeps its ripples, and is
the same in both.
