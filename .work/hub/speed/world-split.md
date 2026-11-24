# Splitting world.js: the numbers first (load-perf, 2026-11-24)

**Verdict: keep one file and raise the line.** On the slow-phone profile (Lighthouse's mobile: 150 ms RTT, 1.6 Mbps,
CPU 4x) the first frame's scripts arrive **32-44 ms** sooner. That is under the hub's ~50 ms bar, and it is an upper
bound that holds only on a day opening. On a night opening the gain is about 10 ms.

## 1. What could split off

I took each part out of a copy of `src/world/` and rebuilt it with the shipping build (`parts.mjs assemble --ship
--min-glsl`, then `minify.mjs`). Each saving is the Brotli 11 size of world.js with and without that part, from
**124,636 B** on main 19076eb5.

| part (src/world/) | needed for the first frame? | Brotli saved |
|---|---|---|
| the night: 219-meteors, 225-night-sky-moon-path, 226-moonlit-stay, 227-night-bodies | only on a night opening (dusk and night: 10 of 24 hours) | **10,021 B** |
| 340-input-drag-anywhere-phone-turn | not until the first drag | 2,031 B |
| 480-lost-context, 512-score-feed | no | about 1,100 B |
| 216-events, 229-mist-pools, 239-creatures | no (rare sights) | 793 B |
| **all of the above** | | **13,723 B** (124,636 -> 110,913) |
| 470-reduced-motion | yes: its still frame *is* the first frame | (kept) |

The shader text stays. About 66 K of world.js is GLSL, and the night's sky, aurora and galaxy live inside the sky
program (`sky-body.glsl`), which the first frame compiles. Taking those out means a second compile of the sky later,
which is a new cost and its own pop risk.

## 2. Before and after (headless Chromium, cold, median of 5)

Before is main's plain build. After is the same build with all of the parts above removed. That is the most a split
could gain: it treats the late part as loading for free. "World's scripts in" is when the last of the world's and the
kits' scripts is in. Headless uses a software GL, so the world stands down and this time stands in for the first world
frame (tools/loadperf.mjs).

| profile | link | before | after | gain |
|---|---|---|---|---|
| mobile (the slow phone) | socket throttle (one shared link, like a real one) | 1,356 ms | 1,324 ms | **-32 ms** |
| mobile | per-request emulation (CDP) | 1,851 ms | 1,807 ms | -44 ms |
| slow4g | socket throttle | 2,563 ms | 2,489 ms | -74 ms |
| slow4g | per-request emulation | 2,981 ms | 2,897 ms | -84 ms |
| desktop | none | 98 ms | 96 ms | -2 ms |

- **First paint:** unchanged on every profile (the words and the still paint at about 0.6 s on mobile).
- **What the gain moves:** only the moment the live world replaces the still, not anything a visitor sees first.
- **Night openings:** only about 3.7 K could split off (no night parts), so about 10 ms on mobile and 20 ms on slow4g.
- **Link sharing:** world.js shares the link with about 130 KB of other scripts requested in the same moment (birds,
  kits, plan). With per-request emulation it finishes nearly last.

## 3. What it costs

- **No rule-compatible late load.** The site's absences forbid JS-made DOM and any network but the sound sheet, so the
  late part cannot be injected or fetched after the first frame. The only way to load it is a second static
  `<script defer>` in index.html. That script is requested in the same moment as everything else and shares the same
  link, so most of the table's gain goes back to it. The real gain is below the upper bound above.
- **Upkeep:** one more request, one more content-named file, one more `_headers` block and cache entry, one more
  budget line and smoke entry, and the order of two deferred scripts to keep right.
- **Pop risk (a defect under no-fades):**
  - The sky order can reach a night stay after any change (holds of 70-110 s). If the late part is not in by then
    (slow link, a failed request), the night cannot be drawn as planned. Either the sky order would have to change,
    which is visible and breaks the weather's draw, or the moon, meteors and stars would appear late, which is a pop.
  - A drag before 340's code is in would be dropped. Only a drag steers, so the first steer would be lost.
- **Night openings gain nothing,** and pay the extra request and the ordering.

## 4. The simplest version, if it were wanted

- **Files:** one extra file, `world-late.js`, holding only 340, 480, 512 and the events (about 3.7 K, needed on every
  opening only after the first frame), as a second static `<script defer>` after world.js.
- **Night parts stay:** they are needed at any night opening and before any night stay, so they belong in world.js.
- **Payoff:** about 3.7 K off the first frame, roughly 10-20 ms on the slow phone, for one more request and the
  ordering risk. **Not recommended.**

## Recommendation

- **Keep one file.** Raise the line as the queued work needs (#375 to 124 K).
- **A bigger lever than any split, for the time the live world replaces the still on a phone:** the bytes that share
  the link with world.js (BACKLOG row 4: the bird scripts, 53 KB, requested in the same moment). Whether lowering
  their priority would let world.js arrive sooner needs a measurement on a real link, which the cloud's socket
  throttle can approximate. That is a separate item; I can measure it next if the hub wants.

Commands: `tools/parts.mjs assemble --ship --min-glsl` on a copy of src/ with the parts removed; `tools/minify.mjs
--report`; `tools/loadperf.mjs DIR --profiles mobile,slow4g,desktop --runs 5 --cold-only --br 11 [--net socket]`.
