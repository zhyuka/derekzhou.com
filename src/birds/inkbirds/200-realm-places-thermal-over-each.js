  /* ---------------- the realm's places: a thermal over each ---------------- */

  /* Where a realm keeps birds about a place (its cells' bird flocks: a temple, a giant shard, an island), the ink
     birds keep a thermal by it instead: two or three storks (or gulls) circling above, one way round,
     the storks holding their wings out (the live's), the gulls gliding with a few beats now and then: fixed in the world, as the place is, so the camera comes to them and passes
     beneath. Made when the camera comes within PLACE_ON of the place (its birds then too far to be seen: they come out
     of the distance as it nears), and gone once it is beyond PLACE_OFF with none of them in view. One at a time; while
     one is seen the sky keeps one travelling flight fewer */
  var PLACE_FAR = [0.16, 0.26];  // nearness: a thermal's birds come out of the distance between these (the travelling flights' FAR, FADE: 0.42, 0.54)
  /* the air between: a travelling flight's birds are the live's (FADE, FAR); a thermal's are seen from further off, small
     ink over the place (the camera comes to them at its own pace, and would otherwise pass them before they showed) */
  function fadeFor(F, n) { if (F.fadeS) { var a = F.fadeS; return n >= a[1] ? 1 : n <= a[0] ? 0 : ease((n - a[0]) / (a[1] - a[0])); } return F.place ? (n >= PLACE_FAR[1] ? 1 : n <= PLACE_FAR[0] ? 0 : ease((n - PLACE_FAR[0]) / (PLACE_FAR[1] - PLACE_FAR[0]))) : fadeOf(n); }
  var PLACES = [], placeSeen = false;
  function placeSpot(P, m, tau, o) {
    if (P.live) return liveSpot(P, m, tau, o);   // (round 3: the living sky)
    var th = m.th0 + m.om * tau;
    o.x = P.cx + m.R * Math.cos(th); o.z = P.cz + m.R * Math.sin(th);
    o.y = P.cy + m.dy + 3 * Math.sin(0.5 * th + m.th0);
    return o;
  }
  /* a thermal keeps above the camera: its storks climbing (or sinking) at most CLIMB_T m/s toward UP over the place's
     own birds or the camera's height, whichever is higher, so the camera passes beneath them (a visitor climbing faster
     comes up to them: they step aside, NEAR_FADE) */
  var CLIMB_T = 3;
  function placeLift(dt) {
    for (var i = 0; i < PLACES.length; i++) { var P = PLACES[i]; if (P.live) continue; var want = Math.max(P.base, FL.y) + P.up; P.cy += clamp(want - P.cy, -CLIMB_T * dt, CLIMB_T * dt); }
  }
  function landPlace(P) {
    P.m.forEach(function (m) { if (m.s) { hide(m.s); m.s.busy = false; m.s = null; } });
    var k = PLACES.indexOf(P); if (k >= 0) PLACES.splice(k, 1);
  }

