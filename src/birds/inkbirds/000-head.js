// The comments in this file keep the tags and file names of the world's development record (design-v5, its rounds,
// fixes and judges; notes.md, w04b_sky.js, diag.js and the like), which lives outside this repository (CLAUDE.md).
/* inkbirds.js: the ink birds of the live site, living in the world (docs/birds.md; the design: docs/birds-design.md).

   ONE BIRD. Every bird is one record for the whole of its life in the world (210): its kind, its own stream, its own
   age, where it is and how it moves, its flock, its goal and its state. One integrator flies every bird in the air,
   turning it only through its bank; a flock's birds steer to their places behind their leader. The same bird comes
   down to a perch on the words or the pointer's tip, lives there and leaves again (260): its wings, its drawing and
   its size its own throughout. Birds live in the world on screen and off: they are added and taken out only where no
   one can see it happen (so far off the air leaves nothing of them, or wholly under the sea of cloud's top).

   THE BIRD'S BODY is the faceted M (facetform.js, facetpose.js; labbird.js bends its pleats and parts the slotted
   kinds' fingers: 46 vertices, 58 triangles, 30 facets) flown by the measured wing (wingmodel.js, model.js, labbird.js,
   made lazy for the world by birdwing.js), posed every frame (230: in the air along its way through the air, banked as
   it turns; on a perch standing on the ink) and lit by the world's light, drawn by one instanced pass of exact
   coverage after the composite (240): the world's own air between it and the eye, hidden by the land and the clouds
   in front of it, at night a light of its own and a soft halo. Under forced colours the world is not drawn and the
   birds fly alone in CanvasText. Under reduced motion one still frame: the visit's own birds a little way into it.

   What the module may use is HOST (world/490-birds-host.js): no DOM, no clock, no entropy of its own, no storage, no
   network; randomness is the engine's streams (HOST.rng), time the engine's fixed steps. */
(function () {
  'use strict';
  if (window.WORLD && window.WORLD.stamp) window.WORLD.stamp('inkbirds.js top');   // (E0 Fix 3: the record bounds each script's evaluation)
  if (!window.WORLD || !window.WORLD.birds) return;
  if (!window.FACETFORM || !window.FACETPOSE || !window.WINGMODEL || !window.WINGMODEL_DATA || !window.LABBIRD || !window.BIRDWING) return;   // (physics: the faceted M and the lab's measured wing: facetform.js, facetpose.js, wingmodel.js, model.js, labbird.js, birdwing.js, loaded before this file)
  window.WORLD.birds(function (HOST) {
  var gl = HOST.gl;

  var DEG = Math.PI / 180, TAU = 2 * Math.PI;

