# Delight: what to build next, ranked (hub, 2026-11-15)

The owner, 2026-11-15: "research more ways to make the experience more delightful. Weather, etc. u need to think bigger".

Five reports, each strict on the rules and the physics, sources by URL or DOI only:
- delight-weather.md: weather and atmospheric optics;
- delight-night.md: the night sky;
- delight-life.md: life and motion;
- delight-sound.md: sound;
- delight-visit.md: the shape of a visit.

Ranked by delight × rule fit × cost. Each item is a built PR from its lane. Visible PRs wait for the owner's merge. Bundle by theme: one visible PR a theme, so the owner merges fewer.

## The headline (delight-visit.md §0)

Nothing in the world is rare today:
- about 70% of 1.5 km cells hold a landmark;
- about 8 sites are in view at once;
- every grand piece comes back within minutes.

A visit needs a promise in the first frame, a reward by 30 s, an arc over minutes, rarity over hours, and truth throughout. Rare things are allowed when they are placed in the world (path-independent, committed out of sight, drawn by distance only) and enter or leave only by motion.

## Wave 1: cheap, true, rule-clean (start now)

| # | Item | Lane | Delight | Cost | Spec |
|---|---|---|---|---|---|
| 1 | Mist pools in the dune troughs at first light (crests stand out as islands); thin at night, none at the afterglow; depth from the visit's wind | LAND (AIR gives the depth) | 5 | S, ~15 ALU | weather §1 |
| 2 | Venus, the evening and morning star: steady, set with the sun's depth, from SEED0, in the stills | NIGHT (needs AIR's sky frame) | 5 | S | night §1 |
| 3 | Stars by colour (pastel, only the bright ones), coming out brightest first against the sky's light. This also closes the open stars-amount blend between skies (220-time-day.js post.stars) | NIGHT | 3, and a rule fix | S | night §4 |
| 4 | The moon's 22° halo and moon dogs under an ice veil, about one moonlit stay in three | SKY | 4 | S, ~20 ALU | weather §2 |
| 5 | A glory and a fogbow on the moonlit cloud sea, opposite the moon | CLOUDS | 4 | S, ~20 ALU | weather §4 |
| 6 | A roost on the name: crows come in at the blue hour, sleep through the night skies and leave together at first light | BIRDS (after the stack) | 5 | M | life §1 |
| 7 | The night's quiet: each sky its own level inside -23 LUFS; a breath of only the air in the Milky Way; night quieter by thinning voices, not level | Sound (on #276) | 3 | S | sound §F |
| 8 | The visit ruler: a 2-hour visit for every opening, headless in Node, in seconds; its bars become a CI test | FLIGHT, with CI | enabler (invisible) | S-M | visit §5.1 |
| 9 | Curated openings, step 1: score today's 2,304 stills for a subject, the night's feature visible, and nothing busy under the words; rank the worst | PC GPU, then SKY | 4 (enabler first) | S | visit §5.2 |
| 10 | One sky frame (the pole, the ecliptic through the sun, the galaxy at 60.2°), the moon's direction unified (map.md disconnect 4), and `weather(sky)` filled from the visit's wind: calm visits get mist, glassy sea and halos; windy visits get sand veils, banners, lenticulars and dust haze | AIR | enabler | S each | night §8, weather "one frame" |

## Wave 2: medium cost, the biggest sights

