  /* ---------------- the frames: each flight's, fixed in the world ---------------- */

  /* Every flight's frame keeps the camera's place (its origin is the camera's, exactly: in x and z as before, and now
     in height too: round 1 followed the camera's height over 1.2 s, and in DUNES, where the camera climbs and sinks
     with the land, every path on the window became a wave of 50-70 px) and its own heading, set when it is planned
     (F.yaw) and never turned after (round 1 turned the frame with the view: the birds stayed put on the glass while the
     land swept past, an overlay). The origin in use: at the end of a fixed step (the planning, the tracker), or as
     drawn (the camera between the last two steps) */
  var FL = {};
  var FW = { ox: 0, oy: 0, oz: 0 };
  /* the forced colours' camera: the birds' own still view (the live site's window), the world not drawn */
  var FCAM = { pos: [0, 0, 0], f: [0, 0, 1], r: [-1, 0, 0], u: [0, 1, 0], pitch: 0, roll: 0, inCloud: 0, cover: 0 };
  function forcedCam() {
    var p = Math.atan2(cam.s, cam.c), cp = Math.cos(p), sp = Math.sin(p);
    FCAM.f[0] = 0; FCAM.f[1] = sp; FCAM.f[2] = cp; FCAM.r[0] = -1; FCAM.r[1] = 0; FCAM.r[2] = 0;
    FCAM.u[0] = 0; FCAM.u[1] = cp; FCAM.u[2] = -sp; FCAM.pitch = p;
    return FCAM;
  }
  function camStep() { return FORCED ? FCAM : HOST.cameraStep(); }
  function camDrawn() { return FORCED ? FCAM : HOST.camera(); }
  function flightNow() {
    if (FORCED) { FL.ok = true; FL.x = FL.z = FL.y = 0; FL.psi = 0; FL.view = 0; FL.speed = 0; FL.vy = 0; FL.ground = -1e4; return FL; }
    return HOST.flight(FL);
  }
  function frameStep() {
    flightNow(); if (!FL.ok) return false;
    var C = camStep(); if (!C) return false;
    FW.ox = C.pos[0]; FW.oy = C.pos[1]; FW.oz = C.pos[2];
    return true;
  }
  /* a point of a flight's air (units) in the world (m) */
  function airToWorld(F, ax, ay, az, o) {
    var c = F.cyw, s = F.syw;
    o.x = FW.ox + MPU * (-c * ax + s * az); o.y = FW.oy + MPU * ay; o.z = FW.oz + MPU * (s * ax + c * az);
    return o;
  }
  /* where a bird is in the world at its flight's time tau: a travelling flight's (its place in its frame's air, about
     the camera) or a place's thermal's (fixed in the world) */
  var WS = {};
  function where(F, m, tau, o) {
    if (F.place) return placeSpot(F, m, tau, o);
    spot(F, m, tau, WS);
    return airToWorld(F, WS.ax, WS.ay, WS.az, o);
  }
  function setYaw(F, yaw) { F.yaw = yaw; F.cyw = Math.cos(yaw); F.syw = Math.sin(yaw); }
  /* a point of the world on the window through the world's camera C: CSS px, depth (m), nearness */
  function projReal(x, y, z, C, o) {
    var dx = x - C.pos[0], dy = y - C.pos[1], dz = z - C.pos[2];
    var zc = dx * C.f[0] + dy * C.f[1] + dz * C.f[2];
    o.z = zc;
    if (!(zc > 0.5)) { o.x = o.y = NaN; o.n = 0; return o; }
    var xc = dx * C.r[0] + dy * C.r[1] + dz * C.r[2], yc = dx * C.u[0] + dy * C.u[1] + dz * C.u[2];
    o.x = W / 2 * (1 + xc / zc / VW.tanX); o.y = H / 2 * (1 - yc / zc / VW.tanY);
    o.n = (W / 2) / VW.tanX * MPU / zc;
    return o;
  }

