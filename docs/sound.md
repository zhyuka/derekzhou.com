# Sound (src/sound.js, src/score.js)

The owner chose an opt-in generative score on 2026-10-02 ("Opt-in generative score", among the answers that also
chose no Unreal: see Design). It was built as a listening page on 2026-10-04 and then left out of the site without
his word. On 2026-11-07 he said: "bring it back, opt-in. using an icon that fits with the rest of the design". This
is that score, mapped onto the world's sky as it stands.

## THE ICON

One button in the footer, after Email and LinkedIn, in index.html (not made by script): `<button id="sound"
class="sound" aria-pressed="false" aria-label="Sound" hidden>` holding one inline SVG, a speaker drawn in strokes
of currentColor (the words' light ink, #fdfcf7; CanvasText or ButtonText under forced colours). Its strokes are the
footer words' weight (1.4 units of a 20x16 box drawn 1.25rem x 1rem: about 1.2 px, round ends, as the lettering's
are); it is as tall as the words' capitals. Off: the speaker and a small cross. On: the speaker and two waves. The
two swap at once by aria-pressed (style.css): no transition, nothing animates. A finger's target of 44 x 44 px,
its padding given back by a negative margin, so the footer lays out as before; :focus-visible is the page's ring.
It is hidden until sound.js shows it, so with no script or no Web Audio there is no dead icon. Print hides the
footer, the icon with it. Its accessible name is "Sound" and its state is aria-pressed (page-words).

## THE SWITCH (src/sound.js, about 1 KB served)

The one script every visit pays for: parser-blocking right after site.js (so the icon shows before the first
paint), minified by the build, served under its content's hash. It shows the icon and adds the page's one sound
handler, the button's click. The first press, inside that handler (iOS and Safari start audio only there):

1. marks the audio session ambient (navigator.audioSession, where there is one: the score mixes with the visitor's
   own music, and a phone's silent switch keeps it silent);
2. makes the one AudioContext (latencyHint playback) and resumes it;
3. strikes the thread at once, D5 and A5 as two soft glass notes, in key with every light, so the press is heard
   while the score is on its way;
4. gives the empty script slot at the end of index.html (`<script data-cfasync="false" id="score-slot"></script>`)
   the score's src. The build rewrites '/score.js' to its hashed name; the browser fetches it (script-src 'self':
   the CSP is unchanged) and runs it once; the score hands itself back (SOUND.score) and comes in over 3 s.

A second press takes the score out over 1.2 s, rests its scheduler and suspends the context (the device let go); a
third brings it back. The pressed state is the truth: the device has 3 s to start, then its clock must move (a
WebKit fault: running and silent); if not, once more, then the icon goes off. A score that cannot be fetched
(offline at the press, 15 s) turns the icon off. Nothing is remembered between visits. No other handler: no
visibility, focus, exit or key handler (a hidden tab's timers slow, and the held chord rings on; iOS suspends a
backgrounded page's audio itself).

## THE SCORE (src/score.js, about 12 KB served, fetched only at the press)

Its own header is its full design: the lights, the places, the instruments, the loops, the line, the motifs, the
changes, the lulls and the loudness. In short:

- Every sound is made live: oscillators (with periodic waves), buffers worked out in code (a plucked string, each
  room's air, noise), and noise through filters. No recording, no file but the script.
- Just intonation on D (293.665 Hz). Each of the world's six skies is a light with its own key, mode, held chord,
  instrument, pace and register: first light D Lydian (glass and bowls, a plucked line); the afterglow D Aeolian
  (bowls and glass, a plucked line); the blue hour G Dorian (bells and far stars); the moonlit sea F major (glass and
  stars); the Milky Way a D pentatonic of pure fifths (stars and glass); the aurora F Lydian (glass, stars, a
  breathed line, the aurora's slow shimmer). Every light holds D and A, the thread.
- The world's two kits are its places: above the sea of cloud (thin air, a long bright space) and over the dunes (a
  warmer voice, the far rock's echoes, the wind's sand). It takes the nearer of the two from the world's blend,
  with a margin either way, and crossfades its rooms as the flight passes.
- A change between skies is a modulation by common tones on the change's own k; one into or out of the night strikes
  the thread once; one through the mist (the world's far change) swells into a hush and clears.
- About -26 LUFS for every light in every place (TRIM, TRIM_P, fitted by tools/sound/measure.mjs --fit), a slow
  level that holds it within 0.5 LU by at most 4 dB, a soft ceiling from -14 toward -11.7 dBFS.
- Long time constants: every level, colour and space moves over two seconds or more; every note has a soft
  attack. These swells are sound: nothing on the page fades (no-fades).

## WHAT IT READS

WORLD.sky() (src/world/220-time-day.js, skyHear; WORLD is set in 510-realms-kit.js): `{ sky, next, k, far, w, seed }`,
the sky on show and the next (the world's ids), the change's k (0 in a hold), whether the change goes through the
mist, the cloud sea's share of the land below (w, as skyStep blends the kits), and the score's seed. It reads the
world's state; it changes nothing, and the world never reads the score. With no sky drawn (no WebGL2, forced
colours, a world not yet shown, the governor's still) the score reads the hour's data-sky and holds that time of
day's opening light. Under reduced motion the world is one still frame, so the score reads that still sky and
plays on in it, if pressed (reduced-motion-still).

The seed is `subseed(J.seed, 97)`, one of the visit's own streams from the world's one entropy read: no second
draw. The score's clock is the audio context's own time (ctx.currentTime): every note is scheduled on it, 1.5 s
ahead, by a timer every 250 ms; it reads no other clock (one-entropy-one-clock).

## THE COST

A visit that never presses: the switch, 2.4 KB raw and 1.0 KB Brotli, parsed and run once (a getElementById, a
hidden flag, one listener). No audio context, no score fetched, no CPU after that. A visit that presses: the score,
about 31 KB raw and 12 KB Brotli, then about 10% of one desktop core on the audio thread (9-11x realtime offline;
about two thirds of a core at the slowest phone profile, 6x slower), and the scheduler 14-19 ms a second of the main
thread at 6x. Two things keep the main thread's tasks short (2026-11-07, measured at 6x): each room's impulse is cut
at ROOM_MAX, 3.6 s (a convolver prepares its whole impulse at once when it is given it: the one stall left, about
200 ms at 6x, half a second after the press), and each plucked string is worked out at 24 kHz (PLUCK_SR), about 85 ms
at 6x where 48 kHz took 130-145.

## THE CHECK (tools/checks/36-sound.sh, "The score is opt-in, and measured")

tools/sound/measure.mjs renders the built score offline (OfflineAudioContext, 48 kHz, in headless Chromium, the
scheduler ticked at every quarter second of audio time) for every light in every place and two changes, and opens
the built page: loudness (BS.1770-4) at -26 +- 1.5 LUFS, no sample over -6 dBFS, no 400 ms block 6 LU over the one
before it in a change, the audio at 4x realtime or more (9-12x measured alone), the scheduler at 50 ms a second or less at 4x; on the page,
no AudioContext made and no score fetched in the 5 s before the press, one context and one fetch at it, the icon
pressed with the context running, and a second press letting the device go. Its plants: an audio context made at
load, and the score 10 dB too loud. `node tools/sound/measure.mjs build/site --fit` prints the trims to add.

The owner's ears are for the final listen, on the PR's preview: a phone speaker, headphones, the silent switch.
