  /* ---------------- the camera: the world's, or forced colours' own still view ---------------- */

  var FL = {};
  /* the forced colours' camera: the birds' own still view (the world is not drawn, the camera held): looking out level,
     the horizon low under the open sky */
  var FCAM = { pos: [0, 0, 0], f: [0, 0, 1], r: [-1, 0, 0], u: [0, 1, 0], pitch: 0, roll: 0, inCloud: 0, cover: 0 };
  function forcedCam() {
    var f = (W / 2) / Math.max(VW.tanX || 1, 1e-3), p = clamp(Math.atan((0.3 * H) / f), 0, 0.6), cp = Math.cos(p), sp = Math.sin(p);
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
