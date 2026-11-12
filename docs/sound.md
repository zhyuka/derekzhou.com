# Sound

The sound icon (2026-11-07) and the live score it plays (2026-11-12). Read this before touching
src/sound.js, src/score.js, src/world/512-score-feed.js, site/assets/sound/, tools/sound/, the icon in
site/index.html or `.sound` in site/style.css.

## What the owner asked

- "bring it back, opt-in. using an icon that fits with the rest of the design" (2026-11-07)
- "music and faint ambiance" (2026-11-07): what it plays.
- "Yup ship it" (2026-11-12), answering: what we're building follows the sky as it changes and never
  repeats, so the rule of one looping recording has to change. That is this score.

The music itself was chosen by ear over seventeen rounds of sketches (2026-11-07 to 2026-11-12). His words
along the way set what it must and must not be:
- not a melody, not a beat ("why does it have melody - this is not relaxing at all");
- never dinky; never piercing; never alarm-like (pure electronic tones, out-of-tune copies beating);
- "anyone should be able to keep listening to this forever without getting a single notion of headache";
- "i didnt say never silent"; "it can be mellow/sad too. so find the perfect balance pls";
- "a little more" movement, not less ("where's the slight variation/playfulness?");
- "deeper" bass, felt rather than heard (the timpani's flutter "sounds something like youd hear underwater").

So every visit is silent; one icon in the footer, after the two links, in the words' light ink; pressed, the
score plays, following the sky, until it is pressed again.

## The icon

A `<button id="sound" class="sound" aria-pressed="false" aria-label="Sound" hidden>` in the footer, written in
index.html (no JS-made DOM). Its SVG is a small speaker stroked in currentColor at the words' weight, with two
drawings, waves (`.sound-on`) and a cross (`.sound-off`); `.sound[aria-pressed]` hides one of them at once (no
transition, no-fades). The button stays `hidden` until sound.js shows it, so with no script, or no Web Audio, or
no fetch, there is no dead icon. Its 44 px target is given back by negative margin, so the footer's line does not
move.

## The switch (src/sound.js)

Minified by the build (tools/minify.mjs STEMS), parser-blocking right after site.js, so the icon shows before the
first paint. It has one handler, the button's click:

1. **The first press**, inside its own handler, because iOS and Safari start audio only there:
   - `navigator.audioSession.type = 'ambient'`, where there is one: the sound mixes with the visitor's own music
     and respects the silent switch;
   - the one AudioContext (`latencyHint: 'playback'`, at 24 kHz where the browser takes it: nothing in the score is
     above about 4 kHz, so half the work and memory) and a level gain at 0;
   - the one fetch, `SHEET` (a literal `/assets/sound/notes-N.mp3` from this site), decoded once;
   - `SCORE.play(ctx, level, buffer)` (score.js), then a tick about twice a second on the context's own clock
     (the score plans ten seconds ahead); the level rises to 1 over 4 s.
2. **A second press** ramps the level to 0 over 1.5 s, then suspends the context, which lets the audio device go.
   A suspended context's clock stops, so the score plans nothing while off.
3. **A third press** resumes the context and ramps back up over 4 s. Nothing is fetched or decoded again.

The pressed state (aria-pressed) is always the truth. It turns off when the fetch fails or answers with an error,
the decode fails, the score is missing, or the device does not start within 3 s. After a failure, the next press
asks again. Nothing is remembered between visits.

## The score (src/score.js)

Loaded deferred, at low priority, last of the scripts; it only defines `window.SCORE` until a press. It makes no
context and fetches nothing: it builds on what the switch hands it. Its time is the context's (`now`, passed in);
its one entropy is the world's (a seed in `WORLD.sky()`); it reads the sky and never writes to the world.

What it plays (sketch round seventeen, the owner's pick):

- **The strings** hold slow chords: a new chord every 16 to 24 s; notes two chords share are held, never struck
  again; voices move one after another, each swelling by its own amount; an upper voice now and then rests a few
  seconds and swells back. One soft breath in each sky (every voice lets go; 2.5 s; back).
- **Each sky its key and its colour on top**: afterglow F, horns; the Milky Way A-flat (Lydian), harp; aurora
  B-flat (Lydian), harp; blue hour E-flat, piano; the moonlit sea C (Dorian), low strings and clarinet; first light
  G, the strings alone. Once a sky, a borrowed chord (the minor four; in the moonlit sea, the major one).
- **Small gestures**: every 11 to 22 s the colour says two or three notes (a horn's far-off call, a harp's quick
  rise, two soft piano notes, a clarinet's or the violins' sigh), then nothing. Never a tune.
- **The deep end**: under every chord, an octave below the strings' bass, a tuba played at half speed and kept to
  its fundamental (felt: about 33-62 Hz) with a contrabass. One deep note at a time; a new root comes in only once
  the old has let go. None in the mist; lighter over the cloud and under the borrowed minor chords.
- **Sky changes, planned with the world's** (`WORLD.sky()` names the next sky and when its change starts, a whole
  hold ahead): a near change goes through two chords both keys share, the second a major chord of the new key; a
  far change thins to the strings alone on a mist chord (notes both keys share, in the middle) and grows the new sky
  out of it (a minor sky arrives by its relative major). The colour changes halfway; the music swells to that
  moment (all +2.5 dB, the deep end +6.5 dB: 10 s up, 2 s held, 9 s down), always on a major chord. If the world is
  already changing when the score looks (a late press), it catches up, sooner and shorter.
- **Never a clash**: no two notes closer than a minor third at once; low down (below C3) nothing closer than a fifth.
- **The room and the air**: a long dark room (4.2 s low, 1.8 s high); a faint air (two slow noises, a billow and a
  stream, drifting on 7 to 29 s cycles; over the cloud the billow eases and the stream rises) about 22 dB under it.
- **The ear**: the band the ear is most sensitive to eased (a -3 dB bell at 3.2 kHz, the strings' resonances at
  2-4 kHz cut 1-4 dB), a dip at 160 Hz, nothing below 27 Hz; no compression. About -26 LUFS.

Under reduced motion the world is one still frame and its clock holds, so the score stays in that sky. With no
world (no WebGL2), the score plays blue hour and never changes.

## The feed (src/world/512-score-feed.js)

`WORLD.sky()` returns a fresh copy, or null before the sky's order exists: `t` (the sky's clock), `seq` (from the
sky on show onward: id, at, hold, move, far), `wc` (how much of the view is the cloud sea, 0 to 1, from the maps at
the camera), `still` (reduced motion, or the harness's still mode), `seed` (the visit's one entropy read through
subseed, salt 97). The world never reads it back; nothing it draws depends on it.

