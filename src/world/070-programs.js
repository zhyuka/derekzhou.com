  /* ---------------------------------------------------------------- programs */
  /* (E1, design-v5 8.4) every program the page will ever draw with is registered before the world shows, and the boot's
     stage C makes them, one at a time (Fix 2: progStep). After the world shows nothing is compiled, linked or asked (S1, S3;
     fast500 step 9: with the parallel compile the late ones, issued with the rest, have their completion asked after it: lateStep):
     compile() then fails loudly (dev: throws), and the programs' uniforms are the ones read once at the link.
     A context lost under a query is reported as such (LOSTP), never as a broken program. */
  var PROGS = [];   // (every program, in the order registered)
  var PROGX = { compiled: 0, linked: 0, finished: 0, broken: 0, cur: null };   // (stage C's progress, for the boot's timeline; cur: the program in flight, Fix 2)
  function compile(vs, fs, name) {
    if (shown && !STILLMODE) { fail('program ' + name + ' asked for after the world showed (S1)'); if (DEVMODE) throw new Error('S1: program ' + name + ' after show'); }
    var P = { p: null, name: name, u: null, ok: false, vs: vs, fs: fs, v: null, f: null, st: 0 };   // st: 0 registered, 1 compiled, 2 linked (status not asked), 3 finished
    PROGS.push(P);
    return P;
  }
  /* stage C (Fix 2 of round E1: one program at a time). Round E1 first compiled every shader and linked every program
     in as few slices as the calls allowed and then asked their status a frame at a time; but a deadline cannot split a
     call, and where the calls are messages to a GPU process (WebKit, iOS) that was all of them at once: the owner's
     first iPhone record shows one boot frame of 20,442 ms and fifteen programs stamped done within 3 ms of each other
     (round E0's batch). Now one program is in flight at a time: its two shaders given and compiled and the program
     linked, one flush; then nothing else synchronous is asked while it is outstanding (the boot's read-back waits for
     stage E) but its own completion, once a frame (with KHR_parallel_shader_compile a query that never waits for the
     link; without it the link status itself, a frame after the link went out: a wait for that one program alone); the
     next is issued only once it has reported done, in the next frame (Fix 3). The order: the volume programs (vdens, vlight,
     vbody), then the realms' surfaces and landmarks, then the rest as registered. Each program keeps when it was issued
     and when it was found done (clock and frame), its completion queries and their time, so the record can say which
     program is slow (rec.bootStages.programs.one). sync (the harness's stills, a context restored under them): every
     program at once, as before. Returns true once every program is finished, false while not yet, LOSTP if the
     context went; a broken program (its link failed) is finished with ok false and named in fail() */
  var PORDER = null, VOLP = ['engine.vdens', 'engine.vlight', 'engine.vbody'];
  function progOrder() {
    var a = [], b = [], c = [], i, n;
    for (i = 0; i < PROGS.length; i++) {
      n = PROGS[i].name;
      if (VOLP.indexOf(n) >= 0) a.push(PROGS[i]);
      else if (n.indexOf('engine.') !== 0 && n.indexOf('birds:') !== 0 && /\.(surface\d+|landmark|landmarkInst)$/.test(n)) b.push(PROGS[i]);
      else c.push(PROGS[i]);
    }
    a.sort(function (x, y) { return VOLP.indexOf(x.name) - VOLP.indexOf(y.name); });
    if (EXT.parAll) {   // (speed E2: all at once, the heaviest first: the probe and the land's first surface)
      var h = [], r = [], all = a.concat(b, c);
      for (i = 0; i < all.length; i++) (/\.(probe|surface0|hp\.\w+)$/.test(all[i].name) ? h : r).push(all[i]);
      h.sort(function (x, y) { return /probe$/.test(y.name) - /probe$/.test(x.name); });
      return h.concat(r);
    }
    return a.concat(b, c);
  }
  function progIssue(P) {
    var tc = clockNow();
    foldIssue(P);   // (fast500 lane E: the folds, before the text is given)
    P.kb = Math.round((P.vs.length + P.fs.length) / 1024);
    P.p = gl.createProgram();
    P.v = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(P.v, P.vs.replace('#version 300 es\n', '#version 300 es\n' + DEFS + defsA())); gl.compileShader(P.v);
    P.f = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(P.f, P.fs.replace('#version 300 es\n', '#version 300 es\n' + DEFS + defsA())); gl.compileShader(P.f);
    P.vs = P.fs = null; P.st = 1; PROGX.compiled++;
    P.cms = +(clockNow() - tc).toFixed(2);   // (the main thread's share of its compile)
    var tl = clockNow(); gl.attachShader(P.p, P.v); gl.attachShader(P.p, P.f); gl.linkProgram(P.p); P.st = 2; PROGX.linked++; P.lms = +(clockNow() - tl).toFixed(2);
    P.issAt = +tc.toFixed(1); P.issF = FRAMEN; P.polls = 0; P.qms = 0;
  }
  /* (fast500 lane E, class A: e8.py E8z) the page's constant modes as defines, computed once from its own data at the
     first issue and given after DEFS to every program the boot issues (never set by hand; negative, so a program
     compiled without them keeps today's text): NO_TWILIGHT (no two skies' words differ; every sky's words are light, so
     the twilight's low mist in lib-air.glsl, and uTwM, are compiled out: their text stays so that no vertex shader's
     changes), NO_RAIN (no sky's post.rain, no kit's rain), NO_WATER (no realm's GLSL calls waterShade), NO_PKWX (no
     realm's particle set is a weather kind). CLA.dev marks real dev use (DBG, SS > 1 or the dev switch dbg at load;
     never DEVMODE alone, so the audits compile the shipped text): without it uDbg is folded to 0 (foldFixed).
     Restores reuse them (the same text) */
  var CLA = null;
  function claScan(o, d, st) {   // a number > 0 under a key 'rain' anywhere in a kit (its lights, areas, kits)
    if (!o || typeof o !== 'object' || d > 8 || ArrayBuffer.isView(o) || st.seen.indexOf(o) >= 0) return false;
    st.seen.push(o);
    for (var k in o) {
      if (++st.n > 50000) return true;   // (too big to read: taken as raining)
      var v = o[k];
      if (k === 'rain' && typeof v === 'number' && v > 0) return true;
      if (v && typeof v === 'object' && claScan(v, d + 1, st)) return true;
    }
    return false;
  }
  function claCompute() {
    var c = { twilight: false, rain: false, water: false, pkinds: [], pkUnknown: false, dev: false }, id, ws = {}, nw = 0, st = { seen: [], n: 0 }, i, j;
    for (id in WSKY) { var S = WSKY[id]; if (!ws[S.w]) { ws[S.w] = 1; nw++; } if (S.post && S.post.rain) c.rain = true; }
    c.twilight = nw > 1;
    for (id in KITS) if (!c.rain && claScan(KITS[id], 0, st)) c.rain = true;
    for (i = 0; i < ORDER.length; i++) {
      var d = REALMS[ORDER[i]]; if (!d) continue;
      if (/\bwaterShade\s*\(/.test(d.glsl || '')) c.water = true;
      var p = d.particles, L = null;
      if (typeof p === 'function') { try { L = p({ wind: [0, 0], seed: 0, def: d }, RNG(1)); } catch (e) { L = null; } } else L = p || [];
      if (!L || typeof L.length !== 'number') { c.pkUnknown = true; continue; }
      for (j = 0; j < L.length; j++) {
        var o = L[j] || {}, k = o.kind !== undefined ? (typeof o.kind === 'number' ? o.kind : PKIND[o.kind]) : (o.hop && o.hop.length > 3 ? +o.hop[3] : 0);
        if (!(k >= 0)) { c.pkUnknown = true; continue; }
        if (c.pkinds.indexOf(k) < 0) c.pkinds.push(k);
      }
    }
    c.pkinds.sort(function (a, b) { return a - b; });
    c.dev = !!DEVMODE && (DBG !== 0 || SS > 1 || /(^|[\s,;])dbg(=|[\s,;]|$)/.test(String(OPT.sw || '')));
    return c;
  }
  function claWx(c) { return c.pkUnknown || c.pkinds.some(function (k) { return k > 2.5; }); }
  function defsA() {
    if (!CLA) { CLA = claCompute(); CLA.defs = (CLA.twilight ? '' : '#define NO_TWILIGHT\n') + (CLA.rain ? '' : '#define NO_RAIN\n') + (CLA.water ? '' : '#define NO_WATER\n') + (claWx(CLA) ? '' : '#define NO_PKWX\n'); }
    return CLA.defs;
  }
  function progDone(P) {   // its status read (and its uniforms): true linked, false broken, LOSTP
    var tf = clockNow(), r = finish(P);
    if (r === LOSTP) return LOSTP;
    P.fms = +(clockNow() - tf).toFixed(2); P.doneAt = +clockNow().toFixed(1); P.doneF = FRAMEN;
    PROGX.finished++; if (!r) PROGX.broken++;
    if (self.PROBE) self.PROBE('link: ' + P.name, clockNow());   // (PREVIEW ONLY)
    return r;
  }
  function progStep(sync, deadline) {
    var i, P;
    if (gl.isContextLost()) return LOSTP;
    if (sync) {
      for (i = 0; i < PROGS.length; i++) if (PROGS[i].st === 0) progIssue(PROGS[i]);
      gl.flush();
      for (i = 0; i < PROGS.length; i++) { P = PROGS[i]; if (P.st === 2 && progDone(P) === LOSTP) return LOSTP; }
      return true;
    }
    if (!PORDER || PORDER.length !== PROGS.length) PORDER = progOrder();
    /* (speed E2) with KHR_parallel_shader_compile every program is issued in one frame, the heaviest first (the probe
       and the land: the critical path), and each one's completion asked once a frame, without waiting; its status
       read as it completes. Without the extension (not WebKit) all at once too, their statuses read one a frame (EXT.issueAll);
       on WebKit (it has it, but links there are synchronous: E10), one at a time */
    if (EXT.parAll) {
      var issued = false;
      for (i = 0; i < PORDER.length; i++) if (PORDER[i].st === 0 && !lateHeld(PORDER[i])) { progIssue(PORDER[i]); issued = true; }
      if (issued) { gl.flush(); if (!BOOT.issuedM) { BOOT.issuedM = true; bootMark('start: issued (' + PROGS.length + ' programs)'); } return false; }   // (fast500 F0)
      var all = true; lateDecide();   // (fast500 step 9)
      for (i = 0; i < PORDER.length; i++) {
        P = PORDER[i]; if (P.st === 3) continue;
        if (P.st !== 2) { if (!(P.st === 0 && P.late)) all = false; continue; }   // (world-perf lane: a held one, late, does not hold the show)
        var tq2 = clockNow(), dn = gl.getProgramParameter(P.p, EXT.par.COMPLETION_STATUS_KHR);
        P.polls++; P.qms = +(P.qms + clockNow() - tq2).toFixed(2);
        if (gl.isContextLost()) return LOSTP;
        if (!dn) { if (!P.late) all = false; continue; }   // (fast500 step 9: a late one does not hold the show)
        if (progDone(P) === LOSTP) return LOSTP;
      }
      return all && (progsDone() || lateCore());
    }
    if (EXT.issueAll) {   // (lane D, Android item 1: EXT.issueAll) all issued in one frame, then one status read a frame
      var iss = false;
      for (i = 0; i < PORDER.length; i++) if (PORDER[i].st === 0) { progIssue(PORDER[i]); iss = true; }
      if (iss) { gl.flush(); if (!BOOT.issuedM) { BOOT.issuedM = true; bootMark('start: issued (' + PROGS.length + ' programs)'); } return false; }
      for (i = 0; i < PORDER.length; i++) if (PORDER[i].st === 2) return progDone(PORDER[i]) === LOSTP ? LOSTP : false;
      return progsDone();
    }
    P = PROGX.cur;
    if (P) {   // the one in flight: its completion, once a frame
      if (EXT.par) {
        var tq = clockNow(), done = gl.getProgramParameter(P.p, EXT.par.COMPLETION_STATUS_KHR);
        P.polls++; P.qms = +(P.qms + clockNow() - tq).toFixed(2);
        if (gl.isContextLost()) return LOSTP;
        if (!done) return false;
      }
      if (progDone(P) === LOSTP) return LOSTP;
      PROGX.cur = null;
      // (Fix 3) the next one is issued in the next frame: a frame carries one program's calls (its issue, or its
      // completion read), so the record can name the one program a long frame belongs to (Fix 2 read one and issued
      // the next in the same frame, and booked the frame to both)
      for (i = 0; i < PORDER.length; i++) if (PORDER[i].st === 0) return false;
      for (i = 0; i < PROGS.length; i++) if (PROGS[i].st !== 3) return false;
      return true;
    }
    for (i = 0; i < PORDER.length; i++) if (PORDER[i].st === 0) break;
    if (i >= PORDER.length) { for (i = 0; i < PROGS.length; i++) if (PROGS[i].st !== 3) return false; return true; }
    P = PORDER[i]; progIssue(P); gl.flush(); PROGX.cur = P;
    if (!BOOT.issuedM) { for (i = 0; i < PORDER.length && PORDER[i].st !== 0; i++) { /* the next unissued */ } if (i >= PORDER.length) { BOOT.issuedM = true; bootMark('start: issued (' + PROGS.length + ' programs)'); } }   // (fast500 F0: the one-at-a-time path's last issue)
    return false;
  }
  function progsDone() { for (var i = 0; i < PROGS.length; i++) if (PROGS[i].st !== 3) return false; return true; }

  /* (fast500 step 9, the owner's "Finish code after show": only programs for things not in view; e9.py) S1 becomes:
     every program registered and issued before the world shows, the late ones' completion polled after it. Only with
     the parallel compile (EXT.parAll), never in the stills, forced colours or a restored context. The late set: the ink
     birds' (birds:ink), always (no ink bird is in view at the show, and their clock now waits for them: lateBirds); the world's particles and ribbons where the realm draws them by the sand under the
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
      if (LATE_ALWAYS.indexOf(n) >= 0 || (LATEP.decided && LATEP.sand <= LATE_SAND && (n === V.def.id + '.particle' || n === V.def.id + '.ribbon'))) { P.late = true; LATEP.names.push(n); }
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
  function latePartsWould(V) {   // would any of the particles' sets draw this frame (drawFrame's own test)
    var LL = V.L || V.light, sk = V.def.sandFx ? sandAt() : 1;
    for (var pi = 0; pi < V.parts.length; pi++) {
      var pa = V.parts[pi], share = 1, kd = pa.hop[3];
      if (pa.areas && V.LA) { share = 0; for (var ai = 0; ai < pa.areas.length; ai++) { var ax = V.areaIx[pa.areas[ai]]; if (ax !== undefined) share += V.aw[ax]; } }
      if (pa.rainScale) share *= LL.rain;
      if (share * sk <= 0.002) continue;
      if ((kd < 2.5 ? Math.round(pa.count * TIER * share) : Math.round(pa.count * TIER)) > 0) return true;
    }
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
  /* (fast500 lane E, the folds: ef.py) a uniform, or one component of it, whose value is fixed for the page is written
     into the program's text at its issue as the literal it always has, so the compiler folds the branch it selects.
     Declarations are never touched (their lines start "uniform"): a location stays, or goes inactive where nothing reads
     it, and every set of such a uniform is guarded. Class A (EF1): uDbg 0 where the defines say no dev use (CLA.dev).
     Class B (EFB, the parallel compile only): the composite's per-device modes, with the general composite late beside
     it (foldPick). A token a program does not hold is passed over (FOLDX.absent) */
  var FOLDX = { on: false, fixed: null, prog: {}, absent: {}, live: null, miss: 0, misses: [], used: 0, B: false };
  function foldFixed() {
    if (FOLDX.fixed) return FOLDX.fixed;
    defsA();
    var f = [];
    if (!CLA.dev) f.push(['uDbg', '0']);
    FOLDX.fixed = f; FOLDX.on = true;
    return f;
  }
  function foldTok(s, tok, lit) {   // every use of tok outside a declaration line, as lit
    var n = 0;
    if (tok.charAt(0) === '=') { var parts = s.split(tok.slice(1)); n = parts.length - 1; return { s: n ? parts.join(lit) : s, n: n }; }
    if (s.indexOf(tok) < 0) return { s: s, n: 0 };
    var re = new RegExp('\\b' + tok.replace('.', '\\.') + '(?![\\w.])', 'g');
    var out = s.replace(re, function (m, off) { var ls = s.lastIndexOf('\n', off) + 1; if (/^\s*uniform\b/.test(s.slice(ls, ls + 24))) return m; n++; return lit; });
    return { s: out, n: n };
  }
  function foldIssue(P) {   // (progIssue) the folds into P.vs and P.fs before they are given
    if (P.vs === null) return;
    var vs = P.vs, fs = P.fs, got = [], abs = [];
    function one(list) {
      var kept = [];
      for (var i = 0; i < list.length; i++) {
        var a = foldTok(vs, list[i][0], list[i][1]), b = foldTok(fs, list[i][0], list[i][1]);
        if (a.n + b.n) { vs = a.s; fs = b.s; got.push(list[i][0].replace(/^=/, '') + ' = ' + list[i][1]); kept.push(list[i]); } else abs.push(list[i][0].replace(/^=/, ''));
      }
      return kept;
    }
    one(foldFixed());
    P.vs = vs; P.fs = fs;
    if (got.length) FOLDX.prog[P.name] = got;
    if (abs.length && DEVMODE) FOLDX.absent[P.name] = abs;
  }
  var UNITS = { uN3: 0, uKW: 1, uDepth: 2, uScene: 3, uCloud: 4, uBloom: 5, uShaft: 6, uTex: 7, uTex2: 8, uTex3: 8, uLinD: 9, uVol: 10, uGround: 11, uWin: 13, uPts: 7, uHist: 14, uSceneH: 15, uHP0: 16, uHP1: 17, uHP2: 18, uHP3: 19, uHP4: 20 };
  function finish(P) {   // true: linked; false: broken; LOSTP: the context was lost (asked again after the restore)
    if (P.st === 3) return P.ok;
    if (P.st !== 2) return false;
    if (gl.isContextLost()) return LOSTP;
    var st = gl.getProgramParameter(P.p, gl.LINK_STATUS);
    if (st === null || gl.isContextLost()) return LOSTP;
    if (!st) {
      var log = P.name + ': ' + (gl.getShaderInfoLog(P.v) || '') + ' / ' + (gl.getShaderInfoLog(P.f) || '') + ' / ' + (gl.getProgramInfoLog(P.p) || '');
      if (gl.isContextLost()) return LOSTP;
      fail(log); P.u = {}; P.ok = false; P.st = 3; return false;
    }
    var u = {}, n = gl.getProgramParameter(P.p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var a = gl.getActiveUniform(P.p, i); if (a) u[a.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(P.p, a.name); }
    P.u = u; P.ok = true; P.st = 3;
    if (REC) recLink(P, true);   // (E0: each link's completion, for the boot's timeline)
    gl.useProgram(P.p);
    for (var k in UNITS) if (u[k]) gl.uniform1i(u[k], UNITS[k]);
    gl.deleteShader(P.v); gl.deleteShader(P.f); P.v = P.f = null;
    return true;
  }

