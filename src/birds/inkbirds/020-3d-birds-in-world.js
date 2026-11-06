  /* ---------------- 3D: the birds in the world ---------------- */

  var B_SPAN = 3.2;            // m: a mid bird's span (size 1); every kind by its SORTS size (a heron 4.3 m, a finch 2 m)
  var LEAVE_T = 2.5;           // s: a bird out of view this long comes back with its appear begun again (sooner, it crosses back over the edge at its ink, as the land does); a flight past its planned span none of whose birds has been seen this long is done
  var AWAY_T = 8;             // s: (round 3) a flight the view has turned from within its planned span is kept, unseen, this long (the visitor may look back to it); its band is free while it is unseen
  var UNSEEN_T = 4;            // s: ... and one not seen this long after it was to come into view (a turn the planner did not foresee)
  var CLOUD_T = 3;             // s: ... and one all of whose birds on the window have been behind cloud (cover over a half) this long
  var CLOUD_HID = 0.2;         // a path whose birds would be behind cloud (or the land) at more than this share of its probes is not flown
  var ENTER_BY = [4.5, 8];     // s after it sets off: the first flight's birds in view by this, the next's (else that path is not flown)
  var SEEN_MIN = [4, 8];       // s: and in view at least this long (a turn that would sweep it straight out: not this path)
  var NEARMOST = 0.6;          // of the bird's span: the land in front of a bird hides it past this far in front of its body
  var CLOUD_IN = 14;           // m of a cloud's visible lobes between the camera and a bird: its cover over the bird counted fully
  var NEAR_FADE = [4.4, 5.2];  // nearness: a bird nearer than any bird ever sits (a perched gull, 4.2 spans' size, about 3.5) fades between these; every bird alike (it was 1.9-2.6, the planner's: a gull let go from a perch or a click was born there, unseen)
  var MAXP = 64;               // (birds3d) birds lent to flights: a ring of 64 (the calm binds, not a count) ...
  var DRAW_MAX = 48;           // ... at most this many busy, and drawn, at once
  var QUOTA_STEP = 300;        // path points of planning a fixed step (1/60 s), a bird's place counted at its cost (SPOT_COST; round 2: 200, a place counted as 1)
  /* (physics) the owner's two open decisions (MODEL.md 0), as the lab left them: the rate (RATE_MODE 'scaled': the
     size-scaled physics rate of a bird of the world's span; 'real': the species' own), the flap-glide schedule
     (SCHED_MODE 'measured'; 'calm': the last round's glides on this beat; 'continuous': never gliding). Dev only:
     __world.birds({ rate, sched }), for the next flights */
  var RATE_MODE = 'class', SCHED_MODE = 'measured', WING_FROM = -30;   // (round 3, kinds: the owner's word 2026-11-04, the real order: labbird.js RATE_CLASS)
  var FX = { air: true, lit: true, glare: true, land: true, cloud: true };   // the effects (development: each can be turned off)

  /* (round 3) the calm on the window, the words and the course's errors */
  var CALM_K = 0.45;           // the camera's turn asked to sweep the land across the window at most this share of the live's median pace there (HOST.calm: 0.72 deg/s on a 1440 px desktop, 0.9 on a phone; tried at 0.65: the sweep, a steady 18 px/s as the autopilot turns at the cap, raced or stalled the birds on the window) ...
  var CALM_EV = 2;             // ... and its way round a cloud's body at most this many times that
  var FACE_SIN = 0.2, DOWN_ON = true, DOWN_LAT = 1, DOWN_NMIN = 0.6;   // (round 3, alive) a body yawed under 12 deg off the view's axis has no side; a downwind crossing at least DOWN_LAT m/s past the yaw's need, no farther than DOWN_NMIN
  var BACK_PX = 6;             // px/s: through the trusted course no bird of a path moves against the way it faces on the window faster than this ...
  var PACE_SEEN = 1.2;         // ... nor faster across the window than the live's fastest crossing (topSpeed: 40 px/s at 1440, 26 on a phone) with the calm's sweep stretched this much (a window's edge) for more than PACE_T of it, nor ever 1.18 times that (round 3: 1.6 let the pace reach 57-60 px/s at the 98th percentile at 1440, the judges' bound 55; 1.4 tried: fewer paths refused through ABOVE's turns round a cloud's body (the view sweeping 25 px/s), at the bound's expense) ...
  var PACE_T = 1.2;            // s (and nor slower on the window than SLOW_SEEN px/s, hanging there, for more than this)
  var SLOW_SEEN = 9;           // px/s (the live's slowest 2 %: 10-11)
  var WTURN1 = 25;             // (shape) deg/s: ... nor over about a second (three of the course's samples, its own motion through one view: the judges' bar on 1 s chords)
  var WTURN = 30;              // ... nor does its way on the window turn faster than this (deg/s, over the course's 0.3 s samples; the live's own path: TURN_MAX 22)
  var CALM_SKIP = Infinity;    // (the course turning faster than this many times the calm's rate: the world's own hard turn, the calm on the window not judged there. Tried at 2.2: the planner flew paths through a cloud's way round and its birds raced across the window at up to 68 px/s (p98, DUNES s5 1440); off, a path through such a turn is not flown)
  var BAND_T = 3;              // s: two flights sharing a band longer than this of the trusted course: not this path (round 2: a moment of it)
  var ERR90 = [0, 0, 1, 0.1, 2, 0.4, 4, 1.6, 6, 3.5, 8, 5, 10, 6.5, 12, 9, 15, 13, 20, 20, 30, 30];   // (h s, deg) pairs: the course's yaw error at that horizon, its 90th percentile, a prior (predtest3, the calm on: DUNES s5 and ABOVE s7, their mean), learnt as the visit goes (errLearn)
  var GUARD_T = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6];   // s ahead: each flight checked through the camera's near course ...
  var GUARD_EVERY = 12;        // ... every this many steps (0.2 s), each flight on a step of its own
  var GBACK = 0.6;             // a flight whose birds would slide backward on the window this share of the next 2 s ...
  var WHEEL = 15;              // deg/s: ... wheels round toward the view's turn at this rate in the air ...
  var WHEEL_GAP = 10;          // s: ... at most once in this long
  var ACC_T = 2;               // s: a flight hanging or racing on the window changes its pace over this long ...
  var ACC_GAP = 3;             // s: ... at most once in this long
  var TRIAL_SLICE = 200;       // path points: a trial's work a step at most, a bird's place counted at its cost (50 places; round 2: up to the step's whole quota)
  var SPOT_COST = 3;           // a bird's place (spot: its slot, drift, wander, gusts, wings) costs about this many path points
  var FORCED = false;          // forced colours: the birds alone, in CanvasText at full ink, in their own still view (the world is not drawn)

