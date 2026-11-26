  /* ---------------------------------------------------------------- the flight */
  /* The camera flies on, simulated in fixed steps of 1/60 s (the same flight whatever the display's rate; drawn
     between the last two steps). Its state: where it is; the view's yaw (only the drags and the phone's motion turn it: design-v5 Revision 3) and the
     phone's turn on top of it; the flight's heading, which follows the view within about half a second; the pitch the
     visitor gives (a drag's tilt, kept after the release (E1.1); the phone's tilt, held while the phone is); the
     clearance it keeps over the ground (climbing as the view looks up, diving as it looks down, between the realm's
     least and its ceiling). Its height follows the ground and what stands ahead in time: the ground read back about
     the camera (groundAt), the landmarks' solids and the clouds' cores of the cells about it (climbed over when the
     ceiling allows, passed beside by a slip sideways when not, the heading held). Whatever the input, no step leaves the camera in the ground, in a landmark's
     solid or in a cloud's core (the hard rules, applied after every step and counted). */
  var SIM_DT = 1 / 60;
  var SIM = { t: 0, V: null, u: 0, acc: 0, alpha: 1, steps: 0, fixG: 0, fixO: 0, fixC: 0, inited: false, junction: false, waits: 0 };
  var TH_MAX = 35 * DEG;
  var HEAD_T = 0.035, HEAD_MAX = 2.5, BANK_MAX = 2 * DEG, BANK_T = 0.045;   // (the heading's follow of the view and the bank's: critically damped, these their times; the heading's rate's limit; the bank's)
  /* (physics map, Camera flight: flight-controllers-smooth) the heading and the bank each follow as a critically damped
     turn does, stepped exactly (damped2): the follower's rate runs on from the step before, and its acceleration rises
     from rest over its time instead of stepping as a drag starts, stops or turns back (the heading's 0.035 s, which
     keeps its catch of the view within 0.1 s, is two steps: its rise takes one; the bank's two stages, three). (Before: the heading followed first-order, its rate's
     own rate stepping to 25 rad/s2 as a drag began, and the bank, clamped hard at 2 deg (any turn over 1.6 deg/s at
     12 m/s reaches it) and eased first-order, snapped its 2 deg in at up to 45 deg/s, from rest in one step.) The bank
     follows in two such stages (its target, then the roll), since its target all but steps as a turn begins: the bank
     reaches 2 deg by a turn of 1.6 deg/s, and one stage steps its acceleration on a step. */
  function damped2(x, v, target, tau, dt) {   // x and its rate after dt s following target (held), critically damped: [x, v]
    var e = x - target, k = v + e / tau, ex = Math.exp(-dt / tau);
    return [target + (e + k * dt) * ex, (v - k * dt / tau) * ex];
  }
  /* (delight-life 9) ridge lift: where the low layer's wind (airW) blows up the ground under the way and ahead (w . grad
     h, the air's rise at the surface, m/s: 40 m differences at 0, 2v and 4v m ahead), the camera rides it over its
     clearance: 2 m by a rise of RIDGE_S[0] (0.3 m/s), 15 m by RIDGE_S[1] (1.2), and back to none in the lee, never
     under the clearance; within the ceiling's room. Three first-order stages of RIDGE_T s (the slope read, then the
     rise twice; all real, distinct: overdamped, no swing), so the motion holds nothing past 0.1 Hz (-24 dB there, -39
     at 0.2, -49 at 0.3: the 0.2-0.4 Hz sway sickens most). The rise is added over the height's spring, never through
     it (its limits shook it at 0.2-0.4 Hz); the heading, pitch and roll untouched */
  var RIDGE_T = [6, 3.5, 2], RIDGE_S = [0.3, 1.2], RIDGE_M = [2, 15];
  function liftStep(V, dt) {
    var w = airW(V), hx = Math.sin(CS.psi), hz = Math.cos(CS.psi), s = 0, i, d = 40, L;
    for (i = 0; i < 3; i++) { var x = CS.x + hx * V.speed * 2 * i, z = CS.z + hz * V.speed * 2 * i; s += w[0] * (groundAt(V, x + d, z, true) - groundAt(V, x - d, z, true)) + w[1] * (groundAt(V, x, z + d, true) - groundAt(V, x, z - d, true)); }
    s /= 6 * d; CS.ls += (s - CS.ls) * (1 - Math.exp(-dt / RIDGE_T[2])); s = CS.ls;
    L = Math.min(RIDGE_M[0] * smooth(0, RIDGE_S[0], s) + (RIDGE_M[1] - RIDGE_M[0]) * smooth(RIDGE_S[0], RIDGE_S[1], s), Math.max(0, V.clear[2] + CEIL_OVER / 2 - CS.c));
    CS.lq = L + (CS.lq - L) * Math.exp(-dt / RIDGE_T[0]); CS.lift = CS.lq + (CS.lift - CS.lq) * Math.exp(-dt / RIDGE_T[1]);
  }
  var VY_J = 2, VY_TV = 0.6;   // (the height's spring: its acceleration's own rate, m/s3, and the time its speed limits are approached over)
  function freshState() {
    return { x: 0, y: 0, z: 0, psi: 0, yawV: 0, phi: 0, thU: 0, thP: 0, thPraw: 0, c: 0, vy: 0, om: 0, omP: 0, since: 9, roll: 0, rollV: 0, lift: 0, lq: 0, ls: 0, bank: 0, bankV: 0, yawRate: 0,
      lastIn: -1e9, idleAfter: 8, auto: 1, cy: 0, hl: 0, pf: NaN, pfT: 0, sv: 0,
      lat: 0, latT: 0, latT2: 0, tsw: -1, fpsi: NaN, vs: 0, acc: 0, pt: -1e9, climbs: null, gV: null, pfE: 0, cw: NaN };
  }
  var CS = freshState(), CSP = freshState();
  function copyState(a, b) { b.x = a.x; b.y = a.y; b.z = a.z; b.yawV = a.yawV; b.phi = a.phi; b.thU = a.thU; b.thP = a.thP; b.roll = a.roll; b.psi = a.psi; b.cy = a.cy; b.pf = a.pf; b.pfT = a.pfT; b.cw = a.cw; }
  /* the flight begins at the landing (world6: once, for the page's life; no cloud to come down out of) */
  function arrive(V) {
    planVisit(V);
    var cl = V.clear;
    if (!SIM.inited) {
      CS.psi = CS.yawV = airHeading0(); SIM.inited = true;
      if (DEVMODE && POSE) CS.psi = CS.yawV = POSE[2] * DEG;
    }
    CS.x = 0; CS.z = 0; CS.c = cl[1]; CS.vy = 0; CS.ay = 0; CS.thU = clamp(CS.thU, -TH_MAX, TH_MAX); CS.om = 0; CS.omP = 0; CS.sv = 0; CS.lat = 0; CS.latT = 0; CS.latT2 = 0; CS.tsw = -1; CS.fpsi = CS.psi; CS.ppsi = CS.psi; CS.vs = 0; CS.acc = 0; CS.pt = -1e9; if (CS.climbs) CS.climbs.length = 0;
    if (DEVMODE && POSE) { CS.x = POSE[0]; CS.z = POSE[1]; }
    if (CS.x || CS.z) { kwFollow(CS.x, CS.z, true); if (V.G) kwUpload(); }   // (dev: a landing elsewhere: its weights at once)
    CS.cw = NaN; cruiseStep(CS, 0); flightParams(V, CS.cw); CS.c = cl[1];   // (world6 step B: the landing's own clearance, from the maps ahead; one framing everywhere)
    if (DEVMODE && POSE && POSE[3] !== undefined && POSE[3] >= 0) CS.c = clamp(POSE[3], cl[0], cl[2]);
    if (DEVMODE && POSE && (CS.x || CS.z)) groundCache(V, CS.x, CS.z, true);   // (world6 step B fix, dev: a pose's own ground before its first height: it read the landing's, and the hard rule lifted the camera 46 times in the film's first 3 s)
    CS.y = (V.g0max !== undefined && !CS.x && !CS.z ? V.g0max : groundAt(V, CS.x, CS.z, true)) + CS.c;
    CS.yawV = CS.psi - CS.phi;
    if (BIRDS) BIRDS.visit(V.k);
    climateLight(V);
    copyState(CS, CSP);   // (the arrival is the previous step too, its heading and tilt included: the first frame, drawn between the two, was turned 4-5 deg toward the fresh state's heading and snapped on the next)
    SIM.junction = true;
  }
  /* (E1.1 Fix 2, verify-regress-1's defect 2) the dive a kept tilt drives, once the finger is up: the view keeps the
     tilt the visitor set (nothing turns it by itself), but its dive fades out as the clearance comes down to the
     realm's cruise (KEEP_FLOOR of the way from its least to its cruise: DUNES 14 m, faded over the quarter of that span
     above it), and a clearance already below that (the drag's own dive) comes back up to it at KEEP_UP m/s: E1.1's
     kept tilt dived at 0.9 v sin(tilt) for good, so in DUNES (12 m/s) any tilt down over about 12 deg held the clearance
     at its 7 m floor, where the height's spring cannot follow the dunes, and the hard ground rule lifted the camera in
     one-tick steps 18-44 times a visit (vlong.js; c6b 0-16, no drag 0). A floor of 1.5 x the least (10.5 m) still left
     15 pushes on seed 5 and 4 after a passage into DUNES, at 11-12 m; flown left alone at the cruise there are none.
     While the finger is down (or the phone tilted: thP) the dive goes to the least as before. A tilt up climbs to the
     ceiling as before */
  var KEEP_FLOOR = 1, KEEP_UP = 2.2;
  function keptFloor(cl) { return cl[0] + KEEP_FLOOR * (cl[1] - cl[0]); }
  function keptTilt(th, c, cl, held) {
    if (held || !(th < 0)) return th;
    var a = keptFloor(cl);
    return th * smooth(a, a + Math.max(1, 0.25 * (cl[1] - cl[0])), c);
  }
  /* one step of the flight */
  function simStep() {
    var t = SIM.t + SIM_DT, j = worldAt(t), V = j.V;
    if (!V) return false;
    if (V !== SIM.V) {   // (world6: only at the start: the world is built, then flown for the page's life)
      /* (E1) built in the background long before its junction; in flight never built at once (round 3b's fallback was
         a synchronous build, a long task in flight): if it is not ready the flight holds at the junction, in the
         passage's cover, until it is (counted: SIM.waits). */
      if (V.st < VSTAGES.length && !(STILLMODE && visitStep(V, true))) { SIM.waits++; return false; }
      arrive(V); SIM.V = V;
    }
    SIM.t = t; SIM.u = j.u; SIM.steps++;
    var dt = SIM_DT, u = j.u, cl = V.clear, v = V.speed;
    if (DEVMODE && SW.camhold) { CS.vy = 0; CS.yawRate = 0; return true; }   // (dev, Fix 2: the camera held where it is while the clock runs: G0's frozen-scene film, where any change from frame to frame is the world's own animation)
    applyInput(dt, t, V);
    // (hotfix H1, design-v5 Revision 3: "should keep flying same-ish direction unless user drags") left alone, the view
    // holds the heading the visitor last set (at the landing, the landing's own): no autopilot, no aim at places or
    // beacons, no weave, no turn from rising ground or round what stands ahead. Only a drag (or the phone's motion)
    // turns it. CS.auto now says only how long the flight has been left alone (6-10 s, eased in over 3 s): the
    // clearance then eases back to the realm's cruise height, level
    var idle = t - CS.lastIn;
    if (idle > CS.idleAfter) CS.auto = Math.min(1, CS.auto + dt / 3); else CS.auto = 0;
    // what stands ahead and cannot be climbed over: passed beside, the heading held (a slip sideways, never a turn)
    slipStep(V, CS, dt);
    // the flight follows the view: critically damped (HEAD_T 0.035 s: in a steady turn it trails the view by 0.07 s, as
    // the first-order follow before it did; at most HEAD_MAX, 143 deg/s, well over a drag's turn), level with it about
    // 0.2 s after a drag stops: the way goes where the visitor looks, the heading the visitor chose (it trailed the view
    // by 14 deg in a turn and more than 1.3 s after it, banking all the while)
    var want = CS.yawV + CS.phi, hd = damped2(0, CS.yawRate, angDiff(want, CS.psi), HEAD_T, dt);
    CS.yawRate = clamp(hd[1], -HEAD_MAX, HEAD_MAX); CS.psi += Math.abs(hd[1]) > HEAD_MAX ? CS.yawRate * dt : hd[0];
    // (world6 step B) one framing everywhere (basePitch: no weight, no mode); the cruise clearance a smooth function of
    // the maps ahead (the cloud sea's weight on the held line), followed at most CW_V a second, never by a clock
    cruiseStep(CS, dt); flightParams(V, CS.cw);
    envSolids(V, CS.x, CS.z);   // (fix: the formations' cones in the surface flown, this step's)
    // the clearance: the visitor's tilt climbs or dives; left alone it eases back to the cruise height (level: the
    // autopilot's height line, a swell of up to 38 m, is gone with the autopilot)
    var tilt = keptTilt(CS.thU, CS.c, cl, INP.down) + CS.thP;
    if (Math.abs(tilt) > 0.02) CS.c += v * Math.sin(tilt) * dt * 0.9;
    if (!INP.down && CS.thU < -0.02 && CS.c < keptFloor(cl)) CS.c = Math.min(keptFloor(cl), CS.c + KEEP_UP * dt);   // (E1.1 Fix 2: below the kept tilt's floor once the finger is up: back up to it)
    if (CS.auto > 0) CS.c += clamp(cl[1] - CS.c, -2.2 * dt, 2.2 * dt) * CS.auto;
    CS.c = clamp(CS.c, leastAt(V, cl), cl[2]);   // (and over the mist pools: leastAt, 280)
    // the height: the ground ahead in time and what stands on it, a spring toward it. (flight-controllers-smooth) Its
    // acceleration eases toward the spring's own at most VY_J m/s3, and the climb's and descent's limits are approached over
    // VY_TV s, never struck: the height is smooth to its acceleration (C2). It was smooth only to its speed (C1): the
    // acceleration jumped whenever the target moved (a rise or a solid coming into the look) and stopped dead at the speed
    // limits, a small nod each time
    pitchLook(V, CS, dt);   // (the look at the ground ahead)
    CS.y -= CS.lift; liftStep(V, dt);   // (the ridge's lift, delight-life 9: on top of the spring's height, never through it)
    var yT = heightTarget(V, t), w = VY_W, aW = clamp(w * w * (yT - CS.y) - 2 * w * CS.vy, -VY_ACC, yT > CS.y ? VY_ACCU : VY_ACC);
    aW = clamp(aW, (-VY_DN - CS.vy) / VY_TV, (VY_UP - CS.vy) / VY_TV);
    CS.ay += clamp(aW - CS.ay, -VY_J * dt, VY_J * dt);
    CS.vy = clamp(CS.vy + CS.ay * dt, -VY_DN, VY_UP);
    CS.y += CS.vy * dt;
    CS.x += (Math.sin(CS.psi) * v - Math.cos(CS.psi) * CS.sv) * dt; CS.z += (Math.cos(CS.psi) * v + Math.sin(CS.psi) * CS.sv) * dt;   // (on the heading, and the slip to its right: (-cos, sin))
    CS.y += CS.lift;   // (the ridge's lift back on, its own height over the spring's)
    // the hard rules: never in the ground, a landmark or a cloud's core
    // (world6 step B fix, defect 10) over the envelope (never under the ground), and rate-limited to the climb's own
    // travel in a step (PUSH_V): the hard rule, if it acts at all, is never a jump; every push is counted (a gate fails)
    var gh = Math.max(groundAt(V, CS.x, CS.z, true, true) + Math.max(cl[0] * 0.6, ((V.L && V.L.mist) || 0) + 1), fogTopAt(V, CS.x, CS.z) + 1);   // (delight-weather 1: and over the mist pools, whose top stands at most their depth over the land: 229-mist-pools.js)   // (the ground itself: the envelope is the cruise's, never a wall; a cone entering the 320 m grid steps it, f1: 9 pushes at 1451 s with the ground 26 m under the eye)
    if (CS.y < gh) { CS.y = Math.min(gh, CS.y + PUSH_V * dt); if (CS.vy < 0) CS.vy = 0; if (CS.ay < 0) CS.ay = 0; SIM.fixG++; }
    pushOut(V);
    var ceil = Math.max(groundAt(V, CS.x, CS.z, false) + cl[2], fogTopAt(V, CS.x, CS.z) + 1 + MIST_OVER) + CEIL_OVER;   // (over a fog pool: its least, 234)   // (the ceiling: never far over it; (fix) 10 m over the clearance's top, the flight band's top: bandTopAt)
    if (CS.y > ceil) { CS.y = Math.max(ceil, CS.y - PUSH_V * dt); if (CS.vy > 0) CS.vy = 0; if (CS.ay > 0) CS.ay = 0; SIM.fixC++; }   // (flight-controllers-smooth: eased down at the climb's own travel, as the ground's rule is, and counted)
    // a flyer's bank: atan(v x the way's turn rate / g), its lateral acceleration, held under BANK_MAX smoothly (tanh: a
    // flyer at the camera's 12 m/s would bank past 40 deg in a drag's turn; clamped, its corner was a kink), followed
    // critically damped in two stages over BANK_T each: it banks only while the way curves and is level about 0.4 s
    // after it stops, with no swing past level. The roll is drawn only: it never turns the heading (it banked to 7.4 deg, 0.42 x the turn rate,
    // eased over 0.6 s, and was still rolling when the next drag began)
    var rl = BANK_MAX * Math.tanh(-Math.atan(v * CS.yawRate / 9.81) / BANK_MAX), bt = damped2(CS.bank, CS.bankV, rl, BANK_T, dt);
    CS.bank = bt[0]; CS.bankV = bt[1];
    var bk = damped2(CS.roll, CS.rollV, CS.bank, BANK_T, dt); CS.roll = bk[0]; CS.rollV = bk[1];
    directorStep(t);   // (world6: the director composes what lies ahead, out of sight; it never steers)
    climateLight(V);   // (world6 fix: every step: a pure function of where the camera is; at every sixth it stepped at 10 Hz)
    if (DEVMODE && DEVTRACE) devTrace(V);
    return true;
  }

