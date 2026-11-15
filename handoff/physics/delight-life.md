## Life and motion in the world: research report (nothing written in either repository)

**Build these five first.** Every one keeps the rules, adds almost nothing to a phone's cost, and the bird items can each be proved in the headless sim in seconds:
1. **A roost on the name.** At the blue hour crows come down 1-3 at a time and fill the letters. They sleep through the night skies, then all leave together at first light.
2. **The night passage.** A high skein crosses the sky at night, and now and then its route is chosen so it crosses the moon.
3. **The cloud sea breathing.** Slow long waves on its top make the shore creep up the dunes and back. Steady "cloud waterfalls" over saddles come second, after a census shows whether the land has any.
4. **Riding the wind.** Gulls hang still over windward crests, and a few crows wheel and half-roll over a windward mesa rim.
5. **One gust front.** AIR's gust field crosses the world, and birds, the perched row and the sand veils all answer it in sequence.

**Leave these out:**
- **Bats** would need the owner's rule change. My recommendation is no, and not to ask him.
- **Dust devils** are false at twilight and night, and a column that forms and dies in view is a fade.
- **Seasonal passages tied to the date** would need a rule change. Make passages happen on any visit instead.
- **Birds reacting to the aurora:** nature shows no visible reaction, so anything like it would be invented.

**Owls** need the hub to decide on the 15 m flight floor first.

Scale used below, worked out from the camera's 72°:
- a 1440×900 laptop shows 17.3 CSS px per degree;
- a 393×852 phone shows 10.2;
- the moon's disc (MOON_R 1.8°) is 62 px wide on the laptop and 37 px on the phone.

### Ranking
| # | Idea | Lane | Delight | Rule fit | Phone cost | Fastest proof |
|---|---|---|---|---|---|---|
| 1 | Roost on the name, dusk to first light | BIRDS | 5 | clean | ~0 | sim, seconds |
| 2 | Night passage, now and then across the moon | BIRDS (+SKY) | 5 crossing / 4 passage | clean; contrast must be measured | ~0 | Node moon route + sim; one GPU still |
| 3 | Cloud sea breathing; cascades over saddles | CLOUDS (+LAND) | 4 / 5 | clean, if edges move and nothing ramps in place | waves ~0; cascades low-moderate | unit test in ms; Node census of saddles |
| 4 | Riding the wind: gulls hang over crests, crows tumble over mesa rims | BIRDS (reads AIR) | 4 | clean (a roll needs its own mode) | ~0 | sim with windAt |
| 5 | Gust front as one world event | AIR, then BIRDS and LAND | 3 | clean | ~0 | unit test + sim |
| 6 | Nightjars hawking at dusk, and only on moonlit nights | BIRDS (new kind) | 3 | risk to the "calm" brief | ~0 | sim, then a 1× film |
| 7 | Swifts climbing at twilight, gone by distance | BIRDS | 3 | perfect | ~0 | sim |
| 8 | Blowing sand on dune brinks by wind (sand.md S8), less at night | LAND/AIR | 3 | clean (moves only with the wind) | low | Node |
| 9 | The camera rides ridge lift | FLIGHT | 3 (felt more than seen) | visible change; motion-sickness risk | ~0 | unit test, seconds |
| 10 | Geese whiffling down into the cloud sea | BIRDS | 3 | clean, keep it rare | ~0 | sim |
| 11 | Night heron flying out against the roost stream | BIRDS | 2 | clean | ~0 | one table row |
| 12 | Owls quartering low | BIRDS | 3 | blocked by the 15 m floor | ~0 | sim |
| 13 | Aurora "reaction" | none | 1 | — | — | — |
| 14 | Dust devils | out | 3 | 1 | — | — |
| 15 | Bats | out | 4 | 1 | — | — |

### 1. A roost on the name (BIRDS, delight 5)
**Real behaviour**
- Flights to a roost peak 15-30 min after sunset. Ravens at one 1,500-bird roost came in near dusk, alone or in groups under 10.
- Birds at the ends of a row sleep with the outer eye open 32% of the time, against 12% in the middle.
- At dawn, jackdaw roosts leave in mass departures between 45 min before and 15 min after sunrise. The departure itself lasts seconds and follows calling that builds over the hour. When the calling fails to build, they leave as a stream of small groups instead.
- Rooks leave about 36 min before sunrise. A startled flock is all in the air within 0.7 s.

