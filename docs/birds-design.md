# The one bird: design (2026-11-06)

The design for rebuilding the ink birds from the root, written before the code.
It answers the owner's review of the live birds after #51 (perched birds that never
turn, flocks that never land, perched birds that fade out instead of flying on,
a cursor landing that feels "magnetized", and birds that fade when the view turns).
The audit behind it (R1-R11, each with file:line at 89e06b3) is summarised in
"What is wrong today". When this ships, docs/birds.md takes what stays true and
this file goes.

## The rules (the owner's, and what follows from them)

1. One kind of bird object, from birth to removal. Clicking, landing, perching,
   taking off and joining a flock are states of that object, never new objects.
   Its wing clock, drawing, size and random stream carry over every change.
2. Birds live in the 3D world, on screen or off. Turning the view never makes a
   bird appear, fade or vanish. A bird that leaves the view keeps flying.
3. Birds are added only beyond sight: where a bird is under half a device pixel
   at the largest window (2560 CSS px at dpr 2) through the air between, and fly
   in from there; never near the viewer, never under the land or in the sea of
   cloud (the owner, 2026-11-06: no birds rising out of the ground). They are
   taken out beyond sight, or once they have flown down into the sea of cloud and
   are wholly hidden in it. No bird is ever below the land under it and 15 m.
   Never at a screen edge, never on a timer, never by fading.
4. No fades of any kind. Distance is the world's own aerial perspective, in
   metres: the same bird at the same place has the same ink on every window.
5. Real flight in 3D: any heading, climbing and descending, below the eye too,
   toward and past the viewer, into and out of low cloud. Only physics limits it:
   airspeed through the wind, turn rate, bank, climb rate, flap and glide.
6. Every change of state is continuous in position, velocity, attitude, wing
   phase and size: no snaps, no springs, no pull toward a target.
7. One entropy read, one clock (unchanged). Every choice comes from the bird's own
   stream.
8. Unchanged: the M drawing (no head, no tail), never darken, light words, reduced
   motion is one still frame, phones are first-class, the pointer is friendly (only
   a jab startles), perches on any letter's ink but never on an underline.

## The bird

