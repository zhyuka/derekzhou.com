/* The sound icon: the score's switch (the owner, 2026-11-07: "bring it back, opt-in. using an icon that fits with
   the rest of the design").

   Every visit starts silent, and this is all that loads before a press: the button is in index.html, hidden until
   this shows it (with no script, or no Web Audio, there is no dead icon). Its one handler, the button's click: the
   first press, inside its own handler (iOS and Safari start audio only there), marks the audio session ambient (it
   mixes with the visitor's own music and keeps the silent switch: a phone on silent stays silent), makes the audio
   context and resumes it, strikes the thread at once (D and A, softly: in key with every light) and fetches the
   score (score.js) into the empty script slot after the footer; the score hands itself back (SOUND.score) and comes
   in over three seconds. A second press takes it out over 1.2 s and lets the audio device go; a third brings it back.
   The button's pressed state is always the truth: the device is given 3 s to start, then its clock must move (a
   WebKit fault: running, and silent); if not, it is tried once more and then shown off. If the score cannot be
   fetched (offline at the press), the icon goes off. Nothing is remembered between visits. The icon's two states
   are two drawings, swapped at once by aria-pressed: no fade, no transition. */
(function () {
  'use strict';

  var button = document.getElementById('sound');   // (the score's slot, after the last script, is found at the press)
  if (!button || !window.AudioContext || !window.Promise) return;

  var ON_FADE = 3;            // s: the score comes in over this
  var OFF_FADE = 1.2;         // s: and goes over this
  var WAIT = 15;              // s: the score's script is waited for this long
  var THREAD = [587.33, 880.99];   // Hz: D5 and A5 (the score's D, 293.665 Hz, and its pure fifth): in every light's key
  var ctx = null, level = null, music = null, make = null, asked = false, failed = false, on = false, timer = 0, tries = 0, bell = null;
  var starting = null, stale = null, attempt = 0;   // (a resume in flight, one given up on that has not answered, and which try it is)

  self.SOUND = { score: function (fn) { if (!make && typeof fn === 'function') make = fn; } };   // (score.js hands itself here)
  button.hidden = false;
  button.addEventListener('click', function () { if (on) stop(); else start(); });

  function start() {
    if (!ctx) {
      try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
      try { ctx = new AudioContext({ latencyHint: 'playback' }); } catch (e) { ctx = null; return; }
      level = ctx.createGain(); level.gain.value = 0; level.connect(ctx.destination);
    }
    on = true; tries = 0; mark();
    begin();
    chime(ctx.currentTime + 0.03);
    fade(1, ON_FADE, false);
    if (failed) { broken(); return; }
    if (music) music.wake();
    else if (!asked) {
      var slot = document.getElementById('score-slot');
      asked = true;
      if (slot) slot.src = '/score.js';   // (an empty script slot given its src: the browser fetches and runs it once)
      waitFor(Math.round(WAIT * 10));
    }   // (an empty script slot given its src: the browser fetches and runs it once)
  }
  function waitFor(n) {
    if (make) { music = make(ctx, level); if (on) music.wake(); return; }
    if (n <= 0) { failed = true; broken(); return; }
    setTimeout(function () { waitFor(n - 1); }, 100);
  }
  function stop() { on = false; mark(); fade(0, OFF_FADE, true); }

  /* the level, ramped from where it is; then, faded out, the score rests and the device is let go (once any start
     in flight has answered: never suspended mid-start) */
  function fade(to, s, then) {
    var p = level.gain, t = ctx.currentTime;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); }
    p.linearRampToValueAtTime(to, t + s);
    if (!to && bell) hush(bell.gain, t, ctx.state === 'running' ? Math.min(s, 0.04) : 0);   // (the chime goes with it)
    clearTimeout(timer);
    if (then) timer = setTimeout(function () {
      (starting || stale || Promise.resolve()).then(function () {
        if (on || !ctx) return;
        if (music) music.rest();
        ctx.suspend();
      });
    }, s * 1000 + 100);
  }
  function hush(p, t, s) {
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); }
    if (s > 0) p.linearRampToValueAtTime(0, t + s); else p.setValueAtTime(0, t);
  }
  /* the thread, struck: two soft glass notes (a free bar's modes), on a level of their own beside the score's, so the
     press is heard at once while the score is still on its way, and a stop silences it too */
  function chime(t) {
    var i, j, o, g, b, P = [[1, 1, 2.2], [2.756, 0.32, 1], [5.404, 0.1, 0.45]];
    if (bell) hush(bell.gain, ctx.currentTime, 0.04);   // (a chime still ringing from an earlier press: gone under the new one)
    b = bell = ctx.createGain(); b.connect(ctx.destination);
    for (i = 0; i < 2; i++) for (j = 0; j < 3; j++) {
      o = ctx.createOscillator(); g = ctx.createGain();
      o.frequency.value = THREAD[i] * P[j][0]; g.gain.value = 0;
      g.gain.setValueAtTime(0, t + i * 0.16); g.gain.linearRampToValueAtTime(0.075 * P[j][1], t + i * 0.16 + 0.005);
      g.gain.setTargetAtTime(0, t + i * 0.16 + 0.005, P[j][2] / 6.9);
      o.connect(g); g.connect(b); o.start(t + i * 0.16); o.stop(t + i * 0.16 + P[j][2] + 0.1);
    }
  }
  /* the truth of it: the start, judged by the resume's own answer (3 s allowed); then, running, the clock must move.
     If not, once more from the top (suspend, resume), then off */
  function begin() {
    if (starting || !ctx) return;
    if (ctx.state === 'running') { moving(++attempt); return; }
    var mine = ++attempt, s, late = setTimeout(function () { if (mine === attempt && starting === s) { stale = s; starting = null; attempt++; broken(); } }, 3000);
    function settled() { clearTimeout(late); if (starting === s) starting = null; stale = null; }
    s = starting = ctx.resume().then(function () { settled(); if (mine === attempt) moving(mine); },
      function () { settled(); if (mine === attempt) retry(); });
  }
  function moving(mine) {
    var at = ctx.currentTime;
    setTimeout(function () {
      if (mine !== attempt || !on || !ctx || starting) return;
      if (ctx.state === 'interrupted') return;   // (a call: it comes back by itself)
      if (ctx.state === 'running' && ctx.currentTime - at > 0.25) return;
      retry();
    }, 900);
  }
  function retry() {
    if (!on || !ctx) return;
    if (tries++ < 1) { ctx.suspend().then(begin, broken); return; }
    broken();
  }
  function broken() { if (!on) return; on = false; mark(); if (ctx) fade(0, 0.3, true); }
  function mark() { button.setAttribute('aria-pressed', on ? 'true' : 'false'); }
})();
