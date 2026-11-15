# Physics audit of the world, apart from clouds, aurora and sand

## Summary
- **Wind.** The world has 5 winds, not one. Most of what moves uses one direction for the whole visit (the dunes, grains, veils and birds). The cloud texture, the high veil's streaks and the land-cover map each have a direction of their own, and the score has its own wind. Speed does not follow height: motes 10 m up drift at 1.6 m/s while grains under 1 m move at 6.5 m/s, the reverse of real air. Nothing changes over time: there are no shared gusts, and the birds' wing gusts are switched off.
- **Birds.** The wind arithmetic is physical (airspeed = ground velocity − wind, crabbing, landings matched to the perch's air velocity). But there is no rising air: a gliding bird can never climb. The circling "wheel" is a thermal behaviour, and the world's six skies are all twilight or night, when thermals are weak or gone.
- **Sky.** Most of it matches: the blue zenith in twilight, the Belt of Venus height, the noctilucent wisps, the Milky Way's brightness and the haze. The gaps:
  - The Earth's shadow reads pink, not blue-grey.
  - The belt still shows in the blue hour at −7°.
  - First light shows 6× more stars than the afterglow at the same −3°.
  - The stars twinkle in a way no real star does.
  - The stars stay fixed while the moon crosses 72–120× faster than the sky really turns.
  - The moon is always full although it sits 50–64° from the sun, where a real moon is 18–28% lit.
  - The land keeps a direct key light at 5–14° up while the sun is below the horizon.
- **Rain and water** are compiled out (NO_RAIN, NO_WATER, NO_PKWX at `src/world/070-programs.js:102`), so nothing shows. **The sea of cloud** is drawn but has no time term at all.

## 1. The winds today

| # | Wind | Where (file:line) | Direction | Speed | Height | Changes with time / place |
|---|---|---|---|---|---|---|
| W1 | The visit's wind `V.wind` | `src/realm-dunes.js:131` | Random 0–360° per visit | unit vector | — | None, anywhere |
| ↳ | Dune crests and ripples | `src/glsl/dunes-glsl.glsl:83,166,217` | W1 | — | ground | None |
| ↳ | Grains | `src/realm-dunes.js:197`, `vs-particle.glsl:17` | W1 | 6.5 m/s ×0.65–1.35 | mean 0.87 m (0.12 lift + 1.6·r² + 0.35 hop) | None |
| ↳ | Motes | `src/realm-dunes.js:198` | W1 | **1.6 m/s** | mean ≈10 m (0–26) | None |
| ↳ | Sand veils | `src/realm-dunes.js:201`, `fs-ribbon.glsl:6` (texture 0.22/0.035 = 6.3 m/s) | W1 | 5.5 m/s | 0–5 m | Each veil fades in and out on its own 5.6–8.4 s cycle (`vs-ribbon.glsl:15`): not shared, not carried downwind |
| ↳ | Birds | `src/world/490-birds-host.js:13,52` → `WINDV` (`src/birds/inkbirds/230-paper-every-bird-3d-cut.js:35`) | W1 | 6.5 m/s | every height, 15–300 m | None |
| W2 | Cloud-body detail noise | `src/world/glsl/fs-vbody.glsl:71` | Fixed world azimuth 53° | 0.004·120 ≈ **0.6 m/s** (0.4 in the cloud-sea kit) | cloud | None; ignores W1 |
| W3 | High veil streak axis | `src/world/glsl/sky-body.glsl:105,122` | Fixed world x (streaks 4:1) | static | 3000 m deck | None; ignores W1 |
| W4 | The maps' wind `mc.wind` | `src/world/132-maps.js:87`; used at `133-maps-height-cover-sun.js:23,100-102` | 80 km noise field, 0.6+1.6·n rad | — | — | Varies over about 80 km. Drives the CPU dune term and windward rainfall (cover), not the drawn dunes |
| W5 | Water ripples `windDir` | `src/world/370-frame-uniforms.js:61` → `frame-u.glsl:19` | Fixed [0.6, 0.8] | — | — | Dormant (NO_WATER) |
| W6 | The score's wind | `src/score.js:554-563` (table at :560) | none (stereo pan) | per sky: afterglow 0.35 > moonlit, first light 0.3 > blue hour, aurora 0.2 > Milky Way 0.18 | — | Four random walks at 1.2, 2, 6.5 and 21 s; none of it reaches the picture |
| — | Wing gusts | `src/birds/model/birdwing.js:264-274` | — | lift 7° / tuck 9°, one per 25 s, per bird | — | Off: `WO.rough = 0` (`230-paper-every-bird-3d-cut.js:56`) |

## 2. The one wind field: physics against the world

| Physics [source] | World | Gap | Visibility |
|---|---|---|---|
| Log profile u(z) = (u*/κ)·ln(z/z0), κ ≈ 0.41, valid in the lowest ~100 m; z0 for desert 0.001–0.005 m [1]. As a share of the 10 m wind: 0.1 m 0.39–0.50, 0.87 m 0.68–0.73, 2.5 m ~0.85, 10 m 1.0, 26 m 1.10–1.13, 60 m ~1.2, 300 m 1.37–1.45 (my calculation) | The 10 m wind each element implies: grains 9.3, veils 6.6, **motes 1.6**, birds 5.3 m/s | Motes are 4× too slow for their height. Grains move faster than the air at their height (real grains move slower than the air). Birds get the same wind at 15 m and 300 m | Medium: motes catch the low sun |
| Direction turns with height: 10° over water to 30° over rough land; 40–50° over land at night in light wind. Surface layer ≈ 10% of the boundary layer; night boundary layer ~300 m [2] | No turn with height anywhere; W2 and W3 are unrelated to W1 (on average 90° apart) | High streaks and cloud texture cross the sand's wind at a random angle | Medium (streaks are on screen in 4 of 6 skies) |
| A gust lasts under 20 s [4]. Inland, the 3-s gust ≈ 1.66 × the 10-min mean [3]. Eddies are carried at the mean wind (Taylor's hypothesis) [5] | Speed is constant (gust factor 1.0). Veils pulse independently; wing gusts are off | No gusts, and no gust fronts travelling downwind | Medium-high once seen |
| Night: a stable layer decouples the ground. Surface wind weakens; a low-level jet forms above, cores ~50–500 m (Blackadar mechanism) [6][2] | Same 6.5 m/s in all six skies (only the score changes speed with the sky) | No day/night cycle; the score and the picture disagree | Low-medium |
| Over a crest, near-surface speed-up ≈ 2h/L [7] | Flat field | No speed-up at crests (the veils already sit on brinks, which is consistent) | Low |

## 3. Birds and the wind

| Physics [source] | World (file:line) | Verdict |
|---|---|---|
| Airspeed = ground velocity − wind [11] | `210-one-bird.js:116-131`; body faces its air velocity (`262-approach.js:180`) | Matches (crabs, speeds up into a head wind up to 1.45× cruise) |
| Land into the (relative) wind [11]; research doc A1 | The perch rides the camera at 12 m/s, so the bird matches the perch's air velocity: `airNeed` at `262-approach.js:28` | Matches: at touchdown it faces the apparent wind. A perched bird's facing side (`264-perch-life.js:5-6`) is the apparent wind's side too, since the camera's velocity has no sideways part |
| Slope lift on windward faces; birds glide in straight lines in hill lift and circle in thermals [8][9] | Gliding cannot climb (`210-one-bird.js:120`); no lift field | No slope soaring at all |
| Thermals build after dawn, peak at midday, fade toward evening; heavy soarers wait hours after sunrise [10] | The "wheel" goal circles, drifts downwind at 0.7 × wind and climbs 0.4 m/s (`210-one-bird.js:239`), in all three twilight skies (12–14% of goals) | The thermal behaviour runs in light that has no thermals. The physical twilight soaring is gliding along windward faces |
| Gust fronts cross the sky at wind speed (research doc B13) | None | Missing |

The research doc is `/home/user/derekzhou.com-workspace/.work/hub/birds-behaviour-research-2026-11-06.md`.

## 4. The sky through the day
Six skies are defined at `src/world/220-time-day.js:20-25`. The sun is never drawn (sunVis 0); it sits at −3° (afterglow, first light), −7° (blue hour) and −24° at night (`223-sun.js:11`).

| Physics [source] | World | Gap | Visibility |
|---|---|---|---|
| Civil 0 to −6°, nautical −6 to −12°, astronomical −12 to −18°. Civil twilight lasts 24 min at the equator, 33–48 min at 51.5°N [12] | −3 → −7 in 55–60 s against a real 16–21 min (×17–22, my calculation from 15°/h·cos [23]); −7 → −24 in about 60 s against 68–89 min | A time-lapse by design. The moon's rate is a 5× faster lapse than the twilight's, so the world runs two clocks | Low |
| Blue hour: sun 4–8° down; its blue comes from ozone (Chappuis) absorption, not Rayleigh [13] | Blue hour at −7; zenith hue 284 at L 0.30–0.34 | Matches | — |
| Belt of Venus 10–20° up during twilight, Earth's shadow below it [14]. The shadow shows in civil twilight; its fringe is dark bluish-to-purplish; both fade into the night sky [15] | Shadow up to 1 + 1.1·depression = 4.3° at −3, belt from there to about 17° (`sky-body.glsl:132-137`); belt also drawn at 0.4 in the blue hour at −7 | 1. Before the grade, the anti-solar sky at 0.5–5° is **h 329–9 (pink), L 0.44–0.45**, against 0.54–0.56 toward the sun (ratio 1.7–2.0). The shadow multiplies an orange horizon by (0.72, 0.78, 0.95) (`:136`) and comes out pink, not blue-grey. 2. The belt should be gone at −7 | **Medium-high**: any turn away from the glow |
| Low-sun light is reddened (Rayleigh λ⁻⁴) [19]; haze is near-white and forward-scattering [20] | Warm band toward the sun, haze warmer toward the sun (`lib-air.glsl:63`) | Matches in kind (the ceiling caps the forward peak) | — |
| No direct sun after sunset (upper limb gone at −0.83° [12]). Twilight "produces few shadows and makes objects appear in silhouette against the lit sky" [12] | The key light keeps the visit's baked direction 5–14° up, at strength 0.7 (afterglow), 0.4 (blue hour), 0.6 (first light) | Lit and shaded faces with the sun 3–7° down | **High**, but it is also the reference's dusk look |
| Brightest stars appear at about −6° [16]; zenith ≈13.7–13.9 mag/arcsec² there [17], 21.9 on a dark night [18] | Star amount: afterglow 0.05, first light 0.3, both at −3; blue hour 0.35 at −7 | First light shows 6× the afterglow's stars at the same depression | Low-medium |
| Visual range = 3.912/β; pure Rayleigh air ≈296 km; haze 2–5 km [21] | β ≈ 4–6×10⁻⁴ /m at a 100 m eye → about 7–10 km (my calculation from `realm-dunes.js:150-151`) | Matches a hazy desert | — |
| Aerosol haze belongs to the place (density falls with height above the ground) | The haze base is "a fixed depth under the eye" (`lib-air.glsl:51`) | Climbing never clears the view | Low-medium |
| Dawn and dusk are on opposite sides of the sky | One sun azimuth per visit; afterglow and first light are listed as neighbours (55–60 s apart); nights run back into the blue hour | Time runs both ways | Low-medium |

## 5. Night: stars, Milky Way, moon

| Physics [source] | World (file:line) | Gap | Visibility |
|---|---|---|---|
| Twinkling is scintillation on microsecond to ~100 ms timescales [27]; stronger near the horizon (∝ airmass^1.75) [26][27]; planets twinkle less | ±15% sine at 0.1–0.29 Hz per star (`sky-body.glsl:61`); held only under reduced motion (`226-moonlit-stay.js:62`) | No real process does this; the physical version is glitter, which is banned. Steady stars are the closest allowed. The slow swell is also a borderline fade | Low |
| Extinction: median k_V 0.13 mag/airmass at La Palma [28]; airmass 5.6 at 10°, 10.3 at 5°, 19.4 at 2° [29] | Fade is smoothstep(0, 0.2, sin e) (`:175`): dims 0.05 mag at 10°, 0.98 at 5°, 2.7 at 2° | Too little dimming at 10–30° (physical 0.6–1.15 mag at 10°); no reddening | Low |
| ~9,095 stars to magnitude 6.5 over the whole sky [30] | About 1,650 above the horizon (+2.5× in the band); brightness spread fits a F^−1.25 count (P(b > 0.7) 0.066 against 0.056). Range is 2.9 mag against a real 8 | Fine under the light ceiling | — |
| Starlight ≈ 25 + 250·e^(−\|b\|/20°) S10 [31] against a 220 S10 sky [18]: the plane is ≈2.1× the background | Band adds 1.2–2.8× the 26° sky; core adds 6.4× (my calculation from `sky-body.glsl:27-30`) | Band matches. The core is bright (the bulge is the brightest part, but I found no sourced number for it) | Low |
| The sky turns 15.04°/h (sidereal day 23h56m4s) [23]; the moon moves against the stars only 13.2°/day = 0.55°/h (sidereal month 27.32 d [22]) | Moon crosses at 6–10 px/s on a laptop = 0.3–0.5°/s, **72–120× the sky's rate**; stars and galaxy fixed in the world | The moon slides past the stars ~2,000–3,300× faster than a real moon. The physical pairing: the stars turn with the moon | Medium |
| Phase = (1 − cos ψ)/2 for elongation ψ. A full moon is opposite the sun and rises at sunset; a waxing crescent sits near the sun in the west after sunset [24]. Earthshine is best a few days from new ("the old Moon in the new Moon's arms"), ~0.01% of sunlight [25] | Always a full disc, placed at the key azimuth ±25°, 20–35° up (`225-night-sky-moon-path.js`, `222-sky-order-cycle.js:18`); the sun sinks under that same azimuth (`223-sun.js:30`) | Elongation 50–64° → physically 18–28% lit, a crescent with earthshine. A full disc there is impossible | **Medium-high** to a sky-literate eye |
| Moon is 1896″ = 0.527° across [22] | Radius 1.8° (`225:4`, `sky-body.glsl:160`): 6.8× the size, 47× the area (72 px against 10.5 px at 1440 px / 72°) | The largest gap in pixels, but it is the look | High (owner's call) |
| Corona: first red ring ≈ 16°/r(µm); aureole bluish-white to reddish-brown; needs droplets or ice in cloud [32] | Rings at 2.6, 3.4, 4.1, 4.9°, red then blue, green, red (`sky-body.glsl:166`), drawn whenever the moon shows | Order and size match (r ≈ 6 µm). Should only show where the veil covers the moon | Low |
| Noctilucent clouds: sun 6–16° down, 76–85 km up, latitudes 50–65°, summer [33] | Wisps in the blue hour at −7 | Matches | — |

## 6. Rain, water, sea of cloud
- **Rain and water ripples:** the code is written (`lib-2.glsl:5-34`, `vs-particle.glsl:28-64`) but compiled out, because no sky has rain and no realm calls waterShade. Nothing is on screen. If water returns, wire its ripple direction (W5) to the one wind.
- **Sea of cloud:** the surface has no time term (`src/glsl/above-glsl.glsl`). Radiation and valley fog form "in clear and calm conditions"; moderate to strong wind prevents it [34]. A 6.5 m/s wind above the fog fits only if the fog's own air is decoupled, which is the physical night case. Its own drift belongs to the clouds researcher.

## 7. Fixes, ranked by visibility ÷ cost
V = visibility 1–5; C = cost 1 (an hour) to 5 (days). All fixes keep the rules:
- no Date or Math.random: the visit's streams and hashes only, and the clock is SIM.t;
- reduced motion stays one still frame (t frozen);
- nothing is lifted past the ceiling (L 0.53).

| Rank | Fix | Files | V | C | Fastest proof | Keeping the reference's style |
|---|---|---|---|---|---|---|
| 1 | **One direction.** W2 cloud texture, W3 streak axis, W4 maps wind and W5 water all from W1. Clouds and streaks turned +20–30° with height (veering; pick clockwise once) | `fs-vbody.glsl:71`, `sky-body.glsl:105,122` (a mat2 uniform), `132-maps.js:87` (plan re-stamp), `370-frame-uniforms.js:61` | 3 | 1 | Unit (ms): every consumer's angle to wind(y) under 1° | The reference's motes are "a cycle of particles all heading" one way (`r2/sources.md`): one wind is its own language |
| 2 | **Speed by height.** Log profile with z0 0.003 and a 10 m wind of 6.5 m/s: motes 1.6 → ~6.5; birds' `HOST.wind(o, y)` 6.5 → 7.3–9.1 at 15–300 m; veils kept; grains' number set with the sand researcher (air there ≈ 4.6) | `realm-dunes.js:197-201`, `490-birds-host.js:52` | 3 | 1 | Unit: speed/U10 within 10% of ln(z/z0)/ln(10/z0) at each consumer's mean height | Same soft streaks and motes, only their pace |
| 3 | **Cool Earth's shadow at equal L.** Anti-solar 0–4° hue moves toward ~260–280 (blue-grey) with ΔL ≤ 0.005, so nothing darkens; belt only in civil twilight (blue hour belt 0.4 → 0) | `sky-body.glsl:136-137`, `220-time-day.js:21` | 3 | 1 | Unit: a JS port of skyCol (as in the scratch script below): anti-solar h 250–290, belt 10–20° h 340–20, L unchanged ±0.005 | Painted bands stay painted bands; only the hue table moves |
| 4 | **Stars agree with the sun.** First light stars 0.3 → 0.05, or move first light to −6°; twinkle off (uNight.z = 0) | `220-time-day.js:25`, `226-moonlit-stay.js:62` | 2 | 1 | Unit: star amount monotone in skyEl; a star's light at t equals t + 1 s | "nothing too noisy or flashy" (the reference's creative director) |
| 5 | **Stars and galaxy turn with the moon.** A mat3 on rd before starAt/galaxyAt: rotation about the band's own axis Pc at rate wv/sin ρB during a moonlit stay. Outside stays, the true 15°/h, which is invisible. Stars are energy-held bells of at least 1 px, so they slide and never blink | `sky-body.glsl:24,168-176`, `225-night-sky-moon-path.js` (Pc, wv already planned) | 3 | 2 | Unit on the pure moonAt (already run in node by tools/moonkeep.js): moon-to-star angle constant within 0.01° over the stay | A slow rigid drift is calm; no sparkle |
| 6 | **One gust field carried downwind** (frozen turbulence). One gust noise is shared by GLSL and JS and moves downwind at the mean wind. It drives veil lift and opacity (the per-veil cycles go), grain speed, `WINDV` per bird, the wing's gust term (turn `rough` on), perched birds' lean, and the score reads it at the camera, read-only | `vs-ribbon.glsl:15`, `vs-particle.glsl:17`, `490-birds-host.js:52`, `230-paper-every-bird-3d-cut.js:56`, `score.js:554` | 4 | 3 | Node sim of 10 min at 60 Hz: 3-s gust/10-min mean 1.4–1.7 [3], e-fold time 10–30 s, the lag between points 100 m apart downwind = 100/U ±10% | Soft swells, never flicker (opacity changes slower than 0.5 s). The reference layers wind sound on motion; here sound and picture share one gust |
| 7 | **Moon phase from elongation** plus earthshine (dark limb = sky + ≤ 0.01 L). Keep the key's strength (stylized), so nothing darkens | `sky-body.glsl:153-168`, sun direction at night from `223-sun.js` | 4 | 3 | Unit: lit fraction = (1 − cos ψ)/2 at the drawn ψ; one GPU still for the look | A crescent is a flat cut-paper shape, like the reference's silhouettes. **Owner's call** (his moon) |
| 8 | **Twilight key softens with depression.** Directional share smoothstep(−6, 0, sunEl) (0 at −7, ~0.5 at −3) with the lit land's mean L held ±2% | Ground and cloud shading (`dunes-glsl.glsl:223-227`, `above-glsl.glsl:52-69`); one uniform per sky | 4 | 3 | T1 frames: land mean L ±2%, lit/shade contrast falls with depression | Silhouettes against a lit sky are the twilight look; keep the warm rim. **Owner's call** (visible) |
| 9 | **Wind by time of day, one table.** Surface: afterglow 1.0 → blue hour 0.7 → nights 0.4–0.5 → first light 0.35 (dawn calmest). Aloft (>100 m) at night 1.2–1.5 (the jet). The world and `score.js:560` read the same table | `realm-dunes.js`, `score.js:560` | 2 | 2 | Unit: one table; order afterglow ≥ blue hour ≥ nights ≥ first light at the ground; aloft ≥ ground at night | Calmer nights fit the reference's dusk-to-night emotional curve |
| 10 | Stars' extinction by airmass (k 0.13–0.25) plus reddening; corona strength by the veil's cover at the moon | `sky-body.glsl:175,166` | 1 | 1 | Unit: dimming = k(X − 1) at 2–30° | Invisible to most; free |
| 11 | Haze anchored to the ground, not the eye | `lib-air.glsl:51-60` | 2 | 2 | T1 frame: a 100 m climb lowers the far land's haze | Undoes a deliberate framing fix; weigh first |
| 12 | **Slope soaring.** Lift w ≈ u(z)·sin(slope) on windward faces; for example 6.5 m/s on the dunes' ~13° windward slope gives ≈1.5 m/s (my calculation from `duneWave` 32 m over 0.68 × 205 m). Gliders climb where lift > sink and glide straight along faces [9]; drop the thermal "wheel" from the twilight skies [10] | `210-one-bird.js:120,239`, HOST ground samples | 3 | 4 | `tools/birds/sim.mjs` and `test/birds.mjs` (~30 s): soaring time in lift ≥ sink; no gliding climb outside lift | Effortless wingless flight is the reference's stated aim ("didn't want our flight to look like it takes some effort") |
| — | One-way sky order: dusk → night → dawn, with dawn back to dusk only through the mist; afterglow and first light not neighbours | `220-time-day.js:20-25` | 2 | 1 | Unit: over 10⁴ drawn orders the sun only sinks into night and rises out of it | The reference's realms run morning → night. **Owner's call:** he asked for "randomly" |
| — | Real-size moon (0.53°) | `225:4`, MRK.R | 5 | 1 | Words test (W8) footprint | **Owner's call**: it is the look |

Rule checks on the riskier fixes:
- 3 and 8 change hue or contrast at equal L, so nothing darkens.
- 6 adds nothing that appears or vanishes in place beyond today's veils.
- 5 slides 1-px stars, which the code's own star design keeps blink-free.
- 7 keeps the moon's light as it is.

## 8. Hand-offs
- **Sand researcher:** grains move faster than the air at their height. The ripples are 0.9 m apart (`dunes-glsl.glsl:218`). The windward slope is ~13° (`duneWave`).
- **Clouds researcher:** clouds should drift with the veered wind (fix 1). The sea of cloud is calm, decoupled air.
- **Aurora:** not audited.
- **Owner decisions:** fixes 7 and 8, the sky order and the moon size. The rest is invisible-by-rule or small visible tweaks.

The numbers marked "my calculation" come from a scratch script outside both repositories: `/tmp/claude-0/-home-user/9afca4a1-d829-5639-9f89-586361aa6223/scratchpad/phys/audit.mjs` (`node` it). The style notes I used are in `/home/user/derekzhou.com-workspace/.work/birdstyle-round/r2/sources.md`.

## Sources
[1] https://en.wikipedia.org/wiki/Log_wind_profile · [2] https://en.wikipedia.org/wiki/Planetary_boundary_layer · [3] https://ams.confex.com/ams/pdfpapers/138064.pdf · [4] https://en.wikipedia.org/wiki/Wind_gust · [5] https://courses.ems.psu.edu/meteo300/node/737 · [6] https://twister.caps.ou.edu/papers/KleinEtal_BL2016.pdf · [7] https://research.engineering.ucdavis.edu/wind/wp-content/uploads/sites/17/2014/03/lubitz-2007.pdf · [8] https://en.wikipedia.org/wiki/Ridge_lift · [9] https://link.springer.com/10.1038/s41598-017-05319-8 · [10] https://academic.oup.com/condor/article/105/2/208/5563225 · [11] https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/relative-velocity/ · [12] https://en.wikipedia.org/wiki/Twilight · [13] https://en.wikipedia.org/wiki/Blue_hour · [14] https://en.wikipedia.org/wiki/Belt_of_Venus · [15] https://en.wikipedia.org/wiki/Earth%27s_shadow · [16] https://glossarytest.ametsoc.net/wiki/Civil_twilight · [17] https://digitalcommons.gaacademy.org/gjs/vol82/iss1/106 · [18] https://en.wikipedia.org/wiki/Sky_brightness · [19] https://en.wikipedia.org/wiki/Rayleigh_scattering · [20] https://en.wikipedia.org/wiki/Mie_scattering · [21] https://en.wikipedia.org/wiki/Visibility · [22] https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html · [23] https://en.wikipedia.org/wiki/Diurnal_motion · [24] https://en.wikipedia.org/wiki/Lunar_phase · [25] https://en.wikipedia.org/wiki/Earthshine · [26] https://en.wikipedia.org/wiki/Twinkling · [27] https://core-cms.cambridgecore.org/core/services/aop-cambridge-core/content/view/58DCBDC9E0F24CA37411682355049607/S0252921100007454a.pdf/atmospheric-intensity-scintillation-of-stars-on-milli-and-microsecond-time-scales.pdf and https://arxiv.org/abs/1506.06921 · [28] https://arxiv.org/abs/1009.4056 · [29] https://en.wikipedia.org/wiki/Air_mass_(astronomy) · [30] https://en.wikipedia.org/wiki/Bright_Star_Catalogue · [31] https://arxiv.org/abs/astro-ph/9909153 · [32] https://en.wikipedia.org/wiki/Corona_(optical_phenomenon) · [33] https://en.wikipedia.org/wiki/Noctilucent_cloud · [34] https://en.wikipedia.org/wiki/Fog

Caveats: [3], [6] and [16] I know from search summaries; I did not read those pages. I found no sourced number for the solar-to-anti-solar horizon brightness ratio in twilight, or for the brightness of the Milky Way's core.