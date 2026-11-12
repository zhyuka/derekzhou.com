  /* ---------------------------------------------------------------- the visit's weather (the one draw of entropy) */
  var SEED0, HS = window.HOURSEED, ent;   // (the visit's one entropy read: hour.js's, on the world's page (its plan's worker started with it), else here)
  if (HS && HS.seed === HS.seed >>> 0) SEED0 = HS.seed; else { ent = new Uint32Array(1); crypto.getRandomValues(ent); SEED0 = ent[0]; HS = null; }
  /* ---- INIT-END: no entropy below this line; no clock but clockNow() (budgets and the record, never content) ---- */

