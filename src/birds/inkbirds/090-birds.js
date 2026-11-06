  /* ---------------- the birds (a ring of MAXP, lent to flights) ---------------- */

  /* a slot holds a bird's drawing between the hand's frames: its 3D chain about its body (m, in the world's axes), its
     bob, the boil's offsets (device px), its pen (device px), its ink and how much cloud stands before it */
  var slots = [];
  (function () { for (var i = 0; i < MAXP; i++) slots.push({ key: 9100 + i * 97, busy: false, on: false, face: 1, sgn: 1, d: null, shownT: -1, vis: false, still: false, op: 1, wf: 0, land: 1, n: 1, ok: false, lastOp: 0, lastApp: 0,
    kind: 'gull', P16: new Float64Array(48), X16: new Float64Array(48), D: new Float32Array(32), body: new Float64Array(3), nb: new Float64Array(3), fw: new Float64Array(3), lw3: new Float64Array(3), vw: new Float64Array(3), aw: new Float64Array(3),
    roll: 0, rollT: 0, rollOk: false, pitch: 0, slip: 0, E: new Float64Array(3), eOk: false, fold: new Float64Array(6), cw: new Float64Array(3), cwH: new Float64Array(3), cwHt: new Float64Array(3).fill(-1e9), cwNow: new Float64Array(3), cwNext: -1, cwAt: -1e9, spanPx: 0, floorPx: 1, filt: 1, halo: 0, haloE: 3, legib: 0 }); })();
  function freeSlots() { var n = 0, b = 0, i; for (i = 0; i < slots.length; i++) if (!slots[i].busy) n++; else b++; return Math.max(0, Math.min(n, DRAW_MAX - b)); }
  function dress(s, d) { s.d = d; s.on = false; s.vis = false; s.still = false; s.shownT = -1; s.ok = false; s.rollOk = false; s.eOk = false; s.cwNext = -1; s.cwAt = -1e9; s.cwHt.fill(-1e9); s.spanPx = 0; s.glideW = undefined; s.setOk = false; s.setFace = 0; s.setSide = 0; s.set = 0; s.setWant = 0; s.setAt = undefined; s.setK = undefined; s.nudX = 0; s.nudY = 0; s.lastOp = 0; s.tone = 0; }
  function hide(s) { s.on = false; }

