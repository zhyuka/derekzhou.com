# The shape of a visit: research report (Nov 15)

I wrote no files in either repository. The only change on disk: I ran `git fetch` in /home/user/derekzhou.com, which updated its remote refs so I could read main (a1c4136) with `git show`. The working tree is untouched. All sources are cited by URL or DOI only; no person, the reference game or its studio is named.

## 0. Headline

1. **The world has no rarity today.** A dune cell is 1.5 km wide and about 70% of cells hold a landmark site: a temple in 14% of cells, a giant shard in 18%. At any moment about 8 sites are in view, out to 5.2 km. Every grand piece recurs every few minutes, so nothing feels like a find.
2. **Timed events are already gone.** The old timed spawning is removed (`event: null`, the "judges' defect 14" fix in 180-world-definition). Nothing replaced it. A long visit is the same mix of pieces, plus the sky cycle (about 15 min a round, about 45 sky changes in 2 h).
3. **A visit needs five things, from seconds to hours:**
   - a promise in the first frame (a subject on the horizon);
   - a reward within about 30 s (a near pass);
   - an arc over minutes (reaching that destination; a night told in its true order);
   - rarity over hours (finds placed in the world by distance tiers);
   - truth throughout (every rare thing is a real phenomenon under its real conditions).
4. **Rare events drawn from the visit's one read and placed in the world do satisfy "only out of the distance"**, under four conditions (section 3). The existing HK1 hook already tests the core of it.
5. **Build first:**
   1. the visit ruler, a Node sim of a 2-hour visit for all 96 openings in seconds;
   2. curated openings;
   3. a destination on the horizon;
   4. the event layer: rarity tiers on lattices seeded by the read, with a dusk murmuration as its first rare kind;
   5. the night told in its true order, with a moon that waxes across a long visit.
6. **Audit inventions first for the visit:** #13 curated openings, #15 weather and water placed in the world, #3 aurora curtains, #2 large-world coordinates (a 2-hour visit is 86 km from the origin), #1 the look-dev lab. #12, the serial-GPU boot, comes next for phones.

## 1. What a visit is today (measured from main a1c4136 and the workspace)

**Distances at 12 m/s:**

| Visit length | Distance flown |
|---|---|
| 3 s | 36 m |
| 1 min | 720 m |
| 10 min | 7.2 km |
| 2 h | 86.4 km |

**First paint and the cut:**
- Desktop Chrome with the first-paint hold: the live world shows at about 0.6-1.5 s.
- A15 phone (Android lab run 25): the still at 3.5-4.55 s, the live cut at 9.55-11.16 s. The still alone is the first impression for 6-7 s.
- For some visitors the opening is the whole visit: reduced motion (one still frame), held weak phones (the still world) and no WebGL2 (the still sky).

