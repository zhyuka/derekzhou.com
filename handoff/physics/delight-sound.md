# SOUND: making listening more delightful (research only, no files written)

**What I did.** I read the site's sound code and rules: CLAUDE.md, RULES.json (sound-opt-in and the related absence and entropy rules), docs/sound.md, src/sound.js, src/score.js (all 601 lines) and src/world/512-score-feed.js. On the workspace side I read the matching lines of CHECKIN.md, physics/map.md (B1, B8) and the physics audits (wind-sky-night, sand, birds). I also read PR #276: it is a draft that takes the score to -23 LUFS on the owner's own words, "yes make it louder, -23". Then I researched the web. I computed the ISO 9613-1 air absorption, the ISO 226 equal-loudness offsets, the Doppler shifts, the delays and the Strouhal frequencies with a small script in the scratchpad. Both repos are untouched.

## The 4 to build first
1. **The one air, heard from where you fly (A), with sand on the move (B) in the same PR.** The hub already decided that the score will read AIR's wind (CHECKIN 08:54, Nov 15). This adds the truth of it: where the wind comes from, how gusts arrive, and the sand hiss above the transport threshold. It costs nothing on a phone, and every later spatial idea builds on it.
2. **Far calls of the world's own flocks (C).** The most delight of all: geese, gulls and herons at night, and the crows' first-light departure. The night air carries the calls and makes them mellow.
3. **Wings close by (D).** When an ink bird lands on the name or leaves it, a soft flutter at its own flap rate.
4. **The night's quiet (F).** Each sky gets its own level inside the -23 frame, and the stillest night allows a breath where only the air plays. It needs nothing else and can go now.

**Readiness.** F can be built today. A and B wait for 215-air.js. C and D wait for a read-only bird feed from BIRDS.

## Ranking
| # | Idea | Delight | Phone cost | Blocked on |
|---|---|---|---|---|
| 1 | C Far calls of the flocks | 5 | about 0 on average (a few nodes per call) | bird feed; CC0 calls in the sheet; rule text |
| 2 | D Wings close by | 4 | about 0 | bird feed |
| 3 | A The one air | 4 | 0 new nodes | AIR |
| 4 | B Sand on the move | 3 | 1 source, 2 filters | AIR |
| 5 | F The night's quiet | 3 | 0 | nothing |
| 6 | E A dune booming far off | 3 (4 on headphones, 2 on a phone) | small, transient | LAND's slip faces; foghorn and key-clash risk |
| 7 | H The rock answers (echoes of calls) | 3 | one delay per call | C; distance to the nearest rock face |
| 8 | L Over the cloud sea, the ground goes silent | 2 | 0 | folds into A, B and C |
| 9 | K Insects at dusk | 2 | small | piercing risk |
| 10 | I Wind tones in rock | 1 | none | the physics says no |
| 11 | J Aurora sound | none | none | the true answer is silence |

## The ideas

### A. The one air, heard from where you fly (delight 4)
- **Physics.**
  - Wind noise at the ear rises with the square of the wind speed: about 12 dB for each doubling.
  - Its energy is flat below about 300 Hz and falls about 26 dB per octave above. It spreads upward as the wind rises.
  - It is louder when you face the wind, and a side wind makes the two ears differ [PMC8463128]. The slope above the crossover is -26.7 dB per decade [doi 10.1121/2.0001526].
  - Gusts last under 20 s, and inland a 3 s gust is about 1.66 times the mean wind. Gusts are carried downwind at the mean wind speed (frozen turbulence) [map sources 3-5].
  - Over a day: the surface wind peaks around midday over dune fields [arXiv 2207.01103] and drops after sunset as the ground decouples. A night jet forms 300-600 m up, peaks between midnight and 3 am, and mixes down only after sunrise [ACP 2016].
