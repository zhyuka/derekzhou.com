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
     still (skyFrame is the identity): the sky's lane brings them to SKY_RATE (test/unit/air.mjs lists each one's rate).

     THE WIND (physics: air/wind-profile): one direction a visit at the surface (AIR_DIR, drawn by airDraw from the
     dunes' field stream), blowing toward azimuth V.windAz at V.u10 m/s 10 m up: the visit's own wind speed, drawn once from its own stream
     (subseed(V.seed, 61)): a Rayleigh distribution of mean 5 m/s (a site's winds over a year) mapped by its CDF into
     3.0-7.5 m/s (the hub's ruling, 2026-11-15: the 40 m wind then stays under about 8.8 m/s, under every bird kind's own
     airspeed, so no bird flying upwind goes backward over the ground; truncated, not clamped, so nothing piles at the
     ends). The sand's own threshold (about 6.2 m/s at 10 m, the crests' speed-up 1.5x) is the sand's to apply. Its speed and its turn by height
     (airProfile): under 100 m the log law over sand, u(z) = U10 ln(z / z0) / ln(10 / z0), z0 = 0.003 m (shares of U10:
     0.1 m 0.43, 0.87 m 0.70, 2.5 m 0.83, 26 m 1.12, 60 m 1.22, 100 m 1.28), the direction the surface's; from 100 to
     300 m it eases to the low cloud layer's 1.3 U10, veered 20 deg (the wind turning toward the geostrophic with
     height, about 32 deg from the surface to the free air: https://www.ecmwf.int/sites/default/files/elibrary/2016/16644-wind-turning-boundary-layer.pdf;
     the profile: https://www.eoas.ubc.ca/books/Practical_Meteorology/prmet102/Ch18-abl-v102.pdf), held to 1500 m; from 1500 to 3000 m it eases to the deck's
     2 U10, veered 40 deg. Heights are over the ground under the reader. Readers whose direction is still their own (AIR_APART: the high streaks' axis,
     the maps' own wind field, the wing gusts' timers, the score's gusts) are listed there with the change that joins
     them, and test/unit/air.mjs holds every other reader to AIR_DIR within 1e-6 */
  var SKY_RATE = 100;   // the sky's light runs this many times real time (declared: sun, moon, stars and galaxy together)
  var AIR_DIR = [0, 1];   // the visit's wind, unit (x, z), blowing toward (airDraw sets it; the water's ripples read it through LDEF)
  var AIR_H = { grains: 0.8, veils: 5, motes: 13, birds: 40 };   // each reader's declared height, m over the ground (the birds' default: HOST.wind takes a bird's own)
  var AIR_U10 = [5, 3, 7.5], AIR_Z0 = 0.003, AIR_LN10 = Math.log(10 / AIR_Z0), AIR_LAYERS = [[100, 300, 1.3, 20], [1500, 3000, 2, 40]];   // (the profile: the visits' U10: the Rayleigh's mean, the range it is mapped into, m/s; roughness m; the layers aloft: from, to, share of U10, veer deg)
  var AIR_GRAIN_K = 1;   // the grains' speed, a share of the air's at their height (the sand's own spec sets it)
  var AIR_CIRRUS = [1, 0];   // the high streaks' long axis on their deck (sky-body.glsl: along world x)
  var AIR_KEY_EL = [5, 14], AIR_KEY_AZ = 55;   // the key light: 5-14 deg up, within 55 deg of upwind (the dunes' windward slopes lit)
  var AIR_SUN_EL = { afterglow: -3, bluehour: -7, firstlight: -3 }, AIR_SUN_NIGHT = -24;   // the twilights' sun under the sea (deg); a night's, sunk to AIR_SUN_NIGHT through a change
  var AIR_CRUISE = [14, 32];   // the flight's clearance band, m: over the sand to over the cloud sea (flightParams, cruiseOf)
  var AIR_APART = { cirrus: 'physics: air/wind-profile', maps: 'physics: air/wind-profile', gusts: 'physics: air/gust-field', score: 'physics: air/wind-by-sky' };
  var AIR_W = { x: 0, z: 0 }, AIR_MOON = { d: [0, -1, 0], w: 0, s: 0, v: 0, leg: 0, el: -90, az: 0 }, AIR_FRAME = [1, 0, 0, 0, 1, 0, 0, 0, 1];
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
  function airU10(seed) {   // a visit's wind speed 10 m up, m/s: the Rayleigh of mean AIR_U10[0] (sigma = mean / sqrt(pi / 2)) truncated to [AIR_U10[1], AIR_U10[2]] by its CDF
    var u = RNG(subseed(seed, 61)).f(), s2 = 2 * Math.pow(AIR_U10[0] / Math.sqrt(PI / 2), 2), F = function (r) { return 1 - Math.exp(-r * r / s2); };
    var a = F(AIR_U10[1]), b = F(AIR_U10[2]);
    return Math.sqrt(-s2 * Math.log(1 - (a + (b - a) * u)));
  }
  function u10Of(V) { V = V || SIM.V; return V && V.u10 ? V.u10 : 0; }   // (still air before a visit's wind)
  function airSpeed(y, V) { return u10Of(V) * airProfile(y).s; }   // m/s at y m over the ground
  function windAt(x, z, y, t, V) {   // the wind at (x, z), y m up, at t: { x, z } m/s (the one object, reused); still air before a visit's wind
    var w = (V || SIM.V || {}).wind, p = airProfile(y), s = u10Of(V) * p.s, v = p.veer * PI / 180, c = Math.cos(v), n = Math.sin(v);
    AIR_W.x = w ? (w[0] * c + w[1] * n) * s : 0; AIR_W.z = w ? (w[1] * c - w[0] * n) * s : 0;
    return AIR_W;
  }
  function airVec3(V, y, lift, k) { var a = windAt(0, 0, y, 0, V); k = k === undefined ? 1 : k; return [a.x * k, lift, a.z * k]; }   // (a particle set's wind, m/s: x, the given lift, z; k its share of the air's)
  function airUpwind(V) { return Math.atan2(-V.wind[0], -V.wind[1]) * 180 / PI; }   // the azimuth the wind comes from, deg
  function airKeySet(L) { L.sunDir = dirAzEl(L.sunAz, L.sunEl); return L.sunDir; }   // the key's direction, once a visit (planVisit)
  function keyAt(V) { return V.light.sunDir; }   // the key light (toward it): one for every sky (the clouds' light is baked along it; at night it is the moon's)
  function airSunEl(id) { var e = AIR_SUN_EL[id]; return e === undefined ? null : e; }   // a sky's own sun, deg (null: a night's, the key's own place)
  function airSkySun(V, el) { return el === null ? Array.prototype.slice.call(keyAt(V)) : dirAzEl(V.light.sunAz, el); }   // the sky's own sun (uSkyS at a hold)
  function airMoon(t) { return moonShown(t, AIR_MOON); }   // the moon on show at sky time t (226: its route)
  var AIR_MOOND = { d: [0, -1, 0], w: 0, az: 0, el: -90, up: false }, AIR_MOONS = { d: [0, -1, 0], w: 0, s: 0, v: 0, leg: 0, el: -90, az: 0 };   // (the answer, and its own scratch for the route: never moonAt's)
  function airMoonDir() {   // (physics: air/moon-dir) the moon's disc as drawn this frame: d its direction (unit, toward it), w its weight on show (0 none .. 1), az and el deg, up whether any of it shows; the very moment and route the night sky's uMoon is drawn at (226's skyNightUniforms), so a glory, a fogbow or a moonlit edge stands on the disc, never on the key
    var V = SIM.V, o = AIR_MOOND;
    if (!V) { o.d[0] = 0; o.d[1] = -1; o.d[2] = 0; o.w = 0; o.az = 0; o.el = -90; o.up = false; return o; }
    var m = moonShown(SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt, AIR_MOONS);
    o.d[0] = m.d[0]; o.d[1] = m.d[1]; o.d[2] = m.d[2]; o.w = m.w; o.az = m.az; o.el = m.el; o.up = m.w > 0; return o;
  }
  function skyFrame() { return AIR_FRAME; }   // the turn the stars and the galaxy take (today none: see THE CLOCK)
  function weather() { return { surface: 1, aloft: 1 }; }   // the wind's share of airSpeed by sky (today one wind for every sky: physics: air/wind-by-sky)
  function airHeading0() { return RNG(subseed(J.seed, 77)).r(0, 2 * PI); }   // the landing's heading, from its own stream (the flight, the first plan, the galaxy's lie and the boot read it)
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
  var AIRAPI = { draw: airDraw, windAt: windAt, u10: u10Of, GRAIN_K: AIR_GRAIN_K, vec3: airVec3, upwind: airUpwind, H: AIR_H, KEY_EL: AIR_KEY_EL, KEY_AZ: AIR_KEY_AZ, keyAt: keyAt, skySun: airSkySun, moonAt: airMoon, moonDir: airMoonDir, skyFrame: skyFrame, weather: weather, SKY_RATE: SKY_RATE, APART: AIR_APART };
