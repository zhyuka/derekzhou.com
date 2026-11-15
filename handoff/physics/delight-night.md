## Celestial events and night-sky delights: research report

**Build these first:**
1. **Venus as the evening and morning star.**
2. **Long meteors that cross the whole window**, plus rare nights when they all come from one radiant below the horizon.
3. **The Milky Way's real structure**, plus the two southern Clouds and M31 as faint smudges.
4. **Star colours by temperature, and stars coming out one by one in order of brightness.**

All four keep every rule without asking the owner, and all four are a few dozen shader operations per pixel or less. A fifth, the crescent moon with earthshine, belongs to the owner because the moon is his. It is already SKY's row B11; the numbers below complete it.

I wrote nothing in either repository. My scratch scripts are `/tmp/claude-0/-home-user/9afca4a1-d829-5639-9f89-586361aa6223/scratchpad/celestial/calc.mjs`, `strict.mjs` and `venus.mjs` (run each with `node`). Pixel scales are aurora.md's: 0.0578°/px on a laptop and 0.0376°/px on a phone. The windows I used, counting only the sky above the horizon, are 72° × 0–36° on a laptop and 42° × 0–51° on a phone.

### The two rule questions

**Can a meteor keep no-glitter and no-fades?** Yes, in a strict form.
- **Shape:** a rigid tapered stroke on a great circle, 1.5 px or wider, at one brightness while it is on screen.
- **Entry and exit:** it enters across a window edge, and leaves across an edge or into the horizon haze. Its rise and fall in light happen out of view. Clouds and land hide it for free, because it is drawn in the sky pass.
- **No strobing:** draw the head's path over each frame as part of the stroke.
- **Speed:** at 3–6°/s it moves 0.9–1.7 px a frame on a laptop and 1.3–2.7 on a phone at 60 Hz.
- **Ordinary meteors:** a meteor that lights up and goes out in mid-sky appears in place. That breaks "only out of the distance" as the rule reads for birds. Widening it is the owner's call, and I recommend not asking him until he has seen the strict ones.
- **Never draw:**
  - persistent trains (they fade where they stand);
  - terminal flashes, flares and glints;
  - fragments that burn out in view;
  - a fireball's light on the land (a ramp of the world's light).

**What does "no timers" mean for random events?**
- **When:** start times are a Poisson draw from SEEDR's streams, as the flock events already are, with no fixed period.
- **How:** the thing arrives by place only:
  - across a window edge;
  - over the horizon or out of the haze;
  - from behind cloud or land;
  - or by the sky's own turn.
- **The still:** anything on screen at the cut must come from SEED0 and so be in the baked still (Venus, a comet). Meteors come after the cut (SEEDR) and are never baked.
- **Reduced motion:** no meteors are drawn.

### The ranking
| # | Item | Lane | Delight (1–5) | Fits every rule | Phone cost |
|---|---|---|---|---|---|
| 1 | Venus, the evening and morning star | SKY (sky frame from AIR) | 5 | yes | ~15 ALU per pixel |
| 2 | Long meteors that cross the window; grazer nights from one radiant | SKY | 5 | yes | a plane test per pixel while one is live |
| 3 | The Milky Way's structure, the two Clouds, M31 | SKY | 4 | yes | replaces existing noise reads |
| 4 | Star colours, and stars coming out in order | SKY | 3 | yes; also closes #236's open star-amount fade | trivial |
| 5 | Crescent moon with earthshine, horns toward the sun | SKY (B11) | 5 | yes; the owner's moon | trivial |
| 6 | A great comet in a few twilight openings | SKY | 5, but rare | yes | ~20 ALU in its cone |
| 7 | Zodiacal light in the Milky Way sky | SKY | 3 | yes | ~10 ALU |
| 8 | One sky frame (pole, ecliptic, galaxy at 60.2°) | AIR | 2 alone; items 1, 2, 3, 6 and 7 depend on it | yes | 0 |
| 9 | One bright outer planet (Mars orange or Jupiter cream) | SKY | 2–3 | yes | ~15 ALU |
| 10 | Moonrise colour from the air it shines through | SKY | 2 | yes, by place | ~0 |
| 11 | An airglow band with gravity-wave ripples | SKY | 2 | yes | 1 noise read in a band |
| 12 | Gegenschein | — | 1 | yes | skip |
| 13 | Satellites and space-station passes | — | 2 | yes, if steady and leaving by an edge | skip: a machine in a world with no human things; flares never |
| — | Real constellations | — | 3 | risky | no (see the end) |

