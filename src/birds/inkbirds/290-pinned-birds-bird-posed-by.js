  /* ---------------- (dev) pinned birds: a bird posed by hand in front of the camera, drawn by the same pass in the
     world's light (the turntable, the beat sheet): never in production (only through the dev hooks) ---------------- */
  var PINS = [], PIN_SLOTS = [];
  function pinSlot(i) {
    while (PIN_SLOTS.length <= i) PIN_SLOTS.push({ key: 777 + PIN_SLOTS.length, busy: true, on: true, d: null, kind: 'gull', P16: new Float64Array(48), X16: new Float64Array(48), D: new Float32Array(32), body: new Float64Array(3), nb: new Float64Array(3), fw: new Float64Array(3), lw3: new Float64Array(3), vw: new Float64Array(3), aw: new Float64Array(3),
      roll: 0, E: new Float64Array(3), eOk: false, fold: new Float64Array(6), hold: 1, cw: new Float64Array(3), cwH: new Float64Array(3), cwHt: new Float64Array(3).fill(-1e9), cwNow: new Float64Array(3), cwNext: -1, cwAt: -1e9, spanPx: 0, floorPx: 1, filt: 1, halo: 0, haloE: 3, legib: 0 });
    return PIN_SLOTS[i];
  }
  var PINW = { kind: 'gull', trim: ZTRIM }, PINS0 = { flap: 1, ph: 0, k: 1, D: 0.5, a: 0, e: 0 };
  /* a pin: { kind, x, y (CSS px: where its body is on the window), dist (m), yaw (deg: 0 flying straight away from the
     camera, + turned to its right), pitch (deg, + nose up), roll (deg, + right wing down), pose: 'glide' | 'flap' | 'shut',
     ph (the beat's phase), glide (its arm's set), span (m; default the kind's B_SPAN x size x MODEL_K), op } */
  function pinBird(Pn, s, C, dt, L) {
    var kind = FP.kinds[Pn.kind] && KMD[Pn.kind] ? Pn.kind : 'gull', i;
    s.kind = kind;
    if (!s.X46) slotArrays(s);
    var k = VW.outW / Math.max(1, W), nx = (2 * Pn.x / W - 1) * VW.tanX, ny = (1 - 2 * Pn.y / H) * VW.tanY;
    var dx = C.f[0] + C.r[0] * nx + C.u[0] * ny, dy = C.f[1] + C.r[1] * nx + C.u[1] * ny, dz = C.f[2] + C.r[2] * nx + C.u[2] * ny, dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
    var bx = dx / dl * Pn.dist, by = dy / dl * Pn.dist, bz = dz / dl * Pn.dist;
    /* its attitude in the camera's frame: forward from the camera's forward, yawed about the camera's up, pitched, rolled */
    var yw = (Pn.yaw || 0) * DEG, pt = (Pn.pitch || 0) * DEG, rl = (Pn.roll || 0) * DEG;
    var f0 = [C.f[0] * Math.cos(yw) + C.r[0] * Math.sin(yw), C.f[1] * Math.cos(yw) + C.r[1] * Math.sin(yw), C.f[2] * Math.cos(yw) + C.r[2] * Math.sin(yw)];
    var l0 = [-(C.r[0] * Math.cos(yw) - C.f[0] * Math.sin(yw)), -(C.r[1] * Math.cos(yw) - C.f[1] * Math.sin(yw)), -(C.r[2] * Math.cos(yw) - C.f[2] * Math.sin(yw))];   // (its left: the camera's left turned with it)
    var u0 = [f0[1] * l0[2] - f0[2] * l0[1], f0[2] * l0[0] - f0[0] * l0[2], f0[0] * l0[1] - f0[1] * l0[0]];
    var fx = f0[0] * Math.cos(pt) + u0[0] * Math.sin(pt), fy = f0[1] * Math.cos(pt) + u0[1] * Math.sin(pt), fz = f0[2] * Math.cos(pt) + u0[2] * Math.sin(pt);
    var ux = u0[0] * Math.cos(pt) - f0[0] * Math.sin(pt), uy = u0[1] * Math.cos(pt) - f0[1] * Math.sin(pt), uz = u0[2] * Math.cos(pt) - f0[2] * Math.sin(pt);
    var cr = Math.cos(rl), sr = Math.sin(rl);
    var lx = l0[0] * cr + ux * sr, ly = l0[1] * cr + uy * sr, lz = l0[2] * cr + uz * sr, zx = ux * cr - l0[0] * sr, zy = uy * cr - l0[1] * sr, zz = uz * cr - l0[2] * sr;
    /* (physics) the lab's poses: 'glide' (its load), 'flap' (the cycle at ph, blended by w, the stroke k), 'shut', or
       Pn.p22 (22 floats, as given) */
    PINW.kind = kind; PINS0.ph = Pn.ph || 0; PINS0.k = Pn.k === undefined ? 1 : Pn.k; PINS0.D = KMD[kind].D; PINS0.a = PINS0.e = Pn.pose === 'flap' ? (Pn.w === undefined ? 1 : Pn.w) : 0;
    if (Pn.p22) { for (i = 0; i < 22; i++) s.P22[i] = Pn.p22[i]; s.B3[0] = s.B3[1] = s.B3[2] = 0; if (Pn.b3) { s.B3[0] = Pn.b3[0]; s.B3[1] = Pn.b3[1]; s.B3[2] = Pn.b3[2]; } }
    else { WO.swing = 1; WO.shut = Pn.pose === 'shut' ? shut22(kind) : null; BW.poseS(PINW, PINS0, 0, s.P22, s.B3, WO); WO.shut = null; }
    if (Pn.set && Pn.pose !== 'shut') { s.P22[0] += Pn.set; s.P22[NP] -= Pn.set; }   // (fix round: the tattoo's set, + the left arm up)
    LB.geom(kind, s.P22, s.B3, s.V46, 'this');
    var sp = Pn.span || B_SPAN * (SORTS[kind] ? SORTS[kind].size : 1) * MODEL_K;
    var ox = bx, oy = by, oz = bz;
    for (i = 0; i < NV; i++) {
      var x = s.V46[3 * i] * sp, y = s.V46[3 * i + 1] * sp, z = s.V46[3 * i + 2] * sp;
      s.X46[3 * i] = ox + x * fx + y * lx + z * zx; s.X46[3 * i + 1] = oy + x * fy + y * ly + z * zy; s.X46[3 * i + 2] = oz + x * fz + y * lz + z * zz;
    }
    for (i = 0; i < 16; i++) { var vi = P16MAP[i]; if (vi < 0) { s.X16[3 * i] = ox; s.X16[3 * i + 1] = oy; s.X16[3 * i + 2] = oz; } else { s.X16[3 * i] = s.X46[3 * vi]; s.X16[3 * i + 1] = s.X46[3 * vi + 1]; s.X16[3 * i + 2] = s.X46[3 * vi + 2]; } }
    s.body[0] = ox; s.body[1] = oy; s.body[2] = oz; s.nb[0] = zx; s.nb[1] = zy; s.nb[2] = zz;
    s.fw[0] = fx; s.fw[1] = fy; s.fw[2] = fz; s.lw3[0] = lx; s.lw3[1] = ly; s.lw3[2] = lz; s.roll = Pn.roll || 0; s.pitch = Pn.pitch || 0;
    s.d = { span: sp / MODEL_K / MPU, model: sp / MPU };
    if (!projectBird(s, C)) return false;
    lightBird(s, L, true, dt);
    s.hold = 1; s.birdL = gradedL(s.E, HOST.grade(), 1); s.groundL = -1;
    cloudWeights(s, C, 0, true);
    return true;
  }
  function drawPins(C, dt, L, N, nB) {
    for (var i = 0; i < PINS.length && nB < MAXP; i++) {
      var Pn = PINS[i], s = pinSlot(i);
      if (!pinBird(Pn, s, C, dt, L)) continue;
      if (Pn.lod !== undefined) s.lod = Pn.lod;
      packBird(nB, s, Pn.op === undefined ? 1 : Pn.op, 0.6 * s.d.model * MPU + 2, !Pn.noocc, Pn.N !== undefined ? Pn.N : N, s.haloE, 1, -1, 1, Pn.floor !== undefined ? Pn.floor : s.floorPx);
      if (DUMP) DUMP.push(dumpBird({ id: 'pin' + i, kind: 'pin', m: [] }, {}, s, 0, 1));
      nB++;
    }
    return nB;
  }

  /* (physics, dev) a bird's wing now: [e, a, psi, flap, its rate] */
  function wingDev(m, tau) { if (!m.w || !m.w.wing) return null; var S = BW.state(m.w.wing, tau, BSt); return [+S.e.toFixed(4), +S.a.toFixed(4), +S.psi.toFixed(4), S.flap, +m.w.wing.f.toFixed(4)]; }

