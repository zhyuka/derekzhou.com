# Weather and atmospheric optics for the world: research report

## Bottom line

- Fourteen phenomena fit all of the site's rules. I'd build these five first:
  1. **Mist pools at first light.**
  2. **The moon's 22° halo and moon dogs.**
  3. **A glory and fogbow on the moonlit cloud sea.**
  4. **Terrain-held clouds:** banners, caps and cloud falls on the coastal mesas and isles, and lenticular "hats" over the far ridges.
  5. **A distant storm's anvil lit by the last light.**
- The first three are shader-only and cheap, and a unit test in milliseconds can prove each one.
- Lightning of any kind can never fit. A flash changes brightness in place, on a timer, and flickers. The storm idea works without it: a decaying anvil has no lightning anyway.
- One frame ties it all together: **the visit's own wind (V.u10, 3.0-7.5 m/s, already drawn) decides its weather**, and the sky decides when each piece shows.
  - Calm visits get mist pools, a glassy cloud sea and halos.
  - Windy visits get sand veils (sand.md S8), dust haze, banner clouds and lenticulars.
  - This fills `weather(sky)` in `src/world/215-air.js` (today it returns `{surface:1, aloft:1}`) with no new entropy and no fades, since the state is constant per visit or per sky.

I wrote nothing in either repository. I checked against main a1c4136, fetched for `215-air.js`; the local checkout is 9725e30. Two scratch scripts hold the numbers marked "calc" below:
- `/tmp/claude-0/-home-user/9afca4a1-d829-5639-9f89-586361aa6223/scratchpad/wx/geom.mjs`: view framing, glory, fogbow, halo, anvil, shadow heights.
- `/tmp/claude-0/-home-user/9afca4a1-d829-5639-9f89-586361aa6223/scratchpad/wx/contrast.mjs`: the words' contrast over candidate colours at the light ceiling.

**View facts (calc).**
- Laptop 1440x900: pitched up 11.3°, view bottom at -13.1° elevation, 17.3 px/deg.
- Phone 393x852: pitched up 6.6°, bottom at -29.4°, horizontal field 37°, 10.2 px/deg.

**Ceiling check (calc).** At OKLab L 0.53 the credit grey reads:
- 4.76-4.83:1 on warm hues (h 10-50, C 0.08-0.10);
- 4.58 on neutral;
- 4.47 on green (h 142, C 0.06), which fails.

So anything green (airglow) is capped at L 0.50, as aurora.md does.

---

## Ranked list

