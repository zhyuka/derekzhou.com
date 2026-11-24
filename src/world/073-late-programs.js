  /* (fast500 step 9, the owner's "Finish code after show": only programs for things not in view; e9.py) S1 becomes:
     every program registered and issued before the world shows, the late ones' completion polled after it. Only with
     the parallel compile (EXT.parAll), never in the stills, forced colours or a restored context. The late set: the ink
     birds' (birds:ink), always (no ink bird is in view at the show, and their clock now waits for them: lateBirds); the world's ribbons where the realm draws them by the sand under the
     camera and there is none within LATE_R of the landing (so the flight cannot reach any in LATE_T s). A late program
     is drawn only once finished, linked and warmed (lateReady); a draw needed before then is a miss (LATEP.miss, fail()) */
  var LATEP = { on: false, decided: false, sand: -1, R: 0, names: [], done: [], warmed: [], miss: 0, misses: [], birdWait: 0, birdsAt: -1, ready: -1 };
  var LATE_T = 30, LATE_SAND = 0.0005, LATE_ALWAYS = ['birds:ink', 'birds:paper', 'engine.creature', 'engine.glow', 'engine.beam'];   // (world-perf lane: the creatures, the glow sprites and the beams too: measured, none drawn in the first 20 s of 24 visits, desktop and phone, any hour; each draw guarded below)   // (lane D: the paper birds' program is 'birds:paper' since the birds' rename; as 'birds:ink' only, it held the show ~160 ms)
  function lateCan() { return !!EXT.parAll && !STILLMODE && !FRUN && !BOOT.restore; }
  function lateSand(V) {   // the most sand anywhere within LATE_R of the landing (sandAt's weight, on kwAt)
    var R = 1.5 * Math.max(V.speed, 32) * LATE_T + 2 * KSTEP, st = KSTEP / 2, m = 0, x, z, k, s;
    LATEP.R = R;
    for (z = -R; z <= R; z += st) for (x = -R; x <= R; x += st) {
      if (x * x + z * z > R * R) continue;
      k = kwAt(x, z); s = clamp(k[0], 0, 1) * (1 - smooth(0.2, 0.6, k[3])); if (s > m) m = s;
    }
    return m;
  }
  function lateDecide() {
    var i, P, n, V = J.V;
    if (!lateCan()) { if (LATEP.on) for (i = 0; i < PROGS.length; i++) PROGS[i].late = false; LATEP.on = false; return; }
    if (!LATEP.on) { LATEP.on = true; }
    if (!LATEP.decided && V && V.def && V.speed) {
      if (!V.def.sandFx) { LATEP.sand = 1; LATEP.decided = true; }   // (drawn whatever the ground: never late)
      else if (KW.ok) { LATEP.sand = lateSand(V); LATEP.decided = true; }
    }
    for (i = 0; i < PROGS.length; i++) {
      P = PROGS[i]; n = P.name;
      if (P.late) continue;
      if (LATE_ALWAYS.indexOf(n) >= 0 || (LATEP.decided && LATEP.sand <= LATE_SAND && n === V.def.id + '.ribbon')) { P.late = true; LATEP.names.push(n); }
    }
  }
  function lateCore() {   // every program not finished is a late one (progStep's parallel path: the show may go on)
    var n = [];
    for (var i = 0; i < PROGS.length; i++) if (PROGS[i].st !== 3) { if (!PROGS[i].late) return false; n.push(PROGS[i].name); }
    if (!LATEP.ready || LATEP.ready < 0) { LATEP.ready = FRAMEN; bootMark('C show-ready (' + n.length + ' late pending' + (n.length ? ': ' + n.join(', ') : '') + ')'); }
    return true;
  }
  function lateReady(P) { return !P || !P.late || (P.st === 3 && P.ok && (!!P.warmed || !WARM.list)); }
  function lateMissIf(P, would) {   // false always: the draw is passed over; counted where it was needed
    if (!would) return false;
    LATEP.miss++; if (LATEP.misses.length < 20) LATEP.misses.push([P.name, FRAMEN, +SIM.t.toFixed(3)]);
    if (LATEP.miss === 1) fail('late program ' + P.name + ' needed before it was ready (step 9)');
    return false;
  }
  /* (world-perf lane) the late programs nothing draws before the world shows (LATE_HELD: the creatures, the glow sprites,
     the beams) are not even issued before it, where programs are late at all (lateCan): their compiles leave the boot's
     threads to the show's own; issued in the first frame after it (lateStep), finished and warmed as the late ones are */
  var LATE_HELD = ['engine.creature', 'engine.glow', 'engine.beam'];
  function lateSeen(n) { return LATE_HELD.indexOf(n) >= 0 && !!LATEK[n.slice(7)]; }   // (one of its kind laid out: it is needed)
  function lateHeld(P) { return !shown && LATE_HELD.indexOf(P.name) >= 0 && lateCan() && !lateSeen(P.name); }
  function lateSeenReady() {   // the show's own: every held program one of whose kind is laid out, finished and warmed
    for (var i = 0; i < PROGS.length; i++) { var P = PROGS[i]; if (lateSeen(P.name) && !lateReady(P)) { lateStep(); lateWarmProgs(); return false; } }   // (the frame loop runs these only once shown: before the show the gate drives them)
    return true;
  }
  function lateStep() {   // the late ones' completion, once a frame after C (never waits)
    if (!LATEP.on || !BOOT.cDone || gl.isContextLost()) return;
    { var iss = false; for (var h = 0; h < PROGS.length; h++) { var Q = PROGS[h]; if (Q.st === 0 && Q.late && (shown || lateSeen(Q.name))) { var c0 = PROGX.compiled, l0 = PROGX.linked; progIssue(Q); PROGX.compiled = c0; PROGX.linked = l0; iss = true; } } if (iss) gl.flush(); }   // (the held ones, issued now)
    for (var i = 0; i < PROGS.length; i++) {
      var P = PROGS[i]; if (!P.late || P.st !== 2) continue;
      var tq = clockNow(), dn = gl.getProgramParameter(P.p, EXT.par.COMPLETION_STATUS_KHR);
      P.polls++; P.qms = +(P.qms + clockNow() - tq).toFixed(2);
      if (gl.isContextLost()) return;
      if (!dn) continue;
      if (progDone(P) === LOSTP) return;
      LATEP.done.push([P.name, P.doneAt, FRAMEN, shown ? 1 : 0]); bootMark('late: ' + P.name + (P.ok ? ' done' : ' broken'));
      if (!P.ok) fail('late program ' + P.name + ' will not link (step 9: never drawn)');
    }
  }
  function lateWarmProgs() {   // (lane D: was lateWarm, the same name as the birds host's own, declared later in the same scope, which replaced this one: no late program was ever warmed, so none could draw) the late ones' warm entries, offscreen, before their first real draw (never in stage G's trials)
    if (!LATEP.on || !WARM.done || !WARM.list || TRIAL || gl.isContextLost()) return;
    var L = WARM.list, T = WARM.tg, any = false, q, x, i, P;
    for (q = 0; q < L.length; q++) {
      x = L[q]; if (x.done || !x.p || !x.p.late || x.p.st !== 3) continue;
      x.done = true; if (!x.p.ok) continue;
      if (!any) { any = true; gl.activeTexture(gl.TEXTURE0); }
      warmDraw(x, T);
    }
    if (any) warmReset();
    for (i = 0; i < PROGS.length; i++) {
      P = PROGS[i]; if (!P.late || P.st !== 3 || !P.ok || P.lateW) continue;
      if (!P.warmed) { for (q = 0; q < L.length; q++) if (L[q].p === P && !L[q].done) break; if (q < L.length) continue; P.warmed = true; }   // (no entry of its own left: its first draw is the real one)
      P.lateW = true; LATEP.warmed.push([P.name, FRAMEN, shown ? 1 : 0]); bootMark('late: ' + P.name + ' warmed');
    }
  }
  function lateBirds() {   // the ink birds' clock starts only once their programs can draw (none of them is in view before it)
    if (LATEP.birdsAt >= 0 || !LATEP.on) return true;
    var ok = true;
    for (var i = 0; ok && i < BIRDPL.length; i++) { var P = BIRDPL[i]; if (P.late && !lateReady(P) && !(P.st === 3 && !P.ok)) ok = false; }
    if (!ok) { LATEP.birdWait++; return false; }
    LATEP.birdsAt = SIM.t; return true;
  }
