# Type

<!-- Moved word for word from CLAUDE.md's section "Type" (restructure step 7, 2026-11-06). -->

The name is lettering; everything else is two families. The owner asked
for a grotesk and a mono (Diatype, Neue Haas Grotesk, Monument Grotesk
Mono named); Geist and Geist Mono (Vercel with basement.studio, SIL Open
Font License 1.1) are the free, licensed stand-ins, until a web licence
for the Dinamo faces is bought:

* the name (the home page's h1): not a font but a drawing, "Derek Zhou"
  in the hand of the reference lettering (a casual brush script, on one
  line; the Z one stroke, a zigzag entering with a hook at its top left,
  as the reference lettering's capitals enter), one SVG path
  filled with currentColor, so it takes the words' ink (#fdfcf7; black in
  print, CanvasText in forced colours). The h1 is
  `<span class="visually-hidden">Derek Zhou</span>` and the drawing
  (aria-hidden, focusable="false"): a screen reader, a search engine and
  the page's outline still get the words. 25.25rem wide where the window
  allows (the old set name's weight of ink: Geist 500 at 76 px), else the
  measure main's padding leaves (85% of a 320 px phone, 88% of 390); its
  box reserved by aspect-ratio 1310 / 314 (the drawing's viewBox), so
  nothing moves as the page loads. The drawing is used as approved: no
  letter is redrawn here.
* a heading set in type (the 404's "404", any heading to come): Geist
  500, clamp(2.75rem, 1.9rem + 4vw, 4.75rem), line height 1, tracked in
  -0.045em
* the words (the line under the name, the links, the 404's line, every
  paragraph to come): Geist 400, 1.0625rem (the footer's links .875rem),
  line height 1.55, -0.006em, a 22.5em measure
* the facts (the credit row; to come: dates, roles, labels, captions,
  code): Geist Mono 400, .8125rem, dimmed; no uppercase, no tracking

As the site grows, new pages reuse these roles and nothing else: two
weights only (400, 500), emphasis made by the text colour against the
dimmed grey, never by weight (on screen the two are all but one light
now, #fdfcf7 and #ebeffa; in print, black and #555); a handful of sizes
on the same clamp()s;
long reading at about 65 characters a line. A serif may come back for
long-form writing only, never for the name or the page's frame.

Fonts must be licensed for the web: open-licensed (OFL, like Geist) or
a bought web licence. Never unlicensed copies, and never a desktop
font file: its own terms forbid what a site does to it (Dinamo's:
no modifying, no storing on publicly available servers). To move to
Diatype and Monument Grotesk Mono once licensed: swap the two
@font-face sources, recompute the fallbacks (below), keep the roles.