- **How it maps.**
  - Sample AIR's wind at the camera. The billow follows the wind and the stream follows its square; today's shape at score.js:571-572 is already right, so keep it.
  - Use the apparent wind: the wind minus the camera's own velocity (12 m/s cruise over the dunes). Turning into the wind brings a rush; turning downwind goes quiet, as a drifting balloon hears almost nothing. Squeeze the swing to about ±3 dB so it stays faint.
  - Put the stream toward the windward ear, from the wind's bearing relative to the view. This replaces the random pan drift at score.js:573. Keep the billow near the centre.
  - A gust that lifts a veil 30 m upwind reaches you about 5 s later at 6 m/s: you see it coming, then hear it arrive.
  - A finding for AIR: today's table at score.js:560 makes first light a breeze (0.3). Before sunrise the ground wind should be at its stillest; afterglow as the breeziest sky is right. This is AIR's call, and it is visible, because the grains and veils would change too.
- **Rule fit.** It only reads a copy (wind at the camera, the camera's heading and velocity). Nothing new is fetched. It stays about 18 dB under the music.
- **Made by.** The two existing noise loops; no new nodes.
- **Fastest proof.**
  - Unit test: the score's wind direction matches AIR's within 1e-6, and a gust arrives at upwind distance divided by wind speed, within 0.2 s.
  - render.mjs with a scripted full turn in a steady wind, metered: the stream's left-right difference peaks at ±90° and is 0 heading into or away from the wind; the overall swing stays within ±3 dB.
  - Then listen for 60 s on headphones and on a phone.

### B. Sand on the move (delight 3)
- **Physics** [saltation review, arXiv 1201.4353, via sand.md]:
  - Sand starts to fly at a friction velocity of about 0.2 m/s, about 6.2 m/s of wind at 10 m.
  - Once moving, it keeps going down to about 0.8 of that.
  - The flux follows u*(u*² - u*t²) and responds within about 1 s. Streamers change every 0.1 s.
  - Crests see 1.1-2.0 times the wind, so they move sand first.
  - I found no measured spectrum of the airborne hiss, only microphones that count grain impacts. The impacts are sub-millisecond clicks, so I assume 1-8 kHz; check that against a CC0 field recording before tuning.
- **How it maps.** Hiss only above the threshold, with that hysteresis. Its level follows the flux at the camera, louder over crests and panned toward the nearest one. Keyed to the same AIR gust that lifts the veils on screen. None over the cloud sea (wc toward 1).
- **Made by.** A third noise (the stream's buffer at another offset), a band-pass at about 1.5-6 kHz, and a level texture smoothed over 20-50 ms so it never crackles.
- **Phone cost.** One source, two filters and one gain, about 5% of today's audio-thread work. Unlike the billow, a phone speaker plays it.
- **Fastest proof.**
  - Unit test: silent below the threshold, on above it, off only below 0.8 of it.
  - Render, then YAMNet: "Wind" or "Rustle" should lead; "Hiss", "White noise" and "Sanding" (a YAMNet class) stay under 0.1. Sharpness may rise by 0.1 acum at most.
  - Then listen.

### C. Far calls of the world's own flocks (delight 5)
- **Which birds, when** (birds.md's sources):
  - At night, geese, gulls and herons fly; crows, swallows and finches roost.
  - At first light, jackdaws and rooks leave their roosts in mass departures agreed by calling [Curr Biol 2022].
  - At afterglow, the roost flights.
- **The calls.**
  - Goose honk: fundamental about 500-600 Hz with harmonics above it [Macaulay].
  - Grey heron's night call: broad and harsh, about 0.7-2 kHz [Sound Approach].
  - Gull long call: a run of 8-14 harmonic elements.
- **Propagation.**
  - Spreading costs 6 dB per doubling of distance: -20 dB at 100 m and -40 dB at 1 km, against 10 m.
  - Air absorption (ISO 9613-1, computed; my code gives the standard's 4.7 dB/km at 1 kHz, 20°C, 50%):
    | Air | 500 Hz | 1 kHz | 2 kHz | 4 kHz |
    |---|---|---|---|---|
    | Dry desert night (10°C, 25% humidity) | 2.6 | 8.4 | 29 | 87 dB/km |
    | Humid cloud top (10°C, 90%) | 2.0 | 3.5 | 8.2 | 26 dB/km |
  - So a goose 1 km away keeps its fundamental (-2.6 dB) but loses its 2-4 kHz harmonics (-29 to -87 dB). Far calls are mellow by physics, which also keeps them from ever piercing.
  - A night inversion bends sound back down: up to 20 dB above the daytime prediction past a few hundred metres [SFU handbook]. At one US dune field, cold-air pooling lets sounds carry [NPS]. So at night you hear flocks you cannot see.
  - Delay is distance over 343 m/s: 0.29 s at 100 m, 2.9 s at 1 km.
  - Doppler: ±0.88 semitone for a goose at 17 m/s, ±0.55 for a gull at 11 m/s, sweeping through the closest approach.
- **How it maps.**
  - The score reads each flock in earshot: kind, range, bearing relative to the view, radial speed.
  - Call bouts come from the score's own seeded stream. I found no data on call rates, so set them by ear within bounds, for example at most one bout per flock every 30-60 s and at most 3 a minute in all.
  - Each call gets: equal-power pan; level from spreading plus the night inversion; a low-pass from the absorption at the sky's temperature and humidity; the delay; Doppler on its playback rate.
  - No cranes: the world has none (model.js). Adding them would be a BIRDS item.
- **Rule fit.**
  - Still one fetch: the calls go into the same sheet, as notes-4.mp3 under a new name. That is about 10-15 s more: roughly +150 KB at 96 kbps, and +2-3 MB of memory once decoded at 24 kHz.
  - Real recordings, CC0 only.
  - Every bird heard is an ink bird in the world, seen or born beyond sight, so the only-ink-birds rule holds.
  - It only reads the world.
  - Far calls sit 12-20 dB under the music, and their attacks must stay under -1 dBTP; #276 found that problem with the harp.
- **Phone cost.** One source, one filter, one gain and one panner per call, for 1-3 s.
- **Fastest proof.**
  - Unit test on a scripted flock at 17 m/s passing 100 m away: playback rate within 0.1% of the Doppler formula, delay equal to distance over sound speed, level falling with distance, filter corner equal to ISO 9613-1 (about 10 lines of code), call counts per sky within bounds.
  - Render, then YAMNet: "Goose" or "Honk" must beat "Vehicle horn, car horn, honking"; true peak at or under -1 dBTP.
  - Then listen to the night skies.

### D. Wings close by (delight 4)
- **Physics.** Wing sound comes on each downstroke, and an escaping bird flaps faster and higher [Curr Biol 2017, pigeons]. The world's flap rates: heron 2.9, gull 3.19, crow 3.84, goose 3.95, swallow 7.1 Hz. Most wings are heard only within metres.
- **How it maps.** Landing on the words or leaving them is the one time a bird comes within metres of the view. On each downstroke, a soft rustle at that bird's own rate and wing phase, panned to its side. A takeoff, including the gull a click starts, is quicker and a little brighter. Far flight is silent.
- **Made by.** Noise bursts, band-passed at about 300-2500 Hz, on a sin² envelope over about 40% of each wingbeat. No fetch.
- **Fastest proof.**
  - Unit test: the rustle's rate within 1% of the bird's flap rate, each onset on the downstroke within 20 ms.
  - Render a scripted landing, then YAMNet: "Bird flight, flapping wings" (class 116) should lead the non-music classes, and it must survive the phone-speaker model.
  - Then listen.

### F. The night's quiet (delight 3)
- **Physics.**
  - At Great Sand Dunes the natural ambient is 17.3 dBA by day and 14.7 dBA at night; the median including all sound is 20.5 and 15.0 dBA [NPS].
  - At quiet listening the ear loses the bass first. At 40 phon a 63 Hz tone must be 33 dB above 1 kHz to sound as loud; at 80 phon, 18 dB (ISO 226, computed).
- **How it maps.**
  - Inside #276's -23, give each sky an offset of about ±1.5 LU: afterglow and first light fuller, the night skies about 3 dB under them.
  - The Milky Way gets longer rests, and only there, now and then, a breath of 3-6 s with only the air playing. The owner said "i didnt say never silent". The air keeps playing, so a breath is not the hole that "never a hole" guards against.
  - Make night quieter by thinning the voices, not by lowering the whole level, which takes the bass away first.
- **Fastest proof.**
  - The unit test's two-hour flight: each sky's integrated loudness within 0.5 LU of its target; breaths only in the Milky Way, and only with the air playing.
  - Then listen on a phone at a normal volume.

### E. A dune booming far off (delight 3; blocked)
- **Physics** [GRL 2007; PRL 2004; Annual Review 2010]:
  - It needs an avalanche on a slip face at the angle of repose.
  - One dominant tone at 70-105 Hz with harmonics; one record shows 82, 164, 241, 332 and 413 Hz, each band 5-25 Hz wide.
  - It is sustained, going on up to a minute after the sand stops (several minutes at some sites), up to about 105 dB near the face, and heard for kilometres.
  - It needs a dry surface layer: the dunes boomed in September and were silent in December. The pitch is set by the depth of that layer, not by grain size.
- **Truth check.** The world has no slip face or brink (sand.md:83), so nothing in it could boom yet. It waits on LAND's slip faces.
- **Risks.** A sustained low drone is what YAMNet heard as "Foghorn" in round 21, and its fixed pitch will clash with the sky's key. No CC0 recording exists (Freesound: 0 results), so it would be synthesized: noise through five narrow band-passes at the harmonics.
- **Fastest proof.** YAMNet "Foghorn", "Rumble", "Aircraft" and "Engine" all under 0.1, and the harmonics audible through the phone model.

### H, L and the weather
- **H, the rock answers.** Calls and wings echo off a near mesa or canyon wall after twice the distance over the speed of sound: 0.29 s from a face 50 m away. The wind should get no echo, because its noise is made at the ear. Build after C.
- **L, the cloud sea.** Over it, the ground falls silent: no sand, no ground echoes. The night jet makes the wind stronger, and the humid air carries far calls brighter. A note: today the music's room grows wetter over the cloud, though nothing reflects sound above a cloud deck. That is the music's metaphor and the owner's pick, so leave the music alone and keep the ambience dry there.
- **Weather.** If fog pools come to first light, foggy nights are calm with an inversion, so far sounds carry more; there is no muffling to add. Virga and cirrus are silent. Thunder belongs only if lightning is ever drawn: about 3 s of delay per km, low-passed by the air.

## Don't build
- **Aurora sound (J).**
  - The aurora is about 100 km up. Any sound from there would arrive about 5 minutes late and be absorbed on the way.
  - People do report ground-level crackles. The one specific mechanism, discharges in a cold layer about 70 m up (2016), rests mainly on its proposer. Electrophonic hearing is unresolved.
  - Silence is the honest answer. The score already marks the aurora with its key and the harp.
- **Wind tones in rock (I).**
  - The Strouhal relation, f ≈ 0.2·U/d, puts a 30 m butte at 0.04 Hz and a 1 m boulder at 1.2 Hz, all far below hearing, at 6 m/s.
  - Only centimetre-scale edges sing (a 5 mm twig at 6 m/s gives 240 Hz), and the world draws none.
  - A near-pure tone is what the owner called alarm-like.
- **Insects (K).**
  - Crickets sing narrow-band tones at 2.7 kHz (tree crickets) to 4.5-5 kHz (field crickets). That is near-pure, in the very band the score eases: a siren or tuner risk.
  - An open sand sea has few of them, and dry air takes 80-87 dB/km off 4 kHz.

## The music, without blaring
- **The frame.** -23 LUFS is the owner's pick (#276). AES treats -20 as the lowest practical streaming level, because some phones cannot play louder, so -23 is still faint on a phone. Get the quiet from each sky's offset and from sparseness, not from OUT.
- **The limits.** Keep the loudness range about 9 LU and the true peak at or under -1 dBTP; the calls' attacks need the same care as the harp's.
- **Density is what blared** (the oscillators, every voice at once). Every layer here is sparse: rare calls, wings only at landings, hiss only in gusts over the threshold.

## Spatial
- Use StereoPanner, equal-power, throughout. The HRTF panner costs far more CPU and memory: Chromium engineers flagged it as a problem on low-end phones, and an unsourced rule of thumb puts it at about 10 times. Generic HRTFs also confuse front and back.
- Pan from the bearing relative to the view.
- Give distance with three cues: level, high-frequency loss and delay.
- Outdoors there is no reverb tail, so the calls stay out of the music's room.
- Keep low frequencies near the centre, as now (under 250 Hz, never past 0.3).

## Samples, licences, naming
- **CC0 only.** On Freesound with the CC0 filter (checked 2026-11-15): 217 results for geese, 20 for heron, 19 for gull call, 28 for jackdaw, 0 for booming dunes.
  - Check each file's licence on its own page.
  - Credit it as freesound.org/s/ID/: the long URL carries the uploader's handle, which is a person's name.
  - Downloads need a Freesound login, or an API token through the credential form; never a token in chat or a file.
- **Excluded or the owner's call.** Xeno-canto's licences are NC, ND or BY, so it is out. US federal recordings such as the NPS sound gallery are public domain but not labelled CC0: the owner's call, and I recommend staying with CC0 only.
- **Check for the sound lane.** docs/licences.md:20-22 names the sample libraries' maker in prose. The 2026-11-15 rule says to cite every source by URL only.
- **Rule text for the owner.** sound-opt-in says "it reads the sky (WORLD.sky, a copy)". For A to D it needs to say it reads the sky, the air and the birds, as copies. The hub's plan for the air needs this change too.

## Sources
- Booming dunes: https://doi.org/10.1029/2007GL030276 · https://pubmed.ncbi.nlm.nih.gov/15601204/ · https://resolver.caltech.edu/CaltechAUTHORS:20100629-133612595 · https://arxiv.org/abs/nlin/0412047 · https://www.sciencenews.org/article/sonic-sands-uncovering-secret-booming-dunes
- Wind noise: https://pmc.ncbi.nlm.nih.gov/articles/PMC8463128/ · https://doi.org/10.1121/2.0001526
- Gusts: https://ams.confex.com/ams/pdfpapers/138064.pdf · https://en.wikipedia.org/wiki/Wind_gust · https://courses.ems.psu.edu/meteo300/node/737
- Diurnal wind and the night jet: https://arxiv.org/abs/2207.01103 · https://www.atmos-chem-phys.net/16/7773/2016/acp-16-7773-2016.pdf · https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_09_11_18_89c07924ba.pdf
- Saltation: https://arxiv.org/abs/1201.4353 · https://doi.org/10.1016/j.geomorph.2008.02.017
- Absorption and propagation: https://www.iso.org/standard/17426.html · https://sengpielaudio.com/LuftdaempfungFormel.htm · https://www.sfu.ca/sonic-studio-webdav/handbook/Sound_Propagation.html · https://www.bba.ca/publications/acoustic-measurements-the-effects-of-weather-on-sound-propagation
- Desert ambient: https://www.npshistory.com/publications/grsa/nrtr-2008-001.pdf
- Equal loudness: https://www.iso.org/standard/34222.html
- Birds: https://macaulaylibrary.org/asset/527933341 · https://soundapproach.co.uk/?p=4337 · https://soundapproach.co.uk/pages/understanding-our-nocmig-guide · https://bioacoustics.info/article/intraspecific-variation-long-call-herring-gull-larus-argentatus-eastern-baltic-and · https://doi.org/10.1016/j.cub.2022.04.032 · https://doi.org/10.1016/j.cub.2017.09.068
- Aurora: https://theconversation.com/do-the-northern-lights-make-sounds-that-you-can-hear-168032 · https://www.gi.alaska.edu/alaska-science-forum/hark-northern-lights · https://arxiv.org/abs/2104.14660
- Rock tones and insects: https://en.wikipedia.org/wiki/Strouhal_number · https://en.wikipedia.org/wiki/Dolbear%27s_law · https://www.frontiersin.org/articles/10.3389/fevo.2021.647786 · https://orthsoc.org/sina/587a.htm
- Loudness: https://productionadvice.co.uk/td1008/
- Panner cost: https://lists.w3.org/Archives/Public/public-audio/2014JulSep/0033.html · https://bugzilla.mozilla.org/show_bug.cgi?id=1128494
- YAMNet classes: https://github.com/tensorflow/models/blob/master/research/audioset/yamnet/yamnet_class_map.csv
- Freesound CC0 searches: https://freesound.org/search/?q=geese&f=license%3A%22Creative+Commons+0%22 (and the same with heron, gull call, jackdaw)
