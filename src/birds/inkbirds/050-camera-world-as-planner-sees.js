  /* ---------------- the camera: the world's, as the planner sees it ---------------- */

  /* the air in front of the camera, in a flight's own frame: x to the right, y up from the eye's level, z out along the
     ground, in px at nearness 1 (air units; MPU m each). Each flight's frame keeps the camera's place (it travels with
     it: no flight ever looms as the camera flies on) but its own heading, fixed in the world when it is planned (round
     2: so a turn of the view sweeps the birds across the window with the land, at f x the turn). The planner sees two
     things through the world's own camera (its field of view): the still view, the camera as it will be when the
     flight sets off, held still (the live site's own window: the birds' calm, their pace and turns against the world,
     are judged in it), and the coming view, the camera as it is predicted to turn, pitch and roll over the flight
     (HOST.ahead: the autopilot's own course; a drag is not foreseen): where every bird is seen, so it keeps clear of the
     words, of the edges and of the other flights there */
  var cam = { f: 1, c: 1, s: 0, x0: 0, y0: 0, hy: 0 }, floorY = 0;
  var FLOOR_T = 12;            // m: no flight lower than this over the ground under it (round 2: the ground under the path, not the camera's: flights cross low in front of the dunes)
  var OPEN_SKY = 1;            // the share of the window's height open to a level crossing, against the live's (scales the gaps and the retries) ...
  var OPEN_MIN = 0.75;         // ... never under this (round 3: round 2's 0.45 filled DUNES's half-empty sky; its flights now keep their sky, and at 0.45 it held half again the live's birds)
  function camera(pitch) {
    var C = HOST.cameraStep(), th;
    HOST.view(VW);
    cam.f = (W / 2) / Math.max(VW.tanX, 1e-3);
    if (pitch === undefined || pitch !== pitch) {
      if (C && !FORCED) pitch = C.pitch;
      else {   // (no world camera: the live site's, the horizon low under the open sky)
        var hy = clamp(Math.max(H * 0.8, stackB + WORDS + 60), H * 0.8, H * 0.95);
        pitch = Math.atan((hy - H / 2) / cam.f);
      }
    }
    th = clamp(pitch, -1.2, 1.2);
    cam.c = Math.cos(th); cam.s = Math.sin(th); cam.x0 = W / 2; cam.y0 = H / 2;
    cam.hy = cam.y0 + cam.f * Math.tan(th);
    /* no flight lower than FLOOR_T over the camera's ground (and the ground under each path, checked as it is planned) */
    HOST.flight(FL);
    floorY = FL.ok && C && !FORCED ? Math.min(0, -(C.pos[1] - FL.ground - FLOOR_T) / MPU) : -1e6;
    var ob = openBands(12, 12), tot = 0, i;
    for (i = 0; i < ob.length; i++) tot += ob[i][1] - ob[i][0];
    OPEN_SKY = clamp(tot / Math.max(1, 0.62 * H), OPEN_MIN, 1);
  }

