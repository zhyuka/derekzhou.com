## Cloud physics → build spec (research only; nothing written to either repo)

Site paths are under /home/user/derekzhou.com/ (local checkout 9725e30). Lines marked "main" were re-checked on GitHub main at 7ab73d1. The source texts I extracted are in /tmp/claude-0/-home-user/9afca4a1-d829-5639-9f89-586361aa6223/scratchpad/clouds/.

**Bottom line:**
- Every free cloud really does move with the wind at its own level. Only clouds held by terrain stay put: a fog or cloud sea in its basin, and cap or lee-wave clouds.
- Every sky the world shows is dusk, night or dawn. Physics says that at those hours land cumulus are flattening and dying, desert nights are clear, and the cloud sea plus cumulus over the sea are at their maximum.
- "Frozen" is right for the cloud sea and wrong for the cloud bodies.

### (1) The physics

| Fact | Numbers | Source |
|---|---|---|
| Cumulus move with the wind at their base | Cloud motion is a "very good estimator of the cloud-base wind" (trade-wind cumulus, checked by aircraft) | cumulus motion, 1979, https://ntrs.nasa.gov/citations/19790013548 |
| Low cloud motion often matches the cloud-layer average better than base or top | Assigning low motion vectors to cloud base is questioned | low-cloud motion vectors, 2014, https://repositorio.aemet.es/bitstream/20.500.11765/1593/1/2014_JAMC-D-12-0337.pdf |
| Inside a mixed layer the wind is nearly uniform with height | Jumps of "several m/s" in speed and "several tens of degrees" in direction happen across the capping inversion | stratocumulus review, 2012, https://atmos.washington.edu/~robwood/papers/reviews/sc_review_revised_single.pdf ; the meteorology text ch18 (wind uniform above the radix layer), https://www.eoas.ubc.ca/books/Practical_Meteorology/prmet102/Ch18-abl-v102.pdf |
| Wind turns with height (Ekman) | Surface-to-geostrophic angle about 32° at Cabauw; the angle grows with wind speed and shrinks with boundary-layer depth (so it is larger at night) | wind turning in the boundary layer, https://www.ecmwf.int/sites/default/files/elibrary/2016/16644-wind-turning-boundary-layer.pdf |
| Daily cycle of the wind | Fair weather over land: daytime wind uniform through the mixed layer. At night the surface goes calm while air a few hundred m up becomes faster than geostrophic by about 3 AM (the nocturnal jet) | the meteorology text ch18 Fig 18.18 |
| Cloud streets and banks lie along the wind | Rolls lie within 30° of the mean wind, most often within 10°. Streets come with 5-10 m/s surface wind, wind rising with height to at least 10 m/s, direction varying no more than 20-30° | https://par.nsf.gov/servlets/purl/10167646 (search summary) ; https://resources.eumetrain.org/satmanu/CMs/ClStr/navmenu.php?page=3.0.0 ; the meteorology text ch6 (streets parallel to the mean wind, about 2× the boundary-layer depth apart), https://www.eoas.ubc.ca/books/Practical_Meteorology/prmet102/Ch06-clouds-v102b.pdf |
| How long cumulus live | In an LES of trade cumulus, lives are skewed short: about a third last under 4 min, the tail reaches about 60 min, and clouds grow in pulses about 15 min apart; core updrafts exceed 1 m/s. Satellite tracking: most marine cumulus live tens of minutes | cumulus life cycles, 2012, https://acp.copernicus.org/articles/12/1101/2012/ ; https://e-docs.geo-leo.de/handle/11858/9771 |
| How fast cumulus grow | Convective velocity scale about 1 m/s. Shallow-cumulus cores rise faster than 1 m/s. Multi-turret cumulonimbus tops rise 2-13 m/s | the meteorology text ch18 ; the cumulus life-cycle study ; https://www.jstage.jst.go.jp/article/jae/32/1/32_13/_article/-char/en |
| Size | A fair-weather cumulus is about 1 km across, about as deep as it is wide; sizes follow a lognormal spread | the meteorology text ch6 |
| Daily timing over land | Cumulus form on clear mornings, peak "usually in midafternoon", and "disappear in the late afternoon or early evening" | WMO, https://cloudatlas.wmo.int/en/explanatory-remarks-and-special-clouds-cumulus.html |
| Evening decay | "Stratocumulus cumulogenitus" forms in the "late afternoon and evening when convection ceases and the domed tops of the Cumulus clouds flatten"; "often the Cumulus dissipates completely from the base upwards" | WMO, https://cloudatlas.wmo.int/en/stratocumulus-may-form.html |
| Over the sea at night | "Maximum Cumulus activity appears to occur in the late hours of the night." Stratocumulus cover and thickness peak "before sunrise"; the daily swing exceeds 20% of the mean, about twice that over land | WMO (as above) ; the stratocumulus review |
| Fog and the cloud sea | Forms on clear, nearly calm nights; 2-7 kt thickens it, stronger wind prevents it; cold air draining into valleys deepens it; it is deepest near sunrise; sunlight lifts it into stratus, and it clears "from the edges toward the center". Its depth grows like the square root of time, tens of m over hours | NWS, https://www.weather.gov/media/zhu/ZHU_Training_Page/fog_stuff/fog_guide/fog.pdf ; https://cimss.ssec.wisc.edu/satellite-blog/archives/323 ; the meteorology text ch6 |
| Desert | The Saharan boundary layer is 5-6 km deep; its clouds form at about 5 km, are only about 20 hPa (roughly 200 m) thick, and cover at most about 4% around 17 UTC. Stable nights over land: only stratiform cloud or fog | Saharan boundary layer, 2015, https://eprints.whiterose.ac.uk/84968/7/jas-d-13-0384.1.pdf ; the meteorology text ch18 |
| Cloud base | Flat, at the lifting condensation level ≈ 0.125 km per K of dew-point spread | the meteorology text ch6 ; WMO, https://cloudatlas.wmo.int/en/cumulus-cu.html ("base relatively dark and nearly horizontal") |
| Edges | Growing cumulus: "sharp outlines", top "often resembles a cauliflower". Decaying: flattened domes, ragged "fractus" shreds | WMO cumulus-cu (above) ; https://cloudatlas.wmo.int/en/clouds-species-fractus.html |
| Silver lining | Backlit, "every cloud has a silver lining" | WMO explanatory remarks (above) |
| Clouds that stand still | Lenticular and cap clouds are stationary because the air flows through them | the meteorology text ch6 |
| Earth's shadow on clouds after sunset (my geometry) | h = R(1/cos δ − 1): with the sun 1° down only cloud above about 1 km is lit; at 3° down, above about 8.7 km | derived |

