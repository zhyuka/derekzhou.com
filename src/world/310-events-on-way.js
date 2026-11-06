  /* ---------------------------------------------------------------- events on the way */
  /* creatures crossing ahead now and then (the realm's events: a flock across the way, a ray) */
  function events(V, t, u) {
    if (!V.def.event || !V.flocksEv) return;
    for (var i = V.flocksEv.length - 1; i >= 0; i--) if (u > V.flocksEv[i].end) V.flocksEv.splice(i, 1);
    if (u < V.evNext) return;
    var e = V.def.event(V, V.evRng, { x: CS.x, y: CS.y, z: CS.z, psi: CS.psi, u: u, ground: function (x, z) { return groundAt(V, x, z, false); } });
    V.evNext = u + (e && e.next ? e.next : 20);
    if (e && e.flock && !WORLD_FLYERS && (e.flock.kind === 'bird' || e.flock.kind === 'ray')) e = null;   // (life fix: WORLD_FLYERS)
    if (e && e.flock && V.flocksEv.length < 2) { e.flock.u0 = u; e.flock.at = [e.flock.x, e.flock.y, e.flock.z]; var f = flockOf(e.flock); f.end = u + (e.life || 30); V.flocksEv.push(f); }
  }

