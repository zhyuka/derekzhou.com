  /* ---------------- the wings ---------------- */

  /* (physics) a bird's day on the wing is the lab's (birdwing.js on labbird.js): its bouts of beats and its glides drawn
     from the measured schedules, its beat's period, its stroke and each bout's rate varying as measured, its rate its
     own. Its clock is the bird's own age */
  function placeWing(kind, r) { var g = BW.make(r, BW.LB.P.kinds[kind] ? kind : 'gull', { rate: RATE_MODE, sched: SCHED_MODE, from: WING_FROM }); return { wing: g, f: g.f, bound: false }; }
