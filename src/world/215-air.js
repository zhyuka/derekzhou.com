  /* ---------------------------------------------------------------- the air: the world's one state
     The owner (2026-11-15): "they should follow real physics, clouds moving (when/how they move), same w auroras,
     sand, etc. ... make sure there are 0 disconnects." Every system that moves with the air or is lit by the sky reads
     it here and nowhere else: the wind (its direction, drawn once a visit, and its speed by height), the key light (the
     one baked direction every cloud body, the land and the birds are lit along), the sky's own sun (the twilights' sun
     under the sea), the moon, the sky's frame (the turn the stars and the galaxy take), the clock rates, the weather,
     the landing's heading and the flight's cruise band. realm-dunes.js reads it as WORLD.air (AIRAPI, 510).

     THE CLOCK (declared): physical motion (the wind, the clouds, the birds, the particles, the aurora's own motion)
     runs at 1x real time, SIM.t; the sky's light (sun, moon, stars, galaxy) at one rate, SKY_RATE, together. Today the
     sun sinks about 115x real through a change into a night, the moon crosses at 70-120x and the stars and galaxy stand
     still (skyFrame turns forward at SKY_RATE): the sky's lane brings them to SKY_RATE (test/unit/air.mjs lists each one's rate).

     THE WIND (physics: air/wind-profile): one direction a visit at the surface (AIR_DIR, drawn by airDraw from the
     dunes' field stream), blowing toward azimuth V.windAz at V.u10 m/s 10 m up: the visit's own wind speed, drawn once from its own stream
     (subseed(V.seed, 61)): the speed distribution of a two-dimensional normal wind vector of mean 5 m/s (a site's winds over a year) mapped by its CDF into
     3.0-7.5 m/s (the hub's ruling, 2026-11-15: the 40 m wind then stays under about 8.8 m/s, under every bird kind's own
     airspeed, so no bird flying upwind goes backward over the ground; truncated, not clamped, so nothing piles at the
     ends). The sand's own threshold (about 6.2 m/s at 10 m, the crests' speed-up 1.5x) is the sand's to apply. Its speed and its turn by height
     (airProfile): under 100 m the log law over sand, u(z) = U10 ln(z / z0) / ln(10 / z0), z0 = 0.003 m (shares of U10:
     0.1 m 0.43, 0.87 m 0.70, 2.5 m 0.83, 26 m 1.12, 60 m 1.22, 100 m 1.28), the direction the surface's; from 100 to
     300 m it eases to the low cloud layer's 1.3 U10, veered 20 deg (the wind turning toward the geostrophic with
     height, about 32 deg from the surface to the free air: https://www.ecmwf.int/sites/default/files/elibrary/2016/16644-wind-turning-boundary-layer.pdf;
     the profile: https://www.eoas.ubc.ca/books/Practical_Meteorology/prmet102/Ch18-abl-v102.pdf), held to 1500 m; from 1500 to 3000 m it eases to the deck's
     2 U10, veered 40 deg. Heights are over the ground under the reader. Readers whose direction is still their own (AIR_APART: the maps' own wind field, the wing gusts' timers, the score's gusts) are listed there with the change that joins
     them, and test/unit/air.mjs holds every other reader to AIR_DIR within 1e-6 */
  var SKY_RATE = 100;   // the sky's light runs this many times real time (declared: sun, moon, stars and galaxy together)
  var AIR_DIR = [0, 1];   // the visit's wind, unit (x, z), blowing toward (airDraw sets it; the water's ripples read it through LDEF)
  var AIR_HEARD_Y = 2;   // (the air heard: never asked lower than this over the ground, m: the camera's own floor is higher)
  var AIR_H = { veils: 5, birds: 40, sea: 100, clouds: 800, deck: 7000 };   // each reader's declared height, m over the ground (the birds' default: HOST.wind takes a bird's own; sea: the cloud sea's top, carried at the wind 100 m over its own surface, physics: clouds/sea; clouds: the low layer's free clouds, physics: clouds/drift; deck: the cirrus, 7 km up: physics: sky/cirrus)
  var AIR_U10 = [5, 3, 7.5], AIR_Z0 = 0.003, AIR_LN10 = Math.log(10 / AIR_Z0), AIR_LAYERS = [[100, 300, 1.3, 20], [1500, 3000, 2, 40]];   // (the profile: the visits' U10: the mean of the speed distribution of a two-dimensional normal wind vector, the range it is mapped into, m/s; roughness m; the layers aloft: from, to, share of U10, veer deg)
  var AIR_KEY_EL = [5, 14], AIR_KEY_AZ = 55;   // the key light: 5-14 deg up, within 55 deg of upwind (the dunes' windward slopes lit)
  var AIR_SUN_EL = { afterglow: -3, bluehour: -7, firstlight: -3 }, AIR_SUN_NIGHT = -24;   // the twilights' sun under the sea (deg); a night's, sunk to AIR_SUN_NIGHT through a change
  var AIR_CRUISE = [14, 32];   // the flight's clearance band, m: over the sand to over the cloud sea (flightParams, cruiseOf)
  var AIR_APART = { maps: 'physics: air/wind-profile', gusts: 'physics: air/gust-field (the birds read HOST.gust)', score: 'physics: air/score-gusts (its gusts its own until it reads the field at the camera: the sound lane)' };
  var AIR_W = { x: 0, z: 0 }, AIR_MOON = { d: [0, -1, 0], w: 0, s: 0, v: 0, leg: 0, el: -90, az: 0 };
  function airDraw(R, V) {   // the visit's wind, drawn once (the dunes' field, its first draw): unit (x, z) toward, and its azimuth
    var wa = R.r(0, 2 * PI), w = [Math.sin(wa), Math.cos(wa)];
    V.wind = w; V.windAz = wa * 180 / PI; V.u10 = airU10(V.seed); AIR_DIR[0] = w[0]; AIR_DIR[1] = w[1];
    return w;
  }
  var AIR_P = { s: 0, veer: 0 };
  function airEase(a, b, y) { var k = Math.max(0, Math.min(1, (y - a) / (b - a))); return k * k * (3 - 2 * k); }
  function airProfile(y) {   // at y m over the ground: s the share of U10, veer deg (clockwise from the surface's way), the one object reused
    var lg = Math.log(Math.max(y, AIR_Z0) / AIR_Z0) / AIR_LN10, L0 = AIR_LAYERS[0], L1 = AIR_LAYERS[1];
    if (y <= L0[0]) { AIR_P.s = lg; AIR_P.veer = 0; return AIR_P; }
    var k0 = airEase(L0[0], L0[1], y), k1 = airEase(L1[0], L1[1], y), lg0 = Math.log(L0[0] / AIR_Z0) / AIR_LN10;
    AIR_P.s = lg0 + (L0[2] - lg0) * k0 + (L1[2] - L0[2]) * k1; AIR_P.veer = L0[3] * k0 + (L1[3] - L0[3]) * k1;
    return AIR_P;
  }
  function airU10(seed) {   // a visit's wind speed 10 m up, m/s: the speed distribution of a two-dimensional normal wind vector, of mean AIR_U10[0] (sigma = mean / sqrt(pi / 2)) truncated to [AIR_U10[1], AIR_U10[2]] by its CDF
    var u = RNG(subseed(seed, 61)).f(), s2 = 2 * Math.pow(AIR_U10[0] / Math.sqrt(PI / 2), 2), F = function (r) { return 1 - Math.exp(-r * r / s2); };
    var a = F(AIR_U10[1]), b = F(AIR_U10[2]);
    return Math.sqrt(-s2 * Math.log(1 - (a + (b - a) * u)));
  }
  function u10Of(V) { V = V || SIM.V; return V && V.u10 ? V.u10 : 0; }   // (still air before a visit's wind)
  function airSpeed(y, V) { return u10Of(V) * airProfile(y).s; }   // m/s at y m over the ground
  /* THE WIND BY SKY (physics: air/wind-by-sky): the sky is the time of day (its light at SKY_RATE), and the wind
     follows the day as the boundary layer does. By day the surface wind is mixed up from aloft (the afterglow, the
     late afternoon, the breeziest); at dusk the mixing dies and the ground's air slows while the air 100-300 m up
     speeds past its day's speed (the nocturnal jet); first light is the stillest at the ground (the night's coldest,
     most stable air). AIR_BYSKY gives each sky its shares: s the surface's (to 20 m) of the visit's day wind, j the
     jet's (100-300 m), g its gustiness (the gusts' share of their day's intensity: a stable night's are weaker; set
     by eye within row 6's band, no source gives it by sky). The gusts' field is carried at the mean wind on every sky
     (row 6: frozen and carried downwind, https://glossary.ametsoc.org/wiki/Frozen_turbulence), carried on the
     surface's clock (airClock), so it passes a point at s U10: a point dx downwind meets each gust dx / (s U10) later
     in flight time (dx / U10 on the surface's clock), and a gust's e-fold is the day's 10-23 s over s (the eddies'
     scale, 22 U10, is the day's: no source found gives a stable night's shorter scale in this form, so the longer
     e-fold is taken, the hub's ruling). Up
     the profile the share eases from s to j (20-100 m, in log height) and from j to the free air's 1 (300-1500 m).
     Over a hold the sky's shares hold; through a change they ease into the next sky's with its light (ss01 of the
     change). The score's breeze is the same table (512's feed). Whatever the wind carries is carried by its integral,
     a clock of each share (airClock: closed form over the sky's order), so a change never jumps a grain, a gust or a
     veil: the shaders read the surface's as uAir.x */
  var AIR_BYSKY = { afterglow: [1, 1, 1], bluehour: [0.7, 1.2, 0.65], firstlight: [0.35, 1.3, 0.5], moonlit: [0.5, 1.4, 0.6], milkyway: [0.4, 1.5, 0.5], aurora: [0.45, 1.4, 0.55] };
  var AIR_NC = 3, AIR_ONE = [1, 1, 1], AIR_SL = [20, 100, 300, 1500], AIR_WX = [1, 1, 1], AIR_IA = [0, 0, 0], AIR_IB = [0, 0, 0], AIR_TC = [0, 0, 0], AIR_ABC = [1, 0, 0];
  function airDay(x, z, y, V) { var a = airBase(x, z, y, V); return { x: a.x, z: a.z }; }   // the day's wind at y m up, m/s (the sky's share 1, whatever the sky: a reader that wants the day's wind, not the hour's; a fresh object)
  function airTable() { var o = /** @type {{ [sky: string]: number[] }} */ ({}), k; for (k in AIR_BYSKY) o[k] = AIR_BYSKY[k].slice(); return o; }   // (a fresh copy: the score's feed)
  function airSh(e) { return (e && AIR_BYSKY[e.id]) || AIR_ONE; }
  function airIdx(seq, tS) { var i = seq.length - 1; while (i > 0 && seq[i].at > tS) i--; return i; }
  function airPre(seq, i) {   // the shares' integral from the order's start to seq[i].at (cached on each entry: an entry's never changes)
    var j = i; while (j > 0 && !seq[j].aI) j--;
    if (!seq[j].aI) seq[j].aI = [0, 0, 0];
    for (; j < i; j++) { var e = seq[j], A = airSh(e), B = airSh(seq[j + 1]), o = [0, 0, 0]; for (var c = 0; c < AIR_NC; c++) o[c] = e.aI[c] + e.hold * A[c] + e.move * (A[c] + B[c]) / 2; seq[j + 1].aI = o; }
    return seq[i].aI;
  }
  function airInt(tS, out) {   // the shares' integral from the order's start to sky time tS (s x share)
    var seq = SKY.seq, c; if (!seq.length) { for (c = 0; c < AIR_NC; c++) out[c] = tS * AIR_ONE[c]; return out; }
    if (tS <= seq[0].at) { var A0 = airSh(seq[0]); for (c = 0; c < AIR_NC; c++) out[c] = (tS - seq[0].at) * A0[c]; return out; }   // (before the order's first hold: its share, measured from where the prefix is, seq[0].at)
    var i = airIdx(seq, tS), e = seq[i], A = airSh(e), P = airPre(seq, i), d = tS - e.at, nx = seq[i + 1];
    if (!nx || d <= e.hold) { for (c = 0; c < AIR_NC; c++) out[c] = P[c] + d * A[c]; return out; }
    var B = airSh(nx), x = Math.min(1, (d - e.hold) / e.move), q = x * x * x - x * x * x * x / 2;   // (the integral of ss01 over 0..x)
    for (c = 0; c < AIR_NC; c++) out[c] = P[c] + e.hold * A[c] + e.move * (A[c] * x + (B[c] - A[c]) * q);
    return out;
  }
  function weather(t) {   // the sky's shares at the flight's time t: [s, j, g] (the one array, reused; all 1 before the sky's order)
    var seq = SKY.seq, c; t = t === undefined ? SIM.t : t;
    if (!seq.length) { for (c = 0; c < AIR_NC; c++) AIR_WX[c] = AIR_ONE[c]; return AIR_WX; }
    var tS = t + SKY.dt, i = airIdx(seq, tS), e = seq[i], A = airSh(e), B = seq[i + 1] ? airSh(seq[i + 1]) : A, k = Math.max(0, Math.min(1, (tS - e.at - e.hold) / e.move)), q = k * k * (3 - 2 * k);
    for (c = 0; c < AIR_NC; c++) AIR_WX[c] = A[c] + (B[c] - A[c]) * q;
    return AIR_WX;
  }
  /* THE WEATHER BY WIND (physics: air/weather): what the visit's own wind (V.u10, no new draw) and the sky make of
     the air, for each reader to read (LAND's mist, CLOUDS' lenticulars and banners, the haze): wx(t) = { mist, oro,
     ridge, vis, dust }.
     - mist (m deep): radiation mist pooled on the sand on a still clear night, thickest before sunrise. Each sky's
       depth (AIR_MIST: first light 10, a night 3.5, the blue hour 1, the afterglow 0) is scaled by the visit's own
       moisture (moist, 0..1), which carries the wind's mixing too (a visit moist enough for mist is calm enough to
       keep it: its surface wind is under 3 m/s on every sky with mist). Radiation fog needs air near
       saturation as well as a calm clear night (https://glossary.ametsoc.org/wiki/Radiation_fog), and a coastal fog
       desert's is mostly advective: marine boundary-layer air from over the cool upwelling coast, carried inland, its fog
       and low cloud at their most in the early morning and gone soon after sunrise
       (https://acp.copernicus.org/articles/20/3415/2020/). It is the visit's air, not
       the land in view: moist on the visit's calm synoptic days, when the marine layer creeps in rather than being
       mixed out (U10 under 4.02 m/s whole, none past 4.1: AIR_MOIST, set with LAND for pools at the cut on 3 of the 10 dune openings, 3, 10 and 14, by
       the live visit's seed, the hub's ruling; about 28% of visits moist; no new draw,
       the visit's own U10). Through a change the level moves toward the next sky's at AIR_MIST_RATE
       (0.18 m/s: a mist's rim creeps up a 13 deg slope at under 1 m/s), a closed form of the sky's clock, so it
       never jumps and never races;
     - oro (0..1): the orographic gate, the visit's own (U10 alone, the whole visit): the ridge-top wind is the log
       law's 100 m share of U10 (1.28: ridge), and past 7.7 m/s there (oroU; eased over 7.2-8.2: U10 about 6) the ridges
       stand lee waves, lenticulars and banner clouds; N (0.01/s, the stable troposphere's buoyancy frequency, the value
       CLOUDS' lens takes) sets the lee wave's length, 2 pi U / N, so the lens reads one weather (wx(t).oroU, .N);
     - vis (km): the visit's own visibility, 10 km in clean air, 4 km in blown sand once U10 is past the sand's
       threshold (eased over 5.8-7.0 m/s); dust (0..1) is how far past. Neither changes with the sky: the far land
       never fades in place */
  var AIR_MIST = { afterglow: 0, bluehour: 1, firstlight: 10, moonlit: 3.5, milkyway: 3.5, aurora: 3.5 };
  var AIR_MIST_RATE = 0.18, AIR_WXK = { ridge: 1.28, oro: [7.2, 8.2], oroU: 7.7, N: 0.01, vis: [10, 4], dust: [5.8, 7] };   // (oroU: the ridge-top wind the gate opens at, the middle of oro's ease; N: the troposphere's buoyancy frequency, 1/s, the lee wave's: its wavelength 2 pi U / N)
  var AIR_WXO = { mist: 0, moist: 0, oro: 0, ridge: 0, oroU: AIR_WXK.oroU, N: AIR_WXK.N, vis: AIR_WXK.vis[0], dust: 0 };
  var AIR_MOIST = [4.02, 4.1];   // (the moisture: whole under this U10, none past this, m/s)
  function airMoist(V) { return 1 - airEase(AIR_MOIST[0], AIR_MOIST[1], u10Of(V)); }   // 0..1: the visit's low-level moisture (its marine layer in)
  function airMistOf(id, q) { var d = AIR_MIST[id]; return d === undefined ? 0 : q * d; }   // a sky's mist depth on this visit, m (q its moisture)
  function airMistAt(t, q) {   // the mist's level at the flight's t: each sky's depth, moved toward the next at AIR_MIST_RATE from its change's start (a closed form: a ramp that spills into the next hold if it must)
    var seq = SKY.seq; if (!seq.length) return 0;
    var tS = t + (SKY.dt || 0), i = airIdx(seq, tS), j, e, a, b, t0, r;
    for (j = i; j >= Math.max(0, i - 1); j--) {   // (the change under way, else the last one whose ramp may still run)
      e = seq[j]; if (!seq[j + 1]) continue;
      t0 = e.at + e.hold; if (tS < t0) continue;
      a = airMistOf(e.id, q); b = airMistOf(seq[j + 1].id, q); r = AIR_MIST_RATE * (tS - t0);
      if (r < Math.abs(b - a)) return a + (b > a ? r : -r);
      if (j === i) return b;
    }
    return airMistOf(seq[i].id, q);
  }
  function airWx(t, V) {   // the weather the wind makes at the flight's t (the one object, reused)
    t = t === undefined ? SIM.t : t;
    var u = u10Of(V), K = AIR_WXK, o = AIR_WXO;
    o.moist = airMoist(V); o.mist = airMistAt(t, o.moist);
    o.ridge = K.ridge * u; o.oro = airEase(K.oro[0], K.oro[1], o.ridge);
    o.dust = airEase(K.dust[0], K.dust[1], u); o.vis = K.vis[0] + (K.vis[1] - K.vis[0]) * o.dust;
    return o;
  }
  function airClock(t) { var dt = SKY.dt || 0; airInt(t + dt, AIR_IA); airInt(dt, AIR_IB); for (var c = 0; c < AIR_NC; c++) AIR_TC[c] = AIR_IA[c] - AIR_IB[c]; return AIR_TC; }   // the shares' clocks from the flight's start: s x s
  function airABC(y) {   // the share at y m up as a s + b j + c 1 (the one array, reused)
    var e1 = y <= AIR_SL[0] ? 0 : airEase(0, 1, Math.log(y / AIR_SL[0]) / Math.log(AIR_SL[1] / AIR_SL[0])), e2 = airEase(AIR_SL[2], AIR_SL[3], y);
    AIR_ABC[0] = 1 - e1; AIR_ABC[1] = e1 * (1 - e2); AIR_ABC[2] = e1 * e2; return AIR_ABC;
  }
  function airShare(y, t) { var w = weather(t), m = airABC(y); return m[0] * w[0] + m[1] * w[1] + m[2]; }   // the sky's share of the day's wind at y m up, at t
  function airCarried(y, t) { var T = airClock(t), m = airABC(y); return m[0] * T[0] + m[1] * T[1] + m[2] * t; }   // s: the wind's integral at y m up over its day speed (what it has carried a thing, over that speed)
  var UAIR = new Float32Array([0, 1, 1, 0]);   // (the shaders' uAir: the surface's clock, on the flight's footing (as gustAt's: no lead), its share, the gustiness, - (0))
  function airFrameU(u) { var w = weather(u); UAIR[1] = w[0]; UAIR[2] = w[2]; UAIR[0] = airClock(u)[0]; }
  function airBase(x, z, y, V) {   // the day's wind at y m up (the sky's share 1): { x, z } m/s, the one object, reused
    var w = (V || SIM.V || {}).wind, p = airProfile(y), s = u10Of(V) * p.s, v = p.veer * PI / 180, c = Math.cos(v), n = Math.sin(v);
    AIR_W.x = w ? (w[0] * c + w[1] * n) * s : 0; AIR_W.z = w ? (w[1] * c - w[0] * n) * s : 0;
    return AIR_W;
  }
  function windAt(x, z, y, t, V) {   // the wind at (x, z), y m up, at t: { x, z } m/s (the one object, reused); still air before a visit's wind
    var a = airBase(x, z, y, V), k = airShare(y, t === undefined ? SIM.t : t); a.x *= k; a.z *= k; return a;
  }
  function airVec3(V, y, lift, k) { var a = airBase(0, 0, y, V); k = k === undefined ? 1 : k; return [a.x * k, lift, a.z * k]; }   // (a particle set's day wind, m/s: x, the given lift, z; k its share of the air's; the shaders carry it by uAir.x, the surface's clock)
  function airUpwind(V) { return Math.atan2(-V.wind[0], -V.wind[1]) * 180 / PI; }   // the azimuth the wind comes from, deg
  function airKeySet(L) { L.sunDir = dirAzEl(L.sunAz, L.sunEl); return L.sunDir; }   // the key's direction, once a visit (planVisit)
  function keyAt(V) { return V.light.sunDir; }   // the key light (toward it): one for every sky (the clouds' light is baked along it; at night it is the moon's)
  function airSunEl(id) { var e = AIR_SUN_EL[id]; return e === undefined ? null : e; }   // a sky's own sun, deg (null: a night's, the key's own place)
  function airSkySun(V, el) { return el === null ? Array.prototype.slice.call(keyAt(V)) : dirAzEl(V.light.sunAz, el); }   // the sky's own sun (uSkyS at a hold)
  function airMoon(t) { return moonShown(t, AIR_MOON); }   // the moon on show at sky time t (226: its route)
  /* THE SKY'S FRAME (physics: air/sky-frame): one celestial sphere for the sun, the moon, the planets, the stars and
     the galaxy, so that every light in the night stands where the others say. The place: AIR_LAT 64 deg north (the
     aurora is one of the skies: a black-sand coast under the auroral oval), so the celestial pole stands 64 deg up in
     the north. The season: the visit's own stream (subseed(V.seed, 63)) puts the sun on the ecliptic in the dark half
     of the year (its longitude 180-360 deg, its declination 0 to -23.4). North: once a visit, where an evening sun at
     the afterglow's depth stands on the sky's own sun's azimuth (V.light.sunAz). The clock: the sphere turns forward
     only, at SKY_RATE times the sidereal rate (AIR_SIDEREAL s a turn), never stopping and never turning back; at sky
     time 0 its hour is the opening sky's (its sun's depth, first light in the morning, the others in the evening), so
     the frame's sun stands at the opening sky's own depth on its evening or morning side. That puts it at the drawn sun
     only for the afterglow: the drawn sky keeps its sun's depth and azimuth by sky (the night's true order is the next
     change), so the blue hour's drawn sun is 8-12 deg off the frame's and first light's 105-174 deg. The frame's sun is
     the sphere's own reference, never a light: no reader may light anything by skySphere().sun (through a night's
     hold it stands above the horizon 29.7% of the time); the land and the clouds are lit by keyAt, the sky by its own
     drawn sun (uSkyS). The planets are placed by the drawn sun (the night's lane). The ecliptic leans AIR_OBL
     to the equator; the galactic pole and centre are J2000's (AIR_GAL: the pole 60.2 deg from the ecliptic's, the
     centre 5.5 deg south of the ecliptic). skyFrame(tS, V): the frame as the night sky's shader reads it (226's uSkyF),
     row-major, frame to world: a direction s in equatorial axes (right ascension 0, 90 deg, the pole) stands at F s in
     the world; the one array, AIR_FRAME, filled in place. skySphere(tS, V): { M (the same, column-major), pole, ecl,
     galPole, galCentre, sun (the frame's own), lat, lst, sunDec (deg) }, the one object. Both take the sky's time tS
     (the flight's t plus SKY.dt); before a visit the identity */
  var AIR_LAT = 64, AIR_OBL = 23.4393, AIR_SIDEREAL = 86164.1, AIR_GAL = { pole: [192.8595, 27.1283], centre: [266.4051, -28.9362] };   // (deg: the latitude, the obliquity; a sidereal day, s; the galactic pole's and centre's right ascension and declination)
  var AIR_FRAME = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  var AIR_SKYF = { M: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]), pole: [0, 1, 0], ecl: [0, 1, 0], galPole: [0, 1, 0], galCentre: [1, 0, 0], sun: [0, 1, 0], lat: AIR_LAT, lst: 0, sunDec: 0 };
  var AIR_SV = { V: null, n: -1, azN: 0, lam: 0, ra: 0, dec: 0, lst0: 0, N: [0, 0, 1], E: [-1, 0, 0], P: [0, 1, 0], Q: [0, 1, 0], eq: null };
  function airEq(ra, dec, o) { var a = ra * DEG, d = dec * DEG; o = o || [0, 0, 0]; o[0] = Math.cos(d) * Math.cos(a); o[1] = Math.cos(d) * Math.sin(a); o[2] = Math.sin(d); return o; }   // (a direction in the equatorial frame)
  function airSunH(h, morning, dec) {   // the sun's hour angle (rad, from upper culmination, 0..2 pi) at elevation h deg: an evening's west, a morning's east
    var f = AIR_LAT * DEG, d = dec * DEG, c = (Math.sin(h * DEG) - Math.sin(f) * Math.sin(d)) / (Math.cos(f) * Math.cos(d)), H = Math.acos(Math.max(-1, Math.min(1, c)));
    return morning ? 2 * PI - H : H;
  }
  function airSvSet(V) {   // the visit's place, season, north and the opening's hour, once a visit (the hour once the sky's order exists)
    var S = AIR_SV, seq = SKY.seq, c;
    if (S.V !== V) {
      var u = RNG(subseed(V.seed, 63)).f(), lam = PI + PI * u, e = AIR_OBL * DEG, ra = Math.atan2(Math.cos(e) * Math.sin(lam), Math.cos(lam)), dec = Math.asin(Math.sin(e) * Math.sin(lam)) / DEG;
      var f = AIR_LAT * DEG, d = dec * DEG, h = airSunEl('afterglow') * DEG;
      var cA = (Math.sin(d) - Math.sin(f) * Math.sin(h)) / (Math.cos(f) * Math.cos(h)), A = 2 * PI - Math.acos(Math.max(-1, Math.min(1, cA)));   // (its compass azimuth: the west, from north through east)
      S.V = V; S.n = -1; S.lam = lam; S.ra = ((ra % (2 * PI)) + 2 * PI) % (2 * PI); S.dec = dec; S.azN = V.light.sunAz + A / DEG;
      var N = dirAzEl(S.azN, 0); for (c = 0; c < 3; c++) S.N[c] = N[c];
      S.E[0] = -N[2]; S.E[1] = 0; S.E[2] = N[0];   // (north x up: a compass azimuth A is the world's azN - A)
      for (c = 0; c < 3; c++) { S.P[c] = Math.cos(f) * N[c] + (c === 1 ? Math.sin(f) : 0); S.Q[c] = -Math.sin(f) * N[c] + (c === 1 ? Math.cos(f) : 0); }   // (the pole, AIR_LAT up in the north; the equator on the meridian, to the south)
      S.eq = { ecl: [0, -Math.sin(e), Math.cos(e)], gp: airEq(AIR_GAL.pole[0], AIR_GAL.pole[1]), gc: airEq(AIR_GAL.centre[0], AIR_GAL.centre[1]), sun: airEq(S.ra / DEG, S.dec) };
    }
    if (S.n < 0 && seq.length) {   // (the opening's hour: its sun's depth, on its side)
      var o = seq[0].id, el = airSunEl(o); S.lst0 = airSunH(el === null ? AIR_SUN_NIGHT : el, o === 'firstlight', S.dec) + S.ra; S.n = 0;
      if (o === 'milkyway') S.lst0 = airGalLst(S, V);   // (the galaxy's opening: its band across the view, the hub's round 11)
    } else if (S.n < 0) S.lst0 = airSunH(airSunEl('afterglow'), false, S.dec) + S.ra;
    return S;
  }
  /* (the hub's round 11: a milkyway opening must look majestic) on a milkyway opening the sky's hour is chosen, once a
     visit, so that the band arches across the opening's view, high and near level, never hanging near-upright from the
     top and with its brightest stretch in view (the galactic centre never rises at 64 deg north: the Cygnus star cloud and
     its rift, longitude 60-90, before the faint anticentre): of all the sphere's hours (its sun is its own reference, never a light: it already stands up for 29.7% of a
     night's hold), the one whose band, a straight line on the screen
     (a great circle through the eye), lies flattest across the reference windows' views while standing well above
     their horizon and inside their top (a 16:10 desktop and a 393x852 phone, at the opening's heading and each one's
     framing pitch: 386's frustum, 320's basePitch). At 64 deg north the band can never cross the view level and in
     frame (its pole stands at most 53 deg up, so a level band crosses at 37 deg up or more, above a desktop's top at
     28): the pick is the flattest that keeps it in frame. test/unit/air.mjs measures each opening's tilt and height */
  var AIR_GALV = [[Math.tan(36 * DEG), Math.tan(36 * DEG) / 1.6, 0, 1 / 1.6, 9], [Math.tan(21 * DEG), Math.min(Math.tan(21 * DEG) * 852 / 393, Math.tan(40 * DEG)), 1, 852 / 393, 0]];   // (tanX, tanY, the frame's tall share, H/W, CAMUP)
  function airGalBand(gp, yaw, fr, W, gc) {   // the band's screen line in one reference view, sampled across it: { tilt (deg), n (its share standing high and in frame), br (the brightest such point's weight), l (its galactic longitude) }
    var tX = W[0], tY = W[1], p = Math.atan((2 * (fr[0] + (fr[1] - fr[0]) * W[2]) - 1) * tY) + W[4] * DEG, cp = Math.cos(p), sp = Math.sin(p), i, k;
    var f = [Math.sin(yaw) * cp, sp, Math.cos(yaw) * cp], r = [Math.cos(yaw), 0, -Math.sin(yaw)], u = [-Math.sin(yaw) * sp, cp, -Math.cos(yaw) * sp];
    var dt = function (x, y) { return x[0] * y[0] + x[1] * y[1] + x[2] * y[2]; }, ug = dt(u, gp), o = { tilt: 90, n: 0, br: 0, l: 0 };
    if (Math.abs(ug) < 1e-6) return o;
    var a = -dt(f, gp) / (tY * ug), m = -tX * dt(r, gp) / (tY * ug), hz = -sp / (tY * cp), lo = hz + 0.35 * (1 - hz), q = [gp[1] * gc[2] - gp[2] * gc[1], gp[2] * gc[0] - gp[0] * gc[2], gp[0] * gc[1] - gp[1] * gc[0]];
    o.tilt = Math.atan(Math.abs(m) * W[3]) / DEG;
    for (i = -9; i <= 9; i++) {
      var x = i / 10, y = a + m * x, d = [0, 0, 0];
      if (y < lo || y > 0.7) continue;   // (high, and the band's half-width inside the top)
      for (k = 0; k < 3; k++) d[k] = f[k] + x * tX * r[k] + y * tY * u[k];
      var l = Math.atan2(dt(d, q), dt(d, gc)) / DEG, w = 0.25 + 0.28 * (1 + Math.cos(l * DEG)) + 0.8 * Math.exp(-Math.pow((l - 75) / 20, 2));   // (sky-body's galAlong, and the Cygnus star cloud and its rift, l 60-90: the brightest stretch that rises at 64 deg north)
      o.n += 1 / 19; if (y < 0.6 && w > o.br) { o.br = w; o.l = l; }   // (the brightest stretch below the top band, clear of the big cloud's lower edge: no lanes hanging from it)
    }
    return o;
  }
  function airGalScore(gp, gc, yaw, fr) {   // lower is better: the flattest band, mostly high and in frame, with the brightest stretch in it, in both views
    var s = 0;
    for (var w = 0; w < AIR_GALV.length; w++) { var b = airGalBand(gp, yaw, fr, AIR_GALV[w], gc); s += b.tilt - 400 * b.br + (b.n < 0.4 ? 2000 * (0.4 - b.n) : 0); }   // (400 a unit of weight: Cygnus in frame on about half the openings, the rest the heading's: FLIGHT)
    return s;
  }
  function airGalLst(S, V) {   // the night's hour that best frames the band (rad), from the hour the night's depth gives
    var yaw = airHeading0(), fr = (V.def && V.def.frame) || [0.4, 0.6], best = Infinity, bl = S.lst0, k, c, gp = [0, 0, 0], gc = [0, 0, 0];
    for (k = 0; k < 720; k++) {
      var lst = S.lst0 + k * PI / 360, cl = Math.cos(lst), sl = Math.sin(lst);
      for (c = 0; c < 3; c++) { var m0 = cl * S.Q[c] - sl * S.E[c], m1 = sl * S.Q[c] + cl * S.E[c]; gp[c] = m0 * S.eq.gp[0] + m1 * S.eq.gp[1] + S.P[c] * S.eq.gp[2]; gc[c] = m0 * S.eq.gc[0] + m1 * S.eq.gc[1] + S.P[c] * S.eq.gc[2]; }
      var sc = airGalScore(gp, gc, yaw, fr);
      if (sc < best - 1e-9) { best = sc; bl = lst; }
    }
    return bl;
  }
  function airSphereW(v, o) { var M = AIR_SKYF.M; for (var j = 0; j < 3; j++) o[j] = M[j] * v[0] + M[3 + j] * v[1] + M[6 + j] * v[2]; return o; }
  function skySphere(tS, V) {   // the celestial sphere in world axes at sky time tS (the one object, filled in place)
    V = V || SIM.V; var F = AIR_SKYF; if (!V || !V.light) return F;
    tS = tS === undefined ? SIM.t + (SKY.dt || 0) : tS;
    var S = airSvSet(V), E = S.E, Q = S.Q, P = S.P, c;
    var lst = S.lst0 + SKY_RATE * 2 * PI / AIR_SIDEREAL * tS, cl = Math.cos(lst), sl = Math.sin(lst);
    for (c = 0; c < 3; c++) { F.M[c] = cl * Q[c] - sl * E[c]; F.M[3 + c] = sl * Q[c] + cl * E[c]; F.M[6 + c] = P[c]; }   // (right ascension 0 and 90 deg at local sidereal time lst; the hour angle west)
    airSphereW(S.eq.ecl, F.ecl); airSphereW(S.eq.gp, F.galPole); airSphereW(S.eq.gc, F.galCentre); airSphereW(S.eq.sun, F.sun);
    for (c = 0; c < 3; c++) F.pole[c] = P[c];
    F.lst = lst; F.sunDec = S.dec;
    return F;
  }
  function skyFrame(tS, V) {   // the frame as the night sky's shader reads it: row-major, frame (equatorial) to world (AIR_FRAME, filled in place)
    var M = skySphere(tS, V).M, r, c;
    for (r = 0; r < 3; r++) for (c = 0; c < 3; c++) AIR_FRAME[r * 3 + c] = M[c * 3 + r];
    return AIR_FRAME;
  }
  var AIR_MOOND = { d: [0, -1, 0], w: 0, az: 0, el: -90, up: false }, AIR_MOONS = { d: [0, -1, 0], w: 0, s: 0, v: 0, leg: 0, el: -90, az: 0 };   // (the answer, and its own scratch for the route: never moonAt's)
  function airMoonDir() {   // (physics: air/moon-dir) the moon's disc as drawn this frame: d its direction (unit, toward it), w its weight on show (0 none .. 1), az and el deg, up whether any of it shows; the very moment and route the night sky's uMoon is drawn at (226's skyNightUniforms), so a glory, a fogbow or a moonlit edge stands on the disc, never on the key
    var V = SIM.V, o = AIR_MOOND;
    if (!V) { o.d[0] = 0; o.d[1] = -1; o.d[2] = 0; o.w = 0; o.az = 0; o.el = -90; o.up = false; return o; }
    var m = moonShown(SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt, AIR_MOONS);
    o.d[0] = m.d[0]; o.d[1] = m.d[1]; o.d[2] = m.d[2]; o.w = m.w; o.az = m.az; o.el = m.el; o.up = m.w > 0; return o;
  }
  /* the landing's heading (the flight, the first plan, the galaxy's lie, a milkyway opening's hour and the boot read it). (curated openings, step 2:
     delight-visit 5.2) each of the 16 lands' own, chosen by tools/visit/headings.mjs from the visit ruler's candidates
     and the frames' look (tools/visit/looks.mjs, measured in T1's SwiftShader frames: looks.json): never more than
     look-rule.mjs's share of the words' boxes (or the name's) under cloud, nor less of the low sun's glow than half the
     land's own draw shows (k0 alone, where no heading keeps both, keeps the words), then a near pass soonest, the fewest
     180 s stretches with no reward, the night's Milky Way and the low sun in frame and clear, the top band clearest;
     null, the land's own draw from its stream where that was already the best (k6, k13). looks.json keeps the key of what
     it was measured on (the cloud layout, this opening's view, the words: look-rule.mjs's KEY_INPUTS); a change to any of
     them fails test/unit/ruler.mjs until looks.mjs --table (and headings.mjs, if a heading fails) is re-run. Chosen once, before anything is drawn, as the landing is;
     nothing turns the view. A land k is the one whose seed is 010's (11 + k x 0x9e3779b9) */
  function airHeading0() { var T = [90, 329, 300, 120, 35, 230, null, 70, 245, 140, 240, 305, 60, null, 250, 125], k; for (k = 0; k < T.length; k++) if (((11 + k * 0x9e3779b9) >>> 0) === J.seed && T[k] !== null) return T[k] * DEG; return RNG(subseed(J.seed, 77)).r(0, 2 * PI); }
  /* THE GUSTS (physics: air/gust-field): one field of turbulence, frozen and carried downwind at the mean wind (the
     frozen-turbulence hypothesis: https://glossary.ametsoc.org/wiki/Frozen_turbulence) on the surface's clock T
     (airClock: the flight's time times the sky's surface share s, integrated), so a point dx downwind meets each gust
     dx / U10 later on that clock, dx / (s U10) later in flight time, and nothing steps it in time. Its value is value
     noise (the shaders' own hash: lib.glsl's ih, ih2, hf; three octaves, quintic, normalised to unit variance) in the
     visit's wind frame, xi = x.w - U10 T along
     and eta = x.p across, both over L = AIR_GUST[1] U10: one reference speed (the visit's U10) carries and scales the
     field at every height, so a bird over a veil feels the veil's gust; the height sets only its size, AIR_GUST[0]
     W(y) n. Each visit reads its own slice (its salt, uSalt in the shaders), carried on the surface's wind clock
     (airClock(t)[0]; the shaders' uAir.x). By day (s 1): the 3-s gust over the 10-min mean 1.43-1.68 (median 1.54), its e-fold 10-23 s (median
     13.6), the lag between points 100 m apart downwind within 2% of 100 / U10, nothing faster than 0.11 W a second
     (test/unit/air.mjs: 16 visits of 10 min); on a sky of surface share s, the e-fold and the lag are the day's over s
     (the moonlit sea's e-fold median 28.5 s, first light's 40.7 s). Still air: none. The veils lift with it (vs-ribbon, airGustGlsl); the
     birds read it as HOST.gust, HOST.gustPhase and HOST.gustSigma */
  var AIR_UT0 = 40;   // (the shaders' clock's lead over the flight's: 413's UT[0] = u + AIR_UT0)
  var AIR_GUST = [0.26, 22, 1.92946], AIR_GOCT = [[1, 1, 0x27d4eb2d], [2.03, 0.5, 0x165667b1], [4.11, 0.25, 0x61c88647]];   // (intensity, time scale s, the noise's unit-variance gain; the octaves: frequency, amplitude, salt)
  function aih(x) { x >>>= 0; x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16; return x >>> 0; }   // (lib.glsl's ih)
  function aLat(i, j, s) { var h = aih((Math.imul(i >>> 0, 0x8da6b343) ^ aih(((j >>> 0) + 0x68e31da4) >>> 0)) >>> 0); return ((aih((h ^ s) >>> 0) >>> 8) / 16777216) * 2 - 1; }   // (lib.glsl's ih2, then the octave's salt, hf)
  function aQ(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function aVn(x, y, s) { var i = Math.floor(x), j = Math.floor(y), u = aQ(x - i), v = aQ(y - j), a = aLat(i, j, s), b = aLat(i + 1, j, s), c = aLat(i, j + 1, s), d = aLat(i + 1, j + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function gustN(xi, eta) { var v = 0, k, o; for (k = 0; k < 3; k++) { o = AIR_GOCT[k]; v += o[1] * aVn(xi * o[0], eta * o[0], o[2]); } return v * AIR_GUST[2]; }   // unit-variance noise, xi and eta in L
  var AIR_GW = { x: 0, z: 0, W: 0 };
  function airFrame(V) { var w = (V || SIM.V || {}).wind, U = u10Of(V); AIR_GW.W = w ? U : 0; AIR_GW.x = w ? w[0] : 0; AIR_GW.z = w ? w[1] : 0; return AIR_GW; }   // (the field's frame: the visit's wind direction and its one reference speed, U10)
  function gustAt(x, z, y, t, V) {   // the gust's excess along the wind at (x, z), y m up, at the flight's t: m/s, signed (0 in still air)
    var f = airFrame(V), U = f.W; if (!(U > 0)) return 0; t = t === undefined ? SIM.t : t;
    var L = AIR_GUST[1] * U, sl = ((V || SIM.V || {}).salt || 0) >>> 0, ox = (aih(sl) >>> 8) / 16777216 * 4096, oz = (aih((sl + 1) >>> 0) >>> 8) / 16777216 * 4096;   // (the visit's own slice of the field: its salt, as uSalt)
    var T = airClock(t), xi = (x * f.x + z * f.z - U * T[0]) / L + ox, eta = (z * f.x - x * f.z) / L + oz;   // (carried at U10 on the surface's clock, at every height: the day's field, frozen, at the sky's pace)
    return AIR_GUST[0] * weather(t)[2] * airSpeed(y, V) * airShare(y, t) * gustN(xi, eta);
  }
  function gustSigma(y, V, t) { t = t === undefined ? SIM.t : t; return airFrame(V).W > 0 ? AIR_GUST[0] * weather(t)[2] * airSpeed(y, V) * airShare(y, t) : 0; }   // the gust's standard deviation at y m up, m/s (0 in still air)
  function gustPhase(x, z, y, t, V) { var f = airFrame(V); t = t === undefined ? SIM.t : t; return f.W > 0 ? airClock(t)[0] - (x * f.x + z * f.z) / f.W : NaN; }   // s: the field's own clock here (the surface's clock, less the way along the wind over U10; NaN in still air; the same at every height)
  /* THE AIR HEARD (physics: air/heard): the one air where the listener is, for the score (the sound icon's): the wind
     there (windAt, m/s along x and z), the gust's excess along it (gustAt, m/s, signed), the gust's sigma at that
     height (gustSigma), the field's own clock there (gustPhase: when the gust now arriving left the visit's frame),
     carry, the speed the gusts pass at (U10 x the sky's surface share: a gust reaches a point dx downwind dx / carry
     later in flight time, not dx / the wind heard), and the height asked for. A fresh object each time, so the score
     may keep it; read only, it steers nothing */
  function airHeard(x, z, y, t, V) {
    var w = windAt(x, z, y, t, V), wx = w.x, wz = w.z;
    return { x: wx, z: wz, gust: gustAt(x, z, y, t, V), sigma: gustSigma(y, V, t), phase: gustPhase(x, z, y, t, V), carry: u10Of(V) * weather(t === undefined ? SIM.t : t)[0], y: y };
  }
  function airGustGlsl() {   // (the shaders' gust: the same field, the same constants; a vertex shader reads airGust(xz, w, U, W, tau): w the visit's wind direction, U its U10, W the gust's wind (the day's at its height x the sky's share x gustiness: uAir.y x uAir.z under 20 m), tau the surface's clock (uAir.x))
    var o = AIR_GOCT, s = '#define AIR_GUST_I ' + airF(AIR_GUST[0]) + '\n#define AIR_GUST_T ' + airF(AIR_GUST[1]) + '\n';
    s += 'float airLat(int i, int j, uint s) { return hf(ih(ih2(ivec2(i, j)) ^ s)) * 2.0 - 1.0; }\n';
    s += 'float airVn(vec2 p, uint s) { vec2 c = floor(p), f = p - c, u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); ivec2 i = ivec2(c); float a = airLat(i.x, i.y, s), b = airLat(i.x + 1, i.y, s), cc = airLat(i.x, i.y + 1, s), d = airLat(i.x + 1, i.y + 1, s); return a + (b - a) * u.x + (cc - a) * u.y + (a - b - cc + d) * u.x * u.y; }\n';
    s += 'float airGustN(vec2 q) { return (' + o.map(function (k) { return airF(k[1]) + ' * airVn(q * ' + airF(k[0]) + ', ' + k[2] + 'u)'; }).join(' + ') + ') * ' + airF(AIR_GUST[2]) + '; }\n';
    s += 'float airGust(vec2 xz, vec2 w, float U, float W, float t) { if (U <= 0.0) return 0.0; float L = AIR_GUST_T * U; return AIR_GUST_I * W * airGustN(vec2(dot(xz, w) - U * t, xz.y * w.x - xz.x * w.y) / L + vec2(hf(ih(uSalt)), hf(ih(uSalt + 1u))) * 4096.0); }\n';
    return s;
  }
  function airF(v) { var s = String(v); return /[.e]/.test(s) ? s : s + '.0'; }
  /* ONE LIGHT AT NIGHT (physics: air/night-light): the moon is the moonlit sky's light, so on that sky the live key
     the land, the veils, the motes and the wings shade by (the shaders' uSun) stands on the moon's disc as drawn
     (airMoonDir: the very moment and route of uMoon), its elevation held to AIR_KEY_EL[0] (5 deg) or more, so the land
     is never lit from under the horizon. Its weight is the sky's moonlit share (1 through the moonlit sea's hold, 0
     on every other sky, eased with the light through a change: airMoonShare), and the key moves to it low across the
     sky, never through it: its azimuth turns about the vertical the shorter way, and its elevation eases between the
     two ends' (both 5 deg up or more), so the light never stands higher than both ends (a great circle between a key
     and a disc 150-160 deg apart runs overhead: a light with no body there, the flat sand brighter mid-change than at
     either end). The turn is the change's own ease (at most about 1.5 x the arc over the change) plus the disc's own
     path. The way round is taken once a change, toward the disc at the moonlit hold's edge (airMoonRef), so a disc
     passing opposite the key never flips it. Off the moonlit sky it is the visit's key (keyAt).
     The clouds stay on the baked key (fs-vbody's uKey: their light depths are baked along it, so their phase, rim and
     wrap read the same direction); the sky's own sun (uSkyS) stays on the key. airLightDir(L): the direction, the one
     array, filled in place once a frame (the drawn moment's) */
  var AIR_LD = new Float32Array(3), AIR_LDM = { t: NaN, L: null, V: null }, AIR_LDT = [0, 0, 0], AIR_MOONR = { d: [0, -1, 0], w: 0, s: 0, v: 0, leg: 0, el: -90, az: 0 };   // (and the hold edge's disc: its own scratch, never the drawn moon's)
  function airMoonShare(tS) {   // the sky's moonlit share at sky time tS: 1 the moonlit sea's hold, 0 another sky's, eased with the light through a change
    var seq = SKY.seq; if (!seq.length) return 0;
    var i = seq.length - 1; while (i > 0 && seq[i].at > tS) i--;
    var e = seq[i], a = e.id === 'moonlit' ? 1 : 0, b = seq[i + 1] ? (seq[i + 1].id === 'moonlit' ? 1 : 0) : a, k = Math.max(0, Math.min(1, (tS - e.at - e.hold) / e.move));
    return a + (b - a) * k * k * (3 - 2 * k);
  }
  function airMoonRef(tS) {   // the sky time of the moonlit hold's edge nearest a change at tS (its start through the change in, its end through the change out; NaN off the moonlit sky's changes)
    var seq = SKY.seq; if (!seq.length) return NaN;
    var i = seq.length - 1; while (i > 0 && seq[i].at > tS) i--;
    var e = seq[i], nx = seq[i + 1];
    if (e.id === 'moonlit') return e.at + e.hold;
    return nx && nx.id === 'moonlit' ? nx.at : NaN;
  }
  function airTurnLow(a, b, r, f, o) {   // the direction f of the way from a to b: its azimuth turned about the vertical, its elevation eased between the ends' (unit a, b; o filled). The way round is the one to r (the disc at the hold's edge), kept through the whole change, so a disc passing opposite the key never flips it
    var za = Math.atan2(a[0], a[2]), zb = Math.atan2(b[0], b[2]), ea = Math.asin(Math.max(-1, Math.min(1, a[1]))), eb = Math.asin(Math.max(-1, Math.min(1, b[1])));
    var w = function (x) { return x - Math.round(x / (2 * PI)) * 2 * PI; }, dr = w(r - za), dz = dr + w(zb - za - dr);
    var z = za + dz * f, el = ea + (eb - ea) * f, c = Math.cos(el);
    o[0] = Math.sin(z) * c; o[1] = Math.sin(el); o[2] = Math.cos(z) * c; return o;
  }
  function airLightDir(L) {   // the live key at the drawn moment (uSun)
    var V = SIM.V, k = L.sunDir, c, tD = SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt;
    if (AIR_LDM.t === tD && AIR_LDM.L === L && AIR_LDM.V === V) return AIR_LD;
    AIR_LDM.t = tD; AIR_LDM.L = L; AIR_LDM.V = V;
    for (c = 0; c < 3; c++) AIR_LD[c] = k[c];
    if (!V) return AIR_LD;
    var f = airMoonShare(tD); if (!(f > 0)) return AIR_LD;
    var m = airMoonDir(), d = m.d, h = Math.sqrt(d[0] * d[0] + d[2] * d[2]), e = Math.max(Math.asin(Math.max(-1, Math.min(1, d[1]))), AIR_KEY_EL[0] * DEG);
    if (h < 1e-9) return AIR_LD;   // (the disc at the zenith or the nadir: no azimuth; the key stays)
    AIR_LDT[0] = d[0] / h * Math.cos(e); AIR_LDT[1] = Math.sin(e); AIR_LDT[2] = d[2] / h * Math.cos(e);   // (the disc, held 5 deg up or more)
    var tR = airMoonRef(tD), rz = Math.atan2(AIR_LDT[0], AIR_LDT[2]);
    if (f < 1 && tR === tR) { var q = moonShown(tR, AIR_MOONR).d; if (q[0] * q[0] + q[2] * q[2] > 1e-18) rz = Math.atan2(q[0], q[2]); }   // (the way round: to the disc at the hold's edge)
    return airTurnLow(k, AIR_LDT, rz, f, AIR_LD);
  }
  var AIRAPI = { draw: airDraw, windAt: windAt, heard: airHeard, wx: airWx, MIST: function () { var o = /** @type {{ [sky: string]: number }} */ ({}), k; for (k in AIR_MIST) o[k] = AIR_MIST[k]; return o; }, share: airShare, carried: airCarried, clock: airClock, BYSKY: airTable, day: airDay, gustAt: gustAt, gustPhase: gustPhase, gustSigma: gustSigma, u10: u10Of, vec3: airVec3, upwind: airUpwind, H: AIR_H, KEY_EL: AIR_KEY_EL, KEY_AZ: AIR_KEY_AZ, keyAt: keyAt, skySun: airSkySun, moonAt: airMoon, moonDir: airMoonDir, skyFrame: skyFrame, skySphere: skySphere, weather: weather, SKY_RATE: SKY_RATE, APART: AIR_APART };
