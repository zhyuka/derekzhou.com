# Aurora physics and a build spec for the world

**Short answer.** The physics supports the quiet arc, the true green and the faint light on the world. It does not support two things in today's open PRs:
- **The top colour.** #232 ends the curtain at h 345, which is magenta. Oxygen's red line is h 25-35, and over the blue night sky a red top already blends to mauve. #232's violet middle is physical only in twilight, when the tops are still in sunlight.
- **The motion.** Today's folds and the way #236 brings the aurora in both move 10-20 times faster than a real quiet arc.

**How the world's clock runs.** `clockNow()` is `performance.now()`, used only for budgets and never for anything drawn (000-head.js:44). Everything drawn runs on the flight clock `SIM.t`: fixed steps of 1/60 s (270-flight.js:11) that follow real frame time, capped at 0.1 s a frame (430-simulation-driven.js:14-21). The shaders' `uT = SIM.u + 40`, in real seconds (413-draw-frame.js:36). The sky cycle runs on `SIM.t + SKY.dt` (224:6).

**How a night is laid out.** The aurora sky holds 100 s × 0.9-1.15, and each change takes 55-60 s (220:24, 222:35). So one aurora night lasts about 200-235 s of real time. The moon drifts 0.35-0.58°/s against a real 0.0042°/s, so the world's night is compressed about 80-140×.

I wrote nothing in either repository. My scratch scripts are in /tmp/claude-0/-home-user/9afca4a1-d829-5639-9f89-586361aa6223/scratchpad/calc/.

---

## (1) The physics, with numbers and sources

**Sources**
- [S1] NOAA SWPC, aurora: https://www.spaceweather.gov/phenomena/aurora
- [S2] NOAA SWPC, tips on viewing: https://www.spaceweather.gov/content/tips-viewing-aurora
- [S3] Air Force Geophysics Lab, Handbook of Geophysics 1985, ch. 12 "The Aurora": https://www.ngdc.noaa.gov/stp/space-weather/online-publications/miscellaneous/afrl_publications/handbook_1985/Chptr12.pdf
- [S4] Australian Bureau of Meteorology, space weather: https://sws.bom.gov.au/Educational/1/1/8
- [S5] Ann. Geophys. 41:1 (2023), green and blue peak altitudes: https://angeo.copernicus.org/articles/41/1/2023/
- [S6] JGR Space Physics 118 (2013), doi:10.1002/jgra.50516: https://folk.uib.no/st07350/papers/carlson2013JGRA50516.pdf
- [S7] University of Alaska Fairbanks, Geophysical Institute, "auroral arcs and bands": https://www.gi.alaska.edu/alaska-science-forum/auroral-arcs-and-bands
- [S8] Same institute, "auroral arc": https://www.gi.alaska.edu/alaska-science-forum/auroral-arc
- [S9] Same institute, "auroral rays": https://www.gi.alaska.edu/alaska-science-forum/auroral-rays
- [S10] UCL MSSL lecture on substorms: https://www.mssl.ucl.ac.uk/~cjo/STMP/Lecture_28_30/Space_Plasma_and_Magnetospheric_Physics_Section_11.pdf
- [S11] Front. Astron. Space Sci. 6 (2019), "The explosive characteristics of the aurora": https://www.frontiersin.org/journals/astronomy-and-space-sciences/articles/10.3389/fspas.2019.00001/full
- [S12] JGR 1989, a westward travelling surge seen from Dynamics Explorer 1: https://ntrs.nasa.gov/citations/19890056323
- [S13] arXiv 2205.00244 (2022), its summary of the 1970 classification of curls and folds: https://arxiv.org/abs/2205.00244
- [S14] Ann. Geophys. 36:59 (2018), growth-phase arc drift: https://angeo.copernicus.org/articles/36/59/2018/ (read from a search summary only)
- [S15] Front. Astron. Space Sci. 9:1059039 (2022), pulsating aurora: https://www.frontiersin.org/articles/10.3389/fspas.2022.1059039/full
- [S16] GRL 2024, internal modulation of pulsating aurora: https://repository.kulib.kyoto-u.ac.jp/dspace/bitstream/2433/291572/1/2024gl108253.pdf (search summary only)
- [S17] Space Sci. Rev. (2021), "Small-scale dynamic aurora": https://pmc.ncbi.nlm.nih.gov/articles/PMC8550089
- [S18] Ann. Geophys. 15:412 (1997), multiple arcs: https://angeo.copernicus.org/articles/15/412/1997/
- [S19] Space Weather and Space Climate (2025), sunlit blue aurora: https://www.swsc-journal.org/10.1051/swsc/2025012 (search summary only)
- [S20] Illuminance table: https://en.wikipedia.org/wiki/Orders_of_magnitude_(illuminance)
- [S21] Nordic Optical Telescope, sky brightness: https://www.not.iac.es/weather/skybrightness.html
- [S22] Why the eye sees less colour than the camera: https://www.space.com/23707-only-photos-reveal-aurora-true-color.html (a secondary source)

