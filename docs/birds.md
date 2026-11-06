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
The perched birds (guests): now and then a gull flies in (its way in and out free to cross
the words), lands on the D's top or the k's or u's exit stroke, or just past LinkedIn's end on its
line (never an underline), sits in the owner's perch A (the folded M seen side-on, upright),
never still for long, and leaps off and away. No fades: it comes in from beyond the window's
edge and leaves out of view. The pointer's perch needs the hover listener the world does not
have, so it never comes. Each click or tap on the page that is not a drag and not on a link
starts a gull at that point (the drag's own pointerdown/up: no listener added) that springs off
and recedes into the distance; at most 4 at once; none under reduced motion.

The birds fly for as long as the page is open, as the world moves. That
is automatic motion over five seconds beside content, which WCAG 2.2.2
(Level A) answers with a pause control; the owner chose a page without
one. prefers-reduced-motion is the stop.
