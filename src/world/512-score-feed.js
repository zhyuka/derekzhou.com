  /* ---------------------------------------------------------------- the score's feed: the sky, read only */
  /* The sound icon's score (score.js, played only once the visitor presses the icon) follows the sky: its key, its
     changes, the cloud under the view. It asks here about once a second and gets a fresh copy: the sky's clock, the
     order from the sky on show onward (each sky's id, start, hold, change length, and whether its change is far,
     through the mist), how much of the view is the cloud sea (0 the dunes, 1 the cloud), whether the world is held to
     one still frame, and a seed of its own from the visit's one entropy read. It writes nothing here and nothing here
     waits on it: it never steers the world. Before the sky's order exists (no WebGL2, a world not yet made) the
     answer is null. */
  function skyFeed() {
    var seq = SKY.seq, i = SKY.i, out = [], k;
    if (!seq.length || i < 0) return null;
    for (k = i; k < seq.length; k++) out.push({ id: seq[k].id, at: seq[k].at, hold: seq[k].hold, move: seq[k].move, far: !!seq[k].far });
    return { t: SIM.t + SKY.dt, seq: out, wc: MAPS.w ? kitAt(CS.x, CS.z).wC : 0, still: reduced() || STILLMODE, seed: subseed(shown ? SEEDR : J.seed, 97) >>> 0 };   // (the score plays after the cut: the visit's own read)
  }
