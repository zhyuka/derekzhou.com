# The world's physics spec (the owner, 2026-11-15: "they should follow real physics ... while still adhering closely to [the reference] style ... make sure there are 0 disconnects")

One file per system. Each holds the real science (numbers and sources), what the world does today (file:line), the
gaps, a build spec in the world's units and clock, how it keeps the site's rules, and the fastest proof. Lanes build from
these. Every PR names its row ("physics: aurora/colour"). The hub reviews against the row.

| file | system | lane | status |
|---|---|---|---|
| aurora.md | the aurora: colour by altitude, sheets in perspective, motion, the night's phases | SKY | sent 06:48 UTC Nov 15 |
| wind-sky-night.md | the winds (5 today), the sky through twilight, stars, Milky Way, moon, rain, water, sea of cloud | SKY (sky and night items 6-12, sent); the wind items wait for the shared-state owner | partly sent |
| clouds.md | cloud advection, life cycle, diurnal timing, edges | CLOUDS | sent 06:51 UTC Nov 15 (replaces "frozen": bodies drift by layer, the sea stays) |
| sand.md | ripples (0.14 m, light only from our camera), 32 deg slip faces with a crisp brink, 20 m superimposed dunes (replace the 9 m swells), cast shadows, blowing sand by wind speed | LAND | sent 07:49 UTC Nov 15 |
| birds.md | flocks by kind: wingbeat synchrony (ibis V only, in wake bouts), the four 'reads as sync' effects, turn waves, glides, wind, the day by sky | BIRDS | sent 06:59 UTC Nov 15 |
| map.md | every phenomenon, its code, briefs and research; every shared quantity and its readers (6 winds, 3 suns, no clock rate, no weather); process gaps; the work | hub; AIR (new lane) owns the shared state | routed 06:59 UTC Nov 15 to AIR, SKY, CLOUDS, BIRDS, FLIGHT, HYGIENE, CI |

Clock facts (from aurora.md):
- Drawn time is SIM.t (1/60 s steps, real time), and uT = SIM.u + 40.
- clockNow is for budgets only.
- The sky cycle compresses a night about 80-140x and twilight about 17-22x. Each system's real rates must be scaled to the clock it runs on.

## The one wind (decided by the hub, 06:51 UTC Nov 15, from wind-sky-night.md and clouds.md)

Every system reads ONE function, windAt(x, z, y, t), in src/world/215-air.js, owned by the AIR lane (session_01DnUCpDm6U2XkpCNuFus1KC).
- U10 along V.wind (azimuth wa): per visit, within 3.0-7.5 m/s (a Rayleigh of mean 5, CDF-rescaled into that range; the hub, 08:46 UTC Nov 15). The 40 m wind stays at or under about 8.8 m/s, below every bird kind's airspeed.
- Below 100 m: u(z) = U10 * ln(z/z0)/ln(10/z0), z0 = 0.003 m.
- The low cloud layer (+100 to +1500 m): 1.3 U10 = 8.5 m/s at wa + 20 deg.
- The 3000 m deck: 2 U10 = 13 m/s at wa + 40 deg.
- The cloud sea: still (terrain-held).
- Gusts (one field carried downwind) and the wind by sky (calmer nights, a low-level jet aloft) come later, in the same function.

## The clock model (decided by the hub, 06:58 UTC Nov 15)
- Physical motion runs at 1x real: wind, clouds, birds, particles, and the aurora's local motion.
- The sky's light (sun, moon, stars, galaxy) runs at ONE declared rate, SKY_RATE (about 100x), together. AIR declares it, and a test holds each of them to it within 10%.
- Time of day is a state, not a time-lapse, for everything that moves physically.

## Owner rulings (2026-11-15)
- The world's own natural light and shadow are not darkening ("No, natural light is fine"). Cast shadows, a softer twilight key and views into the sun are allowed under the light ceiling.
- Naming: no exemption ("No, credit another way"). Sources are cited by DOI or URL only, everywhere. The spec files here were scrubbed of author names. CI adds a citation check.