**Sky** (220-time-day.js; SKY_RATE 100 in 215-air.js:28):
- Holds of 70-100 s (the moonlit sky's 190 s), times 0.9-1.15; changes of 55-60 s. That is about 2.6 min a sky and about 15 min a round of six.
- The first change starts after hold × (1 − 0.9 × data-sky-at): anywhere from about 7 s to 190 s.
- Daytime visitors open on first light (08-13) or the afterglow (13-19). Most visits during working hours therefore see one of two opening skies.

**Places:**
- Dune cells are 1.5 km, streamed to 5.2 km. Detail cells are 375 m, streamed to 1.3 km. Cloud-sea cells are 1.2 km, streamed to 3.8 km. The land rings reach 8.2-12.2 km.
- Dune site shares: open 30%, shard 18%, ruins 18%, temple 14%, bay 20%.
- Cloud-sea site shares: open 20%, canyon 22%, towers 26%, islands 20%, isle 12%.
- Flocks wheel at 60-100% of the grand sites.
- So places come about every 2 minutes, nothing is rare, and nothing is visible beyond about 5 km as a landmark.

**Seeds:**
- SEED0 (one of 16 lands) owns everything on screen at the cut and the land for the whole visit (the owner, 2026-11-13: "Keep 16 lands").
- SEEDR (the read) owns everything after the cut: sky order, events, later flocks, the score.

**The landing** is the best of 24 seed candidates for "most kinds of land within 7 km all round" (137-director-itself.js). It places the visitor and never steers.

**Reference pacing** (cw/rulers/ref/RETURN.md §6):
- A place stretch lasts 63/98/179 s (p10/p50/p90).
- A look run lasts a median 18 s (27 s with cut-off runs counted).
- The ruler's "dwell low" floor is 9.9 s.

## 2. What loved ambient experiences do, and what it means here

| Source | Principle | Here |
|---|---|---|
| Slow TV: a 134-hour coastal voyage watched live by millions (https://en.wikipedia.org/wiki/Slow_television) | Real time, real distance, no edits; the pleasure is presence and seeing the next landmark coming | Honest 12 m/s parallax; landmarks you see long before you reach them |
| Aerial screensavers play day or night footage by local time (https://discussions.apple.com/docs/DOC-10571) | The time of day makes the first impression true | Our opening by hour; keep it |
| A 1992 castaway screensaver: a story over months, rare scenes people still talk about (https://en.wikipedia.org/wiki/Johnny_Castaway); the pipes screensaver's rare teapot joint (https://devblogs.microsoft.com/oldnewthing/20241224-00/?p=110675) | The base loop must be beautiful alone; a rare true surprise makes it memorable | Rarity tiers on top of a calm world |
| A thousand-year piece that never repeats (https://longplayer.org/news/2024/12/31/a-thousand-year-long-composition-turns-25/); an evolving flock screensaver (https://history.siggraph.org/?p=13892) | Any moment is unique; listening in at any time is enough | 2^32 reads; no two visits alike after the cut |
| An island game whose seasons are its arc and whose stone circles move time on (https://www.wikiwand.com/en/articles/Proteus_(video_game), https://www.avclub.com/proteus-review-pcmac) | A cycle can be a story | The night told in its true order |
| Planetarium sky tours run "from sunset to sunrise" (https://calacademy.org/events/planetarium-show/tour-of-the-night-sky) | One night is one show | Each round of skies is one night |
| An endless desert game with "dynamic lighting and weather effects like sandstorms and shooting stars" (https://apps.apple.com/gb/app/id1182456409) | Weather and light tie the look together | We cannot use shooting stars (section 7); placed weather we can |
| The reference: an emotional curve mapped across its first six realms by time of day (gdcvault.com/play/1026903, R2); its desert sibling's colour guide across the whole game, "saving blue for the end as a reward" (gdcvault.com/play/1019016, R3 §2.1) | Light carries the arc; scarcity makes a reward | Save the rarest for late, which distance does by itself; light the destination |
| Theme-park wayfinding: a tall icon visible from the entrance pulls visitors forward, with occasional blocked views revealing it slowly (https://theoryofthemeparks.blogspot.com/2015/08/wayfinding-in-themed-design-weenie.html); open-world "slow reveal of the landscape and structures behind" (https://gamedeveloper.com/design/breath-of-the-wild-open-world-analysis-gravity-to-go-forward) | A destination on the horizon, hidden and shown again | A colossal landmark ahead; mid-ground forms hide and reveal it |
| The procedural "oatmeal" problem (https://arxiv.org/abs/2305.02131; https://gamedeveloper.com/design/practical-procedural-generation-for-everyone-) | Mathematically unique is not perceptually unique; give outputs traits people can name | Make the 16 lands distinct, each with its own destination |
| Aesthetic judgments in 50 ms (doi:10.1080/01449290500330448); low complexity and high prototypicality judged best within 17-50 ms (doi:10.1016/j.ijhcs.2012.06.003) | The first frame is judged before anything moves | Compose the 96 first frames |
| Dwell time: the first 10 s decide; the chance of leaving falls steeply, flattening after about 30 s (https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/) | Reward before 30 s | A near pass by about 30 s |
| Motion onset captures attention; ongoing motion does not (doi:10.1111/1467-9280.01458) | The cut's onset is the hook | A legible onset at the still-to-live cut |
| Peak-end rule (doi:10.1111/j.1467-9280.1993.tb00589.x) | Episodes are remembered by their peak and their end | Our end is the visitor's (no exit handler, nothing stored), so keep peaks at a steady density |
| Awe needs vastness and a struggle to take it in (doi:10.1080/02699930302297); soft fascination (doi:10.1016/0272-4944(95)90001-2); "mystery", the promise of more if you go deeper (doi:10.1177/0013916506298796) | Scale and promise, calmly | A colossal far form, half hidden, approached slowly |

## 3. What "only out of the distance" allows

The owner's brief is "Nothing appears on a timer, only out of the distance". The w6 suites test it as T4 and the HK1 hook: a drawable thing in view must always be drawn at its distance-only weight (.work/pc-results/w6d-final/suite/report.md).

**A. Placed (passes):**
- A thing is a record in the world (place, kind, parameters), made by hashing (seed, tier, lattice cell). It is committed before it could be in view, as the director already commits its anchors.
- It is drawn at its distance weight only. It comes into view by flight, by a drag turning toward it, or across a window edge.
- The same sites exist for any path. That path independence is the clean test.

**B. Sky-borne (passes, with care):**
- A thing that belongs to the sky's state (the cycle's clock is the owner's own) enters only by rising across the horizon, drifting through a window edge, or coming from behind cloud or land. It never brightens where it stands. The moon is the precedent.
- The audit already ruled the galaxy and aurora fading in during a sky change a break (aurora-enter-by-place). The same strict standard applies to every new sky thing.

**C. Gated by sky (passes only with physical entrances and exits):**
- A placed thing that exists only in some skies (for example a murmuration at dusk) must begin and end by motion: it flies in from beyond sight, descends to its roost, sinks into the cloud sea, or rises and sets. It never switches on in view.

**Fails:**
1. "Spawn something ahead of the camera at time t". That is a timer in disguise, and it is exactly the removed events-on-the-way.
2. A placed thing whose opacity follows the sky change.
3. Anything that flashes or blinks.

**Seeds:**
- Things on screen at the cut stay SEED0's, so each still is still the bake's. The read's events start only beyond the cut's view.
- Land things (lakes, destinations) are SEED0's: part of the 16 lands.
- Happenings (weather, creatures, comets) are SEEDR's.

**So my answer:** yes. Rare events drawn from the read and placed in the world satisfy the rule when they are path-independent, committed beyond sight, distance-weighted, and enter or leave only by motion. The test is a new test/unit/events.mjs (path independence, no site within the cut's view, no clock read via tools/where.mjs), plus the existing HK1 hook on a dev flight.

## 4. The shape, scale by scale (targets the visit ruler measures)

- **First 3 s (and the whole visit for reduced motion, held phones and no WebGL2):**
  - one composed picture with a subject at a third (the destination);
  - a calm, low-complexity sky behind the words;
  - the night's feature not hidden (seed 0's Milky Way is hidden by cloud today, per invention #13);
  - then a legible motion onset at the cut.
- **First minute:**
  - a near pass (within 150 m, 15° or more of the view) by 30-40 s;
  - the opening's flock;
  - a place stretch inside the reference's 63-179 s.
- **10 minutes:**
  - the destination grows from about 5° to arrival;
  - one crossing between dune sea and cloud sea (the truth: a sand sea meeting a coastal fog bank, https://en.wikipedia.org/wiki/Namib);
  - about 4 skies;
  - the night's peak in about half of visits.
- **2 hours:**
  - about 45 sky changes, about 8 nights, a moon whose phase changes night by night;
  - about 60 places;
  - rare finds about 1-2 an hour, regularly spaced rather than clumped;
  - no seams or judder after hours.
- **Everywhere:** the longest stretch with no reward (place pass, sky change, flock, find) under about 180 s. Peak density stands in for an end we cannot know.
- **Truth for the hierarchy:** the earth ruler measured real land as self-similar, with boundaries per 100 km falling from 39.1 (0.5 km window) to 4.2 (8 km window) (cw/rulers/earth). Bigger features are proportionally rarer, so scale and rarity should rise together.

## 5. The ideas, ranked

Cost: S is one PR (about a day); M is 2-4 days; L is a week or more. Each idea lists its fastest proof, quickest first. All but B are visible, so each goes to the owner as a built PR (rule 9).

**1. B. The visit ruler (enabler).** Delight: none directly.
- **What it is:** a headless Node run of a 2-hour visit for each of the 96 openings and N reads, in seconds. It outputs places passed and their gaps, time to the first near pass, crossings, the sky sequence and time to the first change, look-run and place-stretch distributions against the reference ruler, destination arrival, find sightings and gaps, and the longest reward gap.
- **How it is built:** on audit-1114/cam/sim.mjs (the flight's own code), the plan worker's CPU maps and director, and the kits' JS cell generators. Heights can be approximated; pacing does not need them.
- **Rules:** invisible, no risk.
- **Cost:** S-M.
- **Proof:** it is the proof; CI turns its bars into a gate test.
- **Lane:** FLIGHT, with CI.

**2. A. Curated openings, with marvel openings.** Delight 4 (5 on a marvel). Audit invention #13.
- **What it is:** a 96-entry table of the first heading and the night-sky draw for each opening, scored on its baked still and its first minute. The score checks:
  - a subject;
  - the night feature visible;
  - nothing busy under the words' boxes;
  - a near pass by 30-40 s.
  
  One in 16 openings per hour group is a marvel, for example the moon rising behind the temple plateau. A 3-second visitor then has a 1-in-16 chance of something extraordinary.
- **Rules:** one read unchanged (it still picks k); the opening sky is still by the hour; the heading is set once before anything is drawn, like the landing, and it never turns the view; W8 is part of the score.
- **Truth:** the world's own light.
- **Cost:** S, plus a re-bake of 2,304 stills (25-80 min).
- **Proof:** a Node score over today's stills ranks the worst openings in minutes; then T2 frames of the changed ones; then the hub looks at them true-size.
- **Lane:** PC GPU (bake and score) with SKY.

**3. C. A destination on the horizon.** Delight 5.
- **What it is:** one colossal form per land, on its landing heading, 6-10 km out. Over the dune sea it is an inselberg or volcanic-neck spire, true of sand seas. Over the cloud sea it is a great isle (the reference's vocabulary) or a storm tower. Visible in the first frame, reached in 8-14 min.
- **Later:** a sparse colossal lattice, spaced 12-15 km, so that in most directions one stands on the horizon after a drag.
- **Truth:**
  - aerial perspective carries its silhouette (a haze of 1.1e-4 /m leaves 37% contrast at 9 km);
  - tall forms hold the last direct sun above h = R(1/cos θ − 1) for a sun θ below the horizon: 0.97 km at 1°, 3.9 km at 2°, 8.7 km at 3° (real units, https://en.wikipedia.org/wiki/Earth%27s_shadow). The destination is the scene's true lighting pocket.
- **Rules:** SEED0 land ("Keep 16 lands" holds); no aim or autopilot; distance weight; in the stills.
- **Flight risk:** the slip cannot pass a 400 m-wide mesa met after a drag (realm-dunes.js:32-36). Use narrow tall forms, or an isle above the ceiling that the flight passes under.
- **Cost:** M: a third cell scale streamed to about 14 km, coarse far meshes, the stream budget.
- **Proof:** a unit test of bearing, distance and path independence (ms); arrival time from B (seconds); a T2 still; a frame-time number on the slow phone profile.
- **Lane:** LAND (dunes), CLOUDS (a cloud destination), FLIGHT (the slip).

**4. E. The event layer: rarity tiers placed by distance.** Delight 4 for the mechanism.
- **What it is:** jittered hex lattices seeded from SEEDR, one per tier. With the sight corridor about 7.5 km wide (1.45 × the 5.2 km radius):

| Tier | Lattice spacing | About how often |
|---|---|---|
| Uncommon | about 8 km | once per 10 min |
| Rare | about 19 km | once per hour |
| Very rare | about 43 km | once in about 5 hours of flight |

- **Each site:** a kind chosen to fit its place (the CPU maps' kit weights: fog only in dune troughs, a storm only over the cloud sea), plus its sky gate and its physical entrance and exit (section 3).
- **Budget:** at most one rare site within reach at a time.
- **Rules:** all of section 3; it replaces 310-events-on-way.js, which HYGIENE can then delete.
- **Cost:** S for the layer; M for each kind.
- **Proof:** test/unit/events.mjs in ms (path independence, no site within the cut's view, no clock); sighting rates and gap spread over 1,000 reads × 2 h in B (seconds); HK1 on a dev flight.
- **First kinds:** fog pools (P) for the uncommon tier; the dusk murmuration (J) for the rare tier.
- **Lane:** AIR owns the layer, as part of the world state with the weather; each kind is built by its lane.

**5. D. The night told in its true order, with a waxing moon.** Delight 4.
- **What it is:** keep the walk random, but weight it to a night's real order: afterglow, then blue hour, then night, then first light, then the day passing inside the mist, back to the afterglow. The night types follow the moon's age:
  - full: moonlit from dusk to dawn, the moon rising opposite the afterglow;
  - first quarter: moonlit, then the Milky Way after the moon sets;
  - last quarter: the reverse;
  - new: Milky Way all night.
  
  Aurora nights peak mid-night, matching substorm timing (aurora.md). The moon's age is drawn from the read, matched to the opening sky, and advances about 12° a round at SKY_RATE 100. That is about 110° over 2 hours, so a long visitor watches the moon wax and rise later night after night.
- **Rules:** still random and clock-free (the owner: "randomly non-time-dependent"); the PR body should say the order now follows a night. The moon never fades where it stands: its phase moves about 0.1° a minute. The W8 moon footprint is unchanged. The score inherits the arc for free.
- **Cost:** M, plus the moon's phase terminator.
- **Proof:** in Node, 10,000 sequences from skyNext (pure JS streams): the forward share, night types, and the moon up or down agreeing with its age (test/unit/sky.mjs); then one 20-min T1 film for the look.
- **Lane:** SKY, with AIR for the rate and skyFrame.

**6. F. Sixteen lands chosen to be distinct.** Delight 4.
- **What it is:** B scores 4,096 candidate seeds. Keep the 16 that best combine first-10-minute variety, a destination, a crossing and a near pass, with a pairwise look distance of at least tau 5.02 (the ruler's "same look" radius). That is perceptual uniqueness, not just difference. Give each land a trait people can name.
- **Rules:** one read (k mod 16 still); "Keep 16 lands" keeps the count, and which 16 is our choice.
- **Cost:** M. Batch the re-bake with A and C to pay it once.
- **Lane:** FLIGHT or LAND, with PC GPU.

**7. I. Interdune lake: a sky mirror.** Delight 5.
- **What it is:** still water in deep interdune troughs.
- **Truth:** more than 100 spring-fed lakes lie between dunes of about 450-500 m (https://en.wikipedia.org/wiki/Badain_Jaran_Desert). It reflects the sky function (moon, aurora, stars) under the knee, with no glints (band-limited ripple normals).
- **Rules:** SEED0 land, rare by place; W8 holds.
- **Cost:** M. Water is compiled out today (NO_WATER).
- **Lane:** LAND, with SKY.

**8. J. Dusk murmuration over a roost (E's first rare kind).** Delight 5.
- **Truth:**
  - murmurations happen at sunset, last a mean 26 min, and often end with the birds descending together to roost (doi:10.1371/journal.pone.0179277);
  - each bird follows its 6-7 nearest neighbours (doi:10.1073/pnas.0711437105);
  - roosts need water or cover, so the site is an oasis or a ruin.
- **Entrance and exit:** streams fly in out of the distance and converge, as starlings arrive from feeding grounds; it is gated to the afterglow and blue hour and ends by descending to roost.
- **Rules:** no bird born in view; no fade; no glitter. A far murmuration is drawn as one coverage shape, with specks only near.
- **Cost:** M-L. #203's sleeping flocks and specks already carry 1,000-10,000 birds.
- **Lane:** BIRDS.

**9. H. Birds in the still: the cut as a living photo.** Delight 4.
- **What it is:** bake the opening's ink birds into the still (they are SEED0's already), so at the cut the frozen flock starts to beat its wings. Today they pop in at the cut.
- **Rules:** needs the owner's yes. no-2d-birds reads "before the world's first frame the page is the still sky and the words, no bird". Recommended rewording: the still is the world's own first frame with its ink birds, and no 2D bird ever. The show must wait for inkbirds.js wherever the still has birds, or they would vanish at the cut.
- **Cost:** M.
- **Proof:** T2 frame 0: still against live, byte for byte, with birds.
- **Lane:** BIRDS and PC GPU.

**10. K. A storm tower over the cloud sea, its top holding the last light.**
- **Delight:** 4.
- **Truth:** the Earth's-shadow formula above; only the tallest tops stay lit early in the afterglow. No lightning (it blinks and glitters). It grows at 1× real time.
- **Cost:** M-L.
- **Lane:** CLOUDS and SKY. Also a candidate destination.

**11. L. A comet on rare visits, rising before first light.**
- **Delight:** 4 (5 for whoever sees it).
- **Truth:** bright comets appear about once a decade, in twilight near the sun, tail away from it (https://en.wikipedia.org/wiki/C/2020_F3_(NEOWISE)).
- **Rules:** it must rise on the sky's turn, which needs skyFrame at SKY_RATE (map.md item 7). An evening comet would have to brighten in place, which is a fade.
- **Rarity:** per visit from the read (about 1 in 20); present every night of that visit.
- **Cost:** S-M.
- **Lane:** SKY.

**12. N. A moonbow.**
- **Delight:** 4.
- **Truth:** a near-full moon below 42° behind you, rain or spray opposite; white to the eye (https://atoptics.co.uk/rainbows/moonbow.htm).
- **Rules:** it exists only where its rain is placed, and sinks below the horizon as the moon climbs. That is geometry, not a fade.
- **Cost:** L (rain is compiled out; the weather researcher's ruling decides).
- **Lane:** SKY and AIR.

**13. M. False dawn (zodiacal light).**
- **Delight:** 3.
- **Truth:** a cone along the ecliptic on moonless nights (https://earthsky.org/astronomy-essentials/everything-you-need-to-know-zodiacal-light-or-false-dusk).
- **Rules:** use the morning version, which rises; the evening one would brighten in place.
- **Cost:** S.
- **Lane:** SKY.

**14. O. Looming mirage over the cloud sea.**
- **Delight:** 3.
- **Truth:** a stratus top is a temperature inversion, the condition for superior mirages (https://en.wikipedia.org/wiki/Mirage). Far isles and towers stretch or double near the horizon and resolve as you approach: literally "out of the distance". No shimmer.
- **Cost:** M (ray bending in the far band).
- **Lane:** SKY and LAND.

**15. P. Fog pools in dune troughs near the coast (E's first uncommon kind).**
- **Delight:** 3.
- **Truth:** radiation fog and coastal fog push inland along valleys (https://en.wikipedia.org/wiki/Fog).
- **Rules:** static in presence; its light follows the sky; no white cover.
- **Cost:** M.
- **Lane:** AIR and CLOUDS.

**16. Q. Evening star beside a crescent with earthshine, in the afterglow.**
- **Delight:** 3.
- **Truth:** https://en.wikipedia.org/wiki/Earthlight_(astronomy).
- **Rules:** keep its footprint clear of the words, as the moon's is.
- **Cost:** S.
- **Lane:** SKY.

**17. R. 22° halo round the moon under a thick high veil.**
- **Delight:** 3.
- **Truth:** https://en.wikipedia.org/wiki/22%C2%B0_halo.
- **Cost:** S-M.
- **Lane:** SKY.

**18. S. Night migrants crossing the moon's disc.**
- **Delight:** 2.
- **Truth:** moon-watching is a real counting method (https://sora.unm.edu/sites/default/files/journals/jfo/v066n04/p0457-p0468.pdf).
- **Cost:** M.
- **Lane:** BIRDS.

## 6. Coming back

- **The hour gives only about four opening skies in practice:** dawn and day open on first light, rain and sunset on the afterglow, dusk on the blue hour, and night on one of three. A working-hours visitor sees first light or the afterglow.
- **Returns come from:**
  - 16 lands that look truly different (F), each with its own destination (C);
  - marvel openings at 1 in 16 (A);
  - night types and moon ages (D);
  - finds (E).
- **Nothing is stored.** There is no "new since last time"; rarity is purely chance, per visit and per place.
- On a personal page most returns are the owner, friends and recruiters. Cheap curation (A, F) earns more than elaborate systems.

## 7. What fails the rules

| Idea | Why it fails |
|---|---|
| Meteors, shooting stars | Appear mid-sky and flash |
| Lightning, heat lightning | Blinks, glitters, flashes over the ceiling |
| Satellites | Vanish into the Earth's shadow, a fade |
| Lunar eclipse | The moon darkens where it stands |
| Fireflies, blinking glows | They blink |
| Timed "events on the way" | Spawned by clock |
| Glory, rainbow by day, green flash | No sky has the sun above the horizon |
| Dust devils | Daytime convection |
| A dust wall engulfing the camera | A brown cover, failing the "no white cover" floor |
| Anything keyed to the visitor's clock after the opening | Only the opening may read the clock |
| Anything that reacts to the visitor beyond the drag and the birds' perch | The absence rules forbid it |

## 8. The audit's 16 inventions, for the visit

**Build first:**
1. #13 curated openings: S, every visit.
2. #15 mirror water and weather placed in the world: the event layer's kinds.
3. #3 curtain aurora entering by place: the night's peak; SKY already has it.
4. #2 large-world coordinates: 2 h is 86 km from the origin, and it fixes the "only after hours" cracks, judder and mote jitter. Move it up from LAND's wave 3.
5. #1 the look-dev lab: the faster check every look item needs (B is its pacing twin).

**Next:**
- #12 serial-GPU boot: 1-3 s off phones' cut.
- #8 night sky v2: the dark night's peak.
- #6 clipmap cache with horizon shadows: long low-sun shadows, a big reward but L.
- #4 clouds stable and #5 bird split: baseline quality, in progress.
- #7 value and colour script.

**Later; they do not shape a visit:** #9 Display-P3, #10 supersampling, #11 command-stream gate (it helps re-bakes), #14 sky lookup tables, #16 rendering in a worker.

## 9. The five to build first, in order

1. **B, the visit ruler** (FLIGHT and CI): invisible, so the bot can land it.
2. **A, curated openings** (PC GPU and SKY): step one scores today's stills and needs no ruler; step two adds B's first-minute score.
3. **C, a destination on the horizon** (LAND, CLOUDS, FLIGHT). Bake it with A, and with F when that comes, so the 2,304-still bake is paid once.
4. **E, the event layer** (AIR), with fog pools (AIR and CLOUDS) and the dusk murmuration (BIRDS) as its first kinds.
5. **D, the night's true order with the waxing moon** (SKY), after its aurora queue.

**Owner's calls:** every visible item goes to him as a built PR to merge or turn down. H alone needs his yes on the no-2d-birds wording, with the rewording recommended.

## Sources (URL or DOI only)

**Slow TV, screensavers, ambient games:**
- https://en.wikipedia.org/wiki/Slow_television
- https://www.sciencenorway.no/culture-forskningno-norway/slow-tv-boosts-national-identity-and-traditional-values/1447199
- https://discussions.apple.com/docs/DOC-10571
- https://en.wikipedia.org/wiki/Johnny_Castaway
- https://devblogs.microsoft.com/oldnewthing/20241224-00/?p=110675
- https://www.techrepublic.com/pictures/looking-back-at-windows-screen-saver-easter-eggs/
- https://longplayer.org/news/2024/12/31/a-thousand-year-long-composition-turns-25/
- https://history.siggraph.org/?p=13892
- https://www.wikiwand.com/en/articles/Proteus_(video_game)
- https://www.avclub.com/proteus-review-pcmac
- https://calacademy.org/events/planetarium-show/tour-of-the-night-sky
- https://apps.apple.com/gb/app/id1182456409

**Wayfinding, reveal, procedural variety:**
- https://theoryofthemeparks.blogspot.com/2015/08/wayfinding-in-themed-design-weenie.html
- https://gamedeveloper.com/design/breath-of-the-wild-open-world-analysis-gravity-to-go-forward
- https://arxiv.org/abs/2305.02131
- https://gamedeveloper.com/design/practical-procedural-generation-for-everyone-
- gdcvault.com/play/1026903 and gdcvault.com/play/1019016 (via the workspace's R2/R3 notes)

**Attention, memory, awe:**
- https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/
- doi:10.1080/01449290500330448
- doi:10.1016/j.ijhcs.2012.06.003
- doi:10.1111/1467-9280.01458
- doi:10.1111/j.1467-9280.1993.tb00589.x
- doi:10.1080/02699930302297
- doi:10.1016/0272-4944(95)90001-2
- doi:10.1177/0013916506298796

**Birds:**
- doi:10.1371/journal.pone.0179277
- doi:10.1073/pnas.0711437105
- https://sora.unm.edu/sites/default/files/journals/jfo/v066n04/p0457-p0468.pdf

**Sky, water and land truths:**
- https://atoptics.co.uk/rainbows/moonbow.htm
- https://www.metoffice.gov.uk/learning/rainbows/moonbow
- https://earthsky.org/astronomy-essentials/everything-you-need-to-know-zodiacal-light-or-false-dusk
- https://en.wikipedia.org/wiki/Badain_Jaran_Desert
- https://en.wikipedia.org/wiki/Namib
- https://en.wikipedia.org/wiki/Fog
- https://en.wikipedia.org/wiki/Mirage
- https://en.wikipedia.org/wiki/Earth%27s_shadow
- https://en.wikipedia.org/wiki/C/2020_F3_(NEOWISE)
- https://en.wikipedia.org/wiki/Earthlight_(astronomy)
- https://en.wikipedia.org/wiki/22%C2%B0_halo

**Internal:**
- /home/user/derekzhou.com: docs/world.md; RULES.json; src/world/010, 137, 180, 220, 222, 230, 233, 239, 310, 215-air.js; src/realm-dunes.js; src/realm-above.js; site/hour.js (all read at origin/main a1c4136)
- /home/user/derekzhou.com-workspace/.work/: hub/physics/map.md; scratch/audit-1114/plan.json; scratch/audit-1114/cam/sim.mjs; birdstyle-round/r2/sources.md; birdstyle-round/r3/RETURN.md; cw/rulers/ref/RETURN.md; cw/rulers/earth/RETURN.md; pc-results/w6d-final/suite/report.md (T4, HK1)