How fast things move on screen, from v/d (17.3 px/deg on a 1440 px desktop, 10.2 on a phone):

| Rate | 150 m | 1 km | 3 km | 10 km |
|---|---|---|---|---|
| The camera's own sideways parallax, 12 m/s | 79 px/s | 12 | 4.0 | 1.2 |
| Body drift 8.5 m/s, crosswind | 56 | 8.4 | 2.8 | 0.8 |
| Turret rising 1 m/s | 6.6 | 1.0 | 0.3 | 0.1 |
| Edge eroding 0.3 m/s (my estimate: a ~300 m cloud clearing in 5-10 min) | 2.0 | 0.3 | 0.1 | 0 |
| A 20 m billow's size on screen | 132 px | 20 | 6.6 | 2 |

So cauliflower detail reads within about 3 km. Beyond that only lobes 60-120 m across read.

### (2) What the world does today, and the gaps

- **The clock.**
  - `SIM.t` is real seconds of flight in fixed 1/60 s steps driven by rAF (270-flight.js:11-12, 430-simulation-driven.js:14-21).
  - The shader clock is float32 `uT = u + 40` (413-draw-frame.js:36). `clockNow()` is for budgets only (000-head.js:40-44).
  - The sky is not a day clock. It is a random sequence of six twilight and night skies: holds of 70-190 s (×0.9-1.15), changes of 55-60 s (220-time-day.js:19-27, 222-sky-order-cycle.js:35). That runs the light roughly 15× (afterglow) to 150× (night) faster than real.