## The sheet (site/assets/sound/notes-N.mp3)

Every note the score plays, from real recordings (CC0: VS Chamber Orchestra: Community Edition, and the Versilian
Community Sample Library's grand piano; docs/licences.md), in one stereo MP3: 60 notes, about 296 s, 24 kHz, 96 kbps,
about 3.5 MB. tools/sound/sheet.py makes it, by hand, from checkouts of the two libraries (numpy and ffmpeg):

- each note at its own pitch (VSCO names its notes an octave under their sound, but not its harp);
- low-passed at its instrument's cutoff, with a soft high shelf; its level read as the sketches read it (RMS from
  0.3 s to 2 s), kept as a gain in the index;
- a sustained note: 0.5 s in (past the attack: the score swells every sustained note in), a loop of 4-5 s with the
  0.6 s before it crossfaded into its end, so it plays on with no seam; a harp or piano note: from its start, with
  its own decay;
- a click at 0.2 s first, so the score finds where the decoder put time zero (MP3 decoders differ by a few ms).

It writes the file under the next name (changed-bytes-new-name: notes-2 to notes-3, the old one removed), the SHEET
line in src/sound.js and the NOTES line (the index: instrument, pitch, start, length, loops, gain) in src/score.js.

## Measuring it (tools/sound/render.mjs)

