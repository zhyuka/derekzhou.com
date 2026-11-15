## Birds by kind and situation: build spec (research only; no files written in either repo)

**Outcome.** The owner is half right. Real flocks almost never beat in lockstep. The measured phase-locking is one case: ibis in a V, in wake positions, about a third of the time, in bouts of about 2 s. Pigeons, shorebirds, godwit Vs, pigeon pairs and pelicans show none. Four other real effects read as "in sync":
- a flock's birds beat at nearly the same rate, so their offsets hold for seconds;
- a group that leaves together starts its beats together;
- birds in a line glide one after another;
- a turn runs through a flock as a bank wave.

Today's code has none of these, and I measured that with the birds sim. It also has three more physics gaps:
- geese and herons never glide, which breaks the owner's 2026-11-04 rule;
- no kind glides more on a descent;
- formations turn as a rigid shape pinned to the leader.

The sky cycle has no day: thermals and storks never apply, and roost and departure behaviour should key off the sky class. A murmuration does not belong in this world. Line numbers below are at #231's tip (faec524); the bird stack doesn't touch any of this except `touchYaw`.

---

### 1. The science (S-numbers are in the source list)

**1A. Wingbeat phase in groups, measured**

| Group | Phase result | Numbers |
|---|---|---|
| Ibis V, side positions | spatially in phase: the follower's wingtip runs on the leader's path | mean spatial phase −1.155 rad (−0.18 cycle), Rayleigh p 0.003; 14 birds, 43 min [S1] |
| Ibis, directly behind | spatial antiphase | median 2.897 rad (0.46 cycle) [S1] |
| Ibis, how often | only in wake bouts | 32 ± 12 % of time in a wake; bouts median 2 s (IQR 1-4, max 41); about 57 leader swaps per bird on a 39 km flight; formations 61 % pairs, 31 % of 3-4, 8.5 % over 4, largest 12 [S2] |
| Godwit simple V; shorebird compound-V (100-1000 birds) | no temporal or spatial locking | N 117 neighbour pairs, p 0.14 / 0.27 [S5] |
| Pigeon cluster flock (18 birds, 243,000 flaps) | no wingpath coherence | beat rate +0.1 Hz in dense packing [S3] |
| Pigeon pairs | not phase-locked (rates uncorrelated within a pair) | +18 % beat rate; spacing 12.1 ± 4.8 m [S4] |
| Brown pelicans in lines | "few birds had wing beat frequencies similar to the bird ahead" | gliding in ground effect saves 49 % of induced drag [S6] |
| White pelicans in V | glide more, beat slower | 11.4-14 % energy saved [S7] |
| 1970 formation theory, from photographs | V wingbeats "apparently completely unsynchronised" | [S33] |
| Shared flap-glide bouts | jackdaw groups (an observation, not a measurement); pelican lines (field descriptions) | no measured study exists [S32] |

**1B. What a viewer reads as "in sync", in world numbers**
- **The eye can judge it.** People can judge synchrony up to 4-9 Hz [S21]. The world's class rates are 1.65-2.5 Hz (the swallow 4.8), so phase relations are visible, and random phases read as "unsynced".
- **Near-equal rates.** The lab gives each bird ±3 % (`SPREAD`, labbird.js:67). Two birds then differ by about 2 % on average, about 0.05 Hz at 2.4 Hz: one full cycle of drift every ~20 s. Offsets look frozen for several seconds.
- **Leaving together.** In flushed redshank flocks, most birds were airborne within 0.25 s of the first and all within 0.7 s [S11]. At take-off rates (×1.2) that is 0.6-0.75 cycle, so the onset is a ripple of first beats, not one beat.
- **Spatial phase becomes a wave down a V leg.** The lag per rank is f·d/U − 0.18 cycle.
  - Ibis (rank depth 2.9-3.6 m, 2.5 Hz, 14 m/s): lag 0.34-0.47 cycle. Neighbours nearly alternate, and the wave runs down the leg at about 20 m/s (1.4 times the flight speed).
  - Geese (rank depth 8.5-13.5 m, 2.4 Hz, 17 m/s): lag 0.02-0.72 cycle. A rank about one stride back (7.1 m) looks in step.