- **The wind.**
  - There is one per visit, `V.wind` (realm-dunes.js:131). Sand grains move at 6.5 m/s, veils at 5.5, motes at 1.6 (realm-dunes.js:197-201); birds use `WIND_AIR` 6.5 (490-birds-host.js:13,52).
  - The maps' wind (132-maps.js:87) shapes only the dunes. No cloud reads any wind.

| # | Gap | Where |
|---|---|---|
| G1 | Bodies never move: each centre is fixed when its volume is prepared, and every reader takes that fixed point | 210:31 (main 210:41) `c: new Float32Array(c)`; 410:72-73, 87, 108 (main); 236:59; cores and soft lobes 231:54-63; obstacles 280:4-13; slip 283:64-74; birds 490:114 |
| G2 | The only motion is a billow slide of 0.005 tiles/s × 80-120 m, i.e. 0.4-0.6 m/s in one fixed world direction that ignores the wind, sampled at world coordinates. If bodies moved as they are now, their billows would slide through them at the wind's speed | fs-vbody.glsl:71 (main) |
| G3 | Clouds live in land cells that are freed 1.3 radii behind the camera. Moving clouds would pop when their cell is freed | 230:2-12, 236:26-29 |
| G4 | The high deck at 3000 m is frozen (no clock) and its streaks run along world x instead of the wind | sky-body.glsl:97-105 |
| G5 | Range banks point in a random direction, not along the wind | realm-dunes.js:115 |
| G6 | Towers stand straight up: the generator supports a lean, but no caller passes one | 120-cloud-bodies.js:17,22,27; realm-above.js:115 |
| G7 | The same cloud population in all six skies | realm-dunes.js:115; realm-above.js:19, 84-106 |
| G8 | No life cycle: each body is baked once | 210 volBake |
| G9 | Bank bases at 480-680 m above the dunes are physical only for moist air (a 4-5 K dew-point spread); desert cumulus bases sit near 5 km. A style choice: keep it | realm-dunes.js:115 |
| G10 | In the afterglow, cloud light still comes from the baked sun 5-14° up, with its silver lining, although low tops are in Earth's shadow. This is the SKY lane's | realm-dunes.js:144; 220 header |
| G11 | A stale comment: it says bodies fade "over 2.5 s from its bake", but the code fades by distance only | fs-vbody.glsl:103-104 against 410:55-57 |
| ok | The cloud sea's surface has no clock. That is right for a cloud sea held in its basin | above-glsl.glsl |

### (3) Build spec, in the world's units and clock

Motion and life-cycle dynamics run on `SIM.t` at real rates, 1:1. Time of day is a state (the sky when a cell is laid out), never a time-lapse. Write U0 = `WIND_AIR` = 6.5 m/s along `V.wind` azimuth `wa`; "+θ" means `wa + θ`.

| Layer | What | Height | Drift |
|---|---|---|---|
| Deck | The cloud sea, `HdSea` | y −110…−20 | 0. It stays put; its top grows only about 0.003 m/s, which is invisible |
| Surface | Sand, birds | 0-50 m above ground | U0 along `wa`, as today |
| Low | Every cloud body: towers, great cumulus, canyon walls, ranges | about +100…+1500 m | Moves as one rigid field: **1.3 U0 = 8.5 m/s at wa + 20°** |
| High | The 3000 m streak deck | 3000 m | **2 U0 = 13 m/s at wa + 40°**, its streaks turned onto that direction |

The 1.3 and 2.0 ratios and the 20° and 40° turns are my choices inside the ranges above. Reconcile them with the wind researcher's profile.

