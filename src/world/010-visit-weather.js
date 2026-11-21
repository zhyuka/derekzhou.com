  /* ------------------------------ the visit's weather (hour.js's one draw of entropy, data-seed: the full 32-bit read) */
  /* the read picks the opening, k = read % OPENN (hour.js picks the same k for the still), whose seed SEED0 is the
     world's for all that is on screen at the cut (the land, the opening sky, the light): the bake's own. Everything after
     the cut is the read's own (SEEDR): afterCut() draws the sky order after the skies on screen, the events, the ink
     birds' later flocks and the score from it, so a visit runs on as its own, not as one of the openings */
  var OPENN = 16, SEEDR = attr('data-seed') === null ? 0 : parseInt(attr('data-seed'), 10) >>> 0;   // (without the hour's script: opening 0)
  var SEED0 = (11 + (SEEDR % OPENN) * 0x9e3779b9) >>> 0, AFTER = false;
  /* the look's tier (the hub, 2026-11-15: one tier for every look decision, the still's): hour.js's data-look, 'desk'
     where its still was baked as a desktop (a hi still of a landscape or square shape: bake-stills.js win()). A touch
     device never draws that look (the clouds' crisp edge, finer bakes), so hour.js shows it the lo still there. Every
     look decision reads LOOKD, never memTier: what a device draws live is what its still holds (test/unit/still-pick.mjs).
     Without the hour's script: the touch look */
  var LOOKD = attr('data-look') === 'desk';
  /* ---- INIT-END: no entropy below this line; no clock but clockNow() (budgets and the record, never content) ---- */