- **Bank waves.** Starling turning waves cross a flock at 20-40 m/s against a flock speed of 7-12 m/s; 400 birds in about 0.5 s [S12]. In dunlin the wave is about 3 times faster than neighbour-by-neighbour reaction [S13]. Agitation waves (3-25 m/s) are rolls that briefly show more wing, not beats [S14].
- **The reference.** Its flocks' beat rates are tightly clustered (1.54-2.28 Hz, median ~1.8, 93 tracks), they "never hold a set 5 s in unison", and they never deflect for the player (workspace `.work/birdstyle-round/r2/sources.md`:94; `.work/birdscursor/judge-look-2/notes.md`:124).

**1C. Formation geometry and leaders**

| Kind | Geometry | Source |
|---|---|---|
| Canada geese V | angle between legs 27.5-44° by photograph; 38-124° by radar | [S10] |
| Canada geese spacing | median wingtip spacing gave 36 % of the possible saving; wide variation; geese weave on the bird ahead | [S8] |
| Pink-footed geese | fly outboard of the optimum (14 % saving); depth more regular in high wind | [S9] |
| Ibis V | positions agree with aerodynamic theory, about 1 span back, ~45° | [S1] |
| Shorebirds (compound V) | lateral 1.04 spans (0.88-1.24); trailing 0.5-1.5; neighbour angle 33.7-51.8° (mean 41.2°); echelon side follows the wind | [S5] |
| Clusters | each bird tracks 6-7 neighbours | [S16] |

- **Leaders.** Ibis take turns leading, matched pair by pair [S2]. No study has numbers for geese.

**1D. Turning**
- Turns are equal-radius: paths cross and positions change; front becomes side (rock doves, starlings) [S15][S12].
- The turn starts in a few birds and spreads at 2-4 times the flock's speed (starlings).

**1E. Murmuration**
- European starlings only; pre-roost, at sunset, October to March [S17].
- Mean 30,082 birds (max 750,000); mean 26 min; raptors present at 29.6 %; it ends in a mass descent [S17].
- **Not for this world:**
  - there are no starlings;
  - at world scale each bird would be a 1-2 px speck, and thousands of specks fizz (the no-glitter rule);
  - there is no reed-bed roost;
  - the owner's brief is "a few birds and a lot of empty sky".

Its visible essence (the turn wave, equal-radius turns) comes through 1D instead.

**1F. Beat, amplitude, flap-glide, soaring**
- **Beat rate by size.** f = m^(3/8) g^(1/2) b^(−23/24) S^(−1/3) ρ^(−3/8); f ∝ m^(−1/6) for similar shapes [S18].
  - Real rates in model.js: heron 2.9, stork 3.09, gull 3.19, crow 3.84, goose 3.95, ibis 4.0, swallow 7.1 Hz.
  - The world's class rates (the owner's): roughly 0.6 of real, real order kept.
- **Amplitude.** Cruising birds hold St = fA/U in 0.2-0.4 [S19]. World values: goose 0.30, ibis 0.27, gull 0.33, crow 0.34, stork 0.38, heron about 0.42 (stroke assumed 70°), finch 0.51, swallow 0.62.
- **Stride.** The world covers 1.3-1.9 spans a beat, against real 2.25-4.4 (`world.spans_per_beat_real` in model.js).
- **Flap-glide by kind:** gull 67 % flapping; stork 11 %; ibis bouts 3.2-3.6 s with glides of 0.7-0.9 s, but 97 % flapping in a V [S1]; geese, herons and crows flap on; zebra finch flap-bounds at every speed from 0 to 14 m/s [S20].
- **Soaring needs lift.** Thermal soaring follows the daytime convective layer [S31]. Gulls glide in updraught according to wind strength and direction (96.5 % of deviance explained) [S24]. Stork thermal circles: bank 23.8°, radius 20.3 m, lap 13.65 s (workspace NOTES:40).

