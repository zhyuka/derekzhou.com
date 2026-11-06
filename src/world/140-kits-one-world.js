  /* ---------------------------------------------------------------- the kits, and the one world (world6) */
  /* (world6, step A) There are no realms, no visits, no passages. The world is one continuous landscape over the plane:
     the maps (CW.M: heat, wetness, the land's height regime, the rock provinces, the basin channel, at the seed's own
     large scales) and the director (CW.D: anchors on the place channels, committed out of sight, aware of what has been
     seen) decide, at every position, the WEIGHTS of the two kits (wD: the sand province; wC: the sea of cloud that fills
     the low ground). The kits (realm-dunes.js, realm-above.js; they still register with WORLD.realm) give their GLSL,
     their pieces and their light; the world's own definition (worldDef) composes them by weight, with smooth functions
     only: the land is the dunes kit's (its dunes' height by wD), sunk by the cloud weight, and the cloud sea's surface
     rises out of the low ground with it; their pieces are scattered by density; the light is their lights blended by
     the cloud weight smoothed about the camera. The weights are baked on the CPU, from the maps, into a grid about the
     camera (KW: 64 m texels, toroidal, the GPU reading it through a cubic B-spline: C2), each texel once and never
     again (every anchor that reaches it is committed long before). Nothing in the drawing switches on a place. */
  var KITS = {}, REALMS = {}, ORDER = [];
  function registerRealm(def) {
    if (REC) REC.regs.push(['kit ' + (def && def.id), +clockNow().toFixed(1)]);   // (E0: each kit file's evaluation ends with its registration)
    if (!def || !def.id || KITS[def.id]) return; KITS[def.id] = def;
    if (KITS.dunes && KITS.above && !REALMS.world) { REALMS.world = worldDef(KITS.dunes, KITS.above); ORDER.push('world'); }
    if (REALMS.world && !STILLMODE) bootSoon();   // (fast500 4a: the boot starts a frame after the realms have registered; the ink birds load last, at low priority, and may come before the boot, during it, after the world shows or never: birdsLate. The harness's stills wait for every script, as before)
  }

