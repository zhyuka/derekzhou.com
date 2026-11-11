/* The sound icon: the score's switch (the owner, 2026-11-07: "bring it back, opt-in. using an icon that fits with
   the rest of the design"; and of what it plays, the same day: "music and faint ambiance").

   Every visit starts silent, and this is all that loads before a press: the button is in index.html, hidden until
   this shows it (with no script, or no Web Audio, there is no dead icon). Its one handler is the button's click.
   The first press, inside its own handler (iOS and Safari start audio only there), marks the audio session ambient
   (it mixes with the visitor's own music and keeps the silent switch: a phone on silent stays silent), makes the one
   audio context, and fetches the one recording (SCORE, from this site) and decodes it, once. It plays as a looping
   buffer (gapless, where a media element's loop gaps on iOS) and its level rises over four seconds. A second press
   takes it down over 1.5 s and then lets the audio device go (suspend); a third resumes it and brings it back.
   The button's pressed state is always the truth: a fetch or decode that fails, or a device that will not start in
   3 s, turns it off. Nothing is remembered between visits. The icon's two states are two drawings, swapped at once
   by aria-pressed: no fade, no transition. */
(function () {
  'use strict';

  var button = document.getElementById('sound');
  if (!button || !window.AudioContext || !window.Promise || !window.fetch) return;

  var SCORE = '/assets/sound/score-1.mp3';   // (renamed by hand when its bytes change: changed-bytes-new-name)
  var ON_FADE = 4;      // s: the level rises over this
  var OFF_FADE = 1.5;   // s: and falls over this
  var ctx = null, level = null, loading = null, playing = false, on = false, timer = 0;

  button.hidden = false;
  button.addEventListener('click', function () { if (on) stop(); else start(); });

  function start() {
    if (!ctx) {
      try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
      try { ctx = new AudioContext({ latencyHint: 'playback' }); } catch (e) { ctx = null; return; }
      level = ctx.createGain(); level.gain.value = 0; level.connect(ctx.destination);
    }
    if (!loading) {   // (once; after a failure, the next press asks again)
      loading = fetch(SCORE).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.arrayBuffer();
      }).then(function (a) {
        return new Promise(function (ok, no) { ctx.decodeAudioData(a, ok, no); });
      });
      loading.catch(function () { loading = null; });
    }
    on = true; mark();
    clearTimeout(timer);
    var late = setTimeout(off, 3000);   // (the device must answer in 3 s)
    ctx.resume().then(function () { clearTimeout(late); }, off);
    loading.then(function (buffer) {
      if (!playing) {
        var s = ctx.createBufferSource();
        s.buffer = buffer; s.loop = true; s.connect(level); s.start();
        playing = true;
      }
      if (on) ramp(1, ON_FADE);
    }, off);
  }
  function stop() {
    on = false; mark();
    ramp(0, OFF_FADE);
    clearTimeout(timer);
    timer = setTimeout(function () { if (!on && ctx) ctx.suspend(); }, OFF_FADE * 1000 + 100);
  }
  function off() { if (on) stop(); }
  function ramp(to, s) {   // (from wherever the level is now)
    var p = level.gain, t = ctx.currentTime;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); }
    p.linearRampToValueAtTime(to, t + s);
  }
  function mark() { button.setAttribute('aria-pressed', on ? 'true' : 'false'); }
})();