### 1. Venus, the evening and morning star (delight 5)
- **Physics:**
  - Magnitude −3.9 to −4.9 (−4.92 at most), about 15× Sirius.
  - Always within 47° of the sun, on the ecliptic (within 3.4°).
  - With the sun 3° down and an ecliptic 30–80° to the horizon, Venus at 25–45° from the sun stands 9–41° up and 4–40° in azimuth from the glow. With the sun 7° down: 6–37° up. With the sun 24° down it is set, or low in the west (venus.mjs).
  - It is the first light of dusk. It fits the afterglow, the blue hour and first light (as the morning star on the same side).
  - Colour: B−V 0.82, a slightly warm white.
- **Rules:**
  - Steady (planets don't twinkle).
  - Comes and goes only by rising and setting with the sun's depth. A change into a night takes it down behind the sea, and coming back out of a night raises it.
  - From SEED0, so it is in the twilight stills.
  - Cap at L 0.48–0.50.
- **Drawing:**
  - An energy-held bell as in #279, with σ 0.8–1.0 px against the stars' 0.5–0.7.
  - A fixed soft glare 4–6 px wide at 10–15%.
  - OKLab C ≤ 0.02, h about 90.
  - Kept clear of the word boxes at plan time, as the moon's plan already does.
  - In the moonlit sky it sits naturally near the moon (both near the key azimuth): the classic pairing.
- **Fastest proof:** a unit test (ms) that it stays within 47.3° of the sun, sits within 3.4° of the ecliptic, sets with the sun's depth, its light swings under 2% over sub-pixel places (reuse #279's test), and its peak is L ≤ 0.50. A Node count of how often it is in view at the cut. Then one T1 still at true size.

### 2. Long meteors (delight 5)
- **Physics:**
  - Meteors enter at 11–72 km/s and glow at 80–120 km. A fireball (−4 or brighter) is seen about once per 20 h of watching, and −6 once per 200 h.
  - Sporadic rates: about 2–5 an hour in the evening, 6–17 before dawn.
  - Showers: Perseids ZHR 100 at 59–60 km/s; Geminids 150 at 35 km/s; Leonids 71 km/s; Taurids 27 km/s. A storm is 1000 an hour or more.
  - Angular speed for a path across the line of sight at 100 km: 1.2–41°/s (calc.mjs), in line with IMO's 3–25°/s.
  - Colour: slow meteors are warm (sodium, iron). Fast ones carry a green or blue head (the 557.7 nm oxygen line and a hot second spectrum). The wake lasts a fraction of a second at each point.
- **The rate problem:**
  - At real rates only 13% of seen meteors are in the laptop window (9% on a phone). At 10 an hour that is one every 47 min (64 on a phone), essentially never in a visit.
  - Only 1–2% of seen sporadics meet the strict form, almost all of them earth-grazers (radiant near the horizon), at 2–9°/s.
  - From a radiant just below the horizon, 23–32% of meteors meet it, crossing the whole window at 3–5°/s (strict.mjs).
- **Recommended dial:** let a night stay stand for a night, as the aurora's breakup already does.
  - **An ordinary night:** about 80 sporadics in 8 h × 1.1–1.8% gives about 1 strict meteor in view per stay.
  - **A rarer grazer night** (a shower whose radiant is rising): about 5–12 per stay, all running parallel away from one side. The 1913 procession of 40–60 slow fireballs, each visible 30–40 s, shows how far this can go.
  - Motion always at 1×.
  - On a laptop one crosses in 14–24 s, on a phone in 8–14 s.
  - Best in the Milky Way and aurora skies. In the moonlit sky, bright ones only. None in the afterglow or first light.