**1G. Wind**
- **Airspeed.** Gulls fly about 0.16 m/s faster per m/s of headwind, and adjust height to the wind [S25].
- **Landing.** Water birds prefer landing against the wind, weakly at 5.4 m/s or less, and circle first (3,338 flocks) [S22]. Ledge landings succeed about 100 % in calm and under 20 % at 8 m/s [S23].
- **This world's wind.** The dunes realm only: 6.5 m/s, one direction per visit (`490-birds-host.js`:13, :52). Every other realm has still air.
- **Physics at 6.5 m/s.**
  - A gull's slowest air speed (0.45 × 11 = 5 m/s) is below the wind, so it can hang over the ground.
  - Windward dune slopes of 5-15° give 0.6-1.7 m/s of lift.
  - Crab angle = asin(crosswind / V), up to 36° for a gull.

**1H. The day, mapped to the world's skies**

The world keeps only white-word skies (`220-time-day.js`:34): afterglow (sun −3°), blue hour (−7°), night (moonlit, Milky Way, aurora), first light (−3° before sunrise). Each holds 70-190 s and the order isn't a day.

| Sky | Real behaviour | Source |
|---|---|---|
| afterglow, about 10-15 min after sunset | roost flights peak 15-30 min after sunset | [S29] |
| blue hour, about 30-35 min after | last arrivals; going down to roost | [S29] |
| night | geese, herons and gulls fly; gull night-to-day activity is 7-41 %; crows, swallows and finches roost | [S30] |
| first light | rooks leave on average 36 min before sunrise (light explains about 60 %); Canada geese leave in the fast brightening before sunrise; jackdaws leave roosts in sudden mass departures agreed by calling | [S27][S28][S26] |

- No kept sky has thermals; rain is never shown.

**1I. How each behaviour reads as ink birds (10-55 px)**

| Behaviour | What the M shows | Risk |
|---|---|---|
| V spatial phase | a V/∩ ripple running down each leg | none |
| column (one behind another) antiphase | alternating V/∩ along the file | none |
| leaving together | biggest-first beats in sequence | none |
| event or shared glide | flat, trimming M's appearing one after another | the owner's "stiff M" ban: glides keep their trims (bank SD 3.2°, arm SD 5.6° as a floor) |
| turn wave | each M tilts and thins in turn, front to back | none |
| crab | the M's axis skewed off its track | none |
| ridge hang | an M nearly still over the land, trimming | same "stiff M" risk |

Nothing new is drawn in any row: pose and path only.

---

### 2. Wrong or missing

Probes are in the scratchpad: `/tmp/claude-0/-home-user/9afca4a1-d829-5639-9f89-586361aa6223/scratchpad/probe/phase.mjs`, `turn.mjs` and `glide.mjs`. They run the real module in a copy of #231's tree (5 seeds, 1/60 s).

