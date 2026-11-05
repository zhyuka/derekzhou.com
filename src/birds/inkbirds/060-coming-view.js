  /* ---------------- the coming view ---------------- */

  /* the camera's predicted course from the job's start (VP.t0), a sample each STEP: the view's yaw, pitch and roll and
     the camera's place (for the clouds and the ground ahead of a path); worked out in chunks as a trial needs them */
  var VP_N = 320, VP_CHUNK = 24, AHEAD_COST = 4;   // samples at most (96 s); a chunk; the cost of a sample, in bird-steps
  var VP = { yaw: new Float64Array(VP_N), pitch: new Float64Array(VP_N), roll: new Float64Array(VP_N), x: new Float64Array(VP_N), y: new Float64Array(VP_N), z: new Float64Array(VP_N),
             n: 0, t0: 0, step: 0.3, still: true, yaw0: 0, pitch0: 0, end: 1e9 };
  var T_TRUST = 12;            // s from a job's start: the course is trusted this far (the autopilot's aim and weave); past it, a new aim, a place flown round or the visitor may turn the view anywhere, and the trial holds a path only to the words' and the edges' half margins and to nothing else
  /* (world5 E1 Fix 3) the engine may say how far its course can be trusted (HOST.courseTrust, s): the world now holds
     its heading left alone (design-v5 Revision 3), so its forecast is the flight until the visitor drags, and the
     planner flies each trial as far as the flight will be seen there (a straight flight went on into clouds' bodies
     the 22-s trial never saw: DUNES s13's sky 19.5% empty with a 30-s spell, ABOVE s7's first 23 s, up to 9 flights
     a run faded into cloud; verify-regress-2). Without it, T_TRUST */
  function trustT() { return HOST.courseTrust ? HOST.courseTrust() : T_TRUST; }
  /* a new course: from the flight as it is now; a still one (reduced motion, forced colours, no world camera) holds the
     view where it is */
  function viewPredict(still) {
    var C = HOST.cameraStep();
    HOST.flight(FL);
    VP.t0 = t; VP.step = STEP; VP.n = 0; VP.end = 1e9;
    VP.still = !!still || FORCED || !C || !FL.ok || !HOST.ahead;
    VP.yaw0 = C && !FORCED ? FL.view : 0; VP.pitch0 = C && !FORCED ? C.pitch : NaN;
    if (!VP.still) { HOST.ahead(true, VP_CHUNK, STEP, VP); work += VP.n * AHEAD_COST; if (VP.n < 1) VP.still = true; }
    VP.t0 = t;   // (round 3, step 1: the forecast's own stamp is the world's clock (SIM.t), not the birds': it starts at the first frame shown, and every trial began that much late)
    if (VP.still) { VP.yaw[0] = VP.yaw0; VP.pitch[0] = VP.pitch0; VP.roll[0] = 0; if (C) { VP.x[0] = C.pos[0]; VP.y[0] = C.pos[1]; VP.z[0] = C.pos[2]; } VP.n = 1; }
  }
  /* the course out to sample k (more chunks as needed) */
  function viewNeed(k) {
    if (VP.still) return;
    while (VP.n <= k && VP.n < VP_N) {
      var n0 = VP.n, t00 = VP.t0; HOST.ahead(false, Math.min(VP_CHUNK, VP_N - VP.n), STEP, VP);
      if (VP.t0 !== t00) VP.t0 = t;   // (round 3, step 1: a forecast the world restarted from now (a new realm) is stamped on the birds' clock too)
      work += (VP.n - n0) * AHEAD_COST;
      if (VP.n === n0) break;
    }
  }
  /* the view for a flight at sample k: its frame's heading against the camera's yaw, the camera's pitch and roll */
  var PV = { cd: 1, sd: 0, ct: 1, st: 0, cr: 1, sr: 0, k: -1 };
  function viewAtK(F, k) {
    var i = VP.still ? 0 : Math.min(Math.max(k, 0), VP.n - 1), d = angDiff(VP.yaw[i], F.yaw), p = VP.pitch[i];
    if (p !== p) p = Math.atan2(cam.s, cam.c);
    PV.cd = Math.cos(d); PV.sd = Math.sin(d); PV.ct = Math.cos(p); PV.st = Math.sin(p);
    PV.cr = Math.cos(VP.roll[i]); PV.sr = Math.sin(VP.roll[i]); PV.k = k;
  }
  /* an air point (x, y, z) of that flight through that view: on the window (CSS px) and its nearness */
  function projV(x, y, z, o) {
    var xc0 = x * PV.cd + z * PV.sd, yc0 = x * PV.st * PV.sd + y * PV.ct - z * PV.st * PV.cd, zc = -x * PV.ct * PV.sd + y * PV.st + z * PV.ct * PV.cd;
    if (!(zc > 1e-6)) { o.x = o.y = NaN; o.n = 0; return o; }
    var xc = xc0 * PV.cr + yc0 * PV.sr, yc = yc0 * PV.cr - xc0 * PV.sr;
    o.n = cam.f / zc; o.x = cam.x0 + xc * o.n; o.y = cam.y0 - yc * o.n;
    return o;
  }
  /* the predicted window speed of the land straight ahead at the job's start, px/s (+ rightward: the view turning left) */
  function sweepAhead(T) {
    if (VP.still) return 0;
    var k = Math.max(1, Math.min(Math.round(T / STEP), VP_N - 1)); viewNeed(k); k = Math.min(k, VP.n - 1);
    return k > 0 ? cam.f * angDiff(VP.yaw[k], VP.yaw[0]) / (k * STEP) : 0;
  }
  /* where an air point of a flight is in the world at sample k of the course (the camera's predicted place + the frame) */
  function airWorldK(F, ax, ay, az, k, o) {
    var i = VP.still ? 0 : Math.min(Math.max(k, 0), VP.n - 1), c = Math.cos(F.yaw), s = Math.sin(F.yaw);
    o.x = VP.x[i] + MPU * (-c * ax + s * az); o.y = VP.y[i] + MPU * ay; o.z = VP.z[i] + MPU * (s * ax + c * az);
    o.cx = VP.x[i]; o.cy = VP.y[i]; o.cz = VP.z[i];
    return o;
  }

