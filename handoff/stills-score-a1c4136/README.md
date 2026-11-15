# The openings, scored from a1c4136's 2,304 stills

Scored 2026-11-15 on the PC's CPU, in Python, from the bake's lossless PNGs. No GPU was used for scoring and the site repo is untouched. Step 1 of curated openings (delight-visit.md §5.2).

## Source

- **Stills:** the bake cache key df63d94f…7200, which I confirmed equals `worldKey` of a1c4136's plain build. Its night bake and release upload finished at 12:06 UTC.
- **What's in it:** 6 skies × 16 openings (k) × 2 tiers × 12 shapes = 2,304 stills, read as PNG at the bake's own size.
- **Word boxes:** read from a1c4136's page with headless Chrome, GPU off, at each baked window (boxes.json, from layout.cjs). Covered: `.name`, `.words`, `.credit` and the sound button.

## Two findings first

1. **There are 64 distinct openings, not 96.**
   - Dawn and day stills are byte-identical in 365 of 384 cases; rain and sunset in 362 of 384 (bake.json sha).
   - Dawn (6.5 h) and day (10.5 h) both open on first light. Rain (14.5 h) and sunset (17.5 h) both open on the afterglow.
   - So the ranking is over first light (dawn/day), afterglow (rain/sunset), dusk and night, × 16.
2. **W8 passes on every still.**
   - The highest OKLab L anywhere in the 2,304 is 0.524, so no pixel is over 0.53. That holds whatever the moon's footprint.
   - No moon disc is in frame in any night opening I looked at (all 16 at 1920x1080, by eye). The moonlit nights show only moonlit clouds.

## The night's kinds, by k

The kind is read from the stills; the 1920x1080 contact sheet confirms it.

| Kind | Openings | Feature visible? |
|---|---|---|
| Galaxy | k0, k7, k11, k15 | Visible on k7, k11 and k15. k0's band is mostly under cloud: band share 0.14, against 0.30-0.39. |
| Aurora | k2, k5, k9, k10, k12, k13, k14 | Visible on all 7 (green share 0.22-0.58) |
| Moonlit | k1, k3, k4, k6, k8 | No moon disc in frame on any |

## How each still is scored

score.py computes the measures below, and rank.py combines them.

- **Subject:**
  - Spectral-residual saliency of the luma at 128 px wide, with the word boxes masked out.
  - The strongest salient blob's mass, times exp(−d²/2·0.08²), where d is its centre's distance from the nearest third point.
  - It is a proxy for "a landmark or form at roughly a third". It also fires on clouds and islands.
- **Busy under the words:** the mean |∇L| (OKLab, ×100, per CSS px) inside the word boxes. Lower is calmer.
- **Night feature:**
  - Aurora: the share of pixels with OKLab a < −0.03 and L > 0.25.
  - Galaxy: the share of the upper 60% with a > 0.003 and L > 0.29. The band reads a ≈ +0.008 and L 0.32-0.35; cloud over it reads a ≈ −0.006 and L 0.25.
  - Visible (+1): aurora > 0.1, galaxy > 0.25. Hidden (−1): galaxy < 0.2, or moonlit with no disc in frame.
- **W8:** pixels over L 0.53 outside a moon footprint of 4.5° (px per degree from the frustum). Bird-sized blobs are counted apart. A failure would rank first; there are none.
- **Composite:** z(subject) − z(busy) + night feature. An opening's score is the mean over its 24 windows, and both hour bands where they differ.

## Worst 20 openings

| # | Opening | Score | Subject | Busy (max) | Night feature | Worst window |
|---|---|---|---|---|---|---|
| 1 | night k1 | −1.85 | 0.095 | 0.45 (0.68) | moonlit, none in frame | lo-1080x1080 |
| 2 | first light k0 | −1.78 | 0.056 | 0.53 (0.69) | | lo-1080x1080 |
| 3 | night k3 | −1.31 | 0.094 | 0.38 (0.52) | moonlit, none in frame | lo-1350x1080 |
| 4 | first light k2 | −1.26 | 0.063 | 0.47 (0.64) | | lo-1350x1080 |
| 5 | night k0 | −1.23 | 0.050 | 0.34 (0.47) | galaxy under cloud (0.14) | lo-1350x1080 |
| 6 | dusk k0 | −1.09 | 0.054 | 0.44 (0.58) | | lo-1080x1080 |
| 7 | night k6 | −0.90 | 0.030 | 0.24 (0.43) | moonlit, none in frame | lo-1080x1080 |
| 8 | night k4 | −0.90 | 0.017 | 0.23 (0.41) | moonlit, none in frame | lo-1080x1080 |
| 9 | first light k1 | −0.86 | 0.072 | 0.42 (0.62) | | lo-1350x1080 |
| 10 | afterglow k0 | −0.68 | 0.051 | 0.38 (0.49) | | lo-1080x1080 |
| 11 | first light k15 | −0.57 | 0.144 | 0.47 (0.68) | | lo-1080x1080 |
| 12 | first light k14 | −0.56 | 0.104 | 0.42 (0.64) | | lo-393x861 |
| 13 | afterglow k2 | −0.40 | 0.057 | 0.34 (0.48) | | lo-1350x1080 |
| 14 | dusk k14 | −0.40 | 0.066 | 0.36 (0.55) | | lo-1080x1080 |
| 15 | first light k12 | −0.39 | 0.069 | 0.36 (0.62) | | lo-1080x1080 |
| 16 | first light k5 | −0.33 | 0.057 | 0.34 (0.59) | | lo-1080x1080 |
| 17 | dusk k2 | −0.29 | 0.078 | 0.35 (0.46) | | lo-1350x1080 |
| 18 | dusk k1 | −0.27 | 0.064 | 0.34 (0.49) | | lo-1080x1080 |
| 19 | first light k10 | −0.22 | 0.070 | 0.34 (0.55) | | lo-1080x1080 |
| 20 | dusk k5 | −0.21 | 0.027 | 0.28 (0.49) | | lo-1350x1080 |

