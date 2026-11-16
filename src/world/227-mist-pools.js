  /* ---------------------------------------------------------------- the mist pools (delight-weather 1) */
  /* Mist lies in the dunes' troughs and about the mesas' feet: a pool whose top is the ground the dunes stand on (the
     swell less the sink toward the cloud sea: their troughs' floor) plus a depth by the sky, over the sand alone (the
     sand weight), so at first light the crests stand out of it as islands. The depth is the weather's one model, AIR's
     (airWx(t).mist, 215-air.js: each sky's depth from AIR_MIST, thinned by the visit's surface wind, moved toward the
     next sky's at AIR_MIST_RATE): the level moves, so the rim is a moving shoreline, never a fade; nothing thickens
     in place (the pool's top is opaque within MIST_OPAQUE of depth, the same at every depth: FS_TERRAIN). A pure function
     of the sky's time (no state: a still at any moment is the flight's own). The camera's ground never reads the pools
     (it is the same under every sky: the recorded ground, the flight's grid, the birds'); the flight keeps over them by
     its own floor, the land and the pools' depth and 1 m (270-flight.js: the pools' top stands at most their depth over
     the land, which never lies under its own floor).
     Measured by tools/physics/mist-sim.mjs on the 16 openings' land (docs/world.md, ## THE MIST POOLS) */
  var MIST_OPAQUE = 1.5;   // (m)
  var MISTU = new Float32Array(4);
  function mistStep(L) { L.mist = SKY.seq.length > 1 ? airWx(SIM.t).mist : 0; }   // (AIR's level at the flight's clock: it adds the sky's offset itself)
  function mistU(u, L) { MISTU[0] = L.mist || 0; MISTU[1] = MIST_OPAQUE; gl.uniform4fv(u.uMist, MISTU); }
