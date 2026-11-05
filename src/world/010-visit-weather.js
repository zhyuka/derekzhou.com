  /* ---------------------------------------------------------------- the visit's weather (the one draw of entropy) */
  var SEED0, ent = new Uint32Array(1); crypto.getRandomValues(ent); SEED0 = ent[0];
  /* ---- INIT-END: no entropy below this line; no clock but clockNow() (budgets and the record, never content) ---- */

