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
  var INP = { dx: 0, dy: 0, down: false, rel: false, n: 0, lastDx: 0, evT0: 0, fx: 0, fy: 0, relAny: false };   // (fx, fy: the drag drawn since the last step, for the release's speed; relAny: a release the next step counts as input)
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
      INP.down = true; DRAG.x = DRAG.x0; DRAG.y = DRAG.y0;   // (the first 8 px are taken too: the scene catches the finger up)
    }
    INP.dx += x - DRAG.x; INP.dy += y - DRAG.y; DRAG.x = x; DRAG.y = y;
    if (REC && !INP.evT0) INP.evT0 = e.timeStamp;   // (the record: the oldest move not yet drawn, for the input's latency)
  }
  function onUp(e) {
    if (e.pointerId !== DRAG.id) return;
    var was = DRAG.on;
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
  /* the phone's turn: yaw and pitch of the direction its back looks (the view's), from the device's own Euler angles
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
     - let go, the release's speed is taken (the ring's last 0.2 s of steps, its newest moves included) and the coast
       runs on from the next frame: the turn's speed x 0.3 s (at most 14 deg), the tilt's x 0.2 s (at most 5.7 deg).
       (nothing turns the view by itself) the tilt the visitor set is kept: an ease to level after the release swings an
       18 deg tilt back 24.6 deg by itself over 8 s, at up to 8.8 deg/s. The climb or dive it drives stops at the
       realm's clearance limits (simStep); the release's coast of the tilt is short (0.2 s, at most 0.5 rad/s), so 0.8 s
       after it the tilt's own rate is under 0.6 deg/s, and from then on only the look at the ground moves the pitch (at
       most 1.5 deg/s).
     Before the landing (the boot's pre-roll: arrive sets the view) a held drag waits for it and a released one is
     dropped, as the steps dropped it */
  function inputFrame(fdt) {
    if (!SIM.V) { if (!INP.down) { INP.dx = 0; INP.dy = 0; INP.rel = false; } return; }
    if (!INP.down && !INP.rel && (CS.om || CS.omP)) {
      var cy = CS.om * fdt, cp = CS.omP * fdt;
      CS.yawV += cy; CSP.yawV += cy;
      CS.thU = clamp(CS.thU + cp, -TH_MAX, TH_MAX); CSP.thU = clamp(CSP.thU + cp, -TH_MAX, TH_MAX);
      CS.om *= Math.exp(-fdt / 0.3); CS.omP *= Math.exp(-fdt / 0.2);
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
      CS.ring[CS.ri] = INP.fx; CS.ringP[CS.ri] = INP.fy; CS.ri = (CS.ri + 1) % 12; INP.fx = 0; INP.fy = 0;   // (the moves drawn since the last step: the newest of the release's speed)
      var sx = 0, sy = 0; for (var i = 0; i < 12; i++) { sx += CS.ring[i]; sy += CS.ringP[i]; CS.ring[i] = 0; CS.ringP[i] = 0; }
      CS.om = clamp(sx / (12 * SIM_DT), -0.8, 0.8); CS.omP = clamp(sy / (12 * SIM_DT), -0.5, 0.5);
    }
  }
  function applyInput(dt, t, V) {
    // (dev: a scripted input replayed at its own times: its drag turns this step, as it is given; its release is taken
    // in the next frame)
    while (INPQ.i < INPQ.length && INPQ[INPQ.i].t <= t + 1e-9) devInput(INPQ[INPQ.i++]);
    var G = (PI / 2) / Math.max(OUT.cssW || 800, 240), dx = INP.dx, dy = INP.dy, fx = INP.fx, fy = INP.fy, any = INP.relAny;
    INP.dx = 0; INP.dy = 0; INP.fx = 0; INP.fy = 0; INP.relAny = false;
    if (dx || dy || fx || fy) any = true;
    if (INP.down) {
      CS.yawV += dx * G; CS.thU = clamp(CS.thU + dy * G, -TH_MAX, TH_MAX);
      CS.ring[CS.ri] = dx * G + fx; CS.ringP[CS.ri] = dy * G + fy; CS.ri = (CS.ri + 1) % 12;   // (the last 0.2 s: the release's speed)
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
    if (ev.down) { INP.down = true; }
    if (ev.drag) { INP.dx += ev.drag[0]; INP.dy += ev.drag[1]; }
    if (ev.up) { INP.down = false; INP.rel = true; }
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