**In the world** (sky class is a state, so there are no timers)
- Afterglow and blue hour: crows in commuting flocks notice the letters more often. They come down by today's approach, 1-3 at a time and one landing at once, up to today's cap of 6.
- Night skies: they don't leave of their own wish. They tuck, the end birds face out, and there is a rare rouse.
- First light: one departure. The crouch-and-lean runs down the row within 0.25-0.7 s, and one bold bird may stay. The rest leave as one loose flock on the morning bearing (physics/birds.md 3.6). On some mornings they leave in pairs over 10-30 s instead.
- The jab-startle and reduced motion behave as today.

**Rule fit:** perches already exist, so nothing new is drawn. There are no fades. Arrivals come out of the sky, from flocks born beyond sight. Nothing is drawn to the visitor: it is the words, not the pointer.

**Ink:** a row of folded M's at 20-30 px, then six M's opening in a ripple. This would be the most legible motion the birds have at true size.

**Proof**
- In tools/birds/sim.mjs, script the sky blue hour → moonlit → first light at 960×600 and 390×844. Check:
  - the time the letters take to fill;
  - groups of 3 or fewer;
  - no bird leaving of its own wish on night skies;
  - at least 80% of the row leaving within 0.7 s.
- Make it a test in test/birds.mjs.

### 2. The night passage, now and then across the moon (BIRDS, with SKY for the moon's place; delight 5/4)
**Real behaviour**
- Geese and cranes migrate at night, calling.
- Night migrants on marine radar fly mostly 300-400 m up, peaking 80-140 min after sunset.
- Cranes fly 50-2,000 m up (about 300 m on average from GPS tags) and carry on after dark.
- Moon-watching counted migrants as silhouettes crossing the moon.
- Severe space weather cuts migration by 9-17% (a correlation).

**In the world**
- The passage is a goose skein (an existing kind; a crane reads the same at this size) of 9-25 birds, 300-600 m above the land, crossing the whole sky in 1-3 min.
- At 424 m slant a goose is 3.7 px on the laptop and 2.2 px on the phone: a line of stitches.
- Its chance is drawn once per night sky from the visit's stream. It takes a flock's place in the count, so the night's flock count does not grow.
- On the moonlit sea, when the moon is on screen (about 1 visit in 5 on a laptop, 1 in 9 on a phone), the skein's route is chosen at its birth, beyond sight, to cross the moon as seen from where the camera will be.
  - A drag simply makes it miss. Nothing corrects for the drag, so nothing follows the view; this is the same kind of choice as today's "pass by the eye".
  - A goose crosses the disc in about 1.8 s, a 9-bird skein in about 4 s.

**Risk:** night birds carry their own glow (GLOW_ENC 0.72, plus the halo), so over the pale disc (L 0.53 at most) they may read pale on pale, where real birds are silhouettes.
- Measure ΔL on one GPU still first.
- If it is under about 0.08, the fix (a backlit bird drops its glow) changes every night bird, which makes it a visible change for the owner.

**Proof**
- The moon's route block runs in Node, per its own comment.
- Run it with the sim to get the share of moonlit visits that get a crossing and the crossing's length.
- Glitter: at 2-4 px the birds hold their glide, but check physics/birds.md's flicker bar.

**Sound:** calls only with the sound on. The score reads only WORLD.sky, so widening its read-only feed for this is a call for SOUND and the hub.

### 3. The cloud sea breathing (CLOUDS, with LAND; delight 4, cascades 5)
**Real behaviour**
- Night inversions carry internal waves and seiches across their basins. Radiation fog shows quasi-periodic swings of 15-40 min.
- Interface waves travel at about √(g′h), where g′ = gΔθ/θ:
  - for a 3-8 K step over 50-200 m: 2.3-7.4 m/s (4.1 m/s for 5 K over 100 m);
  - the buoyancy period in a 5 K over 50 m inversion is about 107 s;
  - so a 2-5 min wave is 480-1,200 m long.
- Amplitude isn't measured anywhere I found; I estimate 1-3 m.
- Fog is deepest near sunrise.
- Where fog stands above a saddle it pours through as a "cloud waterfall", observed in the field:
  - it crosses the crest at about √(g′d) = 1.3-2.3 m/s for 10-30 m of depth;
  - it evaporates within about 13-79 m of descent. I derived that from moist-adiabatic warming of about 6 K/km, saturation rising about 0.53 g/kg per K, and fog water of 0.04-0.25 g/kg.

**Today:** the sea's top (HdSea) has no time term. The coast is "cloud lapping the sand" with a 14 m fringe.

**Step 1: waves**
- Two or three long waves, 1-2 m high and 500-1,200 m long, at speed √(g′h), with directions from a subseed stream.
- They go into HdSea and into HdGap's coast term, in the final adds and never in the D3D11 split passes.
- The shore then creeps 6-11 m up 10° slopes, or 19-38 m over 3° flats, and back again over minutes.

