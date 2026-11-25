# The ripples' true size: numbers first (#420)

The hub's ask (00:03Z, Nov 25): the dune sand's ripples are drawn 0.9 m apart
(src/glsl/dunes-glsl.glsl, shadeSand: `ph = dot(p.xz, w) / 0.9`); real wind ripples
are 5-20 cm. Measure what true-size ripples would show from the flight, then
propose (a) true size filtered, (b) keep 0.9 m as the larger class, or (c) both.

## 1. What the page renders (measured in it)

Headless Chromium, the CI harness, opening 4, the live frustum and render target
read from the page:

| window | render target | tanY (half-height) |
|---|---|---|
| laptop 1440 x 900 @2 | 2880 x 1800 | 0.454 |
| phone 390 x 844 @3 | 780 x 1688 (the world renders at 2x, not 3x) | 0.831 |

The shader's footprint is `fp = t * 2 tanY / RES.y` (m a pixel at range t). Today
the ripples fade out between fp 0.012 and 0.05 m a pixel and are gone beyond, so
they can only show nearer than **99 m on the laptop and 51 m on the phone**.

- **At the landing**, the nearest ground in frame is 249 m out on the laptop and
  137 m on the phone (0.13 m a pixel): **no ripple is drawn at all**. Over the
  first ten seconds the camera stays 33-57 m over the surface.
- **In cruise** (the hub's case: 14 m up, ground from 59 m), table.txt:

| range | laptop fp | today's ripple share | phone fp | today's share |
|---|---|---|---|---|
| 59 m | 0.030 m | 0.55 | 0.058 m | 0 |
| 80 m | 0.040 m | 0.16 | 0.079 m | 0 |
| 100 m | 0.050 m | 0 | 0.099 m | 0 |

**On a phone, today's ripples are never drawn**, even in cruise.

## 2. True size in pixels (cruise, ground from 59 m)

Pixels a wavelength: side-on (the crests running toward the eye, spaced across the
screen) and facing (crests across the view, foreshortened by the grazing angle,
0.23 at 59 m):

| wavelength | laptop at 59 m: side-on / facing | 2 px or more side-on within | facing within | phone at 59 m: side-on / facing |
|---|---|---|---|---|
| 0.05 m | 1.7 / 0.4 px | 50 m | 25 m | 0.9 / 0.2 px |
| 0.10 m | 3.4 / 0.8 px | 99 m | 36 m | 1.7 / 0.4 px |
| 0.20 m | 6.7 / 1.6 px | 198 m | 52 m | 3.4 / 0.8 px |
| 0.90 m (today) | 30 / 7.0 px | 892 m | 112 m | 15 / 3.6 px |

Two pixels a wavelength is the least that can show a wave at all. Nothing nearer
than 59 m is in frame, so **true-size ripples facing the view are never
resolvable** on either window. Side-on, 10-20 cm ripples resolve on a laptop
in the near band, and on a phone only 20 cm ones.

## 3. The shading filtered at the pixel (tools/physics/ripple-size.py)

The shader's own ripple term on level sand, laptop, the ground 60-139 m out. Four
ways to draw each wavelength:

- **truth:** 8 x 8 supersampled, the shading as a pixel should average it.
- **raw:** one sample a pixel, no fade.
- **today:** the footprint fade (0.012-0.05 m a pixel).
- **fwidth:** a fade by the phase's change a pixel (`fwidth(ph)`, so 1 / fw is
  pixels a wavelength in its own direction), whole from 4 px a wavelength, gone
  under 2.

Error = mean luma difference from the truth. Flicker = how much more it changes
between two frames (0.27 m forward, 0.05 m aside: one frame of cruise) than the
truth does. Contrast = the ripples' luma spread. All are in levels of 255.