| Item | Lane | Delight | Spec |
|---|---|---|---|
| Terrain-held clouds: lenticular hats over far ridges, banners off the coastal mesas, cloud falls over cols. Their shapes stand still while their billows flow at windAt | CLOUDS | 5 | weather §3 |
| A far storm's anvil, its top lit above the Earth's shadow at the afterglow; the shadow climbs it into night. No lightning ever | SKY (form by CLOUDS) | 5 | weather §5 |
| A destination on the horizon: one colossal form per land, 6-10 km out on the landing heading, reached in 8-14 min | LAND, CLOUDS, FLIGHT | 5 | visit §5.3 |
| The night passage: a goose skein 300-600 m up, sometimes across the moon | BIRDS, SKY | 5 | life §2 |
| Far calls of the world's own flocks, mellowed by the air (ISO 9613-1), Doppler and delay true | Sound (needs BIRDS' read-only feed) | 5 | sound §C |
| Long meteors in the strict form only: a lit path that starts and ends below the horizon haze or behind land, so its light never begins or ends in view, for any view; rigid, constant light, 1×, never in reduced motion or the stills; grazer nights 5-12 a stay | NIGHT | 5 | night §2 |
| The Milky Way's real structure (the rift, the bulge's lane, a faint anticentre, the Coalsack), the two southern Clouds and M31 as smudges | NIGHT | 4 | night §3 |
| A crescent moon with earthshine, horns toward the sun (row B11; the owner's moon, so a visible PR) | NIGHT | 5 | night §5 |
| The night in its true order (afterglow, blue hour, night, first light), the night's type by the moon's age, the moon waxing across a long visit | NIGHT, with AIR | 4 | visit §5.5 |
| The event layer: rarity tiers on hex lattices from SEEDR (about 8 / 19 / 43 km), at most one rare site in reach; its first kinds are fog pools and a dusk murmuration over a roost | AIR (layer), BIRDS (murmuration) | 4-5 | visit §5.4, §5.8 |
| The cloud sea breathing: waves 1-2 m high and 500-1,200 m long at √(g′h); later, steady cascades over saddles | CLOUDS | 4 | life §3 |
| Riding the wind: gulls hang over windward crests where w ≥ 0.6 m/s; crows tumble over mesa rims | BIRDS | 4 | life §4 |
| The one air heard from where you fly, and sand hiss above the transport threshold | Sound (after AIR #287) | 4 | sound §A-B |
| Wings close by: a soft rustle at each bird's own flap rate as it lands on or leaves the name | Sound (bird feed) | 4 | sound §D |
| Large-world coordinates: a 2-hour visit is 86 km from the origin; fixes the late cracks, judder and mote jitter | LAND | quality | visit §8 |
| Virga under dusk clouds, tilted by the shear (after cloud drift #267) | CLOUDS | 4 | weather §6 |
| An interdune lake as a sky mirror, rare by place | LAND, SKY | 5 | visit §5.7 |

Later: a great comet in 1-2 of 16 lands; zodiacal light; purple light; airglow; a corona only where thin cloud crosses the moon; moonrise colour by elevation; looming; sixteen lands chosen to be distinct.

## The hub's rulings (the reports asked for them)

1. **Mist rim (weather §1).** Allowed as a moving shoreline, not a fade. The pool's top is opaque within about 1-2 m of depth, so at any pixel the change is the front passing. The level moves at most about 0.2 m/s through a sky change, and nothing thickens in place across the pool. A test pins it: opacity monotone in depth, and the rim's speed.
2. **Birds rising out of the mist** at first light count as entering from behind cloud. They are born inside the opaque pool, never in view.
3. **Meteors.** Only the strict form above, which is view-independent. A meteor that lights up or goes out in mid-sky is never drawn. Nothing about meteors goes to the owner until he sees the strict ones built.
4. **Rare events on a Poisson clock.** Allowed only when the thing is born out of sight (beyond the stream radius, below the horizon, inside cloud or land) and comes into view by motion, as the flocks do. "Spawn ahead of the camera at time t" stays forbidden.
5. **Owls under the 15 m floor (life §12).** Held. Not in wave 1 or 2.
6. **Wording changes the owner sees in the PR that needs them.** No question now:
   - Sound's sound-opt-in text ("reads the sky") must say it reads the sky, the air and the birds, as copies.
   - Baking the opening's ink birds into the still (visit §5.9) needs no-2d-birds reworded: the still is the world's own first frame, its ink birds included, and never a 2D bird.

   Each goes in its own PR, named in the title.

## Out (rules or physics)

| Out | Why |
|---|---|
| Lightning of any kind | It flashes in place |
| Ordinary meteors, satellites | They appear or fade in place |
| Rainbows by day, green flash, glory by sun, dust devils | No sun up, or daytime only |
| Haboob | A brown cover |
| Heat shimmer, dew glints, diamond dust | Glitter |
| Rays at dusk | The owner removed them |
| Aurora sound | The true answer is silence |
| Wind tones in rock | Below hearing at this scale |
| Insects | Pure tones in the band the score eases |
| Bats | They would need the owner's bird rule changed; don't ask |
| Real constellations | The catalogues' licences, and no date |