Rows marked **D** are my own derivations from the cited numbers: spherical-Earth geometry, CIE 1931 colour matching, and the definition of the rayleigh.

### Emission, altitude and brightness

| Fact | Number | Source |
|---|---|---|
| Altitude range | 80-500 km, mostly 100-300 km | S1, S4 |
| Lower border | 80-120 km; the top is 10-100 km above it | S7 |
| Green 557.7 nm, oxygen O(1S) | Green and the N₂⁺ 427.8 nm blue both typically peak at about 114 km | S5 |
| Green lifetime | 0.75-0.8 s, so it follows the incoming electrons promptly | S3, S6 |
| Green cut-off below | O(1S) is destroyed by collisions with O₂ below about 100 km | S3 |
| Red 630.0 nm, oxygen O(1D) | Lifetime 110-148 s unquenched, about 30-40 s in practice; quenched by N₂ below 200-300 km; the cut-off is sharp; N₂ scale height about 25 km there | S3, S6 |
| Why the red is smooth | Its long lifetime and its soft, spread-out source give a broad glow with no fine rays, which lags a brightening by about 30-110 s | S3, S6 |
| Why the lower border is sharp | Electrons of a given energy stop at a well-defined height; the gas density rises steeply downward (scale height about 6 km near 100 km, D); green is quenched below 100 km | S3, S6 |
| Pink or crimson lower border ("type B") | Only in energetic, bright aurora; molecular nitrogen emission plus the loss of the green | S3 |
| Blue-violet tops | Only where the top is still in sunlight (resonant scattering by N₂⁺) | S19 |
| Brightness classes (green line, kR) | I = 1 (like the Milky Way, no colour); II = 10 (thin moonlit cirrus); III = 100 (moonlit cumulus); IV = 1000 (full moon, casts shadows) | S3, S4 |
| A class-III spectrum | Green 100 kR; red 2-100 kR; N₂⁺ 391.4 nm 98 kR, so 427.8 nm is about 30 kR | S3 |
| Faint aurora to the eye | Grey; colour appears only in brighter displays; red is the hardest colour to see | S22 |
| Light levels | 1 kR of green ≈ 1.9e-4 cd/m², about the dark sky itself (V 21.9 mag/arcsec² ≈ 1.9e-4 cd/m²); full moon 0.25 lux; moonless sky 0.002 lux; a full moon brightens the sky by about 4 magnitudes, which washes out class I-II aurora | D, S20, S21 |
| Hue of each line on a display (OklAB) | Pure green line h 132; green with its co-located N₂⁺ blue h ≈ 145; red line h 23 (h 34 with a little green); a 1:1 red-green photon mix h 98 (yellow) | D |

### Forms and the substorm cycle

