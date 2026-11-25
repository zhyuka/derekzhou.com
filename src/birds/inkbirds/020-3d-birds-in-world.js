  /* ---------------- the world's numbers for the birds ---------------- */

  var B_SPAN = 3.2;            // m: a mid bird's span (size 1); every kind by its SORTS size (a heron 4.5 m, a finch 2 m)
  var NEARMOST = 0.6;          // of the bird's span: the land in front of a bird hides it past this far in front of its body
  var CLOUD_IN = 14;           // m of a cloud's visible lobes between the camera and a bird: its cover over the bird counted fully
  var MAXP = 96;               // birds the draw's stores hold at first (twice as many each time more are in view: never a bird left undrawn)
  /* the wing's beat rate by class (labbird.js RATE_CLASS; the owner, 2026-11-04) and its measured flap-glide schedule */
  var RATE_MODE = 'class', SCHED_MODE = 'measured';
  var FORCED = false;          // forced colours: the birds alone, in CanvasText at full ink, in their own still view (the world is not drawn)
