  /* ---------------------------------------------------------------- the visit's weather (the one draw of entropy) */
  var SEED0, ent = new Uint32Array(1); crypto.getRandomValues(ent); SEED0 = ent[0];
  /* (landing) the edge's opening: functions/index.js marks <html> data-land with the seed of the picture it put under the
     canvas (tools/landing/), so the world lands on that view exactly and its first frame replaces the picture unseen */
  (function () { var l = document.documentElement.getAttribute('data-land'); if (l && /^[0-9]{1,10}$/.test(l)) SEED0 = (+l) >>> 0; })();
  /* ---- INIT-END: no entropy below this line; no clock but clockNow() (budgets and the record, never content) ---- */

