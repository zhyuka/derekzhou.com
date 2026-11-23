# Sound

The sound icon (2026-11-07) and the live score it plays (2026-11-12). Read this before touching
src/sound.js, src/score.js, src/world/512-score-feed.js, site/assets/sound/, tools/sound/, the icon in
site/index.html or `.sound` in site/style.css.

## What the owner asked

- "bring it back, opt-in. using an icon that fits with the rest of the design" (2026-11-07)
- "music and faint ambiance" (2026-11-07): what it plays.
- "Yup ship it" (2026-11-12), answering: what we're building follows the sky as it changes and never
  repeats, so the rule of one looping recording has to change. That is this score.
- "yes switch it to playback" (2026-11-12), asked why it was silent with the ringer off: the press now plays
  through the ringer switch, as a video does.
- "It sounds like the strings or something is constantly going which gets a little annoying, like where's the
  expression, fading, complexity, etc. ?" (2026-11-12): so the passages (sketch round eighteen). Measured, the
  strings had sounded 97% of the time, all five voices at once for most of it.
- "More complexity (elegantly), and a tad more variation pls"; "the string or somethning is still so droning at
  times"; "i constantly hear some type of chord"; "you need to think bigger" (2026-11-13): so no chord is held at all
  (sketch round twenty-one, below). Measured, a whole triad had sounded 52% of the time, three or more held notes
  66%, one note up to 103 s.
- "now final refinement and cleanup of sounds/acoustics as per your research. are you sure you researched literally
  everything out there? u need to think bigger" (2026-11-13): so how it sounds (sketch round twenty-two, below), from
  research into rooms and outdoor acoustics, intonation and sampled realism, phones and quiet listening, and wind.
- "yes make it louder, -23. and i pick the refined sound" (2026-11-15): so about -23 LUFS (it was -26, 6 dB under
  the floor recommended for streams heard on phones), with no compression; the harp's attacks 2 dB lower, so its
  peaks keep clear.
- "yes go" (2026-11-16), of quieter nights: each sky its own level inside the -23, the night skies quieter by thinning
  the voices, not by turning the level down, and in the Milky Way now and then a breath where only the air plays (the
  night's quiet, below).

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
   - `navigator.audioSession.type = 'playback'`, where there is one (Safari): the sound is heard with the iOS ringer
     off, as a video is, and the visitor's own music pauses, as it does for a video. (It was `'ambient'` at first:
     mixed with their music, but muted by the ringer switch while the icon showed it on, and the page cannot see the
     switch to say why);
   - the one AudioContext (`latencyHint: 'playback'`, at 24 kHz where the browser takes it: nothing in the score is
     above about 4 kHz, so half the work and memory) and a level gain at 0;
   - the one fetch, `SHEET` (a literal `/assets/sound/notes-N.mp3` from this site), decoded once;
   - `SCORE.play(ctx, level, buffer, true)` (score.js): sliced, the score fills its room and its air a step at a
     time and resolves `ready`; then a tick about twice a second on the context's own clock (the score plans ten
     seconds ahead), and the level rises to 1 over 4 s.
2. **A second press** ramps the level to 0 over 1.5 s, then suspends the context, which lets the audio device go.
   A suspended context's clock stops, so the score plans nothing while off.
3. **A third press** resumes the context and ramps back up over 4 s. Nothing is fetched or decoded again.

The pressed state (aria-pressed) is always the truth. It turns off when the fetch fails or answers with an error,
the decode fails, the score is missing, or the device does not start within 3 s. After a failure, the next press
asks again. Nothing is remembered between visits.

## The score (src/score.js)

Loaded deferred, at low priority, last of the scripts; it only defines `window.SCORE` until a press. It makes no
context and fetches nothing: it builds on what the switch hands it. Its room (a 4.8 s impulse, two exponentials a
sample) and its air (two 16 s stereo noises) come from its own stream, about 1.8 million draws: sliced (the switch),
they are filled in 55 steps, each its own task, in the order they always were, so every draw and every sample is
what it would be at once (the unit test holds the two to the same bytes), and the air and the music start together
when the last is done; unsliced (the unit test, the render tool), at once. `tick` does nothing before. Its time is the context's (`now`, passed in);
its one entropy is the world's (a seed in `WORLD.sky()`); it reads the sky and never writes to the world.

