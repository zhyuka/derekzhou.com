  /* ---------------------------------------------------------------- the destination (delight-visit 5) */
  /* One colossal form per land on the horizon ahead: on the landing's heading (airHeading0: the opening's own, SEED0's),
     DEST_D m out, so it stands in the first frame and the flight, held on its heading, meets it in about ten minutes
     (12 m/s). Where it stands is the seed's alone, never the flight's (no aim, no autopilot: the flight only holds its
     heading, and a drag takes it anywhere); the dunes kit raises it there (realm-dunes: dDest, on its own layout scale:
     16 km cells reaching 12 km, at most about 4 laid out, so the boot shows no later), over the cloud sea rising out
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
