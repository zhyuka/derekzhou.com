# Design

<!-- Moved word for word from CLAUDE.md's section "Design" (restructure step 7, 2026-11-06). -->

One non-scrolling viewport: the typography over a world seen from the
air, birds crossing it, light and cloud all about. The owner's briefs,
verbatim:
first "copy exactly how they did the dots here on Samara.com/jobs.
Except instead of dots use birds and don't use dark background should be
light."; then, of Samara's dots drifting and bouncing inside the window:
"That's not at all how birds move tho. The page should be a sky so like
they're flying across/in patterns/etc. it should feel calm - not
bouncing off the walls." and, of the number of birds, "should b rand";
then, of v3's slow, rigid rows: "Are you sure this is how birds movement
is flying?!"; then, of v4's flights of one identical mark: "Y they all
look same and move all the same? Did you even understand what we're
trying to do?"; then, of v5's pace (a phone's sky crossed in 10-17 s):
"Are you sure everything should be moving this fast tho?"; then, of v7's
flat sky, every lane drawn on the window's plane: "Y is the movement so 2D
though. Did you even research as comprehensively as possible? Test using
the most complex tools etc."; then, of the background, paraphrased (the
reference is a game the owner named; at the owner's word its name stays
out of the repo, its commits and its PRs): make the background as like
that game's luminous sky and cloud as it can be made, from the most
comprehensive research and plan; and, choosing among the plan's options,
every time of day in turn, the opening one by the visitor's own clock
("All. Cycle through. The scene that users starts on depends on their
system time"), the sky behind the words too ("Full sky."), and as close
to the reference as possible ("You can do it - no shortcuts!"). So the
first brief's light ground gives way, at the owner's choice, to a world
that is dark at dusk and at night. Then, asked to use Unreal Engine, and
shown the research's answer (the page cannot run Unreal: no web export;
streaming costs a GPU server per visitor and fails in iOS in-app
browsers), the owner chose no Unreal (and an opt-in generative score (2026-10-02: "Opt-in
generative score") and a studio behind Cloudflare Access, neither built then), and a world drawn
in the page itself, seamless ("keep iterating through literally every possible
method/frameworks/etc until it's seamless"); of the plan's flat palette
strips: "All those mocks look so plain wtf. It should be a lot more
complex than a palette lol." with the reference's own creative techniques
(paraphrased: its name stays out); of the first flights through it:
"should keep flying same-ish direction unless user drags their
mouse/finger to change direction. And the weird glittering transitions
between scenes/stuff is still happening wtf?" (so nothing turns the view
by itself, and nothing on the window sparkles, crawls or fizzes from
frame to frame); of the birds in it: "And there should still be birds
that are drawn/constructed in the same style as before (what's currently
live in prod) but 3d-ified (but just enough to fit with everything else.
So that might mean adding some "extra" fx to them)"; of the time of day:
"Add dusk and night first", and "Only the starting landing scene should
depend on the system time. The rest should cycle through smoothly
randomly non-time-dependent." Then, shown a hand-lettered brush-script
title (the reference lettering; the work it comes from stays unnamed, as
above): "Also draw Derek Zhou in this style. Keep iterating until it's
100% exact. And remove the entire "Derek is a hands-on.." blurb."; of
the first drawing: "The Z is off - shouldn't be 2 separate strokes -
study similar fonts so u know what to do for it. Remove the feather
entirely. 1 line layout pls"; and, choosing the hooked Z, and asked
whether white lettering should stay white over a bright sky by darkening
the sky behind it or switch to dark ink there: "A. Don't darken the
background anywhere ever". Then, of a lift under dark words (a pale
field the words' machinery raised behind them): "remove that white
background behind the text. it's fine failing accesibility" (2026-10-21),
and of the inks' changes: "hold each colour change long enough that it
can never blink, and choose the links' colour by their worst letters, not
their average" (2026-10-22). Then, shown the desktop view pitched up, the
owner said yes to 9 degrees (2026-10-29), and chose to ship in stages:
this world with the time of day first, then that camera, the steering's
next round and new birds later. Then (2026-11-03): "lets only use white
text for everything so never use any scenes that dont pass white text
(anything that makes the text turn black should be removed entirely)";
of the start, "why does the stuff take so long to load on site startup?
should load instantly make it 10x faster"; and "also the clouds and stuff
looks blurry from afar too.. everything should be 10x quality". Then
(2026-11-05), of the 2D birds still flying over the still sky as the page
loaded: "Why do I still see the old birds at all … like when the page
first loads. There shouldn't be any code at all for that, right?! wtf
is going on pls fix from root and clean everything up"; and, of the
boxes that hid the birds about the words: "also pls remove the masking
boxes from behind the text completely. it's completely fine if the
birds fly behind/in front of it... do u even understand"; and, of the
birds and the visitor's hand: "the birds should be more interactive with
the mouse. do u get what i mean? did u even research all possible 100%
ways and figure out the most delightful?"; then (2026-11-06), having
tried the first previews: "they seem the same to me? and why is the bird
flying away when i just get near it instead of actually going on top of
it? ... it's still not perched on the letters themselves either
(linkedin, e.g., and why doesn it perch on other letters too why is it
only some spots. it shouldnt be any set value lmfao?!) and why are the
birds that i click to spawn are flying stuck with the camera instead of
going out into the world ?!" (so the birds, and the birds alone, notice
the pointer and come to it, perch on any letter, and every bird that
leaves goes into the world: see Birds). So: the name is
lettering (docs/type.md); nothing on the page darkens the world or lifts it
for the words; the words are always light, and the world draws only skies
they read on (docs/world.md); and the birds are the ink birds alone, flying in
the world (docs/birds.md). Then (2026-11-07), of the score built as a listening page on
2026-10-04 and left out since: "bring it back, opt-in. using an icon that fits with
the rest of the design" (2026-11-07); and of what it plays: "music and faint ambiance"
(2026-11-07) (see docs/sound.md: one icon in the footer, silent until pressed). And of the
score that follows the sky as it changes and never repeats: "Yup ship it" (2026-11-12).
Then (2026-11-12), shown the world's first frame baked at build time and cut into by the live
world (the resume sketch A2, against the page without it): "Yes A2 is right"; and of what that
asks of two rules, the page's only pictures its own first frames and the openings a set of 96
(the hour's six skies by 16 seeds, the one read picking the seed): "Yes to both, go with 96"
(see docs/world.md, ## THE OPENINGS).

The words' colours are one set, always (docs/world.md, ## THE WORDS), and the
world is never changed for them: text #fdfcf7 (the lettered name, the
line, the links), the dimmed grey #ebeffa (the credit, the links'
underline), the focus ring #f4e2b0, selection #3b3f55 under the light
text: the same in the stylesheet (:root) and in the world (constants),
on every sky and at every moment. No colour of its own lies under
the sky: the body's background is the still sky's gradient (the old
cream ground, #f9f8f1, which that gradient always covered, went in
the deep sweep), and print is on white. color-scheme stays light
(no form controls, no scrollbars). Type is matte: no text-shadow, no
glow. Links are plain underlined words (1px, dimmed underline, .18em
offset); the sound icon is a speaker drawn in the words' ink at their weight, its two
states swapped at once (docs/sound.md); nothing on the page reacts to hover but the birds (docs/birds.md:
THE POINTER); OS cursors only. The name and the type
are present at first paint in their final place (the drawing's box is
reserved by the stylesheet) and in their final colours. Print hides the
world, the birds and the footer, on white (every still sky, the world's
too, gives way to the paper, background graphics on or off: CI checks
the print block): the one exception to the light words, the name and the
line print black, the credit #555, the name 16rem wide.
