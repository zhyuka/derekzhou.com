  /* ---------------------------------------------------------------- the destination (delight-visit 5) */
  /* One colossal form per land on the horizon ahead: on the landing's heading (airHeading0: the opening's own, SEED0's),
     DEST_D m out, so it stands in the first frame and the flight, held on its heading, meets it in about ten minutes
     (12 m/s). Where it stands is the seed's alone, never the flight's (no aim, no autopilot: the flight only holds its
     heading, and a drag takes it anywhere); the dunes kit raises it there (realm-dunes: dDest, on its own layout scale:
     16 km cells reaching 12 km, only the one cell that holds it made: 236, one), over the cloud sea rising out
     of it. DEST_D keeps its foot on the land drawn (the land's outermost ring ends
     8.2 km out at the nearest). FLIGHT's ruler reads destOf(): { x, z, d, bearing }. Its kind (destKind, agreed with
     CLOUDS): 'isle' where the cloud sea holds the point (the maps' wC over 0.5, read once: the boot's commit reaches
     it), the above kit's great isle once that kit has a dest hook; 'rock' (the dunes kit's) everywhere else */
  var DEST_D = [7000, 8000], DEST = null;
  function destOf() {
    if (DEST && DEST.seed === J.seed) return DEST;
    var a = airHeading0(), d = RNG(subseed(J.seed, 91)).r(DEST_D[0], DEST_D[1]);
    return (DEST = { x: Math.sin(a) * d, z: Math.cos(a) * d, d: d, bearing: a, seed: J.seed });
  }
  function destKind(D) { if (!D.kind) D.kind = kitAt(D.x, D.z).wC > 0.5 ? 'isle' : 'rock'; return D; }
  /* the first landmark (the hub's bar: a first near pass by 90 s on every land, the words clear and half the low sun's
     glow kept; tools/visit/first-landmark.mjs): on the five lands whose heading passes nothing near by 90 s (k0, k1, k2,
     k11, k13: #528), one landmark FIRST_D m down the landing's line and FIRST_S m to its side, so it bears 26.6 deg in
     the first frame (the phone's words end at 18.5, the laptop's at 11.4) and is passed 145 m off at 24 s. Its side the
     one away from the visit's key sun (V.light.sunAz: the dawn's and the sunset's sun alike), so the low sun's glow
     stays in frame. 'isle' over the cloud sea (the above kit), 'rock' on the dunes and the coast (the dunes kit).
     The seed's and the visit's light alone, never the flight's */
  var FIRST = { 0: 'isle', 1: 'rock', 2: 'rock', 11: 'isle', 13: 'rock' }, FIRST_D = 290, FIRST_S = 145, FIRSTP = null;
  function firstOf(V) {
    if (FIRSTP && FIRSTP.seed === J.seed) return FIRSTP.kind ? FIRSTP : null;
    var k = -1, i; for (i = 0; i < 16; i++) if (((11 + i * 0x9e3779b9) >>> 0) === J.seed) k = i;
    if (!FIRST[k] || !V || !V.light) { FIRSTP = { seed: J.seed, kind: null }; return null; }
    var a = airHeading0(), side0 = Math.sin(V.light.sunAz * DEG - a) > 0 ? -1 : 1, isle = FIRST[k] === 'isle', c, o = { x: 0, z: 0 };   // (the sun on the right: the landmark on the left)
    /* kept by construction: the kit keeps a piece where its own draw falls under its density (kitApi: pickOf against
       densA or densD, the maps' cloud weight), so the first of these points it keeps: the side away from the sun first,
       290 m out then 30-60 m either way, then nearer the line, then the other side (k11's first point fell where the
       cloud sea thins and the above kit's draw left it out) */
    var CAND = [[0, 0], [30, 0], [-30, 0], [60, 0], [0, -20], [30, -20], [-30, -20]];
    for (c = 0; c < CAND.length * 2; c++) {
      var sd = c < CAND.length ? side0 : -side0, q = CAND[c % CAND.length], d = FIRST_D + q[0], s2 = (FIRST_S + q[1]) * sd;
      o.x = Math.sin(a) * d + Math.cos(a) * s2; o.z = Math.cos(a) * d - Math.sin(a) * s2;
      if (pickOf(o, isle ? 0x5bd1e995 : 0x27d4eb2d, 0, 0) < (isle ? densA(o.x, o.z) : densD(o.x, o.z))) break;
    }
    FIRSTP = c < CAND.length * 2 ? { seed: J.seed, kind: FIRST[k], x: o.x, z: o.z, side: sd, s: subseed(J.seed, 93) >>> 0 } : { seed: J.seed, kind: null };
    return FIRSTP.kind ? FIRSTP : null;
  }
