# Birds (inkbirds.js and its wing model)

<!-- Moved word for word from CLAUDE.md's section "Birds (inkbirds.js and its wing model)" (restructure step 7, 2026-11-06). -->

The birds are the ink birds, and there are no others: the world draws
them, in its canvas, so before the world's first frame, and wherever it
does not run (no WebGL2, no script, a lost context, a CPU renderer, a
device too slow), the page is the still sky and the words, with no bird on
it, and in print the name, the line and the credit on the paper, no bird
(see Design); under forced colours the world draws them alone, in
CanvasText (see World: FALLBACKS). No script, SVG or rule of the old 2D
birds is left in the page, its stylesheet, its headers or the world's
scripts, and CI fails if one comes back (see Security).

THE INK BIRDS (inkbirds.js, round 3): the living sky. The birds are
not flights planned to cross the window: every flock is an animal
in the 3D world on its own business, and the window shows what is in
front of the camera. Geese, ibis and gulls commute on the evening's line
(with it, against it, across it); gulls and storks wheel over a patch of
air; crows, a heron and swallows loiter about a home; geese migrate at
night. A flock's leader steers in the world (a step every 0.1 s, its
route worked out 4 s ahead) at its kind's real airspeed, never turning
faster than its kind can, drifting with the wind; the others hold their
places in its pattern (a V, a line, a pair, a loose cloud) a moment
behind on its way, so turns ripple down the flock. Each bird is the
tattoo's M as a faceted solid flown by a measured wingbeat (the wing
model: facetform, facetpose, wingmodel, model, labbird, birdwing, loaded
before it), drawn as ink through the world's camera, hidden behind a
cloud's opaque core, and never masked for the words: a bird crossing
them is drawn whole, behind them (the canvas lies under the page; the
owner, 2026-11-05: "pls remove the masking boxes from behind the text
completely. it's completely fine if the birds fly behind/in front of
it"). No keep-off texture, no step back near the words, no route
refused, eased, held or let go for them, and the camera never waits
for a bird near them (CI: world_rules.py rule 7, "no-mask"). The calm is kept in the world, never by
slowing a bird: nothing passes the eye faster than 6 degrees a second
(such a flock is met farther out), each kind is met at its own
true-size distance, at most four or five flocks live about the viewer
(an encounter every 9-20 s), a sky with no clear bird for 9 s sends one
in that shows within 5 s, and a route may cross the words. No
bird follows the view (the owner's word): a flock's whole route is worked
out at its birth and flown exactly, at its own height over the land
under it; nothing in its flight reads the camera, so a drag swings the
view past the birds. And no bird fades in time: it shows only by
crossing the window's edge or coming out of the distance (a fade by
distance alone), and goes the same ways, the words' place on the window
no exception.
The perched birds (guests): every 20-60 s or so (the first about 8 s in) a gull flies in (its way
in free to cross the words) and lands on a letter: any letter, a ledge chosen fresh at every
landing, never a table of spots (the owner: "it shouldnt be any set value"). The ledges are read
from the letters themselves: the lettered name's ink (NAME_INK: its path rasterised in 6-unit
columns of the drawing's viewBox, each column's runs of sky; the end of a run is the top of a
stroke, a ledge where the stroke runs on, flat to within 7 units over 7 columns, with room above
for a standing bird), every glyph top of Email and LinkedIn (LINK_GLYPHS, measured in the served
Geist subset) and of the credit (its mono line as cells, each character's top by its class);
never an underline. It sits in the owner's perch A (the folded M seen side-on, upright, the
perch session's fix: its feet on the ink, no sky under them), never still for long, and leaps
off: once its leap is under way it is handed to the world (below). No fades: it comes in from
beyond the window's edge. Each click or tap on the page that is not a drag and not on a link
lets a gull go into the world from there (the drag's own pointerdown/up: no listener added); at
most 4 at once; none under reduced motion.

INTO THE WORLD (the owner, 2026-11-06: "why are the birds that i click
to spawn are flying stuck with the camera instead of going out into the
world ?!"): a bird let go, a click's, or a perched gull leaving (or one
flying in when the visitor drags), becomes a living-sky gull (lvMake, as
every flock is made) at the world point seen at its place on the window
through the camera as drawn, at the depth where a gull is its size
there, flying off at a startled 16 m/s, climbing, across the view and
away from the eye (so the camera, flying on, never runs it down). From
then on it is the world's: a drag swings the view past it, nothing
follows the camera, and it leaves only beyond an edge or into the
distance.

THE POINTER (the owner, 2026-11-05: "the birds should be more interactive
with the mouse"; and, 2026-11-06: "why is the bird flying away when i
just get near it instead of actually going on top of it?"). Friendly and
curious, not skittish:
- a pointer slow (under 40 px/s) or still for a second anywhere but the
  window's edge brings a gull to perch on its tip (from 3 s into the
  visit, 12-22 s apart): it flies in over 3-5 s, lands with its feet on
  the tip, rides the pointer while it moves slowly (eased over 0.12 s),
  and goes into the world on a jerk (over 600 px/s), a press, a click, a
  drag or the pointer leaving the window. On a phone: a press held 0.8 s
  without a drag brings it onto the fingertip (50 px above it); lifting
  or dragging sends it off, and that lift is no tap.
- a slow hand at a gull on a letter (within 3.2 of its spans, under 60
  px/s) has it hop up onto the tip; it notices a pointer coming (within 7
  spans: its breath stills, its head comes up); only a fast jab (over
  300 px/s, coming at it) startles it off. A tap within 60 px of it
  startles it too.
- a pointer sweeping past a flight (within 5 spans of a bird, at 100 px/s
  or more) sends a shiver through it: the nearest bird rolls hard and the
  roll passes bird to bird away from the pointer, paths untouched; a
  flight shivers at most every 6 s.
Each play has its own switch (inkbirds' PTR). The world reads a hovering
pointer with one passive listener of its moves and one of its leaving
the window, both added and removed in hoverSync only, only where the
device hovers (any-hover: hover) and never under reduced motion or
forced colours; they only store, and the birds do the rest in their own
step. The words and the links react to nothing.

The birds fly for as long as the page is open, as the world moves. That
is automatic motion over five seconds beside content, which WCAG 2.2.2
(Level A) answers with a pause control; the owner chose a page without
one. prefers-reduced-motion is the stop.