**Step 2: cascades**
- Only where the sea's mean top clears a saddle by 10-30 m and the basin beyond is lower.
- The sheet follows the land down, ends at a fixed evaporation edge, and its texture flows downhill at 1-3 m/s.
- Keep them steady: wave amplitude stays under the overflow margin, so no cascade starts or stops in view.

**Rule fit**
- Edges move and nothing ramps in place: check with the fade meter against optical flow.
- No glitter: the waves are 480 m or longer.
- One clock (uT), and still under reduced motion.
- Natural light only: shading stays inside the sea's own colours.
- HdCam then moves up to about 2 m over minutes, which is invisible.
- The birds' "wholly hidden in the sea" test must read the moving top.
- clouds.md's row "the sea stays" becomes "the sea stays; its surface breathes". That amendment is the hub's.

**Cost:** about 10-20 ALU per vertex of the sea's own clipmap, plus the probe.

**Proof**
- A unit test: phase speed within ±10%, a bound on slope, the advection identity, and the reduced-motion still.
- Then a T2 pair.
- For cascades, a Node census over test/golden/ground. If there are no saddles, cascades need the director to place a new pass.

### 4. Riding the wind (BIRDS, reading AIR's windAt; delight 4)
**Real behaviour**
- Gulls over coastal dunes soar on slope lift more often than not once lift passes 1.14 m/s. They soar 38% of their flight time, 64% of that within 25 m of the land. Their minimum sink is 0.44-0.47 m/s.
- On this world: w = U·sinθ, with U10 3.0-7.5 m/s on 9-14° windward slopes, gives 0.47-1.81 m/s. So gulls can hang on the windier half of visits.
- At a mesa rim the wind at 60 m is 1.22 × U10, and the lift near the rim is several m/s (my estimate).
- Desert ravens play there: "more than 20 in the air, spiralling and tumbling just above the ridge". Ravens roll more on windy days.

**In the world**
- (a) physics/birds.md 3.7's hang: gulls and crows 15-25 m over windward crests where w ≥ 0.6 m/s, holding a ground speed of 2 m/s or less, trimming, for 10-40 s, then peeling off downwind. The camera glides past a bird standing still in the wind.
- (b) A wheel of 6-8 crows over a windward mesa rim at afterglow and the blue hour.
  - Now and then a half-roll: bank through 150-180° and back in 0.4-0.8 s, losing 2-5 m (my estimate).
  - Rolls get likelier the stronger the wind, and there are none on calm visits.

**Rule fit**
- Born beyond sight; above the 15 m floor; only a few birds.
- A roll needs a roll mode in the integrator, so tan(bank) isn't used past 90°.
- Hangs keep the owner's "no stiff M": trims at bank SD 3.2° and arm SD 5.6° as a floor.

**Ink:** a gull's M held nearly still while the land slides under it. A roll flips the M to a ∩ for a moment, which reads at 8-12 px.

**Proof:** the sim over the recorded ground with windAt, against the hang row in physics/birds.md §5. Then a true-size still for how the roll reads.

### 5. The gust front (AIR first; delight 3)
- AIR's windAt already plans a gust field carried downwind.
- Birds trim when the gust reaches them, with a lag of Δx/W.
- The perched row turns into it bird by bird.
- Sand veils on the brinks lift in sequence, and only by moving with the wind (sand.md S8).
- Nothing new is drawn, and there is nothing in still air.
- Proof: physics/birds.md §5's gust row, plus the advection identity.

### The rest, briefly
- **6. Nightjars hawking (delight 3)**
  - Real:
    - dark nights confine their foraging to twilight, and moonlit nights make it about 2.5× longer;
    - nighthawks feed from 1 m to over 80 m up, about 70 min a night at about 18 strikes a minute;
    - they fly with snappy beats and short glides with the wings in a V, jinking;
    - wingspan is 42-61 cm.
  - World:
    - a new ink kind of 1-2 birds, 15-60 m up, about 12 px at 40 m;
    - a sally every ~3 s;
    - flying on the afterglow, blue hour, first light and moonlit skies, and absent on the Milky Way and aurora skies. That absence is the true "reaction to the moon".
  - Risk: the "not bouncing off the walls" brief, so judge it at 1×.
- **7. Swifts at twilight (delight 3)**
  - Real: they climb at sun −6° to −12°, up to 2.5 km for about an hour; dawn climbs are about twice as common as dusk ones.
  - World: 6-12 swallow-kind birds spiral up at about 0.7 m/s on the blue hour and first light, and leave only by distance. That is ideal for the rule, but they are specks of 1-4 px.
