  /* ---------------- (round 3) a flight steered in flight: its path spliced, the guard, the wheel ---------------- */

  /* A flight's path is planned whole before its first bird enters (the live's); in the turning world the camera can
     still do what its course did not foresee (a new aim, a drag), and carry a flight toward the words, or turn against
     it faster than it flies. So each flight is checked again a few seconds ahead, through the camera's near course
     (guard()), and steered as a whole: eased up or down away from the words (a climb or a descent of at most EASE_MAX,
     the live's own kind of path), wheeled round to fly with an unforeseen turn of the view, or, if neither keeps it
     clear of the words, let go whole (GONE_T): never one bird faded out mid-sky while the rest fly on (round 2).

     A splice changes a flight's path from a point just ahead of its leader on: every bird flies the same path behind
     it, so each turns or climbs where the leader did (a wheel passing back down a line), and none moves where it is
     now. Each splice keeps its start (the path as it was there: place, heading, climb), then an arc of curvature k over
     L (the rest of a turn under way, or a wheel), and its climb eased from g0 to g1 over Lg */
  function path3sp(P, s, o) {
    var L = P.sp, i = L.length - 1, S, u, a, b;
    while (i > 0 && L[i].s >= s) i--;
    S = L[i]; u = s - S.s; a = Math.min(u, S.L);
    if (S.k) { b = S.h + S.k * a; o.x = S.x + (Math.sin(b) - Math.sin(S.h)) / S.k; o.z = S.z + (Math.cos(S.h) - Math.cos(b)) / S.k; }
    else { b = S.h; o.x = S.x + a * Math.cos(b); o.z = S.z + a * Math.sin(b); }
    if (u > S.L) { o.x += (u - S.L) * Math.cos(b); o.z += (u - S.L) * Math.sin(b); }
    o.h = b;
    o.y = S.y + S.g0 * u + (S.g1 - S.g0) * (u < S.Lg ? u * u / (2 * S.Lg) : u - S.Lg / 2);
    return o;
  }
  /* the path's state at s: its arc (curvature and what is left of it) and its climb (and the ease under way) */
  var SPS = {};
  function pathState(F, s, o) {
    var P = F.path, L = P.sp, i, S, u;
    path3(F, s, o);
    if (L && s > L[0].s) {
      for (i = L.length - 1; i > 0 && L[i].s >= s; i--);
      S = L[i]; u = s - S.s;
      o.k = u < S.L ? S.k : 0; o.kL = u < S.L ? S.L - u : 0;
      o.g = S.g0 + (S.g1 - S.g0) * Math.min(1, u / S.Lg); o.g1 = S.g1; o.gL = Math.max(0, S.Lg - u);
    } else {
      o.k = s > P.s1 && s < P.s2 ? P.k : 0; o.kL = s > P.s1 && s < P.s2 ? P.s2 - s : 0;
      o.g = P.g; o.g1 = P.g; o.gL = 0;
    }
    return o;
  }
  /* a splice at path point s: the rest of its arc (or a wheel: k over L) and its climb eased to g1 over Lg */
  function splice(F, s, wheelK, wheelL, g1, Lg) {
    var P = F.path, st = pathState(F, s, SPS), S;
    S = { s: s, x: st.x, y: st.y, z: st.z, h: st.h, k: wheelK === null ? st.k : wheelK, L: wheelK === null ? st.kL : wheelL,
          g0: st.g, g1: g1 === null ? st.g1 : g1, Lg: g1 === null ? Math.max(st.gL, 1e-3) : Math.max(Lg, 1e-3) };
    if (!S.k) S.L = 0;
    if (!P.sp) P.sp = [];
    P.sp.push(S);
    return S;
  }
  function unsplice(F) { var P = F.path; P.sp.pop(); if (!P.sp.length) P.sp = null; }
  /* the path point just ahead of every bird of the flight now (its leader's, and its drift forward) */
  function spliceAt(F, tau) {
    var lead = F.m[0];
    return F.sa + F.s0 + F.v * (tau + 0.1) + (F.acc ? accelS(F, tau + 0.1) : 0) + (lead.aL || 0) * 1.2 + 1 + F.v * (F.smA || 0);   // (and its changes of pace: without them a flight sped up was spliced behind its birds, and they leapt onto the new arc)
  }

