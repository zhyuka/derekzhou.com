  /* ---------------- (round 3) the course's own error, and the words' slack ---------------- */

  /* a running 90th percentile of the course's yaw error (deg) by horizon (1 s buckets to 30 s): started from ERR90,
     moved as the visit goes (ten times a second, while the planner's course reaches the present: its yaw against the
     camera's own). A path is held clear of the words by their margin widened by what the course may have wrong there:
     across, f x tan of that error (the view's turn moves a flight sideways); up and down, PITCH90 (the pitch is all but
     exact) */
  var EB = new Float64Array(31), ERR_ETA = 0.1;
  function errInit() {
    for (var b = 0, j; b <= 30; b++) {
      for (j = 2; j < ERR90.length - 2 && ERR90[j] < b; j += 2);
      var h0 = ERR90[j - 2], h1 = ERR90[j], e0 = ERR90[j - 1], e1 = ERR90[j + 1];
      EB[b] = h1 > h0 ? e0 + (e1 - e0) * clamp((b - h0) / (h1 - h0), 0, 1) : e1;
    }
  }
  function errAt(h) { var b = clamp(h, 0, 30), i = Math.floor(b); return i >= 30 ? EB[30] : EB[i] + (EB[i + 1] - EB[i]) * (b - i); }
  function errLearn() {
    if (VP.still || VP.n < 2) return;
    var h = t - VP.t0, k = Math.round(h / STEP), b = Math.round(h), e;
    if (k < 1 || k >= VP.n || b < 1 || b > 30 || h > VP.end) return;
    e = Math.abs(angDiff(FL.view, VP.yaw[k])) / DEG;
    EB[b] = Math.max(0.05, EB[b] + (e > EB[b] ? 0.9 : -0.1) * ERR_ETA);
  }
  function slackX(h) { return cam.f * Math.tan(Math.min(errAt(h), 40) * DEG); }
  function slackY() { return cam.f * Math.tan(PITCH90 * DEG); }
  var BANDSLACK = 0;           // px: the open bands kept that much further from the words (the course's slack up and down: set as a path is proposed)
  /* the ink box keeps its margin from every word box, widened by sx across and sy up and down */
  function clearOfWordsS(x, y, hw, hh, sx, sy) {
    for (var i = 0, o, m; i < words.length; i++) {
      o = words[i]; m = o.m * held;
      if (x + hw > o.l - m - sx && x - hw < o.r + m + sx && y + hh > o.t - m - sy && y - hh < o.b + m + sy) return false;
    }
    return true;
  }
  /* a point in the air on the window (x, y) and its nearness n (px on the window a unit in the air) */
  function proj(x, y, z, o) {
    var yc = y * cam.c - z * cam.s, zc = y * cam.s + z * cam.c;
    o.n = cam.f / zc; o.x = cam.x0 + x * o.n; o.y = cam.y0 - yc * o.n;
    return o;
  }
  /* the point in the air seen at (sx, sy) on the window, at nearness n */
  function unproj(sx, sy, n, o) {
    var zc = cam.f / n, yc = (cam.y0 - sy) / n;
    o.x = (sx - cam.x0) / n; o.y = yc * cam.c + zc * cam.s; o.z = zc * cam.c - yc * cam.s;
    return o;
  }
  /* the air between: a bird far off fades out of sight, and back into it */
  function fadeOf(n) { return n >= FADE ? 1 : n <= FAR ? 0 : ease((n - FAR) / (FADE - FAR)); }

