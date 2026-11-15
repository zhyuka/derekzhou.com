## Sand and dunes: the physics, what the world does today, and a build spec

I wrote nothing in either repository. My proofs are Node scripts in `/tmp/claude-0/-home-user/9afca4a1-d829-5639-9f89-586361aa6223/scratchpad/sim/`:
- `dunes.mjs` ports the shipped `dunes()`.
- `stats.mjs`, `parts.mjs` and `amp.mjs` measure today's land.
- `s1h.mjs` (with `prof2.mjs` and `dunes_cw.mjs`) is the S1 prototype.
- `ripbrdf2.mjs` checks the ripple-light closed form.
- `foot.mjs` gives the pixel footprints.

Each runs in 1–3 s. Sources are cited by URL only: the naming rule covers any person.

**The short version**
- The world's sand is wrong in three ways:
  - The slip faces are S-curves with no brink.
  - The ripples are megaripple-sized and never on screen.
  - Nothing physical sits between 0.9 m and 64 m.
- My recommendation for LAND:
  - Drop the hub's 9 m swells.
  - Build S1 and S2 first: the slip face at 32° with a crisp brink.
  - Then S3 (ripple light) and S4 (20 m superimposed dunes).
- Every one of these is a visible change, so each goes to the owner as a visible PR after true-size frames.

---

### (1) The physics

