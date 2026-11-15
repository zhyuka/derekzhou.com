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

     THE WIND (today's values, moved here as they were, nothing drawn changed): one direction a visit (AIR_DIR, drawn
     by airDraw from the dunes' field stream, where it always was), blowing toward azimuth V.windAz; its speed by
     height airSpeed(y), today a table of the readers' own speeds (the grains 6.5 m/s at 0.8 m, the veils 5.5 at 5 m,
     the motes 1.6 at 13 m, the birds 6.5 aloft: not a real profile; physics: air/wind-profile replaces it with the
     log law). Readers whose direction is still their own (AIR_APART: the maps' own wind field, the wing gusts' timers, the score's gusts) are listed there with the change that joins
     them, and test/unit/air.mjs holds every other reader to AIR_DIR within 1e-6 */
  var SKY_RATE = 100;   // the sky's light runs this many times real time (declared: sun, moon, stars and galaxy together)
  var AIR_DIR = [0, 1];   // the visit's wind, unit (x, z), blowing toward (airDraw sets it; the water's ripples read it through LDEF)
  var AIR_H = { grains: 0.8, veils: 5, motes: 13, birds: 40, clouds: 800, deck: 3000 };   // each reader's declared height, m over the ground (clouds: the low layer's free clouds, physics: clouds/drift; deck: the high streaks)
  var AIR_KEY_EL = [5, 14], AIR_KEY_AZ = 55;   // the key light: 5-14 deg up, within 55 deg of upwind (the dunes' windward slopes lit)
  var AIR_SUN_EL = { afterglow: -3, bluehour: -7, firstlight: -3 }, AIR_SUN_NIGHT = -24;   // the twilights' sun under the sea (deg); a night's, sunk to AIR_SUN_NIGHT through a change
  var AIR_CRUISE = [14, 32];   // the flight's clearance band, m: over the sand to over the cloud sea (flightParams, cruiseOf)
  var AIR_APART = { maps: 'physics: air/wind-profile', gusts: 'physics: air/gust-field', score: 'physics: air/wind-by-sky' };
  var AIR_W = { x: 0, z: 0 }, AIR_MOON = { d: [0, -1, 0], w: 0, s: 0, v: 0, leg: 0, el: -90, az: 0 }, AIR_FRAME = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  function airDraw(R, V) {   // the visit's wind, drawn once (the dunes' field, its first draw): unit (x, z) toward, and its azimuth
    var wa = R.r(0, 2 * PI), w = [Math.sin(wa), Math.cos(wa)];
    V.wind = w; V.windAz = wa * 180 / PI; AIR_DIR[0] = w[0]; AIR_DIR[1] = w[1];
    return w;
  }
  function airSpeed(y) { return y < 2 ? 6.5 : y < 8 ? 5.5 : y < 20 ? 1.6 : 6.5; }   // m/s at y m over the ground (today's readers' own: see THE WIND)
  function windAt(x, z, y, t, V) {   // the wind at (x, z), y m up, at t: { x, z } m/s (the one object, reused); still air before a visit's wind
    var w = (V || SIM.V || {}).wind, s = airSpeed(y);
    AIR_W.x = w ? w[0] * s : 0; AIR_W.z = w ? w[1] * s : 0;
    return AIR_W;
  }
  function airVec3(V, y, lift) { var a = windAt(0, 0, y, 0, V); return [a.x, lift, a.z]; }   // (a particle set's wind, m/s: x, the given lift, z)
  function airUpwind(V) { return Math.atan2(-V.wind[0], -V.wind[1]) * 180 / PI; }   // the azimuth the wind comes from, deg
  function airKeySet(L) { L.sunDir = dirAzEl(L.sunAz, L.sunEl); return L.sunDir; }   // the key's direction, once a visit (planVisit)
  function keyAt(V) { return V.light.sunDir; }   // the key light (toward it): one for every sky (the clouds' light is baked along it; at night it is the moon's)
  function airSunEl(id) { var e = AIR_SUN_EL[id]; return e === undefined ? null : e; }   // a sky's own sun, deg (null: a night's, the key's own place)
  function airSkySun(V, el) { return el === null ? Array.prototype.slice.call(keyAt(V)) : dirAzEl(V.light.sunAz, el); }   // the sky's own sun (uSkyS at a hold)
  function airMoon(t) { return moonShown(t, AIR_MOON); }   // the moon on show at sky time t (226: its route)
  function skyFrame() { return AIR_FRAME; }   // the turn the stars and the galaxy take (today none: see THE CLOCK)
  function weather() { return { surface: 1, aloft: 1 }; }   // the wind's share of airSpeed by sky (today one wind for every sky: physics: air/wind-by-sky)
  function airHeading0() { return RNG(subseed(J.seed, 77)).r(0, 2 * PI); }   // the landing's heading, from its own stream (the flight, the first plan, the galaxy's lie and the boot read it)
  var AIRAPI = { draw: airDraw, windAt: windAt, vec3: airVec3, upwind: airUpwind, H: AIR_H, KEY_EL: AIR_KEY_EL, KEY_AZ: AIR_KEY_AZ, keyAt: keyAt, skySun: airSkySun, moonAt: airMoon, skyFrame: skyFrame, weather: weather, SKY_RATE: SKY_RATE, APART: AIR_APART };