**Pattern:**
- The worst window is almost always the lo tier's square or 1350x1080 shape. That is a 393 CSS px-tall window, where the three word blocks cover most of the frame and clouds and islands sit under them.
- k0, k1 and k2 are weak on every sky.
- Every moonlit night ranks low: no moon is in frame.

## Best 16 marvel candidates

| # | Opening | Score | Subject | Busy | Night feature | Best window |
|---|---|---|---|---|---|---|
| 1 | afterglow k8 | +1.74 | 0.167 | 0.18 | | hi-2268x1080 |
| 2 | first light k8 | +1.67 | 0.197 | 0.22 | | hi-2268x1080 |
| 3 | afterglow k4 | +1.41 | 0.134 | 0.19 | | hi-1920x1080 |
| 4 | dusk k8 | +1.27 | 0.113 | 0.18 | | hi-2268x1080 |
| 5 | dusk k4 | +1.13 | 0.116 | 0.20 | | hi-1920x1080 |
| 6 | night k7 | +1.08 | 0.085 | 0.31 | galaxy, clear (0.39) | hi-2268x1080 |
| 7 | night k11 | +0.81 | 0.027 | 0.28 | galaxy, clear (0.38) | hi-2268x1080 |
| 8 | night k15 | +0.80 | 0.100 | 0.34 | galaxy (0.30) | hi-1728x1080 |
| 9 | night k8 | +0.76 | 0.206 | 0.22 | moonlit, none in frame | hi-2268x1080 |
| 10 | first light k4 | +0.58 | 0.065 | 0.22 | | hi-1920x1080 |
| 11 | afterglow k6 | +0.54 | 0.043 | 0.20 | | hi-1920x1080 |
| 12 | afterglow k13 | +0.46 | 0.028 | 0.19 | | hi-1728x1080 |
| 13 | night k13 | +0.44 | 0.009 | 0.31 | aurora (0.23) | hi-2268x1080 |
| 14 | afterglow k9 | +0.43 | 0.034 | 0.20 | | hi-2268x1080 |
| 15 | afterglow k7 | +0.40 | 0.020 | 0.19 | | hi-2268x1080 |
| 16 | afterglow k11 | +0.40 | 0.028 | 0.20 | | hi-1350x1080 |

**Pattern:**
- k8 and k4 lead on every daytime sky: calm sand under the words, a temple-topped rise at the left third, and a twin tower at the right third.
- The clear galaxy nights (k7, k11, k15) are the best nights.
- The aurora nights score in the middle, because their subject and busy terms pull them down. The aurora itself is visible on all 7.

## Pictures

All are true size, from each opening's worst (or best) window.

- **worstN_* and bestN_*_full.png:** the whole still at its baked size.
- **worstN_* and bestN_*_words-crop.png:** the ground under the word boxes, 1:1, with 60 CSS px around.
- **sheet_worst5_top_best5_bottom.png:** a 300 px-tall contact sheet, for orientation only, with the word boxes outlined.

## Files

- openings.csv: the 64 openings.
- stills.csv: all 2,304 stills with every measure.
- The scripts: score.py, rank.py and layout.cjs, plus boxes.json.

## Limits

- Subject saliency is a proxy. It scores clouds and floating islands as subjects as readily as a landmark.
- The galaxy share threshold (0.2-0.25) was set from these four nights: k7 and k11 clear, k0 covered.
- "No moon in frame" was checked by eye on the 1920x1080 stills. It was not measured on every window.
- The near pass by 30-40 s, the score's fourth item, needs the visit ruler and isn't here.
