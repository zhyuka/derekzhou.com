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
3. Birds are added or removed only where no one can see it happen: beyond the
   distance at which a gull is under one device pixel at the largest window
   (about 14 km: 2560 CSS px at dpr 2), or while wholly hidden in cloud or behind
   land. Never at a screen edge, never on a timer, never by fading.
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

- CRUISE: a goal heading and height, wandering, commuting, gliding or soaring;
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

(This slot is for the hub's ranked catalogue of real bird behaviours and delight.
Each entry: the behaviour, its source, the state it belongs to, how it shows, and
whether it is in this PR.)

Already in the design, from the audit:

| behaviour | state | how it shows |
|---|---|---|
| turn about on a perch (face flips through the side-on profile) | PERCHED | a bird faces left, then right |
| look about, scan | PERCHED | small yaws and pauses |
| resettle, a hop along the ledge | PERCHED | moves a little along the letter |
| a rouse, a stretch | PERCHED | (kept from today) |
| flock members land one after another | APPROACH / LAND | a pair or a flight settles on the words |
| a perched bird lifts off to join a passing flock | TAKE OFF -> FLOCK | it flies up into the flight's place |
| a bird climbs out into the distance, or drops into low cloud | CRUISE | it shrinks into the haze, or is hidden by cloud |
| a bird swings past the viewer | CRUISE | it grows large and passes out of the view's side |
| a moving pointer: the perched bird hops to follow, or leaves | PERCHED | no magnet |
| a jab startles | PERCHED -> TAKE OFF | (kept) |

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
  - every add or remove happens beyond 14 km or wholly hidden;
  - a bird's ink at a given place is the same on every window;
  - no field read after birth records the birth.
- Cost: per-frame CPU per drawn bird and per off-screen bird, against main;
  no worse.
- The owner merges it by hand.
