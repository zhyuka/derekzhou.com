# Sound

The sound icon and the one recording it plays (2026-11-07). Read this before touching
src/sound.js, site/assets/sound/, the icon in site/index.html or `.sound` in site/style.css.

## What the owner asked

- "bring it back, opt-in. using an icon that fits with the rest of the design" (2026-11-07)
- "music and faint ambiance" (2026-11-07): what it plays.

So every visit is silent; one icon in the footer, after the two links, in the words' light ink;
pressed, it plays one recording (music with a faint ambiance under it) on a loop.

## The icon

A `<button id="sound" class="sound" aria-pressed="false" aria-label="Sound" hidden>` in the
footer, written in index.html (no JS-made DOM). Its SVG is a small speaker stroked in
currentColor at the words' weight, with two drawings, waves (`.sound-on`) and a cross
(`.sound-off`); `.sound[aria-pressed]` hides one of them at once (no transition, no-fades). The
button stays `hidden` until sound.js shows it, so with no script, or no Web Audio, or no fetch,
there is no dead icon. Its 44 px target is given back by negative margin, so the footer's line
does not move.

## The switch (src/sound.js)

Minified by the build (tools/minify.mjs STEMS), parser-blocking right after site.js, so the icon
shows before the first paint. It has one handler, the button's click, and does this:

1. **The first press**, inside its own handler, because iOS and Safari start audio only there:
   - it sets `navigator.audioSession.type = 'ambient'`, where there is one, so the sound mixes
     with the visitor's own music and respects the silent switch;
   - it makes the one AudioContext (`latencyHint: 'playback'`) and a gain at 0;
   - it fetches the one recording, `SCORE` (a literal `/assets/sound/score-N.mp3` from this site),
     and decodes it once (decodeAudioData);
   - it starts the recording as an AudioBufferSourceNode with `loop = true` and ramps the level
     to 1 over 4 s. A buffer loops without a gap; a media element's loop gaps on iOS, and would
     need media-src besides.
2. **A second press** ramps the level to 0 over 1.5 s, then suspends the context, which lets the
   audio device go.
3. **A third press** resumes the context and ramps back up over 4 s. Nothing is fetched or
   decoded again.

The pressed state (aria-pressed) is always the truth. It turns off when:
- the fetch fails or answers with an error;
- the decode fails;
- the device does not start within 3 s.

After a failure, the next press fetches the recording again. Nothing is remembered between
visits. A visitor who never presses gets the switch alone, with no context made and nothing
fetched; tools/checks/38-sound.sh proves it.

## The recording

- **Where it lives:** `site/assets/sound/score-N.mp3`, served as written, under `/assets/*`'s
  immutable cache block.
- **Renaming:** when its bytes change, it is renamed by hand (score-1 to score-2, and SCORE in
  src/sound.js, in the same commit; changed-bytes-new-name).
- **Format:** MP3, which every browser decodes. Encoder padding can leave a few milliseconds at
  the loop point, so the real file should be cut to whole frames with its tail matched to its
  head (or the loop points set with loopStart/loopEnd).
- **Level:** about -26 LUFS integrated, measured offline before it is committed.

**The placeholder.** score-1.mp3 is a PLACEHOLDER, made with ffmpeg: 4 s, mono, 22.05 kHz,
16 kbps, 8,150 bytes. It is a quiet D and A (146.83 Hz and 220 Hz sines at -24 dB). It exists
only so the switch, the CSP and the check can be proved. The real recording replaces it once the
owner picks the music, under a new name (score-2.mp3). Its source and licence go in
docs/licences.md, which names no person.

## What it costs

| what | bytes | when |
|---|---|---|
| sound.js | 1,255 minified, 560 as sent (Brotli 11) | every visit (36-load-budget: 1.5 KB) |
| the recording | 8,150 (the placeholder); a real 60 to 90 s loop at 96 kbps stereo is about 0.7 to 1.1 MB | only at the first press |

The recording has no line in 36-load-budget on purpose. A cold visit never loads it, so if one
ever did, it would fail that check as an unbudgeted file. Decoded, a 90 s stereo buffer at
48 kHz holds about 35 MB of memory while it plays.

## Security

- The home page's CSP (/ and /index.html in \_headers) has `connect-src 'self'` first: fetch()
  is governed by connect-src, and the recording is the only same-origin fetch.
- 404.html's policy, and its meta copy, keep their connect-src unchanged. world_rules.py
  rule 3 pins both.
- Permissions-Policy's `autoplay=()` stays, because a press is a user gesture. The check plays
  the page under that header, with the autoplay policy that needs a gesture.
- 21-absences allows:
  - one `fetch(` in all the scripts, sound.js's `fetch(SCORE)` of a literal `/assets/sound/`
    path;
  - one `new AudioContext(`, in sound.js;
  - no audio element, worklet, media-element source, OfflineAudioContext or microphone
    anywhere.

## The check (tools/checks/38-sound.sh)

tools/sound/page.mjs serves the build with its own Permissions-Policy, opens it in headless
Chromium (autoplay needing a gesture) and takes about 10 s. It fails when:

- **before the press (2 s):** an audio context is made or anything audio is requested, or the
  icon is hidden or pressed;
- **at the press:** it makes other than one context, or requests other than one recording from
  this site's /assets/sound/, or the icon is not pressed and running;
- **the loop:** the buffer source is not looping, or has ended, once the context has played past
  its length;
- **a second press:** the icon is not unpressed and the context suspended;
- **a third press:** the icon is not pressed and running again, or something was made or fetched
  again.

Its plant sets `loop=!1` in the built sound.js, and the check fails on it.

## Verify before it ships

docs/verify.md, plus a real iPhone:
- the silent switch on: silence;
- the visitor's own music playing: both are heard (ambient);
- a press, a lock and an unlock: the icon still tells the truth;
- the loop point is inaudible.