| Phase | Duration | What is seen | Source |
|---|---|---|---|
| Growth | about 1 h | A quiet, thin, structureless east-west arc about 1° of latitude wide and 3-12 h of local time long. It drifts equatorward (100-250 m/s in older studies, a few tens of m/s in newer ones) while other features fade | S3, S10, S11, S14 |
| Onset | a few minutes | The equatorward arc brightens, near 65° magnetic latitude | S10, S11 |
| Expansion | 30-60 min | Breakup into rayed, folded curtains. Poleward expansion averages 200 m/s (up to 1.2 km/s). A westward travelling surge averages 2.2 km/s, falling from 8 to 1 km/s over 17 min, and leaves bright patches behind for tens of minutes, about 700 km apart | S10, S11, S12 |
| Recovery | 1-2 h | The bulge fades and contracts. After midnight: diffuse and pulsating patches 20-50 km across that switch on and off every 2-20 s, with a 3-4 Hz flutter inside, lasting hours | S10, S15, S16 |
| How often | 3-4 cycles a day ("a few in 24 h"); an episode of activity lives about 15 min | | S3, S10, S11 |
| Best time | 22:00-02:00 local | | S2 |

### Motion

| Motion | Real speed | Angular rate at 515 km range (D) | px per frame at 60 Hz, laptop 1440 / phone (D) | Reads as glitter? |
|---|---|---|---|---|
| Growth-phase drift | 0.01-0.25 km/s | 0.0008-0.007°/s up the sky | ≈0 | no |
| Folds (about 20 km) | 0-5 km/s | 0.11°/s at 1 km/s, 0.56°/s at 5 km/s | 0.03-0.16 / 0.05-0.25 | no |
| Curls (under 10 km) | 0-22 km/s | up to 2.5°/s | 0.7 / 1.1 | **yes** |
| Rays (1-2 km wide, form in about 1 s) | up to 100× a jet, ≈25 km/s | 2.8°/s; 13°/s when overhead at 110 km | 0.8 / 1.2; overhead 3.8 / 5.8 | **yes** above about 2 km/s |
| Travelling surge | 2.2 km/s | 0.24°/s | 0.07 / 0.11 | no |
| Pulsation | on and off every 2-20 s, 3-4 Hz inside | in place | — | **yes**, and it is a fade |
| Flickering | 3-15 Hz, patches 1-12 km | in place | — | **yes** |

Sources: S9, S11-S17. My working limits: features 2-4 px wide should move at most 0.25 px a frame, wider ones at most 0.5. One pixel per frame is 3.5°/s on a 1440 laptop, 2.6°/s at 1920 and 2.3°/s on a phone.

### Geometry (D, spherical Earth, R = 6371 km)

| Ground distance to the arc | Lower border (105 km) | Green top (150 km) | Red (250 km) | Red top (300 km) | Border visible to azimuth ± |
|---|---|---|---|---|---|
| 0 km | 90° | 90° | 90° | 90° | 90° |
| 300 km | 17.8° | 24.9° | 37.9° | 43° | 75° |
| 500 km | 9.5° | 14.3° | 23.9° | 28.1° | 64° |
| 700 km | 5.3° | 8.8° | 16.1° | 19.6° | 53° |
| 1000 km | 1.4° | 3.9° | 9.3° | 11.8° | 30° |
| 1200 km | below the horizon | 1.6° | 6.1° | 8.3° | 0° |

- **Mid-latitude view.** A low arc on the poleward horizon. The red tops are seen first and farthest: aurora is visible from up to about 1000 km away [S2], and the red top stays above the horizon out to about 1950 km. Under the oval, the curtains pass overhead and the rays converge into a corona at the magnetic zenith, 10-20° south of the zenith [S8].
- **Size.** An arc is about 100 m to 10 km thick and 1000 to several thousand km long; multiple arcs are spaced from about 1 km to several hundred km [S7, S8, S18]. At 515 km a 200 m arc is 0.02° wide, far under a pixel. Seen face on it looks like a thin sheet; it is brightest where you look along it (its ends near the horizon, and folds seen edge-on).
- **Parallax.** The flight moves about 2.8 km in a stay, which shifts the arc 0.3° at 500 km: treat it as being at infinity, as the stars are.
- **Not tied to the stars.** The oval is fixed to the Sun-Earth line, not to the star field, so the aurora must not be attached to the stars.