**Phase 1: rigid drift (one visible PR, the owner lands it)**
1. One position function, `cloudPos(b, t) = b.c0 + W_low·t`, in JS doubles at the draw's time (`SIM.t − (1 − alpha)·SIM_DT`). Every reader in G1 must go through it, including the cells' bounds and the canyon and tower POIs and flocks.
2. Air cells.
   - Lay clouds, plus the POIs and flocks tied to them, in their own grid keyed by `x − W_low·t`, with the kits' sizes and radii (dunes 1500/5200, cloud sea 1200/3800). Stream that grid from the camera's air-frame position.
   - Isles and landmarks stay in world cells.
   - Gates (`aboveKeep`, `densD`) are evaluated where the body is when its cell is laid out, which is out of view.
3. fs-vbody.glsl:71: make the noise coordinate body-relative (`p/uVR.z` plus a per-body seed offset) and remove `uT`, so the billows ride with the body.
4. Slip plan (283:64-74): plan cloud cores at their meeting point, `t* = s0/(V − W·ĥ)`, `l* = l0 + (W·r̂)·t*`. The hard rule (286) keeps using current positions.
5. Flight band. With drift, bodies cross coasts and ridges. Lift each body by a pure function of `t`:
   - `y(t) = max over τ in [t−T, t+T] of (need(x(τ)) − 0.5·|t−τ|)`, with `need` the band top from `bandTopAt`.
   - In words: the cloud rides up over the ground ahead at no more than 0.5 m/s, about the forced ascent of 8.5 m/s air over a 5% rise.
   - This replaces the world6 judges' rule that no cloud-sea piece floats over sand (a hub rule, not the owner's).
6. Ranges point along the wind: `dir = wa + 20° ± 15°`. Towers lean downwind: `lean = clamp(Δu/(2w), 0, 0.15)`, with `w` about 1.5 m/s.
7. The high deck: an offset `O = W_high·SIM.t` computed in doubles, wrapped to the noise tile (153.6 × 38.4 km), sent as a uniform. Overhead that is about 4.3 px/s.

What it changes on screen:
- Air cells arrive at the camera's speed through the air, |V − W| = 3.5-20.5 m/s depending on heading, instead of a fixed 12. Flying downwind, the clouds hang almost still.
- The camera at 12 m/s always outruns the low layer.

**Phase 2: life cycle, near bodies only**
- Distance scope: re-bake key shapes for bodies within about 2.5 km; beyond that, every `12 s × d/1 km`, up to 120 s, so no state ever jumps.
- Blending: blend each body's last two bakes in the distance channels (r, a) and the light channels. That interpolates shape; there is no alpha term.
- Mode by the sky its cell was laid out under:
  - **Active** (moonlit, Milky Way, aurora, first light): crown lobes pulse up on a period of 12-18 min, amplitude about 0.12 H (at most 100 m). The rise takes a quarter of the cycle, about 0.45 m/s; the fall about 0.15 m/s.
  - **Spreading** (afterglow, blue hour): crowns flatten and spread at the inversion over about 20 min, saturating. Base lobes thin from below by up to 20% (fractus).
- Caps: outline speed at most 0.5 m/s, which is at most 0.1 px per frame at the nearest 80 m pass. Nothing is born or dies in view.

**Phase 3: population by sky (new air cells only)**
- Ranges over the dunes: ×1.0 afterglow, ×0.6 blue hour, ×0.2 the three nights and first light. Clear desert nights also suit the stars.
- Towers and great cumulus: ×0.8 afterglow, ×0.7 blue hour, ×1.0 night and first light.
- Canyons stay ×1 (they are places).

### (4) The site's rules

- **No fades.** Bodies arrive and leave only across the streaming edge, where the weight depends on distance alone (410:55-58). The record's checker already counts "a distance is not a clock's fade" (.work/w6suite/r2/notes.md:78). They can also cross the window's edge. Population changes come only through cells laid out beyond the fade band. Phase 2 changes geometry, never alpha over time. Nothing is born or dies in view, which keeps the owner's own brief, "Nothing appears on a timer, only out of the distance" (.work/cw/HANDOFF.md).
- **No glitter or crawl.**
  - A rigid move with body-relative billows is, to the march, exactly the camera moving the other way, so its stability carries over.
  - Removing the `uT` slide removes the crawl.
  - Phase 2 motion is smooth and under a pixel a frame.
