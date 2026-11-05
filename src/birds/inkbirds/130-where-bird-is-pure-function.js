  /* ---------------- where a bird is: a pure function of the flight's time ---------------- */

  var tmp = {}, tmp2 = {}, pb = {}, st = {};
  function spot(F, m, tau, o) {
    if (F.soar) return soarSpot(F, m, tau, o);
    slotAt(F, m, tau, sl);
    var q = F.q, lag = sl.lag + m.aL * q * wave(m.bKey, tau / m.bT) + glideLag(m, tau),   // (round 3, step 2: a gliding bird falls back, and catches up as it beats)
        lat = sl.lat + 0.75 * m.aP * q * wave(m.bKey + 53, tau / m.bT / 1.3),     // (its drift about its place: aside and up and down,
        up = sl.up + 0.5 * m.aP * q * wave(m.bKey + 97, tau / m.bT / 1.1), s, w, sh, ch;   //  together about as much as one way alone)
    s = F.s0 + F.v * (tau + (F.smA ? F.smA * wave(F.smK, (tau - lag / F.v) / F.smT) : 0)) - lag + (F.acc ? accelS(F, tau) : 0);   // (round 3, alive: its pace swinging, each bird as it reaches that air)   // (round 3: and its changes of pace in flight, i6_steer.js)
    work += SPOT_COST - 1;   // (round 3: its drift, wander, gusts and wings: the hot path, counted at its cost)
    path3(F, F.sa + s, wp);
    w = F.wAmp * wave(F.wKey, s / F.wLam) * m.gain;       // the track's wander: every bird flies through it
    up += w; lat += 0.5 * w;
    up += F.hAmp * wave(F.hKey, (tau - lag / F.v) / F.hT) * q - lift(m, tau) * (m.w && m.w.sinks ? 1 : q);   // (fix: a glide's sink is through the air, not gentled with the window's pace)   // a gust reaches each bird as it reaches that air; its wings carry it
    sh = Math.sin(wp.h); ch = Math.cos(wp.h);
    o.ax = wp.x - sh * lat; o.ay = wp.y + up; o.az = wp.z + ch * lat;   // (where it is in the air: the drawing's)
    if (F.ws !== undefined && (F.ws !== 1 || F.wsA) && F.wsS) {   // (round 3, the owner's word on the camera: its own world speed, and an escort's wander about its station)
      var dW = (F.ws - 1) * F.wsS * tau + F.wsA * (F.span || 0) * wave(F.wsK, tau / F.wsT);
      o.ax += dW * F.wsX; o.az += dW * F.wsZ;
    }
    /* (way-other, W8) a flight keeps its formation in the air it flies through: in a wind every body turns by its crab
       (its way over the ground to its way through the air), and so does the flight's figure about its leader (each bird
       its place behind and aside in its neighbours' air, as a skein holds it): the offset from its place on the path
       turned by the crab */
    /* (life fix, L4) and, wind or none, the flight's figure lies along its way through the AIR: a travelling flight's
       frame escorts the camera, so its birds' way through the air is their way in the frame plus the camera's (FL.psi,
       FL.speed, in the frame's axes) less the wind; the offset from the leader's way is turned from the path's heading
       to that way (judge-bio1: the V's axis stood 37-87 deg off the way its geese faced) */
    if (!F.place && !F.still && (lag !== 0 || lat !== 0)) {
      var cy8 = F.cyw === undefined ? 1 : F.cyw, sy8 = F.syw === undefined ? 0 : F.syw, wfx = 0, wfz = 0;
      if (WIND_ON) { wfx = (-cy8 * WINDV[0] + sy8 * WINDV[2]) / MPU; wfz = (sy8 * WINDV[0] + cy8 * WINDV[2]) / MPU; }
      var dps8 = (FL.psi || 0) - (F.yaw || 0), cs8 = (FL.speed || 0) / MPU;
      var vo8 = F.v * F.q, ax8 = vo8 * ch - cs8 * Math.sin(dps8) - wfx, az8 = vo8 * sh + cs8 * Math.cos(dps8) - wfz;
      var c8 = Math.atan2(ch * az8 - sh * ax8, ch * ax8 + sh * az8), cc8 = Math.cos(c8) - 1, sc8 = Math.sin(c8);
      var dx8 = -lag * ch - sh * lat, dz8 = -lag * sh + ch * lat;   // (its offset from the leader's way: back along the path, aside)
      o.ax += dx8 * cc8 - dz8 * sc8; o.az += dx8 * sc8 + dz8 * cc8;
    }
    proj(o.ax, o.ay, o.az, o);   // aside: level, at right angles to its heading
    o.a = fadeOf(o.n);
    return o;
  }

  /* a soaring bird: the glide in, the thermal (a ring in the air, its
     centre drifting downwind and the birds climbing in it), the glide away
     — joined where their headings meet */
  function glideDist(x, v0, v1) {
    var q = x / EASE_T;
    return v0 * x + (v1 - v0) * (q < 1 ? EASE_T * (q * q * q - q * q * q * q / 2) : EASE_T / 2 + x - EASE_T);
  }
  function soarSpot(F, m, tau, o) {
    var S = F.soar, th, d, x, y, z;
    if (tau < m.tj) {
      d = glideDist(m.tj - tau, m.vj, m.vIn);
      x = m.jx - S.dirIn * d; y = m.jy; z = m.jz;
    } else if (tau < m.tx) {
      th = S.thj + S.om * (tau - m.tj);
      x = S.cx + S.dirIn * S.drift * (tau - S.tj0) + m.R * Math.cos(th);
      y = S.cy + S.rise * (tau - S.tj0);
      z = S.cz + m.R * Math.sin(th);
    } else {
      away(S, m, tau - m.tx, st);
      x = st.x; y = st.y; z = st.z;
    }
    o.ax = x; o.ay = y; o.az = z;
    proj(x, y, z, o);
    o.a = fadeOf(o.n);
    return o;
  }
  /* the glide away from the thermal, dt into it */
  function away(S, m, dt, o) {
    var d = glideDist(dt, m.vx, m.vOut);
    o.x = m.xx + S.dirOut * d * Math.cos(S.descent); o.y = m.xy - d * Math.sin(S.descent); o.z = m.xz;
    return o;
  }