### Light on the ground (D)

Method: 1 R of green ≈ 1.94e-7 cd/m². The illuminance E ≈ L·Ω·sin(elevation), where Ω = 0.17 sr is a band ±64° wide and 4.5° tall at about 12° elevation.

| Display | Illuminance on level ground | Versus moonless sky (0.002 lux) | Versus full moon (0.25 lux) |
|---|---|---|---|
| Quiet arc, class II | about 8e-5 lux | 4% on tops; about 25% extra on faces turned to the arc | 0.03% |
| Bright arc, class III | about 8e-4 lux; about 0.015 lux if it fills a quarter of the sky | 0.4-7× | 0.3-6% |
| Great storm, class IV | about 0.25-0.6 lux | — | about 1× |

---

## (2) What the world does today, the SKY PRs, and the gaps

| Item | Today (main) | Physics | Gap |
|---|---|---|---|
| Shape | sky-body.glsl:31-45: three bands in elevation and azimuth all round the sky, with no perspective. The farther curtains sit higher (0.78B+2, 0.56B+4) | One or two sheets with perspective, filling ±64° about the poleward bearing; a farther arc sits lower | Whole model |
| Fold motion | :34 `ph = uT*(0.04+0.015j)`: 1.0-1.15°/s, plus a counter-wave at 0.6°/s | A quiet arc's folds move 0.02-0.11°/s | 10-50× too fast |
| Lower border bobbing | :35 the border swings ±6.7°, about 0.24°/s up and down | At 500 km that means the arc moving ±250 km north-south at 3-4 km/s; real drift is 0.01-0.25 km/s | Far too large and fast |
| Glow height | :38 `hgt` 12-16° e-fold, the glow filled for 16° | At 500 km the green fades within about 2-4° (15-40 km) | 5-8× too tall |
| Edge-on brightening | :37 `fold` brightens the flat parts (1.35) and dims the steep, edge-on parts (0.88) | Edge-on parts are brightest | Inverted |
| Rays | :40 a noise tile that repeats every 2.2-3.6° and drifts 0.002°/s | Rays 2-4 px wide drifting 0.1-0.2°/s | Barcode and frozen |
| Horizon dimming | :44 `smoothstep(0.5,6,e)` | Real fading is extinction by the low air; the geometry brings the arc down to the horizon itself | A fake extinction; with #234 the horizon is dimmed twice |
| Colour | :41 mint h 160 to magenta h 345, through grey | See (3) | — |
| Aurora sky's light | 220:24: key, ambient and cloud light teal (h 152-175) | Green h ≈ 140-145 | — |
| Draws and uniforms | 222:29 `SKY.aur = {ph, base 5-8°}`; 226:65 `uAur = (0, ph, base, fx[3])` | — | — |

**#232 (colour).** Green becomes (0.225, 1.5, 0.18), h 142, which matches the oxygen line plus its N₂⁺ blue: good. Its middle stop (0.45, 0.5, 1.0) is h 278, violet, which is physical only for sunlit tops in twilight. Its top stays (0.85, 0.25, 0.55), h 345, magenta; the red line is h 23-35. The sky table's chroma is lowered and the key is h 150 at C 0.03: good. The ramp still runs on elevation above the base, not on altitude.

**#234 (haze).** It multiplies the aurora by (1 − hazeSky) and reddens it where the haze is thick. That is physical: extinction near the horizon is mostly Rayleigh scattering, so blue is lost first. The old :44 dimming should go once this lands.

**#236 (comes and goes by place).** The amounts are now only 0 or 1, and the base moves from 90° below up to its place over the change. This keeps the rule, but it is a rigid lift: 1.6°/s on average and 2.4°/s at the smoothstep's peak, which is 0.7 px a frame on a laptop and 1.07 on a phone. Physically an arc coming in rises only about 6-10°, red tops first.

