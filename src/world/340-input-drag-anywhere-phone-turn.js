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
  var INPLOG = [];   // (dev: what the flight received a step; a script to replay)
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
  var MOTION = { st: 'off', on: false, has: false, yaw: 0, pitch: 0, yaw0: 0, pitch0: 0, sy: 0, sp: 0, ref: false, tries: 0, n: 0, gen: 0, my: false, mp: false, vy: 0, vp: 0 };
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
