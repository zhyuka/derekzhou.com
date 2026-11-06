  /* ---------------------------------------------------------------- the places, the birds' calm, the look ahead */
  /* (Fix 2 of round E1, design-v5 Revision 3 #1 and 13.4: the tour is retired) Round 3b's autopilot flew on, left
     alone, toward the places the cells hold, with a weave, a turn from rising ground and a way round what stood ahead.
     All of it is gone (apChoose, apPath, apAim, apDone, apAlt, the clear way's search, autopilot, WEAVE, calmCap,
     calmSlew, avoid, avoidS): nothing turns the view but the visitor's drag and the phone's motion. The places
     themselves stay (the dev hook lists them) */
  function apPois(V) {
    var out = [], L = V.cellList; if (!L) return out;
    for (var i = 0; i < L.length; i++) { var C = L[i]; if (C.st >= 2) for (var k = 0; k < C.pois.length; k++) out.push(C.pois[k]); }
    return out;
  }
  /* (round 3) the birds' calm. While the ink birds have a flight in the sky (or one being planned) the module asks for
     it (HOST.calm(rate, ev), rad/s; 0: none), eased in and out over CALM_T s (k). (Fix 2: with the autopilot gone the
     view never turns by itself, so the calm holds only the look at the ground ahead, pitchLook; rate and ev are kept
     as the module gives them.) The visitor's own input is never held */
  var CALM = { want: 0, k: 0, rate: 0.0175, ev: 0.05 }, CALM_T = 2;
  /* (round 3) the camera's look at the ground ahead (the realm's pitchFollow of its slope over V.def.look m), followed over
     CALM_PITCH s under the calm (none without it): over DUNES's rises it pitched the view up to 2 deg/s, sweeping every
     bird up or down the window at up to 40 px/s, and bending their ways there. S.pfT: the look now; S.pf: as followed */
  var CALM_PITCH = 1.6, PF_EASE = 1.5, PF_K = 0.3;
  /* (round E1 Fix 3) the look eased in when a visit's own ground first arrives (the grid's first read, a few frames after
     the change of realm): until then groundAt has only the realm's placeholder height, the look is level, and its read
     landing stepped the view's pitch by 0.6-0.8 deg in one frame inside the cloud (seed 1: at all four junctions, H1's
     camera bound being 0.5 deg a frame); now followed over PF_EASE s at CALM_PITCH x PF_K (0.48 s), the following
     itself eased out over its last 0.5 s */
  function pitchLook(V, S, dt, k) {
    var look = V.def.look || 90, yaw = S.yawV + S.phi, ga = groundAt(V, S.x + Math.sin(yaw) * look, S.z + Math.cos(yaw) * look, false), gh = groundAt(V, S.x, S.z, false);
    S.pfT = Math.atan2(ga - gh, look) * pfK(V);
    if (GROUND.V === V && GROUND.ok && S.gV !== V) { S.gV = V; if (S.pf === S.pf) S.pfE = PF_EASE; }   // (the visit's own ground arrived)
    var kk = S.pfE > 0 ? Math.max(k, PF_K * Math.min(1, S.pfE / 0.5)) : k; if (S.pfE > 0) S.pfE -= dt;   // (its last 0.5 s eased out: ended at once, the lag of a look still moving stepped the pitch 0.5-0.9 deg: seeds 8, 19, 20)
    var pf0 = S.pf;
    if (!(S.pf === S.pf) || kk <= 0) S.pf = S.pfT;
    else S.pf += (S.pfT - S.pf) * (1 - Math.exp(-dt / (CALM_PITCH * kk)));
    if (pf0 === pf0) S.pf = pf0 + clamp(S.pf - pf0, -PF_RATE * dt, PF_RATE * dt);   // (Fix 3: at most PF_RATE)
  }
  /* (E1 Fix 3, the hotfix verify-2's item 1) the look followed at most PF_RATE (1.5 deg/s): without the birds' calm it
     followed the ground at once, and over DUNES (seed 13 at 405-408 s, a visit's middle) the view pitched 7 deg in 3 s,
     at up to 3.77 deg/s, by itself; the look is the one turn of the view left alone besides the carry inside the cloud */
  var PF_RATE = 1.5 * DEG;