**The planned quiet arc** (picks page; audit plan.json): one or two arcs with the edge 5-10° up, a thin green hem, sparse rays, a faint red top, slow folds, and a brightening that sometimes travels along it. The physics supports all of it.

---

## (3) Build spec in the world's units

**Model.** Keep `auroraAt` a pure function of the view ray, as the audit's step 1 proposed. Each arc is a vertical sheet whose footprint lies at ground distance D(t) toward the bearing az₀, plus a fold offset y(x), where x is distance along the arc in km.
- Find where the ray crosses the sheet: three fixed-point steps of ρ·cosφ = D + y(ρ·sinφ), with φ = az − az₀.
- Altitude at the crossing: h = R·(cos e / cos(e + ρ/R) − 1).
- Brightness = emission(h) × min(1/|cos ψ|, 3) × rays(x) × front(x) × haze transmittance. ψ is the angle between the ray and the sheet's normal.
- Rays as functions of x alone are vertical lines in 3D, so they converge on the zenith in perspective without extra work.
- Read noise with `textureLod`, its level from the pixel's footprint ρ·(pixel angle)/|cos ψ|. Use no `atan` seam.
- Cost: 2 arcs × (3 iterations + 2 texture reads), which is no more than today's 9 reads.

### Clock

There are two rates, both from `SIM.t`, so one clock:
- **The night's phase** runs on the sky cycle's own clock (the change's k and q, the hold's fraction), passed to the shader as D.
- **Local motion** runs in real seconds on `uT`.

| World time | Real analogue | D, arc 1 | Lower border | What is drawn |
|---|---|---|---|---|
| Change in (55-60 s, q) | Growth: the oval spreads equatorward. About 100-250× compressed, like the moon | 1950 → 650 km, eased | below the horizon → 6° | The red top comes over the poleward horizon first, then the green hem. Rises at most 0.3°/s |
| Hold (90-115 s) | Late growth, drift equatorward. About 15× compressed: 1.5 km/s in the world | 650 → 500 km | 6 → 9.5° | A quiet homogeneous arc, sparse rays. In half the stays, a second arc 150-300 km farther away, 1.5-3° lower, at 0.6 brightness |
| Hold, half the stays: breakup | Expansion | unchanged | unchanged | A bright section that arrives with the arc in the change in (a surge already under way), its western front 20-40° east of centre at the stay's start, moving west (right to left facing the arc) at 2.2 km/s real (0.24°/s at 515 km). Inside it: folds 8-10 km deep, taller rays, a pink fringe. Its red brightening trails the front by 90 km (≈10°) |
| Change out (55-60 s) | Recovery: the bulge contracts poleward | 500 → 1950 km | sinks below the horizon | The green leaves first, the red top last. No pulsating or diffuse patches |

Draw the breakup flag, the front's place, ΔD and the fold phases in skyInit from `SKY.rV`, after the existing draws so no other draw shifts.

### Motion rates (uT in seconds)

| Term | Real value | Shader form | At 515 km |
|---|---|---|---|
| Large swell | A 15 km, λ 500 km, 0.3 km/s west | phase rate 2πv/λ = 0.0038 rad/s | 0.03°/s |
| Folds | A 3 km (8-10 km in the breakup), λ 40 km, 1 km/s | 0.157 rad/s | 0.11°/s |
| Rays | 1-2 km wide, period at least 8 km, 1 km/s (2 km/s at most) | noise coordinate x/period moves 0.1 period/s | 0.11°/s |
| Surge front | 2.2 km/s, edge 30 km wide | x_f = x₀ − 2.2·(uT − t₀) | 0.24°/s |
| Drop entirely | curls, corona, pulsation, flicker, rays faster than 2 km/s | — | — |

Fade a fold's amplitude to zero where its wavelength spans fewer than 8 px.

### Colour by altitude (h in km; h₀ = 105 for a quiet arc, 97 inside the breakup)

