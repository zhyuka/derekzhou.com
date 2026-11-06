// The comments in this file keep the tags and file names of the world's development record (design-v5, its rounds,
// fixes and judges; notes.md, w04b_sky.js, diag.js and the like), which lives outside this repository (CLAUDE.md).
/* world.js — the world behind the page (v4 engine, round 3a): free flight through an endless world of realms.

   The window is a camera flying through a 3D world drawn in WebGL2, generated in code from the visit's seed (no
   picture, no model file). The visitor steers it: a drag anywhere on the page (touch, pen, or a mouse with its button
   held) turns the view and the flight, the scene following the finger as in a 360-degree viewer, and tilts it to climb
   or dive; or the phone itself, turned about (its rotation from where it was when motion was enabled). Nothing is
   shown for it. Left alone, the view holds the heading the visitor last set (at the landing, the landing's own) and
   flies straight and level but for the ground's rise: nothing turns it by itself (design-v5 Revision 3: no tour, no
   aiming at places, no weave, no nod). What stands ahead and cannot be climbed is passed by a slip sideways, planned
   from first sight with the heading held (slipPlan). The world has no edge: a realm is a field (its land as global functions in GLSL, its
   areas laid out over the plane as regions, its light) and cells (landmarks, clouds, creatures and points of interest
   generated per world cell from the visit's seed and the cell's coordinates), streamed in about the camera within a
   budget a frame and freed behind it. Every 60-120 s the realm changes around the camera, flown straight on whichever
   heading it holds: a bank of cloud forms ahead, the cloud closes about the eye (its mist fixed in the cloud's own
   frame), the next realm is generated about the camera's place while the cloud is whole, the view's framing eased
   from the one realm's to the next's (pitchCarry), and the camera comes out of the cloud into it.

   What is drawn, each frame:
     the scene (HDR, RGBA16F, drawn with 4 samples a pixel where the device allows, resolved into a texture and its
       depth before anything reads it): the sky; each surface of the realm as a GPU geometry clipmap
       (nested rings of one grid around the camera, raised in the vertex shader by the realm's height function, odd
       vertices morphed onto the coarser ring); the cells' landmarks (one mesh a cell, seated on the ground); the
       scatter (instanced per cell of a grid about the camera); creatures; particles;
     the depth, linearised at half resolution;
     the clouds at half resolution: each cloud body baked once into a small 3D texture (its lobes joined into one form,
       billowed, stored as a signed distance beside the optical depth toward the sun and the sky), marched in its box
       far to near, cut by the scene's depth; then, in a transition, the cloud the camera is in (in camera space);
     bloom, light shafts, and the composite: the clouds brought up edge-aware (a cubic B-spline over an even surface,
       weighted by depth across the land's edges), a shoulder that keeps hue, the realm's grade, the words' lift (under
       dark words only, the ground raised where black words need it; nothing is ever drawn darker for the words), one
       fixed 8-bit dither.

   Every realm registers itself (realms.js) with WORLD.realm({...}). Time is requestAnimationFrame's own (no clock
   read); randomness is one draw from the crypto API above INIT-END, split into splitmix32 streams and integer hashes.

   The shipped page has no harness: of the attributes on <html> the world reads only data-sky and data-sky-at (the
   hour's script writes them), it puts nothing on window but WORLD (the realms' and the ink birds' registry), and it keeps no record (the switches stay
   at their defaults; the record's code is unreachable). The page's one clock is clockNow(): read for budgets only, never for what is drawn. */
(function () {
  'use strict';
  /* the one clock: time budgets and the record, never content (CI: performance.now exactly once, here) */
  function clockNow() { return performance.now(); }
  var EVAL0 = clockNow();   // (the record: when this script's evaluation began)
  var root = document.documentElement;
  /* (tod fix round, the judges' defect 9) the browser's bar takes the world's still top for the hour's group as this
     script's first act (the page's body shows the world's still from its first paint; hour.v2.js's colour is the live
     sky's still top), before the boot's heavy work; the drawn sky's own follows once it shows (skyTheme), the still's
     when it hides (markStill). The tops are the world's still skies' (style.css, tools/stillsky.py). */
  var SKYTOP = { dawn: '#173a63', day: '#173a63', rain: '#5f3d62', sunset: '#5f3d62', dusk: '#38396a', night: '#17234f' };
  /* (camera9b) a window 6 : 5 or wider (wideWin: the stylesheet's own query) has the camera pitched up (basePitch) and the
     tilted camera's still skies (style.css, @media (min-aspect-ratio: 6/5)), and the bar takes their tops: read each time
     it takes a still's (here, and skyThemeStill when the canvas hides) */
  var SKYTOPW = { dawn: '#173b65', day: '#173b65', rain: '#603e63', sunset: '#603e63', dusk: '#3b3a6c', night: '#1b2552' };
  function wideWin() { try { if (window.matchMedia) return window.matchMedia('(min-aspect-ratio: 6/5)').matches; } catch (e) { /* the window's own shape below */ } return window.innerWidth * 5 >= window.innerHeight * 6; }
  function stillTop(g) { return (wideWin() ? SKYTOPW : SKYTOP)[g]; }
  var THEME0 = document.querySelector('meta[name="theme-color"]'), TOP0 = stillTop(root.getAttribute('data-sky'));
  if (THEME0 && TOP0 && document.querySelector('canvas.sky')) THEME0.setAttribute('content', TOP0);
  var canvas = document.querySelector('canvas.sky');
  if (!canvas || typeof WebGL2RenderingContext === 'undefined') return;

  function attr(n) { return root.getAttribute(n); }
  var OPT = { realm: null, seed: null, t: null, ss: null, still: false, dev: false, dur: null, nogov: false, dtmax: null, order: null,
    sw: null, cvs: null, skyScene: null, skyNext: null, skyDt: null };   // (the shipped page: no harness, every option the visitor's)
  /* the visitor's hour: hour.v2.js (in the head, before the first paint) marks the page with its group (data-sky: dawn,
     day, rain, sunset, dusk, night); read here once, before the world marks the page with its own still sky. The world
     itself reads no clock. */
  var HOUR = attr('data-sky') || 'day';

