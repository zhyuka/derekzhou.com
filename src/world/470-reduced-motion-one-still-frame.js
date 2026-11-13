  /* ---------------------------------------------------------------- reduced motion: one still frame, live both ways */
  var MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(MQ && MQ.matches); }
  function onMotionPref() {
    hoverSync();
    if (STILLMODE || LOST || DEAD) return;
    if (forced()) { if (reduced()) { if (DRAG.id !== -1) endDrag(false); } else if (!FRUN) { DOMQ.fc = true; domNext(); } return; }   // (forced colours hold, the world not drawn: the ink birds' own loop draws one still frame as reduced motion begins (fframe) and, as it ends, moves again, asked for in the next frame (domFlush, fstart))
    if (reduced()) { if (DRAG.id !== -1) endDrag(false); if (READY && shown) { stop(); STILLTS = -1; NEEDSIZE = true; stillNext(); } else start(); } else start();   // (a still not yet shown is drawn by the loop; the still drawn in the next animation frame, never in the handler)
  }
  /* forced colours: the world is not drawn while they hold (its loop stopped, the canvas hidden in the next frame);
     the canvas shows the ink birds alone, on the system's colours (fstart, below). When they end the ink birds' loop
     stops, the window is measured again and the world drawn and shown again by its own show (stage H first, if it
     never passed) */
  var FC = window.matchMedia ? window.matchMedia('(forced-colors: active)') : null;
  /* forced colours are read from a list of their own (FCQ), never from the one onForced listens on (FC, below: only
     listened on). In Chromium a read of a list's matches takes up the new state before the change is evaluated, and
     that list then fires no change event: were they read from FC, forced colours ending while the ink birds' forced
     loop reads them (every frame, forcedColours; the still's watch, fcCheck) would never reach onForced, and the world
     would never come back */
  var FCQ = window.matchMedia ? window.matchMedia('(forced-colors: active)') : null;
  function forced() { return !!(FCQ && FCQ.matches); }
  function onForced() {
    hoverSync();
    if (!forced()) fstop();   // (ended: the ink birds' loop stopped and FCOL.on false, whatever else holds: the module's forcedCheck, the pointer and the clicks see it)
    if (LOST || DEAD) return;
    if (forced()) { stop(); shown = false; STILLTS = -1; DOMQ.hide = true; DOMQ.fc = true; domNext(); }   // (the DOM's part in the next frame, domFlush: the canvas hidden, then fstart)
    else { if (shown) { shown = false; DOMQ.hide = true; } if (BIRDS) BIRDS.visit(-1); NEEDSIZE = true; start(); }   // (the ink birds' canvas hidden in the loop's first frame, domFlush, and the world shown by its own show, SHOWNT with it; under reduced motion too: the loop draws the still and shows it again, at once; the window measured and the targets made in the loop's first frame, not here)
  }
  /* the system's palette changed while forced colours hold (a contrast theme switched, light to dark or back:
     forced-colors itself stays active, so onForced is not told): the ink birds' running loop reads the colours every
     frame (fframe); a stopped one (reduced motion's still) is asked for in the next frame (domFlush, fstart), the
     still drawn again on the new Canvas colour */
  function onPalette() { if (forced() && !FRUN && !LOST && !DEAD) { DOMQ.fc = true; domNext(); } }
  /* a system colour changed that no media query reports (a contrast theme switched for another of the same scheme: forced-colors, prefers-color-scheme and prefers-contrast all hold, so neither onForced
     nor onPalette is told). A running loop reads the colours every frame (fframe); while the still stands (the loop
     stopped: reduced motion's one frame) the canvas's CanvasText and Canvas are read again about once a second, in an
     animation frame (never in the timer's own task), and on a change the still is drawn again on them (domFlush,
     fstart). A timer, armed only by the still (fframe): the site's CI allows no focus or visibility handler
     (world_rules.py rule 4's listener kinds, visibilitychange named there an idle or exit handler; validate.yml's
     Absences (2): blur), and a theme switched in the system's settings brings no event a page may listen for */
  var FCW = 0, FCW_MS = 1000;
  function fcWatch() { if (!FCW && forced()) FCW = setTimeout(function () { FCW = 0; requestAnimationFrame(fcCheck); }, FCW_MS); }
  function fcCheck() {
    if (!forced() || FRUN || !shown || LOST || DEAD) return;   // (moving again, hidden, lost or ended: nothing to watch; the next still arms it again)
    var cs = window.getComputedStyle(canvas), ink = systemColour(cs.color, FCOL.ink.slice()), paper = systemColour(cs.backgroundColor, FCOL.paper.slice());
    if (ink.join() !== FCOL.ink.join() || paper.join() !== FCOL.paper.join()) { DOMQ.fc = true; domNext(); } else fcWatch();   // (drawn again: fstart reads them, forcedColours, and the still arms the watch again)
  }
  /* under forced colours the world is not drawn: the canvas is cleared to the system's Canvas colour and the ink birds
     are drawn over it in CanvasText at full ink, in their own still view (the module's forced camera), their clock
     stepped here at the flight's fixed rate; the canvas shows once a frame has been drawn (the stylesheet keeps it laid
     out under forced colours: the window is measured and the canvas sized; no target of the world's is made, the ink
     birds reading none). The module is made here, in this loop's animation frames, if it is not yet (forced colours
     from the load: its file comes after the boot, and registerBirds asks for this loop then): before the boot's stage C
     it is the boot's own (BIRDS), after it a module made late (BIRDL), whose programs are linked here at once (fprog: no
     staged boot under forced colours) and which the world takes up as ever once they end (birdsLate). With no module to
     come (its file not arrived, its factory failed, a program that will not link: LATEB.dead) the loop stops and the
     canvas stays hidden: the page in the system's colours. Under reduced motion a single still frame. The system's
     colours are read in every frame (a palette changed while forced colours hold is drawn on at once; onPalette for a
     stopped loop), and a lost context stops the loop (onLost, and here: nothing drawn with the dead context's objects);
     restoreNow starts it again */
  var FRUN = false, FRAF = 0, FCLK = -1, FACC = 0, FALPHA = 1, FCOL = { on: false, ink: [0, 0, 0], paper: [1, 1, 1] };
  function systemColour(c, out) {
    var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(c || ''); if (!m) return out;
    out[0] = +m[1] / 255; out[1] = +m[2] / 255; out[2] = +m[3] / 255; return out;
  }
  function forcedColours() {
    FCOL.on = forced();
    if (FCOL.on) { var cs = window.getComputedStyle(canvas); systemColour(cs.color, FCOL.ink); systemColour(cs.backgroundColor, FCOL.paper); }   // (the stylesheet's CanvasText and Canvas, on the canvas)
    return FCOL;
  }
  function fstart() {
    if (FRUN || LOST || !(BIRDS || BIRDL || BIRDF)) return;   // (no module and no file yet: registerBirds asks again when it comes)
    forcedColours(); FRUN = true; FCLK = -1; FACC = 0; FRAF = requestAnimationFrame(fframe);
  }
  function fstop() { FRUN = false; FCOL.on = false; if (FRAF) cancelAnimationFrame(FRAF); FRAF = 0; }
  /* one of the ink birds' programs made at once under forced colours: issued if it is not, its status read; a module
     made late keeps its own list, as birdsLate works it, never counted in the boot's */
  function fprog(P) {
    if (gl.isContextLost()) return;
    var own = LATEB.P.indexOf(P) >= 0, c0 = PROGX.compiled, l0 = PROGX.linked, tf, r;
    if (P.st === 0) { progIssue(P); if (own) { PROGX.compiled = c0; PROGX.linked = l0; } gl.flush(); }
    if (P.st !== 2) return;
    tf = clockNow(); r = own ? finish(P) : progDone(P);
    if (r === LOSTP) return;
    if (own) { P.fms = +(clockNow() - tf).toFixed(2); P.doneAt = +clockNow().toFixed(1); P.doneF = FRAMEN; LATEB.fin = FRAMEN; }
    if (!r) { LATEB.dead = true; if (own) { BIRDL = null; INKWAIT = false; } recMark('ink birds: ' + P.name + ' will not link here (forced colours)'); }
  }
  function fframe(ts) {
    FRAF = 0;
    if (!FRUN) return;
    if (LOST) { FRUN = false; return; }   // (the context lost: no frame drawn with its dead objects; restoreNow asks for fstart again)
    if (!BIRDS && !BIRDL && !LATEB.dead) makeBirds();   // (in this animation frame: never GL calls in a script's task)
    var M = LATEB.dead ? null : BIRDS || BIRDL;
    if (!M) { FRUN = false; return; }   // (no module to draw: the canvas stays hidden)
    var still = reduced() && !STILLMODE;
    FRAF = requestAnimationFrame(fframe);
    if (!forced()) return;   // (forced colours ended; FC's change reaches onForced in the next frame's rendering steps, before this loop's next frame, and stops it (fstop): nothing drawn meanwhile, the canvas left as it is)
    var dt = FCLK < 0 ? 0 : Math.min(ts - FCLK, 100) / 1000; FCLK = ts;
    if (NEEDSIZE || !(TG || OUT.w)) { NEEDSIZE = false; resize(); }   // (the canvas sized and no target made, under forced colours: resize)
    if (!(TG || OUT.w) || gl.isContextLost()) return;   // (no window to draw in yet: the loop goes on, the still too)
    FACC += dt; var n = 0;
    BIRDB.spent = 0;
    while (FACC >= SIM_DT && n < NMAX) { BIRDB.at = clockNow(); M.step(SIM_DT); BIRDB.spent += clockNow() - BIRDB.at; BIRDB.at = 0; FACC -= SIM_DT; n++; }
    if (n >= NMAX) FACC = 0;
    FALPHA = clamp(FACC / SIM_DT, 0, 1);
    forcedColours();   // (CanvasText and Canvas read in every frame: a contrast theme changed while forced colours hold)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, FULL.w, FULL.h); gl.colorMask(true, true, true, true);
    gl.clearColor(FCOL.paper[0], FCOL.paper[1], FCOL.paper[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
    M.draw(); gl.bindVertexArray(null);
    if (LATEB.dead) { FRUN = false; cancelAnimationFrame(FRAF); FRAF = 0; return; }   // (its program would not link: nothing drawn, the canvas stays hidden)
    if (!shown) { shown = true; canvas.classList.add('on'); root.style.setProperty('--still', 'none'); }
    if (still) { FRUN = false; cancelAnimationFrame(FRAF); FRAF = 0; fcWatch(); }   // (reduced motion: this one still frame; the system's colours watched while it stands, fcWatch)
  }