- **8. Blowing sand on dune brinks:** as sand.md S8, plus a per-sky share.
  - At one Taklimakan site, 83% of saltation seconds were in daylight, with the minimum near 23:00. A Moroccan desert station also records some saltation at night.
  - Never draw streamers: they would glitter.
- **9. The camera rides ridge lift (FLIGHT)**
  - World:
    - over windward slopes the camera rises 2-15 m above its clearance (w 0.5-1.8 m/s for 4-8 s) and settles in the lee;
    - near a windward mesa face it rises more;
    - heading and pitch are untouched, so the words' framing holds.
  - Hazard:
    - visually induced motion sickness peaks at 0.2-0.4 Hz;
    - a glider's long pitch oscillation at 12 m/s is about 5.4 s (0.18 Hz).
    - So the response must be overdamped, with nothing above 0.1 Hz. The dunes force it at 0.059 Hz (205 m spacing at 12 m/s).
  - Keep the 0.13 rad roll cap. A glider's real 20° bank would swing the horizon about 262 px at a 1440 window's edge, through the credit row.
  - Proof: cut the flight step into a unit test over test/golden/ground (the way test/unit/drag.mjs cuts code) and check the vertical spectrum and the floor.
  - It is a visible change, so it goes to the owner as a PR.
- **10. Geese whiffling:** they roll and side-slip to lose height. Add it to a few last descents into the cloud sea, no more than once every 3-5 min.
- **11. Night heron:** at sunset night herons leave their roosts as other herons arrive. One heron flying out, low, against the stream at the blue hour.
- **12. Owls:**
  - Real: barn owls quarter about 1-3 m over the ground, and 25% of their kills come from a hover-drop. Short-eared owls quarter low and hover.
  - The problem: that is below CLEAR's 15 m. The floor is the hub's reading of the owner's "birds spawn from the ground", which was about births.
  - Lowering the floor for one kind (births still beyond sight) is the hub's call. The look goes to the owner as a PR.
- **13. Aurora and moonrise:** no visible bird reaction is documented. If wanted, cut passages ×0.85 on aurora skies (invisible, true). The moon's real effects are items 2 and 6.
- **14. Dust devils:**
  - Real:
    - a climatology puts them mostly between 10:00 and 17:30, over 60% at 12:00-14:00;
    - the Moroccan station saw activity from about 9 a.m. to a minimum near 10 p.m., with only an unconfirmed night signal after that;
    - they live minutes and move at about the wind speed (up to 1.9×).
  - Why out: false on these skies; a column forming and dying in view is a fade; the swirling grains would glitter.
- **15. Bats**
  - Real: free-tailed bats emerge 5-12 min after sunset (11.8 min on average) and fly above 3 km.
  - Why out:
    - they are not birds, and the owner turned the world's rays off "so the new birds are the only birds", so bats are his rule change;
    - drawn as an ink M, a bat reads as a swallow and adds nothing;
    - drawn as a bat, it flickers at 2-6 px, and an emergence column is thousands of specks: glitter.
- **16. Season by date and "a heron at the end of a visit"**
  - Only the opening sky may read the clock, so a season is a rule change.
  - The page cannot know when a visit ends (no exit or idle handlers, no timers). The heron can come at the change from blue hour to night instead, which the tables nearly do already.

### Notes for the hub
- Caps stay as they are: 6 birds on the letters, and at most one rare event in view at a time (a moon crossing, a tumble, a whiffle).
- Every visible item goes to the owner as a built PR, not a question.
- One search result, a mirror of an encyclopedia page, carried an unrelated embedded instruction. I ignored it.
- I deleted the one PDF I downloaded, after reading it, from the scratchpad.

### Sources (URL or DOI only; I left out any whose address carries a person's name)
- **Nightjars:**
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC6794068/
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC7391349/
  - https://www.allaboutbirds.org/guide/Lesser_Nighthawk
  - https://audubon.org/field-guide/bird/lesser-nighthawk
  - https://www.canada.ca/en/environment-climate-change/services/species-risk-public-registry/cosewic-assessments-status-reports/common-nighthawk/chapter-8.html
  - https://www.nwf.org/Magazines/National-Wildlife/1998/Goatsuckers-Get-Some-Respect
- **Owls:**
  - https://afo.birdlife.org.au/afo/index.php/afo/article/view/2372
  - https://bto.org/our-science/projects/project-owl/learn-about-owls/short-eared-owl
