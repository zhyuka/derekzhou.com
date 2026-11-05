  /* ---------------- the drawing: every bird afresh, in the tattoo's hand ---------------- */

  /* one bird: an M in its own frame (u along its line, back to front; v
     toward its wrists), kept as each vertex's distance along the line from
     the back end to the front end and across it, and the lean that stands
     it on its diagonal */
  function drawBird(r, S) {
    var tail = r() < S.tail, M = [0, 0], u = 0, v = 0, i, d1 = pick(r, S.down), d2 = pick(r, S.down) - pick(r, [2, 10]),
        ex, ey, L, B;
    function go(len, a) { u += len * Math.cos(a * DEG); v += len * Math.sin(a * DEG); M.push(u, v); }
    if (tail) go(pick(r, TAIL), pick(r, TAIL_UP));        // the back wing drawn out long: a tail ...
    else go(pick(r, S.rise), pick(r, S.up));              // ... or the rise to the first wrist
    go(pick(r, S.drop), -d1);                             // down to the body
    go(pick(r, S.rise), pick(r, S.up));                   // up to the front wrist
    go(pick(r, S.out), -d2);                              // and out in front
    ex = M[8]; ey = M[9]; L = Math.sqrt(ex * ex + ey * ey);
    B = { s: [], h: [], ux: ex / L, uy: ey / L, tail: tail };
    for (i = 0; i < 10; i += 2) { B.s.push(M[i] * B.ux + M[i + 1] * B.uy); B.h.push(M[i + 1] * B.ux - M[i] * B.uy); }
    L = ((d1 + d2) / 2 + pick(r, LEAN)) * DEG;           // steps: the drops lie about flat
    B.c = Math.cos(L); B.sn = Math.sin(L);
    return B;
  }
  /* the bird as drawn, into out[10] (x, y down): its five points, stood
     on its diagonal (the kind's mean mark, markOf) */
  function shape(B, out) {
    var i, su, hv, pu, pv;
    for (i = 0; i < 5; i++) {
      su = B.s[i];
      hv = B.h[i];
      pu = su * B.ux - hv * B.uy; pv = su * B.uy + hv * B.ux;
      out[2 * i] = pu * B.c - pv * B.sn;                 // stood on its diagonal, rising to the right
      out[2 * i + 1] = -(pu * B.sn + pv * B.c);
    }
    return out;
  }
  var SH = new Float64Array(10);