**Impact ripples**
| fact | numbers | source |
|---|---|---|
| Origin and orientation | Ripples come from saltation impacts, not airflow. Crests run across the local wind. The windward (stoss) side is gentler than the lee. | saltation review [SR] §3.1.2 https://arxiv.org/abs/1201.4353 |
| Wavelength | About 1000 grain diameters. A mature Earth ripple is 0.14 m; field ripples measured 0.14 m. | ripple scaling, 2014 https://arxiv.org/abs/1411.1959; field ripples, 2025 https://arxiv.org/abs/2510.11876 |
| Scaling with wind | Wavelength and speed both grow linearly with (u\*/u\*t − 1) and vanish at the threshold. In the field, amplitude stays about 4% of wavelength. | ripple instability, 2006 https://arxiv.org/abs/cond-mat/0506758 |
| Height and ripple index | Crests under about 1 cm high. Ripple index (wavelength/height) about 15–20 (a 1963 survey's figure is 15). | https://www.frontiersin.org/articles/10.3389/feart.2021.780100/full; https://in.bgu.ac.il/humsos/asl/Documents/2015%20Longevity%20of%20megaripples.pdf |
| Migration | 10 cm ripples move about 1.4 cm/min; 80 cm granule ripples about 0.15 cm/min, in winds of about 10 m/s. Speed responds to wind changes in 2.3 min, height in 5.6, wavelength in 8.3. Ripple creep carries about 3.6% of the sand moved. | ripple migration, 2011 https://doi.org/10.1016/j.geomorph.2011.06.003; field ripples 2025; ripple creep, 2019 https://www.mdpi.com/2076-3263/9/9/389 |
| Where they are absent | Slip faces: avalanches resurface the whole face 1–2.3 times an hour, leaving only faint cross-slope reptation ripples near the brink. The grainfall band: 55–95% of grainfall lands within 1 m of the crest, 84–99% within 2 m. Strong winds flatten ripples. Wet or crusted ground has little or no saltation. | slip-face dynamics, 2015 https://openaccess.city.ac.uk/id/eprint/12538/; grainfall, 2013 https://doi.org/10.1002/jgrf.20131; grainfall deposition, 2002 https://doi.org/10.1046/j.1365-3091.2002.00443.x; field ripples 2025; [SR] §2.3 |
| Megaripples and granule ripples | Need bimodal sand with coarse grains of 0.4–4 mm. Normal ripples reach at most about 30 cm; megaripples are metres long, ripple index about 10–22. They form in about 200 h of moderate wind and are destroyed in about 3 h at 2.5× that wind. | https://physicstoday.aip.org/news/size-sorted-sand-creates-uncommon-length-scale-in-windblown-formations; megaripple longevity, 2015 (above); https://repository.si.edu/handle/10088/8076 |

**Wind and sand movement**
| fact | numbers | source |
|---|---|---|
| Threshold | u\*t ≈ 0.2 m/s for 150–250 µm quartz. The impact threshold is about 0.8 of the fluid threshold. | [SR] Table 2.3 |
| Threshold at 10 m height | 12 knots = 6.2 m/s (the drift-potential threshold) | the 1979 drift-potential method, via [SR] eq. 3.2 |
| Saltation layer | Typical hop about 3 cm high and 30 cm long. Layer height is nearly constant with u\*. Grains of 70–500 µm saltate; 20–70 µm go into short-term suspension; under 20 µm into long-term suspension. | [SR] Table 2.3, §2.3.2.2, §1 |
| Intermittency | Flux responds within about 1 s. Streamers are about 0.2 m wide, about 1 m apart, in families spanning 0.1–10 m, changing every 0.1 s, driven by gusts from large eddies. | [SR] §2.3; streamers, 2005 https://doi.org/10.1029/2004JF000270 |
| Crest speed-up | Wind at the crest is 1.1–2.0× the wind upwind of the dune, so crests move sand first. | crest speed-up, 1985/1996 https://scilit.com/publications/9a34f50b73296ac34cec8898d00e30fd |
| Daily cycle | At Jericoacoara the wind passes the threshold "almost every afternoon". | slip-face dynamics 2015 |

**Dunes**
| fact | numbers | source |
|---|---|---|
| Types | One wind with ample sand gives transverse dunes; scarce sand gives barchans (horns point downwind). Two winds give linear dunes along the resultant: transverse if the winds diverge by less than 90°, longitudinal if more. Many winds give star dunes, several hundred metres high. | [SR] §3.1.5, §3.1.5.1 (citing the classic dune-type studies) |
| Sizes | Wavelength runs from about 10 m (smallest dunes) to about 1 km (largest). Hierarchy: dunes 3–600 m, draas 300–5500 m. Giant dunes are capped by the depth of the boundary layer. | bedform review, 2013 https://sseh.uchicago.edu/doc/Charru_et_al_2013.pdf; a 1972 course table https://mitocw.ups.edu.ec/courses/earth-atmospheric-and-planetary-sciences/12-110-sedimentary-geology-fall-2004/lecture-notes/l9_eolian_system.pdf; [SR] §3.1.4 |
| Profile | The windward slope is gentle; separation and a slip face form once the lee passes about 34°. Dunes near the minimal size are flatter and their slip face is only starting. Stoss slopes peak at 7–10° (White Sands and two Martian dunes). Barchan height is about 1/10 of width; side slopes about 11°. | [SR] §3.1.1; dune slopes, 2017 https://pmc.ncbi.nlm.nih.gov/articles/PMC5815379/; barchan shape, 1998 https://scilit.com/publications/33711ebfad8fade81d7a7ff4c527f74e |
| Slip face | Critical angle 34°, angle of repose 32°. Field critical angle 32.2–33°, dropping 0.05–0.8° per avalanche. Grainflow tongues are under 2 m wide and 3–4 cm thick. | grainfall 2013 via slip-face dynamics 2015; downslope coarsening https://eas2.unl.edu/~dloope/pdf/DownslopeCoarsening.pdf |
| Smallest and superimposed dunes | The fastest-growing wavelength is about 12 × Lsat ≈ 20 m (Lsat 1.7 m for 180 µm sand). 930 measurements peak at 20 m; on a 40 m mega-barchan, 28 m. These surface waves ride the windward slope and flanks at about 2 m/day, 10× the dune's speed. Large dunes carry smaller transverse dunes. | superimposed dunes, 2005 https://www.phys.ens.fr/~foldingslidingstretchinglab/papers/A23_Nature.pdf; [SR] §3.1.5.2 |
| Migration | Barchans move 30–100 m/yr. Speed c = aQ/(H + 0.87 m), with a ≈ 2.7 and Q ≈ 80 m²/yr: a 32 m dune moves about 6.6 m/yr. | [SR] §3.1.6.1; superimposed dunes 2005 |

**Optics**
| fact | source |
|---|---|
| Wave-like (oriented) roughness gives a strong backscatter lobe and weaker forward scatter, with a minimum at ±90° from the sun's plane at grazing view. The effect is stronger at low sun, and the standard isotropic roughness model can't describe it. | oriented roughness, 2019 https://par.nsf.gov/servlets/purl/10087495 |
| Dune fields scatter more backward than forward; the sun's azimuth matters more at low sun. | dune-field scattering, 2015 https://meetingorganizer.copernicus.org/EGU2015/EGU2015-4832.pdf |
| V-cavity masking and shadowing is a valid microsurface model. | microfacet masking, 2014 https://jcgt.org/published/0003/02/03/ |
| Wet sand is darker; most of the darkening happens in the first few % of water, with little colour change in the visible. | https://pmc.ncbi.nlm.nih.gov/articles/PMC4226492/ |
| Sand colour comes from iron-oxide coatings (yellow to deep red). The workspace spec's measured albedo is 0.22–0.30, hue 55–67°. | https://meetingorganizer.copernicus.org/EGU26/EGU26-13582.html; spec.md §3.6 |
| Glints (my arithmetic): one 1× pixel at 77 m covers 0.078 × 0.33 m, about 5×10⁵ grains, so glints average to their mean. The world measured that mean at under 1e-4 of the sun (dunes-glsl.glsl:235-237). At the world's distances real sand does not sparkle. | — |

---

### (2) What the world does today

| item | today (file:line) | gap |
|---|---|---|
| Ripple wavelength | 0.9 m along WINDDIR (dunes-glsl.glsl:218) | 6–9× too long. 0.9 m exists only as megaripples on coarse sand. |
| Ripple orientation | Crests across the wind ✓ (:218); turned ±0.3 rad, about 17° (:217); spacing varied by the noise at p/61 (:216) | Fine. |
| Ripple profile | cos + 0.35·cos(2θ+1), slope amplitude 0.06 (:219-221): at most about 4.6°, about 9 mm high, ripple index about 50 | Should be stoss-gentle, lee-steep, tied to the wind's sign, ripple index 15–20. |
| Where ripples are drawn | Turned off only where 1−n.y > 0.42, i.e. steeper than 54° (:208) | They are drawn on 32–50° slip faces. |
| Ripple fade | Full within fp 0.012, gone by 0.05 (:210): 12/50 m at 1×, 24/99 m at 2×. The nearest ground at default framing is 60–77 m. | None on screen at 1×; faint in the bottom rows at 2×. The fade is isotropic. |
| Grain and glints | A hash of 0.11 m cells, ±7%, gone by 40 m (:230-231); glints removed (:235) ✓ | — |
| Sheen | (1−n·v)⁴ (:233-234), the same at every sun azimuth | Real sand scatters backward; the sun's azimuth relative to the wind is ignored. |
| Dunes | Main wave λ 205 m, H = 32·amp (amp 0.25–1), stoss share c = 0.68 (:97-99). Warp from noise at 340 m and 95 m (:96). A second family, λ 64 m, H 4 m, set 52° off the wind (:101-103). | The spec (spec.md about line 231) says 35–170 m and "about 32° at most". The code uses 205 m and goes far past 32°. |
| Measured (2.25 M points, 2 m grid) | All sand: slope p50/p90/p99/p99.9 = 13/26/39/45°; 3.1% steeper than 34°. Full-height dunes: stoss p50 13.4°, p90 19°, max 26°; lee p50 27°, p90 38°, max 51°. | Real: stoss mode 7–10°, ≤15°; lee a 32–33° plane. |
| Lee shape | It starts flat at the crest, peaks at 36° only halfway down, then flattens again; the stoss reaches the crest still rising at 13°. | There is no planar slip face and no brink. |
| Cause | The phase warp squeezes the local wavelength 0.55–1.47× (p1–p99) and the lee steepens with it. The crest height's own change adds little (1.8% of the sand over 11°). | — |
| Mesh normals | Per vertex (350-shaders-scene.js:29, :96). Clipmap g0 0.35 m, 96 cells a ring (180-…js:138; 100-clipmap-grid.js:5): cells are 2.8 m at 77–134 m and 22–45 m at 0.5–2 km. | The lit/shade line is smeared over a cell: 10–40 px soft at 100–300 m. |
| Cast shadows on the land | None (grep finds none) | At a 5–14° sun, a 32 m dune casts a shadow 130–365 m long, longer than the 205 m spacing. |
| Wind | One direction per visit, no speed (realm-dunes.js:131). The sun is always upwind ±55° (:146). | — |
| Grains | 700, always on, 4.2–8.8 m/s, lifted 0.12 m + up to 1.6 m + 0.35 m sine hops (realm-dunes.js:197; vs-particle.glsl:12-23) | About 10× too high and 3× too fast. On wide windows they never reach the frame: the bottom-edge ray is 3–7 m above the ground at 45–63 m out. |
| Sand veils | 20 veils, 70 m long, lift 5 m, always on (realm-dunes.js:201). Their opacity rises and falls in place with each gust (vs-ribbon.glsl:15, :22). | That is a fade in time: likely against no-fades. Where they come from (veilSpot, dunes-glsl.glsl:165-176: the brinks) is right. |
| Dead code (invisible) | GLINT uniform (dunes-glsl.glsl:12, value 2.2 in realm-dunes.js:136) is unused; the "now and then one glints" comment (realm-dunes.js:193) is stale. | — |

**Footprints at 1440×900, camera 18 m up** (`foot.mjs`)

At 1×:
| distance | 77 m | 150 m | 300 m | 1 km |
|---|---|---|---|---|
| m per px across | 0.078 | 0.15 | 0.30 | 1.0 |
| m per px along the view | 0.33 | 1.26 | 5.0 | 56 |

Which scales can ever be drawn:
- 0.12 m ripples: only as their light, never as a pattern.
- 1.5 m megaripples: as a pattern to about 80 m looking along the wind, about 370 m looking across it.
- 20 m superimposed dunes: about 300 m looking along the wind, kilometres looking across it.
- A 9 m swell looking along the wind: only to about 190 m.

---

### (3) Build spec (world metres; every band-limit uses the same footprint function)

**Footprint function.** For a pattern with wave vector k (cycles/m):
- cyc/px = fp·|( k·r̂h / max(|n·v|, 0.02), k·r̂⊥ )|, where r̂h = normalize(rd.xz) and r̂⊥ is its perpendicular.
- Band weight B = 1 − smoothstep(0.25, 0.5, cyc/px): full at 4 px a period, nothing at 2.
- This uses the existing fp. It is anisotropic, follows the window's pixel density, and needs no screen derivatives (centroid varyings make those unsafe).

**S1: the main profile (D_Hd `dunes()`, dunes-glsl.glsl:70-99).** Prototype measured with `HC=0.13 SK=0.6 node s1h.mjs full`.
- Crest wander: shift the phase along the wind by a noise of the across-wind coordinate only: ph = (p·w + D(p·w⊥))/λ. The wavelength along the wind can then never be squeezed; crest turn stays p99 33°, max 35° (today 28°/48°).
- Height cap: H = min(32·amp, 0.13·λ_local).
- Slip face: a plane at 32° to the horizontal from the brink, with the swell's slope along the wind added back. Its share of a cycle is fl = H·k/(tan32° + ∂swell/∂w), which makes the face 51 m long for a 32 m dune.
- Stoss: 0.5x + 0.5x²(3−2x), so its steepest point is 1.25× its mean.
- Joints: the brink is a smooth min rounded over 2 m; the toe is a smooth max over 0.15 of the face. The result is C1.
- The 64 m family: ×0.6, and none on the slip face.
- Result: lee mode 32°, p99 33.7°; 0.09% of the sand steeper than 34° (today 3.1%); stoss p50 9.2°, p90 13.9°.
- veilSpot must follow the new warp. This is a visible change.

**S2: a crisp brink.** The vertex stage hands the fragment 7 varyings:
- the unwrapped phase, ∇ph, H and fl;
- the main wave's gradient at the vertex (2 floats), so the fragment can subtract it.

The fragment rebuilds the main wave's slope from fract(ph). The lit/shade line then sits on the brink to the pixel. The brink's rounding widens to max(2 m, 1.5 px along k) so it never aliases.

**S3: ripple light, prefiltered.** This replaces dunes-glsl.glsl:209-222 with `grooveLit(n, uSun, −rd, w, kr = 1/16, stoss share 0.7)`:
- Two facets, each with the world's own dif ramp.
- The crest's cast shadow and the eye's masking come as analytic intervals in the wind's vertical plane (V-cavity). Against a 2D ray cast over 300 random sun/eye geometries the worst error is 0.0004.
- It replaces dif on the rippled share P. P = 0 where the slope passes 18–24° (slip faces), on the 1–2 m grainfall band and on megaripple ground.
- Cost about 60 ALU, no texture, no time input.
- At an 8° sun from upwind, lit share against today's smooth sand (0.71):

| eye 2° over the ground, looking | lit share |
|---|---|
| downwind (sun behind) | 0.97 |
| across the wind | 0.59 |
| into the sun | 0.00 |

  With ripple index 25 instead of 16, into the sun is 0.16.
- The result is bounded by the sand's own SHADE and LIT colours. A style strength K multiplies P.
- Beside the SHEEN term (:233-234): weight it by the lit share.
- Resolved ripples (λ 0.12 m) appear only where B > 0, i.e. tall windows and dives within about 30 m. They use the same intervals, so their average equals the prefiltered light.

**S4: superimposed dunes on the windward slopes** (replaces the 9 m swells)
- Wavelength 20 m × (0.75–1.25) from a 400 m noise. Crests are turned δ off the wind, where δ is a per-visit ±5–20° (a storm wind's offset), drawn from its own stream RNG(subseed(V.seed, unused k)) so no existing draw moves.
- Height 0.035λ (0.5–1 m); stoss share 0.75, lee 8°, stoss 2.7°.
- Placed only on the main stoss: smoothstep(0.08, 0.3, f) · (1 − smoothstep(0.75, 0.95, f/(1−fl))) · smoothstep(8, 16, H) · a patch noise. None on slip faces or troughs.
- Fragment normals × B. Where B < 1, `grooveLit` with kr 0.035 takes over.
- Static: 2 m/day is about 0 px/s.

**S5 (optional): megaripples.** λ 1.5 m (0.8–2.5), height λ/15. Only in trough floors where the main profile is under 0.08, the sand weight is 0.2–0.8 and the slope under 6°. Crests a value band 6–10% darker for the coarse grains. Band-limited, then `grooveLit` with kr 1/15.

**S6 (optional): grainflow tongues.** Down-slope stripes 0.5–2 m wide on slip faces, value ±2%, band-limited.

**S7 (high value, visible): cast shadows of the main dunes.**
- Distance to the nearest brink upsun: d = Δphase / (∇ph · sun direction).
- In shadow if H·(1 − S(f)) > d·tan(elevation). Penumbra = 0.0046·d + 1.5 px.
- About 20 ALU on S2's varyings. Bounded by today's SAND_DEEP and SAND_SHADE.

**S8: blowing sand tied to a wind speed.**
- V.windU per visit from its own subseed stream (no new entropy). As a design choice I suggest a Rayleigh distribution with mean 5 m/s, which gives:

| regime | share of visits | what shows |
|---|---|---|
| under 4.2 m/s | 43% | nothing |
| 4.2–6.2 m/s (crests only, through the 1.5× speed-up) | 27% | veils on brinks of dunes over 10 m high: lift 0.5–1 m, 10–30 m long |
| 6.2–10 m/s | 26% | the same veils, plus grains near the surface |
| over 10 m/s | 4% | plumes 3–5 m high, up to 70 m long |

- Particle and veil shares ∝ u\*(u\*² − u\*t²), using the existing uPg.z share. They are constant per visit, so nothing fades.
- Grains: 2–10 cm hops, 0.2–1 m long, 1–3 m/s, ballistic (steep launch, shallow fall), near field only.
- Veils: replace the in-place gust ramp (vs-ribbon.glsl:15). The brink switches its emission on and off; a veil's head and tail move downwind at the wind speed and thin out with distance only (α(x, t) = A(x − Ut)).
- Streamers are never drawn: at 0.2 m wide and changing every 0.1 s they would glitter. An optional faint surface sheet, advected at ≥20 m scale, at most +2% L.

---

### (4) The site's rules
| rule | how each part stays inside it |
|---|---|
| No glitter | Every pattern is band-limited by S1's footprint function. Everything sub-pixel is a smooth closed form of sun, eye, wind and normal. No glints: physically their mean is under 1e-4 of the sun. |
| No fades | Land, ripples and dunes are static, which is physically right: ripples move about 0.004 px/s at 60 m. Veils change only by advection. The per-visit wind never changes during a visit. |
| Never darken | No part reads the words, so W7 is unchanged. The light added is the world's own and stays between today's SAND_SHADE and LIT colours. W8 (OKLab L ≤ 0.53) holds by that bound; veils keep at most today's 0.24 opacity. |
| One clock, one entropy | Only uT. The wind speed and δ come from subseed streams. |
| Reduced motion | The new shading is static, and veils freeze at the still's uT. |

One flag: S3 and S7 darken views into the sun. That is physical and not a darkening for the words, but the owner's "don't darken the background" instinct makes it his call, so it goes to him as a visible PR.

---

### (5) Fastest proof for each part
| part | proof | time |
|---|---|---|
| S1 | The Node census (`s1h.mjs`); then the same census from the shipped GLSL's own `dunes` split pass (HP_MAIN) under SwiftShader in CI. Pass: ≤0.1% of the sand over 34°, lee mode 32±1°, stoss p90 ≤ 15°. | 3 s / under 1 min |
| S2 | Unit test: the fragment-rebuilt gradient against the analytic gradient at random points inside triangles, ≤1° away from the brink. | ms |
| S3–S5 | `ripbrdf2.mjs` as test/unit/sand.mjs, plus a continuity sweep (sun or eye azimuth in 0.01° steps, jump < 0.005). | 1 s |
| Band limits | Node sweep of camera heights 14–32 m, every window class, pixel densities 1–3 and 10 m–10 km: no pattern's amplitude survives above 0.5 cycles/px. | ms |
| Placement | Node: ripple presence is 0 on lee faces and where slope > 24°; S4's wavelengths stay 14–28 m. | s |
| S7 | Node: the analytic shadow against a ray march over the port, ≥99% agreement outside the penumbra. | s |
| S8 | Node: the regime shares over 10k seeds; the advection identity α(x+UΔt, t+Δt) = α(x, t) to 1e-6. | ms |
| Final look | W8 stills, the contrast check, the drag film's glitter check; true-size crops at 1440×900 @1 and @2 and at 393×852 @3, plus an L-only (grayscale) still. | GPU minutes |

---

### (6) What replaces the hub's 9 m swells
| | 9 m swells | instead |
|---|---|---|
| Physical basis | None. 9 m falls in the gap between ripples (≤0.3 m), megaripples (metres, coarse sand only) and the smallest dunes (about 20 m from Lsat). | S4: 20 m superimposed dunes on windward slopes (superimposed dunes 2005), plus S3's ripple light everywhere except slip faces. |
| Placement | Everywhere | Windward slopes only; none on slip faces or troughs. |
| Fade | Fixed, "gone by about 1 km". Looking along the wind it aliases beyond about 190 m at 1×. | Anisotropic footprint fade; the prefiltered light takes over. |

LAND should drop the swells and build S1+S2, then S3, then S4.

### The reference's style
The record has no study of the reference's desert; its style notes are about birds, sky and cloud. What it does give:
- "nothing too noisy or flashy", "round and soft shape language", "lighting and color rhythm", and a habit of checking scenes in grayscale first (`.work/birdstyle-round/r2/sources.md`).
- A 2013 GDC sand-rendering talk (`.work/birdstyle-round/r3/notes.md` §2.1): sparkle was central to that sand, but the glints "swam" when the view moved. So keep only its broad-sheen half.

How to keep the sand stylized while the physics sets the structure:
- Physics decides scale, orientation, placement and which pixels are lit or shaded.
- Style decides the palette: the visit's pink lit and lavender shade, no hue noise, no grain texture.
- Value fields stay large and flat: lit windward slopes, flat blue slip faces, one clean brink line, and soft blue shadow pools.
- Check every term in an L-only still first.