| case | truth contrast | raw: error / flicker | today: error / contrast | fwidth: error / flicker / contrast |
|---|---|---|---|---|
| 0.90 m facing | 4.6 | 0.9 / 1.2 | 3.1 / 1.4 | **1.0 / 0 / 4.6** |
| 0.90 m side-on | 9.6 | 0.1 / 0.0 | 6.7 / 2.4 | **0.1 / 0.0 / 9.7** |
| 0.20 m facing | 1.4 | 4.4 / **6.6** | 0.9 / 1.3 | 1.2 / 0 / 0 |
| 0.20 m side-on | 8.4 | 1.3 / 1.7 | 5.8 / 2.4 | 2.2 / 0 / 7.8 |
| 0.10 m facing | 0.9 | 5.1 / **6.9** | 1.5 / 1.3 | 0.8 / 0 / 0 |
| 0.10 m side-on | 6.1 | 3.6 / **5.6** | 3.9 / 2.4 | 4.5 / 0 / 2.2 |
| 0.05 m facing | 1.7 | 5.1 / **7.5** | 1.5 / 1.3 | 1.1 / 0 / 0 |
| 0.05 m side-on | 2.3 | 7.3 / - | 1.6 / 2.4 | 2.2 / 0 / 0 |

(0.05 m side-on: the 0.05 m step aside is one wavelength, so its flicker reads 0.)

What the table says:

- **True-size ripples point-sampled glitter.** They flicker 5.6-7.5 levels over the
  truth in motion, and the crops' raw column shows moire. They must be filtered.
- **Filtered, true-size ripples are a faint fine texture near and nothing far.**
  Facing the view the truth itself is 0.9-1.7 levels (invisible). Side-on,
  10-20 cm ripples keep 2-8 levels in the near band of a laptop. A phone shows less.
- **Today's footprint fade loses the 0.9 m ripples where they're resolvable**
  (2.4 of 9.6 levels side-on, 1.4 of 4.6 facing). It cuts by range, not by how
  many pixels the wave spans.
- **The fwidth fade never flickers over the truth, in any case.** It keeps the
  0.9 m ripples whole (9.7 of 9.6, 4.6 of 4.6). For true size it keeps what is
  resolvable side-on and drops the rest.

Crops: laptop-facing.png and laptop-side-on.png. Rows are 0.9, 0.2, 0.1 and
0.05 m; columns are truth, raw, today, fwidth. (A plane under a fixed low sun
from the side, the shader's own ripple and shading terms. Not a page frame: no
page frame here gets the camera near enough for any ripple to draw.)

## 4. Is 0.9 m honest as the larger class?

- **Ordinary wind ripples** (impact ripples) run about a thousand grain diameters
  (https://arxiv.org/html/2501.10643v1): 10-25 cm for dune sand of 0.1-0.25 mm.
  So on the dunes' well-sorted sand, 0.9 m is about 4-9 times too big.
- **The larger ripples** (megaripples, often called granule ripples) run from about
  30 cm to several metres, and form only where the sand is poorly sorted, fine
  grains kicking coarse ones along
  (https://arxiv.org/pdf/2208.00888, https://physicstoday.aip.org/news/how-to-build-megaripples-of-sand).
  That is the coarse lag of interdune flats and wind-scoured floors, not a dune's
  flank of fine sand.

So **(b) alone is not honest for this sand**: today the 0.9 m ripples cover every
dune face under 0.42 slope, in patches.

## 5. Proposal: (c), each scale where it belongs, both filtered by fwidth

- **Dune sand: true-size impact ripples, 0.15 m, filtered by fwidth (2-4 px).**
  From the flight that is a faint fine texture side-on near the bottom of a laptop
  frame, nothing facing and nothing far. It never glitters: zero flicker over the
  truth.
- **Interdune flats and coarse floors only: megaripples at 0.9 m, filtered by
  fwidth.** The low, level ground between dunes (the shader already has the
  sand's height band and its flatness), in today's patches. Kept whole where
  resolvable, so they read further than today (about 112 m facing, 892 m
  side-on on a laptop, where today stops at 99 m), and on a phone too (today
  never).
- **Either way, today's footprint fade should go:** it erases resolvable 0.9 m
  ripples and does nothing fwidth doesn't do better.

The two alternatives, for the hub's choice:

- **(a) true size alone:** honest, but from the flight it is almost nothing.
- **(b) 0.9 m alone, filtered by fwidth:** the most visible, but over dune faces
  it claims the coarse sand's ripples where the sand is fine.

Cost: one `fwidth` and one more cosine pair in shadeSand, a few dozen bytes.