| # | Idea | Sky | Lane | Delight | Phone cost | Rule risk |
|---|---|---|---|---|---|---|
| 1 | Mist pools in the dune troughs and at mesa feet | first light (deep), nights (thin) | LAND (AIR declares the depth) | 5 | low | low (the shoreline moves, see below) |
| 2 | Moon halo 22° + moon dogs on an ice veil | moonlit | SKY | 4 | very low | low |
| 3 | Terrain-held clouds: banners, caps, cloud falls, lenticulars | all; by wind | CLOUDS | 5 | medium | lowest (their shapes stand still) |
| 4 | Glory + fogbow on the cloud sea, opposite the moon | moonlit | CLOUDS | 4 | very low | low |
| 5 | Far storm anvil, lit top above the Earth's shadow | afterglow, first light (lit); blue hour and nights (unlit) | SKY (form reviewed by CLOUDS) | 5 | low-medium | medium (no lightning, ever) |
| 6 | Virga hanging under dusk clouds, combed by the shear | afterglow, blue hour | CLOUDS | 4 | low-medium | low; needs cloud drift (clouds.md phase 1) |
| 7 | Zodiacal light, the "false dawn" cone | Milky Way | SKY | 3 | very low | low |
| 8 | Airglow band with still ripples | Milky Way | SKY | 3 | very low | green cap L 0.50 |
| 9 | Dust haze by the visit's wind | all | AIR | 2-3 | ~0 | low |
| 10 | Corona and iridescence only where thin cloud crosses the moon | moonlit | SKY / CLOUDS | 3 | ~0 | low (it fixes today's always-on corona) |
| 11 | Purple light: peaks with the sun 3-4° down | afterglow, first light | SKY | 2-3 | ~0 | low |
| 12 | Sun pillar over the set sun, where the veil covers it | afterglow, first light | SKY | 3 | ~0 | owner's eye: may read as the rays he removed |
| 13 | Cloud shadows by moonlight, drifting over the dunes | moonlit | LAND / CLOUDS | 3 | medium | natural shadow (owner allowed) |
| 14 | Looming and towering of the far land at first light, held still | first light | LAND | 2 | low | crawl risk; tiny on screen |

---

## The ideas in detail

### 1. Mist pools at first light (LAND; AIR declares the depth)

**Physics**
- Radiation fog forms on clear, nearly calm nights. Winds of 2-7 kt thicken it; stronger wind prevents it.
- Cold air drains into hollows, so valley fog forms faster and lasts longer.
- It is thickest near or just after sunrise and clears from the edges inward.
- Inland desert fog is real: Abu Dhabi airport records about 51 fog days a year, with winds near 5 kt (2.6 m/s), mostly December-March, 20-100 km inland. Negev dew is heaviest in the interdune corridors (0.1-0.3 mm a night), so the cold, moist air sits exactly there.
- Depth runs from tens of centimetres (ground fog) to several hundred feet.

**In this world**
- Depth up to about 10 m, a third of the 32 m dunes, so the crests stand out as islands. That is the reference's own image: "terrains poking out of clouds like islands" (sources.md, 12:05).
- Deepest at first light, 3-4 m in the nights, 0 at the afterglow.
- It needs the AIR lane's wind by sky (wind-sky-night.md item 9: first light at 0.35 of the visit's wind, 1.05-2.6 m/s). Depth falls to 0 on the windiest visits.
- Reach is large: first light opens every 05-13 visit, a third of the clock's hours.

**Rules**
- The mist is lighter than twilight sand, under the ceiling (lavender at L 0.50 gives the credit 5.29:1).
- Fades: draw the pool as a flat top that is opaque within a few metres of depth (opacity 1 − exp(−depth/2 m)). The only change on a sky change is then the rim creeping up the slopes as the level rises (10 m over 55-60 s ≈ 0.2 m/s vertical, about 0.9 m/s along a 13° slope). That is a front that moves, like the Earth's shadow on the wisps, never an amount ramped in place. **The hub should confirm this reading.**
- Glitter: prefilter the rim by the pixel's footprint × slope, so far shorelines never crawl.

**Draw**
- In the land fragment: depth_here = D − h_dune (the fragment's own dune term from `dunes()`, plus the maps' low places at mesa feet).
- Path through the slab = (top − y)/sin(depression), with an extinction length of 20-40 m.
- Colour from the sky's own light: ambient up, the warm side toward the glow. A soft milky floor with no texture.

**Cost:** about 15 ALU per land pixel, in a uniform branch.

**Fastest proof**
- A Node sim over the 16 lands' ground JS. Targets: 20-40% of the ground within 1 km under mist at first light; ≥ 60% of crest points clear; nothing inside the flight band; rim speed ≤ 1 m/s through a change.
- A unit test that opacity is monotone in depth.
- Then the glitter meter on a T1 film of a far rim, then a T1 frame.

**Delight 5:** the largest reach, cheap, the reference's own language, tied to the one wind.

**BIRDS tie-in:** first-light departures (birds.md: rooks leave about 36 min before sunrise) rising out of the pools, hidden by the mist until they climb. The hub should rule whether that counts as "out of the distance".

### 2. The moon's 22° halo and moon dogs (SKY)

