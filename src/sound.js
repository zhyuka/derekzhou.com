/* The sound icon: the score's switch (the owner, 2026-11-07: "bring it back, opt-in. using an icon that fits with
   the rest of the design"; of what it plays, the same day: "music and faint ambiance"; and 2026-11-12, "ship it", of
   the live score that follows the sky: score.js).

   Every visit starts silent, and this is all that runs before a press: the button is in index.html, hidden until
   this shows it (with no script, or no Web Audio, there is no dead icon). Its one handler is the button's click.
   The first press, inside its own handler (iOS and Safari start audio only there), marks the audio session playback
   (the owner, 2026-11-12: "yes switch it to playback": heard with the ringer off, as a video is, and the visitor's own
   music pauses, as it does for a video), makes the one
   audio context, fetches the one sheet of notes (SHEET, from this site) and decodes it, once, and hands both to the
   score (score.js, loaded deferred), which fills its room and air a step at a time and then plays on them,
   following the sky; this keeps it going, about twice a second, on the audio context's own clock. The level rises over four seconds. A second press takes it down over
   1.5 s and then lets the audio device go (suspend); a third resumes it and brings it back.
   The button's pressed state is always the truth: a fetch or decode that fails, no score, or a device that will not
   start in 3 s turns it off. Nothing is remembered between visits. The icon's two states are two drawings, swapped at
   once by aria-pressed: no fade, no transition. */
(function () {
  'use strict';

  var button = document.getElementById('sound');
  if (!button || !window.AudioContext || !window.Promise || !window.fetch) return;

  var SHEET = '/assets/sound/notes-4.mp3';   // (tools/sound/sheet.py writes it; a new name when its bytes change: changed-bytes-new-name)
  var ON_FADE = 4;      // s: the level rises over this
  var OFF_FADE = 1.5;   // s: and falls over this
  var BPS = 12000;      // (the sheet's bytes a second: 96 kbps, tools/sound/sheet.py)
  var ctx = null, level = null, loading = null, first = null, sc = null, score = null, on = false, timer = 0;

  button.hidden = false;
  button.addEventListener('click', function () { if (on) stop(); else start(); });

  function start() {
    if (!ctx) {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      var opt = /** @type {AudioContextOptions} */ ({ latencyHint: 'playback', sampleRate: 24000 });   // (24 kHz: nothing in the score is above 4 kHz; half the work and memory)
      for (var k = 0; k < 2 && !ctx; k++) { try { ctx = new AudioContext(opt); } catch (e) { delete opt.sampleRate; } }   // (a browser that will not take the rate: its own)
      if (!ctx) return;
      level = ctx.createGain(); level.gain.value = 0; level.connect(ctx.destination);
    }
    if (!loading) {   // (once; after a failure, the next press asks again)
      if (!sc && window.SCORE) sc = window.SCORE.play(ctx, level, null, true);   // (its room and air filled while the sheet comes)
      var got = /** @type {any} */ (null); first = new Promise(function (ok) { got = ok; });
      loading = load(function (b, up) { if (!sc) { if (!window.SCORE) throw new Error('no score'); sc = window.SCORE.play(ctx, level, null, true); } sc.more(b, up); got(); });
      loading.catch(function () { loading = null; });
    }
    on = true; mark();
    clearTimeout(timer);
    var late = setTimeout(off, 3000);   // (the device must answer in 3 s)
    ctx.resume().then(function () { clearTimeout(late); }, off);
    loading.catch(off);
    Promise.race([first, loading]).then(function () {   // (the sheet's first part decoded: the score may begin)
      if (!score) {   // (once; after a failure, the next press asks again)
        var s = sc;
        score = s.ready.then(function () {
          s.tick(ctx.currentTime);
          setInterval(function () { s.tick(ctx.currentTime); }, 500);   // (it plans ten seconds ahead; this keeps it ahead)
        });
        score.catch(function () { score = null; });
      }
      return score;
    }).then(function () { if (on) ramp(1, ON_FADE); }).catch(off);
  }
  /* the one fetch, read as it arrives: at each of the score's cuts (the sheet's seconds up to its first parts, the notes
     it needs first) a decode of what has come so far, handed to it with how much of the sheet that is; then the whole.
     With no stream to read, or no score yet to name its cuts, the whole at once, as before */
  function load(give) {
    return fetch(SHEET).then(function (r) {
      if (!r.ok) throw new Error(/** @type {any} */ (r.status));
      var cuts = window.SCORE ? window.SCORE.cuts.map(function (t) { return Math.ceil((t + 0.5) * BPS) + 2048; }) : [], rd = r.body && r.body.getReader && cuts.length ? r.body.getReader() : null;
      if (!rd) return r.arrayBuffer().then(decode).then(function (b) { give(b); });
      var parts = /** @type {Uint8Array[]} */ ([]), n = 0, k = 0;
      function join() { var a = new Uint8Array(n), o = 0; parts.forEach(function (p) { a.set(p, o); o += p.length; }); parts = [a]; return a; }
      function next() {
        return rd.read().then(function (x) {
          if (x.done) return decode(join().buffer).then(function (b) { give(b); });
          parts.push(x.value); n += x.value.length;
          for (; k < cuts.length && n >= cuts[k]; k++) decode(join().slice().buffer).then(function (b) { give(b, b.duration - 0.5); }, function () { /* the whole will come */ });
          return next();
        });
      }
      return next();
    });
  }
  function decode(a) { return new Promise(function (ok, no) { ctx.decodeAudioData(a, ok, no); }); }
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