| Layer | Where | Display stop (linear sRGB, OKLab hue) | Profile |
|---|---|---|---|
| Nothing | below h₀ − 2 | — | 0 |
| Pink fringe (breakup section only) | h₀ − 8 to h₀ | (0.8, 0.15, 0.45), h ≈ 335 | a 3-5 km band × 0.3 |
| Green hem | h₀ to about 150, peak near 114 | (0.225, 1.5, 0.18), h 142 (#232's) | rises from h₀ − 2 to h₀ + 4, then decays as exp(−(h − h₀ − 4)/15); inside rays the decay length is 30-40 km |
| Saddle | 150-190 | **no colour stop**: the sky's own blue shows | the two tails only, each at most 10-30% of its peak |
| Red top | 190-300, peak 220-250 | (0.9, 0.1, 0.06), h ≈ 28; over the h 250 sky it composites to mauve | rises from 180 to 230, then exp(−(h − 230)/60); column 0.1-0.3 of the green's; blurred over at least 30 km along the arc; no rays |
| Sunlit violet (twilight changes only) | above the shadow height h_s = R(sec δ − 1): 48 km at 7° sun depression, 142 at 12°, 328 at 18°, 603 at 24° | (0.45, 0.5, 1.0), h 278 | × smoothstep(h_s − 10, h_s + 10, h) |

**Composited levels.** The hem's peak L 0.42-0.46; the breakup section at most L 0.50; hem chroma 0.08-0.12. The world cannot show the real 10× step from quiet to active: it shows activity by form (rays, folds, height, the pink fringe), not by lightness.

### Placement

- **Bearing.** az₀ = the aurora sky's key azimuth, so the light on the world comes from the arc. A Node check should report how often the arc is in view at the stay's start.
- **Distance and extent.** D 650 → 500 km gives the owner's "edge 5-10°". The border spans ±64° in azimuth and the red top ±74°.
- **Behind the words.** At the landing pitch (11.6° at the centre), the hem crosses the band of the words.

### Light on the world

- **Hold it constant.** A change within a hold would be a light ramp.
- **Its strength.** Light from az₀ at about 0.25 of the ambient on faces turned to the arc and about 0.04 on tops, at h 140-145 and low chroma. #232's key (L 0.72, C 0.03, h 150) has the right hue; check its share with this ratio.
- **Moon.** The aurora and the moon stay in separate skies, which is physically right: moonlight washes out class I-II aurora [S21].

---

## (4) Staying inside the site's rules

**What the no-fades rule allows, plainly.** RULES.json: "no fade-ins or fade-outs anywhere … a sun or moon never fades where it stands … no bird fades in time (it shows by crossing the window's edge or out of the distance)".
- **Allowed:** brightness that changes because something moves (crossing the horizon, coming out of the haze, an edge or front passing), and sky colours blending across the 55-60 s change on the sky clock. That blending is the cycle, not a fade.
- **Not allowed:** any amount, opacity or brightness of the aurora ramped over time where it stands, any new arc appearing in place, any pulsing.
- **So a substorm brightens by place:** the arc comes nearer and out of the haze (growth), and the bright section's front travels west (expansion). That travelling front is what a real expansion looks like away from the onset point. The in-place onset itself is not drawn: the surge is already under way when the arc rises. A pixel changes only as the 30 km (about 3°) front edge passes it, like the Earth's shadow edge over the wisps.

**No glitter.** Every speed stays within the limits in (1) and the table in (3). Rays are at least 2 px wide and folds are faded out under 8 px, both band-limited by footprint. There is no per-pixel hash and no flicker or pulsation. CI: `auroraAt` alone at 1× against 2×2 supersampled, at most 3 codes apart (the audit's meter).

**Light ceiling and white words.** Cap the green's composited peak at L 0.50. Over green (h 142, C 0.09-0.12) at the ceiling of 0.53, the credit grey falls to 4.37-4.42:1, under 4.5. At L 0.50 it reads 4.96-5.02:1 and the text 5.56-5.62:1 (D). Stars fade under bright aurora already through the shader's headroom (`head`), which matches the eye: bright stars are hard to see through class III aurora.

**One clock.** The night's phase comes from `SIM.t + SKY.dt`, the motion from `uT = SIM.u + 40`. The breakup is drawn from the visit's stream. Nothing uses Date or a new random draw.

**Reduced motion.** The shader is a pure function of `uT` and uniforms, so the one still frame (and each baked opening at its data-sky-at) shows the arc whole, at its place, with nothing in motion.

---

## (5) Fastest proof for each part

| Part | Proof (time) |
|---|---|
| Geometry | Node test (ms) that ports the sheet crossing: border elevation within ±0.05° of the spherical formula; farther arcs lower; the border reaches 0° at φ = acos(D/√(2Rh₀)); the far half of the sky under 5% of the energy; border 6-12° in the landing view |
| Motion | Node (ms) running sky-body.glsl's own lines (as #236's test does) and differencing over uT: every term's °/s and px per frame at 0.0578°/px and 0.0376°/px within the limits |
| No fades | Extend sky.mjs (ms): amounts only 0 or 1; D monotone through each change and the hold; at a fixed direction, brightness changes only when the front's or the horizon's edge crosses it |
| Colour | Extend test/unit/aurora.mjs (ms): hem hue 140-150; the top stop's hue 20-40; composite chroma at least 0.035 through the saddle; violet only above h_s |
| Ceiling and words | Node (ms): composited peak L ≤ 0.50; the credit's WCAG contrast at least 4.6:1 at every aurora pixel |
| Glitter | SwiftShader render of `auroraAt` alone, 1× against 2×2: at most 3 codes (seconds) |
| Light on the world | Node (ms): key over ambient from WSKY.aurora at most 0.3 on faces toward the arc, hue 135-155 |
| Look | One T1 frame at the aurora opening, true-size crops, looked at; then the owner |

---

## (6) Do the hub's decisions hold up physically?

| Decision | Verdict |
|---|---|
| Quiet arc | **Holds.** It is the evening and growth-phase norm and the form a mid-latitude viewer sees, and it is the only form whose real speeds stay under the glitter limits. The corona fails: rays overhead move 13°/s. Active folded curtains belong only inside a short travelling breakup. |
| Vivid true green | **The hue holds:** h 142 is the green line with its N₂⁺ blue. "Vivid" is the camera's view, since the eye sees faint aurora as grey. As style it is defensible under the reference's luminous look, but keep chroma at 0.12 or less at L 0.50 or below. |
| Red top | **Holds, as faint and red.** Use h 25-35, not #232's h 345 magenta; over the blue sky it turns mauve by itself. #232's violet middle is physical only in twilight, above the shadow height. At midnight (sun 24° down, shadow at about 600 km) the physical middle is a dim saddle where the sky shows, which also removes the grey-band cause without inventing a colour. |
| Faint light on the world | **Holds** for a quiet arc: tops +4%, faces toward it about +25% of the night's light. "Strong" fits only a bright breakup, and that would ramp the world's light inside a hold. |

**Keeping the reference's style while the physics stays.** From the style notes (sources.md, notes.md): the reference checks scenes in grayscale first, keeps things "nothing too noisy", saves glow for darkness, and gives spirits glowing hems.
- One light shape with a crisp lower hem, set a clear step of value above the sky.
- Few, long, smooth forms: a 500 km swell and sparse soft rays, no fine noise.
- Three colours only: green hem, the sky's own blue between, a red top melting into mauve.
- Calm motion, which is simply the real speed of a quiet arc.

These choices only simplify the look; the colours, heights, timing and speeds stay physical.

---

**Caveats.**
- The arc-drift figures [S14], the internal-modulation figure [S16] and the sunlit-violet altitude [S19] come from search summaries, not from pages I read in full.
- The green's 15 km fall-off, the red-to-green ratio of 0.1-0.3 and the CIE fit's hue within a few degrees are my choices or approximations inside the cited ranges.
- The surge front starting 20-40° east of centre was chosen to fit the hold; it is not measured.