| # | Problem | Where | Measured today |
|---|---|---|---|
| 1 | Research line 96, "random phase except V spatial phase": nothing in the data shows random phase; the data show no locking in clusters and pairs, locking only in ibis V wake bouts, and the four "seen in sync" effects | `birds-behaviour-research-2026-11-06.md`:96 | — |
| 2 | "No shared glide starts" contradicts follow-the-leader glides in lines (observed, not measured) | same line | — |
| 3 | Murmurations only listed under "leave out", never analysed | same file :116 | — |
| 4 | No phase coupling: the lab's lock (`LOCK` labbird.js:70; birdwing.js:139-145, 176-181) is never fed. Yet docs/birds-design.md:159-160 says it exists | `placeWing` 120-wings.js:7 passes no lead or lock | flock R at the random baseline (geese 0.27 vs 0.30; ibis 0.40 vs 0.36); leader-to-second R 0.15-0.28 |
| 5 | An ibis in a V uses the plain schedule, not the measured 97 %-flapping one (labbird.js:48) | 120-wings.js:7 | ibis in a V glide 26 % (measured 3 %) |
| 6 | Geese and herons never glide: event glides went in 53484f0; birdwing.js:46-51 still cites them | `SCHED` cont | 0.0 % gliding, level and descending |
| 7 | No kind glides more on a descent | 210:118-121 reads only the schedule | glide share identical level and descending (ibis 26.1/26.1, gull 27.7/27.7) |
| 8 | Rigid formation turn: slots follow the leader's current heading | `placeVel` 210:267-277 | members lag about 1.4 s nearly uniformly (correlation with rank 0.24); outer birds reach 1.33 × kind speed |
| 9 | No leader rotation (only when the leader leaves) | `relead` 210:102-110 | — |
| 10 | Ibis skeins of 5-11, against measured ibis formations mostly 2-4 | `LIFE_N` 010:35 | — |
| 11 | No headwind term in airspeed | `paceOf` 210:135 | — |
| 12 | Landing ignores wind; the bird then turns on the perch to face it | `gateFor` 262:50-67; `touchYaw` 262:153 (new in the stack) vs `wantYaw` 264:4-8 | — |
| 13 | Gust trims every 25 s per bird, in still air too, never in sequence with neighbours | birdwing.js:264-271 | — |
| 14 | The wheel goal climbs 0.4 m/s: a thermal at dusk and night | 210:239 | — |
| 15 | No ridge lift over the dunes | — | — |
| 16 | Burst-to-schedule handover blends two unrelated phases over 0.22 s: a possible half-beat, and the take-off onset is lost | 230:57-61, `XF_T` 230:80 | — |
| 17 | Strouhal too high (finch 0.51, heron 0.42) | stroke at class rate | swallow St 0.62 |
| 18 | Night flock count 5 against glow 7 (71 %), above gulls' measured 7-41 % | `LIVE_N` 210:27 | — |
| 19 | Storks and soaring appear only in the 'day' tables, which no kept sky reaches: correct for dusk and night, but dead data | 010:12-19 | — |

---

### 3. Build spec (in the code's terms)

**3.1 Phase coupling: wire the lab's lock into the world**
- **birdwing.js**
  - Add `BW.relock(w, leadW, d, U, off, phase)`: it sets `b.lead`, `b.lock`, `b.delta = f0·d/U + phase`, and keeps the wake bouts from `b.rl`.
  - Add an `off` term in `run` (birdwing.js:178): the lead's wing time = t + (lead age − own age).
- **Calls.** `placeWing` and every flock change call it: `newFlock` (212:34), `joinStep` (212:78-82), `relead`, `splitOff`, `toAir`'s join (264:97-100) and `wakeFlock` (212:254-262).
- **Bird fields.** Add `ref`, `lockD` and `lockK` to `newBird`'s one shape (210:79-80).

| Kind and pattern | Reference bird | Target phase lag | Weight |
|---|---|---|---|
| ibis skein | the bird ahead on its own leg (rank 1: the leader) | f·d/U − 0.18 cycle (`LOCK.PHASE`) | wake bouts (`LOCK.HOLD`/`FREE`: on 32 %, median 2 s) |
| goose skein | same | same (extrapolated, no goose data) | same |
| ibis or goose line, |lateral| < 0.5 span | the bird directly ahead | f·d/U + 0.46 cycle | same |
| gull line, any pair, loose, single | none | free | 0 (measured: no locking) |

- d = depth along the way to the reference (m); U = airspeed.
- Ibis in a skein or line fly the `ibisV` schedule.
- Keep `SPREAD` ±3 % and `BOUT_SD`; the measured slow drift is the "together for a few seconds" read.
- Never lockstep: the owner's "Y they all look same and move all the same?" (docs/design.md:15-16).