**Physics**
- Hexagonal ice in thin cirrostratus makes a ring of radius about 22° (red 21.5°, blue 22.4°): a sharp reddish inner edge, a diffuse outer edge, and a darker sky inside.
- It is seen on about 100 days a year in Germany and Finland (Paris: 130).
- Moon dogs come from plate crystals, at the moon's elevation. They need about a half moon or more, which this world's full disc satisfies. To the eye they look colourless.
- My calc of the dogs' distance: 23.1° at a moon elevation of 20°, 24.8° at 30°.

**In this world**
- The moon is drawn 20-35° up.
- With the moon in view, 50-75% of the ring is in view on a laptop and 31-60% on a phone (calc). On a laptop the ring is about 760 px across.
- With the moon 30-50° off centre, 17-42% of the ring is still in view on a laptop. So the halo reaches about twice as many visits as the moon.
- The ice belongs at cirrus height (about 8 km). The 3000 m deck is water-cloud height (corona).

**Rules**
- The ring rides with the moon (6-10 px/s), so it enters through the side edge ahead of the moon and rises and sets with it. Its strength follows the moon's depth, as the moon's broad light already does.
- It only adds light: a step of about ΔL 0.03-0.06 over the veil (my choice). The inside is simply not brightened.
- It is a smooth function of angle, so nothing glitters.
- Presence: about one moonlit stay in three has an ice veil, drawn from the sky's stream and held for the whole stay.

**Draw:** in sky-body's moon branch: ring(ma) × the ice veil's cover at the pixel, plus two soft dog blobs about 1.5° wide. Near-white, with a faint warm inner edge at most, as the corona already has.

**Cost:** about 20 ALU, only where the angle from the moon is under 35°.

**Fastest proof**
- A unit test on a JS port of the ring and dog function: peak 21.8-22.4°; dogs at the computed distance ±0.3°; zero where the cover is 0; L ≤ 0.53 and credit ≥ 4.5:1 on every pixel.
- The SwiftShader 1× vs 2×2 meter, at most 3 codes.

**Delight 4:** huge, calm and true, with a folk story attached ("ring around the moon").

### 3. Terrain-held clouds (CLOUDS)

**Physics**
- Orographic clouds are the one cloud class that really stands still: the air flows through them.
  - Lenticulars form in standing lee waves and are stationary. They need ridge-top wind above about 15 kt (7.7 m/s), within 30° of perpendicular, with a stable layer.
  - Banner clouds sit in the lee of a steep peak, quasi-stationary for hours, driven by a lee vortex, and need moisture.
  - A tablecloth pours over a mesa's edge and evaporates about halfway down as the descending air warms.
  - A sea of cloud spills over cols as a slow "cloud waterfall" that dissolves as it descends.
- The world fits this exactly: "tall buttes and mesas along the coast" (realm-dunes.js, at 35-80 m and 45-90 m), the isles and stupas over the cloud sea, and "far rock ridges" (a site per 4.5 km cell).

**Which visits**
- Windy visits: ridge-top wind 1.28 U10 ≥ 7.7 m/s means U10 ≥ about 6 m/s.
- The cloud sea's coast is moist, so caps and falls belong there, not over the dry dunes.

**Rules**
- These clouds are laid out with their landform's cell, out of view.
- Their envelopes are fixed in the world. Only the billows inside flow, downwind at `windAt` at their height. The existing `AIR_DRIFT` billow slide, wrong for free clouds (clouds.md), is the right physics here.
- Lenticular edges are smooth and crisp, and their irisation near the moon is real (WMO).

**Draw:** few clean shapes:
- lens plates stacked one to three, glowing pink at the afterglow and silver under the moon;
- a banner as one smooth plume, 2-5 summit heights long;
- a cascade sheet over a col or a mesa rim, ending at a fixed level (my estimate: 20-40 m below the rim at this scale).

**Cost:** a few baked bodies (the existing bake) or ribbons, plus analytic lenses. Budget about four in view on phones.

