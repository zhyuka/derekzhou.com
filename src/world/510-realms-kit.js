  /* ---------------------------------------------------------------- the realms' kit, and the dev harness */
  var KITAPI = {
    Builder: Builder, box: KIT.box, prism: KIT.prism, lathe: KIT.lathe, rock: KIT.rock, cumulus: cumulus, bank: bank, range: range, lens: lens, wall: wall, mound: mound,
    lch: lch, lab: lab, hex: hex, lum: lum, dirAzEl: dirAzEl, norm: norm, cross: cross, add: add, sub: sub3, mul: mul, dot: dot, clamp: clamp, smooth: smooth, lerp: lerp, RNG: RNG,
    cellHash: cellHash, ihash: ihash, hfl: hfl, hk: hk, angDiff: angDiff, glowBake: glowBake
  };
  /* stamp: each realm file and the ink birds' stamp their own top (their registration stamps their end), so the
     record bounds every script's evaluation (recScripts); without a record it does nothing */
  window.WORLD = { realm: registerRealm, kit: KITAPI, air: AIRAPI, events: EVAPI, birds: registerBirds, sky: skyFeed, stamp: function (name) { if (REC) REC.regs.push([String(name), +clockNow().toFixed(1)]); } };