**3.2 Glides, event and shared**
- **Add `BW.glide(w, t, dur)`.** It ends the open bout at its next beat's end (the lab's own ramp, `RAMP.E_OUT` 0.75 cycle), glides `dur` s, then starts a new bout.
- **Event glide, any kind, the leader or a single.** Triggers: the wanted climb is below −atan(1/glide ratio) (about −4 to −6°) for more than 1 s, or the bank rises above 15° rolling into a turn. It lasts while the trigger holds, 1.5-6 s.
  - This is the only way geese and herons glide (the owner, 2026-11-04).
  - Glide share: geese about 5-12 % of a visit (round 3's band).
- **Shared glides in a skein or line.** A follower starts and ends its glide when it reaches the leader's start point: lag = d_along/U + the bird's own latency `b.lat` (80-250 ms).
- **Loose flocks:** their own latency after the nearest neighbour.

**3.3 Leaving together**
- When a burst ends (230:59-61), skip the schedule forward by frac(ψ_burst − ψ_schedule)/f (`BW.skip`), so its phase continues the burst's.
- `XF_T` then blends amplitude only, with no half-beat.
- A row that leaves together (264's startle) keeps its 120-250 ms ripple and then drifts at the measured rate.

**3.4 Geometry and leaders** (`slotsOf` 212:3-16, `V_GEOM` 010:37, `LIFE_N` 010:35)
- **Geese.** Keep depth 1.9-3.0 and lateral 1.15-1.45 spans a rank: leg angle 21-37°, inside the radar range, wider than the photographed range. At most 5 a leg; unequal legs; J and echelon about 30 %.
- **Ibis.** Keep the geometry (≈1 span back, ~45°). Flocks: 3-5 mostly, at most 9.
- **Leader rotation (V and line kinds).** Every 40-120 s, drawn from `F.r` (estimate from about 1 ibis swap a bird a minute):
  - the leader eases to 0.9 V over 5-8 s and drifts back to the end of the shorter leg;
  - rank 1 leads (`relead`).

**3.5 Turning** (replaces `placeVel`'s rigid frame, 210:267-277)
- Each flock keeps a ring of its leader's (x, y, z, ψ) every 0.1 s for 8 s, in a preallocated Float64Array(320).
- A member aims at the trail point at lag τ = back·sz/c, offset by side·sz along the normal there.
- c = 1.5 V for a V or line (DESIGN 4.2; measured 0.9-4 × V) and 2.5 V for a loose flock, where the initiator is the bird nearest the inside of the turn.
- This gives equal-radius turns, no outer-bird speed-up, and the bank wave.
- `holdPlace` (210:279-283) uses the same ring.

**3.6 Day** (`skyCls`, `LIFE`, `GOALS`, `POP.line`; on the one clock, with no shared timers: changes take effect only at each flock's next goal)

| Sky | Commute | Sink (down to roost) | Wheel | Flocks (`LIVE_N`) |
|---|---|---|---|---|
| afterglow | 85 % toward `POP.line` (the roost bearing) | 12 % | flapping, no climb | 7 |
| blue hour | 75 % toward the roost | 25 % | no crows or swallows (roosted) | 6 |
| night | goose, gull, heron only | 10 % | none | 3-4 |
| first light | `POP.line + π` (away); crows in larger loose flocks | 0 % | — | 6 |

- 'out' climbing at first light: 20 %.
- Wheel at any sky: `g.y` rises only where ridge lift exists (3.7), never on a timer.

**3.7 Wind** (`HOST.wind`; the dunes realm only)
- **Airspeed.** `paceOf` × (1 + 0.15-0.3 × headwind / V); fly lower into the wind.
- **Crab.** Already right (230:100 draws the body along its air velocity); pin it with a test.
- **Landing.** `gateFor` scores gates on the perch's downwind side, so the last leg runs into the wind. `touchYaw` = `wantYaw`'s side when the lateral wind is over 1 m/s.
- **Take-off.** Already into the wind: the leap follows the facing (264:82).
- **Ridge lift.** w = W·∇h from `HOST.ground`.
  - A 'hang' goal for gulls and crows over windward crests where w ≥ 0.6 m/s: airspeed ≈ W, ground speed ≤ 2 m/s, gliding with trims, for 10-40 s.
  - Then it peels off downwind.
- **Gusts.** Birdwing's `GUST` trims take their timing from one realm gust field: phase = t − (x·ŵ)/W, about the sand ribbons' 7 s period (vs-ribbon.glsl:15). Neighbours trim in sequence; still air has none.

**3.8 Amplitude.** Scale the stroke per kind so St ≤ 0.4 at cruise: swallow 108° → about 63°, finch → about 79°, heron → about 65°. The swallow keeps its 4.8 Hz flicker. This changes a visible beat, so the PR carrying it goes to the owner as visible.

**3.9 Murmuration: out.** Revisit only as a pre-roost wheel of 20-40 crows at afterglow, after 1-8 pass.

---

### 4. The rules

| Rule | How this spec keeps it |
|---|---|
| No fades | phase, glide, turn and wind change pose and path only, never ink or alpha |
| Nothing glitters | small birds already hold their glide below 3-8 px (`HOLD_POSE`, 230:14), so a locked flock can't pulse as specks. Test: a 3-8 px flock's total ink over a beat varies at most 1.5 × the random-phase baseline (my estimate) |
| No masking; the ink birds are the only birds | nothing new is drawn |
| Popping only beyond sight | no item adds or removes a bird; re-locks change a nudge target, never a phase (the lock's catch-up is clipped to `MAXF` 15 % of the rate) |
| One clock and one entropy read | wake bouts from the wing's own stream `b.rl`; leader tenures and glide lengths from `F.r` / `b.r`; the gust field from the engine's t and the realm's wind; no Date or Math.random |
| Reduced motion = one still frame | `STILL_T` 24 s (250:3) is longer than the lock's settling (1-3 s), so the still shows a V in spatial phase, deterministically |
| Nothing drawn to the visitor beyond docs/birds.md | no new marks; no bird reacts to the viewer |

---

### 5. Fastest proof for each (a Node sim number, then a CI test)

| Item | Pass | Today |
|---|---|---|
| ibis V lock | in wake bouts, mean spatial phase −0.18 ± 0.05 cycle and pair R ≥ 0.8; lock share 25-40 %; outside bouts R ≤ 0.3 | R 0.15-0.28; share 0 |
| column antiphase | mean spatial phase 0.46 ± 0.06 | — |
| kinds with no lock | neighbour R ≤ 0.3 over 60 s | crow 0.28, gull 0.20 (pass) |
| leaving together | no half-beat: phase gap at handover ≤ 0.02 cycle; neighbour offsets hold ±0.1 cycle for ≥ 3 s | — |
| event glides | geese glide 5-12 %, only on descents or turns; descending glide share > level for every kind | geese 0 %; level = descending |
| shared glides | follower start lag = d/U + latency ± 0.1 s | — |
| turn | correlation(delay, rank) ≥ 0.8; slope = 1/c ± 20 %; max V/V_kind ≤ 1.1; path radii within ±15 % of the leader's | 0.24; 1.33 |
| Strouhal | 0.2-0.4 every kind (unit test, pure) | swallow 0.62, finch 0.51, heron 0.42 |
| crab and landing | yaw − track = asin(W⊥/V) ± 1°; ≥ 90 % of landings touch on the upwind side; no turn within 2 s of the touch | — |
| day | afterglow: ≥ 80 % of commuters within ±30° of the roost bearing; first light: the reverse; night: only geese, gulls and herons, ≤ 4 flocks | night 5 flocks |
| gusts | none in still air; neighbour lag = Δx/W ± 0.1 s | fire in still air |
| ridge hang | ground speed ≤ 2 m/s, height change ≤ 0.5 m/s, flapping ≤ 20 %, only where w ≥ 0.6 m/s | — |

---

### 6. Ranked by how visible it is to a visitor

1. **Turn wave and equal-radius turns:** every turning flock (rows 8 and 3.5).
2. **V phase wave plus ibis at 97 % flapping:** the owner's "in sync" (4, 5, 3.1).
3. **Geese and herons gliding on descents and turns, followers in sequence:** the owner's own rule, broken today (6, 7, 3.2).
4. **A row leaving together:** a ripple of first beats beside the words (16, 3.3).
5. **Landing into the wind, and crab** (dunes visits) (12, 3.7).
6. **Dusk roost bearings, first-light departures, a sparser night** (18, 3.6).
7. **Leader rotation and small ibis formations** (9, 10).
8. **Hanging over dune crests** (15).
9. **Gusts trimming birds in sequence** (13).
10. **Swallow and finch amplitude** (17).
11. **Murmuration: no.**

---

### Sources
- S1 ibis V phasing, Nature 2014: https://www.nature.com/articles/nature12939
- S2 ibis leading and wake bouts, PNAS 2015: https://pmc.ncbi.nlm.nih.gov/articles/PMC4343164/
- S3 pigeon cluster flock, Nature 2011: https://pmc.ncbi.nlm.nih.gov/articles/PMC3162477/
- S4 pigeon pairs, PLoS Biol 2019: https://pmc.ncbi.nlm.nih.gov/articles/PMC6581236/
- S5 shorebird compound-V, eLife 2019: https://pmc.ncbi.nlm.nih.gov/articles/PMC6548498/
- S6 pelican lines, J Exp Biol 1988: https://doi.org/10.1242/jeb.135.1.431
- S7 pelican formation energy, Nature 2001: https://doi.org/10.1038/35099670
- S8 Canada goose positioning, J Exp Biol 1987: https://doi.org/10.1242/jeb.128.1.445
- S9 pink-footed geese, J Exp Biol 1994: https://doi.org/10.1242/jeb.189.1.251
- S10 goose V angles: https://sora.unm.edu/sites/default/files/journals/auk/v102n01/p0195-p0198.pdf and, by radar, https://sora.unm.edu/sites/default/files/journals/auk/v093n03/p0554-p0559.pdf
- S11 redshank escape take-off, Behav Ecol 1999: https://doi.org/10.1093/beheco/10.4.391
- S12 starling turns, Nature Physics 2014: https://doi.org/10.1038/nphys3035 (also https://arxiv.org/abs/1303.7097)
- S13 dunlin manoeuvre waves, Nature 1984: https://doi.org/10.1038/309344a0
- S14 starling agitation waves, Behav Ecol Sociobiol 2015: https://doi.org/10.1007/s00265-015-1891-3
- S15 rock dove flock turns, Auk 1992: https://sora.unm.edu/node/25104
- S16 topological neighbours, PNAS 2008: https://pmc.ncbi.nlm.nih.gov/articles/PMC2234121/
- S17 murmurations, PLoS ONE 2017: https://pmc.ncbi.nlm.nih.gov/articles/PMC5476259/
- S18 wingbeat frequency formula, J Exp Biol 1996: https://doi.org/10.1242/jeb.199.7.1613
- S19 Strouhal number, Nature 2003: https://doi.org/10.1038/nature02000 and Proc R Soc B 2004: https://doi.org/10.1098/rspb.2004.2838
- S20 zebra finch flap-bounding, J Exp Biol 1999: https://doi.org/10.1242/jeb.202.13.1725
- S21 synchrony perception, Proc R Soc B 2010: https://doi.org/10.1098/rspb.2010.0243
- S22 water-bird landing direction, Front Zool 2013: https://pmc.ncbi.nlm.nih.gov/articles/PMC3710278/
- S23 ledge landings in wind, eLife 2019: https://elifesciences.org/articles/43842
- S24 urban gulls in updraught, Phil Trans R Soc B 2016: https://pmc.ncbi.nlm.nih.gov/articles/PMC4992718/
- S25 gull airspeed and wind, Mar Ecol Prog Ser 2023: https://doi.org/10.3354/meps14431
- S26 jackdaw dawn mass departures, Curr Biol 2022: https://doi.org/10.1016/j.cub.2022.04.032
- S27 rook morning departures, Folia Zool 2017: https://doi.org/10.25225/fozo.v66.i4.a3.2017
- S28 Canada geese winter activity, Bulletin 1972: https://sora.unm.edu/sites/default/files/journals/wilson/v084n03/p0278-p0295.pdf
- S29 wood duck roost timing, 1979: https://seafwa.org/journal/1979/analysis-wood-duck-roost-counts-northwest-south-carolina
- S30 gull night activity, 2023 report: https://tethys.pnnl.gov/publications/understanding-seabird-behaviour-sea-part-2-improved-estimates-collision-risk-model
- S31 soaring and thermal convection, Condor 2003: https://doi.org/10.1093/condor/105.2.208
- S32 jackdaw synchronised flap-gliding (an observation), Anim Cogn 2012: https://pmc.ncbi.nlm.nih.gov/articles/PMC3249174/
- S33 the 1970 formation theory, via J Exp Biol 2016: https://doi.org/10.1242/jeb.148114
