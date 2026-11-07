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
  var SIM = { t: 0, V: null, u: 0, acc: 0, alpha: 1, steps: 0, fixG: 0, fixO: 0, inited: false, junction: false, waits: 0 };
  var TH_MAX = 35 * DEG;
  function freshState() {
    return { x: 0, y: 0, z: 0, psi: 0, yawV: 0, phi: 0, thU: 0, thP: 0, thPraw: 0, c: 0, vy: 0, om: 0, omP: 0, since: 9, roll: 0, yawRate: 0,
      lastIn: -1e9, idleAfter: 8, auto: 1, cy: 0, hl: 0, pf: NaN, pfT: 0, ring: new Float32Array(12), ringP: new Float32Array(12), ri: 0, sv: 0,
      lat: 0, latT: 0, latT2: 0, tsw: -1, fpsi: NaN, vs: 0, acc: 0, pt: -1e9, climbs: null, gV: null, pfE: 0, cw: NaN };
  }
  var CS = freshState(), CSP = freshState();
  function copyState(a, b) { b.x = a.x; b.y = a.y; b.z = a.z; b.yawV = a.yawV; b.phi = a.phi; b.thU = a.thU; b.thP = a.thP; b.roll = a.roll; b.psi = a.psi; b.cy = a.cy; b.pf = a.pf; b.pfT = a.pfT; b.cw = a.cw; }
  /* the flight begins at the landing (world6: once, for the page's life; no cloud to come down out of) */
  function arrive(V) {
    planVisit(V);
    var cl = V.clear;
    if (!SIM.inited) {
      var r = RNG(subseed(J.seed, 77)); CS.psi = CS.yawV = r.r(0, 2 * PI); SIM.inited = true;
      if (DEVMODE && POSE) CS.psi = CS.yawV = POSE[2] * DEG;
    }
    CS.x = 0; CS.z = 0; CS.c = cl[1]; CS.vy = 0; CS.thU = clamp(CS.thU, -TH_MAX, TH_MAX); CS.om = 0; CS.omP = 0; CS.sv = 0; CS.lat = 0; CS.latT = 0; CS.latT2 = 0; CS.tsw = -1; CS.fpsi = CS.psi; CS.vs = 0; CS.acc = 0; CS.pt = -1e9; if (CS.climbs) CS.climbs.length = 0;
    if (DEVMODE && POSE) { CS.x = POSE[0]; CS.z = POSE[1]; }
    if (CS.x || CS.z) { kwFollow(CS.x, CS.z, true); if (V.G) kwUpload(); }   // (dev: a landing elsewhere: its weights at once)
    CS.cw = NaN; cruiseStep(CS, 0); flightParams(V, CS.cw); CS.c = cl[1];   // (world6 step B: the landing's own clearance, from the maps ahead; one framing everywhere)
    if (DEVMODE && POSE && POSE[3] !== undefined && POSE[3] >= 0) CS.c = clamp(POSE[3], cl[0], cl[2]);
    if (DEVMODE && POSE && (CS.x || CS.z)) groundCache(V, CS.x, CS.z, true);   // (world6 step B fix, dev: a pose's own ground before its first height: it read the landing's, and the hard rule lifted the camera 46 times in the film's first 3 s)
    CS.y = (V.g0max !== undefined && !CS.x && !CS.z ? V.g0max : groundAt(V, CS.x, CS.z, true)) + CS.c;
    CS.yawV = CS.psi - CS.phi;
    V.evNext = 6 + V.evRng.r(0, 6); V.flocksEv = [];
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
    if (DEVMODE && SW.camhold) { CS.vy = 0; CS.yawRate = 0; events(V, t, u); return true; }   // (dev, Fix 2: the camera held where it is while the clock runs: G0's frozen-scene film, where any change from frame to frame is the world's own animation)
    applyInput(dt, t, V);
    // (hotfix H1, design-v5 Revision 3: "should keep flying same-ish direction unless user drags") left alone, the view
    // holds the heading the visitor last set (at the landing, the landing's own): no autopilot, no aim at places or
    // beacons, no weave, no turn from rising ground or round what stands ahead. Only a drag (or the phone's motion)
    // turns it. CS.auto now says only how long the flight has been left alone (6-10 s, eased in over 3 s): the
    // clearance then eases back to the realm's cruise height, level
    var idle = t - CS.lastIn;
    if (idle > CS.idleAfter && !NOAUTO) CS.auto = Math.min(1, CS.auto + dt / 3); else CS.auto = 0;
    // what stands ahead and cannot be climbed over: passed beside, the heading held (a slip sideways, never a turn)
    slipStep(V, CS, dt, true);
    // the flight follows the view (within about half a second; at most 52 deg/s)
    var want = CS.yawV + CS.phi, d = angDiff(want, CS.psi), turn = clamp(d * (1 - Math.exp(-dt / 0.45)), -0.9 * dt, 0.9 * dt);
    CS.psi += turn; CS.yawRate = turn / dt;
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
    CS.c = clamp(CS.c, cl[0], cl[2]);
    // the height: the ground ahead in time and what stands on it, a spring toward it
    pitchLook(V, CS, dt);   // (the look at the ground ahead)
    var yT = heightTarget(V, t), w = VY_W, acc = clamp(w * w * (yT - CS.y) - 2 * w * CS.vy, -VY_ACC, yT > CS.y ? VY_ACCU : VY_ACC);
    CS.vy = clamp(CS.vy + acc * dt, -VY_DN, VY_UP);
    CS.y += CS.vy * dt;
    CS.x += (Math.sin(CS.psi) * v - Math.cos(CS.psi) * CS.sv) * dt; CS.z += (Math.cos(CS.psi) * v + Math.sin(CS.psi) * CS.sv) * dt;   // (on the heading, and the slip to its right: (-cos, sin))
    // the hard rules: never in the ground, a landmark or a cloud's core
    // (world6 step B fix, defect 10) over the envelope (never under the ground), and rate-limited to the climb's own
    // travel in a step (PUSH_V): the hard rule, if it acts at all, is never a jump; every push is counted (a gate fails)
    var gh = groundAt(V, CS.x, CS.z, true, true) + cl[0] * 0.6;   // (the ground itself: the envelope is the cruise's, never a wall; a cone entering the 320 m grid steps it, f1: 9 pushes at 1451 s with the ground 26 m under the eye)
    if (CS.y < gh) { CS.y = Math.min(gh, CS.y + PUSH_V * dt); if (CS.vy < 0) CS.vy = 0; SIM.fixG++; }
    pushOut(V);
    var ceil = groundAt(V, CS.x, CS.z, false) + cl[2] + CEIL_OVER;   // (the ceiling: never far over it; (fix) 10 m over the clearance's top, the flight band's top: bandTopAt)
    if (CS.y > ceil) { CS.y = ceil; if (CS.vy > 0) CS.vy = 0; }
    // banking with the turn, gentle and bounded
    var rl = clamp(-CS.yawRate * 0.42, -0.13, 0.13);
    CS.roll += (rl - CS.roll) * (1 - Math.exp(-dt / 0.6));
    events(V, t, u);
    directorStep(t);   // (world6: the director composes what lies ahead, out of sight; it never steers)
    climateLight(V);   // (world6 fix: every step: a pure function of where the camera is; at every sixth it stepped at 10 Hz)
    if (SIM.steps % 6 === 0) beamWake(V, u);
    if (DEVMODE && DEVTRACE) devTrace(V);
    return true;
  }

