  /* ---------------- the paper: every bird a 3D cut-paper body, posed by its own flight (birds3d) ---------------- */

  /* The tattoo's mark, made a bird in 3D (the owner: "why are none of these 3d still?"; option 5, "Birds of light", no
     gold heads). Each bird is the form facet's model (birdform.js, posed by birdpose.js): a body and two wings hinged at
     the shoulder and the wrist, beating at its kind's real rate (SORTS hz, the visit's tempo, its own detune), gliding
     at its kind's glide (the tattoo's M seen from below and behind), its wings shut on a finch's bound. Its attitude is
     physical: the body along its velocity in the world (its own way in its frame and the camera's, no sideslip), rolled
     by the coordinated bank its own acceleration asks (tan phi = a_lat / (g + a_up): a wheel banks 8-20 deg, which is
     the tattoo's lean), pitched by its climb and its angle of attack. Nothing is pressed, mirrored or leaned on the
     window: its facing, its foreshortening, which wing is near, its turn to the camera all come from the projection.
     Every frame each drawn bird's 16 paper points are posed, placed and projected through the frame's camera to device
     px; the world's light lights its six panels (the sun wrapped about the paper, a share of it through the paper from
     behind, the sky's and the lit cloud sea's light from below), one tone a bird with a whisper of the fold, eased. Then one
     instanced draw after the composite, at the canvas's resolution: each bird a quad whose fragments take the exact
     coverage of its 11 paper triangles and a pen floor along its leading edge's M (a wing seen edge-on is still the
     tattoo's line), hidden by the land and the clouds in front of it, kept off the words, and at night a light of its
     own and a soft halo (added light only). LEAN_TRIM (dev, 0: physics) holds a bank away from the camera while gliding:
     the owner's A/B. */
  /* (physics) the form and the wing: the lab's (LB: the faceted M through the skeleton rig, its flexing primaries), made
     lazy for the world (BW); FP the form's pose, FP2 its facets as the flexing primaries part them */
  var LB = LABBIRD(window.FACETFORM, window.FACETPOSE, window.WINGMODEL, window.WINGMODEL_DATA), BW = BIRDWING(LB, window.WINGMODEL_DATA), FP = LB.P, FP2 = LB.flexPose(), NP = FP.NP, KMD = window.WINGMODEL_DATA.kinds;
  var BANK_MAX = 35, ROLL_TAU = 0.25, ROLL_RATE = 45;   // (birdform.js's bank, unchanged: the coordinated bank's bound and its easing)
  var NV = 46, NFAC = 30, P16MAP = window.FACETFORM.kinds.gull.p16, CHAIN = window.FACETFORM.kinds.gull.chain;   // (every kind's: the 16 points' vertices, -1 the body point; the leading edge's M)
  function rollStep(roll, target, dt) {
    var want = roll + (target - roll) * (1 - Math.exp(-dt / ROLL_TAU)), lim = ROLL_RATE * dt, d = want - roll;
    return roll + (d < -lim ? -lim : d > lim ? lim : d);
  }
  /* a bounding finch's wings shut (birdform's shut, on the faceted rig: its tips at their glide) */
  var SHUT = {};
  function shut22(kind) {
    if (SHUT[kind]) return SHUT[kind];
    var p = FP.pose(), q = [6, -60, 0, 0.45, -4, -105, 0], tg = FP.kinds[kind].tipg;
    for (var sd = 0; sd < 2; sd++) { for (var i = 0; i < 7; i++) p[sd * NP + i] = q[i]; for (i = 0; i < 4; i++) p[sd * NP + 7 + i] = tg[i]; }
    return (SHUT[kind] = p);
  }
  /* the glide with its load (the lab's, no trims): for the planner's lean and the boxes */
  var ZTRIM = [0, 0, 0, 0, 0, 0, 1, 1, 1], GS0 = { flap: 0, ph: 0, k: 1, D: 0.5, a: 0, e: 0 }, GLW = { kind: 'gull', trim: ZTRIM }, GB3 = new Float64Array(3);
  function glide22(kind, out) { GLW.kind = kind; GLW.trim = ZTRIM; BW.poseS(GLW, GS0, 0, out, GB3); return out; }
  /* the 16 points of a 22-pose (spans, body frame): the flexing form's vertices by the old points' meanings */
  var V46T = new Float64Array(3 * NV);
  function pts16(kind, pose, body, out) {
    LB.geom(kind, pose, body, V46T, 'this');
    for (var q = 0; q < 16; q++) { var vi = P16MAP[q]; if (vi < 0) { out[3 * q] = body ? body[0] : 0; out[3 * q + 1] = 0; out[3 * q + 2] = body ? body[2] : 0; } else { out[3 * q] = V46T[3 * vi]; out[3 * q + 1] = V46T[3 * vi + 1]; out[3 * q + 2] = V46T[3 * vi + 2]; } }
    return out;
  }
  function slotArrays(s) {
    s.P22 = FP.pose(); s.B3 = new Float64Array(3); s.V46 = new Float64Array(3 * NV); s.X46 = new Float64Array(3 * NV); s.D46 = new Float32Array(2 * NV); s.IZ = new Float32Array(NV);
    s.NZ = new Float64Array(3 * NFAC); s.FE = new Float64Array(3 * NFAC); s.FA = new Float64Array(NFAC); s.VZ = new Float64Array(3 * NV); s.LS = { flap: 0, ph: 0, k: 1, D: 0, a: 0, e: 0, beat: -1, pause: 0, tuck: 0, psi: 0, lock: 0 }; s.lod = 0;
  }
  var MODEL_K = 1.19;          // (way-form: 1.38 for the bodied form; the wing-only form spans more of its model on the window) the drawn model's span on today's ink span (the glide seen from below and behind looks 0.64-0.75 of its span): paths and MPU unchanged
  var WING_ONLY = true;        // (way-path) the bird is the tattoo's M and nothing else: two wings joined at the body point (no head, neck, bill, legs, tail or body)
  var BODY_R = 0;              // (way-form) no body: the bird is the tattoo's M made solid, two wings meeting at the body point (the fix round's tapered body, 0.038 of the span, and its neck, bill and legs are gone)
  var FLOOR_K = 0.08;          // (way-form: unused but in the planner's pad) the pen floor is now today's pen itself: LINE's width for the bird's ink span (1.3 + 0.035 span, 1.5-2.5 CSS px, in quarter px), so the wing's stroke is the tattoo's stroke at every size
  var HOLD_POSE = [3, 8];      // device px of span: smaller, the beat's swing eases into the held glide (a speck holds its glide). (physics: the measured beat in full from 8 px; the shape round held it in from 16, and a 1440 px desktop's birds, 10-25 px, beat partly held 68 % of their time, a tenth of it at under 0.65 of the measured stroke: the stiffness the owner saw)
  var LEAN_TRIM = 0;           // deg: 0 the physics; 16 a held bank away from the camera while gliding (the B film; sideslip disclosed)
  var HALO_IN_BOX = true;      // at night the halo counts in the bird's box
  var PAPER = [0.94, 0.911, 0.853];   // the paper's albedo, linear (OKLab L 0.97, chroma 0.010, hue 85: a warm white)
  var WRAP = 0.45, TRANS = 0.3, BOUNCE = 0.45, FOLD = 0.06, PAPER_GAIN = 1.08;   // (PAPER_GAIN: calibrated on the realms' day films, A16: white on blue +0.10 OKLab L in 80 % and more)   // the sun wrapped about the paper; through it from behind; the cloud sea's light under it; the fold's whisper
  var TONE_T = 0.4;            // s: the bird's one tone eased (never a blink)
  var GLOW_L = 0.78, GLOW_ENC = 0.72, HALO_A = 0.14, HALO_E = [3, 2];   // night: the paper's own light (OKLab L; as encoded), the halo's strength and e-folding (CSS px: a desktop, a phone)
  var AOA = [1.5, 1];          // deg: the body's angle to its way through the air gliding, flapping (fix: the body all but along its way, the wing's own incidence carrying the rest)
  var CW_DT = 0.25, CW_HOLD = 0.3;   // s: the cloud's weights before a bird, worked out this often (a share of the birds a frame), each held at its most this long
  var FILTER = [1, 1.5];       // device px: the edge's filter for a bird of 24 px and more, and for a speck of 4 and less
  var PAPER_ON = true;         // (dev) false: the ink pass as before (not built: kept only as a switch name)
  /* (way-path) THE PATH AND THE VIEW: physics only (no set, no held bank), so the tattoo's lean must come from how a bird
     flies and how it is seen. A level wing-only bird shows the M on the tattoo's diagonal when its world heading is well
     off the camera's track (its near wing then stands higher on the window: perspective), seen from below; a bird
     turning away from the camera adds the coordinated bank of its turn (its far wing lower). With the camera flying
     12 m/s, the heading off its track is atan(the bird's own speed across / 12): so a lean crossing flies across at
     the calm's top pace and a little farther off (LEAN_N0), and the planner scores every path by the lean its readable
     birds would show (the judges' A3: the glide's five points against today's mean mark, rotation held, rms within
     today's own p95), under the same physics the drawer poses */
  var LEAN_H = 1;              // (shape, step 4d) the share of lean crossings whose height is chosen for the lean they can show (0: off; tried 0.5 and 1: 1 kept, desk A3 gliding 3.3 -> 6.8 %, phone 59 -> 64 %)
  var LEAN_AIR = true;         // (shape, the join; dev false: the planner's lean judged in still air, as way-path's)
  var LEAN_PLAN = true, LEAN_W = 160, LEAN_MODE = 0.8, LEAN_PSI = [24, 52], LEAN_N0 = 0.6, LEAN_PACE = 0.88, LEAN_TURN = 0.45, LEAN_TURN_A = [30, 55], LEAN_HD = [-3, 6];
  var P95K = { goose: 0.0688, ibis: 0.0723, gull: 0.0637, heron: 0.0754, crow: 0.0738, finch: 0.0744, swallow: 0.0704, stork: 0.0671 };   // (the judges' mark.py: today's own marks' lean-held rms, p95)
  var LQ = {}, LF = new Float64Array(10), LV = {};
  /* the physical lean of a bird at an air point (tmp: ax, ay, az, its heading hdg in the air, the path's climb), seen
     through the trial's view (projV): its glide posed along its world velocity (its own and the camera's) and rolled by
     the coordinated bank of its path's turn; the five points' rms against the mark, rotation held (NaN behind the eye) */
  function leanAir(F, m, A, hdg) {
    var kind = kindOf(F), lk = kind, Q = LQ[lk], P = F.path, i;
    if (!Q) Q = LQ[lk] = pts16(kind, glide22(kind, FP.pose()), null, new Float64Array(48)).slice();   // (physics: the lab's glide, its load: the flexing form's 16 points)
    var vo = F.v, ch = Math.cos(hdg), sh = Math.sin(hdg);   // (its pace along its path: where() moves it F.v a second)
    /* air: x right, y up, z out along the camera's way (units/s); the world's own axes are this mirrored (airToWorld) */
    var cs = (FL.speed || 0) / MPU, vx = vo * ch - cs * PV.sd, vy = (P.g || 0) * vo, vz = vo * sh + cs * PV.cd;   // (the camera's way as the trial's view predicts it: forward (-sin d, cos d) in this flight's air, d its turn since the job)
    if (WIND_ON && LEAN_AIR && !F.place) { vx -= WF[0]; vz -= WF[2]; }   // (shape, the join: its way through the air, the wind taken off, as poseBird lays the body: so the lean scored is the lean drawn)
    var inT = P.k && Math.abs(angDiff(hdg, P.h)) > 1e-4 && Math.abs(angDiff(hdg, P.h2)) > 1e-4, ak = inT ? vo * vo * P.k : 0;
    var ax = -sh * ak, az = ch * ak;
    /* to world-handed axes (x -> -x): then the drawer's attitude exactly (poseBird) */
    var wx = -vx, wy = vy, wz = vz, awx = -ax, awz = az, vl = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
    var fx = wx / vl, fy = wy / vl, fz = wz / vl, lx = fz, lz = -fx, ll = Math.sqrt(lx * lx + lz * lz) || 1; lx /= ll; lz /= ll;
    var ux = fy * lz, uy = fz * lx - fx * lz, uz = -fy * lx;
    var alat = (awx * lx + awz * lz) * MPU, aup = (awx * ux + awz * uz) * MPU;
    var roll = clamp(-Math.atan2(alat, 9.81 + aup) / DEG, -BANK_MAX, BANK_MAX) * DEG;
    var ca = Math.cos(AOA[0] * DEG), sa = Math.sin(AOA[0] * DEG);
    var bxx = fx * ca + ux * sa, bxy = fy * ca + uy * sa, bxz = fz * ca + uz * sa, bzx = ux * ca - fx * sa, bzy = uy * ca - fy * sa, bzz = uz * ca - fz * sa;
    var cr = Math.cos(roll), sr = Math.sin(roll), byx = lx * cr + bzx * sr, byy = bzy * sr, byz = lz * cr + bzz * sr, bzx2 = bzx * cr - lx * sr, bzy2 = bzy * cr, bzz2 = bzz * cr - lz * sr;
    var sp = m.d.model, face = bxx < 0 ? 1 : -1;   // (facing right on the window: its forward along the air's +x, the world's -x)
    for (var q = 0; q < 5; q++) {
      var j = FI[q], x, y, z;
      if (q === 2) { x = 0.5 * (Q[6] + Q[24]); y = 0.5 * (Q[7] + Q[25]); z = 0.5 * (Q[8] + Q[26]); } else { x = Q[3 * j]; y = Q[3 * j + 1]; z = Q[3 * j + 2]; }
      var ox = (x * bxx + y * byx + z * bzx2) * sp, oy = (x * bxy + y * byy + z * bzy2) * sp, oz = (x * bxz + y * byz + z * bzz2) * sp;
      projV(A.ax - ox, A.ay + oy, A.az + oz, LV);
      if (!(LV.n > 0)) return NaN;
      LF[2 * q] = face * LV.x; LF[2 * q + 1] = -LV.y;
    }
    if (LF[0] > LF[8]) for (q = 0; q < 2; q++) { var t0 = LF[2 * q], t1 = LF[2 * q + 1]; LF[2 * q] = LF[8 - 2 * q]; LF[2 * q + 1] = LF[9 - 2 * q]; LF[8 - 2 * q] = t0; LF[9 - 2 * q] = t1; }
    var x0 = 1e9, x1 = -1e9; for (q = 0; q < 5; q++) { x0 = Math.min(x0, LF[2 * q]); x1 = Math.max(x1, LF[2 * q]); }
    var wd = x1 - x0; if (!(wd > 1e-9)) return NaN;
    var M = markOf(kind), pmx = 0, pmy = 0, qmx = 0, qmy = 0, cx = LF[4], cy = LF[5];
    for (q = 0; q < 5; q++) { LF[2 * q] = (LF[2 * q] - cx) / wd; LF[2 * q + 1] = (LF[2 * q + 1] - cy) / wd; pmx += LF[2 * q] / 5; pmy += LF[2 * q + 1] / 5; qmx += M[2 * q] / 5; qmy += M[2 * q + 1] / 5; }
    var pq = 0, pp = 0, e = 0;
    for (q = 0; q < 5; q++) { var px = LF[2 * q] - pmx, py = LF[2 * q + 1] - pmy; pq += px * (M[2 * q] - qmx) + py * (M[2 * q + 1] - qmy); pp += px * px + py * py; }
    var k = Math.max(1e-9, pq / Math.max(pp, 1e-12));
    for (q = 0; q < 5; q++) { var dx = k * (LF[2 * q] - pmx) + qmx - M[2 * q], dy = k * (LF[2 * q + 1] - pmy) + qmy - M[2 * q + 1]; e += dx * dx + dy * dy; }
    return Math.sqrt(e / 5);
  }
  /* (shape, dev only) the join's unit test: for every travelling bird drawn now, leanAir's five points (normalised as the
     judges normalise the drawn ones: less the body point, over the x-extent) and its rms, through the course's view at
     this moment, with the wind taken off (air) and without (ground: the planner before the join) */
  function leanProbe() {
    var out = [], A2 = {}, W0 = WF[0], W2 = WF[2];
    flights.forEach(function (F) {
      if (F.place || F.soar || F.still || !F.path) return;
      var tau = t - F.t0;
      viewAtK(F, VP.still ? 0 : Math.round((t - VP.t0) / STEP));
      F.m.forEach(function (m, mi) {
        if (!m.s || !m.s.on) return;
        var r = { f: F.id, mi: mi };
        for (var pass = 0; pass < 2; pass++) {
          if (pass === 0 && WIND_ON) { windNow(); var wcy = F.cyw === undefined ? 1 : F.cyw, wsy = F.syw === undefined ? 0 : F.syw; WF[0] = (-wcy * WINDV[0] + wsy * WINDV[2]) / MPU; WF[2] = (wsy * WINDV[0] + wcy * WINDV[2]) / MPU; } else WF[0] = WF[2] = 0;
          spot(F, m, tau, A2); var lr = leanAir(F, m, A2, wp.h);
          r[pass ? 'g' : 'a'] = { lr: lr === lr ? +lr.toFixed(5) : null, LF: Array.from(LF.slice(0, 10)).map(function (v) { return +v.toFixed(5); }) };
        }
        out.push(r);
      });
    });
    WF[0] = W0; WF[2] = W2;
    return out;
  }
  var SIDE_GATE = 0.35, TATTOO_K = 0.8;   // (planner) a travelling path whose readable birds spend over this share of their time side-on is not flown; among paths within TATTOO_K of the roomiest, the higher tattoo share preferred

  /* a bird's kind in the model (the SORTS' names are the model's) */
  function kindOf(F) { return FP.kinds[F.sort] && KMD[F.sort] ? F.sort : 'gull'; }
  /* a bird's model measured: its half-extents on the window at nearness 1 (air units), the most over its glide, eight
     points of its beat, the shut pose, rolled +-35 deg, seen from eight headings and four elevations (-30, 0, 30, 60):
     the planner's and the tracker's boxes (d.hw, d.hh), larger than the ink mark's (the planform from below), so every
     margin they keep holds for the 3D bird. Per kind, per unit of span (cached), scaled by the bird's span */
  /* (physics) every vertex of the lab's poses: the glide with its load and its trims at their extremes (the arms'
     dihedral and the bank, three sines' SD-scaled sum at its peak either way), the beat at 24 phases at its largest
     stroke (k 1.12, the lab's amplitude clip) with the body's heave and surge, the shut wings (a bounding finch); rolled
     +-BANK_MAX deg (the trims' own bank inside), from eight headings and four elevations */
  var MEAS = {}, MQ = new Float64Array(3 * 46);
  /* the same, worked out once offline (measureNorm(kind, true) below, rounded up at the 6th decimal; tools/meascheck.js
     keeps them equal): no frame pays for it */
  var MEAS0 = { gull: [0.492849, 0.495635], goose: [0.495883, 0.493833], stork: [0.490922, 0.491954], heron: [0.480600, 0.483534], ibis: [0.488292, 0.488814], crow: [0.495306, 0.497764], swallow: [0.494879, 0.498080], finch: [0.497768, 0.501119] };
  function measureNorm(kind, fresh) {
    if (!fresh && MEAS[kind]) return MEAS[kind];
    if (!fresh && MEAS0[kind]) return (MEAS[kind] = { hw: MEAS0[kind][0], hh: MEAS0[kind][1], tab: null });
    var poses = [], i, k, a, e, ro, hw = 0, hh = 0, tab = [], g = { kind: kind, trim: ZTRIM }, S = { flap: 1, ph: 0, k: 1.12, D: KMD[kind].D, a: 1, e: 1 };
    var hp = Math.PI / 2;
    [[hp, hp, hp, hp, hp, hp, 1, 1, 1], [-hp, -hp, -hp, -hp, -hp, -hp, 1, 1, 1], [hp, hp, hp, -hp, -hp, -hp, 1, 1, 1], [-hp, -hp, -hp, hp, hp, hp, 1, 1, 1], ZTRIM].forEach(function (tr) {
      g.trim = tr; var p = FP.pose(), bd = new Float64Array(3); BW.poseS(g, GS0, 0, p, bd); poses.push([p, bd]);
    });
    g.trim = ZTRIM;
    for (k = 0; k < 24; k++) { S.ph = k / 24; var p2 = FP.pose(), b2 = new Float64Array(3); BW.poseS(g, S, 0, p2, b2); poses.push([p2, b2]); }
    poses.push([shut22(kind), new Float64Array(3)]);
    var pts = poses.map(function (q) { return LB.geom(kind, q[0], q[1], new Float64Array(3 * 46), 'this').slice(); });
    for (a = 0; a < 8; a++) for (e = 0; e < 4; e++) {
      var az = a * 45 * DEG, el = [-30, 0, 30, 60][e] * DEG, thw = 0, thh = 0;
      for (ro = -1; ro <= 1; ro++) {
        var rl = ro * BANK_MAX * DEG, cr = Math.cos(rl), sr = Math.sin(rl);
        var fx = Math.cos(el) * Math.cos(az), fy = Math.cos(el) * Math.sin(az), fz = Math.sin(el);
        var rx = Math.sin(az), ry = -Math.cos(az), rz = 0;
        var ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
        if (uz < 0) { ux = -ux; uy = -uy; uz = -uz; }
        for (i = 0; i < pts.length; i++) {
          var P = pts[i];
          for (var q = 0; q < 46; q++) {
            var x = P[3 * q], y = P[3 * q + 1], z = P[3 * q + 2];
            var y2 = y * cr + z * sr, z2 = z * cr - y * sr;
            var u = x * rx + y2 * ry + z2 * rz, v = x * ux + y2 * uy + z2 * uz;
            if (Math.abs(u) > thw) thw = Math.abs(u); if (Math.abs(v) > thh) thh = Math.abs(v);
          }
        }
      }
      tab.push([a * 45, [-30, 0, 30, 60][e], +thw.toFixed(4), +thh.toFixed(4)]);
      hw = Math.max(hw, thw); hh = Math.max(hh, thh);
    }
    var res = { hw: hw, hh: hh, tab: tab };
    if (!fresh) MEAS[kind] = res;
    return res;
  }
  function measureBird3D(kind, span, n0) {
    var M = measureNorm(kind), sk = span * MODEL_K, pen = 0.5 * LINE[1] + 1.5;   // (way-form: the pen is today's, at most LINE[1])
    /* (fix round) at night the halo's reach (4 e-foldings, CSS px) counted in the planner's box too, at the flight's own
       nearness (round 2 counted it only in the drawn box: a skein planned on the day's margin rode the name's, its
       step back blinking with the beat) */
    var N = !FORCED && HOST.night ? HOST.night() : 0, hp = N > 0 && HALO_IN_BOX ? 4 * (W < 600 ? HALO_E[1] : HALO_E[0]) / Math.max(n0 || 1, 0.3) : 0;
    return { kind: kind, span: span, gw: 2 * M.hw * sk, gh: 2 * M.hh * sk,
             hw: M.hw * sk + pen + hp, hh: M.hh * sk + pen + hp, model: sk, halo: hp };
  }

  /* the camera's own way in the world (its place each step, for a travelling flight's escort: its velocity and its
     acceleration), from the steps' camera; begun again with each visit */
  var CVH = { t: new Float64Array(64), x: new Float64Array(64), y: new Float64Array(64), z: new Float64Array(64), n: 0, i: 0 };
  function camVelStep(C) {
    if (!C) return;
    var j = CVH.i; CVH.t[j] = t; CVH.x[j] = C.pos[0]; CVH.y[j] = C.pos[1]; CVH.z[j] = C.pos[2];
    if (CVH.n > 0) { var p = (j + 63) % 64, d = Math.abs(CVH.x[j] - CVH.x[p]) + Math.abs(CVH.z[j] - CVH.z[p]); if (d > 50 || CVH.t[j] < CVH.t[p]) { CVH.n = 0; CVH.t[0] = t; CVH.x[0] = C.pos[0]; CVH.y[0] = C.pos[1]; CVH.z[0] = C.pos[2]; CVH.i = 1; CVH.n = 1; return; } }   // (a new visit's coordinates)
    CVH.i = (j + 1) % 64; CVH.n = Math.min(64, CVH.n + 1);
  }
  /* the camera's velocity over the last h s, ago s back (m/s): into o */
  function camVelAt(ago, h, o) {
    if (CVH.n < 3) { o[0] = Math.sin(FL.psi || 0) * (FL.speed || 0); o[1] = FL.vy || 0; o[2] = Math.cos(FL.psi || 0) * (FL.speed || 0); return false; }
    var tEnd = t - ago, tBeg = tEnd - h, a = -1, b = -1, k, j;
    for (k = 0; k < CVH.n; k++) { j = (CVH.i + 63 - k) % 64; if (b < 0 && CVH.t[j] <= tEnd + 1e-6) b = j; if (CVH.t[j] <= tBeg + 1e-6) { a = j; break; } }
    if (a < 0) a = (CVH.i + 64 - CVH.n) % 64; if (b < 0) b = (CVH.i + 63) % 64;
    var dt = CVH.t[b] - CVH.t[a];
    if (!(dt > 0.02)) { o[0] = Math.sin(FL.psi || 0) * (FL.speed || 0); o[1] = FL.vy || 0; o[2] = Math.cos(FL.psi || 0) * (FL.speed || 0); return false; }
    o[0] = (CVH.x[b] - CVH.x[a]) / dt; o[1] = (CVH.y[b] - CVH.y[a]) / dt; o[2] = (CVH.z[b] - CVH.z[a]) / dt;
    return true;
  }
  var CV0 = [0, 0, 0], CV1 = [0, 0, 0], CAMV = [0, 0, 0], CAMA = [0, 0, 0];
  /* the camera's escort for this frame: its velocity, and its acceleration (two velocities 0.25 s apart), eased */
  function camEscort(moving) {
    if (!moving || FORCED) { var ok = camVelAt(0, 0.25, CAMV); CAMA[0] = CAMA[1] = CAMA[2] = 0; if (FORCED) CAMV[0] = CAMV[1] = CAMV[2] = 0; return; }
    camVelAt(0, 0.25, CV0); camVelAt(0.25, 0.25, CV1);
    for (var i = 0; i < 3; i++) { CAMV[i] = CV0[i]; CAMA[i] = clamp((CV0[i] - CV1[i]) / 0.25, -4, 4); }
  }

  /* (physics) the old burst's blend (beatInfo) is gone: the lab's envelopes blend glide and beat (BW.poseS) */
  var wa = {}, wb = {}, pa = {}, pb = {};   // (scratch points: where a bird is, and through the camera)
  var PGL22 = new Float64Array(22), WO = { swing: 1, shut: null };
  var wq = {}, wa3 = {}, wc3 = {}, VV = [0, 0, 0], AA = [0, 0, 0];
  function smoothK(a, b, x) { return ease((x - a) / (b - a)); }
  /* (fix round) the tattoo's set: its constants; each kind's lean (today's mean mark: its tips' line, rising toward the
     front, deg); the tips' line on the window of the glide with a set (deg, rising toward the way it faces) */
  /* (way-other) THE AIR: a bird flies through the air, not over the ground. Its body lies along its velocity through the
     air (no sideslip): its way over the ground less the wind. The realm's own wind (HOST.wind: the dunes' sand blowing at
     6.5 m/s; still air elsewhere) so turns a bird escorting the camera across a crosswind into it (a crab, as gulls and
     geese fly in any wind), and a flight crossing the window upwind heads further off the camera's track than its own
     way across would turn it: the view then shows its near wing higher (the tattoo's lean) with no pace added on the
     window. WIND_UP: the share of travelling flights sent across the window upwind while the crosswind is at least
     WIND_SIDE (m/s); downwind, a bird slower than the wind would slide backward under its own facing (the planner's BACK
     rule, now judged by the way it faces through the air) */
  /* AIR_MIN (m/s): no path is flown on which a bird's airspeed falls under its kind's least (about its stall: a downwind
     crossing slower than the wind leaves a goose at 8 m/s through the air, which it cannot fly) */
  var AIR_MIN = { goose: 10, ibis: 8, gull: 7.5, heron: 6.5, crow: 7, finch: 5, swallow: 5.5, stork: 8 };
  var WIND_ON = true, WIND_UP = 1.0, WIND_SIDE = 1.5, WINDV = [0, 0, 0], WF = [0, 0, 0], VG = [0, 0, 0];
  var WIND_K = 1;              // (shape, dev only: the world's wind scaled, for the sensitivity run at 1.6 m/s; 1 as shipped)
  function windNow() { if (WIND_ON && HOST.wind && !FORCED) { HOST.wind(WINDV); if (WIND_K !== 1) { WINDV[0] *= WIND_K; WINDV[1] *= WIND_K; WINDV[2] *= WIND_K; } } else WINDV[0] = WINDV[1] = WINDV[2] = 0; return WINDV; }
  var SET_ON = false, SET_PROBE = 20, SET_MIN = -12, SET_MAX = 34, SET_TAU = 0.45, SET_RATE = 40, SET_DT = 0.1, SET_HYST = 0.04;
  /* the kind's mean mark (today's drawBird at the middle of every range: its five points, y up, rising toward the front,
     less the body, over its width): what the set is solved against */
  var MARKS = {};
  function markOf(kind) {
    if (MARKS[kind]) return MARKS[kind];
    var B = drawBird(function () { return 0.5; }, SORTS[kind] || SORTS.gull), i, x0 = 1e9, x1 = -1e9, o = new Float64Array(10);
    shape(B, SH);
    for (i = 0; i < 5; i++) { x0 = Math.min(x0, SH[2 * i]); x1 = Math.max(x1, SH[2 * i]); }
    for (i = 0; i < 5; i++) { o[2 * i] = (SH[2 * i] - SH[4]) / (x1 - x0); o[2 * i + 1] = -(SH[2 * i + 1] - SH[5]) / (x1 - x0); }
    return (MARKS[kind] = o);
  }
  /* the glide with a set S, its five points on the window (the tips, the wrists, the shoulders' middle; mirrored as it
     faces, left to right), against the mark: the rms after scale and shift (no rotation: the lean held), as the judge's
     A3 measures it; NaN behind the eye */
  var PT = new Float64Array(22), QT = new Float64Array(48), FV = new Float64Array(10), FI = [0, 1, 2, 7, 6];
  function setRms(kind, PG0, S, sp, ox, oy, oz, bxx, bxy, bxz, byx, byy, byz, bzx, bzy, bzz, C, face) {
    for (var i = 0; i < 22; i++) PT[i] = PG0[i];
    PT[0] += S; PT[NP] -= S;
    pts16(kind, PT, null, QT);
    var sy = VW.outH / Math.max(1, VW.outW), q, j, x, y, z, ax, ay, az, zc;
    for (q = 0; q < 5; q++) {
      j = FI[q];
      if (q === 2) { x = 0.5 * (QT[6] + QT[24]) * sp; y = 0.5 * (QT[7] + QT[25]) * sp; z = 0.5 * (QT[8] + QT[26]) * sp; }
      else { x = QT[3 * j] * sp; y = QT[3 * j + 1] * sp; z = QT[3 * j + 2] * sp; }
      ax = ox + x * bxx + y * byx + z * bzx; ay = oy + x * bxy + y * byy + z * bzy; az = oz + x * bxz + y * byz + z * bzz;
      zc = ax * C.f[0] + ay * C.f[1] + az * C.f[2];
      if (!(zc > 0.5)) return NaN;
      FV[2 * q] = face * (ax * C.r[0] + ay * C.r[1] + az * C.r[2]) / zc / VW.tanX; FV[2 * q + 1] = (ax * C.u[0] + ay * C.u[1] + az * C.u[2]) / zc / VW.tanY * sy;
    }
    if (FV[0] > FV[8]) for (q = 0; q < 2; q++) { var t0 = FV[2 * q], t1 = FV[2 * q + 1]; FV[2 * q] = FV[8 - 2 * q]; FV[2 * q + 1] = FV[9 - 2 * q]; FV[8 - 2 * q] = t0; FV[9 - 2 * q] = t1; }
    var x0 = 1e9, x1 = -1e9; for (q = 0; q < 5; q++) { x0 = Math.min(x0, FV[2 * q]); x1 = Math.max(x1, FV[2 * q]); }
    var wd = x1 - x0; if (!(wd > 1e-9)) return NaN;
    var M = markOf(kind), pmx = 0, pmy = 0, qmx = 0, qmy = 0, cx = FV[4], cy = FV[5];
    for (q = 0; q < 5; q++) { FV[2 * q] = (FV[2 * q] - cx) / wd; FV[2 * q + 1] = (FV[2 * q + 1] - cy) / wd; pmx += FV[2 * q] / 5; pmy += FV[2 * q + 1] / 5; qmx += M[2 * q] / 5; qmy += M[2 * q + 1] / 5; }
    var pq = 0, pp = 0, e = 0;
    for (q = 0; q < 5; q++) { var px = FV[2 * q] - pmx, py = FV[2 * q + 1] - pmy; pq += px * (M[2 * q] - qmx) + py * (M[2 * q + 1] - qmy); pp += px * px + py * py; }
    var k = Math.max(1e-9, pq / Math.max(pp, 1e-12));
    for (q = 0; q < 5; q++) { var dx = k * (FV[2 * q] - pmx) + qmx - M[2 * q], dy = k * (FV[2 * q + 1] - pmy) + qmy - M[2 * q + 1]; e += dx * dx + dy * dy; }
    return Math.sqrt(e / 5);
  }
  var SET_GRID = [-12, -4, 4, 12, 20, 28, 34], SG_E = new Float64Array(7);
  /* the bird posed in the world this frame: its place (the planner's path), its velocity and acceleration (its own way
     and its frame's escort), its attitude (no sideslip; the coordinated bank, eased; the climb and the angle of attack),
     its wings (its beat, glides and bounds; the hold of the pose when far), its bob; its 16 points from the camera (m) */
  function poseBird(F, m, tau, rest, C, s, dt) {
    var kind = s.kind, d = s.d, i, h = 0.25;
    where(F, m, tau, wq); var px = wq.x, py = wq.y, pz = wq.z;
    where(F, m, tau + h, wa3); where(F, m, tau - h, wc3);
    VV[0] = (wa3.x - wc3.x) / (2 * h); VV[1] = (wa3.y - wc3.y) / (2 * h); VV[2] = (wa3.z - wc3.z) / (2 * h);
    AA[0] = (wa3.x - 2 * px + wc3.x) / (h * h); AA[1] = (wa3.y - 2 * py + wc3.y) / (h * h); AA[2] = (wa3.z - 2 * pz + wc3.z) / (h * h);
    if (!F.place) for (i = 0; i < 3; i++) { VV[i] += CAMV[i]; AA[i] += CAMA[i]; }   // (a travelling flight escorts the camera: its world way is the camera's and its own)
    VG[0] = VV[0]; VG[1] = VV[1]; VG[2] = VV[2];
    if (!F.place || F.live) { windNow(); VV[0] -= WINDV[0]; VV[1] -= WINDV[1]; VV[2] -= WINDV[2]; }   // (way-other: through the air, the wind taken off: the body along it)
    var vl = Math.sqrt(VV[0] * VV[0] + VV[1] * VV[1] + VV[2] * VV[2]);
    if (!(vl > 0.05)) { VV[0] = Math.sin(F.yaw || 0); VV[1] = 0; VV[2] = Math.cos(F.yaw || 0); vl = 1; }
    var fx = VV[0] / vl, fy = VV[1] / vl, fz = VV[2] / vl;
    /* its left: level, square to its way (world: y up; cross(up, f)) */
    var lx = fz, lz = -fx, ll = Math.sqrt(lx * lx + lz * lz) || 1; lx /= ll; lz /= ll; var ly = 0;
    var ux = fy * lz - fz * ly, uy = fz * lx - fx * lz, uz = fx * ly - fy * lx;   // up square to its way: f x l
    /* the coordinated bank: the apparent gravity in its plane */
    var alat = AA[0] * lx + AA[1] * ly + AA[2] * lz, aup = AA[0] * ux + AA[1] * uy + AA[2] * uz;
    var coord = -Math.atan2(alat, 9.81 + aup) / DEG;   // (+ right wing down: turning right)
    coord = clamp(coord, -BANK_MAX, BANK_MAX);
    /* (physics) THE WINGS: the lab's measured wing at this moment of the bird's day (its state: in a bout or gliding, its
       phase, the bout's envelopes, this beat's stroke and downstroke share), posed through the skeleton rig as LB.pose
       poses it (BW.poseS: the glide with its load and trims, the flapping cycle about its mean, blended by the
       envelopes) and the body's heave, surge and trim bank with it; the swing held toward the glide for a speck
       (HOLD_POSE) and while the gift is written; a bounding finch's wings shut between its bursts. Under reduced motion
       the same state, still: the bird caught where its day had it */
    if (!s.X46) slotArrays(s);
    var egW = evGlide(F, m, tau); s.egW = egW;
    var swing = smoothK(HOLD_POSE[0], HOLD_POSE[1], s.spanPx || 20) * (s.gW > 0 ? 1 - s.gW : 1) * (1 - egW), w0 = m.w, WS0 = null;
    WO.rough = WIND_ON && !FORCED && !F.place ? clamp(Math.sqrt(WINDV[0] * WINDV[0] + WINDV[2] * WINDV[2]) / 6.5, 0, 1) : 0;   // (round 3, step 2: gusts where the world's wind blows: the dunes)
    if (w0 && w0.wing) { WS0 = BW.state(w0.wing, tau, s.LS); WO.swing = swing; WO.shut = w0.bound ? shut22(kind) : null; BW.poseS(w0.wing, WS0, tau, s.P22, s.B3, WO); }
    else { glide22(kind, s.P22); s.B3[0] = s.B3[1] = s.B3[2] = 0; }
    var flapW = WS0 ? WS0.e * swing : 0, ph = WS0 && WS0.flap ? WS0.ph : (w0 && w0.bound ? -2 : -1);
    s.ph = ph; s.mode = WS0 && WS0.e > 0.5 ? 1 : (w0 && w0.bound && WS0 && !WS0.flap ? 2 : 0); s.flapW = flapW; s.swing = swing;
    /* the held bank (LEAN_TRIM, the B film): away from the camera (its far wing lower), while gliding, seen from below and behind */
    var lsx = px - C.pos[0], lsy = py - C.pos[1], lsz = pz - C.pos[2], lsl = Math.sqrt(lsx * lsx + lsy * lsy + lsz * lsz) || 1;
    lsx /= lsl; lsy /= lsl; lsz /= lsl;
    var az = Math.acos(clamp(fx * lsx + fy * lsy + fz * lsz, -1, 1)) / DEG, elv = Math.asin(clamp(lsy, -1, 1)) / DEG;   // (off its tail; seen from below +)
    var trim = 0;
    if (LEAN_TRIM && !FORCED) {
      var far = (lx * lsx + lz * lsz) > 0 ? -1 : 1;   // (its left wing away from the camera: lower it, a roll to the left)
      s.glideW = s.glideW === undefined ? 1 : s.glideW + ((ph >= 0 ? 0.3 : 1) - s.glideW) * (rest ? 1 : 1 - Math.exp(-dt / 0.3));
      trim = LEAN_TRIM * far * s.glideW * smoothK(70, 50, az) * smoothK(-5, 5, elv);
    }
    var target = clamp(coord + trim, -BANK_MAX, BANK_MAX);
    if (rest || !(s.rollOk)) { s.roll = target; s.rollOk = true; }
    else s.roll = rollStep(s.roll, target, dt);
    s.rollT = target; s.coord = coord; s.trim = trim; s.az = az; s.el = elv;
    /* pitch: the climb and the angle of attack (the body's x rotated up about its left) */
    var aoa = (AOA[0] + (AOA[1] - AOA[0]) * flapW) * DEG, ca = Math.cos(aoa), sa = Math.sin(aoa);
    var bxx = fx * ca + ux * sa, bxy = fy * ca + uy * sa, bxz = fz * ca + uz * sa;
    var bzx = ux * ca - fx * sa, bzy = uy * ca - fy * sa, bzz = uz * ca - fz * sa;
    var rr = s.roll * DEG, cr = Math.cos(rr), sr = Math.sin(rr);
    var byx = lx * cr + bzx * sr, byy = ly * cr + bzy * sr, byz = lz * cr + bzz * sr;   // (+ roll: the left wing up, the right down)
    var bzx2 = bzx * cr - lx * sr, bzy2 = bzy * cr - ly * sr, bzz2 = bzz * cr - lz * sr;
    s.pitch = Math.asin(clamp(bxy, -1, 1)) / DEG; s.climb = Math.asin(clamp(fy, -1, 1)) / DEG;
    s.slip = Math.asin(clamp(fx * byx + fy * byy + fz * byz, -1, 1)) / DEG;
    s.va = [VV[0], VV[1], VV[2]]; s.wind = [WINDV[0], WINDV[2]];
    s.vw[0] = VG[0]; s.vw[1] = VG[1]; s.vw[2] = VG[2]; s.aw[0] = AA[0]; s.aw[1] = AA[1]; s.aw[2] = AA[2];
    var sp = d.model * MPU;
    /* (fix round) the separation: a bird its flight's neighbour would touch on the window is eased aside, square to the
       line of sight (separate(): the window px, at its distance) */
    if (s.nudX || s.nudY) { var nk = (s.depth > 1 ? s.depth : lsl) * VW.tanX / (W / 2); px += (s.nudX * C.r[0] + s.nudY * C.u[0]) * nk; py += (s.nudX * C.r[1] + s.nudY * C.u[1]) * nk; pz += (s.nudX * C.r[2] + s.nudY * C.u[2]) * nk; }
    /* (fix round) THE TATTOO'S SET: the arms' dihedral held a little apart, the wing on the side the bird faces on the
       window raised and the other lowered by the same angle (the body level: no roll, no sideslip), so its M stands on
       the tattoo's diagonal as today's marks do. The angle is solved for the view (the tips' line on the window at the
       kind's own mark's lean, today's mean mark), eased (SET_TAU, at most SET_RATE a second), held through the beat,
       let go in a bound (the wings shut) and under forced colours not changed. SET_ON false: the physics alone */
    var setW = ph === -2 ? 0 : 1, setV = 0;
    if (SET_ON && !FORCED && !F.place && !F.soar && F.stage !== 'S2') {   // (circling birds, a thermal's or a wheel's, bank by physics: their lean comes on the near quarter-lap, and a set would rock with every half-lap)
      var fr0 = fx * C.r[0] + fy * C.r[1] + fz * C.r[2];
      if (!s.setFace) s.setFace = fr0 < 0 ? -1 : 1; else if (s.setFace > 0 && fr0 < -SET_HYST) s.setFace = -1; else if (s.setFace < 0 && fr0 > SET_HYST) s.setFace = 1;
      /* which wing leads on the window (+1 its left: the left wing's tip lies on the side it faces), with the facing's
         hysteresis: the set is solved as the leading wing's rise (its sign by this), never clamped one way only */
      var lr0 = (byx * C.r[0] + byy * C.r[1] + byz * C.r[2]) * s.setFace;
      if (!s.setSide) s.setSide = lr0 < 0 ? -1 : 1; else if (s.setSide > 0 && lr0 < -SET_HYST) s.setSide = -1; else if (s.setSide < 0 && lr0 > SET_HYST) s.setSide = 1;
      var setK = Math.floor((tau + ((s.key || 0) % 97) * SET_DT / 97) / SET_DT);   // (each bird on its own tenth of a second: the solves spread over the frames, never all in one)
      if (rest || !(s.setOk) || setK !== s.setK) {
        s.setK = setK;
        /* the set whose glide, seen from here, is nearest the mark: the grid's best, refined by a parabola through it
           and its neighbours (round 1 of this fix solved for the tips' line alone, and a goose's steps then missed) */
        var gi = -1, gbest = 1e9, want;
        for (var g = 0; g < SET_GRID.length; g++) {
          SG_E[g] = setRms(kind, glide22(kind, PGL22), s.setSide * SET_GRID[g], sp, px - C.pos[0], py - C.pos[1], pz - C.pos[2], bxx, bxy, bxz, byx, byy, byz, bzx2, bzy2, bzz2, C, s.setFace);
          if (SG_E[g] < gbest) { gbest = SG_E[g]; gi = g; }
        }
        if (gi < 0) want = s.setWant || 0;
        else {
          want = SET_GRID[gi];
          if (gi > 0 && gi < SET_GRID.length - 1) { var ea = SG_E[gi - 1], ec = SG_E[gi + 1], den = ea - 2 * gbest + ec; if (den > 1e-12) want += 0.5 * (ea - ec) / den * (SET_GRID[gi + 1] - SET_GRID[gi]); }
          want = s.setSide * clamp(want, SET_MIN, SET_MAX);
        }
        s.setWant = want; s.setAt = tau;
      }
      if (rest || !(s.setOk)) { s.set = s.setWant; s.setOk = true; }
      else { var dS = (s.setWant - s.set) * (1 - Math.exp(-dt / SET_TAU)), lim = SET_RATE * dt; s.set += dS < -lim ? -lim : dS > lim ? lim : dS; }
      setV = s.set * setW;
    }
    s.setNow = setV;
    if (setV) { s.P22[0] += setV; s.P22[NP] -= setV; }   // (+: the left arm up, the right down)
    if (egW > 0 && F.egSet) { s.P22[0] += F.egSet * egW; s.P22[NP] += F.egSet * egW; }   // (life: a goose's set-wing descent, the arms a little raised, the same for the whole flight)
    /* (physics) the 46 vertices: the flexing form posed (LB.geom: the feathers bent, the fingers parted, the body's heave,
       surge and trim bank; spans), scaled, turned by the attitude, from the camera; the 16 points kept beside them (the
       separation and the dumps read them) */
    LB.geom(kind, s.P22, s.B3, s.V46, 'this');
    var ox = px - C.pos[0], oy = py - C.pos[1], oz = pz - C.pos[2], V = s.V46, X = s.X46;
    for (i = 0; i < NV; i++) {
      var x = V[3 * i] * sp, y = V[3 * i + 1] * sp, z = V[3 * i + 2] * sp;
      X[3 * i] = ox + x * bxx + y * byx + z * bzx2;
      X[3 * i + 1] = oy + x * bxy + y * byy + z * bzy2;
      X[3 * i + 2] = oz + x * bxz + y * byz + z * bzz2;
    }
    for (i = 0; i < 16; i++) { var vi = P16MAP[i]; if (vi < 0) { s.X16[3 * i] = ox; s.X16[3 * i + 1] = oy; s.X16[3 * i + 2] = oz; } else { s.X16[3 * i] = X[3 * vi]; s.X16[3 * i + 1] = X[3 * vi + 1]; s.X16[3 * i + 2] = X[3 * vi + 2]; } }
    s.body[0] = ox; s.body[1] = oy; s.body[2] = oz;
    s.nb[0] = bzx2; s.nb[1] = bzy2; s.nb[2] = bzz2;
    s.fw[0] = bxx; s.fw[1] = bxy; s.fw[2] = bxz; s.lw3[0] = byx; s.lw3[1] = byy; s.lw3[2] = byz;
    return true;
  }
  /* the 16 points on the window (device px, y up) through the frame's camera, the exact box (CSS px, y down), the span
     on the window (device px: the bird's ink span, today's, by its nearness); false behind the near plane */
  function projectBird(s, C) {
    var i, xc, yc, zc, X = s.X46, k = VW.outW / Math.max(1, W), fx = (VW.outW / 2) / VW.tanX, fy = (VW.outH / 2) / VW.tanY, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (i = 0; i < NV; i++) {   // (physics: every vertex of the flexing form; its 1/depth for the pass's nearest facet)
      var ax = X[3 * i], ay = X[3 * i + 1], az = X[3 * i + 2];
      zc = ax * C.f[0] + ay * C.f[1] + az * C.f[2];
      if (!(zc > 0.5)) return false;
      xc = ax * C.r[0] + ay * C.r[1] + az * C.r[2]; yc = ax * C.u[0] + ay * C.u[1] + az * C.u[2];
      var dx = VW.outW / 2 + fx * xc / zc, dy = VW.outH / 2 + fy * yc / zc;
      s.D46[2 * i] = dx; s.D46[2 * i + 1] = dy; s.IZ[i] = 1 / zc;
      if (dx < x0) x0 = dx; if (dx > x1) x1 = dx; if (dy < y0) y0 = dy; if (dy > y1) y1 = dy;
    }
    var bz = s.body[0] * C.f[0] + s.body[1] * C.f[1] + s.body[2] * C.f[2];
    var bpx = bz > 0.5 ? VW.outW / 2 + fx * (s.body[0] * C.r[0] + s.body[1] * C.r[1] + s.body[2] * C.r[2]) / bz : 0, bpy = bz > 0.5 ? VW.outH / 2 + fy * (s.body[0] * C.u[0] + s.body[1] * C.u[1] + s.body[2] * C.u[2]) / bz : 0;
    for (i = 0; i < 16; i++) { var vi = P16MAP[i]; if (vi < 0) { s.D[2 * i] = bpx; s.D[2 * i + 1] = bpy; } else { s.D[2 * i] = s.D46[2 * vi]; s.D[2 * i + 1] = s.D46[2 * vi + 1]; } }
    s.depth = bz; s.n = bz > 0.5 ? (W / 2) / VW.tanX * MPU / bz : 0;
    s.spanPx = s.d.span * s.n * k;                       // (today's ink span on the window, device px: the LOD, the pen floor, the filter)
    s.floorPx = clamp(Math.round(4 * clamp(1.3 + 0.035 * s.spanPx / k, LINE[0], LINE[1])) / 4 * k, 1, 2.5 * k);   // (way-form) today's pen: the wing's leading edge stroked as the tattoo's line, at its width for this size
    s.bodyPx = BODY_R * s.d.model * s.n * k;             // (fix round) the body's radius at the chest (device px): a body seen from any side ...
    /* (physics) no body: BODY_R 0 */
    s.filt = FILTER[0] + (FILTER[1] - FILTER[0]) * clamp((24 - s.spanPx) / 20, 0, 1);
    s.lod = FP.lodK(s.spanPx / k);                       // (physics: the facets' share by its ink span, CSS px: the one tone under 20, the facets in full from 64)
    var pad = 0.5 * s.floorPx + s.filt + 1;
    s.halo = HOST.night ? HOST.night() : 0;
    var he = (W < 600 ? HALO_E[1] : HALO_E[0]) * k;
    s.haloE = he;
    var hp = s.halo > 0 && HALO_IN_BOX && !FORCED ? 4 * he : 0;
    /* the exact box, CSS px (y down), the halo's reach counted at night */
    s.bx0 = (x0 - pad - hp) / k; s.bx1 = (x1 + pad + hp) / k; s.by0 = H - (y1 + pad + hp) / k; s.by1 = H - (y0 - pad - hp) / k;
    s.px = (x0 + x1) / 2 / k; s.py = H - (y0 + y1) / 2 / k;
    /* the M's legibility (render 3.3): the leading edge's height across its tips' line, over that line's length */
    var tx = s.D[12] - s.D[0], ty = s.D[13] - s.D[1], tl = Math.sqrt(tx * tx + ty * ty) || 1, hmax = 0;
    for (var q = 1; q < 3; q++) { var j = [1, 7][q - 1]; var hh = Math.abs(((s.D[2 * j] - s.D[0]) * ty - (s.D[2 * j + 1] - s.D[1]) * tx) / tl); if (hh > hmax) hmax = hh; }
    s.legib = hmax / tl; s.tipsPx = tl;
    return true;
  }
  /* (physics) the world's light on the paper: facetpose's own (the form designer's option 5, "white paper lit like
     cloud"), facet by facet: each facet's normal (area-weighted over its triangles, on the posed flexing form) turned
     toward the eye; its light (FE) for the near bird's planes and the bird's ONE TONE (the last round's constants over
     the same facets, area-weighted on the window: the bright white the true-size outline is tuned on),
     eased (TONE_T). The world is y up, facetpose z up: every vector handed to it has y and z swapped (a reflection:
     dot products kept; the normals' sign it turns toward the eye itself) */
  var LZ = { sunDir: [0, 0, 1], sunVis: 0, sunC: [1, 1, 1], ambU: [0.3, 0.35, 0.45], ambD: [0.25, 0.25, 0.3], clLit: [0.7, 0.65, 0.7] }, EYEZ = [0, 0, 1];
  /* the bird's one tone alone (facetpose.light's ONE: its lit1 with LT.ONE, area-weighted), for a bird whose planes do
     not show: the same sums, half the work */
  var ONE3 = new Float64Array(3);
  function oneTone(N, eye, L, area) {
    var LT = FP2.LT, C = LT.ONE, sd = L.sunDir, sv = L.sunVis === undefined ? 1 : L.sunVis, sc = L.sunC, au = L.ambU, ad = L.ambD, cl = L.clLit, f, k, ma = 0;
    var seaLit = Math.min(1, Math.max(0, (0.2126 * ad[0] + 0.7152 * ad[1] + 0.0722 * ad[2]) / Math.max(1e-4, 0.2126 * cl[0] + 0.7152 * cl[1] + 0.0722 * cl[2])));
    var back = Math.max(0, -(eye[0] * sd[0] + eye[1] * sd[1] + eye[2] * sd[2]));
    ONE3[0] = ONE3[1] = ONE3[2] = 0;
    for (f = 0; f < NFAC; f++) {
      var nx = N[3 * f], ny = N[3 * f + 1], nz = N[3 * f + 2], ne = nx * eye[0] + ny * eye[1] + nz * eye[2];
      if (ne < 0) { nx = -nx; ny = -ny; nz = -nz; ne = -ne; }
      var dS = nx * sd[0] + ny * sd[1] + nz * sd[2];
      var direct = sv * Math.min(1, Math.max(0, (dS + C.WRAP) / (1 + C.WRAP))), through = sv * C.TRANS * Math.max(-dS, 0);
      var wsky = C.SKYT + (1 - C.SKYT) * (0.5 + 0.5 * nz), bnc = C.BOUNCE * Math.max(-nz, 0) * seaLit;
      var rim = sv * C.RIM * Math.pow(1 - ne, LT.RIM_P) * (0.4 + 0.6 * back), a = area ? area[f] : 1;
      for (k = 0; k < 3; k++) ONE3[k] += a * LT.GAIN * LT.PAPER[k] * (C.SUN_K * sc[k] * (direct + through + rim) + ad[k] + (au[k] - ad[k]) * wsky + bnc * cl[k]);
      ma += a;
    }
    if (ma > 0) { ONE3[0] /= ma; ONE3[1] /= ma; ONE3[2] /= ma; }
    return ONE3;
  }
  var TRIS = {};
  function lum3(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  function lightBird(s, L, rest, dt) {
    var kind = s.kind, FK = LB.flexKind(kind), T = FK.tri, tf = FK.tf, X = s.X46, VZ = s.VZ, i, f;
    for (i = 0; i < NV; i++) { VZ[3 * i] = X[3 * i]; VZ[3 * i + 1] = X[3 * i + 2]; VZ[3 * i + 2] = X[3 * i + 1]; }
    FP2.facetNormals(kind, VZ, s.NZ);
    var ex = -s.body[0], ey = -s.body[1], ez = -s.body[2], el = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
    EYEZ[0] = ex / el; EYEZ[1] = ez / el; EYEZ[2] = ey / el;
    var sd = L && L.sunDir;
    if (sd) { LZ.sunDir[0] = sd[0]; LZ.sunDir[1] = sd[2]; LZ.sunDir[2] = sd[1]; } else { LZ.sunDir[0] = 0; LZ.sunDir[1] = 0; LZ.sunDir[2] = 1; }
    LZ.sunVis = L ? (L.sunVis === undefined ? 1 : L.sunVis) : 0;
    LZ.sunC = L && L.sunC ? L.sunC : [1, 1, 1]; LZ.ambU = L && L.ambU ? L.ambU : [0.3, 0.35, 0.45]; LZ.ambD = L && L.ambD ? L.ambD : [0.25, 0.25, 0.3]; LZ.clLit = L && L.clLit ? L.clLit : [0.7, 0.65, 0.7];
    for (f = 0; f < NFAC; f++) s.FA[f] = 1e-3;
    for (i = 0; i < tf.length; i++) s.FA[tf[i]] += Math.abs(triA(s.D46, T[3 * i], T[3 * i + 1], T[3 * i + 2]));   // (each facet's area on the window, device px)
    var one = s.lod > 0 && !FORCED && !(s.halo > 0) ? FP2.light(kind, s.NZ, EYEZ, LZ, s.FE, s.FA) : oneTone(s.NZ, EYEZ, LZ, s.FA);
    var e = rest || !s.eOk ? 1 : 1 - Math.exp(-dt / TONE_T);
    for (var k2 = 0; k2 < 3; k2++) s.E[k2] += (one[k2] - s.E[k2]) * e;
    s.eOk = true;
    s.fold[0] = s.fold[1] = s.fold[2] = s.fold[3] = s.fold[4] = s.fold[5] = 1;
    /* (dev) each wing's own light, area-weighted (its facets' ONE light): the left wing's facets 0-14, the right's 15-29 */
    if (!(s.lod > 0) || FORCED || s.halo > 0) { s.wingL = null; return; }   // (the facets' light only where the planes show)
    var wl = 0, wa = 0, wr = 0, wb = 0, ym = lum3(one[0], one[1], one[2]);
    for (f = 0; f < NFAC; f++) { var yl = lum3(s.FE[3 * f], s.FE[3 * f + 1], s.FE[3 * f + 2]); if (f < 15) { wl += yl * s.FA[f]; wa += s.FA[f]; } else { wr += yl * s.FA[f]; wb += s.FA[f]; } }
    s.wingL = [wl, wa, wr, wb, ym];
  }
  function triA(D, a, b, c) { return 0.5 * ((D[2 * b] - D[2 * a]) * (D[2 * c + 1] - D[2 * a + 1]) - (D[2 * c] - D[2 * a]) * (D[2 * b + 1] - D[2 * a + 1])); }
  /* how much of the cloud before it stands in front of it: at its left tip, its body and its right tip, the clouds'
     lobes between the camera and each (eased by CLOUD_IN m), at least the cover over the view; worked out every CW_DT
     s on a share of the birds each frame, each held at its most CW_HOLD s */
  function cloudWeights(s, C, tr, force) {
    if (FORCED) { s.cw[0] = s.cw[1] = s.cw[2] = 0; return; }
    var cov = HOST.cover();
    if (force || !(tr < s.cwNext) || !(tr >= s.cwAt)) {
      var pts = [0, -1, 6];
      for (var q = 0; q < 3; q++) {
        var x, y, z;
        if (pts[q] < 0) { x = s.body[0]; y = s.body[1]; z = s.body[2]; } else { x = s.X16[3 * pts[q]]; y = s.X16[3 * pts[q] + 1]; z = s.X16[3 * pts[q] + 2]; }
        var len = FX.cloud ? HOST.cloudBetween(C.pos[0], C.pos[1], C.pos[2], C.pos[0] + x, C.pos[1] + y, C.pos[2] + z) : 0, v = ease(len / CLOUD_IN);
        if (v >= s.cwH[q] || tr - s.cwHt[q] > CW_HOLD || !(tr >= s.cwHt[q])) { s.cwH[q] = v; s.cwHt[q] = tr; }
        s.cwNow[q] = v;
      }
      s.cwAt = tr; s.cwNext = tr + CW_DT;
    }
    for (var k = 0; k < 3; k++) s.cw[k] = Math.max(tr - s.cwHt[k] <= CW_HOLD ? s.cwH[k] : s.cwNow[k], cov);
    s.wf = s.cw[1];
  }