**Fastest proof**
- A unit test that the envelope transform is constant in t and the inner flow speed equals `windAt` ±5%.
- A Node census of how many are in view per minute on windy and calm visits.
- Then T1 frames.

**Delight 5:** the most majestic in the reference's language (cloud and stone), and it shows the one wind.

### 4. Glory and fogbow on the moonlit cloud sea (CLOUDS)

**Physics**
- A glory is centred on the antisolar (here antilunar) point, seen from above cloud, rarely by moonlight. Its first red ring is about 2.4° for 10 µm droplets and scales as 1/r.
- Glories come from droplets of 4-25 µm, so the ring is about 1-6°.
- The existing corona's first red ring of 2.6° implies r ≈ 6 µm. A glory from the same droplets has its ring at about 3.9°, so the two stay consistent.
- A fogbow (cloudbow) is broad and white with a faint red outer and bluish inner edge, at a radius of about 35-40°. Its supernumeraries lie 6-13° inside. Lunar fogbows are observed.

**In this world (calc)**
- With the moon 20-27° up, the glory falls inside a phone's frame when it faces away from the moon. It is below a laptop's frame.
- Facing within 20° of the antilunar bearing, a laptop sees the fogbow's two legs in its lower corners (6-29% of the below-horizon ring).
- This is a rare discovery: a 180° drag (two window widths) finds it.

**Rules**
- Angle-only, so it moves only with the view and the moon.
- It shows only on the cloud sea's surface, only in the moonlit sky, and adds light under the ceiling.

**Draw:** in above-glsl, a ring function of the angle to the antilunar direction, times the sea's own light: two or three pastel rings around a bright centre, and one broad white bow.

**Cost:** about 20 ALU, branched by that angle.

**Dependency:** use the moon disc's direction (`airMoon`), not the key at 5-14°. That is map.md disconnect 4, which AIR should unify.

**Fastest proof:** a unit test of the radii (glory 3.9 ± 0.3°, bow 37 ± 3°), no sky pixel touched, and the in-view shares above.

**Delight 4:** the "how did they know" moment.

### 5. The far storm's anvil (SKY draws it; CLOUDS reviews the form)

**Physics**
- Anvils spread at the tropopause (top about 12 km; storms can punch higher).
- Thunder is heard about 10 miles away; distant lightning is visible to about 100 miles ("heat lightning" is just a distant storm).
- Geometry (calc, with standard refraction):

| Distance | Top elevation (tops 10-15 km) |
|---|---|
| 80 km | 6.8-10.3° |
| 120 km | 4.3-6.7° |
| 200 km | 2.1-3.5° |

  The base (1.5 km) is hidden beyond about 150 km.
- Lighting (calc), with the shadow height h = R(sec δ − 1) at the cloud's local depression:
  - Sun 3° down, storm 100-200 km sunward: shadow line at 4.3-1.4 km, so the whole anvil is lit.
  - Overhead: 8.7 km.
  - 150 km anti-sunward: 18 km, so unlit.
  - Blue hour (7° down): unlit even 200 km sunward (26 km).
- So the anvil glows in the afterglow and at first light on the sun's side. Through a change into night, **the Earth's shadow climbs it from its base to its top**. That is the delight moment, on the sky clock, by a moving boundary, like the wisps today.
- At night it is an old, flashless anvil (decaying anvils outlive the storm).