- **Drawing:**
  - Head 1.5–2.5 px wide with analytic coverage, plus a wake 1–2.5° long. As a style choice it can be longer and brush-tapered, since it moves with the head.
  - Warm white (h about 85, C ≤ 0.04) or a faint green head (h about 140). Cap at L 0.50.
  - Added before the veil and haze mixes, so it sits behind them.
- **Fastest proof:** a unit test (ms) on a JS port of the plan and the stroke:
  - both ends outside the view or under 2°;
  - rigid length and constant on-screen light;
  - ≤ 2.7 px a frame at 60 Hz;
  - the mean count per stay over 10⁴ visits;
  - none under reduced motion.

  Then SwiftShader at 1× against 2×2 (seconds), then one T1 film at a fixed seed.

### 3. The Milky Way's structure (delight 4)
- **Physics:**
  - The Great Rift: one coherent dark lane splitting the band lengthwise over about a third of it, from Cygnus to Centaurus.
  - The brightest star clouds lie at galactic longitude (l) −80° to 0°. A bulge sits at the core, cut by a lane through its middle. The anticentre is faint and narrow.
  - The Coalsack: 7° × 5° at l 302.8, b 0.4 (my conversion).
  - LMC at (280.5, −32.9): 10.75° × 9.2°, V 0.13. SMC at (302.8, −44.3): 5.3° × 3.1°, V 2.7. They are 20.8° apart.
  - M31 at (121.2, −21.6): 3.2° × 1°, V 3.44, 122° from the LMC. All my conversions from RA and Dec.
- **Drawing:**
  - Replace the noise lanes with an analytic rift over l −50° to +80°, broken by the existing noise.
  - A mid-plane lane through the bulge; brightness falling toward l 180 (about 0.3× there).
  - The Coalsack as a dark ellipse.
  - The Clouds as soft lumpy glows (2 Gaussians and 1 noise read each), M31 as a small elongated smudge.
  - All in uGal's frame, so no new draws. They rise and set with the galaxy and come and go by its edge (#236).
- **Fastest proof:** a unit test (ms) running the shader's lines: the rift's minima only inside its longitudes; the core ≥ 3× the anticentre; each object within 0.5° of its (l, b). Then one T1 Milky Way still.

### 4. Star colours, and stars coming out in order (delight 3)
- **Physics:**
  - B−V runs from −0.33 (O5) to 1.4 or more (M); the Sun is 0.656.
  - Temperature from a black-body fit: T = 4600 K × (1/(0.92 B−V + 1.7) + 1/(0.92 B−V + 0.62)).
  - The eye sees colour only in bright stars (rods are colour-blind), so naked-eye stars look pastel at most.
  - The brightest stars and planets show at about −6°, most by −12°, the faintest only after −18°.
  - The sky darkens first high up and away from the sun.
- **Drawing:**
  - A hashed B−V per star, mostly blue-white or K-orange. That mix is my estimate: check it against a catalogue in the test.
  - Chroma grows with the star's brightness, 0 for faint stars and ≤ 0.04–0.05 for the brightest 5%. L stays unchanged.
  - Hold the stars' amount whole and show each star against the sky's light where it stands: a soft threshold over about 0.5 mag. Stars then come out one by one, brightest first and by place, instead of all together. This closes the open gap #236 names ("post.stars ... still blend").
- **Fastest proof:** a unit test (ms) of the chroma caps and hues; appearance order by brightness (rank correlation ≥ 0.9); no star changing by more than a few percent a frame at the fastest change. A plant with the old uniform blend must fail.

### 5. Crescent moon with earthshine (B11; delight 5; the owner's moon)
- **Physics:**
  - At the world's 50–64° from the sun, the moon is 18–28% lit, and the Earth seen from the moon is 72–82% lit, so earthshine is near its strongest.
  - Earthlight is 1.1e-4 of sunlight at the moon (about 9.9 mag), and the earthlit side is 0.15 bluer in B−V.
  - It is clearest a few days from new, after dusk.
  - The lit limb faces the sun along the great circle from the moon to the sun. The horns must point away from it.
