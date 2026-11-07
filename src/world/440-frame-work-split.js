  /* ---------------------------------------------------------------- a frame's work, split */
  /* The slice's CPU work (cells laid out, resolved and built; the next visit's CPU stages; cells freed far behind) runs
     after the frame's flush and makes no GL call; the GPU half of it (uploads, bakes under one bake budget, the next
     visit's GPU stages, the GL objects let go, the ground's grid and its read, the probes' batch and its read) runs at
     the start of the next drawn frame, before its draws, so the GPU process encodes it while the script runs on
     (design order, switch order=0), or after that frame's flush (order=1: the A/B the iPhone settles). */
  var WDL = 0;   // (a work deadline, clockNow ms: the boot's slices; 0 in flight)
  /* the GPU jobs each under an AIMD budget: the bake's layers a frame in flight, learnt from the read-back's fence:
     halved when the oldest fence has not signalled at the frame's poll (the GPU a frame and more behind), else grown
     by 4, between 4 and 24 (VOL_LAYERS). The boot's own (BOOT.bake, 6-96) is learnt the same way */
  /* and from the frame's own interval: a frame over 1.5 periods (the period the governor learns) halves it too.
     Where frames are paced by the GPU (SwiftShader; a phone's GPU kept busy) the next frame starts only once the GPU
     is done, so the fence is always signalled at the poll; the interval sees it either way */
  var FBAKE = { n: 24, lagged: 0, halvings: 0, late: 0 };
  function bakeLearn(polled, dtMs) {
    var late = dtMs > 1.5 * GOVN[13] && dtMs < 1000;
    if (!polled && !late) return;
    if ((polled && RB.lagged) || late) { if (polled && RB.lagged) FBAKE.lagged++; if (late) FBAKE.late++; if (FBAKE.n > 4) { FBAKE.n = Math.max(4, FBAKE.n >> 1); FBAKE.halvings++; } }
    else FBAKE.n = Math.min(VOL_LAYERS, FBAKE.n + 4);
  }
  function gpuJobs() {
    freeDrain();
    var V = SIM.V; if (!V) return;
    BAKE.left = READY && shown ? FBAKE.n : BUD.bake;
    kwUpload();   // (the weights' rows baked in the last slice)
    if (SW.stream) {
      cellWork(V, false, 0, 4, 'gpu'); prof('cells.gpu');
    }
    groundRead(); groundCache(V, CS.x, CS.z, false);
    probeFlush(shown ? PROBE_FRAME : PROBE_BOOT); prof('probe');
    if (REC) REC.fr.layers = WORK.layers;
  }
  function cpuSlice() {
    var V = SIM.V; if (!V || !SW.stream) return;
    streamCells(V, CS.x, CS.z, Math.sin(CS.psi), Math.cos(CS.psi), false);
    cellWork(V, false, 0, 4, 'cpu'); prof('cells.cpu');
    kwFollow(CS.x, CS.z, false); prof('weights');   // (the weights' grid kept about the camera, a share a slice)
  }
  function budgets(boot) {   // the frame's counts: the *_BUDGET counts in flight; the boot's, sixteen times them, behind the still sky (and its slices timed)
    BUD.layouts = boot ? 16 * LAYOUT_BUDGET : LAYOUT_BUDGET; BUD.resolves = boot ? 16 * RESOLVE_BUDGET : RESOLVE_BUDGET; BUD.verts = boot ? 16 * VERT_BUDGET : VERT_BUDGET;
    BUD.uploads = boot ? 16 : 1; BUD.bake = boot ? BOOT.bake : VOL_LAYERS;
  }