**Rules**
- No lightning, ever.
- Its rays are not drawn (the owner's "no rays"). Place it 30-70° off the sun's bearing.
- Lit top: L ≤ 0.50, warm hue (the credit reads 4.76+ even at 0.53). The unlit body is a natural step darker than the glow behind it: owner's eye.
- Presence comes from the opening seed (say 3 of the 16 lands), so the baked stills match.
- Tying it to the "rain" hour (13-16 opens on the afterglow) would extend clock dependence beyond the sky. That is the owner's rule; don't.

**Draw:** an analytic far silhouette in sky-body (parallax-free at 120-200 km): a few round tower lobes, a flat plate 20-35° wide, its downwind edge along the deck's wind (wa + 40°), no fine texture. The lit band is h 20-50; below it, the sky's own hue.

**Cost:** about 40 ALU and 2 noise reads inside a box about 35°×10°.

**Fastest proof**
- A Node geometry test: top elevation within 0.05°; the lit line at h_s ±1%; the line rising monotonically through a change into night.
- A source check that no brightness term is periodic in uT.
- Then L ≤ 0.50 and the glitter meter.

**Delight 5:** the biggest sight of desert dusk.

### 6-14 in brief

**6. Virga (CLOUDS)**
- Physics: trails of precipitation that never reach the ground. Very common in deserts; from altocumulus, cumulus and cumulonimbus.
- In this world: hang soft strands under the flat bases of 30% of new bodies in afterglow layouts and 20% in the blue hour.
  - Tilt them by atan(Δu/w_fall): about 25-70° with a shear of 2-3 m/s and falls of 1-4 m/s, curving as drops shrink.
  - End them at 40-70% of the base height.
  - They ride with the body, so they come with it out of the distance.
- Cost: about one ribbon per body. Proof: a Node test of tilt ±5° and a lowest point ≥ 0.3 × base. Delight 4.

**7. Zodiacal light (SKY)**
- Physics: sunlight on interplanetary dust. A cone along the ecliptic from where the sun set; needs the sun below about 18° and no moon. About as bright as the Milky Way, and conspicuous in the tropics, where the ecliptic stands steep.
- In this world: Milky Way sky only (sun at -24°). The cone is tilted 55-85°, warm-white (C ≤ 0.02), and grows in by the sun's depth as the stars do. Base width about 20° is my estimate (unsourced).
- Delight 3. It may overlap with the night-sky researcher's topic.

**8. Airglow (SKY)**
- Physics: the oxygen green line from about 97 km, about 20% of the nightglow. Brightest 10-15° up, where the path through the layer is longest. Shows gravity-wave bands of 20+ km.
- On screen, the ripples drift about 0.004-0.014°/s (calc), so they are still.
- Draw: a faint band 5-20° up, with 2-4 broad ripples, at L ≤ 0.50 and C ≤ 0.04.

**9. Dust haze (AIR)**
- Physics: fine dust stays aloft for days. Aerosol optical depth under 0.1 is clear; 1 or more is very hazy. Coarse dust gives a whitish-yellow haze.
- In this world, per visit from U10 (on screen at the cut, so it must come from the opening seed):
  - windy visits (above the sand's threshold, about 6.2 m/s): visibility 7-10 km becomes 3-5 km, a warmer haze, a muted belt;
  - calm visits: farther views and stars to the horizon.
- Cost: about zero (table values). Delight 2-3: variety more than wonder.

**10. Corona by passing cloud (SKY / CLOUDS)**
- Today the corona is drawn whenever the moon shows (wind-sky-night item 10). Gate it by the thin cover in front of the moon, so it comes and goes as cloud crosses the moon.
- Add pastel iridescent edges on thin cloud 10-40° from the moon (Wikipedia: iridescence within about 10° is diffraction, out to about 40° interference).

**11. Purple light (SKY)**
- Physics: WMO says it is greatest with the sun 3-4° below the horizon and gone by 6°. The afterglow and first light sit at exactly -3°.
- Draw: an equal-L hue lobe (h 320-340) on the sun's side, above the warm arch.
- Proof: the skyCol JS port, as in wind-sky-night fix 3.

**12. Sun pillar (SKY)**
- Physics: plate crystals near or below the horizon. Seen up to an hour after sunset, deeply reddened, up to about 20° tall.
- Show it only where the veil covers the sun's bearing (by place).
- Risk: it may read as the rays the owner removed. Build it only as a visible PR he judges.

**13. Moonlit cloud shadows (LAND / CLOUDS)**
- With the light 5-14° up, shadows fall 4-11 cloud heights away and drift at the cloud's wind. Natural shadow, which the owner allows.
- Cost: a projected shadow footprint per rigid body.

**14. Looming (LAND)**
- Physics: night inversions about 100 m deep (10 m-1 km) raise and stretch the far land; early-morning desert looming shows the country "some 50 km farther on".
- On screen it is a fraction of a degree, a few px. It must never shimmer. Delight 2.

---

## Rejected (strict)

- **Lightning of any kind** (flashes in the anvil, heat lightning, sprites): an in-place brightness change on a timer, and flicker is glitter.
- **Green flash, of the sun or the moon:** the sun is never above the horizon, and the flash lasts 1-2 s. At the sky's 100× rate a moonset's green sliver would last a frame or two.
- **Rainbows:** no sun up and no rain. A moonbow would need a rain shaft opposite the moon; the fogbow (item 4) is this world's honest bow.
- **Dew and diamond dust:** dew is real (180-250 nights a year in the Negev) but invisible from 14-32 m except as glints, which are glitter. Diamond dust sparkles.
- **Dust devils:** 85% fall between 12:00 and 17:00 (peak 13:00-15:00), and the Sahara's activity bottoms out about 22:00. None of the kept skies has them.
- **Haboob:** needs an active storm close by, and it would wash the whole world in brown within minutes.
- **Heat shimmer and the inferior mirage:** daytime, and shimmer is glitter.
- **Crepuscular and anticrepuscular rays:** the owner said no rays at dusk and dawn.
- **Nacreous clouds:** polar winter only.
- **Pulsating or flickering aurora, and twinkling:** already ruled out in aurora.md and wind-sky-night.md.

---

## Build first

1. **Mist pools.** LAND, with AIR's wind by sky.
2. **Moon halo and dogs.** SKY.
3. **Glory and fogbow.** CLOUDS. Small and shader-only; prove it in a unit test, then one T1 frame.
4. **Terrain-held clouds.** CLOUDS. Start with lenticular hats and coastal banners.
5. **The far storm's anvil.** SKY.

Then virga, once clouds.md phase 1 drift lands.

All are visible, so they wait for the owner's merge. Anything on screen at the cut (mist at first-light openings, the halo, the anvil, dust) changes the 96 stills, so the bake must re-run. New draws take new subseed indices chosen by AIR, so no existing stream shifts. Under reduced motion each is a pure function of state and uT, so the still frame shows it whole.

---

## Sources

- **Glory:**
  - https://en.wikipedia.org/wiki/Glory_(optical_phenomenon)
  - https://www.hko.gov.hk/en/education/earth-science/optical-phenomena/00348-the-mysterious-glory.html
- **Fogbow:**
  - https://en.wikipedia.org/wiki/Fog_bow
  - https://hyperphysics.gsu.edu/hbase/atmos/fogbow.html
  - https://glossarytest.ametsoc.net/wiki/Cloudbow
  - https://dugi-doc.udg.edu/bitstream/10256/8504/1/ImagingPolarimetry.pdf
  - https://atoptics.co.uk/blog/lunar-fogbow-finland-opod
- **Halo and moon dogs:**
  - https://en.wikipedia.org/wiki/22%C2%B0_halo
  - https://en.wikipedia.org/wiki/Moon_dog
  - https://www.smhi.se/kunskapsbanken/meteorologi/halofenomen
- **Corona and iridescence:**
  - https://en.wikipedia.org/wiki/Corona_(optical_phenomenon)
  - https://en.wikipedia.org/wiki/Cloud_iridescence
- **Fog:**
  - https://en.wikipedia.org/wiki/Radiation_fog
  - https://www.weather.gov/media/zhu/ZHU_Training_Page/fog_stuff/fog_guide/fog.pdf
  - https://www.thenationalnews.com/uae/the-uae-explained-how-does-fog-form-in-a-desert-1.810419
  - https://presentations.copernicus.org/EGU23/EGU23-17054_presentation.pdf
  - https://www.khaleejtimes.com/uae/weather/uae-sees-over-50-foggy-nights-every-year
- **Dew:**
  - https://grf.bgu.ac.il/index.php/GRF/article/view/14/10
  - https://link.springer.com/doi/10.1007/s004840050007
- **Virga:**
  - https://cloudatlas.wmo.int/en/clouds-supplementary-features-virga.html
  - https://en.wikipedia.org/wiki/Virga
- **Orographic clouds:**
  - https://cloudatlas.wmo.int/en/altocumulus-lenticularis.html
  - https://en.wikipedia.org/wiki/Lenticular_cloud
  - https://skybrary.aero/articles/mountain-waves
  - https://www.blogs.uni-mainz.de/fb08-ipa-en/?p=243
  - https://acp.copernicus.org/preprints/acp-2021-966/acp-2021-966-manuscript-version4.pdf
  - https://www.weather.com/news/weather/news/2023-03-08-weather-words-tablecloth
  - https://hiketablemountain.co.za/what-is-the-tablecloth-on-table-mountain/
  - https://izana.aemet.es/video-mar-de-nubes-a-barlovento-y-sotavento-izana-16-de-mayo-de-2008/
  - https://visitlapalma.es/en/vive_experiencias/descubre-un-nuevo-mar-el-de-nubes/
- **Storms:**
  - https://www.weather.gov/safety/lightning-heat
  - https://scool.larc.nasa.gov/GLOBE/cumulonimbus.html
  - https://cloudatlas.wmo.int/en/imgviewer-4752.txt
- **Purple light and pillars:**
  - https://cloudatlas.wmo.int/en/purple-light.html
  - https://en.wikipedia.org/wiki/Sun_pillar
  - https://atoptics.co.uk/blog/plate-crystal-sun-pillars-effect-of-solar-altitude
- **Zodiacal light:**
  - https://en.wikipedia.org/wiki/Zodiacal_light
  - https://earthsky.org/?p=180034
- **Airglow:**
  - https://en.wikipedia.org/wiki/Airglow
  - https://www.universetoday.com/articles/how-to-see-airglow-the-green-sheen-of-night
  - https://www.nature.com/articles/291398a0
- **Green flash:**
  - https://cloudatlas.wmo.int/en/green-flash.html
- **Dust devils:**
  - https://experts.boisestate.edu/en/publications/a-timelapse-camera-dataset-and-markov-model-of-dust-devil-activit/
  - https://arxiv.org/pdf/1812.10480
- **Looming and inversions:**
  - https://en.wikipedia.org/wiki/Looming_and_similar_refraction_phenomena
  - https://atmos.northernvermont.edu/classes/met130/notes/chapter3/rad_invers.html
- **Dust:**
  - https://science.nasa.gov/earth/earth-observatory/dust-in-the-wind-47970

## Caveats

- **Search summaries only.** Many figures come from search summaries, not pages I read in full: the fogbow radius and supernumerary spacing, the halo day counts, the UAE fog days, the dew figures, the banner and tablecloth details, the lenticular wind threshold, the sun-pillar details, the zodiacal brightness, airglow's 97 km and 20%, and the dust-devil timing.
- **My own choices or estimates:**
  - the halo's ΔL;
  - the mist depth and extinction length;
  - the tablecloth's drop at this world's scale;
  - the zodiacal cone's width;
  - the virga shares;
  - the storm's share of lands.
- **Blocked sources.** old.atoptics.co.uk does not resolve from this session, and www.atoptics.co.uk pages returned a verification wall. Its glory and fogbow pages would firm up the numbers if the host is allowed in the session's network settings.
- **No names.** Scientific eponyms are written out by description (molecular scattering, the plate crystal's skew index, and so on) to keep the naming rule.