- **Drawing:** a flat cut-paper crescent with a 1–2 px terminator. The earthlit disc sits a few hundredths of L above the sky at h about 250. The phase holds for the stay.
- **Fastest proof:** a unit test (ms) that the lit fraction is (1 − cos ψ)/2, the bright limb's normal is within 1° of the sun's projected direction, and earthshine L minus sky L is between 0.01 and 0.06.

### 6–13, briefly
- **Comet (6).**
  - Great comets come about once a decade, tails 10–30° (C/2006 P1 −5.5, C/2023 A3 −4.9).
  - The dust tail is curved and white-yellow; the ion tail is straight and blue (CO⁺), pointing straight away from the sun.
  - It belongs to twilight and sets with the sun's side. Put it in 1–2 of the 16 seeds, from SEED0 and baked.
  - It fits the reference's early comet-like "megabird" concept (r2/sources.md).
  - Proof: tail axis within 2° of the anti-sun direction.
- **Zodiacal light (7).**
  - A tilted cone along the ecliptic above the set sun, in sunlight's colour. It is about 60 of the 220 S10 of a dark zenith, and much brighter low near the sun.
  - Moonlight washes it out, so only the Milky Way and aurora skies.
  - Its lower edge rides the twilight arch as it sinks (by place). Peak ΔL ≤ 0.03.
- **Sky frame (8, AIR).** One celestial pole (the latitude), the ecliptic through the sun, and the galactic pole 60.2° from the ecliptic pole with the centre 5.5° off the ecliptic. Then Venus, radiants, comet, Clouds and zodiacal light all agree. Constraining the galaxy's lie changes the stills, so it needs a re-bake.
- **Outer planet (9).** Jupiter at −2.9 at most, B−V 0.87 (cream). Mars at −2.9 at best, 1.43 (orange). On the ecliptic, drawn like Venus but dimmer.
- **Moonrise (10).** The moon's angular size never changes (the illusion is perceptual), so never enlarge a low moon. Extinction does change its colour (my numbers):
  - at 5°: −2.1 mag and +1.5 in B−V, deep orange;
  - at 10°: +0.8, amber;
  - at 20°: +0.4, pale gold;
  - silver above about 30°.

  Colour as a function of the moon's elevation is by place.
- **Airglow (11).**
  - Airglow is 65% of the dark sky's light (145 of 220 S10). The green 557.7 nm line comes from about 90–97 km. It is brightest about 10° up and colourless to the eye.
  - Its bands are 10–35 km apart and move at 30–60 m/s. Seen at about 400 km that is 1.5–5° spacing, effectively frozen.
- **Gegenschein (12).** 8–10° across, only about +18% over the sky (40 ± 5 S10). Skip.
- **Satellites (13).**
  - The station is at about 420 km, moving 7.67 km/s: 1.04°/s overhead, 0.43°/s at 20°, 0.3 px a frame on a laptop. It reaches −5.9.
  - The Earth's shadow overhead is at 9 / 48 / 142 / 328 / 603 km for the sun at −3 / −7 / −12 / −18 / −24°. So it is lit through twilight, and only low on the sun's side at −24°.
  - Entering the shadow, it dims and reddens over about 9 s.
  - Skip it: the style break, and its dimming is a fade.

**Real constellations: no.**
- Hipparcos is CC BY-NC (not allowed). HYG is CC BY-SA (not allowed). The Bright Star Catalogue is labelled a US government work, but its authors asked for credit, so the owner would have to rule on it.
- A real sky needs a date, which the site deliberately lacks; Orion in the wrong season reads as a mistake.
- Lines are not the look.
- Keep the stylised field with real statistics (counts, colours, the band) turning about AIR's pole.

