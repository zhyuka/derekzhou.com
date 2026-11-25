  /* ---------------------------------------------------------------- input: a drag anywhere, the phone's turn */
  /* No control is shown. A drag anywhere on the page (touch, pen, or a mouse with its main button held; it begins after
     8 px, so a tap stays a tap) turns the view and the flight: across the window's width, 90 deg (a little more than a
     desktop's view is wide, so a swipe across looks aside; the same on a phone, whose view is narrower), the scene
     following the finger; up and down, the view tilts and the flight climbs or dives. Let go, and the turn runs on a
     little and eases out; the tilt is kept. A pointer's moves are read only while it is pressed (no hover), there
     is no key handler, nothing is stored. A drag begun on a link steers and never follows it; a tap on a link is a tap.
     Two fingers are never steering (pinch-zoom is the page's: touch-action pinch-zoom, pan-y as well on a page that
     scrolls, and everything the browser's while it is zoomed in). The phone: its turn and tilt from where it was when
     motion began (iOS asks first, only inside a gesture: at the end of the first drag or a tap on the page, never on a
     link, never at load; refused, never asked again). Under reduced motion all of it is inert. */
  var INP = { dx: 0, dy: 0, down: false, rel: false, n: 0, lastDx: 0, evT0: 0, fx: 0, fy: 0, relAny: false, qx: 0, qy: 0 };   // (fx, fy: the drag drawn since the last step; relAny: a release the next step counts as input; qx, qy: a dev script's drag)
  var INPLOG = [], INPQ = /** @type {any[] & { i: number }} */ ([]); INPQ.i = 0;   // (dev: what the flight received a step; a script to replay)
  var DRAG = { id: -1, x0: 0, y0: 0, x: 0, y: 0, on: false, type: '', multi: false, cap: false, t0: 0, ts: 0 };
  /* (the owner: "the birds should be more interactive with the mouse") the birds' play reads the
     pointer where the device hovers: one passive listener of its moves (onHover: a mouse's or a pen's place, CSS px,
     hover included) and one of its leaving (onHoverOut: the pointer off the window), both added and removed by hoverSync
     only (never under reduced motion or forced colours, never where no pointer hovers); they only store, and nothing
     but the birds reads HOVER (the links and the words react to nothing). A touch held still HOLD_S s without a drag is
     read by the birds as a resting pointer HOLD_UP px above the fingertip (HOST.pointer); its lift is never a tap */
  var HOVER = { x: -1, y: -1, n: 0, gone: true, down: false, type: '' }, HOVERON = false, HOLD_S = 0.8, HOLD_UP = 50;
  function onHover(e) {
    if (e.pointerType === 'touch') return;
    HOVER.x = e.clientX; HOVER.y = e.clientY; HOVER.n++; HOVER.gone = false; HOVER.down = e.buttons !== 0; HOVER.type = e.pointerType || 'mouse';
  }
  function onHoverOut(e) { if (!e.relatedTarget && e.pointerType !== 'touch') HOVER.gone = true; }
  var SUPPRESS = false, SUPPRESS_N = 0;
  var CLICKQ = [];   // (clicks and taps for the birds, x, y CSS px pairs; drained by the birds each step)
  function inert() { return reduced() || DEAD || LOST; }
  function onLink(el) { for (var e = el; e && e !== root; e = e.parentNode) if (e.tagName === 'A' || e.tagName === 'BUTTON') return true; return false; }
  function onDown(e) {
    if (inert()) return;
    if (DRAG.id !== -1) { if (e.pointerId !== DRAG.id) { DRAG.multi = true; endDrag(false); } return; }   // (a second finger: no steering)
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType === 'touch' && TOUCHMODE === 'zoom') return;   // (zoomed in: the finger is the browser's)
    DRAG.id = e.pointerId; DRAG.x0 = DRAG.x = e.clientX; DRAG.y0 = DRAG.y = e.clientY; DRAG.on = false; DRAG.type = e.pointerType || 'mouse'; DRAG.multi = false; DRAG.t0 = SIM.t; DRAG.ts = e.timeStamp;
    SUPPRESS = false;
    window.addEventListener('pointermove', onMove, true); window.addEventListener('pointerup', onUp, true); window.addEventListener('pointercancel', onCancel, true);
  }
  function onMove(e) {
    if (e.pointerId !== DRAG.id) return;
    var x = e.clientX, y = e.clientY;
    if (!DRAG.on) {
      var dx = x - DRAG.x0, dy = y - DRAG.y0;
      if (dx * dx + dy * dy < 64) return;
      if (DRAG.type === 'touch' && TOUCHMODE === 'scroll' && Math.abs(dy) > Math.abs(dx)) return;   // (a vertical swipe on a page that scrolls is the page's: the browser takes it)
      DRAG.on = true; DOMQ.steer = 1; DOMQ.unsel = true; if (!running) domNext();   // (data-steer and the selection cleared in the next frame)
      if (DRAG.type === 'mouse') { try { root.setPointerCapture(e.pointerId); DRAG.cap = true; } catch (er) { DRAG.cap = false; } }
      INP.down = true; DRAG.x = DRAG.x0; DRAG.y = DRAG.y0; REL.n = 0; REL.dwx = REL.sx = DRAG.x0; REL.dwy = REL.sy = DRAG.y0; REL.rs = true; REL.st = DRAG.type === 'mouse' ? Infinity : e.timeStamp - RS_TOUCH; if (DRAG.type !== 'mouse') REL.lat = Math.max(REL.lat, RS_TOUCH);   // (the first 8 px are taken too: the scene catches the finger up, drawn whole; the samples start at the place it caught up to, so the catch-up is no speed)
    }
    INP.dx += x - DRAG.x; INP.dy += y - DRAG.y; DRAG.x = x; DRAG.y = y; relAdd(x, y, e.timeStamp);   // (the first: the place the start caught up to)
    if (REC && !INP.evT0) INP.evT0 = e.timeStamp;   // (the record: the oldest move not yet drawn, for the input's latency)
  }
  function onUp(e) {
    if (e.pointerId !== DRAG.id) return;
    var was = DRAG.on;
    if (was) { REL.tl = e.timeStamp; if (REL.n) relAdd(DRAG.x, DRAG.y, REL.t[(REL.i + REL_N - 1) % REL_N]); }   // (the lift: its time apart, for the rest; its place, the last drawn, at the last move's time: a lift comes a digitizer frame (4-17 ms) after the last move, and sampled at its own time the fit saw the finger stop: a steady flick coasted at 0.41-0.84 x its speed)
    var held = DRAG.type === 'touch' && e.timeStamp - DRAG.ts >= HOLD_S * 1000;   // (a touch held for the birds is no tap)
    if (!was && !held && !onLink(e.target) && !FCOL.on && CLICKQ.length < 16) CLICKQ.push(e.clientX, e.clientY);   // (each click spawns a bird)
    endDrag(true);
    if (was) { SUPPRESS = true; SUPPRESS_F = FRAMEN; SUPPRESS_N++; }   // (a drag's click is not a tap)
  }
  function onCancel(e) { if (e.pointerId === DRAG.id) endDrag(false); }
  function endDrag(release) {
    if (DRAG.on) { INP.down = false; INP.rel = release; DOMQ.steer = 0; if (!running) domNext(); MOTIONASK.drag = true; }
    if (DRAG.cap) { try { root.releasePointerCapture(DRAG.id); } catch (er) { /* gone */ } DRAG.cap = false; }
    DRAG.id = -1; DRAG.on = false;
    window.removeEventListener('pointermove', onMove, true); window.removeEventListener('pointerup', onUp, true); window.removeEventListener('pointercancel', onCancel, true);
  }
  function onClick(e) {
    if (SUPPRESS && e.detail !== 0) { SUPPRESS = false; e.preventDefault(); e.stopPropagation(); askMotion(); return; }
    if (!onLink(e.target)) askMotion();   // (a tap on the page, never on a link)
  }
  function onTouchEnd(e) {   // (iOS grants motion only inside a touch's own end)
    if (MOTIONASK.drag || (e.changedTouches && e.changedTouches.length === 1 && !onLink(e.target) && !DRAG.on)) askMotion();
    MOTIONASK.drag = false;
  }
  /* the phone's turn: yaw and pitch of the direction its back looks (the view's), from the device's own orientation angles (alpha, beta, gamma)
     (alpha about z, beta about x, gamma about y, in that order); the screen's rotation turns the picture about that
     direction and changes neither */
  var MOTION = { st: 'off', on: false, has: false, yaw: 0, pitch: 0, yaw0: 0, pitch0: 0, sy: 0, sp: 0, ref: false, tries: 0, n: 0, gen: 0 };
  var MOTIONASK = { drag: false };
  /* (the owner, 2026-11-06: "Keep drag-only") the phone's turn is asked for only on iOS and iPadOS (an iPad behind a
     Mac user agent too): Chrome has DeviceOrientationEvent.requestPermission as well, grants it on a desktop's or an
     Android's first tap, and its listener then only logs the Permissions-Policy's refusal */
  var MOTIONIOS = (function () { var ua = navigator.userAgent || ''; return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1); })();
  function askMotion() {
    if (MOTION.st !== 'off' || inert() || !MOTIONIOS) return;
    var DOE = /** @type {any} */ (window.DeviceOrientationEvent);   // (iOS's requestPermission: not in the DOM's types)
    if (!DOE || typeof DOE.requestPermission !== 'function') return;
    MOTION.st = 'asking';
    try {
      DOE.requestPermission().then(function (r) { if (r === 'granted') enableMotion(); else MOTION.st = 'denied'; },
        function () { MOTION.tries++; MOTION.st = MOTION.tries >= 3 ? 'denied' : 'off'; });   // (not inside a gesture: asked again at the next)
    } catch (er) { MOTION.st = 'off'; }
  }
  function enableMotion() { if (MOTION.on) return; MOTION.on = true; MOTION.st = 'on'; MOTION.ref = false; window.addEventListener('deviceorientation', onOrient); }
  function onOrient(e) {
    if (e.alpha === null || e.beta === null || e.gamma === null || inert()) return;
    if (REC && REC.ori.length < 6000) REC.ori.push([+e.timeStamp.toFixed(1), +e.alpha.toFixed(2), +e.beta.toFixed(2), +e.gamma.toFixed(2)]);   // (the record: raw, for the filter's lag)
    orientAt(e.alpha, e.beta, e.gamma);
  }
  function orientAt(al, be, ga) {
    var a = al * DEG, b = be * DEG, g = ga * DEG, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
    var m13 = ca * sg + sa * sb * cg, m23 = cb * cg, m33 = -sa * sg + ca * sb * cg;
    var pitch = Math.asin(clamp(-m23, -1, 1)), yaw = Math.atan2(m13, m33);
    if (Math.abs(pitch) > 75 * DEG) yaw = MOTION.ref ? MOTION.yaw : yaw;   // (looking straight down or up the yaw is undefined: held)
    if (!MOTION.ref) { MOTION.yaw0 = yaw - MOTION.sy; MOTION.pitch0 = pitch - MOTION.sp; MOTION.ref = true; }
    MOTION.yaw = yaw; MOTION.pitch = pitch; MOTION.has = true; MOTION.n++;
  }
  /* each step: the drag's motion and the phone's into the flight's state */
  var IDLE_K = 0;
  /* each frame, before its steps (simAdvance, the frame's time fdt s): the view's own motion, in frame time on both
     states the camera is drawn between, so the frame that reads it draws it exactly, on any display and at any phase of
     the steps (drawn through the steps, a frame's drag turned 0, 1 or 2 frames' worth a frame, and the release's coast
     doubled a frame or held still up to 12 ms):
     - the drag moved since the last frame turns the view by exactly the finger's move (a release still draws its last
       moves; a cancelled drag draws none);
     - let go, the release's speed is taken (from the drag's own samples, below) and the coast
       runs on from the next frame: the turn's speed x 0.3 s (at most 13.75 deg), the tilt's x 0.2 s (at most 5.7 deg),
       settling as a damped turn does (coastTau, runOn: below).
       (nothing turns the view by itself) the tilt the visitor set is kept: an ease to level after the release swings an
       18 deg tilt back 24.6 deg by itself over 8 s, at up to 8.8 deg/s. The climb or dive it drives stops at the
       realm's clearance limits (simStep); the release's coast of the tilt is short (0.2 s of its speed, at most 0.1 rad), so
       0.8 s after it the tilt's own rate is under 0.6 deg/s, and from then on only the look at the ground moves the pitch (at
       most 1.5 deg/s).
     Before the landing (the boot's pre-roll: arrive sets the view) a held drag waits for it, drawn whole in the first
     frame after it (its samples are the finger's own: its release's speed is the finger's, never the catch-up's); a
     released one is dropped, as the steps dropped it */
  /* the release's speed: the drag's own samples (each move's place and time, and the lift's), never the frames': a
     finger that rested before it lifted has none, else the slope at the lift of a least-squares fit through the last
     REL_H ms of them (exact for a steady drag, on any display and any rate of moves). (Before: the mean of the last
     0.2 s of steps: a glance that stopped and was let go 2 frames later ran on 6-14 deg by itself, and a long rest 2-11
     deg.) A drag shorter than RING_T s coasts by its share of it, as a 0.2 s ring of steps did; 0 against the drag (a
     fit's overshoot as the finger slows) */
  var RING_T = 0.18, REL_H = 100, REL_STOP = 24, REL_N = 128;   // (ms: the fit's reach, and at least 3 times: a long frame leaves one move a frame; the rest within 1 px that is a stop, 25 ms on any display)
  var REL = { x: new Float64Array(REL_N), y: new Float64Array(REL_N), t: new Float64Array(REL_N), i: 0, n: 0, t0: 0, tl: -1e9, px: 0, py: 0, vx: 0, vy: 0, dwx: 0, dwy: 0, lat: 0, rs: true, sx: 0, sy: 0, st: Infinity };   // (rs: a pointer's drag, resampled; a dev script's is drawn as given)
  /* (the drag's feel on phones) while the finger is down, each frame draws it where it was at the frame's time less a
     steady latency (REL.lat), between its own moves (relAt), never where the newest move happened to put it: a phone's
     touch comes at 60-120 Hz with jitter, and a frame then caught 0, 1 or 2 moves, the view turning 0 to 2 times the
     finger's travel a frame (60 Hz touch on a 120 Hz screen: every other frame stood still). The latency is the newest
     move's age at the frames (its largest lately, eased down at RS_DECAY ms a second, at most RS_MAX): moves that come
     just before each frame (a desktop's, coalesced) draw at once as before; uneven ones a steady few ms later. A
     finger's or a pen's drag starts at RS_TOUCH ms (a phone's slowest touch, 60 Hz, and its late delivery), its first
     8 px (the catch-up to the press) drawn over that time from the press's place (REL.sx, sy at REL.st: for the drawing
     only, never in the release's speed): started from the newest move's age alone, the latency was caught out by the
     first frame with no new move or a late one, and the drawn finger stood still a frame 0-0.3 s into the drag; seeded
     at the second move, it stood still there instead, the catch-up already drawn whole. A mouse's drag starts as
     before (its moves come just before each frame), its catch-up drawn whole. The
     release's frame draws the finger whole, as before */
  var RS_MAX = 24, RS_DECAY = 5, RS_TOUCH = 20;
  function relAt(T) {   // the finger's place at T ms, between its moves (held at the ends; before the first, from the press's place)
    var j0 = (REL.i - 1 + REL_N) % REL_N, k, j, jn;
    if (T >= REL.t[j0]) return [REL.x[j0], REL.y[j0]];
    for (k = 1; k < REL.n; k++) {
      j = (j0 - k + REL_N) % REL_N; jn = (j + 1) % REL_N;
      if (REL.t[j] <= T) { var u = REL.t[jn] > REL.t[j] ? (T - REL.t[j]) / (REL.t[jn] - REL.t[j]) : 1; return [REL.x[j] + (REL.x[jn] - REL.x[j]) * u, REL.y[j] + (REL.y[jn] - REL.y[j]) * u]; }
    }
    j = (j0 - REL.n + 1 + REL_N) % REL_N;
    if (T > REL.st && REL.t[j] > REL.st) { var w = (T - REL.st) / (REL.t[j] - REL.st); return [REL.sx + (REL.x[j] - REL.sx) * w, REL.sy + (REL.y[j] - REL.sy) * w]; }
    return REL.st < Infinity ? [REL.sx, REL.sy] : [REL.x[j], REL.y[j]];
  }
  function relAdd(x, y, t) {
    if (!REL.n) REL.t0 = t;
    REL.x[REL.i] = x; REL.y[REL.i] = y; REL.t[REL.i] = t; REL.i = (REL.i + 1) % REL_N; if (REL.n < REL_N) REL.n++;
  }
  function relFit(A, j0, m, tU) {   // the slope at the lift (px/ms) of a fit through the newest m samples of A
    var s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, q0 = 0, q1 = 0, q2 = 0, k, j, u, q, u2;
    for (k = 0; k < m; k++) { j = (j0 - k + REL_N) % REL_N; u = (REL.t[j] - tU) / REL_H; q = A[j] - A[j0]; u2 = u * u; s0++; s1 += u; s2 += u2; s3 += u2 * u; s4 += u2 * u2; q0 += q; q1 += q * u; q2 += q * u2; }
    var b, det = m > 2 ? s0 * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s3 * s2) + s2 * (s1 * s3 - s2 * s2) : 0;
    if (Math.abs(det) > 1e-9) b = (s0 * (q1 * s4 - s3 * q2) - q0 * (s1 * s4 - s3 * s2) + s2 * (s1 * q2 - q1 * s2)) / det;
    else { var d = s0 * s2 - s1 * s1; b = Math.abs(d) > 1e-12 ? (s0 * q1 - s1 * q0) / d : 0; }
    j = (j0 - m + 1 + REL_N) % REL_N;
    b /= REL_H;
    return b * (A[j0] - A[j]) > 0 ? b : 0;
  }
  function relSpeed() {
    REL.vx = 0; REL.vy = 0;
    if (REL.n < 2) return;
    var j0 = (REL.i - 1 + REL_N) % REL_N, tU = REL.t[j0], tS = tU, m = 1, k, j, ex, ey, nt;
    for (k = 1; k < REL.n; k++) { j = (j0 - k + REL_N) % REL_N; ex = REL.x[j] - REL.x[j0]; ey = REL.y[j] - REL.y[j0]; if (ex * ex + ey * ey > 1) break; tS = REL.t[j]; }   // (since tS within 1 px of where it lifted)
    if (Math.max(REL.tl, tU) - tS >= REL_STOP) return;   // (it rested before it lifted, moves or none, up to the lift's own time: no speed)
    for (k = 1, nt = 1; k < REL.n; k++) { j = (j0 - k + REL_N) % REL_N; if (tU - REL.t[j] > REL_H && nt >= 3) break; if (REL.t[j] !== REL.t[(j + 1) % REL_N]) nt++; m++; }
    if (m < 2) return;
    var share = Math.min(1, (tU - REL.t0) / (RING_T * 1000));
    REL.vx = relFit(REL.x, j0, m, tU) * share; REL.vy = relFit(REL.y, j0, m, tU) * share;
  }
  function inputFrame(dt) {
    var fdt = Math.min(dt, DTMAX);
    if (!SIM.V) { if (!INP.down) { INP.dx = 0; INP.dy = 0; INP.rel = false; } return; }
    if (REL.rs && (INP.down || INP.rel) && REL.n) {   // (the finger resampled at the frame's time: relAt, above)
      if (INP.down) REL.lat = Math.min(Math.max(CLK[1] - REL.t[(REL.i - 1 + REL_N) % REL_N], REL.lat - fdt * RS_DECAY), RS_MAX);
      var fp = relAt(INP.down ? CLK[1] - REL.lat : Infinity);
      INP.dx = fp[0] - REL.dwx; INP.dy = fp[1] - REL.dwy; REL.dwx = fp[0]; REL.dwy = fp[1];
    }
    if (!INP.down && !INP.rel && (CS.om || CS.omP)) {
      var t0 = CS.ct, t1 = CS.ct + fdt, cy = runOn(CS.om, CS.tauY, t1) - runOn(CS.om, CS.tauY, t0), cp = runOn(CS.omP, CS.tauP, t1) - runOn(CS.omP, CS.tauP, t0);
      CS.yawV += cy; CSP.yawV += cy;
      CS.thU = clamp(CS.thU + cp, -TH_MAX, TH_MAX); CSP.thU = clamp(CSP.thU + cp, -TH_MAX, TH_MAX);
      CS.ct = t1; if (t1 > 24 * Math.max(CS.tauY, CS.tauP)) { CS.om = 0; CS.omP = 0; }   // (settled: under 1e-8 of its speed left)
    }
    if (INP.dx || INP.dy) {
      var G = (PI / 2) / Math.max(OUT.cssW || 800, 240), ax = INP.dx * G, ay = INP.dy * G;
      INP.dx = 0; INP.dy = 0;
      if (INP.down || INP.rel) {
        CS.yawV += ax; CSP.yawV += ax;
        CS.thU = clamp(CS.thU + ay, -TH_MAX, TH_MAX); CSP.thU = clamp(CSP.thU + ay, -TH_MAX, TH_MAX);
        INP.fx += ax; INP.fy += ay;
      }
    }
    if (INP.rel) {
      INP.rel = false; INP.relAny = true;
      relSpeed();
      var GR = 1000 * (PI / 2) / Math.max(OUT.cssW || 800, 240);   // (px/ms to rad/s)
      CS.om = clamp(REL.vx * GR, -OM_MAX, OM_MAX); CS.omP = clamp(REL.vy * GR, -OM_MAX, OM_MAX); CS.ct = 0;
      CS.tauY = coastTau(CS.om, TAU_Y, RUN_Y); CS.tauP = coastTau(CS.omP, TAU_P, RUN_P);
    }
  }
  /* (physics map, Camera flight: release-run-on) the coast after a release: the view carries the finger's speed on and
     settles as a critically damped turn does, its speed v0 (1 + t/tau) e^(-t/tau): at the lift the finger's own speed and
     no braking yet (the speed and its rate both run on from the drag), then a smooth settle with no stop to see. In all
     it runs on 2 v0 tau: 0.3 s of the finger's speed for the turn (tau 0.15 s) and 0.2 s for the tilt (0.1 s), as the
     eased coast before it did, and never past 0.24 rad (13.75 deg) and 0.1 rad (5.7 deg): a fast flick settles sooner
     (tau shorter) instead of its speed cut at the lift. (Before: the speed was cut to 0.8 and 0.5 rad/s at the lift, so
     a flick across a laptop at 3 rad/s dropped to a quarter of its speed in one frame, and the coast then braked hardest
     at once.) Each frame turns the run-on's exact share of its time, on any display */
  var TAU_Y = 0.15, TAU_P = 0.1, RUN_Y = 0.24, RUN_P = 0.1, OM_MAX = 12;   // (OM_MAX: rad/s, a bound on a fit's wild value only: a whole window's width in 0.13 s)
  function coastTau(v, tau, run) { return Math.abs(v) * 2 * tau > run ? run / (2 * Math.abs(v)) : tau; }
  function runOn(v, tau, t) { return v * tau * (2 - (2 + t / tau) * Math.exp(-t / tau)); }   // (the turn run on by t s after the lift)
  function applyInput(dt, t, V) {
    // (dev: a scripted input replayed at its own times: its drag turns this step, as it is given; its release is taken
    // in the next frame)
    while (INPQ.i < INPQ.length && INPQ[INPQ.i].t <= t + 1e-9) devInput(INPQ[INPQ.i++]);
    var G = (PI / 2) / Math.max(OUT.cssW || 800, 240), dx = INP.qx, dy = INP.qy, fx = INP.fx, fy = INP.fy, any = INP.relAny;
    INP.qx = 0; INP.qy = 0; INP.fx = 0; INP.fy = 0; INP.relAny = false;
    if (dx || dy || fx || fy) any = true;
    if (INP.down) {
      CS.yawV += dx * G; CS.thU = clamp(CS.thU + dy * G, -TH_MAX, TH_MAX);
      CS.om = 0; CS.omP = 0; CS.since = 0;
    } else CS.since += dt;
    // the phone: smoothed (0.1 s), a dead zone of 1.2 deg (a hand's tremor moves nothing), the tilt held within 30 deg
    if (MOTION.on && MOTION.has) {
      var ry = angDiff(MOTION.yaw, MOTION.yaw0), rp = MOTION.pitch - MOTION.pitch0, k = 1 - Math.exp(-dt / 0.1);
      MOTION.sy += angDiff(ry, MOTION.sy) * k; MOTION.sp += (rp - MOTION.sp) * k;
      var dz = 1.2 * DEG, ey = angDiff(MOTION.sy, CS.phi), ep = MOTION.sp - CS.thPraw;
      if (Math.abs(ey) > dz) { CS.phi += ey - (ey > 0 ? dz : -dz); any = true; }
      if (Math.abs(ep) > dz) { CS.thPraw += ep - (ep > 0 ? dz : -dz); any = true; }
      var L = 30 * DEG; CS.thP = L * Math.tanh(CS.thPraw / L);
    }
    if (any) {
      CS.lastIn = t; CS.auto = 0;
      IDLE_K++; CS.idleAfter = 6 + 4 * hfl(ihash((IDLE_K * 2654435761 + (shown ? SEEDR : J.seed)) >>> 0));   // (6-10 s before the clearance eases back to the cruise height)
      if (DEVMODE) INPLOG.push([+t.toFixed(4), +(dx + fx / G).toFixed(2), +(dy + fy / G).toFixed(2), INP.down ? 1 : 0, MOTION.has ? +(MOTION.yaw / DEG).toFixed(3) : null, MOTION.has ? +(MOTION.pitch / DEG).toFixed(3) : null]);
    }
  }
  /* dev: an input injected at a step's time ({ t, drag: [dx, dy] } moves a held drag; { t, down } / { t, up } press and
     release; { t, orient: [alpha, beta, gamma] } the phone; { t, motion: true } motion enabled) */
  function devInput(ev) {
    if (ev.down) { INP.down = true; REL.n = 0; REL.rs = false; REL.px = 0; REL.py = 0; relAdd(0, 0, ev.t * 1000); }
    if (ev.drag) { INP.qx += ev.drag[0]; INP.qy += ev.drag[1]; REL.px += ev.drag[0]; REL.py += ev.drag[1]; relAdd(REL.px, REL.py, ev.t * 1000); }
    if (ev.up) { INP.down = false; INP.rel = true; REL.tl = ev.t * 1000; }
    if (ev.motion) { MOTION.on = true; MOTION.st = 'on'; MOTION.ref = false; }
    if (ev.orient) orientAt(ev.orient[0], ev.orient[1], ev.orient[2]);
  }
  /* the page's touch: one finger steers; a page taller than the window scrolls with a vertical drag; zoomed in, the
     browser has every finger */
  var TOUCHMODE = null;
  function touchMode() {
    var vv = window.visualViewport, zoomed = !!(vv && vv.scale > 1.01), scrolls = root.scrollHeight > window.innerHeight + 2;
    var m = zoomed ? 'zoom' : scrolls ? 'scroll' : 'steer';
    if (m !== TOUCHMODE) { TOUCHMODE = m; root.setAttribute('data-touch', m); }
  }
  function inputInit() {
    window.addEventListener('pointerdown', onDown, true);
    hoverSync();   // (the birds' play's two listeners, added only while motion and colours allow it and the device hovers)
    window.addEventListener('click', onClick, true);
    window.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    document.addEventListener('dragstart', function (e) { if (!inert()) e.preventDefault(); }, true);   // (a link is never dragged away)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { DOMQ.touch = true; if (!running) domNext(); });   // (measured in the next frame)
    touchMode();
    // the phone's motion only where it is asked for (iOS, inside a gesture: askMotion); elsewhere no listener at all (the
    // owner, 2026-11-06: "Keep drag-only": the Permissions-Policy denies the sensors, and a listener only logs its error)
  }

