  /* ---------------------------------------------------------------- the read-back ring (E1, design-v5 7.5) */
  /* Everything the CPU must learn from the GPU (the ground under the cells' items, the camera's ground about it) comes
     back through one ring of three pixel-pack buffers of 64 KB, with one fence a frame:
       1. at a frame's start, only the oldest pending fence is polled, once (clientWaitSync, timeout 0);
       2. if it has signalled, one getBufferSubData of its slot (64 KB or less) into one reused array, then deleteSync;
       3. then fenceSync for the work since the last fence (the switch: at the frame's start, after its flush, every
          second frame, or all but off);
       4. a frame's readPixels go into the slot being filled; if no slot is free (the GPU two frames and more behind)
          the frame's reads are skipped, never waited for: the batch stays queued.
     Data arrive two or three frames old. Round 3b made up to 7 polls and 3 reads a frame, about 100 fences a minute, and
     a new pixel buffer and Uint8Array a batch (audit 3.2). The fence also gives the frame's GPU signal: was the oldest
     fence still unsignalled at this frame's start (the record's gpu tag; the boot's budgets).
     (dev) RBFIX: the oldest slot is read exactly two of the loop's frames after its fence, waited for if the GPU is
     slower: a film or a fast flight then sees the same ground whatever the GPU's speed (E0's jwfast was not
     deterministic for want of it). Never in production. */
  var RB_N = 3, RB_SLOT = 65536, RB_FENCES = 4;
  var RB = { slots: [], fences: [], buf: new Uint8Array(RB_SLOT), lagged: false, lastPoll: -1, made: 0, polled: 0, reads: 0, readBytes: 0, skipped: 0, fenceSkipped: 0, lagN: 0, fix: false };
  function rbInit() {
    RB.slots = []; RB.fences = []; RB.lagged = false;
    for (var i = 0; i < RB_N; i++) {
      var b = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, b); gl.bufferData(gl.PIXEL_PACK_BUFFER, RB_SLOT, gl.STREAM_READ);
      RB.slots.push({ pbo: b, used: 0, ents: [], st: 0, frame: -1 });   // st: 0 free, 1 filling, 2 fenced
    }
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  }
  function rbForget() { RB.slots = []; RB.fences = []; RB.lagged = false; }   // (a lost context: everything went with it)
  /* the slot this frame fills, with room for `bytes` (null: none free) */
  function rbSlot(bytes) {
    var i, S;
    for (i = 0; i < RB.slots.length; i++) { S = RB.slots[i]; if (S.st === 1) return S.used + bytes <= RB_SLOT ? S : null; }
    for (i = 0; i < RB.slots.length; i++) { S = RB.slots[i]; if (S.st === 0) { S.st = 1; S.used = 0; S.ents.length = 0; S.frame = FRAMEN; return bytes <= RB_SLOT ? S : null; } }
    RB.skipped++;
    return null;
  }
  /* a rectangle of the bound read framebuffer into the slot (RGBA bytes), its entry kept for the delivery */
  function rbRead(S, x, y, w, h, ent) {
    ent.off = S.used; ent.bytes = w * h * 4;
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, S.pbo);
    gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, S.used);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    S.used += ent.bytes; S.ents.push(ent);
    if (REC) REC.fr.rbBytes += ent.bytes;
  }
  /* the fence: covers everything since the last one (the filling slot is now its).
     (iPhone fix) and sent on to the GPU at once: a fence polled with clientWaitSync(.., 0, 0) signals only once the
     commands before it are flushed, and WebKit flushes a context only when it presents a frame. While the world boots
     its canvas is hidden and nothing is presented, so on every iPhone the landing's probe (vsOriginRead) waited for
     ever and the still sky stayed (measured on the owner's iPhone, 2026-11-04: stuck at "F warmed" for 280 s; with
     this flush the world was ready 5 s after load). Chrome and Firefox flush by themselves */
  function rbFence() {
    if (RB.fences.length >= RB_FENCES) { RB.fenceSkipped++; return; }
    var f = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0), S = null;
    gl.flush();
    for (var i = 0; i < RB.slots.length; i++) if (RB.slots[i].st === 1) { S = RB.slots[i]; S.st = 2; break; }
    RB.fences.push({ s: f, slot: S, frame: FRAMEN }); RB.made++;
  }
  /* the poll: the oldest fence, once; its slot read if it has signalled */
  function rbPoll() {
    RB.lagged = false;
    if (!RB.fences.length) return;
    var F = RB.fences[0], r;
    if (RB.fix) {   // (dev: delivered exactly two frames after its fence, whatever the GPU's speed)
      if (FRAMEN - F.frame < 2) return;
      RB.polled++; r = gl.clientWaitSync(F.s, 0, 0);
      /* (Fix 2 of round E1) inside one long JavaScript task (the harness's ticks) WebGL 2 never changes a fence's
         status, so the slot is read unconditionally two frames on: the read itself waits for the data (dev only; the
         harness's counts of the ring are then its own, not the loop's: RB.forced) */
      if (r === gl.TIMEOUT_EXPIRED) { RB.forced = (RB.forced || 0) + 1; r = gl.CONDITION_SATISFIED; }
    } else { RB.polled++; r = gl.clientWaitSync(F.s, 0, 0); }
    if (r === gl.TIMEOUT_EXPIRED) { RB.lagged = true; RB.lagN++; return; }
    if (r === gl.WAIT_FAILED) { RB.fences.shift(); return; }   // (a context lost under it)
    gl.deleteSync(F.s); RB.fences.shift();
    var S = F.slot; if (!S) return;
    if (S.used > 0) {
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, S.pbo);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, RB.buf, 0, S.used);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      RB.reads++; RB.readBytes += S.used;
      for (var i = 0; i < S.ents.length; i++) rbDeliver(S.ents[i]);
    }
    S.st = 0; S.used = 0; S.ents.length = 0;
  }
  function rbDeliver(e) { if (e.k === 'probe') probeLand(e); else if (e.k === 'ground') groundHalf(e); else if (e.k === 'words') wordsGroundDeliver(e); else if (e.k === 'birds') birdsGroundDeliver(e); }