What it plays (sketch round twenty-one: no chord held under it; the keys, colours, changes, room and air of round
seventeen, the owner's pick):

- **The voices**: three strings (low, the cello, C2 to E3; middle, the viola, F3 to F#4; high, the violins, D#4 to
  D5), each singing one note at a time: in over 2.6 to 4.4 s, gone 4 to 6.5 s later (7 to
  13 s a note), then quiet 6 to 20 s, on a cycle of its own, never in step with the others. So the notes meet and
  part and never sit as a chord: over two hours, three or more held notes at once 10% of the time (never past 14 s),
  a whole triad 10%, 1.9 notes sounding on average (round twenty's score: 66%, 52%, 3.6).
- **The harmony, implied**: a slow walk through the sky's own chords (a new one every 20 to 32 s, the tonic first,
  once a sky its borrowed chord), each voice taking its next note from the chord of the moment, near its last
  (a step or a third likelier than a leap), sweeter where it meets another note a third or a sixth away, less likely
  where it would only make open fourths and fifths (the open sound reads as pentatonic). The low voice keeps to the
  chord's tones, its root likeliest; the others take any tone of the key. A note held into the next chord keeps to
  that chord's key.
- **The colour on top**, its own layer: the harp or the piano one note, two a third to a sixth apart, or three up or
  down, ringing, every 7 to 13 s, and now and then the note a voice just sang, higher; the horns, the clarinet or the
  violins one note swelling, or two or three legato (a sigh), every 13 to 21 s (each sky its own: at night less
  often, by day more, below). Never a tune.
- **Passages**: 40 to 80 s each, never the same twice running, which voices sing and how long they rest (all;
  warm, no violins; air, no cello; still, the colour and one voice; rich, all, closer together: how often each comes
  is the sky's own, below), the voices' level rising to a peak and falling 1 to 3 dB over each.
- **Balance**, as a player keeps it: a note that comes in alone is 2.5 dB louder, beside one other 1 dB, beside three
  or more 1.5 dB softer (at night alone 1-1.25 dB, beside one other 0.4-0.5 dB).
- **Never a hole, never a note alone**: where fewer than two notes planned would be heard for more than 3 s (or none
  at all), the voice best placed comes in early, so it is heard just before the other fades; one that found no note a
  moment ago waits. Alone, a held note (a viola, a cello, the clarinet as a voice, the stretched contrabass) is heard by an
  ear model (YAMNet, below) as a siren, a tuner or a foghorn, so the music moves in pairs of notes, a third, a sixth or
  a tenth apart, a third now and then. The low voice comes in only under a note already sounding. Never two notes
  begun within 1.2 s (no beat, no chord struck). Over two hours, nothing sounding for 2.5 s or more never (round
  twenty's: 13 times), but the Milky Way's breaths (below); one held note alone at most 6.5 s.
- **The deep end, a tide**: at the start of a chord, most chords, the root two octaves down (the tuba's own low notes,
  F1 and B-flat 1, at their own pitch, kept to the fundamental, about 33-62 Hz, felt, with a contrabass; and a quiet
  trace of the tuba's own partials from 150 to 500 Hz, 22 dB down, which a phone and a quiet ear can follow when the
  fundamental is gone), in over 4 to 5 s, held, gone 5.5 to 7 s later
  (12 to 17 s), then nothing until the next: sounding about 35% of the time. Felt, never bare: under no note it is
  6 dB down, under one 3 dB, under two 1 dB. The contrabass never under its lowest recorded note (E1): below it, the
  tuba alone. One deep note at a time; none in the mist; lighter over the cloud and under the borrowed minor chords.
- **Each sky its key and its colour on top**: afterglow F, horns; the Milky Way A-flat (Lydian), harp; aurora
  B-flat (Lydian), harp; blue hour E-flat, piano; the moonlit sea C (Dorian), low strings and clarinet; first light
  G, the strings alone. Once a sky, a borrowed chord (the minor four; in the moonlit sea, the major one).
- **Sky changes, planned with the world's** (`WORLD.sky()` names the next sky and when its change starts, a whole
  hold ahead), the one chord of it all: a near change walks through two chords both keys share, the second a major
  chord of the new key; the colour changes halfway, and the music swells to that moment (all +1.5 dB, the deep end
  +5.5 dB: 10 s up, 2 s held, 9 s down) as four voices gather into that chord one at a time, the bass first (from 10 s
  before the peak), 1.6 s apart, with the deep end under them and, in the Milky Way, aurora or blue hour, the harp's or the piano's first
  notes on the moment it changes; then they let it go, the top first. The voices rest from 5 s before the peak to
  6 s after it. A far change goes into the mist: the strings alone on the notes both keys share, no deep end, no
  colour, its heart three of them together a few seconds; out of it the new key's major chord rolls in over 6 s (a
  minor sky arrives by its relative major), the deep end only once the mist has cleared. Never two swells at once.
  If the world is already changing when the score looks (a late press), it catches up, sooner and shorter.
- **Never a clash**: no two notes closer than a minor third at once, and none a minor ninth (or more octaves) apart;
  low down (below C3) nothing closer than a fifth.
- **The night's quiet** (2026-11-16): each sky its own level inside the -23, afterglow and first light fuller, the
  night skies (the moonlit sea, aurora, the Milky Way) about 3 dB under them, blue hour between. Made by thinning:

  | sky | the voices' rests | the colour's | alone, lifted | passages (all, warm, air, still, rich) | voices at once |
  |---|---|---|---|---|---|
  | afterglow | x0.7 | x0.75 | 2.5 dB | 0.26, 0.2, 0.14, 0.08, 0.32 | any |
  | first light | x0.75 | x0.8 | 2.5 dB | 0.28, 0.18, 0.16, 0.08, 0.3 | any |
  | blue hour | x1 | x1 | 2.5 dB | 0.28, 0.2, 0.18, 0.14, 0.2 | any |
  | the moonlit sea | x1.25 | x1.35 | 1.25 dB | 0.24, 0.22, 0.2, 0.24, 0.1 | two |
  | aurora | x1.3 | x1.5 | 1.25 dB | 0.24, 0.2, 0.22, 0.24, 0.1 | two |
  | the Milky Way | x1.4 | x1.7 | 1 dB | 0.22, 0.2, 0.22, 0.28, 0.08 | two |

  At night a hole is filled by a voice, never by the colour, which keeps to its own few notes (the harp had been
  brought in to fill most holes: 18 notes a minute; now about 7), and no third voice comes in over two. The strings
  under each colour: in full under afterglow's horns and first light's violins (they were 3 and 1 dB under), 1.5 dB
  under blue hour's piano, 3 dB under the night's harp and clarinet (the clarinet's were 1.5). Never the whole level:
  the deep end keeps its weight in every sky (at a quiet level the ear loses the bass first, ISO 226). In the Milky
  Way, the quietest sky, a breath now and then: where every note has died away, the hole is left open for 4-6 s and
  the air plays alone, a soft gust (18 dB) swelling through it, so it is the air's and never a silence; well inside
  the sky (20 s in, no change within 15 s, no swell or chord near), a minute into the listening at least, no deep
  note under it, a minute and a half apart at least.
How it sounds (sketch round twenty-two):

- **Tuning**: a held note that comes in against others is tuned pure (5-limit) to the lowest of them, as players tune
  a held third or sixth to the bass (an equal-tempered third beats 5 to 30 times a second in these registers); one
  that comes in alone, halfway to pure over the chord's root, so a chain of pure intervals never drifts; never more
  than 15 cents from equal temperament; the bowed sections 0.7 of the way (their vibrato is about as wide); the harp
  and the piano equal-tempered; a held note never retuned; each with an offset of its own within 1.5 cents.
- **Each note played**: swelling in and away on sin² (the owner's; curves even in decibels were tried, and an ear
  model heard a horn rising so as an alarm); brightening as it swells and darkening as it dies away, as a bowed string
  or a horn does (a gentle low-pass following its level in decibels: cello 0.9 to 6 kHz, viola and clarinet 1.6 to
  9 kHz, violins 1.6 to 5.5 kHz, horn 1.1 to 8 kHz), so a soft note is round seventeen's dark and a full one opens.
  The clarinet and the violins as colours keep to C5, the high voice to D5 (higher, swelling, the ear model heard a
  bell and an alarm). Under about 250 Hz no note sits past 0.3 of the way to one side (headphones).
- **The room**: 3.4 s of noise dying 60 dB in 4.2 s through four low-passes whose corner falls an octave every
  0.55 s, so its highs die first and smoothly (about 4 s at 125 Hz, 3.6 at 500, 3.1 at 1 kHz, 2.5 at 2 kHz, 1.9 at
  4 kHz: round twenty's two bands left a step in the tail, a band of low-mid noise ringing on); its lows one noise in
  both ears and its highs each ear's own (below 300 Hz as a head hears a room; apart above it), swelling in over
  80 ms, tapered over its last tenth, each channel of unit energy. The send summed to one, its bass cut under 180 Hz
  (no low wash), 30 ms before it; the harp and piano 5 dB less of it (nearer); the deep end none; the return eased
  3 dB at 250 Hz and damped above 5 kHz. It follows the world: over the open dunes drier, over the cloud softer,
  wetter (about +4 dB) and darker.
- **The wind**: two noises (a low billow, 70-520 Hz; a higher stream, 450-1500 Hz), each two independent channels,
  13.7 and 17.9 s, looped with no seam (round twenty's faded at the seam, a dip every 16 s that gave the loop away),
  moved by one wind: four random walks (a new value every 1.2, 2, 6.5 and 21 s or so, glided to over half that,
  weighted 0.3, 0.45, 0.67, 1: the slower, the larger, as gusts are) on the sky's own breeze, the world's wind by
  sky (its feed's `air`: each sky's share of the day's wind, 0.35 at the afterglow's 1, and its gustiness; the
  afterglow the breeziest, the blue hour calmer, the nights calm, first light the stillest; with no world, the air at
  its floor), easing to the next sky's over about 15 s; the billow with the wind, the stream with its square, 0.4 s behind (calm air near silent,
  a gust bringing it); each drifting slowly across the field. Over the cloud the billow eases and the stream rises.
  About 18 dB under the music.
- **The ear**: the band the ear is most sensitive to eased (a -3 dB bell at 3.2 kHz, the strings' resonances at
  2-4 kHz cut 1-4 dB), a gentle 3 dB dip at 160 Hz (80-200 Hz is all the bass a laptop has), nothing below 27 Hz; no
  compression. About -23 LUFS (the owner's, 2026-11-15; -26 before), its true peak under -1 dBFS: a pluck's attack
  peaks far above its loudness, so the harp sits 2 dB under the piano and is lifted alone 1 dB at most.

Under reduced motion the world is one still frame and its clock holds, so the score stays in that sky. With no
world (no WebGL2), the score plays blue hour and never changes, and its air holds at its floor (no world, no wind by
sky: the breeze's least, 0.05).

## The feed (src/world/512-score-feed.js)

`WORLD.sky()` returns a fresh copy, or null before the sky's order exists: `t` (the sky's clock), `seq` (from the
sky on show onward: id, at, hold, move, far), `wc` (how much of the view is the cloud sea, 0 to 1, from the maps at
the camera), `air` (the world's wind by sky, AIR_BYSKY in src/world/215-air.js, a copy: each sky's shares of the day's wind at the surface and aloft, and its gustiness; docs/world.md, THE AIR), `still` (reduced motion, or the harness's still mode), `seed` (the visit's one entropy read through
subseed, salt 97). The world never reads it back; nothing it draws depends on it.

## The sheet (site/assets/sound/notes-N.mp3)

Every note the score plays, from real recordings (CC0: VS Chamber Orchestra: Community Edition, and the Versilian
Community Sample Library's grand piano; docs/licences.md), in one stereo MP3: 60 notes, about 372 s, 24 kHz, 96 kbps,
about 4.5 MB (notes-3; round twenty-two). tools/sound/sheet.py makes it, by hand, from checkouts of the two libraries (numpy and ffmpeg):

- each note at its own pitch (VSCO names its notes an octave under their sound, but not its harp);
- low-passed at its instrument's cutoff (3.2-5.5 kHz; the deep end's contrabass and tuba 0.8-0.9 kHz), with a soft
  high shelf: the bow's and the breath's texture kept (round seventeen's sheet cut them at 1.8-2.8 kHz, near a pure
  tone, which YAMNet heard as tuners and sirens; with them kept its synthetic score halved and its orchestral score
  rose); its level read as the sketches read it (RMS from 0.3 s to 2 s), kept as a gain in the index;
- a sustained note: 0.5 s in (past the attack: the score swells every sustained note in), a loop as long as the note
  allows up to 7 s (a loop under about 10 s can be heard repeating; most notes now wrap once at most), the 1.2 s
  before it crossfaded into its end at equal power, so it plays on with no seam; a harp or piano note: from its start,
  with its own decay;
- the tuba's own low notes, F1 and B-flat 1 (round seventeen's deep end was its F2 played at half speed: every time
  constant doubled, a slowed tape);
- a click at 0.2 s first, so the score finds where the decoder put time zero (MP3 decoders differ by a few ms).

It writes the file under the next name (changed-bytes-new-name: notes-2 to notes-3 in round twenty-two, the old one removed), the SHEET
line in src/sound.js and the NOTES line (the index: instrument, pitch, start, length, loops, gain) in src/score.js.

## Measuring it (tools/sound/render.mjs)

`node tools/sound/render.mjs OUT.wav [SECONDS]` plays the score in headless Chromium, offline (an
OfflineAudioContext, in the tool only), against a scripted flight (afterglow; a near change to the Milky Way; the
dunes giving way to cloud; a far change through the mist to blue hour; a near change to the moonlit sea) and prints
its loudness. Measured 2026-11-12 over 456 s, first against round seventeen's render (the take the owner approved),
then with the passages against that first live score (the figures in brackets):

- loudness: -26.0 LUFS integrated (OUT in score.js sets it), true peak -7.2 dBFS; the loudness range 8.6 LU (6.0
  before the passages; 8.8 over 30 minutes of the unit test's two-hour flight, every sky there within 1.1 LU);
- balance: within 1.3 dB of the first live score in every octave from 31.5 Hz to 8 kHz, which was within 0.7 dB of
  round seventeen (a 2.5 dB dip at 2.2 kHz and one at 160 Hz match it: the browser's mix came out a little brighter
  and fuller there);
- quiet: over those 30 minutes, 15 s in all under -36 LUFS, none longer than 4.2 s (breaths and handovers);
- the standard sound-quality metrics (MoSQITo: ISO 532-1 loudness, DIN 45692 sharpness, Daniel and Weber roughness),
  one 20 s stretch a sky, both takes at the same loudness: sharpness 0.57-0.75 acum (0.60-0.73; round seventeen
  0.61-0.72), roughness 0.006-0.027 asper (0.012-0.019): both far under where either is noticed;
- an independent ear (YAMNet, trained on AudioSet's 521 kinds of sound, through Essentia), checked first against the
  owner's own verdicts: it hears round twelve, the "alarm", as "Sine wave", "Effects unit" and "Distortion"; round
  thirteen's third sound, which hurt, as an "Electronic tuner"; round sixteen's underwater 2:45 as "Electronic music"
  where the rest of it is "Orchestra". The live score: "Orchestra", "French horn", "Ambient music"; its synthetic
  score (sine wave, tuner, effects, synthesizer, alarm, siren, rumble) a median 0.013 over 10 s windows (0.011),
  round seventeen's 0.016. (Its mood models call everything relaxed, round twelve too, so they decide nothing.)

Round twenty-one (2026-11-13), the score with no chord under it, against the same flight (OUT 0.71): -25.9 LUFS,
loudness range 9.1 LU, true peak -5.0 dBFS; the short-term loudness's middle 80% within 8.3 dB (round twenty's 7.0);
sharpness 0.73-0.84 acum, roughness 0.011-0.021 asper; YAMNet's synthetic score a median 0.015 over 10 s windows, the
worst 0.07 (round twenty's 0.008 and 0.11). Its first sketches let one held note sound alone (a viola, a cello, the
clarinet above C5, the contrabass stretched under E1), and YAMNet heard those as "Siren", "Alarm", "Electronic tuner"
and "Foghorn" (up to 0.36); muting one instrument at a time found each, so each is gone (never one held note alone, the
clarinet the moonlit sea's colour only and to C5, the contrabass never under its lowest note).

Round twenty-two (2026-11-13), how it sounds, the same flight (OUT 0.85): -26.4 LUFS, loudness range 9.4 LU, true
peak -3.6 dBFS; sharpness 0.72-0.87 acum, roughness 0.010-0.016 asper (round twenty-one's 0.011-0.021); YAMNet's
synthetic score a median 0.004 over 10 s windows (round twenty-one's 0.015, round twenty's 0.008), its orchestral score
a median 0.35 (0.25, 0.22); over three flights (seeds 1501-1503, 22 min each), against round twenty's on the same:
synthetic median 0.004 (0.010), 95th percentile 0.030 (0.065), windows over 0.05 5% (11%), the single worst 0.14 (0.11:
a viola swelling on G3 under the piano, heard as a siren at 0.07), orchestral median 0.32 (0.23). The room, measured from its own impulse: 4.0 s at 125 Hz, 3.6 at 500, 3.1 at 1 kHz, 2.5 at
2 kHz, 1.9 at 4 kHz; left and right correlated 0.1 (round twenty-one's 0.55, its right channel 2.8 dB under its left).
Through a phone speaker, modelled (little under 350 Hz), the music loses a median 2.3 dB (round twenty-one's 3.0,
round twenty's 4.8) and is more than 10 dB under its median for 7 s of the 7:36, 2 s at most (round twenty's 20 s, up
to 8 s). Tried and dropped: swells even in decibels (YAMNet heard a horn rising so as an alarm, and on sin² as a horn);
the harp, the piano and the violins at their tops, brighter (bells, alarms: so to G5 and D5).

Louder (2026-11-15, OUT 1.27): over three flights (seeds 1501-1503) -23.1, -23.3 and -22.9 LUFS, true peak -2.0,
-2.0 and -3.2 dBFS, loudness range 9.0-9.7 LU. At the old level the peaks were the harp's attacks in the Milky Way
(they would have reached -0.2 dBFS at -23), so the harp came down first.

The night's quiet (2026-11-16, OUT 1.28; 1.27 before): over 40 minutes of the unit test's two-hour flight, ordered as
the world orders its skies (seed 11, half the view cloud), -23.0 LUFS against the score before it on the same
(-23.0), true peak -3.6 dBFS (-2.0: the harp, its attacks the peaks, comes less often), loudness range 9.2 LU (8.1).
Each sky's own stretches in it (20 s in, to 10 s before its change), before and after: afterglow -25.1 to -21.9, first
light -22.5 to -21.5, blue hour -23.5 to -22.9, the moonlit sea -23.7 to -24.8, aurora -24.3 to -25.5, the Milky Way
-24.2 to -24.4 (the swells at the changes are still the loudest moments, short-term -14.4 LUFS in both; afterglow's
loudest now -16.4). Measured alone (each sky held 300 s, three seeds), before the strings' levels were set: thinning
moved the night skies 0.5-1.1 dB, afterglow 0.3, since the floor (never a hole, never a note alone) keeps about two
notes sounding; the strings under the colour set the rest. Through a phone speaker, modelled (little under 350 Hz),
the night skies sit at -28.1 to -28.2 LUFS and afterglow -23.9 (before: -26.7 to -26.9, and -26.7). The breath, the
Milky Way held 300 s: the momentary loudness through it -41 to -47 LUFS (without the gust it fell to -61 to -65,
silence); YAMNet hears in it "Music", "Silence", "Outside, rural or natural" and "Wind". YAMNet over the 40 minutes:
synthetic median 0.005 (before 0.006), windows over 0.05 14 (21), orchestral median 0.30 (0.30). render.mjs's flight,
which opens on afterglow and has little night, now reads -22.7 LUFS (true peak -3.3 dBFS, loudness range 7.8 LU).

Change OUT only with a measurement.

## What it costs

| what | bytes | when |
|---|---|---|
| sound.js | 1,388 minified, 614 as sent (Brotli 11) | every visit, parser-blocking (36-load-budget: 1.5 KB) |
| score.js | 24,985 minified, 9,259 as sent | every visit, deferred, low priority (36-load-budget: 9.5 KB) |
| the sheet | about 4.5 MB (4,467,501 B) | only at the first press |

Round twenty-two (2026-11-13), the same machine and flight: the audio thread 4.2% of real time (0.23 ms of each
5.3 ms quantum; fewer notes at once and a shorter room more than pay for each held note's own filter), the main
thread 0.30 ms a second of music, no tick over 4 ms (the longest 3.2 ms); six times slower, 95% of ticks under 5 ms,
the longest 32 ms (a sky change's planning, once in two minutes). Before it, round twenty (2026-11-12,
headless Chromium on a 2.1 GHz Xeon core, the 7:36 flight; the slowest phone modelled as six
times slower, the main thread by CDP's throttle, the audio thread scaled by hand since the throttle does not reach
it):

| | a desktop core | the slowest phone (x6) |
|---|---|---|
| the audio thread | 4.8% of real time (0.26 ms of each 5.3 ms quantum), 8.8% at the busiest half second | about 29%, 53% |
| the main thread, playing | | 0.8 ms a second of music; 95% of ticks under 1.5 ms, the longest 18-26 ms (a chord change, about twice in 7.6 min) |
| the press, filled at once (before) | about 55 ms in one task | about 0.4 s in one task |
| the press, sliced | the longest task about 20 ms; music about 0.25 s after the decode | the longest 130-220 ms; music about 0.6 s after |

The longest task left is Chrome preparing the room for convolution (3.4 s since round twenty-two; it was 4.8 s) when its buffer is set (about 20 ms on a
desktop core, 120-220 ms at x6, measured alone): the score cannot slice it, and only a shorter room would shorten it,
which would be heard.

The sheet has no line in 36-load-budget on purpose: a cold visit never loads it, so if one ever did, it would fail
that check as an unbudgeted file. Decoded at 24 kHz it holds about 71 MB of memory (57 MB before round twenty-two's
longer loops); a browser that will not open the context at 24 kHz decodes it at its own rate (48 kHz: about 143 MB). While playing: about 25 buffer sources at
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
  /assets/sound/, or the icon is not pressed and running, or the score starts fewer than three notes, three of them
  sustained (the first voices and the deep end), or the
  page throws;
- **ten seconds on:** no new notes (the score stopped planning);
- **a second press:** the icon is not unpressed and the context suspended;
- **a third press:** the icon is not pressed and running again, or something was made or fetched again.

Its plant renames `window.SCORE` in the built score.js, and the check fails on it.

## The unit test (test/unit/sound.mjs)

Plays score.js against a stand-in audio context, with no browser, and reads every note back from its start, swell
and release. On the scripted flight it fails when two notes sound closer than a minor third, low notes closer than a
fifth, or two deep notes at once; when a colour plays outside its sky or a deep note sounds in the mist; or when the
same seed does not play the same notes (another seed must play others). Then every sky change the world can make
(all thirty, near or far by the world's own near lists in 220-time-day.js) must keep those rules, swell once, on a
major chord, and thin to a mist of three notes or more; and two hours of a flight ordered as the world orders it must
keep them, with as many notes in the second hour as in the first; and over those two hours no chord may be held under
it (three or more held notes at once under 20% of the time and never past 20 s at a stretch; a whole triad under 20%:
round twenty's score had them 66% and 52%, one stretch of 86 s), no note held past 18 s (the deep end 20 s: it held
one 103 s), and never a hole (nothing sounding for more than 3.5 s, and 2.5 s or more four times at most) but the
Milky Way's breaths, and never one held note alone for more than 8 s (alone, a held string or clarinet note reads as
a tone, a siren: an ear model, YAMNet, said so); over those two hours the night's quiet: the Milky Way and aurora begin
fewer than 0.8 of blue hour's notes a minute, three voices at once there under 15% of the time, the strings under afterglow's horns 2.5 dB or
more over those under the Milky Way's harp, the notes' energy a minute by day 1 dB or more over the night's, and three breaths or
more, each inside a Milky Way, 6.5 s at most, no deep note under it, 85 s apart at least; and the room and the air filled sliced, each step
run in order on a stand-in timer, must give the same notes, the same air starts and the same bytes in every buffer as
filled at once, in 20 steps or more. About 25 s. Its plant lets a note in a step from one it meets.

Every automation curve goes through one guard (curveAt): Safari throws on a curve that overlaps another on the same
parameter, so a curve that would is played as a plain ramp to its end instead.

## Verify before it ships

docs/verify.md, plus a real iPhone:
- the silent switch on: it still plays (playback);
- the visitor's own music playing: it pauses at the press;
- a press, a lock and an unlock: the icon still tells the truth;
- a few minutes through a sky change: the change is heard as the colour turning, with no click or gap;
- the memory and battery cost of a long listen.