- **Bats:**
  - https://doi.org/10.1644/08-MAMM-A-266R1.1
  - https://zoolstud.sinica.edu.tw/Journals/40.4/309.html
  - https://tethys.pnnl.gov/publications/bats-flying-high-altitudes
- **Passages and the moon:**
  - https://kraniche.de/en/news/in-which-altitude-do-cranes-fly.html
  - https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12700719/
  - https://www.jstage.jst.go.jp/article/osj/21/2/21_253/_article/-char/en
  - https://www.jstage.jst.go.jp/article/jjo/69/1/69_41/_article/-char/en
  - https://xeno-canto.org/species/Grus-grus
  - https://www.audubon.org/magazine/sounds-and-sights-nighttime-flights
  - https://doi.org/10.1073/pnas.2306317120
- **Swifts:**
  - https://www.lu.se/lup/publication/0ca50830-4800-42a8-a035-35e500098a00
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC5847200/
  - https://www.sciencedaily.com/releases/2013/02/130221084709.htm
- **Lift and ravens:**
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC6609688/
  - https://www.thecourier.co.uk/fp/lifestyle/508835/ravens-just-want-fun
  - https://www.alloaadvertiser.com/opinion/17237527.wildside-crazy-sky-dancers-ochils/
  - https://sora.unm.edu/sites/default/files/journals/auk/v101n03/p0620-p0621.pdf
  - https://en.wikipedia.org/wiki/Ridge_lift
- **Roosts:**
  - https://sora-dev.unm.edu/sites/default/files/journals/auk/v110n02/p0395-p0395.pdf
  - https://seafwa.org/journal/1979/analysis-wood-duck-roost-counts-northwest-south-carolina
  - https://doi.org/10.1016/j.cub.2022.04.032
  - https://sciencedaily.com/releases/2022/05/220523115520.htm
  - https://doi.org/10.25225/fozo.v66.i4.a3.2017
  - https://doi.org/10.1093/beheco/10.4.391
  - https://www.nature.com/articles/17037
- **Herons and whiffling:**
  - https://www.fws.gov/media/black-crowned-night-heron-9
  - https://sora.unm.edu/sites/default/files/journals/auk/v068n01/p0063-p0074.pdf
  - https://en.wikipedia.org/wiki/Whiffling
- **Dust devils and sand:**
  - https://arxiv.org/abs/1812.10480
  - https://atmosold.lzu.edu.cn/upload/news/N20240326105351.pdf
  - https://arxiv.org/html/2507.03643v1
  - https://mdpi.com/2225-1154/7/1/12
  - https://link.springer.com/article/10.1007/s00703-012-0227-3
  - https://doi.org/10.1029/2004JF000270
  - https://arxiv.org/abs/1201.4353
- **Fog and the cloud sea:**
  - https://mdpi.com/2073-4433/11/3/230
  - https://data.eol.ucar.edu/project/158
  - https://mountwashington.org/research/past-research-projects/cold-air-pools-in-mountain-valleys/
  - https://www.weather.gov/media/zhu/ZHU_Training_Page/fog_stuff/fog_guide/fog.pdf
  - https://en.wikipedia.org/wiki/Internal_wave
  - https://www.aol.com/articles/weather-words-cloud-waterfall-100500081.html
  - https://www.foxweather.com/weather-news/watch-fog-waterfall-greets-skiers-atop-washingtons-cascades
  - https://cloudappreciationsociety.org/?p=668156
  - https://webarchive.library.unt.edu/eot2008/20090508145145/http:/www.srh.noaa.gov/jetstream/ocean/marine.htm
- **Camera:**
  - https://repository.lboro.ac.uk/articles/journal_contribution/Frequency_characteristics_of_visually_induced_motion_sickness/9346865
  - https://core.ac.uk/works/8396757
  - https://en.wikipedia.org/wiki/Phugoid
- **In-repo inputs:**
  - /home/user/derekzhou.com-workspace/.work/hub/physics/birds.md (3.6, 3.7, §5)
  - /home/user/derekzhou.com-workspace/.work/hub/physics/sand.md (S1, S8)
  - /home/user/derekzhou.com-workspace/.work/hub/physics/clouds.md
  - /home/user/derekzhou.com/src/world/glsl/world-glsl.glsl (HdSea, HdGap)
  - /home/user/derekzhou.com/src/world/270-flight.js (the 0.13 rad roll cap)
  - /home/user/derekzhou.com/src/world/225-night-sky-moon-path.js (MOON_R 1.8)
  - /home/user/derekzhou.com/src/birds/inkbirds/010-constants.js (the kinds and sky tables)