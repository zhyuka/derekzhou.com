  /* ---------------- the wings ---------------- */

  /* a bird's day on the wing is the lab's (birdwing.js on labbird.js): its bouts of beats and its glides drawn
     from the measured schedules, its beat's period, its stroke and each bout's rate varying as measured, its rate its
     own. Its clock is the bird's own age: begun a second before the age it is made at (no history to replay), drawing
     from a stream of its own (seeded once from the bird's: when its wing is worked out changes no other draw) */
  function placeWing(kind, r, age) { var g = BW.make(sm32(Math.floor(r() * 4294967296) >>> 0), BW.LB.P.kinds[kind] ? kind : 'gull', { rate: RATE_MODE, sched: SCHED_MODE, from: age - 1 }); return { wing: g, f: g.f }; }
