  /* ---------------------------------------------------------------- the realms' kit, and the dev harness */
  /* (load-perf, 2026-11-25, the hub's ruling) exactly what src/realm-*.js call, and no more: no script outside this
     repository loads a realm, so the kit is no outside API; test/unit/kit.mjs pins the set against the realms' uses */
  var KITAPI = {
    box: KIT.box, prism: KIT.prism, lathe: KIT.lathe, rock: KIT.rock, cumulus: cumulus, range: range, lens: lens, wall: wall,
    lch: lch, norm: norm, cross: cross, sub: sub3, mul: mul, smooth: smooth, RNG: RNG,
    cellHash: cellHash, ihash: ihash, hfl: hfl, hk: hk
  };
  /* stamp: each realm file and the ink birds' stamp their own top (their registration stamps their end), so the
     record bounds every script's evaluation (recScripts); without a record it does nothing */
  window.WORLD = { realm: registerRealm, kit: KITAPI, air: AIRAPI, events: EVAPI, dest: destOf, birds: registerBirds, sky: skyFeed, stamp: function (name) { if (REC) REC.regs.push([String(name), +clockNow().toFixed(1)]); } };
