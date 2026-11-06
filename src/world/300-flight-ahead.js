  /* ---------------------------------------------------------------- the flight ahead
     (round 2, for the birds' planner: HOST.ahead) The camera's coming view, predicted from the flight as it is now:
     where the camera will be and the way it will look (the view's yaw, its pitch and roll), at `step` s intervals.
     (Fix 2) Left alone the heading is held, so the prediction holds until the visitor drags; while a drag is held the
     view is held (a release's coast spent first); what stands ahead is passed by the same slip as the flight's. The ground is the cache's (about the camera). It never changes the flight; it is worked in
     chunks (a reset starts it again from the flight as it is), so no one step pays for a long look ahead. */
  var AH = { on: false, t: 0, x: 0, z: 0, y: 0, vy: 0, yawV: 0, psi: 0, auto: 0, roll: 0, c: 0, om: 0, omP: 0, thU: 0, since: 0, k: 0,
             phi: 0, thP: 0, held: false, V: null, u: 0,
             calmK: 0, calmWant: 0, calmRate: 0, calmEv: 0, sv: 0, lat: 0, latT: 0, latT2: 0, tsw: -1, fpsi: NaN, vs: 0, acc: 0, gV: null, pfE: 0, cw: 0, cl: [7, 14, 60] };
  /* (round 3) channels: each caller's forecast its own (the birds' planner on 0, carried on a chunk at a time; their
     flights' guard on 1, a few seconds from now): one never resets the other's */
  var AHS = [AH];
  function ahSel(ch) {
    ch = ch | 0;
    if (!AHS[ch]) { var o = {}, k; for (k in AHS[0]) o[k] = AHS[0][k]; o.on = false; o.obst = []; o.obstV = null; o.obstT = -1e9; o.cl = [7, 14, 140]; AHS[ch] = o; }   // (its own list of what stands ahead)
    AH = AHS[ch];
  }
  function aheadReset() {
    var V = SIM.V; AH.on = !!V; if (!V) return;
    AH.V = V; AH.t = SIM.t; AH.u = SIM.u; AH.k = 0;
    AH.x = CS.x; AH.z = CS.z; AH.y = CS.y; AH.vy = CS.vy; AH.yawV = CS.yawV; AH.psi = CS.psi; AH.auto = CS.auto;
    AH.roll = CS.roll; AH.c = CS.c; AH.om = INP.down ? 0 : CS.om; AH.omP = INP.down ? 0 : CS.omP; AH.thU = CS.thU; AH.since = CS.since; AH.phi = CS.phi; AH.thP = CS.thP; AH.held = !!INP.down;
    AH.calmK = CALM.k; AH.calmWant = CALM.want; AH.calmRate = CALM.rate; AH.calmEv = CALM.ev; AH.pf = CS.pf; AH.pfT = CS.pfT; AH.sv = CS.sv; AH.lat = CS.lat; AH.latT = CS.latT; AH.latT2 = CS.latT2; AH.tsw = CS.tsw; AH.fpsi = CS.fpsi; AH.vs = CS.vs; AH.acc = CS.acc; AH.gV = CS.gV; AH.pfE = CS.pfE; AH.cw = CS.cw;
    if (!AH.obst) AH.obst = [];
    if (AH.obstV !== V || !(SIM.t - AH.obstT < 1)) { nearObstaclesAt(V, CS.x, CS.z, V.speed * 52 + 120, AH.obst); AH.obstV = V; AH.obstT = SIM.t; }   // (round 3: what the forecast may pass beside, out to ~40 s of flight; gathered once a second)
  }
  function aheadSub(h) {
    var V = AH.V, v = V.speed, cl = AH.cl || (AH.cl = [7, 14, 140]);
    cruiseStep(AH, h); var A0 = V.def.clear || cl; cl[0] = A0[0]; cl[1] = cruiseOf(V, AH.cw); cl[2] = A0[2];   // (world6 step B: the forecast's clearance, as the flight's)
    AH.t += h; AH.u += h;
    // (hotfix H1) left alone the heading is held, as the flight holds it: no autopilot, no turn of its own; only how
    // long it has been left alone (the clearance eased back to the cruise height) and the slip past what stands ahead
    if (AH.held) AH.auto = 0;
    else if (AH.t - CS.lastIn > CS.idleAfter && !NOAUTO) AH.auto = Math.min(1, AH.auto + h / 3); else AH.auto = 0;
    AH.calmK += clamp(AH.calmWant - AH.calmK, -h / CALM_T, h / CALM_T);
    slipStep(V, AH, h, false);   // (pass 2: the flight's planned line, flown by the same controller)
    // a release's coast (E1.1: the tilt kept)
    if (!AH.held) { AH.yawV += AH.om * h; AH.om *= Math.exp(-h / 0.3); AH.thU = clamp(AH.thU + AH.omP * h, -TH_MAX, TH_MAX); AH.omP *= Math.exp(-h / 0.2); AH.since += h; }   // (E1.1: the tilt kept, as the flight keeps it, its short coast spent)
    // the flight follows the view; the roll banks with its turn
    var dpsi = angDiff(AH.yawV + AH.phi, AH.psi), turn = clamp(dpsi * (1 - Math.exp(-h / 0.45)), -0.9 * h, 0.9 * h);
    AH.psi += turn;
    var rl = clamp(-turn / h * 0.42, -0.13, 0.13); AH.roll += (rl - AH.roll) * (1 - Math.exp(-h / 0.6));
    // the clearance (left alone: back to the cruise height, level) and the height (a spring toward the ground ahead)
    var tiltA = keptTilt(AH.thU, AH.c, cl, AH.held) + AH.thP;   // (E1.1: the kept tilt climbs or dives, as simStep's does, to the clearance's limits; Fix 2: its dive faded as simStep's)
    if (Math.abs(tiltA) > 0.02) AH.c += v * Math.sin(tiltA) * h * 0.9;
    if (!AH.held && AH.thU < -0.02 && AH.c < keptFloor(cl)) AH.c = Math.min(keptFloor(cl), AH.c + KEEP_UP * h);
    if (AH.auto > 0) AH.c += clamp(cl[1] - AH.c, -2.2 * h, 2.2 * h) * AH.auto;
    AH.c = clamp(AH.c, cl[0], cl[2]);
    var hx = Math.sin(AH.psi), hz = Math.cos(AH.psi), yT = -1e9, i, LT = V.def.lookT || 0, LK = V.def.lookTan || TAN_CLIMB;
    for (i = 0; i <= 4; i++) { var s = v * HT_T * i / 4, ye = groundAt(V, AH.x + hx * s, AH.z + hz * s, false) + AH.c - s * TAN_CLIMB; if (ye > yT) yT = ye; }
    if (LT > HT_T) for (i = 1; i <= 4; i++) { var s3 = v * HT_T + (v * LT - v * HT_T) * i / 4, ye3 = groundAt(V, AH.x + hx * s3, AH.z + hz * s3, false) + AH.c - s3 * LK; if (ye3 > yT) yT = ye3; }   // (as heightTarget: a far crest seen early)
    var g0 = groundAt(V, AH.x, AH.z, false), w = VY_W, acc = clamp(w * w * (yT - AH.y) - 2 * w * AH.vy, -VY_ACC, VY_ACC);
    AH.vy = clamp(AH.vy + acc * h, -VY_DN, VY_UP); AH.y += AH.vy * h;
    if (AH.y < g0 + cl[0] * 0.6) { AH.y = g0 + cl[0] * 0.6; if (AH.vy < 0) AH.vy = 0; }
    AH.x += (hx * v - hz * AH.sv) * h; AH.z += (hz * v + hx * AH.sv) * h;   // (and the slip, as the flight's)
    pitchLook(V, AH, h, AH.calmK);   // (the look followed, as the flight's)
  }
  /* n samples into out (arrays yaw, pitch, roll, x, y, z, from index out.n), `step` s apart: from the flight as it is
     now (reset), or on from the last chunk. The camera as drawn (camPose's pitch: the realm's framing, the ground ahead,
     the visitor's tilt; its height with the passage's climb and the tall window's lift) */
  var AHT = new Float64Array(8);
  function flightAhead(reset, n, step, out, ch) {
    ahSel(ch);
    if (reset || !AH.on || AH.V !== SIM.V) { aheadReset(); out.n = 0; out.t0 = SIM.t; out.step = step; if (!AH.on) { AH = AHS[0]; return 0; } out.end = Infinity; if (reset) { aheadSample(out); n--; } }
    if (!AH.on) { AH = AHS[0]; return 0; }
    var sub = Math.max(1, Math.round(step / 0.15)), h = step / sub, i, j;
    for (i = 0; i < n && out.n < out.yaw.length; i++) { for (j = 0; j < sub; j++) aheadSub(h); aheadSample(out); }
    AH = AHS[0];
    return out.n;
  }
  function aheadSample(out) {
    var V = AH.V, k = out.n, yaw = AH.yawV + AH.phi, look = V.def.look || 90, x = AH.x, z = AH.z;
    var ga = groundAt(V, x + Math.sin(yaw) * look, z + Math.cos(yaw) * look, false), gh = groundAt(V, x, z, false);
    var fr = basePitch(V) + (AH.pf === AH.pf ? AH.pf : Math.atan2(ga - gh, look) * pfK(V));
    var pitch = fr + AH.thU + AH.thP;
    out.yaw[k] = yaw; out.pitch[k] = clamp(pitch, -60 * DEG, 50 * DEG); out.roll[k] = AH.roll;
    out.x[k] = x; out.y[k] = AH.y + CAMLIFT * Math.min(V.clear[1], 12); out.z[k] = z;
    out.n = k + 1;
  }

