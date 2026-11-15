# Disconnect map: what the world shares, what it duplicates, and what disagrees

I mapped every system against origin/main 7ab73d1 and the 26 open PRs. Your local checkout (9725e30) is 27 commits behind, so every file:line below is main's. No files were written in either repository; the tree I read is extracted in my scratchpad.

## The ten disconnects that matter

1. **Six winds, not one.**
   - Most systems use the visit's wind `V.wind` (realm-dunes.js:131, a uniform random direction, 0-360°): dunes, ripples, veils, sand grains, birds and thermals.
   - The cloud billows slide a fixed 0.4-0.6 m/s toward 233° (fs-vbody.glsl:71).
   - The cirrus streaks lie along world x (sky-body.glsl:104-106).
   - Water has its own constant `[0.6, 0.8]` (370-frame-uniforms.js:61).
   - The score runs its own gusting wind (score.js:554-576).
   - The maps compute a sixth wind (132-maps.js:87) that nothing reads.
   - Cloud bodies and the cloud sea never move, yet the birds drift in 6.5 m/s everywhere, over the cloud sea too.
2. **Three suns.**
   - Land, sea, stones and clouds are lit by a key light 5-14° above the horizon (realm-dunes.js:142-146 → 200:22-23 → `uSun`).
   - The sky's glow puts the sun 3-7° below the horizon, sinking to −24° during a change (220 `skyEl`; 223:20-41).
   - docs/world.md says "The sun stays below the sea in every sky".
3. **The birds get no key light in any sky.** `sunVis` is forced to 0 (224:13). The bird shader multiplies its direct, transmitted and rim light by it (facetpose.js:160-162; 230:233-256). Land and clouds get the full key.
4. **The moon moves; nothing else up there does.** It crosses 72° or more at 0.3-0.5°/s (about 70-120× real). Its light (the key) stays fixed for the whole visit, and the stars and galaxy never turn.
5. **The aurora arc and its light point different ways.** #250 centres the arc on the landing heading ±34° (222:29 in #250). The aurora's green key and glow come from the key's azimuth (upwind ±55°). So decision B ("faint green on the side facing the arc") actually lights the key's side.
6. **No declared clock rate.**
   - The sky runs about 100× real: the sun sinks at 0.37°/s, the moon moves 0.3-0.5°/s, and a six-sky cycle takes about 14 minutes.
   - Stars, galaxy and cloud bodies run at 0×.
   - Birds, wind and particles run at 1×.
7. **This was designed before and never built.**
   - cw/design/spec.md:208-209, 305 and 660 specify one wind (an 80 km map, 2-6 m/s), clouds that drift with it (position x − w·t) and an hour map for the sun.
   - seamless/design-v5.md §10.2 and §10.6 specify one moving key light, with cloud light re-baked as it moves.
   - Neither reached the running page. The maps still compute the dead wind and hour fields in every `macro()` call (132:81, 132:87).
8. **The decisions page disagrees with the lanes.** It says "cloud motion: frozen, being built". In fact #252 (frozen) is a held draft, and #254, next up the same stack, reverts it (a72ba25). #254 keeps the drift, and doubles its speed on desktops (billow scale ×2).
9. **One place weight, four footprints.**
   - The GLSL weight grid (B-spline).
   - `lightWeight`, a ring blur at 0, 350 and 700 m (166:92-99).
   - The raw maps at a single point: the score (512:13) and the birds (490:149).
   - Each cloud body's billow scale, taken from the camera's place when the body streams in, not the body's own (210:15-19).
10. **Two device tiers.** #254 makes clouds crisp when `memTier()==='desktop'`, but the stills are tiered lo/hi by memory. Its own comment admits the hi stills (crisp clouds) are shown to touch-landscape devices that draw soft clouds live, so the still-to-live cut shows.

---

## A. Inventory

"Phys?" says whether the research behind it is sourced science with numbers.

