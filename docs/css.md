# CSS

<!-- Moved word for word from CLAUDE.md's section "CSS" (restructure step 7, 2026-11-06). -->

One file: style.css. Plain CSS. Custom properties for theming.
All @font-face declarations (subsets + metric fallbacks) at top of file.
Clamp-based spacing for fluid layout across viewports. One set of the
words' colours (:root, the light set: no colours per sky). Two families
of still skies, each a gradient on the body: the hour's (:root[data-sky],
six times of day; the 404 page, and the home page's no-script day sky)
and the world's (:root[data-sky]:has(canvas.sky)), the same skies: each
time of day's kept landing skies (dawn and day first light, rain and
sunset the afterglow, dusk the blue hour, night the moonlit sea, the
Milky Way and the aurora together) as the world draws them at 393x852
and 1440x900 with the camera of a window narrower than 6:5, the words
hidden, objects in, averaged row by row in OKLab, the horizon 55-58%
down; and on a window 6:5 or wider (@media (min-aspect-ratio: 6/5), the
query the camera reads) the world's own taken again from the pitched
camera at 1440x900, the horizon about 72% down; so the world cuts
in over its own still on every window. The colours hold against every
gradient wherever a window puts the words (as CI computes them: text
7.09:1 or more, the dimmed grey 6.33, the focus ring 5.67; CI samples
every gradient, wants each world sky's base still and its 6:5 one
exactly once each, and fails below 4.5 and 3). The canvas
(.sky) is fixed behind everything (z-index -1) on the large viewport
(100lvh: a phone's toolbar coming and going never resizes the world),
unseen until drawn; touch-action pinch-zoom (pan-y too where the page
scrolls, everything the browser's while zoomed: data-touch), no text
selected while a drag steers (data-steer). No keyframes and no
transitions (the owner: "There shouldn't be any fade-ins/outs at
all"): the canvas shows at once (`.sky.on`: opacity 1, a cut, its
frame drawn whole first). Under forced colours the stylesheet keeps
the canvas laid out and sets color: CanvasText and background-color:
Canvas on it, the two colours the world reads from it: it clears
the canvas to Canvas and draws the ink birds alone over it in
CanvasText (docs/world.md, ## FALLBACKS). A window under 500 px tall (a
phone held sideways) lays the stack out again to fit, so the page never
scrolls. :focus-visible is a 2px outline in the focus colour, offset 3px,
on every focusable. The name's two rules live here (CSP: style-src 'self',
no inline style): `.name svg` (display block, width min(25.25rem, 100vw
less main's padding), height auto, aspect-ratio 1310 / 314) and
`.visually-hidden` (the clip pattern); print sets the drawing 16rem wide.
`.words` is the words' role for a paragraph (the line under the name, the
404's line). `.sound` is the sound icon (docs/sound.md): an unstyled button, a 44 px
target given back by its margin, its SVG stroked in currentColor (1.4 units, round
ends), shown once sound.js lifts `hidden`; `.sound[aria-pressed]` hides one of its two
drawings, at once (no transition).