One record per bird, in world space (metres, the world's axes):

- body: position, velocity, heading and attitude (yaw, pitch, bank), size;
- wings: the measured wing model's phase, beat or glide, fold;
- identity: kind, its own random stream, its drawing (the hand's jitter);
- social: its flock (or none) and its place in the flock;
- mind: its state, its goal (a point, a perch, a flock or a heading) and when it
  next reconsiders.

There is one integrator. Every state sets only the bird's goal and the forces it
may use (steering, lift, flare, brake); the integrator turns them into motion
with the kind's limits. Birth sets the first position, velocity and goal and
nothing else: no field records how a bird was born.

## The states

```
            +-------------- join ---------------+
            v                                   |
  CRUISE (alone) <---- split / leave ---- FLOCK (a place in a flight)
     |    ^                                     |
     |    +------ climb out / fly on -----+     |
     v                                    |     v
  APPROACH (to a perch: a letter or the pointer's tip) <-- any flock member
     |   ^ give up (target gone or out of reach): back to CRUISE or FLOCK
     v   |
  LAND (flare, legs down, contact)
     v
  PERCHED (idle behaviours, below) --- startled ---> TAKE OFF
     |                                                  |
     +---- its own time / a flock passes ---> TAKE OFF -+--> CRUISE / FLOCK / into cloud / past the eye
```

- CRUISE: a goal heading and height, wandering, commuting, gliding, soaring or
  circling one of the world's places (HOST.places: the temple, the island);
  some routes descend below the eye, into low cloud, or pass near the camera.
- FLOCK: the leader flies a goal like CRUISE; members hold their places (V, line,
  pair, loose) by steering, not by being placed. Any two lone birds, or a lone bird
  and a flight of its kind, may join; a member may split off.
- APPROACH: pursuit in world space toward the perch's world point, re-solved each
  step from where the letter or the tip is now, at the bird's own airspeed and
  turn rate. If the target moves out of reach, the bird gives up and flies on. No
  offset is pasted on, no spring.
- LAND: the flare (pitch up, wings forward, speed bleeding off) ends at contact on
  the ink. Contact is solved against the ledge only in the last few tenths of a
  second.
- PERCHED: stands on the ink. If the ledge moves (a pointer tip, a reflow), the
  bird re-perches with a hop or a few flaps, or leaves if it moved too far. It
  never rides the ledge.
- TAKE OFF: a jump and the first strong beats, then a goal chosen from the same
  list as any bird's: join a passing flock of its kind, climb out into the
  distance, drop into low cloud, or swing past the viewer.

## Persistence and population

- Birds are kept in a ring around the visitor in world space: a set number of
  flights per square kilometre for the hour and the sky, not "flights about the
  view".
- They are added at the ring's edge (beyond 14 km) or inside cloud or behind land,
  and removed only there. Birth is never tested against the window.
- Birds out of view are integrated more cheaply (a coarser step, no pose, no
  drawing) but stay continuous; the same state machine runs.
- The reduced-motion still is this world at one instant. Forced colours is this
  world drawn in CanvasText. The old planner (sections 050-190, and the flight
  half of 250) goes.

## Interactions and behaviours

From the hub's research on real behaviour and delight (2026-11-06; sources there). Every
entry obeys the rules above. "In" means in this PR; "later" and "out" are logged so
nothing is dropped silently.

### The landing (the fix for "magnetized")

- Landing is flown in the perch's moving frame. Letters and the pointer's tip ride
  with the camera, like a ferry's rail: the bird first matches the perch's velocity,
  then closes on it.
- The path is a swoop: down with strong beats to a low point about 3% of the
  approach distance below the perch, about 60% of the way in. Then up into the perch,
  pitching up and stalling. It rises into the perch, never down and in.
- Braking holds tau-dot at 0.6-0.8. The feet go out about 150 ms before contact. It
  touches down at about 0.6 of take-off speed. From contact the feet are fixed to
  the perch: no easing, no lag.
- A moving tip is led (proportional navigation, gain under 3), never chased.
- At most one go-around, looping 3 spans or more out, then the bird flies on.
- Settling: the wings fold in 2-3 small adjustments over 0.5-1 s.

### Take-off

- A crouch and a lean toward the way out (0.1-0.3 s), a leg-driven leap, then 3-5
  strong beats, the first the biggest, at about 20% over the level rate; it climbs
  at 20-40 degrees, or drops then flaps from a high perch.
- It leaves on a goal from the same list as any bird: join a flock, fly out into the
  distance, toward and past the viewer, or into low cloud. Never a fade.

### Perched life

- It faces into the wind; a wind shift turns a row one bird after another over
  0.2-1 s.
- Small body turns of 10-30 degrees every 5-20 s, and hop-turns of 90 degrees or
  more (0.2-0.4 s) every 15-90 s; never rotating in place.
- Comfort moves (both wings raised as a lifted M, a stretch, a rouse) take at most
  10% of perched time, at irregular gaps with a minimum between them.
- Spacing 1-2 body widths, pairs closer; a newcomer landing between two makes them
  side-step, 3 steps at most.
- The bird at the end of a row looks out.
- Walking or hopping along a stroke, pausing about half the time; never on an
  underline.
- A jab sends a startle down the row, bird to bird 120-250 ms apart; 10-20% stay. At
  most once per 30 s.
- On the pointer's tip: the feet locked to the tip, the body swinging like a
  pendulum (2-3 Hz); it hops off when the tip moves fast.

### Flocks

- A flock sends 1-3 birds down to the letters and picks them up again, or another
  flock does; the rest fly on without bending their path.
- Pairs are about one flight in 3-4; a young bird keeps looser station.
- Each bird reacts with its own latency (80-250 ms): no two in the same frame.
- In a V the wingbeat runs down each leg in spatial phase; directly behind, in
  anti-phase; elsewhere unlocked.

### Against the fake look (each is a test)

- Headings turn only through bank in the air (rate = g tan(bank) / V), and only by a
  step on a perch: no smoothed headings.
- No symmetry: size ±5-10% and beat rate ±5% per bird; unequal V legs.
- No constant speed: ±8-12%, gliding at about 0.88 of flapping speed, faster in a
  dive.
- No shared timers: idles at random intervals per bird.
- No pop: across any add or remove, the frames before and after differ by zero
  pixels. Added or removed only beyond under 0.5 px at the largest window, or wholly
  hidden.

### Caps

- One noticeable event at a time. At most 6 birds on the letters.

### Taken, later, out

| idea | here |
|---|---|
| A1 the swoop landing, one go-around | in |
| A2 the take-off, intention movements | in |
| A3 perched life: wind, turns, comfort, spacing, edge bird, contagion | in |
| A4 flocking: splits, merges, phase, latency | in |
| A6 flocks visiting the letters (B8) | in |
| B1-B5, B7, B9, B10 | in |
| B6 riding the cursor with balance | in |
| B11 a click bird gets a loose circle from a neighbour | in, only if the circle stays 3 spans out; else later |
| B12 dusk roost lines and the night tuck on the sky clock | in if the sky exposes its time of day to the birds; else later |
| B13 a gust front as one world event | in |
| B14 thermal kettles over landmarks | in (the temple and island circling, HOST.places) |
| B15 a goose whiffling down to a lake | later |
| B16 a rare close fly-by | in (a cruise goal, once per 2-5 min at most) |
| B17 birds banking away from a dragged camera that would pass close | in (the owner, 2026-11-06: "Bank away"): only when the eye's way would bring it within a few spans in 3 s; after its own 80-250 ms; by its own bank; never following the view |
| murmurations, mobbing, swerving from the cursor, anything drawn to the visitor, crumbs, frequent rolls | out |
| water landings, drying wings after cloud | later |

## What is wrong today (the audit, R1-R11)

- Fades: distance haze in nearness (window size), so a bird fades out at 9-13 px
  and a resize changes its ink; NEAR_FADE fades out any bird nearer than about
  50 m; clicked and leaving birds carry their own fade; the old planner fades on
  timers.
- Removals and births at the edge of the view: off screen and going away (at any
  distance), unseen for 75 s, 450 m behind; births just outside the window.
- Three systems: the living sky, the old planner (forced colours, reduced motion)
  and the guests (perching), which sit glued to the glass at a fixed depth, are
  never hidden by cloud, and swap objects on landing and take-off.
- Calm caps that forbid near passes (6 degrees a second, 110 m clearance) and keep
  commuters 15 m above the eye; perched birds hold one heading; only lone gulls
  land; take-off always flies away and climbs; the cursor approach rides the
  pointer on a 0.12 s spring.
- Dead code and dev switches in shipped code (listed in the audit).

## Every gap, and how it is closed

Two audits, read-only: the session's (R1-R11, at 89e06b3) and the hub's independent
one (H1-H11, at b9c4196). The PR closes every row; the PR description repeats this
table with each row's evidence (a film, a probe or a deleted line range).

| gap | audits | closed by |
|---|---|---|
| clicked and released gulls get their own fade band (270:327) | R1, H1 | one world haze in metres for every bird; fadeS deleted |
| NEAR_FADE fades near birds (020:13, 240:167) | R1, R4, H1 | deleted; a bird near the eye is drawn until it leaves the frustum, and steers round the camera instead of being hidden |
| the haze is in nearness, so it depends on the window | R1 | the haze is in world metres, the land's own aerial perspective |
| the old planner's timer fades (240:147, 163; 250:163-196) | R1, H1 | the old planner deleted |
| a startled 16 m/s for life, a fixed climb (270:328) | R3, R9, H1 | birth sets only the first state; the kind's airspeed comes back through the integrator |
| three systems: flocks, guests, the old planner | R3, H2 | one bird record, one step, one pose, one draw; guests and 050-190 deleted |
| guests fly in camera space, are never hidden by land or cloud | R2, H2 | perching is a world-space state; every bird goes through the cloud and land weights |
| only a lone gull already in view can land, one at a time, always a gull | R6, H2 | any bird of a perching kind, flock members included, can take an approach goal; several may perch |
| flock members sit in fixed slots: none leaves, none joins a skein, no flock splits | R6, R7, H2 | flock places are steered to, not placed; any bird may join or leave, the leader may change |
| sky to perch: the path aims straight at the perch, a dart, a new wing phase, a size on a timer | R3, H3 | the same bird flies a descending glide to the perch; its wing clock and size carry over |
| perch to sky: a new flock replaces the bird at 0.3 s, a fixed heading, a drift jump, hiding switched on at once | R3, R7, H3 | the same bird takes off; its goal is chosen from the cruise and flock goals; hiding is always on |
| the hop onto the pointer starts half a span up, wings and yaw change in one frame | H3 | a hop is a physical jump and flaps from where the bird stands |
| the ride: the whole path slides with the pointer on a 0.12 s spring (270:514, 369) | R8, H4 | deleted; pursuit in world space toward the tip, at the bird's own speed and turn rate, going round if it moves too far |
| a slow cursor within ~345 px pulls a perched bird off its letter (gHop 270:235) | H4 | a perched bird notices the pointer and may choose to hop to it, by its own seeded wish and within a hop's reach; no pull |
| after touchdown a solver slides the body onto the tip (270:683) | H4 | contact is solved only in the flare's last tenths; after that the bird stands, or re-perches by a hop |
| the perched facing is fixed by the window half, ±18° shuffles | R5, H5 | perched idles: turn round by steps, look about, walk along the stroke, hop to another ledge, flap to resettle |
| the landing is a 5 s keyframe list; the idles are pre-drawn; the sit ends on a timer | H5 | idles fire at seeded rates from the bird's stream; it leaves by its own wish, a startle or a passing flock |
| flight is level: climb clamped ±0.12, at least 15 m above the eye | R4, H6 | climbs, dives and descents within the kind's limits, below the eye too |
| routes planned 45-90 s ahead and flown exactly; avoidance terms dead | R10, H6 | goals, steered each step; no route table |
| commuters solved to cross the window; LV_CLEAR, LV_DEGS keep-outs | R4, H6 | deleted; goals drawn in the world, with near passes and low-cloud goals among them |
| nothing steers into low cloud; clouds only hide | R4, H6 | a cloud-base goal: birds climb or descend into low cloud and are hidden there |
| the wingbeat and drift run on the flock's clock: a joining bird jumps | H7 | every bird has its own age clock |
| an old flock's route is trimmed with P.t0 += sh: every member jumps | H7 | no routes, nothing to trim |
| frames travel with the camera (220:3-7, 230:305) | R2, H8 | deleted with the old planner |
| SET_ON, LEAN_TRIM, F.gift, the stale header, GWO.best, P.end, st.hc and the rest of the dead list | R10, H8 | deleted |
| the thermal places never run; HOST.places and HOST.pois never read: the temple and island circling is not wired | H8 | wired: a soaring or circling goal around HOST.places, so the circling the owner kept returns |
| calmAsk slows the camera's turning for the birds | R2, H8 | deleted |
| the perch tables are baked (the name's raster, LINK_GLYPHS, a copy of the credit) | H9 | perches made at build time from the served index.html and the font, so a word or font change rebuilds them |
| ledges need flat headroom: no perches on curves or slopes; feet float on round letters | H9 | perches carry the surface's slope and direction; the feet are set on the ink at the slope |
| allocations per bird per frame, per perched frame, string keys and closures per step | R10, H10 | preallocated state; no allocation in the step or the draw (checked) |
| the fly-by path and the leaving wingbeat recomputed from zero each frame | H10 | gone with the guests; the integrator steps once |
| cloud cover in 0.25 s steps held 0.3 s: a bird pops at a cloud's edge | H10 | cloud cover read continuously per drawn bird, so a bird passes into cloud smoothly |
| clicked birds appear mid-window at full ink, the drift puts them away from the click, always a 16 m/s commuter | R9, H11 | a click births a bird at the click point in the world, on a goal from the same list as any bird |
| removals off screen, unseen, behind; births just outside the window | R11 | the population ring: added only beyond sight (flying in), removed beyond sight or wholly hidden in the sea of cloud |
| the population counted about the view (LV_POP) | R11 | a density per square kilometre in world space |
| no per-bird cost measured; instrumentation in shipped code | R10 | measured against main; the dev counters move to the dev build |
| the reduced-motion still and forced colours run the old planner | R3 | the same simulation run forward from the seed, then frozen (reduced motion) or drawn in CanvasText (forced colours) |

## How it is checked

- Stepped films at true size, frame by frame:
  - a flock bird landing;
  - a perched bird turning and resettling, then taking off to join a flock;
  - a bird flying past the viewer and into a low cloud;
  - an approach and landing on the cursor while the cursor moves;
  - a clicked bird doing all of it.
- Probes:
  - turn the view full circle at every window: no bird appears or disappears in
    view;
  - every add happens beyond sight; every remove beyond sight or wholly hidden in
    the sea of cloud; no bird below the land and 15 m (test/birds.mjs checks all three);
  - a bird's ink at a given place is the same on every window;
  - no field read after birth records the birth.
- Cost: per-frame CPU per drawn bird and per off-screen bird, against main;
  no worse.
- The owner merges it by hand.
