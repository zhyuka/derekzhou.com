// The comments in this file keep the tags and file names of the world's development record (design-v5, its rounds,
// fixes and judges; notes.md, w04b_sky.js, diag.js and the like), which lives outside this repository (CLAUDE.md).
/* inkbirds.js — the ink birds of the live site (birds.v9.js), living in the world.

   (physics, 2026-11-03) THE MEASURED WING. The owner, of the last beat: "the wings too stiff still... did u even study
   how birds flap..?! rsearch exact physics and replicate exactly". Every bird is now the faceted M (facetform.js,
   facetpose.js: the tattoo's M as a low-poly solid, per wing an arm panel and a hand panel either side of the wrist's
   fold, a bevelled leading edge, three tip pleats; labbird.js bends each pleat as a tapered feather and parts the
   notched kinds' fingers into slots: 46 vertices, 58 triangles, 30 facets) flown by the physics lab's measured wing
   (physics/lab: wingmodel.js and model.js, the per-kind joint curves from measured kinematics through a skeleton rig;
   labbird.js, the measured flap-glide schedules, beat-to-beat, bout-to-bout and bird-to-bird variation, the ibis V's
   wake-bout phasing; all byte for byte), made lazy for the world by birdwing.js (the lab's own loop, statement for
   statement). What changed here: the wings (wingsOf: one measured wing a bird; the schedule's bouts for the path's
   sink), the pose (poseBird: BW.poseS, LB.geom), the boxes (measureNorm: every vertex of the lab's poses), the light
   (lightBird: facetpose's per-facet light and its one tone), the pass (46 points and 30 facet lights a bird in a
   texture; the coverage over 58 triangles, the nearest facet per pixel, mix(one tone, facet, lodK)) and the dev's
   dumps and dials (rate, sched). The planner, the paths, the wind, the keep-outs, the hold, the occlusion, the words'
   keep-off, the night's halo, the calm: the shape round's, unchanged.

   (birds3d, 2026-10-27) THE PAPER BIRDS. The ink is gone from the drawing: every bird is now a 3D cut-paper body with
   two wings hinged at the shoulder and the wrist (birdform.js, posed by birdpose.js), beating at its kind's real rate,
   its attitude physical (the body along its world velocity, rolled by the coordinated bank its own acceleration asks),
   lit by the world's own light (white on blue, a grey tick on bright cloud, darker backlit; at night a light of its own
   and a soft halo), drawn by one instanced pass of exact coverage (section "the paper"). The planner, the paths, the
   beat's schedule, the tracker and the hooks below are the ink's, with the 3D boxes (measureBird3D), a side-on gate and
   the tattoo's view preferred, and three staged moments (section "the staging": S3, S1, S2). What the comments below
   say of the ink's drawing (its pen, the boil, the facing, the lens) describes round 1-3's ink, kept for the record.

   The owner, of the world: "And there should still be birds that are drawn/constructed in the same style as before
   (what's currently live in prod) but 3d-ified (but just enough to fit with everything else. So that might mean adding
   some "extra" fx to them)".

   THE SAME BIRDS. Everything birds.v9.js decides is decided here by its own code, carried over: the kinds (SORTS: their
   sizes, paces, wing-beats from field data, flap and glide, bounds, tails), every bird its own drawing in the tattoo's
   hand (drawBird: an "M" gull stood on a steep diagonal, its rises and drops reading as steps), the flights (skeins,
   lines, pairs, loose flocks, lone birds, thermals; gathering and loosening, stragglers, pairs changing sides), the
   calm (spans a second slowed to the page's calm, mostly gliding, few birds, empty sky), the planner (a path flown
   whole in thought before a bird enters: clear of the words, of the edges it does not cross, of the other flights, one
   flight to a band), the rhythm (at most two flights, three on a wide sky; the first within a second or two; the gaps;
   the sky thinning), the hand (round-capped strokes, the pose redrawn 12 times a second on twos, the boil re-rolled 6
   times a second, the bird gliding smoothly between drawings), the facing with its hysteresis, the appear.

   3D-IFIED. The live window was a camera looking out at the sky from a still place; here the camera flies through the
   world. Each flight flies in a frame that travels with the camera (its place and height, exactly: no flight looms as
   the camera flies on) but keeps its own heading in the world, fixed when it is planned (round 2): a turn of the view,
   the autopilot's or the visitor's, sweeps the birds across the window with the land, and the camera can turn to a
   flight or away from it. The planner sees the camera's coming turn (HOST.ahead: the autopilot's course) and flies
   every path through it before a bird enters, so the birds still enter beyond an edge or out of the distance, keep
   clear of the words and of each other where they will be seen, and leave the same way; their calm (pace, turns,
   growth) is the live's, judged against the world (the camera held still). A flight the view has left behind, or one
   the clouds have hidden, is let go unseen and the next comes as the first did. Air units (px at nearness 1) are
   metres by B_SPAN: a mid bird spans 3.2 m.
   Each bird is BUILT IN 3D from its own live mark: the mark is read as the bird seen from behind (its line across
   the wings, its wrists up), so each vertex is a point of a wing chain (tip, wrist, body, wrist, tip) in the bird's
   frontal plane; the mark's lean is a bank of that plane; the beat swings the wrists toward the line of the tips as the
   live beat does, the bank of a turn lowering the inner wrist. The plane faces the camera, turned toward the way the
   bird flies by up to 39 deg (FACING): flying away or coming nearer it is the tattoo's mark, square; flying across, or
   circling in a thermal, the same mark foreshortened and steepened; seen from below, its heights a little lower (a
   frontal M seen fully from beside closes to a stroke and stops reading as the tattoo's bird, so it is never shown
   so). The world's camera is a pinhole with a wide view (72 deg across a desktop, 79 deg up a phone): toward the
   window's edges it stretches what stands there; the live marks were drawn flat wherever they flew, so each chain is
   pressed back along that line (lens). Every drawing the 3D chain is posed (on the hand's frames); every frame it is
   placed where the bird is and projected through the world's camera, and drawn as ink: one instanced draw for all
   birds, each a screen-space quad round its five points, the distance to its four segments giving round caps, round
   joins and a 1 px edge; the pen (LINE by its size on the window: the live 1.5-2.5 px; a bird smaller than the live's
   farthest thinner with it down to 1 px, then fainter) and the boil in screen px.

   JUST ENOUGH EFFECTS (each can be turned off: FX): the ink is a
   thing in the world (the air between taken as the land's is: the engine's own fog and ground haze, then the grade
   the composite used), the ink takes a little of the scene's light (a dark bird's black lifted a breath toward the
   sky's light), and a bird crossing the sun's own glare is eaten by it as every silhouette is (round 2's light wrap,
   in place of round 1's rim: where the frame under a stroke is near white and the bloom strong, the pen thinner and
   the ink lifted toward the light); the night's light ink takes some of the sky's colour, as the live's grey did. It
   is drawn at the device's own resolution (round 2: the world's frame is drawn smaller and scaled up; the ink is not).
   It is hidden by the land in front of it (the scene's depth, per pixel) and by the clouds in front of it (the
   clouds' own cover per pixel, weighted by how much of a cloud's visible lobes stand between it and the camera); it
   steps back where the words stand (a bird nearer them than the live WORDS margin fades, gone at half of it, and the
   mask's core is never inked). Under forced colours the world is not drawn and the birds fly alone, in CanvasText.

   What the module may use is HOST (the engine's w12b_birdhost.js and notes.md, "The birds' interface"): no DOM, no
   clock, no entropy of its own, no storage, no network; randomness is the engine's streams (HOST.rng), time the
   engine's fixed steps. */
(function () {
  'use strict';
  if (window.WORLD && window.WORLD.stamp) window.WORLD.stamp('inkbirds.js top');   // (E0 Fix 3: the record bounds each script's evaluation)
  if (!window.WORLD || !window.WORLD.birds) return;
  if (!window.FACETFORM || !window.FACETPOSE || !window.WINGMODEL || !window.WINGMODEL_DATA || !window.LABBIRD || !window.BIRDWING) return;   // (physics: the faceted M and the lab's measured wing: facetform.js, facetpose.js, wingmodel.js, model.js, labbird.js, birdwing.js, loaded before this file)
  window.WORLD.birds(function (HOST) {
  var gl = HOST.gl;

  var DEG = Math.PI / 180, TAU = 2 * Math.PI;