| Phenomenon | Code | Owner's briefs | Research | Phys? | Open PRs / audit items |
|---|---|---|---|---|---|
| Land, dunes (205 m apart, 32 m high), ripples 0.9 m | dunes-glsl.glsl:82-130 `dunes()`, :206-240 `shadeSand` (:219 ripples), :165 `veilSpot`; world-glsl.glsl:7-45; realm-dunes.js:129-139; 100, 350, 414; 160 weight grid | "Keep 16 lands"; "10x quality"; no-glitter; near sand B | cw/rulers/earth (pacing, land scale ×0.338); audit-1114/land; world6 | Pacing yes (CC BY rasters); shapes are looks only. Real ripples are 5-20 cm, so 0.9 m is 5-18× too big | #230 #241 #242 #251(draft) #243(draft) #59; land-ring-seams, -plateau-specks, ripple-warp-c1, land-detail-fade, -brink-normals, -far-octave-prefilter, -geomorph-and-lod, camera-relative-positions |
| Landmarks: mesas, buttes, shards, ruins, temples, isles | realm-dunes.js:40-130; realm-above.js:20-110; realm-kit.js; 110; 231 (seats, obstacles); vs-landmark-inst.glsl:10-13 (bob and spin on `uT`) | "as close to the reference as possible" | design-v5 §9 | Looks | none |
| Sea of cloud | above-glsl.glsl:14, :47; world-glsl.glsl:16; 160:16 (sea level −110 to −20) | Nov 15 physics ask | cw spec 3.7 (fog sea in basins) | Designed, not built | none; static, no `uT` |
| Cloud bodies | 120; 210 (light baked along `sunDir`, :79); fs-vdens, fs-vlight, fs-vbody (drift :71); 410:95-110; 415; 231:55 (cores are flight obstacles) | "why are they even wiggling"; "blurry from afar"; Nov 15 "clouds moving (when/how)"; crisp A, frozen A | audit-1114/clouds, skep/billows; cw spec 3.7; design-v5 §10.6 | Rendering only (CHECKIN 06:24 says so) | #233 #235 #238 #240 #252(held) #254; cloud-* items (#221 landed) |
| Sky colour, twilight, Earth's shadow, belt, wisps | 220:19-26; 221; 222; 224; 223; lib-air.glsl:3-44; sky-body.glsl:126-160; 228 (a CPU copy of the gradient) | "All. Cycle through."; "Full sky."; "Add dusk and night first"; "only use white text"; "Don't darken…"; "never blink" | .work/tod; cw/rulers/perc (perception ceilings); design-v5 §10 | Looks; perception limits have numbers | #253 #236 #250; dither-tpdf, sky-horizon-step |
| Sun | Key: realm-dunes.js:142-146, 200:22-23, 370:21. Glow: 221:69, 222:81, 223. Disc: sky-body.glsl:75-96, times `uSunVis` = 0 | "yep this. same w sun."; "No rays at dusk/dawn" | design-v5 §10.2 | None | none |
| Moon | 225:116-118 (key azimuth +25°, height set from the words' boxes); 226:16-36 | "Drift all night"; "Slower moon" | tools/moonkeep.js (layout only) | None | #253; moon-limb |
| Stars | sky-body.glsl:48-60 (world-anchored, ±15% twinkle) | no-glitter | audit sky/star.py, starflux.mjs | Rendering (flux) | #245; stars-flux, sky-explicit-lod |
| Milky Way | sky-body.glsl:23-29; 222:21-29 (laid across the landing view) | phase 2 | none | Looks | #236 #250 |
| Aurora | sky-body.glsl:31-44 (a 360° ring on main); #250 arc | "why does it look so off"; form A, colour A, light B | audit-1114/aur, sky/aurcol.py | Colour partly (oxygen green, hue ≈142); form and motion looks | #232 #234 #236 #250; aurora-* items |
| High veil (cirrus) | sky-body.glsl:97-138 (deck at 3 km, streaks along world x, cover per sky) | none | none | Looks | none |
| Haze, fog, aerial perspective | lib-air.glsl:44-89; per-sky fog and haze (220); far mist 220:35; birds use the same air code ✓ | "seamless"; "10x" | none | Looks | #240; sky-horizon-step; lookup-table invention |
| Rain | vs-particle.glsl:30-40, compiled out (`NO_RAIN`, 070:63-102); hour.js still labels 13-16 "rain" | none | cw spec weather map | n/a | Dead code |
| Water | lib-2.glsl:1-30, `uWet` (370:55, 74-75), compiled out (`NO_WATER`) | none | none | n/a | Dead code; "mirror water" invention |
| Particles: grains, motes (petal, seed etc. kinds unused) | 206; vs-particle.glsl; realm-dunes.js:194-199; 073:47-51; 413:4; motes' sun glow × `uSunVis` = 0 (vs-particle:92) | no-glitter | none | Looks | none |
| Sand veils (ribbons) | vs-ribbon.glsl:13-22; fs-ribbon.glsl:5-6; realm-dunes.js:201 | none | none | Looks | none |
| Wind | see B1 | none, apart from Nov 15 ("sand, etc.") | cw spec table (2-6 m/s, no source); bird research [9] | Numbers without sources | none |
| Shadows and light | Surface-angle lighting only (dunes-glsl:229-235; above-glsl:52, 69); clouds shadow only themselves, through the bake; nothing casts a shadow | "Don't darken…" | sketch pack "Shadows on the land" | None | Never decided |
| Birds: flight, flocks, perching, guests, night | inkbirds/210 (wind :115-133), 212, 230, 240, 250, 260-264; model/*; host 490 | .work/handoff/birds.md: no head or tail, no fades, never follow the view, born beyond sight, any letter, one bird system, three axes, bank away | model.js (measured, CC BY/CC0); birds3d/physics; round3/audit PHYSICS, KINDS, GAPS; hub/birds-behaviour-research-2026-11-06.md; hub/birds/POINTER-RESEARCH.md | **Yes** | #225 #227 #228 #229 #231; bird-* items, bird-night-halos |
| Camera flight | 270, 280, 283-286, 290, 320 (cruise :63), 340, 386 | "same-ish direction unless user drags"; 9° pitch up; bank B (landed a112cf8); height B | audit-1114/cam, pacing | Partly (bank = atan(a/g)) | #222 #256; flight-controllers-smooth, release-run-on |
| Openings, stills, reduced motion, held world | site/hour.js; 386:18-30; 238; 470; tools/gpu/bake-stills.js | "Yes A2 is right"; "go with 96"; "Keep 16 lands"; "10x faster"; "a, the still world." | lighter/* (performance) | n/a | ci-stills-* |
| Sound / score | sound.js; score.js (skies :43-50, wind :554-576, sync :320-332); 512 (the feed) | "Opt-in generative score"; "bring it back, opt-in…"; "music and faint ambiance"; "Yup ship it" | docs/sound.md:18-25 (acoustics; the files are not in .work) | Partly | none open |

---

## B. Shared state

**What is already shared and consistent** (keep it):
- The wind direction reaches dunes, ripples, veils, swells (#251), grains, birds, thermals (210:239, drifting at 0.7× the wind), perched facing (264:5) and the sun's azimuth (tied to upwind).
- One key direction lights land, sea, stones, clouds, the cloud-light bake and the birds' light direction.
- The score reads the world's own sky sequence (512:9-14).
- The birds use the world's air code.
- Every part of the camera's framing reads the same pitch.

### B1. Wind

| Reader | file:line | Value | Source |
|---|---|---|---|
| Sand grains | realm-dunes.js:197 | 6.5 m/s, at 0-1.6 m | Literal copy |
| Motes | realm-dunes.js:198 | 1.6 m/s, at up to 26 m | Literal; slower higher up (the real profile is the reverse) |
| Sand veils | realm-dunes.js:201; vs-ribbon:15 | 5.5 m/s; gust every 7 s | Literal |
| Birds | 490-birds-host.js:13, :52 | 6.5 × `V.wind` everywhere, no height profile, no gusts | Copy of the grains' number |
| Bird wing gusts | birdwing.js:258-270 | Private 25 s timer per bird | Own |
| Cloud billows | fs-vbody.glsl:71 | 0.005 × billow scale (80-120 m) = 0.4-0.6 m/s toward 233°; ×2 on desktop in #254 | Own constant ✗ |
| Cloud bodies, sea deck | 120/210/231; world-glsl:16 | 0 m/s | ✗ |
| Cirrus streaks | sky-body.glsl:104-106 | Along world x, no drift | ✗ |
| Cloud ranges, canyon walls | realm-dunes.js:115; realm-above.js:65-72 | Random axis | ✗ (real cloud streets follow the wind) |
| Water ripples | 370:61 → 224:77-78 → lib-2:17 | Constant 37° | ✗ (compiled out) |
| Maps' wind field | 132:87 | 0.6 + 1.6·fbm(80 km) rad | Dead: read only by unused functions at 133:23 and 133:100 |
| Score's air | score.js:554-576 | Its own random walks; breeze per sky (0.18-0.35); random pan | Own ✗ |

Disagreements:
- Direction and speed: clouds, cloud sea and cirrus disagree with everything else.
- Height: speed falls with height (grains 6.5, motes 1.6, birds 6.5 at 14-300 m), the opposite of real air.
- Gusts: three separate gust clocks (7 s, 25 s, and the score's 1.2-21 s walks), and the world's wind itself has none.
- The score's breeze changes with the sky; the world's wind is the same in every sky.
- Birds feel the wind over the cloud sea, where nothing else shows it.

### B2. Sun, moon and key light

| Quantity | Writer | Readers | Disagreement |
|---|---|---|---|
| Key direction | 200:22-23 (azimuth upwind ±55°, height 5-14°) | `uSun` (370:21) → land, sea, stones, clouds; bake 210:79; birds (230:235); moon placement (226:25) | One direction, but its height contradicts the sky |
| Cloud kit's own sun | realm-above.js:50 (azimuth 0-360°, height 7-10°) | Thrown away (180:164). The temple isle (realm-above.js:92) reads the dunes' sun height | Dead copy |
| Sky's sun | 221:69 (−3/−7°); 223:20-41 (sinks to −24°) | `uSkyS` → lib-air:10, :63; sky-body | Same azimuth, opposite side of the horizon |
| Sun visibility | 224:13 (0 in every sky) | Disc; motes' glow; water glint; **birds' direct light** | Birds unlit while the land is lit |
| Moon disc | 225:116-118; drifts 6-10 px/s | sky-body | Its light is the fixed key; the moon ends its drift 36°+ away from where its light comes from |
| Aurora light | 220: aurora key (hue 150, strength 0.38) and glow at the key direction | Land, clouds | Arc centre (#250) is the landing heading ±34° |
| Galaxy | 222:21-29, laid across the landing view | Star density (sky-body:57) ✓ | No shared sky frame with the moon or aurora |
| Maps' sun | 133:134-140 (latitude 40, declination 10, from the hour map 132:81) | none | Dead |
| Landing heading | The same seeded draw is made four times: 200:8, 222:22, 270:27, 450:104 | none | Same value, four copies |

### B3. Clock and its compression

| System | Clock | Rate against real |
|---|---|---|
| Flight, sky cycle, shader time | `SIM.t` (270:72); frames capped at 0.1 s (430:15-22), so it lags on slow frames and stops in hidden tabs; `uT` = u + 40 (413:36) | 1× |
| Sun during a change | 223: −3° to −24° over 55-60 s | 0.37°/s ≈ 115× |
| Moon | 225/226 | 0.3-0.5°/s ≈ 70-120× |
| Sky holds | 220: 70-190 s | A full cycle ≈ 14 min ≈ 100× |
| Stars, galaxy | none | 0× |
| Aurora | main: `uT`·(0.04 + 0.015j); #250: `uT`·0.0008 | Its own |
| Clouds | Bodies 0; billows 0.4-0.6 m/s | Wrong vector |
| Birds | Their own `t`, counted from the show (250:3-17; 430:7); wingbeats 0.6× real (labbird:108) | 1× |
| Score | Audio time, mapped 1:1 to the world and re-synced about every 0.5 s (320-332) | Recovers after a pause (30 s catch-up) |

`HOST.time()` is never called.

### B4. Weather

There is no weather state.
- Rain and water are compiled out, and the 13-16 "rain" hour opens on the afterglow.
- Fog, haze and the far mist are set per sky (220:35-37).
- Cirrus cover is set per sky; the shader comment calling it "the climate's" is stale (sky-body.glsl:99-101).
- The birds keep two "night" signals:
  - `HOST.sky()` changes the flock mix at the change's midpoint (010:21-38).
  - `HOST.night()`, from the zenith's brightness (490:165-171), drives the ink and the halo.

### B5. Place weight (sand against cloud sea)

| Reader | Footprint |
|---|---|
| Land and sea blend in GLSL (`uKW`) | Weight grid, B-spline |
| Light blend | Ring at 0/350/700 m, weighted 4/1/0.5 (166:92-99) |
| Cloud body's billow scale (210:15-19) | The camera's place, not the body's |
| Particle share, `sandAt` (413:4) | The grid at the camera |
| Score room, `wc` (512:13) | Raw maps at the camera |
| Birds' `seaAt` (490:149) | Raw maps at any point |

### B6. World scale and duplicated constants

- **Scale:**
  - Land is 0.338 of Earth's distances (138 `K.scale_land`).
  - Birds are drawn 1.7-7.4× real span: 3.2 m × kind size × 1.19 makes the gull 4.0 m (real 1.34 m) and the finch 2.36 m (real 0.32 m).
  - Their flight speeds are real while wingbeats are 0.6×.
  - Bird size is defined three ways: inkbirds' size chain, model.js `world_span_m` (gull 3.68 m), and the perched size in pixels (010:4, 260:94).
- **Cruise height `[14, 32]`** is in 180:135 and 320:63; #256 edits only 320.
- **Stale constants:**
  - `CRUISE = 150` (realm-above.js:28) sets the temple isle's height for a camera that no longer flies there.
  - `SEA_Y = −160` (realm-dunes.js:22) is passed to the shader and never read; the real sea level is −110 to −20 (160:16).
  - The 6.5 m/s bird wind is a copy of the grains' number.

### B7. Haze and atmosphere

- The land's haze and the sky's haze share no limit at the horizon. The audit's sky-horizon-step measured a 30-40 code step there.
- #240's far cloud banks haze toward the ground's haze colour: 4.9 levels darker than the sky at weight 0.25.

### B8. Does the score hear the same sky?

The sky sequence: yes. Its cloud amount and its wind: no (its own copies). Its "still" test is reduced motion or still mode only (512:13). It does not count the held world, so there the score keeps re-planning a change that never comes.

### B9. Device tier

There are three: `memTier()` (380:56), the stills' lo/hi tier, and the governor's tier. #238 and #254 make the clouds' look depend on the first; the stills use the second.

---

## C. Process disconnects

**C1. Research that was never applied:**
- The cw spec's one wind, drifting weather map and hour map.
- design-v5's moving key with cloud-light re-bakes (about 0.13 ms per body on an A14).
- From the bird research's recommended set: #8 "gust fronts as one world event" and #12 dusk roost lines. Idea #15, the lake landing, can't be built (there is no water).
- The birds' measured lighting (direct 0.7, transmitted 0.4, rim) is built but zeroed in every sky by `sunVis`.

**C2. Decisions against code:**

| Decision | Where it stands |
|---|---|
| Landing A | Built in the bird stack #225-#231 |
| Bank B | Landed (a112cf8) |
| Height B | #256, needs-owner |
| Near sand B (9 m swells) | #251 draft, held since 06:24 Nov 15 |
| Aurora form A | #250 |
| Aurora colour A | #232 |
| Aurora light B | #250, but the light comes from the key's side, not the arc's |
| Clouds crisp A | #254, desktop only; mismatched stills on touch devices |
| Clouds frozen A | #252 held; #254 reverts it; the page still says "being built" |
| Night contrast "A then B" | Decided in CHECKIN (23:06), not on the decisions page. A is #253; B has no item |

**C3. Twelve of the audit's 21 sketch packs were never decided:** shadows, far dunes, Milky Way/stars/moon, horizon, birds at night, phone composition, phone anti-aliasing, code structure, the account and money question, the stills policy and the deploy source. (CHECKIN 23:06 does say "birds at night: A" but no PR exists.)

**C4. PRs that contradict each other:**
- #254 reverts #252 in the same stack.
- #250's arc sits apart from its own light.
- #253 changes the ceiling's knee (0.08 → 0.04) in 225, while test/unit/aurora.mjs:68-73 (#232/#250) hard-codes 0.08.
- #242 and #251 edit the same ripple block in `shadeSand`.
- #222 and #256 both edit 270-flight.js.
- #241 and #251 carry #230's changes.
- #59 is a stale draft that touches dunes-glsl, sky-body, 180 and 070.

**C5. Several lanes, one quantity:**
- The wind is set by LAND (realm-dunes), BIRDS (490), CLOUDS (fs-vbody), SKY (cirrus, `windDir`) and SOUND (score).
- The key light: LAND (realm light), SKY (220-226), CLOUDS (bake), BIRDS (facetpose).
- The cruise height: FLIGHT 320, the world definition 180, the cloud kit.
- The place weight: LAND, CLOUDS, SOUND, BIRDS.
- The ceiling knee: SKY 225, fs-comp, the tests.
- The device tier: CLOUDS, CI's stills, LOAD-PERF.

**C6. Code against its docs:**
- docs/world.md says the sun stays below the sea; the code says "5-14 deg up" (realm-dunes.js:143).
- docs/birds.md:74 and birds-design.md:137 say perched rows turn "as the wind shifts". The wind never shifts; only the view turns.
- 490:163 says "The world has no night yet" (it has three night skies).
- 490:49-51 speaks of "a realm with no wind of its own, still air"; with one world definition there is never still air.
- sky-body.glsl:99 calls the cirrus cover "the climate's" (it is per sky).
- 220:13-15 says the night key is "the moon's light from the same place", while the moon drifts.
- docs/world.md calls randomness "THE WEATHER".

**C7. Rules:** RULES.json's naming rule ("any person") collides with the CC BY credit line in src/birds/model/model.js:3-12, which you already approved ("Allow CC BY with credit"). The rule has no exemption, and the naming hook's list is empty (audit item ci-naming-list). No rule and no test covers any shared quantity.

**C8. Holds the PRs can't see:** CHECKIN 06:24 holds "frozen" clouds, the 9 m swells and the aurora's motion. Yet #250 (aurora motion) and #254 (keeps the drift) are out of draft and labelled needs-owner, so you could merge a held look.

---

## D. The work

### D1. Ranked by visibility × cost

| # | Work | Visible | Cost | Lanes |
|---|---|---|---|---|
| 1 | One shared world-state section, e.g. `src/world/215-air.js`: wind(point, time) with a height profile and one gust field; the key, the sky's sun, the moon and the sky's frame; one sky-rate factor; a weather state. Move the B1, B2 and B6 literals into it. Frames identical, so the bot can merge it | No | S-M | NEW AIR |
| 2 | Birds take the same key light as the land (`sunVis` controls only the disc) | Every bird | S | BIRDS, SKY |
| 3 | Make the aurora arc and its light agree **before #250 merges**: fill from the arc's side, or centre the arc on the key | Aurora nights | S | SKY |
| 4 | Clouds move with the wind aloft: bodies and deck billows drift as x − w·(t − t_cut), so the stills stay valid; cloud cores move in the slip plan (231:55); the birds' landmark list moves; cirrus lies along the upper wind. If the cloud spec says calm aloft, cut the low wind so birds, sand and clouds agree | High (your ask) | M-L | CLOUDS, FLIGHT, BIRDS, SKY |
| 5 | Wind profile with height, and one gust front read by grains, motes, veils, bird trims, perched lean and the score | Subtle, and audible | S-M | AIR, LAND, BIRDS, SOUND |
| 6 | One sun per sky: in twilight the key is the sky's bright side at 5° or less; at night it is the moon. Re-measure W8 and contrast; re-bake all 2,304 stills (about 80 min, 25 min once bakes run in parallel) | Every frame | M | SKY, LAND |
| 7 | One sky frame and rate: stars and galaxy turn with the moon (S). Moonlight follows the moon by re-baking cloud light in slices, with no crossfade (M) | Nights | S/M | SKY, LOAD-PERF |
| 8 | One atmosphere: the land's haze limit equals the sky's at the horizon; far banks haze to the sky's colour | Every frame | M | SKY, CLOUDS |
| 9 | Shadows: contact shadows first, then long shadows baked from the one key; cloud shadows drifting with the wind | High | L | LAND |
| 10 | Sand scale, from the sand spec: ripples (0.9 m against 5-20 cm), the 9 m swells, grain speed against the air above | Near sand | S-M | LAND |
| 11 | One place-weight function with declared footprints; each body's billows from its own place | Low | S | CLOUDS, SOUND, BIRDS |
| 12 | One tier for look decisions, equal to the stills' tier | Cut on touch landscape | S | CLOUDS, CI |
| 13 | Dead state: the maps' two dead fields (two fbm per `macro()` call in the plan's longest task), unused maps functions, rain and water paths, `windDir`/`wet`, the cloud kit's sun, `SEA_Y`, `CRUISE 150`, `HOST.time`, the C6 comments | No | S | HYGIENE, LOAD-PERF |
| 14 | Weather placed in the world: fog pools at first light, virga, cirrus halo; rain only if your ruling below allows it | High | L | AIR |

### D2. Physics specs needed per system

| System | Spec it needs | Covered by another researcher? |
|---|---|---|
| Clouds | Drift speed by height, deck behaviour, turret growth and decay, cloud streets | Yes |
| Aurora | The oval poleward, arc geometry 100-300 km away, motion rates, colour | Yes |
| Sand and dunes | Ripple and megaripple spacing, saltation speed and height, veils, slip faces | Yes |
| Birds | Flocks by kind, flap synchrony, gusts, roosting | Yes |
| Wind and sky light | Wind with height, gusts, wind aloft, what the twilight key is, sky dome, haze | Yes |
| Sky frame and time compression | Latitude and pole, star and galaxy rotation, the moon's path against its light, the sun's sink rate, one sky-time factor | **No** |
| Cast shadows | From dunes, landmarks and clouds | **No** |
| Horizon and aerial perspective limit | Shared haze at the horizon | Possibly inside the atmosphere researcher's scope; check |
| Weather | What counts against "don't darken" | **No** |
| Score's air | Reading the world's wind and gusts | **No** |
| Bird scale | Spans 3× real at real speeds, against land at ×0.338 | **No** |

### D3. Tests that make a disconnect fail CI

1. **test/unit/air.mjs.** Use the fake page, 16 seeds × 6 skies. Every wind reader (dune params, particle and veil winds, `HOST.wind`, cloud drift, cirrus axis, score feed) points the same way within 1e-6. Each speed equals the wind profile at that reader's declared height. Plant: put `uT * 0.004` back.
2. **tools/checks/42-one-air.sh.** No wind or sun literals outside 215-air.js. Use tools/where.mjs to check that the shared state is assigned only there.
3. **Key test, per sky.** The key, the cloud bake direction and the birds' light direction (y and z swapped) are equal. The birds' direct-light factor equals the land's key factor. The sky sun's azimuth equals the key's. The moonlight's angle from the moon is within a set bound. The aurora's fill azimuth equals the arc's.
4. **Clock test.** Sun, moon, star and galaxy rates are within ±10% of the declared sky rate. The birds' clock equals the world's minus the show time. The score's predicted change is within 0.5 s of the world's.
5. **Haze test.** Run lib-air's scalar functions in Node (the way moonkeep runs the moon's route). The land's haze at infinite distance equals the sky's haze at the horizon. Far-bank colour equals the sky's haze colour.
6. **Weight test.** Every place-weight reader goes through one function with a declared footprint. A body's billow scale comes from its own centre.
7. **Tier test.** The look's tier equals the stills' tier on all 68 windows in still-pick.mjs.
8. **aurora.mjs** reads `CEIL_KNEE` from 225, as #253's sky.mjs already does.
9. **RULES.json** gets a new rule, "one-world-state", enforced by tests 1-3.

### D4. Who owns what

| Lane | Owns |
|---|---|
| **AIR (new owner needed)** | 215-air.js: wind and gusts, sun, moon, key and sky frame, clock rates, weather. Reviews every reader PR against the spec rows. Items 1, 5, 7 (the frame), 14 |
| LAND | Dune, ripple, swell, veil and particle readers; the realm's light moves into AIR; shadows; sand scale. Items 9, 10 |
| CLOUDS | Body and deck drift, billows anchored to their bodies, per-body place weight, one tier. Items 4, 11, 12 |
| SKY | Key semantics with AIR; star and galaxy rotation; moonlight; the aurora arc and its light; cirrus axis; the horizon. Items 3, 6, 7, 8 |
| FLIGHT | Moving cloud obstacles in the slip plan; one cruise constant |
| BIRDS | Wind by height and gusts, the shared key, moving landmarks, one night signal. Item 2 |
| SOUND | The score reads AIR's wind and gusts and the one place weight |
| LOAD-PERF | Removing the dead fbm from the plan; the cloud-light re-bake budget |
| CI | Tests 1-8; aurora and moonlit-drift cases in the GPU gate; planning the stills re-bake |
| HYGIENE | Item 13; the stale comments and docs in C6; the RULES wording |
| Hub | Make the decisions page match the holds (C2, C8) |

### Two questions only you can answer

1. **Does the world's own shading count as "darkening the background"?** That means cast shadows, a lower twilight key and cloud shadows. Recommended: no. Your rule is about nothing being darkened *for the words*; the world's own light stays free under the light ceiling.
2. **May the naming rule exempt the one CC BY credit line you already approved?** Recommended: yes.
