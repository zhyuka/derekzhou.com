  /* ---------------------------------------------------------------- dev: the flight's trace */
  var DEVTRACE = false, TRACE = [], NOAUTO = false, POSE = null;   // (dev: the first visit begun at [x, z, heading deg, y])
  function devTrace(V) {
    if (SIM.steps % 6) return;
    TRACE.push([+SIM.t.toFixed(3), V.k, +CS.x.toFixed(2), +CS.y.toFixed(2), +CS.z.toFixed(2), +(CS.psi / DEG).toFixed(2), +((CS.yawV + CS.phi) / DEG).toFixed(2), +CS.c.toFixed(1), +CS.auto.toFixed(2), null, SIM.fixG, SIM.fixO, 0, +SIM.u.toFixed(2), +CS.sv.toFixed(3), V.speed, SIM.reseat || 0]);   // (in cloud, u, the slip's speed, the realm's speed, the arrivals placed: H1 on the course)
    if (DEVKEEP) { var c = devClearance(); if (c) { DEVWORST.n++; if (c.vert < DEVWORST.vert) DEVWORST.vert = c.vert; if (c.solid < DEVWORST.solid) DEVWORST.solid = c.solid; if (c.core < DEVWORST.core) DEVWORST.core = c.core; } }
    if (TRACE.length > 40000) TRACE.splice(0, 10000);
  }