### Caveats
- These figures come from search summaries rather than pages I read in full:
  - the sporadic rates;
  - IMO's 3–25°/s;
  - the population index;
  - the gegenschein's 40 S10.
- The planets' B−V values differ between sources by about 0.05.
- The rates per stay are a design setting anchored on physics, not a physical rate. My meteor simulation is crude: it overstates grazer path lengths. Treat the strict durations as upper bounds.
- Two Clouds URLs contain the explorer's eponym. Swap them for SIMBAD or DOI links if the naming hook objects. The prose above avoids it.

### Sources
- Meteors:
  - https://www.amsmeteors.org/faq/
  - https://www.amsmeteors.org/fireballs/faqf/
  - https://www.imo.net/meteor-activity-outlook-for-14-20-january-2023/
  - https://www.popastro.com/meteor/observing-meteors/
  - https://www.imo.net/?p=674
  - https://www.imo.net/resources/calendar/
  - https://amsmeteors.org/meteor-showers/meteor-shower-calendar/
  - https://en.wikipedia.org/wiki/Meteor_shower
  - https://www.imo.net/imcs/imc2015/lectures/SIRKO.pdf
  - https://arxiv.org/abs/2407.18344
  - https://arxiv.org/abs/2007.04041
  - https://en.wikipedia.org/wiki/Earth-grazing_fireball
  - https://en.wikipedia.org/wiki/1913_Great_Meteor_Procession
- Planets and stars:
  - https://en.wikipedia.org/wiki/Apparent_magnitude
  - https://www.timeanddate.com/astronomy/what-is-greatest-elongation.html
  - https://en.wikipedia.org/wiki/Color_index
  - https://arxiv.org/abs/1201.1809
  - https://www.astronomy.com/observing/observe-the-skys-colorful-stars/
  - https://en.wikipedia.org/wiki/Twilight
- Satellites:
  - https://en.wikipedia.org/wiki/International_Space_Station
  - https://arxiv.org/abs/2111.11268
  - https://spaceflightnow.com/2019/11/14/starlink-train-traces-path-across-twilight-skies/
  - https://skyandtelescope.org/astronomy-news/observing-news/flight-into-darkness-observe-the-iss-in-earths-shadow/
- Zodiacal light, gegenschein, airglow:
  - https://en.wikipedia.org/wiki/Zodiacal_light
  - https://en.wikipedia.org/wiki/Sky_brightness
  - https://en.wikipedia.org/wiki/Gegenschein
  - https://ui.adsabs.harvard.edu/abs/1997MNRAS.288.1022J/abstract
  - https://en.wikipedia.org/wiki/Airglow
  - https://www.universetoday.com/112237/how-to-see-airglow-the-green-sheen-of-night/
  - https://angeo.copernicus.org/articles/30/695/2012/
  - https://angeo.copernicus.org/articles/29/1401/2011/
- The Milky Way and its neighbours:
  - https://en.wikipedia.org/wiki/Great_Rift_(astronomy)
  - https://en.wikipedia.org/wiki/Coalsack_Nebula
  - https://en.wikipedia.org/wiki/Large_Magellanic_Cloud
  - https://en.wikipedia.org/wiki/Small_Magellanic_Cloud
  - https://en.wikipedia.org/wiki/Andromeda_Galaxy
- The moon:
  - https://en.wikipedia.org/wiki/Earthshine
  - https://arxiv.org/abs/1401.1994
  - https://www.nationalgeographic.com/science/article/moon-illusion-explained-horizon-size-supermoon-space-science
  - https://apod.nasa.gov/apod/ap020130.html
  - https://en.wikipedia.org/wiki/Air_mass_(astronomy)
- Comets:
  - https://en.wikipedia.org/wiki/Great_comet
  - https://bigthink.com/starts-with-a-bang/why-does-comet-neowise-have-two-tails/
- Star catalogue licences:
  - https://www.cosmos.esa.int/web/hipparcos/catalogues
  - https://heasarc.gsfc.nasa.gov/W3Browse/catalog/bsc5p.html
  - https://catalog.data.gov/dataset/bright-star-catalog