- **One clock, one entropy read.** Drift is W·`SIM.t`, never `clockNow`, Date or Math.random. W comes from `V.wind` and fixed ratios. Any new per-visit draw takes a new `subseed` index (for example 47), so no existing stream shifts. Positions are pure functions of t, so the baked opening still matches the cut.
- **Never darken.** Nothing reads the words. A cloud's shade passing behind the name is the world's own light, as parallax already moves it today.
- **Reduced motion.** `SIM.t` holds, so the frame is one still, and identical when redrawn.
- **Steering.** Drift never turns the view. Slips are the existing "passed by a slip sideways" behaviour.

### (5) Fastest proof for each part

| Part | Proof |
|---|---|
| Kinematics | Unit test (ms): `cloudPos` numbers, plus a source scan that no reader in G1 reads `c0` directly, with a plant |
| Billows ride the body | Shader text test (no `uT`, no `uVC` in the noise term), plus the CLOUDS lane's Node march port: a body moving at W with the camera at V equals a still body with the camera at V − W (within 1e-6 alpha) |
| No pops | Node sim of the air-cell bookkeeping: 30 min, random drags; every body's first drawn weight ≤ 0.001, none freed while drawn |
| Moving cores | Node sim with the flight's slip-plan code (test/unit/flight.mjs pattern): 1,000 encounters, never inside a core, cloud margin 1.6× kept |
| Flight band and orographic lift | Node sim over the maps' JS (`kitAt`, `bandTopAt`): 10,000 bodies × 20 min; lowest billow always ≥ band top; vertical speed ≤ 0.5 m/s |
| High deck | Unit test: the offset is wrapped and computed in doubles |
| Phase 2 | Node march port: frill decorrelation per frame from evolution alone ≤ 0.1× the 1 px control |
| Rules, still and reduced motion | Existing checks: 34-reduced-motion, 36-boot-frames, 25-world-rules |
| Final look | A T2 film on the 4090, true-size crops looked at before the PR goes to the owner |

### (6) The hub's "frozen clouds" decision is physically wrong, in part

The decision (CHECKIN.md, 19:04 and 23:06 UTC Nov 14; .work/scratch/audit-1114/plan.json:66-75, 870-879) mixed two things:
- **Dropping the `uT` slide is right.** Billows are carried with the cloud's own air; they do not slide through it at a fixed 0.5 m/s in a fixed direction.
- **Freezing the bodies is wrong.** Only terrain-held clouds stand still: the cloud sea, and cap or lee-wave clouds. Cumulus follow their base wind to within about 1 m/s.
- **It contradicts the world itself.** The world already blows sand and carries birds on a 6.5 m/s wind; still clouds would need dead calm through the whole boundary layer.
- **It contradicts the style research and the owner.** The style round's principle 8 says one wind should visibly move cloud and sea (.work/birdstyle-round/r3/RETURN.md:55-61). The owner said on 10-02: "why is the background not moving or changing at all?" (.work/audit/ledger/ledger.md:45).

Replace "frozen" with: the cloud sea static, the bodies drifting rigidly by layer (Phase 1), slow pulses near the camera (Phase 2).

**Keeping the reference's look.** Forms stay round and soft, the reference's own shape language (.work/birdstyle-round/r2/sources.md:28): lobed domes, flat bases, crisp edges on active bodies, the palettes by sky. Physics changes only how bodies move, when each population appears, and whether tops are domed or flattened.

**Low-confidence sources:**
- The roll-alignment and satellite-lifetime figures come from search summaries, not the papers' full text.
- The edge-erosion speed and the layer ratios are my own estimates.
- I could not fetch the AMS glossary, a stereo-camera cumulus paper or a 1961 cumulus study.