`node tools/sound/render.mjs OUT.wav [SECONDS]` plays the score in headless Chromium, offline (an
OfflineAudioContext, in the tool only), against a scripted flight (afterglow; a near change to the Milky Way; the
dunes giving way to cloud; a far change through the mist to blue hour; a near change to the moonlit sea) and prints
its loudness. Measured 2026-11-12 over 456 s, against round seventeen's render: -26 LUFS integrated (OUT in
score.js sets it), LRA 5.5 LU, true peak -11 dBFS; sharpness, slow pulsing and roughness at or below round
seventeen's; 41% of the energy under 200 Hz (round seventeen 40.5%); third-octave balance within about 1.5 dB from
250 Hz to 6 kHz. Change OUT only with a measurement.

## What it costs

| what | bytes | when |
|---|---|---|
| sound.js | 1,406 minified, 591 as sent (Brotli 11) | every visit, parser-blocking (36-load-budget: 1.5 KB) |
| score.js | 15,742 minified, 5,874 as sent | every visit, deferred, low priority (36-load-budget: 6.5 KB) |
| the sheet | about 3.5 MB | only at the first press |

The sheet has no line in 36-load-budget on purpose: a cold visit never loads it, so if one ever did, it would fail
that check as an unbudgeted file. Decoded at 24 kHz it holds about 57 MB of memory; a browser that will not open
the context at 24 kHz decodes it at its own rate (48 kHz: about 114 MB). While playing: about 25 buffer sources at
once, a convolver and a few filters.

## Security

- The home page's CSP (/ and /index.html in \_headers) has `connect-src 'self'` first: fetch() is governed by
  connect-src, and the sheet is the only same-origin fetch. 404.html's policy, and its meta copy, keep their
  connect-src unchanged; world_rules.py rule 3 pins both.
- Permissions-Policy's `autoplay=()` stays, because a press is a user gesture. The check plays the page under that
  header, with the autoplay policy that needs a gesture.
- 21-absences allows one `fetch(` in all the scripts, sound.js's `fetch(SHEET)` of a literal `/assets/sound/` path;
  one `new AudioContext(`, in sound.js; no audio element, worklet, media-element source, OfflineAudioContext or
  microphone anywhere; no entropy or clock in sound.js or score.js.

## The check (tools/checks/38-sound.sh)

tools/sound/page.mjs serves the build with its own Permissions-Policy, opens it in headless Chromium (autoplay
needing a gesture) and takes about 25 s. It fails when:

- **before the press (2 s):** an audio context is made or anything audio is requested, or the icon is hidden or
  pressed, or the score has not registered;
- **at the press:** it makes other than one context, or requests other than one sheet from this site's
  /assets/sound/, or the icon is not pressed and running, or the score starts no chord of sustained notes, or the
  page throws;
- **ten seconds on:** no new notes (the score stopped planning);
- **a second press:** the icon is not unpressed and the context suspended;
- **a third press:** the icon is not pressed and running again, or something was made or fetched again.

Its plant renames `window.SCORE` in the built score.js, and the check fails on it.

## The unit test (test/unit/sound.mjs)

Plays score.js against a stand-in audio context and the same scripted flight, with no browser, and reads every note
back from its start, swell and release. It fails when two notes sound closer than a minor third, low notes closer than
a fifth, or two deep notes at once; when a colour plays outside its sky or a deep note sounds in the mist; or when the
same seed does not play the same notes (another seed must play others). Its plant lets a note that moves by a step
come in before its neighbour lets go.

## Verify before it ships

docs/verify.md, plus a real iPhone:
- the silent switch on: silence;
- the visitor's own music playing: both are heard (ambient);
- a press, a lock and an unlock: the icon still tells the truth;
- a few minutes through a sky change: the change is heard as the colour turning, with no click or gap;
- the memory and battery cost of a long listen.
