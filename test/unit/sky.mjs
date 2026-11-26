// test/unit/sky.mjs: the order of the skies (skyInit, skyPush, skyNext) and their hold and change timing
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  float mX = airmass(uMetH.y);", "with": "  float mX = 1.0;", "why": "a meteor as bright through the low air as overhead: no extinction on the shooting stars"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "sg = clamp(sqrt(E / max(1.1 * SKYTAU * hv, 1e-6)), 0.85, 1.4), F = min(E, 1.1 * SKYTAU * hv * sg * sg);", "with": "sg = 0.85, F = min(E, 1.1 * SKYTAU * hv * sg * sg);", "why": "the evening star held at the old fixed core: a faint dot on a bright low sky, under its true light"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  return extTint(col, airmass(sd.y)) * min(v, hv) * (1.0 - hazeSky(rd));", "with": "  return extTint(col, airmass(sd.y)) * min(v, hv) * exp2(-0.4 * 3.3219281 * EXT_V * max(airmass(sd.y) - 1.0, 0.0)) * (1.0 - hazeSky(rd));", "why": "the evening star dimmed under its head by the low air: it vanishes from a bright twilight where it stands far over the light's ceiling"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "f = fract(g); ivec2 c = ivec2(floor(g));", "with": "f = vec2(0.0); ivec2 c = ivec2(floor(g + 0.5));", "why": "the face's map read nearest, not bilinear: its cells' edges glitter as the disc slides"}
// plant: {"file": "src/world/glsl/lib-air.glsl", "find": "(abs(k) < 1e-4 ? 1.0 - 0.5 * k : (1.0 - exp(-k)) / k); }\nfloat fogAmt", "with": "1.0; }\nfloat fogAmt", "why": "the gas taken at the eye's density along the whole path: a cloud 7 km up hazed as if at the eye's height"}
// plant: {"file": "src/world/224-sky-blend-paint.js", "find": "HIP[3] = q > 0 && q < 1 && xa !== xb ? 1 : 0;", "with": "HIP[3] = 0;", "why": "the cirrus cover blended over the whole sky through a change: a fade"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "clamp((uHiP.z - dot(P - uCam.xz, dD)) / HIF_W + 0.5, 0.0, 1.0)", "with": "clamp((dot(P - uCam.xz, dD) - uHiP.z) / HIF_W + 0.5, 0.0, 1.0)", "why": "the new cover arriving from downwind, against the wind that carries it"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "const float HI_H = 7000.0, HIF_W = 12000.0;", "with": "const float HI_H = 3000.0, HIF_W = 12000.0;", "why": "the cirrus back at 3 km, under real cirrus heights"}
// plant: {"file": "src/world/227-night-bodies.js", "find": "    if (SUNU.on) return -SUNU.es;\n", "with": "", "why": "Venus placed by the sky it left through a change into the night: off its elongation from the sinking sun, then a jump"}
// plant: {"file": "src/world/225-night-sky-moon-path.js", "find": "P.w0 = 2 * P.thetaE / P.Dvis;", "with": "P.w0 = 3 * P.thetaE / P.Dvis;", "why": "the moon crossing half again faster: past the sky's declared rate"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": " gL += aG; c += aG; }", "with": " c += aG; }", "why": "the airglow counted as nightLim's sky: in the 15-18 deg window it holds back a star at the edge of showing"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float lat = abs(degrees(asin(clamp(dot(d, uGal.xyz), -1.0, 1.0)))), e = mix(-1.5, GAL_E, uGalC.w);", "with": "float lat = degrees(asin(clamp(dot(d, uGal.xyz), -1.0, 1.0))), e = GAL_E * (2.0 * uGalC.w - 1.0);", "why": "the galaxy's edge one-sided again: all south of it at once as the rise leaves 0 (M31 pops)"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float eb = radians(mix(-5.735, mix(6.17, 9.51, uAurB.x), uAur.x));", "with": "float eb = radians(mix(6.17, mix(6.17, 9.51, uAurB.x), uAur.x));", "why": "the aurora's sheet ignores its rise: it would show whole the moment a change began"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "galaxyAt(uSkyF * rd, eS)", "with": "galaxyAt(rd, eS)", "why": "the galaxy left out of the sky's turn: it slides against its stars"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "core: airEq(AIR_GAL.centre[0], AIR_GAL.centre[1]), lie: best };", "with": "core: airEq(AIR_GAL.centre[0] + 90, AIR_GAL.centre[1]), lie: best };", "why": "the galaxy's core off its band: placed by no sky"}
// plant: {"file": "src/world/224-sky-blend-paint.js", "find": "    skyFxPlace(X.fx, Y.fx, q, SKY.fx, SKY.rise);\n", "with": "", "why": "the galaxy's and the aurora's amounts blended like colours: a fade"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "const float AIRGLOW_Y = 0.004;", "with": "const float AIRGLOW_Y = 0.04;", "why": "the airglow ten times brighter: a green band that lifts the night sky"}
// plant: {"file": "src/world/227-night-bodies.js", "find": "JUP_TOP_Y = 0.104;", "with": "JUP_TOP_Y = 0.2;", "why": "the outer planet past the light ceiling, brighter than Venus"}
// plant: {"file": "src/world/227-night-bodies.js", "find": "JUPB.eps = bodyPick(RJ, JUP_EL, JUPB.side, F, D0, I, I2)[0];", "with": "JUPB.eps = RJ.r(JUP_EL[0], JUP_EL[1]);", "why": "the outer planet placed with no clear path: on the words"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float galAlong(float ld) { return 0.25 + 0.28 * (1.0 + cos(radians(ld))) + 0.27", "with": "float galAlong(float ld) { return 0.75 + 0.0 * (1.0 + cos(radians(ld))) + 0.27", "why": "a band as bright at the anticentre as at the core"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "smoothstep(-55.0, -45.0, ld) * (1.0 - smoothstep(75.0, 85.0, ld))", "with": "1.0", "why": "the rift all round the band"}
// plant: {"file": "src/world/225-night-sky-moon-path.js", "find": "var CEIL_KNEE = 0.04,", "with": "var CEIL_KNEE = 0.08,", "why": "the ceiling's knee wide again: a night's highlights flattened under it"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  return F * starBox(d.x, sg) * starBox(d.y, sg);", "with": "  return b * exp(-dot(d, d) / (2.0 * 0.1764));", "why": "a star sampled at the pixel's centre: it pulses as it slides across pixels"}
// plant: {"file": "src/world/220-time-day.js", "find": "post:{bloomK:0.4,shafts:0,sat:1.05,stars:1,", "with": "post:{bloomK:0.4,shafts:0,sat:1.05,stars:0.05,", "why": "the stars' amount blended between skies again (the afterglow's 0.05): the no-fades gap"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "c += auroraAt(rd, eS) * hzT;", "with": "c += auroraAt(rd, eS);", "why": "the aurora added over the haze at full strength"}
// plant: {"file": "src/world/223-sun.js", "find": "x = clamp((d + 6) / 2, 0, 1)", "with": "x = 1", "why": "the purple light at night: it shows with the sun 24 deg down"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "const float PURP_KC = 0.45;", "with": "const float PURP_KC = 0.6;", "why": "the purple light into the ceiling's knee: the old blend, a level taken from the red"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "hold: S.hold * (0.9 + 0.25 * r.f())", "with": "hold: S.hold * (0.9 + 0.5 * r.f())", "why": "a sky held up to 1.4 of its hold"}
// plant: {"file": "src/world/227-night-bodies.js", "find": "{ n++; break; }", "with": "{ break; }", "why": "venusFails never counts a place on a word: the evening star planned across the words, and on a window all words"}
// plant: {"file": "src/world/219-meteors.js", "find": "var y = M.long ? M.y : M.y * Math.sin(Math.PI * e / M.dur);", "with": "var y = M.y;", "why": "a short meteor that pops on and off at full light"}
// plant: {"file": "src/world/219-meteors.js", "find": "QUIET: 8,", "with": "QUIET: 0,", "why": "a meteor in the opening stay's first seconds: in its still"}
// plant: {"file": "src/world/219-meteors.js", "find": "      return { A: R0, n: n, th0: th0, th1: t1, thP: thP };", "with": "      return { A: R0, n: n, th0: th0, th1: th0 + 120, thP: thP };", "why": "a long one ending 120 deg on, up in the sky: a drag brings its end into view, where it vanishes at full light"}
// plant: {"file": "src/world/220-time-day.js", "find": "L:[0.62,0.01,80],glow:[0.44,0.01,80]", "with": "L:[0.62,0.01,250],glow:[0.44,0.01,250]", "why": "a blue-tinted disc merges with the blue moonlit clouds"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "\"hi-2268x1080\":[[800.6,222.2,1467.2,433.8]", "with": "\"hi-2268x1080\":[[933.2,339.4,1334.7,433.8]", "why": "the still's own name box alone: on its band's smallest window the words stand bigger, and the moon's footprint falls on them"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "\"hi-1080x1080\":[[268.9,300.5,810.9,441.4]", "with": "\"hi-1080x1080\":[[339.2,347,740.7,441.4]", "why": "the square still's own name box alone: on 800x720 the evening star's path falls on the bigger name"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "var cw = Math.min(bw, bh * BD[0]), ch = Math.min(bh, bw / BD[1])", "with": "var cw = bw, ch = bh", "why": "the opening planned in the whole still: a disc near its top edge falls off a wider window of its band"}
// plant: {"file": "src/world/226-moonlit-stay.js", "find": "    LATEK.creature = lk;\n", "with": "", "why": "the opening's cloud layout leaves a late program's flag set: it starts compiling at the opening"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float lit = smoothstep(hs - 0.5, hs + 0.5, z);", "with": "float lit = 1.0;", "why": "the far storm lit whole whatever the sun's depth: lit in the blue hour and at night"}
// plant: {"file": "src/world/225-night-sky-moon-path.js", "find": "FL_SEP = 0.6,", "with": "FL_SEP = 0.36,", "why": "the flicker's flashes 0.38 s apart: three peaks inside a second (the owner's \"under 3\")"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "const float ANV_FK = 0.02 / 0.8966;", "with": "const float ANV_FK = 0.2 / 0.8966;", "why": "the flicker ten times brighter: a flash"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "const float HALO_N = 1.31;", "with": "const float HALO_N = 1.5;", "why": "the halo from glass, not ice: a 38-deg ring"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "c += haloAt(rd) * uMoon.w;", "with": "c += haloAt(rd);", "why": "the halo whole whatever the moon's depth: it stays as the moon sinks"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "veil: mix32(SKY.vS ^ Math.imul(seq.length + 1, 0x9e3779b9))", "with": "veil: mix32(SKY.vS)", "why": "the veil the visit's, not the stay's: every moonlit stay of a visit veiled, or none"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "if (ma < 7.0 && hiCv > 0.0) c += hiCv * uMoonG * 0.15 * (", "with": "if (ma < 7.0) c += uMoonG * 0.15 * (", "why": "the corona on a clear night: rings with no cloud to make them"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "hiCv = max(hiCv, clamp(max(cov - vm, 0.0) / max(1.0 - vm, 0.05) * vk, 0.0, 1.0) * smoothstep(0.0, 0.05, uHi.y));", "with": "hiCv = max(hiCv, clamp(vm * vk + max(cov - vm, 0.0) / max(1.0 - vm, 0.05) * vk, 0.0, 1.0) * smoothstep(0.0, 0.05, uHi.y));", "why": "the corona on every veiled night: the veil's even mean counted as cloud"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "dot(c, LUMA) * vec3(0.861, 1.04, 1.68)", "with": "dot(c, LUMA) * vec3(1.2, 0.85, 0.95)", "why": "the Earth's shadow pink again"}
// plant: {"file": "src/world/220-time-day.js", "find": "fx:{belt:0,nlc:1}", "with": "fx:{belt:0.4,nlc:1}", "why": "the belt drawn in the blue hour (the sun too low for it)"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  b *= bk;\n", "with": "  b *= 1.0 + 0.15 * sin(uT * (0.6 + 1.2 * hw) + hz * SKYTAU);\n  b *= bk;\n", "why": "the stars twinkle again: a slow swing of their light, frame to frame (and frozen into the still)"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "const float MOON_PHASE = 15.0;", "with": "const float MOON_PHASE = 60.0;", "why": "a half-lit moon: its sun not under the far horizon"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float sX = airmass(sw.y), sx = EXT_V * max(sX - 1.0, 0.0);", "with": "float sX = 1.0, sx = 0.0;", "why": "no extinction: the stars as bright and as many at the horizon as overhead"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float ml = nightLim(c - gL) + moonLim(rd);", "with": "float ml = nightLim(c - gL);", "why": "a moon-blind limit: the stars as many beside a near-full moon as on a dark night"}
// plant: {"file": "src/world/glsl/lib-air.glsl", "find": "c = max(c * T + fq * (1.0 - T), c * T0 + fq * (1.0 - T0))", "with": "c = c * T + fq * (1.0 - T)", "why": "the physical aerosol pulling sunlit cloud rims down toward the sky (darkened)"}
// plant: {"file": "src/world/glsl/lib-air.glsl", "find": "m * pow(vec3(680.0, 550.0, 440.0) / 550.0, vec3(-uAer.w))", "with": "m * pow(vec3(680.0, 550.0, 440.0) / 440.0, vec3(-uAer.w))", "why": "the wavelength factor normalised at blue: green's extinction off the look's amount"}
// plant: {"file": "src/world/227-night-bodies.js", "find": "for (i = 0; i < 3; i++) { out[i] = sh * h[i] - S[i]; n += out[i] * out[i]; }", "with": "for (i = 0; i < 3; i++) { out[i] = S[i] - sh * h[i]; n += out[i] * out[i]; }", "why": "the comet's tails toward the sun"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "    vec2 q = vec2(atan(rd.x, rd.z) / SKYTAU * 16.0, eS * 0.09);   // (16:", "with": "    vec2 q = vec2(atan(rd.x, rd.z) / SKYTAU * 14.0, eS * 0.09);   // (16:", "why": "the wisps at 3.5 noise periods round the sky: a hard vertical seam at azimuth 180 (the blue hour's box edge)"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "vec3(q.x * 3.0, q.y * 11.0, 0.53) * 0.25, 0.0).b * 0.45;   // (tod fix3", "with": "vec3(q.x * 3.1, q.y * 11.0, 0.53) * 0.25, 0.0).b * 0.45;   // (tod fix3", "why": "the wisps' fine octave at 12.4 periods: its seam at azimuth 180"}
import { test, assert, fs, os, path, vm, crypto, execFileSync, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, fileURLToPath } from '../unit-lib.mjs';

// ------------------------------------------------------------------ the sky order
const SKYDEF = cut(WORLD, '  var WSKY = {', '  /* ---- a sky\'s light on a kit');
const SKYORD = cut(WORLD, '  /* ---- the order (the live\'s pushSky and nextSky, on the world\'s streams) */', '  /* ---- the cycle at t');
const HEAD0 = cut(WORLD, '  function airHeading0()', '\n', true)   // (the landing's heading: the air's, 215; and the frame's equatorial axes and the galactic pole and centre, the galaxy's place)
  + cut(WORLD, '  var AIR_LAT = ', '\n', true) + cut(WORLD, '  function airEq(', '\n', true);
function skyWorld(seed, hour, at) {   // skyInit, skyPush and skyNext as the page runs them, a fake page under them (the colours unread)
  return vm.runInThisContext('(function (SEED, HOURV, AT) {\n  \'use strict\';\n' +
    '  var DEVMODE = false, OPT = { skyScene: null, skyNext: null, skyDt: null }, HOUR = HOURV, J = { seed: SEED };\n' +
    '  function attr(n) { return n === \'data-sky-at\' ? String(AT) : null; }\n' +
    '  function lin2lab(c) { return [0, 0, 0]; } function lab2linA() { return [0, 0, 0]; } function lin2lab3() { return [0, 0, 0]; }\n' +
    '  var PI = Math.PI, DEG = Math.PI / 180;\n' + STREAMS + VEC +
    '  function lch() { return [0, 0, 0]; }\n' + SKYDEF + HEAD0 + SKYORD +
    '  skyInit({ paramsBase: new Float32Array(128) });\n' +
    '  return { SKY: SKY, WSKY: WSKY, skyNext: skyNext, skyReseed: skyReseed, SKY_RECENT: SKY_RECENT, SKY_FAR: SKY_FAR };\n})')(seed, hour, at);
}
// (the openings as a set) the cut: the order after the sky on show drawn again from the visit's own read; the opening
// (its sky, hold and place) is the opening seed's, the rest the read's, and the order's rules still hold after it
test('sky: after the cut the order is the visit\'s own read\'s, the opening kept', () => {
  const after = (read, inMove) => {
    const K = skyWorld(11, 'sunset', 0.5); K.skyNext(); K.SKY.i = 0; K.SKY.k = inMove ? 0.3 : 0;
    const open = JSON.stringify(K.SKY.seq.slice(0, inMove ? 2 : 1));
    K.skyReseed(read); for (let n = 0; n < 30; n++) K.skyNext();
    const ids = K.SKY.seq.map((x) => x.id), back = Math.min(K.SKY_RECENT, K.SKY.ids.length - 2);
    for (let i = 1; i < ids.length; i++) assert.ok(!ids.slice(Math.max(0, i - back), i).includes(ids[i]), `read ${read}: sky ${i} (${ids[i]}) is one of the last ${back}`);
    for (const id of new Set(ids)) assert.equal(K.SKY.visits[id], ids.filter((x) => x === id).length, `read ${read}: ${id}'s visits count the order`);
    return { open, head: JSON.stringify(K.SKY.seq.slice(0, inMove ? 2 : 1).map((x) => [x.id, x.at, x.hold, x.move])), rest: K.SKY.seq.slice(inMove ? 2 : 1).map((x) => x.id + ':' + x.hold.toFixed(4)).join(' ') };
  };
  for (const inMove of [false, true]) {
    const a = after(5, inMove), b = after(5 + 16, inMove), c = after(5, inMove);
    assert.equal(a.head, b.head, 'the skies on show are kept, whatever the read');
    assert.notEqual(a.rest, b.rest, 'two reads of one opening go on differently');
    assert.equal(a.rest, c.rest, 'one read, one order');
  }
});
test('sky: the order\'s rules', () => {
  const hours = ['dawn', 'day', 'rain', 'sunset', 'dusk', 'night'];
  let far = 0, steps = 0; const K0 = skyWorld(1, 'day', 0.5);
  for (let seed = 1; seed <= 120; seed++) {
    const hour = hours[seed % hours.length], K = skyWorld(seed * 2654435761 >>> 0, hour, (seed % 10) / 10), { SKY, WSKY } = K;
    const land = SKY.land[hour] || SKY.land.day;
    assert.ok(land.includes(SKY.seq[0].id), `seed ${seed}: the landing sky ${SKY.seq[0].id} is not one ${hour} lists (${land})`);
    assert.equal(SKY.landing.sky, SKY.seq[0].id);
    for (let n = 0; n < 40; n++) K.skyNext();
    const seen = new Set(SKY.seq.map((x) => x.id));
    assert.equal(seen.size, SKY.ids.length, `seed ${seed}: every sky seen in 40 changes (${[...seen]})`);
    const back = Math.min(K.SKY_RECENT, SKY.ids.length - 2);
    for (let i = 1; i < SKY.seq.length; i++) {
      const id = SKY.seq[i].id, prev = SKY.seq[i - 1];
      assert.ok(SKY.ids.includes(id));
      assert.ok(!SKY.seq.slice(Math.max(0, i - back), i).some((x) => x.id === id), `seed ${seed}: sky ${i} (${id}) is one of the last ${back}`);
      if (!prev.far) assert.ok(WSKY[prev.id].near.includes(id), `seed ${seed}: ${prev.id} -> ${id} is not near, but not marked far`);
      else far++;
      steps++;
      assert.ok(SKY.seq[i].at > prev.at && SKY.seq[i].hold > 0 && SKY.seq[i].move >= 55 && SKY.seq[i].move < 60);
    }
  }
  assert.ok(far > 0 && far / steps < K0.SKY_FAR, `far changes ${(far / steps).toFixed(3)} of ${steps} (some, and fewer than SKY_FAR's draws: a far draw may still land on a near sky)`);
});
test('sky: the same seed, the same order (golden)', () => {
  const order = (seed) => { const K = skyWorld(seed, 'night', 0.5); for (let n = 0; n < 30; n++) K.skyNext(); return K.SKY.seq.map((x) => x.id + ':' + x.hold.toFixed(6) + ':' + x.move.toFixed(6)); };
  assert.deepEqual(order(424242), order(424242));
  assert.notDeepEqual(order(424242), order(424243));
  golden('sky.order', { 424242: digest(order(424242)), 7: digest(order(7)) });
});

// ------------------------------------------------------------------ the sky's hold and change timing
// (dev-speed item 5d) skyInit and skyPush as the page runs them (skyWorld above): every hold 0.9-1.15 of its sky's own
// (the moonlit sea's 190 s among them), each change 55-60 s, each sky starting as the last change ends, and the visit
// opening as far through its first hold as the hour's data-sky-at says (0.9 of the hold at the most; 0.5 when unread)
test('sky timing: holds 0.9-1.15 of their sky\'s, changes 55-60 s, each sky as the last change ends', () => {
  let moon = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const K = skyWorld(seed * 40503 >>> 0, ['dawn', 'day', 'rain', 'sunset', 'dusk', 'night'][seed % 6], 0.3); const { SKY, WSKY } = K;
    for (let n = 0; n < 30; n++) K.skyNext();
    SKY.seq.forEach((s, i) => {
      const own = WSKY[s.id].hold;
      assert.ok(s.hold >= 0.9 * own - 1e-9 && s.hold < 1.15 * own + 1e-9, `seed ${seed}, sky ${i} (${s.id}): hold ${s.hold} against its ${own}`);
      assert.ok(s.move >= 55 && s.move < 60, `seed ${seed}, sky ${i}: change ${s.move} s`);
      if (i) { const p = SKY.seq[i - 1]; assert.equal(s.at, p.at + p.hold + p.move, `seed ${seed}, sky ${i} starts as the last change ends`); }
      if (s.id === 'moonlit') { moon++; assert.ok(s.hold >= 171, `the moonlit sea's hold ${s.hold} (190 x 0.9 at the least)`); }
    });
  }
  assert.ok(moon > 0, 'the moonlit sea came in 60 visits');
});
test('sky timing: the visit opens as far through its first hold as data-sky-at says', () => {
  for (const at of [0, 0.25, 0.5, 0.999, 1]) {
    const { SKY } = skyWorld(7, 'night', at), s = SKY.seq[0], a = s.id === 'moonlit' ? Math.min(at, 0.6) : at;   // (a moonlit opening never past 0.6 of its hold: its moon at the cut where its still has it, the hub's review of #303)
    assert.ok(Math.abs(s.at + s.hold * a * 0.9) < 1e-9, `at ${at}: the first sky (${s.id}) starts ${s.at} (hold ${s.hold})`);
    assert.equal(SKY.landing.at, a);
  }
  for (const bad of ['x', -1, 2]) { const { SKY } = skyWorld(7, 'night', bad); assert.equal(SKY.landing.at, 0.5, `data-sky-at ${bad}: opens halfway`); }  let ml = 0; for (let sd = 1; sd < 400 && ml < 3; sd++) { const { SKY } = skyWorld(sd * 2654435761 >>> 0, 'night', 0.999); if (SKY.seq[0].id === 'moonlit') { ml++; assert.equal(SKY.landing.at, 0.6, 'a moonlit opening never past 0.6 of its hold'); } }
  assert.equal(ml, 3, 'three moonlit openings found');
});

// ------------------------------------------------------------------ the opening's moon in frame (the hub's ask, NIGHT lane)
// 225's moon route (MOON-ROUTE, pure functions) planned as the page plans an opening's moonlit stay (I.land, the cut's
// sky time), on the windows the stills are baked at, the words' boxes as the page lays them out there (measured in
// Chromium, CSS px x the device's): at the cut the moon is ahead, in frame, its whole disc under the top edge, its
// footprint (4.5 deg) clear of every box's outline; after it, it only moves on and is set behind the sea before its stay ends
const MARG = {};
test('night: an opening\'s moon stands in frame at the cut, clear of the words, on every baked window shape', () => {
  const R = cut(WORLD, '  // MOON-ROUTE-BEGIN', '  // MOON-ROUTE-END');
  const M = vm.runInThisContext('(function () {' + R + ' return { moonPlan, moonAt, mrCam, mrProj, mrPix, mrRay, mrAng, MRK }; })')();
  const WIN = [   // [name, css w, css h, dpr, tanY, pitch, boxes (css px)], measured at 01:00 on opening 1
    ['lo-1080x1080', 393, 393, 3, 0.727, 4.2, [[24, 64, 369, 147], [24, 162, 369, 241], [24, 257, 369, 277], [20, 356, 55, 377], [79, 356, 134, 377]]],
    ['lo-1350x1080', 491, 393, 3, 0.582, 12.3, [[44, 57, 448, 154], [44, 169, 426, 248], [44, 264, 448, 284], [20, 356, 55, 377], [79, 356, 134, 377]]],
    ['lo-1920x1080', 699, 393, 3, 0.408, 11.3, [[148, 57, 552, 154], [148, 169, 530, 248], [148, 264, 552, 284], [21, 356, 56, 377], [80, 356, 134, 377]]],
  ];
  for (const [name, w, h, d, tanY, p, boxes] of WIN) for (const sigma of [1, -1]) {
    const W = w * d, H = h * d, I = { psi: 37, pN: p, pL: p, tanX: 0.727, tanY, W, H, boxes: boxes.map((b) => b.map((v) => v * d)), keepPx: 12 * d, coarse: true, noRoom: false, keyAz: 37 + 160, side: 1, sigma, lift: 0, t0: -143, t1: -85.5, t2: 104.5, t3: 162.5, land: 0 };
    const P = M.moonPlan(I), C = M.mrCam(I.psi, p), o = { d: [0, 0, 0] };
    assert.ok(P.caseA && P.Hc === I.psi, `${name}: ahead`);
    M.moonAt(P, 0, o);
    const q = M.mrProj(C, I, o.d), x = (q[0] + 1) / 2, y = (1 - q[1]) / 2;
    assert.ok(q[2] > 0 && x > 0 && x < 1 && y > 0 && y < 1, `${name} sigma ${sigma}: in frame at the cut (${x.toFixed(3)}, ${y.toFixed(3)})`);
    const top = M.mrRay(C, I, Math.max(-1, Math.min(1, q[0])), 1);
    assert.ok(M.mrAng(o.d, top) >= M.MRK.R, `${name}: its whole disc under the top edge (${M.mrAng(o.d, top).toFixed(2)} deg from it; keep x${P.landKeep}, margin ${P.landMg}${P.landSide ? ', beside the words' : ''})`); MARG[name + sigma] = [+(M.mrAng(o.d, top) - M.MRK.R).toFixed(2), P.landKeep, P.landMg, !!P.landSide, +x.toFixed(3)];
    let foot = 180; for (const B of I.boxes) for (let i = 0; i <= 40; i++) for (const [px, py] of [[B[0] + (B[2] - B[0]) * i / 40, B[1]], [B[0] + (B[2] - B[0]) * i / 40, B[3]], [B[0], B[1] + (B[3] - B[1]) * i / 40], [B[2], B[1] + (B[3] - B[1]) * i / 40]]) foot = Math.min(foot, M.mrAng(o.d, M.mrPix(C, I, px, py)));
    assert.ok(foot >= M.MRK.FOOT, `${name} sigma ${sigma}: the footprint ${foot.toFixed(2)} deg from a word box (4.5)`);
    for (const B of I.boxes) assert.ok(!(x * W >= B[0] && x * W <= B[2] && y * H >= B[1] && y * H <= B[3]), `${name}: the moon's centre inside a word box`);
    let px0 = q[0];
    for (let t = 1; t < 162.5; t += 1) { M.moonAt(P, t, o); const qq = M.mrProj(C, I, o.d); if (qq[2] > 0 && Math.abs(qq[0]) < 1.5 && o.el > 0) { assert.ok((qq[0] - px0) * Math.sign(q[0] || 1) >= -1e-9, `${name}: it only moves on, out (t ${t})`); px0 = qq[0]; } }
    M.moonAt(P, 162.4, o); assert.ok(o.el < -M.MRK.R, `${name}: set before the stay ends (${o.el.toFixed(1)} deg)`);
  }  console.log('# opening moon [top margin past the disc, keep share, margin, beside, x]: ' + JSON.stringify(MARG));
});

// the opening's moon on each band's smallest window (the hub's round-4 and round-5 reviews): planned as the page plans
// it, in the part of the still every window of its band shows (226's stillFrame) against 226's STILL_WORDS (the union
// of the bake's boxes and the smallest window's); every place moonClear may choose (each height of MOON_UPS, each
// x of MOON_XS: 226's moonPlaceS) is then walked in the smallest window, as the still is shown there at the cut (cover)
// and in that window's own view (226's stillView: its frustum and pitch), against that window's own boxes
// (test/golden/still-words.json): the disc whole in the window and its footprint clear of every box, or the test fails
test('night: every place the opening moon may take is whole and clear of the words on each band\'s smallest window', () => {
  const R = cut(WORLD, '  // MOON-ROUTE-BEGIN', '  // MOON-ROUTE-END');
  const M = vm.runInThisContext('(function () { var PI = Math.PI, DEG = PI / 180, MOON = {}; function clockNow() { return 0; }\n' + R + cut(WORLD, '  var MOON_VEIL = 5,', '  function moonShown(t, out) {') +
    ' return { moonPlan, moonAt, mrCam, mrProj, mrPix, mrRay, mrAng, MRK, moonBandDir, moonPlaceS, MOON_XS, MOON_UPS }; })')();
  const SF = vm.runInThisContext('(function () { var DEG = Math.PI / 180, CAMUP = ' + /var CAMUP = ([\d.]+);/.exec(WORLD)[1] + ', FOV_LONG = ' + /var FOV_LONG = ([\d.]+);/.exec(WORLD)[1] + ', MOON_KEEP = ' + /MOON_KEEP = ([\d.]+)/.exec(WORLD)[1] +
    '; function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); } function lerp(a, b, t) { return a + (b - a) * t; }\n' +
    cut(WORLD, '  function frustumFor(', '  function setFrustum(') + cut(WORLD, '  var STILL_MIN = ', '  function stillInputs(') + ' return { stillFrame, stillView }; })')();
  const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'golden', 'still-words.json'), 'utf8'));
  const foot = (C, I, d, boxes) => { let f = 180; for (const B of boxes) for (let i = 0; i <= 40; i++) for (const [px, py] of [[B[0] + (B[2] - B[0]) * i / 40, B[1]], [B[0] + (B[2] - B[0]) * i / 40, B[3]], [B[0], B[1] + (B[3] - B[1]) * i / 40], [B[2], B[1] + (B[3] - B[1]) * i / 40]]) f = Math.min(f, M.mrAng(d, M.mrPix(C, I, px, py))); return f; };
  const whole = (C, I, d) => { const q = M.mrProj(C, I, d); if (!(q[2] > 0 && Math.abs(q[0]) < 1 && Math.abs(q[1]) < 1)) return -1; return Math.min(M.mrAng(d, M.mrRay(C, I, q[0], 1)), M.mrAng(d, M.mrRay(C, I, q[0], -1)), M.mrAng(d, M.mrRay(C, I, 1, q[1])), M.mrAng(d, M.mrRay(C, I, -1, q[1]))) - M.MRK.R; };
  let n = 0, least = 180, edge = 180;
  for (const key of Object.keys(G)) {
    const [tier, sh] = key.split('-'), [w0, h0] = sh.split('x').map(Number), F = SF.stillFrame(tier, w0, h0, [0.4, 0.6]), [sw, shh] = G[key].min;
    assert.ok(F, key + ': in the tables');
    const c = Math.max(sw / F.bw, shh / F.bh);   // (the still as cover shows it in that window)
    const vS = SF.stillView(F.bw, F.bh, [0.4, 0.6], {}), cv = { W: sw, H: shh, tanX: vS.tanX * (sw / c) / F.bw, tanY: vS.tanY * (shh / c) / F.bh }, vL = SF.stillView(sw, shh, [0.4, 0.6], {}), own = { W: sw, H: shh, tanX: vL.tanX, tanY: vL.tanY };
    for (const sigma of [1, -1]) for (const psi of [37, 151]) for (const up of M.MOON_UPS) {
      const I = { psi, pN: F.pN, pL: F.pN, tanX: F.tanX, tanY: F.tanY, W: F.W, H: F.H, boxes: F.boxes, keepPx: F.keepPx, coarse: F.coarse, noRoom: false, keyAz: psi + 160, side: 1, sigma, lift: 0, t0: -143, t1: -85.5, t2: 104.5, t3: 162.5, land: 0, landX: M.MRK.LANDX, landUp: up };
      const P = M.moonPlan(I);
      if (!(P.room || P.landRoom)) continue;
      for (const x of P.landSide ? [P.landX] : M.MOON_XS) {
        const d = M.moonBandDir(P, M.moonPlaceS(P, I, x), [0, 0, 0]);
        for (const [view, V, pN] of [['at the cut', cv, F.pN], ['in its own view', own, vL.pN]]) {
          const C = M.mrCam(psi, pN), e = whole(C, V, d), f = foot(C, V, d, G[key].small); n++; least = Math.min(least, f); edge = Math.min(edge, e);
          assert.ok(e >= -1e-6, `${key} at ${sw}x${shh} ${view} (sigma ${sigma}, heading ${psi}, height ${up}, x ${x.toFixed(3)}): the disc not whole in the window (${e.toFixed(2)} deg)`);
          assert.ok(f >= M.MRK.FOOT - 1e-9, `${key} at ${sw}x${shh} ${view} (sigma ${sigma}, heading ${psi}, height ${up}, x ${x.toFixed(3)}): the footprint ${f.toFixed(2)} deg from a word box (4.5)`);
        }
      }
    }
  }
  assert.ok(n >= 1000, `${n} places walked (the test is not empty)`);
  console.log(`# opening moon on the bands' smallest windows: ${n} places, the nearest box ${least.toFixed(2)} deg, the disc ${edge.toFixed(2)} deg inside the edge at least`);
});

// moonLobes lays out cells the streamer has not reached (the hub's round-4 nit): a layout only, so the late program's
// flag it may set through the cell's own api (230's flock) is put back as it was: none starts compiling at the opening.
// 226's own moonLobes runs here on a stub cell whose layout sets the flag; the flag comes out as it went in
test('night: laying out the opening\'s cloud lobes leaves the late programs\' flags as they were', () => {
  const F = cut(WORLD, '  function moonLobes(', '  function moonVeil(');
  for (const before of [[0], [1]]) {
    const K = vm.runInThisContext('(function (B) { var DEG = Math.PI / 180, KITAPI = {}, LATEK = { creature: B[0] }, MOON_VEIL_AZ = 60, laid = 0;\n' +
      'function angd(a, b) { var d = ((a - b) % 360 + 540) % 360 - 180; return d; } function RNG() { return {}; }\n' +
      'function Cell(V, sc, ix, iz) { this.cx = ix * 100; this.cz = iz * 100; this.clouds = []; }\n' +
      'function cellApi(C) { return { hash: 1, flock: function () { LATEK.creature = 1; } }; }\n' + F +
      ' var V = { def: { layout: { scales: [{ radius: 200, size: 100 }] }, cell: function (api) { laid++; api.flock({}); } } };\n' +
      ' var out = moonLobes(V, 0, 0, 0); return { L: [LATEK.creature], laid: laid, out: out }; })')(before);
    assert.ok(K.laid > 0, 'the stub laid out some cells');
    assert.deepEqual(K.L, before, `the late programs' flags after the layout (${K.L}; before ${before})`);
  }
});

// 226's moonClear (the opening moon's place off the clouds) on the route's own plan and synthetic lobes: with no cloud
// it keeps LANDX at the plan's own height in 2 plans; with a cloud body over that place it takes another whose disc is
// clear, still in frame and clear of the words, in at most 4 plans; the same lobes, the same place (no device in it)
test('night: the opening moon\'s place is kept off a cloud body, from the lobes alone, in at most 4 plans', () => {
  const R = cut(WORLD, '  // MOON-ROUTE-BEGIN', '  // MOON-ROUTE-END') + cut(WORLD, '  var CBS = new Float64Array(7)', '  var BIRDF = null;') + cut(WORLD, '  var MOON_VEIL = 5,', '  function moonShown(t, out) {');
  const M = vm.runInThisContext('(function () { var PI = Math.PI, DEG = PI / 180, MOON = {}; function clockNow() { return 0; }\n' + R + ' return { moonPlan, moonAt, moonClear, moonVeil, moonBandDir, mrCam, mrProj, mrPix, mrAng, MRK, MOON }; })')();
  const d = 1, boxes = [[758, 340, 1160, 435], [758, 468, 1090, 545], [758, 578, 1062, 597], [40, 1018, 75, 1040], [99, 1018, 153, 1040]];
  const mk = () => ({ psi: 0, pN: 6, pL: 6, tanX: 0.7265, tanY: 0.4087, W: 1920, H: 1080, boxes, keepPx: 12, coarse: false, noRoom: false, keyAz: 160, side: 1, sigma: 1, lift: 0, t0: -143, t1: -85.5, t2: 104.5, t3: 162.5, land: 0 });
  const eye = [0, 20, 0], E0 = {}, P0 = M.moonClear(E0, mk(), { lob: [], bnd: [] }, eye);
  assert.equal(E0.landX, 1 / 3); assert.equal(E0.landUp, null); assert.ok(M.MOON.landPlans <= 2, `no cloud: ${M.MOON.landPlans} plans`);
  const o = { d: [0, 0, 0] }; M.moonAt(P0, 0, o);
  const at = [eye[0] + o.d[0] * 2500, eye[1] + o.d[1] * 2500, eye[2] + o.d[2] * 2500], cloud = { lob: [at[0], at[1], at[2], 180], bnd: [at[0], at[1], at[2], 180, 0, 4] };
  assert.ok(M.moonVeil(cloud, o.d, M.MRK.R, ...eye) > 100, 'the cloud stands over the plain place');
  const E1 = {}, P1 = M.moonClear(E1, mk(), cloud, eye);
  assert.ok(M.MOON.landPlans <= 4, `${M.MOON.landPlans} plans`);
  M.moonAt(P1, 0, o);
  assert.ok(M.MOON.veil < 5 && M.moonVeil(cloud, o.d, M.MRK.R, ...eye) < 5, `the disc clear of the cloud (${M.MOON.veil})`);
  const C = M.mrCam(0, 6), q = M.mrProj(C, mk(), o.d), x = (q[0] + 1) / 2 * 1920, y = (1 - q[1]) / 2 * 1080;
  assert.ok(q[2] > 0 && x > 0 && x < 1920 && y > 0 && y < 1080, 'in frame');
  for (const B of boxes) { assert.ok(!(x >= B[0] && x <= B[2] && y >= B[1] && y <= B[3]), 'not in a word box'); for (let i = 0; i <= 20; i++) for (const [px, py] of [[B[0] + (B[2] - B[0]) * i / 20, B[1]], [B[0] + (B[2] - B[0]) * i / 20, B[3]]]) assert.ok(M.mrAng(o.d, M.mrPix(C, mk(), px, py)) >= M.MRK.FOOT, 'its footprint clear'); }
  const E2 = {}; M.moonClear(E2, mk(), cloud, eye); assert.deepEqual([E2.landX, E2.landUp], [E1.landX, E1.landUp], 'the same lobes, the same place');
});

// ------------------------------------------------------------------ the galaxy and the aurora come and go by place (aurora-enter-by-place)
// their amounts (fx 2, 3) are only ever 0 or 1 across every change in the order, through the mist's waypoints too;
// what moves is how far each has come in (SKY.rise), 0 to 1 with the change, and whole wherever both ends have it
const FXSTEP = cut(WORLD, '    for (j = 0; j < 8; j++) SKY.fx[j] = X.fx[j]', '    skySun(V, w, L);');
const FXPLACE = cut(WORLD, '  function skyFxPlace(', '  /* two skies\' colours blended');
const FXOF = cut(WORLD, '    var fx = S.fx || {};', '\n', true) + cut(WORLD, '    O.fx = [fx.belt', '\n', true);
test('sky: across every change the galaxy\'s and the aurora\'s amounts are 0 or 1, never between (no fades)', () => {
  const step = new Function('SKY', 'X', 'Y', 'q', 'L', 'V', 'w', 'var j; function skySun() {}\n' + FXPLACE + FXSTEP);
  const fxOf = new Function('S', 'var O = {};\n' + FXOF + 'return O.fx;');
  const way = (a, b) => a.map((x, j) => (x + b[j]) / 2 * 0.25);   // (221's waypoint: the two skies' midpoint at a quarter)
  let changes = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const K = skyWorld(seed * 2246822519 >>> 0, ['dawn', 'day', 'rain', 'sunset', 'dusk', 'night'][seed % 6], 0.5);
    for (let n = 0; n < 30; n++) K.skyNext();
    const seq = K.SKY.seq;
    for (let i = 1; i < seq.length; i++) {
      const A = { fx: fxOf(K.WSKY[seq[i - 1].id]), motes: 0 }, B = { fx: fxOf(K.WSKY[seq[i].id]), motes: 0 };
      const halves = seq[i].far || seq[i - 1].far ? [[A, { fx: way(A.fx, B.fx), motes: 0 }], [{ fx: way(A.fx, B.fx), motes: 0 }, B]] : [[A, B]];
      let last = null;
      for (const [X, Y] of halves) for (let k = 0; k <= 40; k++) {
        const S = { fx: new Float32Array(8), rise: new Float32Array(2) }, q = k / 40;
        step(S, X, Y, q, {}, null, 0);
        for (const j of [2, 3]) {
          assert.ok(S.fx[j] === 0 || S.fx[j] === 1, `seed ${seed}: ${seq[i - 1].id} -> ${seq[i].id} at q ${q}: fx ${j} is ${S.fx[j]} (only 0 or 1)`);
          assert.ok(S.rise[j - 2] >= 0 && S.rise[j - 2] <= 1, `rise ${j - 2} out of [0, 1]`);
          if (S.fx[j] && X.fx[j] > 0 && Y.fx[j] > 0) assert.equal(S.rise[j - 2], 1, 'whole while both ends have it');
        }
        if (last) for (const j of [0, 1]) assert.ok(Math.abs(S.rise[j] - last[j]) <= 1 / 40 + 1e-6, `seed ${seed}: the rise jumps (${last[j]} -> ${S.rise[j]})`);
        last = [S.rise[0], S.rise[1]];
      }
      changes++;
    }
  }
  assert.ok(changes > 500, `${changes} changes`);
  // and the shader takes the aurora's rise (uAur.x) by place: its own auroraAt base lines, run here (the
  // review: text matches alone let a shader that ignored the rise pass)
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const js = (t) => t.replace(/\bfloat\s+/g, 'let ').replace(/(\d)\.(?!\d)/g, '$1.0');
  const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const EB = g.match(/^\s*float eb = radians\((mix\(-?[\d.]+, mix\(-?[\d.]+, -?[\d.]+, uAurB\.x\), uAur\.x\))\);/m), DL = g.match(/^\s*float D = (6371\.0 \* \(acos\(cos\(eb\) \/ \(1\.0 \+ [\d.]+ \/ 6371\.0\)\) - eb\));/m);
  assert.ok(EB && DL, 'auroraAt\'s sheet (float eb = radians(mix(...)); float D = ...) not found');
  const mixf = (a, b, t) => a + (b - a) * t;
  const ebAt = (rise) => new Function('uAur', 'uAurB', 'mix', 'return ' + js(EB[1]) + ';')({ x: rise }, { x: 0 }, mixf);   // (as it comes in: its hold not begun)
  const DAt = (rise) => { const eb = ebAt(rise) * Math.PI / 180; return new Function('eb', 'cos', 'acos', 'return ' + js(DL[1]) + ';')(eb, Math.cos, Math.acos); };
  assert.ok(g.includes('float h = 6371.0 * (cos(el) / cos(ee) - 1.0)'), 'auroraAt\'s altitude is not the one this test models');
  for (let r = 0; r < 1; r += 0.05) assert.ok(DAt(r + 0.05) < DAt(r), `the aurora's sheet does not come nearer with its rise (${r})`);
  assert.ok(Math.abs(DAt(1) - 650) < 5, `the sheet, come in, is ${DAt(1).toFixed(0)} km away (650)`);
  {   // as it begins to come in (D 1950), wherever it is drawn (from 0.5 deg up, eased in over 2) it is the red's thin
    // top over 300 km, at most 2% of the green's peak (the red's is a fifth of it): nothing of it shows at once
    const D0 = DAt(0.001);
    for (let ed = 0.5; ed <= 3; ed += 0.1) {
      const e = ed * Math.PI / 180, h = 6371 * (Math.cos(e) / Math.cos(e + D0 / 6371) - 1), k = 0.2 * Math.exp(-Math.max(h - 230, 0) / 60) * ss(0.5, 2.5, ed);
      assert.ok(h > 300 && k <= 0.02, `as the aurora begins to come in, ${ed.toFixed(1)} deg up meets its sheet at ${h.toFixed(0)} km, ${(100 * k).toFixed(1)}% of the green's peak (it would show at once: over 300 km, at most 2%)`);
    }
  }
  assert.ok(g.includes('vec3 auroraAt(vec3 rd, float e) {\n  if (uAur.x <= 0.0) return vec3(0.0);'), 'the galaxy and the aurora are read before they begin to come in');
  assert.ok(/gl\.uniform4f\(u\.uAur, SKY\.aur\.rise,/.test(WORLD), 'the aurora\'s rise is not passed to the sky (uAur.x, its own: skyAur)');
});

test('physics: night/sky-turn: the stars and the galaxy turn together on the air\'s frame (no edge of the galaxy\'s own)', () => {
  // the frame is the air's (215 skyFrame / skySphere, physics: air/sky-frame: test/unit/air.mjs); here: the galaxy stands in it
  // by J2000's galactic pole and centre (so the frame turns it with the stars), the shader reads both through it, and the
  // stars fill the whole sphere (a turn never brings up a starless sky)
  assert.ok(WORLD.includes('SKY.gal = { pole: airEq(AIR_GAL.pole[0], AIR_GAL.pole[1]), core: airEq(AIR_GAL.centre[0], AIR_GAL.centre[1]), lie: best };'), 'the galaxy is not placed by the galactic pole and centre in the air\'s frame');
  const GAL = WORLD.match(/AIR_GAL = \{ pole: \[([\d.]+), ([\d.]+)\], centre: \[([\d.]+), (-?[\d.]+)\] \}/).slice(1).map(Number), D = Math.PI / 180;
  const eq = (ra, dec) => [Math.cos(dec * D) * Math.cos(ra * D), Math.cos(dec * D) * Math.sin(ra * D), Math.sin(dec * D)], P = eq(GAL[0], GAL[1]), C = eq(GAL[2], GAL[3]);
  assert.ok(Math.abs(P[0] * C[0] + P[1] * C[1] + P[2] * C[2]) < 1e-3, 'the galactic centre does not lie on the galactic equator (its pole and centre 90 deg apart)');
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  assert.ok(g.includes('gL = galaxyAt(uSkyF * rd, eS) * hzT;') && g.includes('vec3 rs = uSkyF * rd;') && g.includes('float v = starAt(rs, el, az, pa, head / max(sk, 1e-5), ml, dj, di, tc);'), 'the galaxy and the stars are not both read through the sky\'s frame (uSkyF): one would slide against the other');
  assert.ok(!/galEdge/.test(g), 'the galaxy keeps an edge of its own (it comes and goes by the sky\'s turn)');
  assert.ok(g.includes('if (abs(elc) > 1.56) return 0.0;'), 'the stars fill only one of the frame\'s hemispheres: a turn would bring up a starless sky');
  assert.ok(/gl\.uniformMatrix3fv\(u\.uSkyF, false, skyFrame\(SIM\.t - \(1 - SIM\.alpha\) \* SIM_DT \+ SKY\.dt, V\)\)/.test(WORLD), '226 does not pass the sky\'s frame at the sky clock\'s time');
  const RATE = +WORLD.match(/var SKY_RATE = ([\d.]+);/)[1], degS = RATE * 15 / 3600;   // under the pixel limit: 0.25 px a frame at 60 Hz on a phone's 0.0376 deg/px
  assert.ok(degS / 60 / 0.0376 <= 0.25, `the stars move ${(degS / 60 / 0.0376).toFixed(3)} px a frame (at most 0.25)`);
});

test('physics: weather/far-anvil: the far storm hides the sky in the air\'s colour, its top lit above the Earth\'s shadow, its lightning a soft, slow flicker', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const K = +g.match(/const float ANV_K = ([\d.]+);/)[1], FK = 0.02 / 0.8966;
  assert.ok(g.includes('const float ANV_FK = 0.02 / 0.8966;'), 'the flicker\'s peak is not Y +0.02 (ANV_FK)');
  const FC = [0.85, 0.9, 1.0], Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  assert.ok(Math.abs(Y(FC) - 0.8966) < 1e-4, `the flicker colour's luminance ${Y(FC).toFixed(4)} (ANV_FK's 0.8966)`);
  const NZ = cut(WORLD, '  var NOISE = { t: null', '  /* stage B: the texture');
  const VOL = new Function(STREAMS + VEC + NZ + '\n NOISE.data = noiseData(); NOISE.d64 = new Float64Array(NOISE.data); NOISE.vol = new Uint8Array(NOISE_N * NOISE_N * NOISE_N * 4); for (var z = 0; z < NOISE_N; z++) noiseLayer(z); return NOISE.vol;')();
  const w3 = (i) => ((i % 32) + 32) % 32, na = (x, y, z) => { const X = x * 32 - 0.5, Y2 = y * 32 - 0.5, Z = z * 32 - 0.5, x0 = Math.floor(X), y0 = Math.floor(Y2), z0 = Math.floor(Z), fx = X - x0, fy = Y2 - y0, fz = Z - z0; let v = 0; for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) v += (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz) * VOL[((w3(z0 + dz) * 32 + w3(y0 + dy)) * 32 + w3(x0 + dx)) * 4 + 3]; return v / 255; };
  // anvilAt's own lines: (its cover, its lit part, its flicker), a part at a time
  const a = g.indexOf('vec3 anvilAt('), b = g.indexOf('\n}\n', a);
  let body = g.slice(g.indexOf('{', a) + 1, b).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/flash|ray/i.test(body), 'the storm throws rays or flashes (its lightning is the flicker\'s soft glow)');
  body = body.replace(/\bfloat\s+/g, 'let ').replace(/textureLod\(uN3, vec3\(([^;]*?)\), 0\.0\)\.a/g, (m, x) => 'NA(' + x + ')').replace(/\bvec3\(/g, 'V3(');
  const AN = new Function('rd', 'uAnv', 'uAnvF', 'CH', 'NA', 'const V3 = (p, q, r) => (q === undefined ? p : [p, q, r][CH]), { abs, sqrt, exp, sin, cos, tan, max, min, pow } = Math, clamp = (x, a, b) => Math.min(Math.max(x, a), b), atan = (y, x) => Math.atan2(y, x), radians = (x) => x * Math.PI / 180, smoothstep = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };' + body);
  const D2R = Math.PI / 180, A = 0.9, OFF = 95, sunAz = A - OFF * D2R, D = 120;
  const anv = (phi, e, sunEl, F) => { const rd = { x: Math.sin(A + phi) * Math.cos(e), y: Math.sin(e), z: Math.cos(A + phi) * Math.cos(e) }, U = { x: A, y: D, z: sunEl, w: sunAz }, UF = F || { x: 0, y: 0, z: 0, w: 1 }; return [0, 1, 2].map((ch) => AN(rd, U, UF, ch, na)); };
  // where it is lit, the sun 3 deg down: only over the Earth's shadow at the storm, R (1 / cos d - 1); its cover whole, its parts within it
  const dc = 3 * D2R - D / 6371 * Math.cos(OFF * D2R), hs = 6371 * (1 / Math.cos(dc) - 1), F1 = { x: 1, y: 3, z: 9, w: 6 };
  let lowLit = 99, cov = 0, fpk = 0;
  for (let phi = -0.6; phi <= 0.6; phi += 0.005) for (let e = -0.004; e <= 0.12; e += 0.0005) {
    const c = anv(phi, e, -3, F1);
    assert.ok(c[0] >= 0 && c[0] <= 1 + 1e-9 && c[1] >= 0 && c[1] <= c[0] + 1e-9 && c[2] >= 0 && c[2] <= c[0] + 1e-9, 'the storm\'s lit part or flicker outside its cover');
    cov = Math.max(cov, c[0]); fpk = Math.max(fpk, c[2]);
    if (c[1] > 1e-5) lowLit = Math.min(lowLit, D * Math.tan(e) + D * D / 14866);
  }
  assert.ok(cov > 0.99 && fpk > 0.5, 'the storm has no whole cover, or its flicker no light');
  assert.ok(Math.abs(lowLit - hs) < 0.8, `its lit part begins ${lowLit.toFixed(2)} km up (the Earth's shadow there: ${hs.toFixed(2)} km)`);
  for (const se of [-7, -24]) for (let phi = -0.6; phi <= 0.6; phi += 0.02) for (let e = 0; e <= 0.12; e += 0.002) assert.ok(anv(phi, e, se)[1] === 0, `the storm is lit with the sun ${se} deg down`);
  for (let phi = -0.6; phi <= 0.6; phi += 0.02) for (let e = 0; e <= 0.12; e += 0.002) assert.ok(anv(phi, e, -24)[2] === 0, 'the storm flickers with no flash on');
  // its body is the far land's own colour at its range (atmos), and at 100 km that air is whole in every realm's kit
  assert.ok(g.includes('c = mix(c, atmos(uClShade, rd, 1000.0 * uAnv.y / max(length(rd.xz), 1e-3)), aM.x);'), 'the storm\'s body is not the air at its range (atmos: the far land\'s distance haze)');
  for (const f of ['realm-dunes.js', 'realm-above.js']) { const m = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8').match(/fog: \[([\d.e-]+), [^,]+, [^,]+, ([\d.e-]+)\]/); assert.ok(m && +m[2] * 1e5 >= 5, `${f}: the air at 100 km is not whole (its depth ${m && (+m[2] * 1e5).toFixed(1)})`); }
  // the sky behind it as the page draws it: the twilight's stops at their heights, darker away from the sun, under the ground haze
  // (the dunes' at 0.45-0.85), its body the air's colour from a little lower (fogCol), its lit top through the haze and the cap
  const { WSKY } = skyWorld(1, 'night', 0.5);
  const o2l = (L, aa, bb) => { let l = L + 0.3963377774 * aa + 0.2158037573 * bb, m = L - 0.1055613458 * aa - 0.0638541728 * bb, s = L - 0.0894841775 * aa - 1.2914855480 * bb; l **= 3; m **= 3; s **= 3; return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map((x) => Math.max(x, 0)); };
  const lc = (s) => o2l(s[0], s[1] * Math.cos(s[2] * D2R), s[1] * Math.sin(s[2] * D2R));
  const Lof = (c) => 0.2104542553 * Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]) + 0.7936177850 * Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]) - 0.0040720468 * Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
  assert.ok(g.includes('float yA = dot(aA, LUMA), room = max(0.1175 - dot(c, LUMA), 0.0);') && g.includes('c += aA * (yA > 1e-6 ? room * (1.0 - exp(-yA / max(room, 1e-6))) / yA : 1.0);'), 'the storm\'s light is not held by the room under its cap (the lines this test models)');
  assert.ok(g.includes('vec3 aA = (vec3(1.0, 0.6, 0.46) * aM.y * ANV_K + vec3(0.85, 0.9, 1.0) * aM.z * ANV_FK) * (1.0 - hazeSky(rd));'), 'the storm\'s light is not its lit top and its flicker through the haze (the line this test models)');
  const capAdd = (c0, ad) => { const yA = Y(ad), room = Math.max(0.1175 - Y(c0), 0); return ad.map((v) => v * (yA > 1e-6 ? room * (1 - Math.exp(-yA / Math.max(room, 1e-6))) / yA : 1)); };
  const E = [0, 3, 10, 26, 58];
  const skyAt = (S, e) => { const st = S.sky.map(lc); let c = st[4]; for (let i = 0; i < 4; i++) if (e <= E[i + 1]) { const t = (e - E[i]) / (E[i + 1] - E[i]); c = st[i].map((v, j) => v + (st[i + 1][j] - v) * t); break; } return c.map((v) => v * (1 - S.skyK[2] * Math.exp(-e / S.skyK[1]))); };
  // (the haze's light the sky's own toward the horizon: lib-air hazeCol, fogCol at the dunes' fog2)
  const scene = (S, e, hz) => { const h = 1 - Math.exp(-1e-3 * hz * Math.exp(-24 / 30) * 30 / Math.sin(e * D2R)), ep = Math.asin(Math.sin(e * D2R) * 0.45 + 0.02) / D2R, hc = skyAt(S, ep), haze = (c) => c.map((v, i) => v + (hc[i] - v) * h); return { h, sky: haze(skyAt(S, e)), body: haze(skyAt(S, ep)) }; };
  let showMin = 9, showMax = -9;
  for (const id of ['afterglow', 'firstlight']) for (const hz of [0.45, 0.85]) for (const e of [4, 5.5, 7]) {
    const S = WSKY[id], sc = scene(S, e, hz), ad = capAdd(sc.body, [1, 0.6, 0.46].map((v) => v * K * (1 - sc.h))), c1 = sc.body.map((v, i) => v + ad[i]);
    assert.ok(Lof(c1) <= Math.max(0.50, Lof(sc.sky), Lof(sc.body)) + 1e-9, `${id}: the storm's lit top at ${e} deg reaches L ${Lof(c1).toFixed(5)} (sky ${Lof(sc.sky).toFixed(5)}, body ${Lof(sc.body).toFixed(5)}) (at most 0.50, or what already stands there: the sky, or the storm's body, the air's colour at its range)`);
    assert.ok((0.82 + 0.05) / (Y(c1) + 0.05) >= 4.5, `${id}: the credit over the storm's lit top reads ${((0.82 + 0.05) / (Y(c1) + 0.05)).toFixed(2)}:1`);
    showMin = Math.min(showMin, Lof(c1) - Lof(sc.sky)); showMax = Math.max(showMax, Lof(c1) - Lof(sc.sky));
  }
  assert.ok(showMax - showMin < 0.1, `the storm over the twilight's sky: L ${showMin.toFixed(3)} to ${showMax.toFixed(3)} (the air at its range is the horizon's own colour)`);
  // its flicker over the nights' and the blue hour's skies where it stands: Y +0.02 at most, under the cap, the credit kept
  for (const id of ['bluehour', 'moonlit', 'milkyway', 'aurora']) for (const hz of [0.45, 0.85]) for (const e of [3, 6]) {
    const S = WSKY[id]; if (!S) continue;
    const sc = scene(S, e, hz), ad = capAdd(sc.body, FC.map((v) => v * FK * (1 - sc.h))), c1 = sc.body.map((v, i) => v + ad[i]);
    assert.ok(Y(ad) <= 0.02 + 1e-9, `${id}: the flicker adds Y ${Y(ad).toFixed(4)} (at most 0.02: far under a flash's 10%)`);
    assert.ok(Lof(c1) <= Math.max(0.50, Lof(sc.body)) + 1e-9 && (0.82 + 0.05) / (Y(c1) + 0.05) >= 4.5, `${id}: the flicker at ${e} deg passes L 0.50 or the credit's 4.5:1`);
  }
  // the flicker's clock: 225's own lines, over an hour in 32 visits: every flash rises and falls over 100 ms or more, never two at
  // once, never more than 3 in any second, its groups 10-40 s apart; from the read (SEEDR) only after the cut, with the sun 5 deg
  // or more down, never in reduced motion
  const FL = new Function(STREAMS + cut(WORLD, '  var FL_GAP = ', '  function anvFlashAt(') + '\nreturn { RNG, subseed, anvGroup, anvEnv, FL_GAP, FL_SUN };')();
  assert.ok(FL.FL_SUN <= -5, `the flicker plays with the sun ${FL.FL_SUN} deg down (the storm unlit: 5 or more)`);
  assert.ok(WORLD.includes('if (!SKY.anv || !AFTER || reduced()) return out;') && WORLD.includes('F.r = RNG(subseed(SEEDR, 86));') && WORLD.includes('F.g.on = anvSunEl() <= FL_SUN && anvInHold(F.g);') && WORLD.includes('return !!e && !(SKY.k > 0) && f.s + f.d <= e.at + e.hold;'), 'the flicker is not held to the storm, the read after the cut, motion, a hold and the storm unlit');
  // the sun's depth at the storm one way through a change: the change's two skies on its own clock, never a mist's waypoint (a night)
  assert.ok(WORLD.includes('var ea = anvElOf(SKY.A), eb = anvElOf(SKY.B);') && WORLD.includes('return ea + (eb - ea) * ss01(SKY.k || 0);'), 'the storm reads the sun\'s depth from the waypoint (its top goes dark and comes back between afterglow and first light)');
  // drawn in its place: before what is nearer (the 3 km veil over it), hiding what is farther (the galaxy, the aurora, the moon, the stars)
  { const iS = g.indexOf('vec3 aM = anvilAt(rd);'), iV = g.indexOf('if (uHi.x > 0.0 && rd.y > 0.01)'), iB = g.indexOf('vec3 cBA = c;'), iG = g.indexOf('#ifdef SKY_PH2\n  /* (aurora-haze)'), iT = g.indexOf('c += vec3(0.92, 0.94, 1.0) / 0.94 * min(s * sk, head);'), iR = g.indexOf('if (anvCov > 0.0) c = mix(c, cBA, anvCov);');
    assert.ok(iS > 0 && iS < iV, 'the storm is drawn after the 3 km veil (it wipes out the veil in front of it)');
    assert.ok(iB > iV && iB < iG && iB < g.indexOf('if (uNight.y > 0.0 && eS > 0.5') && iR > iT, 'the wisps, the galaxy, the aurora, the moon or the stars print over the storm\'s body'); }
  assert.ok(g.includes('D * D / 14866.0;'), 'the storm\'s place without standard refraction (R 7/6)');
  assert.ok(WORLD.includes('if (u.uAnvF) gl.uniform4fv(u.uAnvF, anvFlashAt(SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt));'), 'the flicker is not uploaded at the drawn time');
  let nfl = 0, minRise = 9, maxIn1 = 0, minGap = 99, maxGap = 0, peaks = [];
  for (let k = 0; k < 32; k++) {
    const r = FL.RNG(FL.subseed((k * 2654435761 + 7) >>> 0, 86)); let t = r.r(10, 40), lastEnd = -1e9; peaks = [];
    while (t < 3600) {
      const G = FL.anvGroup(r, t), f = G.fl;
      if (lastEnd > -1e9) { minGap = Math.min(minGap, f[0].s - lastEnd); maxGap = Math.max(maxGap, f[0].s - lastEnd); }
      for (let i = 0; i < f.length; i++) {
        nfl++;
        let pk = 0, tp = f[i].s; for (let u = 0; u <= 1; u += 0.001) { const v = FL.anvEnv(f[i], f[i].s + u * f[i].d); if (v > pk) { pk = v; tp = f[i].s + u * f[i].d; } }
        assert.ok(pk <= 1 && FL.anvEnv(f[i], f[i].s) < 1e-9 && FL.anvEnv(f[i], f[i].s + f[i].d) < 1e-9, 'a flash past its peak, or not from nothing to nothing');
        minRise = Math.min(minRise, tp - f[i].s, f[i].s + f[i].d - tp); peaks.push(tp);
        if (i > 0) assert.ok(f[i].s >= f[i - 1].s + f[i - 1].d, 'two flashes at once');
        if (i > 0) assert.ok(f[i].s - f[i - 1].s >= 0.6, `two flashes ${(f[i].s - f[i - 1].s).toFixed(3)} s apart (0.6 s at least)`);
      }
      lastEnd = f[f.length - 1].s + f[f.length - 1].d; t = G.next;
    }
    for (let i = 0, j = 0; i < peaks.length; i++) { while (peaks[i] - peaks[j] >= 1) j++; maxIn1 = Math.max(maxIn1, i - j + 1); }   // (this visit's peaks, in time order)
  }
  assert.ok(minRise >= 0.13, `a flash rises or falls in ${(1000 * minRise).toFixed(0)} ms (at least 130)`);
  assert.ok(maxIn1 <= 2, `${maxIn1} flash peaks inside one second (the owner's "under 3": at most 2)`);
  assert.ok(minGap >= 10 && maxGap <= 41, `the flicker's groups ${minGap.toFixed(1)}-${maxGap.toFixed(1)} s apart (10-40)`);
  assert.ok(nfl > 32 * 3600 / 50, `only ${nfl} flashes in 32 hours`);
  // in about 3 of the 16 openings (their seeds: the bake's), 80-110 deg off the sun's bearing, 100-150 km away
  const { RNG, subseed } = new Function(STREAMS + '\nreturn { RNG, subseed };')();
  let n = 0;
  for (let k = 0; k < 16; k++) { const r = RNG(subseed((11 + k * 0x9e3779b9) >>> 0, 83)); if (r.f() < 3 / 16) n++; r.sign(); const off = r.r(80, 110), d = r.r(100, 150); assert.ok(off >= 80 && off <= 110 && d >= 100 && d <= 150, 'the storm stands outside 80-110 deg off the sun, or 100-150 km'); }
  assert.ok(n >= 2 && n <= 4, `the far storm stands in ${n} of the 16 openings (about 3)`);
  assert.ok(/var rA = RNG\(subseed\(J\.seed, 83\)\), anv = rA\.f\(\) < 3 \/ 16, side = rA\.sign\(\), off = rA\.r\(80, 110\), dist = rA\.r\(100, 150\);/.test(WORLD), 'the storm\'s draw is not the one this test models');
  // never glittering: 1x against 2x2 at a laptop's pixel across it, in display codes as shown, its lit top over the afterglow
  // and its flicker at its peak over the moonlit sky, each through the cap over the sky where it stands
  const code = (x) => { x = Math.min(Math.max(x, 0), 1); return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055); };
  const px = 0.0578 * D2R, Ff = { x: 1, y: 3, z: 9, w: 4 };
  let worst = 0;
  for (const [id, se, F, pick] of [['afterglow', -3, null, (c) => [1, 0.6, 0.46].map((v) => v * K * c[1])], ['moonlit', -24, Ff, (c) => FC.map((v) => v * FK * c[2])]]) {
    const bg = scene(WSKY[id], 5, 0.45).body;
    for (let phi = -0.5; phi <= 0.5; phi += 0.0029) for (let e = 0; e <= 0.11; e += 0.0013) {
      const one = capAdd(bg, pick(anv(phi, e, se, F))), ref = [0, 0, 0];
      for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) capAdd(bg, pick(anv(phi + ox * px / 4, e + oy * px / 4, se, F))).forEach((v, i) => { ref[i] += v / 4; });
      worst = Math.max(worst, ...[0, 1, 2].map((i) => Math.abs(code(bg[i] + one[i]) - code(bg[i] + ref[i]))));
    }
  }
  assert.ok(worst <= 3, `the storm at 1x is ${worst.toFixed(1)} codes from 2x2 (at most 3)`);
});

test('physics: weather/moon-halo: the 22 deg ring and the moon dogs, only adding light, under the ceiling, never glittering', () => {
  // sky-body.glsl's own haloDev and haloAt, made JS a channel at a time (their vec3s are colours)
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const N = +g.match(/const float HALO_N = ([\d.]+);/)[1], K = +WORLD.match(/var HALO_K = ([\d.]+);/)[1];
  const fbody = (name) => { const a = g.indexOf(name), b = g.indexOf('\n}\n', a); return g.slice(g.indexOf('{', a) + 1, b); };
  const js = (t) => t.replace(/\bfloat\s+/g, 'let ').replace(/\bvec3\s+/g, 'let ').replace(/\bvec3\(/g, 'V3(').replace(/(\d)\.(?!\d)/g, '$1.0');
  const hdev = (n) => 2 * Math.asin(Math.min(Math.max(n * 0.5, -1), 1)) * 180 / Math.PI - 60;
  const H = new Function('rd', 'uMoon', 'uHalo', 'CH', 'HALO_N', 'haloDev', 'const V3 = (a, b, c) => (b === undefined ? a : [a, b, c][CH]), { abs, sqrt, exp, sin, cos, asin, acos, atan2, max, min } = Math, atan = (y, x) => Math.atan2(y, x), clamp = (x, a, b) => Math.min(Math.max(x, a), b), degrees = (x) => x * 180 / Math.PI, radians = (x) => x * Math.PI / 180, pow = Math.pow, mix = (a, b, t) => a + (b - a) * t, smoothstep = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); }, dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;' + js(fbody('vec3 haloAt(')).replace('dot(rd, uMoon.xyz)', 'dot(rd, uMoon)'));
  const halo = (rd, m) => [0, 1, 2].map((ch) => H({ x: rd[0], y: rd[1], z: rd[2] }, { x: m[0], y: m[1], z: m[2] }, { x: 1, y: K }, ch, N, hdev));
  const dirAE = (az, e) => [Math.sin(az) * Math.cos(e), Math.sin(e), Math.cos(az) * Math.cos(e)], D2R = Math.PI / 180;
  assert.ok(Math.abs(hdev(N) - 21.84) < 0.05, `ice's minimum deviation ${hdev(N).toFixed(2)} deg (21.84)`);
  for (const me of [5, 15, 30, 45]) {
    const m = dirAE(0.4, me * D2R);
    // the ring straight above the moon (away from the dogs): its peak and its empty inside
    let best = { v: -1 };
    for (let th = 10; th <= 30; th += 0.02) { const v = halo(dirAE(0.4, (me + th) * D2R), m)[1]; if (v > best.v) best = { v, th }; if (th < 21.3) assert.ok(v === 0, `the halo brightens ${th.toFixed(1)} deg from the moon (inside its ring: nothing)`); }
    if (me + 30 < 89) assert.ok(best.th >= 21.8 && best.th <= 22.4, `moon at ${me} deg: the ring peaks ${best.th.toFixed(2)} deg out (21.8-22.4)`);
    // the dogs: at the moon's height, their azimuth offset the plates' minimum deviation (n' = sqrt(n^2 - sin^2 e) / cos e)
    const np = Math.sqrt(N * N - Math.sin(me * D2R) ** 2) / Math.cos(me * D2R), want = hdev(np);
    let bd = { v: -1 };
    for (let da = 15; da <= 55; da += 0.02) { const v = halo(dirAE(0.4 + da * D2R, me * D2R), m)[1]; if (v > bd.v) bd = { v, da }; }
    assert.ok(Math.abs(bd.da - want) <= 0.3, `moon at ${me} deg: its dog stands ${bd.da.toFixed(2)} deg off in azimuth (the plates': ${want.toFixed(2)} +-0.3)`);
  }
  // composited over the moonlit sky at its brightest place (the dog, the moon at 15 deg), saturated and under the ceiling
  const { WSKY } = skyWorld(1, 'night', 0.5), S = WSKY.moonlit;
  const o2l = (L, a, b) => { let l = L + 0.3963377774 * a + 0.2158037573 * b, mm = L - 0.1055613458 * a - 0.0638541728 * b, s = L - 0.0894841775 * a - 1.2914855480 * b; l **= 3; mm **= 3; s **= 3; return [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * s]; };
  const Lof = (c) => Math.cbrt(0.2104542553 * 0 + 0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]) * 0.2104542553 + Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]) * 0.7936177850 - Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]) * 0.0040720468;
  const m15 = dirAE(0.4, 15 * D2R), np15 = Math.sqrt(N * N - Math.sin(15 * D2R) ** 2) / Math.cos(15 * D2R);
  const dogAdd = halo(dirAE(0.4 + hdev(np15) * D2R, 15 * D2R), m15), ringAdd = halo(dirAE(0.4, (15 + 22.1) * D2R), m15);
  // the dog at the moon's height (the low sky's stops, 1-3), the ring's top 37 deg up (the high sky's, 3-5)
  for (const [st, add] of S.sky.slice(1, 4).map((x) => [x, dogAdd]).concat(S.sky.slice(3, 6).map((x) => [x, ringAdd]))) {
    const c0 = o2l(st[0], st[1] * Math.cos(st[2] * D2R), st[1] * Math.sin(st[2] * D2R)).map((x) => Math.max(x, 0)), c1 = c0.map((v, i) => v + add[i]);
    const L0 = Lof(c0), L1 = Lof(c1), Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];   // (unclamped: the halo itself must stay under 0.53, not the ceiling for it)
    assert.ok(L1 - L0 >= 0.02 && L1 - L0 <= 0.07, `over the moonlit sky's [${st}] the halo adds L ${(L1 - L0).toFixed(3)} (about 0.03-0.06)`);
    assert.ok(L1 <= 0.53, `the halo's brightest place reaches L ${L1.toFixed(3)} (at most 0.53)`);
    assert.ok((0.82 + 0.05) / (Y(c1) + 0.05) >= 4.5, `the credit over the halo's brightest place reads ${((0.82 + 0.05) / (Y(c1) + 0.05)).toFixed(2)}:1 (at least 4.5)`);
  }
  // never glittering: 1x against 2x2 at a laptop's pixel (0.0578 deg) across the ring and a dog, in display codes of its light alone
  const code = (x) => { x = Math.min(Math.max(x, 0), 1); return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055); };
  let worst = 0;
  for (let dx = -40; dx <= 40; dx += 0.37) for (const dy of [0, 7.3, 22.1]) {
    const at = (x, y) => halo(dirAE(0.4 + x * D2R, (15 + y) * D2R), m15);
    const one = at(dx, dy), ref = [0, 0, 0];
    for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) at(dx + ox * 0.25 * 0.0578, dy + oy * 0.25 * 0.0578).forEach((v, i) => { ref[i] += v / 4; });
    worst = Math.max(worst, ...[0, 1, 2].map((i) => Math.abs(code(one[i]) - code(ref[i]))));
  }
  assert.ok(worst <= 3, `the halo at 1x is ${worst.toFixed(1)} codes from 2x2 (at most 3)`);
  // with the moon's depth and under the haze: the line in the moon block, before the haze is laid over the moon's lights
  const mb = g.indexOf('if (uHalo.x > 0.0) c += haloAt(rd) * uMoon.w;'), hz = g.indexOf('c = c0 + (c - c0) * (1.0 - hazeSky(rd));', mb);
  assert.ok(mb > 0 && hz > mb && hz - mb < 200, 'the halo is not added with the moon\'s depth (uMoon.w) just before the haze is laid over the moon\'s lights');
  // by moonlight the eye sees the ring and the dogs near colourless: the dogs' tint the ring's own, never warmer
  const tint = (name) => (g.match(new RegExp('vec3 ' + name + ' = mix\\(vec3\\(([^)]*)\\)')) || [])[1];
  assert.ok(tint('warm') && tint('warm') === tint('warmD'), `the dogs' tint (${tint('warmD')}) is not the ring's (${tint('warm')})`);
  // the veil is the stay's: about one moonlit stay in three, across the 16 openings and after the cut; the opening's stay by
  // the opening's seed (its baked still), a stay kept at the cut keeps its veil, and the uniform reads the moon's own stay
  assert.ok(WORLD.includes('gl.uniform4f(u.uHalo, MOON.E ? MOON.E.veil : 0, HALO_K, 0, 0);'), 'the halo\'s uniform does not read the veil of the stay whose moon is up');
  let lit = 0, all = 0, mixed = 0;
  for (let k = 0; k < 16; k++) {
    const seed0 = (11 + k * 0x9e3779b9) >>> 0, W = skyWorld(seed0, 'night', 0.5), W2 = skyWorld(seed0, 'night', 0.5);
    assert.equal(W.SKY.seq[0].veil, W2.SKY.seq[0].veil, `opening ${k}: its first stay's veil is not the opening seed's`);
    for (let j = 0; j < 40; j++) W.skyNext();
    const before = W.SKY.seq.map((e) => e.veil);
    W.SKY.i = 0; W.SKY.k = 0; W.skyReseed((seed0 * 2654435761 + 977) >>> 0);
    assert.equal(W.SKY.seq[0].veil, before[0], `opening ${k}: the stay on show changed its veil at the cut`);
    for (let j = 0; j < 40; j++) W.skyNext();
    const ms = W.SKY.seq.filter((e) => e.id === 'moonlit'), v = ms.reduce((a, e) => a + e.veil, 0);
    lit += v; all += ms.length; if (v > 0 && v < ms.length) mixed++;
  }
  assert.ok(lit / all >= 0.22 && lit / all <= 0.45, `the ice veil over ${lit} of ${all} moonlit stays (about one in three)`);
  assert.ok(mixed >= 12, `only ${mixed} of 16 visits have both veiled and clear moonlit stays (the veil is each stay's own)`);
});

// ------------------------------------------------------------------ the light ceiling's knee (night contrast A)
// fs-comp's own ceiling line, with 225's knee: never past the ceiling (W8), continuous and rising, and a highlight up to
// 0.06 under the ceiling passed as it is (the knee narrowed: a night keeps its highlights' contrast)
test('sky: the light ceiling keeps every pixel under it and passes highlights to within 0.06 of it', () => {
  const comp = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'fs-comp.glsl'), 'utf8');
  assert.ok(comp.includes('if (Lk > Kc) c *= pow((Kc + uCeil.y * (1.0 - exp(-(Lk - Kc) / uCeil.y))) / Lk, 3.0);'), 'fs-comp\'s light ceiling is not the line this test models');
  const knee = +WORLD.match(/var CEIL_KNEE = ([\d.]+),/)[1], ceil = 0.525, Kc = ceil - knee;
  const out = (L) => (L > Kc ? Kc + knee * (1 - Math.exp(-(L - Kc) / knee)) : L);
  let prev = 0;
  for (let L = 0; L <= 1.5; L += 0.0005) {
    const o = out(L);
    assert.ok(o <= ceil + 1e-12, `L ${L.toFixed(4)} leaves the ceiling at ${o} (W8: at most ${ceil})`);
    assert.ok(o >= prev - 1e-12 && o <= L + 1e-12, `the ceiling's curve at L ${L.toFixed(4)} goes back or brightens`);
    prev = o;
  }
  assert.ok(Math.abs(out(ceil - 0.06) - (ceil - 0.06)) < 1e-12, `a highlight 0.06 under the ceiling is changed (the knee ${knee}: at most 0.06)`);
});

// ------------------------------------------------------------------ the stars never glitter as they slide (stars-flux)
// sky-body.glsl's own starErf and starBox run here (their GLSL lines, made JS); a star at a random place between the pixel
// centres, its pixels each min(its share, the head) as the shader adds them: the light it puts on the screen is the
// same wherever it stands (within 2%), and no pixel passes the head, bright stars included
test('sky: a star\'s light on the screen is the same wherever it stands between pixels (no glitter)', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const fn = (name) => { const m = g.match(new RegExp('^float ' + name + '\\(([^)]*)\\) \\{(.*)\\}\\s*$', 'm')); assert.ok(m, name + ' not found as a one-line function in sky-body.glsl'); return m; };
  const js = (src) => src.replace(/\bfloat\s+/g, 'let ').replace(/\b(sign|sqrt|exp)\(/g, 'Math.$1(').replace(/(\d)\.(?!\d)/g, '$1.0');
  const E = fn('starErf'), B = fn('starBox');
  const starErf = new Function(E[1].replace(/float /g, ''), js(E[2]));
  const starBox = new Function('starErf', B[1].replace(/float /g, ''), js(B[2])).bind(null, starErf);
  const STF = +g.match(/const float STF = ([\d.]+);/)[1];
  assert.ok(g.includes('return F * starBox(d.x, sg) * starBox(d.y, sg);'), 'starAt does not integrate its bell over the pixel (starBox on both axes)');
  const PX = g.match(/^\s*vec2 d = gl_FragCoord\.xy - (.*);\s*$/m);
  assert.ok(PX, 'starAt does not measure the star from the pixel in screen pixels (vec2 d = gl_FragCoord.xy - ...)');
  assert.ok(g.includes('sg = clamp(sqrt(F / cp), 0.5, 0.7);') && g.includes('F = min(F, cp * sg * sg);'), 'starAt does not cap the star (at most 0.7 px wide, its flux cut to fit)');
  assert.ok(!/head \* \(1\.0 - exp\(-s/.test(g), 'the stars still go through the pixel\'s saturating cap');
  const shown = (b, head, ox, oy) => {   // the star's light on the screen, its pixels each capped as the shader caps them
    const cp = 2 * Math.PI * Math.max(head, 1e-5), sg = Math.min(Math.max(Math.sqrt(b * STF / cp), 0.5), 0.7), F = Math.min(b * STF, cp * sg * sg);
    let sum = 0, peak = 0, half = 0;
    for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) { const v = Math.min(F * starBox(x - ox, sg) * starBox(y - oy, sg), head); sum += v; peak = Math.max(peak, v); }
    for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) if (Math.min(F * starBox(x - ox, sg) * starBox(y - oy, sg), head) >= peak / 2) half++;
    return { sum, peak, half };
  };
  {   // the shader's own projection (its vec2 d line, made JS) on a tall window (393 x 852, 60 deg up): a star's pixel offset
    // is the true one at the centre and at the side (a step of one pixel moves it 1 +- 0.01 pixel), so the box is the footprint
    const V = (a, b, c) => [a, b, c], dotv = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], nrm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
    const uRes = [393, 852], ty = Math.tan(Math.PI / 6), uProj = [ty * 393 / 852, ty], uCamR = V(1, 0, 0), uCamU = V(0, 1, 0), uCamF = V(0, 0, 1);
    const expr = PX[1].replace(/vec2\(([^,]+), ([^)]*\))\) \* 0\.5 \+ 0\.5\) \* uRes/, '[($1) * 0.5 + 0.5, ($2) * 0.5 + 0.5]');
    const proj = (sd) => { const zf = Math.max(dotv(sd, uCamF), 1e-4); return [((dotv(sd, uCamR) / (zf * uProj[0])) * 0.5 + 0.5) * uRes[0], ((dotv(sd, uCamU) / (zf * uProj[1])) * 0.5 + 0.5) * uRes[1]]; };
    assert.ok(/zf \* uProj\.x/.test(PX[1]) && /zf \* uProj\.y/.test(PX[1]) && /\* uRes$/.test(PX[1].trim()), 'the star\'s screen place is not main\'s projection inverted (dot(sd, uCamR) / (zf * uProj.x) ... * uRes): ' + expr);
    const rdAt = (x, y) => nrm([uCamF[0] + uCamR[0] * (x / uRes[0] * 2 - 1) * uProj[0], uCamF[1] + uCamU[1] * (y / uRes[1] * 2 - 1) * uProj[1], 1]);
    for (const [x, y] of [[196.5, 426.5], [10.5, 840.5], [380.5, 20.5]]) {
      const a = proj(rdAt(x, y)), b = proj(rdAt(x + 1, y)), c = proj(rdAt(x, y + 1));
      assert.ok(Math.abs(a[0] - x) < 1e-6 && Math.abs(a[1] - y) < 1e-6, `the pixel (${x}, ${y})'s own direction projects to (${a})`);
      assert.ok(Math.abs(b[0] - a[0] - 1) < 0.01 && Math.abs(c[1] - a[1] - 1) < 0.01, `at (${x}, ${y}) a pixel's step is ${(b[0] - a[0]).toFixed(3)}, ${(c[1] - a[1]).toFixed(3)} pixels (1)`);
    }
  }
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (const b of [0.07, 0.3, 1.02]) for (const head of [0.02, 0.05, 0.09]) {
    let lo = Infinity, hi = 0;
    for (let k = 0; k < 64; k++) { const r = shown(b, head, rnd() - 0.5, rnd() - 0.5); lo = Math.min(lo, r.sum); hi = Math.max(hi, r.sum); assert.ok(r.peak <= head + 1e-9, `b ${b}, head ${head}: a pixel at ${r.peak} passes the head`);
      assert.ok(r.half <= 6, `b ${b}, head ${head}: ${r.half} pixels at half its peak (a point: at most 6)`); }
    assert.ok((hi - lo) / hi < 0.02, `b ${b}, head ${head}: the star's light swings ${(100 * (hi - lo) / hi).toFixed(1)}% as it slides (at most 2%)`);
  }
});

// ------------------------------------------------------------------ the night's bodies (delight-night §1 and §4)
// 215's skySphere (AIR's sphere: its season) and 227's starLim and venusDir run here as the page runs them, a fake order under them;
// the shader's own tint and Venus constants read from sky-body.glsl
const NIGHT = cut(WORLD, '  function airSunEl(id)', '\n', true) + cut(WORLD, "  /* THE SKY'S FRAME", '  var AIR_MOOND = ') + cut(WORLD, '  var STAR_LIM =', '  function venusFails(');
function nightWorld(seed, keyAz, seq) {
  return vm.runInThisContext('(function (SEED, KEYAZ, SEQ) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180, J = { seed: SEED }, AIR_SUN_NIGHT = -24, AIR_SUN_EL = { afterglow: -3, bluehour: -7, firstlight: -3 }, SUNU = { on: false }, SKY = { seq: SEQ, dt: 0 }, SKY_RATE = 100;\n' +
    '  var SIM = { t: 0, V: { seed: SEED, light: { sunAz: KEYAZ } } };\n  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function airSkySun(V, el) { return dirAzEl(V.light.sunAz, el); }\n' + STREAMS + VEC + NIGHT +
    '  return { skySphere: skySphere, starLim: starLim, venusDir: venusDir, venusFrame: venusFrame, venusEcl: venusEcl, V: SIM.V, VEN_EL: VEN_EL, VEN_TOP_Y: VEN_TOP_Y };\n})')(seed, keyAz, seq);
}
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const angD = (a, b) => Math.atan2(Math.hypot(...cross3(a, b)), dot3(a, b)) * 180 / Math.PI;
test('night: the evening star stands by the drawn sun (its elongation, on the ecliptic through it, east in the evening, west in the morning) and sets with it', () => {
  for (let s = 1; s <= 60; s++) for (const [morning, D0] of [[false, 3], [false, 7], [true, 3], [false, 24]]) {
    const keyAz = (s * 71) % 360, K = nightWorld(s * 2654435761 >>> 0, keyAz, []), F = K.venusFrame(K.V, morning, D0), side = morning ? -1 : 1, eps = K.VEN_EL[0] + (K.VEN_EL[1] - K.VEN_EL[0]) * ((s * 0.618) % 1);
    assert.ok(K.VEN_EL[1] <= 47 && K.VEN_EL[0] > 0, 'within 47 deg of the sun');
    const sun = (D) => [Math.sin(keyAz * Math.PI / 180) * Math.cos(-D * Math.PI / 180), Math.sin(-D * Math.PI / 180), Math.cos(keyAz * Math.PI / 180) * Math.cos(-D * Math.PI / 180)];
    assert.ok(Math.abs(Math.asin(F.P[1]) * 180 / Math.PI - 64) < 1e-9, 'the pole at AIR\'s latitude');
    const N = [F.P[0], 0, F.P[2]], E = cross3(N, [0, 1, 0]), S0 = sun(D0);
    assert.ok(side * dot3(S0, E) < 0, `seed ${s}: the drawn sun in the ${morning ? 'east' : 'west'}`);
    let prev = null;
    for (let D = Math.min(D0, 3); D <= 24; D += 0.5) {
      const v = K.venusDir(F, eps, side, D, D0, [0, 0, 0]), S = sun(D);
      assert.ok(Math.abs(angD(v, S) - eps) < 1e-6, `elongation ${angD(v, S)} (${eps})`);
      if (D === D0) {
        assert.ok(Math.abs(dot3(v, K.venusEcl(F, S0, [0, 0, 0]))) < 1e-9, 'on the ecliptic through the drawn sun at the opening\'s depth');
        assert.ok(side * dot3(v, cross3(F.P, S0)) > 0, `seed ${s}: ${morning ? 'west' : 'east'} of the sun on the sky`);
      }
      if (D0 <= 7 && D <= 7) assert.ok(v[1] > S[1], `seed ${s}: above the sun in its own twilight`);
      if (prev && v[1] > -0.3 && D > D0) { assert.ok(v[1] < prev[1] + 1e-12, `seed ${s}: it sinks as the sun does (D ${D})`); assert.ok(angD(v, prev) < 0.5 + 1e-9, `seed ${s}: no jump`); }
      prev = v;
    }
  }
});
// (the hub's ruling, Nov 24 20:28: Venus by the glow) the page's own walk through holds and changes: 222's skyArc and
// 223's skySun move the drawn sun as the page moves it (uSkyS), 227's skyDepth reads its depth, venusDir places Venus;
// its angle from the drawn sun (the glow's: uSkyS in a twilight, the sun sunk on the key's azimuth at night) stays its
// elongation in every hold and through every change, and it never jumps
const SUNWALK = cut(WORLD, '  function skyArc(', '\n  }\n', true) + cut(WORLD, '  var SUN_BAND = ', '  function skyEndCol(') + cut(WORLD, '  function skySun(V, w, L) {', '\n  }\n', true);
test('night: Venus keeps its elongation from the drawn sun through every hold and change (by the glow)', () => {
  const src = '(function (SEED, KEYAZ) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180, J = { seed: SEED }, AIR_SUN_NIGHT = -24, AIR_SUN_EL = { afterglow: -3, bluehour: -7, firstlight: -3 }, SKY_RATE = 100, DEVMODE = false, MOONF = { sunOff: false };\n' +
    '  var SKY = { seq: [], dt: 0, skyS: new Float32Array(3), fx: new Float32Array(8), far: false, half: 0, q: 0, A: null, B: null, k: 0 };\n' +
    '  var SIM = { t: 0, V: { seed: SEED, light: { sunAz: KEYAZ } } }, KEY = [0.3, 0.8, 0.52];\n  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function ss01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }\n' +
    '  function keyAt() { return KEY; }\n  function skyEndCol(O, k, w, out) { return out; }\n  function skyEndNum(O, k, w, out) { return out; }\n  function airSkySun(V, el) { return el === null ? KEY.slice() : dirAzEl(V.light.sunAz, el); }\n' +
    STREAMS + VEC + NIGHT + SUNWALK +
    '  function sky(el) { return { skyEl: el, dir: airSkySun(SIM.V, el), fx: [0, 0] }; }\n' +
    '  function at(A, B, k) { SKY.A = A; SKY.B = B; SKY.k = k; var L = {}; if (B) skyArc(A.dir, B.dir, k, SKY.skyS); else for (var i = 0; i < 3; i++) SKY.skyS[i] = A.dir[i]; skySun(SIM.V, 0, L); return skyDepth(); }\n' +
    '  return { at: at, sky: sky, SKY: SKY, SUNU: SUNU, venusDir: venusDir, venusFrame: venusFrame, V: SIM.V, VEN_EL: VEN_EL };\n})';
  const orders = [[-3, -7, null, null], [-7, null, null], [-3, null], [null, null, -7]];   // (afterglow, blue hour, the nights; a night into the blue hour: the sun rising back, the reverse change)
  let n = 0;
  for (let s = 1; s <= 24; s++) for (const ord of orders) {
    const keyAz = (s * 53) % 360, K = vm.runInThisContext(src)(s * 2654435761 >>> 0, keyAz), skies = ord.map((e) => K.sky(e));
    const D0 = ord[0] === null ? 24 : -ord[0], F = K.venusFrame(K.V, false, D0), eps = K.VEN_EL[0] + (K.VEN_EL[1] - K.VEN_EL[0]) * ((s * 0.618) % 1);
    const drawn = (D) => (K.SKY.A.skyEl === null && (!K.SKY.B || K.SKY.B.skyEl === null)) ? [Math.sin(keyAz * Math.PI / 180) * Math.cos(-D * Math.PI / 180), Math.sin(-D * Math.PI / 180), Math.cos(keyAz * Math.PI / 180) * Math.cos(-D * Math.PI / 180)] : Array.from(K.SKY.skyS);   // (a night's own uSkyS is the key, not a sun: the sun sunk to its depth)
    let prev = null;
    const step = (A, B, k) => {
      const D = K.at(A, B, k), v = K.venusDir(F, eps, 1, D, D0, [0, 0, 0]), S = drawn(D);
      assert.ok(Math.abs(angD(v, S) - eps) < 0.1, `seed ${s}, order ${ord}, k ${k}: ${angD(v, S).toFixed(3)} deg from the drawn sun (its elongation ${eps.toFixed(3)})`);
      if (prev) assert.ok(angD(v, prev) < 0.6, `seed ${s}, order ${ord}, k ${k}: Venus jumps ${angD(v, prev).toFixed(2)} deg`);
      prev = v; n++;
    };
    for (let i = 0; i < skies.length; i++) {
      for (let h = 0; h < 4; h++) step(skies[i], null, 0);   // (a hold: it stands still)
      if (i + 1 < skies.length) for (let k = 0.005; k < 1; k += 0.005) step(skies[i], skies[i + 1], k);
    }
  }
  assert.ok(n > 5000, `${n} steps`);
});
test('night: the stars come out by the sun\'s depth, brightest first; their colours never move their light; Venus under L 0.50', () => {
  const K = nightWorld(1, 0, []), g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  for (let D = 0; D < 30; D += 0.25) assert.ok(K.starLim(D + 0.25) >= K.starLim(D), 'the limit only deepens with the sun');
  assert.ok(K.starLim(3) < 1.5 && K.starLim(6) >= 0.9 && K.starLim(6) <= 1.5 && Math.abs(K.starLim(12) - 4.5) < 1e-9 && K.starLim(18) >= 6, 'civil, nautical, astronomical');
  assert.ok(g.includes('float starMag(float b) { return 6.2 - 4.0 * log(b / 0.07) / log(10.0); }'), 'starMag');
  const mag = (b) => 6.2 - 4.0 * Math.log10(b / 0.07);
  assert.ok(mag(1.02) < mag(0.3) && mag(0.3) < mag(0.07), 'brightest first');
  assert.ok(g.includes('float bk = nightShow(starMag(b) + sx, ml);') && g.includes('float nightShow(float m, float ml) { return clamp((ml - m) / 0.5, 0.0, 1.0); }') && g.includes('float ml = nightLim(c - gL) + moonLim(rd);') && g.includes('b *= bk;'), 'each star by its own margin under the limit (the shared nightLim and nightShow)');
  assert.ok(!/uSunD\.z \* \(/.test(g) && /, sk = uSunD\.z \* smoothstep/.test(g), 'the amount is only the stars\' on/off');
  const stars = [...WORLD.matchAll(/post:\{[^}]*stars:([\d.]+)/g)].map((m) => +m[1]);
  assert.equal(stars.length, 6); assert.ok(stars.every((x) => x === 1), `every sky's stars' amount is 1 (no blend between skies): ${stars}`);
  const lab = (c) => { const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]), m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]), s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]); return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]; };
  const Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], W = [0.92 / 0.94, 1, 1 / 0.94];
  const T = g.match(/^vec3 starTint[\s\S]*?^}/m)[0], cols = [...T.matchAll(/vec3\(([\d.]+), ([\d.]+), ([\d.]+)\)/g)].map((m) => [+m[1], +m[2], +m[3]]).filter((c) => c[0] !== 0.92);
  assert.equal(cols.length, 4);
  for (const c of cols) { const L = lab(c); assert.ok(Math.abs(Y(c) - Y(W)) < 2e-3, `tint ${c}: Y ${Y(c)}`); assert.ok(Math.abs(L[0] - lab(W)[0]) < 5e-3, `tint ${c}: L ${L[0]}`); assert.ok(Math.hypot(L[1], L[2]) <= 0.0505, `tint ${c}: pastel (C ${Math.hypot(L[1], L[2]).toFixed(4)}, at most 0.05: delight-night §4)`); }
  assert.ok(g.includes('  return extTint(col, airmass(sd.y)) * min(v, hv) * (1.0 - hazeSky(rd));'), 'a planet\'s light capped at its head, a little redder low down (extTint), never dimmed under its head');
  // (physics: night/extinction, the hub's review of #455) the planets' true magnitudes, the air's k (X - 1) taken from
  // them: still over the brightest star's (Sirius, -1.46, overhead) at every height from 2 deg, so each stays at its
  // head; and their heads over the stars' top, so in any frame either outshines every star
  const am = (y) => { const h = Math.max(Math.asin(Math.min(Math.max(y, 0), 1)) * 180 / Math.PI, 0); return 1 / (Math.sin(h * Math.PI / 180) + 0.50572 * Math.pow(h + 6.07995, -1.6364)); };
  const EXT = +/const float EXT_V = ([\d.]+);/.exec(g)[1], lost = (deg) => EXT * Math.max(am(Math.sin(deg * Math.PI / 180)) - 1, 0);
  for (let deg = 2; deg <= 90; deg += 1) {
    assert.ok(-4.4 + lost(deg) < -1.46, `Venus at ${deg} deg: ${(-4.4 + lost(deg)).toFixed(2)} mag through the air, not over the brightest star overhead`);
    assert.ok(-2.4 + lost(deg) < -1.46 + lost(deg), 'the outer planet over the brightest star at its own height');   // (under 8 deg up it falls under a star overhead: held at its head there, a little bright, as Venus is not)
  }
  const STOP = +/STAR_TOP_Y = ([\d.]+)/.exec(WORLD)[1];
  assert.ok(K.VEN_TOP_Y > STOP && +WORLD.match(/JUP_TOP_Y = ([\d.]+);/)[1] > STOP, 'a planet\'s top under the stars\'');
  const vc = g.match(/planetAt\(rd, c, uVen\.xyz, uStarM\.z, -4\.4, vec3\(([\d.]+), ([\d.]+), ([\d.]+)\)\)/); assert.ok(vc, 'Venus\'s colour and top');
  const V = [+vc[1], +vc[2], +vc[3]]; assert.ok(Math.abs(Y(V) - 1) < 2e-3, 'Venus\'s colour at Y 1');
  for (const bg of [[0, 0, 0], [0.01, 0.012, 0.03], [0.05, 0.06, 0.1]]) { const hv = Math.max(K.VEN_TOP_Y - Y(bg), 0), top = bg.map((x, i) => x + V[i] * hv); assert.ok(lab(top)[0] <= 0.5, `Venus over ${bg}: L ${lab(top)[0]}`); }
  // the bright outer planet: its own colour at Y 1, pastel; its peak under Venus's and under L 0.475 over any night sky
  const jc = g.match(/planetAt\(rd, c, uJup\.xyz, uJup\.w, -2\.4, vec3\(([\d.]+), ([\d.]+), ([\d.]+)\)\)/); assert.ok(jc, 'the outer planet\'s colour, its top uJup.w');
  const JC = [+jc[1], +jc[2], +jc[3]], JT = +WORLD.match(/JUP_TOP_Y = ([\d.]+);/)[1], jl = lab(JC);
  assert.ok(Math.abs(Y(JC) - 1) < 2e-3 && Math.hypot(jl[1], jl[2]) <= 0.05, `the outer planet's colour at Y 1 (${Y(JC).toFixed(4)}), pastel (C ${Math.hypot(jl[1], jl[2]).toFixed(4)})`);
  assert.ok(JT < K.VEN_TOP_Y, 'the outer planet under Venus');
  for (const bg of [[0, 0, 0], [0.01, 0.012, 0.03], [0.05, 0.06, 0.1]]) { const hv = Math.max(JT - Y(bg), 0), top = bg.map((x, i) => x + JC[i] * hv); assert.ok(lab(top)[0] <= 0.475, `the outer planet over ${bg}: L ${lab(top)[0]}`); }
});
test('night: the evening star never glitters as it slides between pixels (its light the same within 2%)', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const fn = (name) => g.match(new RegExp('^float ' + name + '\\(([^)]*)\\) \\{(.*)\\}\\s*$', 'm'));
  const js = (src) => src.replace(/\bfloat\s+/g, 'let ').replace(/\b(sign|sqrt|exp)\(/g, 'Math.$1(').replace(/(\d)\.(?!\d)/g, '$1.0');
  const E = fn('starErf'), B = fn('starBox'), starErf = new Function(E[1].replace(/float /g, ''), js(E[2])), starBox = new Function('starErf', B[1].replace(/float /g, ''), js(B[2])).bind(null, starErf);
  const V = g.match(/^vec3 planetAt[\s\S]*?^}/m)[0];
  assert.ok(V.includes('sg = clamp(sqrt(E / max(1.1 * SKYTAU * hv, 1e-6)), 0.85, 1.4), F = min(E, 1.1 * SKYTAU * hv * sg * sg);') && V.includes('float v = F * starBox(d.x, sg) * starBox(d.y, sg) + 0.13 * hv * exp(-length(d) / 3.6);') && V.includes('min(v, hv)') && !/uT\b/.test(V), 'venusAt: its core, glow and cap as measured here, and no clock (steady)');
  let seed = 3; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (const sg of [0.85, 1.4]) for (const hv of [0.02, 0.05, 0.1]) {
    let lo = Infinity, hi = 0;
    for (let k = 0; k < 64; k++) {
      const ox = rnd() - 0.5, oy = rnd() - 0.5, F = 1.1 * 2 * Math.PI * hv * sg * sg; let sum = 0, peak = 0;
      for (let y = -20; y <= 20; y++) for (let x = -20; x <= 20; x++) { const dx = x - ox, dy = y - oy; if (dx * dx + dy * dy > 400) continue; const v = Math.min(F * starBox(dx, sg) * starBox(dy, sg) + 0.13 * hv * Math.exp(-Math.hypot(dx, dy) / 3.6), hv); sum += v; peak = Math.max(peak, v); }
      lo = Math.min(lo, sum); hi = Math.max(hi, sum); assert.ok(peak <= hv + 1e-12);
    }
    assert.ok((hi - lo) / hi < 0.02, `sigma ${sg}, head ${hv}: its light swings ${(100 * (hi - lo) / hi).toFixed(2)}% as it slides`);
  }
});

// the stars out in order (delight-night §4, the hub's review of #301): over a change from the blue hour into a night
// (the sun from 7 to 24 deg down on the change's own ease, 58 s), each star's first frame of light against its
// brightness ranks them brightest first (rank correlation >= 0.9, the sky's light by place included: brighter toward the
// glow), and no star's share changes by more than 2% in a frame at 60 Hz; no Venus on a visit with no clear path
test('night: the stars come out brightest first (rank correlation >= 0.9) and never change more than 2% a frame', () => {
  const K = nightWorld(1, 0, []), g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const NL = g.match(/^float nightLim\(vec3 c\) \{ float y = max\(dot\(c, LUMA\), 1e-4\); return (.*); \}$/m);
  assert.ok(NL, 'nightLim as measured here');
  const nightLim = (y, zx, zy, w) => Math.min(zx - w * 2.5 * Math.log10(Math.max(y / Math.max(zy, 1e-4), 1)), 7.9 - w * 2.5 * Math.log10(Math.max(y / 0.016, 1)));
  assert.ok(NL[1] === 'min(uStarM.x - uStarM.w * 2.5 * log(max(y / max(uStarM.y, 1e-4), 1.0)) / log(10.0), 7.9 - uStarM.w * 2.5 * log(max(y / 0.016, 1.0)) / log(10.0))', 'nightLim\'s own line: ' + NL[1]);
  const N0 = fs.readFileSync(path.join(ROOT, 'src', 'world', '227-night-bodies.js'), 'utf8');
  assert.ok(N0.includes('NIGHTB.m[3] = 1 - smooth(15, 18, D);'), 'the sky light\'s weight: 1 in a twilight, 0 from 18 deg down');
  const wD = (D) => { const t = Math.min(Math.max((D - 15) / 3, 0), 1); return 1 - t * t * (3 - 2 * t); };
  const mag = (b) => 6.2 - 4.0 * Math.log10(b / 0.07), show = (m, ml) => Math.min(Math.max((ml - m) / 0.5, 0), 1);
  let seed = 11; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const stars = []; for (let i = 0; i < 400; i++) { const b = Math.pow(rnd(), 6) * 0.95 + 0.07, glow = rnd(); stars.push({ b, glow, first: Infinity }); }   // (glow: 0 the zenith's light, 1 three times it near the glow)
  const ss = (x) => x * x * (3 - 2 * x), zy = 0.02; let worst = 0;
  const prev = stars.map(() => 0);
  for (let f = 0; f <= 58 * 60; f++) {
    const D = 7 + 17 * ss(f / (58 * 60)), zx = K.starLim(D);
    stars.forEach((st, i) => { const v = show(mag(st.b), nightLim(zy * (1 + 2 * st.glow), zx, zy, wD(D))); if (v > 0 && st.first === Infinity) st.first = f; worst = Math.max(worst, Math.abs(v - prev[i])); prev[i] = v; });
  }
  const out = stars.filter((st) => st.first < Infinity);
  assert.equal(out.length, stars.length, `${out.length} of ${stars.length} stars out by the night`);
  // (the hub's round-9 review of #333: a Milky Way night lost 150 of its 272 star points) at the night's 24 deg every star of
  // the field (to mag 6.2) shows whole wherever it stands: on a sky up to 3x the zenith's light, on the band (the galaxy's
  // light is not nightLim's sky: c - gL), whatever the zenith's own light
  assert.ok(g.includes('{ gL = galaxyAt(uSkyF * rd, eS) * hzT; c += gL; }') && g.includes('vec3 gL = vec3(0.0);'), 'the galaxy\'s light held apart from nightLim\'s sky');
  for (const zy0 of [0.002, 0.008, 0.02, 0.05]) for (const k of [1, 1.5, 2, 3]) for (const b of [0.07, 0.1, 0.3, 1]) {
    const v = show(mag(b), nightLim(zy0 * k, K.starLim(24), zy0, wD(24)));
    assert.equal(v, 1, `at D 24, a mag ${mag(b).toFixed(2)} star on a sky ${k}x a zenith of Y ${zy0}: shown ${v.toFixed(2)}, not whole`);
  }
  assert.ok(wD(12) === 1 && wD(15) === 1 && wD(18) === 0 && wD(24) === 0, 'the weight: whole in a twilight, gone at night');
  const rank = (a) => { const o = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length); o.forEach(([, i], k) => { r[i] = k; }); return r; };
  const ra = rank(out.map((st) => st.first)), rb = rank(out.map((st) => -st.b)), n = out.length;
  let d2 = 0; for (let i = 0; i < n; i++) d2 += (ra[i] - rb[i]) ** 2;
  const rho = 1 - 6 * d2 / (n * (n * n - 1));
  assert.ok(rho >= 0.9, `the rank correlation ${rho.toFixed(3)} (at least 0.9)`);
  assert.ok(worst <= 0.02, `a star's share changes ${(100 * worst).toFixed(2)}% in a frame (at most 2%)`);
  const N = fs.readFileSync(path.join(ROOT, 'src', 'world', '227-night-bodies.js'), 'utf8');
  assert.ok(N.includes('NIGHTB.none = NIGHTB.eps < 0;') && N.includes('if (venusFails(I, F, e, side, D0) || (I2 && venusFails(I2, F, e, side, D0))) continue;') && N.includes('JUPB.eps = bodyPick(RJ, JUP_EL, JUPB.side, F, D0, I, I2)[0];') && N.includes('JUPB.seed === J.seed && JUPB.eps >= 0') && N.includes('NIGHTB.seed === J.seed && !NIGHTB.none'), 'no clear path down: no Venus');
  console.log(`# stars out in order: rank correlation ${rho.toFixed(3)}, the fastest change ${(100 * worst).toFixed(2)}% a frame`);
});
// the evening star's plan on the still's own window (the hub's round-3 review of #301): 227's venusPlan and venusFails
// and 225's camera run here as the page runs them, on the lo phone still's window and its words' boxes (226's
// STILL_WORDS); the path the plan keeps is walked again here, apart from venusFails: nothing of it on a box (grown by
// the keep and its glow); a window all words has no Venus
const VPLAN = cut(WORLD, '  var MRD = Math.PI', '  function mrSamples(') + cut(WORLD, '  var STAR_LIM =', "  /* (the hub's round-3 review of #301) planned");
let VENUS_FACTORY = null;   // (compiled once: each call still builds its own world, its state fresh)
function venusWorld(seed, keyAz, landing) {
  if (!VENUS_FACTORY) VENUS_FACTORY = vm.runInThisContext('(function (SEED, KEYAZ, LANDING) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180, J = { seed: SEED }, AIR_SUN_NIGHT = -24, AIR_SUN_EL = { afterglow: -3, bluehour: -7, firstlight: -3 }, SUNU = { on: false }, SKY = { seq: [], dt: 0, landing: LANDING }, SKY_RATE = 100, MOON_KEEP = 12;\n' +
    '  var SIM = { t: 0, V: { seed: SEED, light: { sunAz: KEYAZ } } };\n  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function airSkySun(V, el) { return dirAzEl(V.light.sunAz, el); }\n  function airSunEl(id) { var e = AIR_SUN_EL[id]; return e === undefined ? null : e; }\n' + STREAMS + VEC + cut(WORLD, '  function airSunEl(id)', '\n', true).replace(/function airSunEl\(id\)/, 'function airSunEl0(id)') + cut(WORLD, "  /* THE SKY'S FRAME", '  var AIR_MOOND = ') + VPLAN +
    '  return { venusPlan: venusPlan, venusDir: venusDir, venusFrame: venusFrame, mrCam: mrCam, mrProj: mrProj, NIGHTB: NIGHTB, JUPB: JUPB, V: SIM.V, VEN_GLOW: VEN_GLOW, COMB: COMB, cometDir: cometDir, cometTail: cometTail, cometOn: cometOn, COM_L: COM_L, airSkySun: airSkySun };\n})');
  return VENUS_FACTORY(seed, keyAz, landing);
}
test('night: the evening star\'s plan on the lo still\'s window keeps its whole path down off the words; a window all words has none', () => {
  const SW = JSON.parse(/var STILL_WORDS = (\{.*?\});/.exec(WORLD)[1]), boxes = SW['lo-393x861'];
  assert.ok(boxes && boxes.length === 5, 'the lo phone still\'s boxes');
  const tanY = Math.tan(32 * Math.PI / 180), win = (bx) => ({ W: 393, H: 861, tanY, tanX: tanY * 393 / 861, pN: 8, pL: 8, keepPx: 12, boxes: bx });
  let planned = 0, onWords = 0;
  for (let s = 1; s <= 80; s++) for (const sky of ['afterglow', 'bluehour', 'firstlight']) {
    const keyAz = (s * 53) % 360, K = venusWorld(s * 2654435761 >>> 0, keyAz, { sky });
    const I = Object.assign(win(boxes), { psi: keyAz + (sky === 'firstlight' ? 1 : -1) * (10 + (s * 7) % 40) });
    assert.ok(K.venusPlan(K.V, I));
    if (K.NIGHTB.none) continue;
    planned++;
    const N = K.NIGHTB, F = K.venusFrame(K.V, N.morning, N.D0), C = K.mrCam(I.psi, I.pN), grow = 12 + K.VEN_GLOW;
    for (let D = N.D0; D <= 24 + 1e-9; D += 0.5) {
      const d = K.venusDir(F, N.eps, N.side, D, N.D0, [0, 0, 0]); if (d[1] <= 0) break;
      const q = K.mrProj(C, I, d); if (q[2] <= 0 || Math.abs(q[0]) > 1.05 || Math.abs(q[1]) > 1.05) continue;
      const x = (q[0] + 1) / 2 * I.W, y = (1 - q[1]) / 2 * I.H;
      if (boxes.some((B) => x > B[0] - grow && x < B[2] + grow && y > B[1] - grow && y < B[3] + grow)) { onWords++; break; }
    }
    const A = venusWorld(s * 2654435761 >>> 0, keyAz, { sky });
    const T80 = Math.tan(80 * Math.PI / 180);   // (a window toward the sun wide enough to hold every place of every try: each one's path crosses the words)
    assert.ok(A.venusPlan(A.V, Object.assign(win([[-1000, -1000, 2000, 2000]]), { psi: keyAz, pN: 0, tanX: T80, tanY: T80 })) && A.NIGHTB.none, `seed ${s} ${sky}: a window all words still has an evening star`);
  }
  assert.ok(planned > 60, `${planned} of 240 visits with an evening star (the test is not empty)`);
  assert.equal(onWords, 0, `${onWords} planned paths cross the words`);
});
// the evening star on each band's smallest window (the hub's round-4 and round-5 reviews: on 1024x768 under the
// 1350x1080 still it stood on the name; at 1280x800@2 its glow touched the credit): planned as the page plans it, in
// the part of the still every window of its band shows (226's stillFrame: its keep the smallest window's, scaled)
// against 226's STILL_WORDS, then its whole path down walked in the smallest window, as the still is shown there at
// the cut (cover) and in that window's own view (226's stillView), against that window's own boxes
// (test/golden/still-words.json): no place of it within the keep and its glow (12 + VEN_GLOW px) of a word
test('night: the evening star, the outer planet and their glow keep off the words on each band\'s smallest window', () => {
  const SF = vm.runInThisContext('(function () { var DEG = Math.PI / 180, CAMUP = ' + /var CAMUP = ([\d.]+);/.exec(WORLD)[1] + ', FOV_LONG = ' + /var FOV_LONG = ([\d.]+);/.exec(WORLD)[1] + ', MOON_KEEP = ' + /MOON_KEEP = ([\d.]+)/.exec(WORLD)[1] +
    '; function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); } function lerp(a, b, t) { return a + (b - a) * t; }\n' +
    cut(WORLD, '  function frustumFor(', '  function setFrustum(') + cut(WORLD, '  var STILL_MIN = ', '  function stillInputs(') + ' return { stillFrame, stillView }; })')();
  const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'golden', 'still-words.json'), 'utf8'));
  let planned = 0, plannedJ = 0, onWords = 0, nearest = Infinity; const where = [];
  for (const key of Object.keys(G)) {
    const [tier, sh] = key.split('-'), [w0, h0] = sh.split('x').map(Number), Fr = SF.stillFrame(tier, w0, h0, [0.4, 0.6]), [sw, shh] = G[key].min, small = G[key].small;
    const c = Math.max(sw / Fr.bw, shh / Fr.bh), vS = SF.stillView(Fr.bw, Fr.bh, [0.4, 0.6], {}), vL = SF.stillView(sw, shh, [0.4, 0.6], {});
    const views = [['at the cut', { W: sw, H: shh, tanX: vS.tanX * (sw / c) / Fr.bw, tanY: vS.tanY * (shh / c) / Fr.bh }, Fr.pN], ['in its own view', { W: sw, H: shh, tanX: vL.tanX, tanY: vL.tanY }, vL.pN]];
    for (let s = 1; s <= 6; s++) for (const sky of ['afterglow', 'bluehour', 'firstlight', 'night']) for (const off of [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 100, 150, 180]) {   // (headings across the glow: the evening star anywhere over the words; and away from it, the outer planet's half; a night opening: the sun at 24 deg)
      const keyAz = (s * 53) % 360, K = venusWorld(s * 2654435761 >>> 0, keyAz, { sky }), psi = keyAz + (sky === 'firstlight' ? 1 : -1) * 30 + off, grow = 12 + K.VEN_GLOW;
      const I = { W: Fr.W, H: Fr.H, tanX: Fr.tanX, tanY: Fr.tanY, pN: Fr.pN, pL: Fr.pN, keepPx: Fr.keepPx, boxes: Fr.boxes.map((b) => b.slice()), psi };
      const I2 = { W: sw, H: shh, tanX: vL.tanX, tanY: vL.tanY, pN: vL.pN, pL: vL.pN, keepPx: 12, boxes: small.map((b) => b.slice()), psi };   // (the live window's own view and words: the night after the cut)
      assert.ok(K.venusPlan(K.V, I, I2));
      const N = K.NIGHTB, F = K.venusFrame(K.V, N.morning, N.D0), bodies = [];
      if (!N.none) { bodies.push([N.eps, N.side, 'Venus']); planned++; }
      if (K.JUPB.eps >= 0) { bodies.push([K.JUPB.eps, K.JUPB.side, 'the outer planet']); plannedJ++; }
      for (const [eps, side, who] of bodies) for (const [view, Lw, pN] of views) {
        const C = K.mrCam(psi, pN);
        for (let D = N.D0; D <= 24 + 1e-9; D += 0.5) {
          const d = K.venusDir(F, eps, side, D, N.D0, [0, 0, 0]); if (d[1] <= 0) break;
          const q = K.mrProj(C, Lw, d); if (q[2] <= 0 || Math.abs(q[0]) > 1 || Math.abs(q[1]) > 1) continue;
          const x = (q[0] + 1) / 2 * sw, y = (1 - q[1]) / 2 * shh;
          for (const B of small) nearest = Math.min(nearest, Math.hypot(Math.max(B[0] - x, 0, x - B[2]), Math.max(B[1] - y, 0, y - B[3])));
          if (small.some((B) => x > B[0] - grow && x < B[2] + grow && y > B[1] - grow && y < B[3] + grow)) { onWords++; where.push(`${who}: ${key} at ${sw}x${shh} ${view}, seed ${s} ${sky} heading ${psi}, D ${D}`); break; }
        }
      }
    }
  }
  assert.ok(planned > 150 && plannedJ > 300, `${planned} evening stars and ${plannedJ} outer planets planned (the test is not empty)`);
  assert.equal(onWords, 0, `paths within the keep and glow of the words in the smallest windows: ${where.slice(0, 6).join('; ')}`);
  console.log(`# evening star and outer planet on the bands' smallest windows: ${planned} and ${plannedJ} planned, none within 12 + glow px of a word (the nearest ${nearest.toFixed(1)} px)`);
});
// ------------------------------------------------------------------ the sky's lights behind its haze (aurora-haze)
// the galaxy and the aurora are behind the haze, as the moon is: each term scaled by what the haze lets through
test('sky: the galaxy and the aurora are seen through the haze (1 - hazeSky), never over it', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const m = g.match(/float (\w+) = 1\.0 - hazeSky\(rd\);\s*vec3 (\w+) = \1 \*/);
  assert.ok(m, 'the haze\'s transmittance (1.0 - hazeSky(rd)) and its tint are not worked out before the galaxy and the aurora');
  for (const f of ['galaxyAt', 'auroraAt']) {
    const uses = g.split('\n').filter((l) => l.includes('c += ' + f + '(') || l.includes('= ' + f + '(rd') || l.includes('= ' + f + '(uSkyF * rd'));   // (the galaxy by way of gL, its light held apart for nightLim)
    assert.ok(uses.length >= 1, f + ' is not added to the sky');
    for (const l of uses) assert.ok(l.includes(f + '(rd, eS) * ' + m[2]) || l.includes(f + '(uSkyF * rd, eS) * ' + m[2]), f + ' is added without the haze over it: ' + l.trim());
  }
});

test('physics: night/sky-turn: the stars stand where the sky\'s frame puts them (projected by their world direction)', () => {
  // starAt places a star at sd in the sky's frame; the screen needs its world direction: sw = sd * uSkyF (uSkyF world to
  // frame, so its transpose back). Under a frame turned well away from the identity, a star set at the frame direction
  // of a pixel's own ray must land on that pixel (0 px off); read through sd itself it would land elsewhere
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  assert.ok(g.includes('vec3 sw = sd * uSkyF;') && g.includes('float zf = max(dot(sw, uCamF), 1e-4);') && g.includes('vec2(dot(sw, uCamR) / (zf * uProj.x), dot(sw, uCamU) / (zf * uProj.y))'), 'the star is projected by its frame direction, not its world one');
  const rot = (ax, a) => { const [x, y, z] = ax, c = Math.cos(a), s = Math.sin(a), C = 1 - c; return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C]; };
  const n = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const M = rot(n([0.3, 0.8, -0.5]), 1.9);   // world to frame, row-major: frame = M w
  const mul = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
  const rowMul = (v, A) => [v[0] * A[0] + v[1] * A[3] + v[2] * A[6], v[0] * A[1] + v[1] * A[4] + v[2] * A[7], v[0] * A[2] + v[1] * A[5] + v[2] * A[8]];   // GLSL v * m
  const F = [0, 0, 1], R = [1, 0, 0], U = [0, 1, 0], P = [Math.tan(0.6), Math.tan(0.4)], W = [1440, 900];
  const px = (w) => { const z = w[0] * F[0] + w[1] * F[1] + w[2] * F[2]; return [((w[0] / (z * P[0])) * 0.5 + 0.5) * W[0], ((w[1] / (z * P[1])) * 0.5 + 0.5) * W[1]]; };
  for (const w of [n([0.1, 0.3, 1]), n([-0.4, 0.2, 1]), n([0.2, -0.1, 1])]) {
    const sd = mul(M, w), sw = rowMul(sd, M), a = px(w), b = px(sw), bad = px(sd);
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6, `a star at the pixel's own sky direction lands ${Math.hypot(a[0] - b[0], a[1] - b[1]).toFixed(3)} px off`);
    assert.ok(Math.hypot(a[0] - bad[0], a[1] - bad[1]) > 50 || sd[2] <= 0, 'the test frame is too near the identity to tell the two apart');
  }
});

test('physics: night/sky-turn: the galaxy comes and goes by place, at most 0.3 deg/s, nothing while its rise is 0 (no fades)', () => {
  // 222's own skyGal over a stay (its hold and changes at their shortest and longest), run here: the rise 0 outside the
  // stay, 1 at the hold's middle, straight; the shader's edge (GAL_E + 1.5 deg over the rise) never faster than 0.3 deg/s;
  // and the shader draws nothing at rise 0 (galVis 0, the galaxy's draw and the stars' crowding both gated on it)
  const fn = cut(WORLD, '  var GAL_IN = ', '\n  }\n', true), clamp = (x, a, b) => Math.min(Math.max(x, a), b);
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8'), E = +g.match(/const float GAL_E = ([\d.]+);/)[1];
  const WS = { moonlit: { fx: {} }, milkyway: { fx: { galaxy: 1 } }, aurora: { fx: { aurora: 1 } } };
  for (const [hold, move] of [[85.5, 55], [115, 60]]) {
    const seq = [{ id: 'moonlit', at: 0, hold: 190, move: 57 }, { id: 'milkyway', at: 247, hold, move }, { id: 'aurora', at: 247 + hold + move, hold: 100, move: 55 }, { id: 'moonlit', at: 1e4, hold: 190, move: 57 }];
    const SKY = { seq, i: 0, galRise: 0 };
    const skyGal = new Function('SKY', 'WSKY', 'clamp', fn + '\nreturn skyGal;')(SKY, WS, clamp);
    const t0 = 190, t1 = 247 + hold + move; let last = null, top = 0;
    for (let t = 150; t <= t1 + 40; t += 0.25) {
      SKY.i = t < 247 ? 0 : t < t1 ? 1 : 2; skyGal(t);
      const r = SKY.galRise, e = -1.5 + (E + 1.5) * r;
      assert.ok(r >= 0 && r <= 1, `t ${t}: rise ${r}`);
      if (t <= t0 || t >= t1) assert.equal(r, 0, `t ${t}: the galaxy stands (rise ${r}) outside its stay`);
      if (last !== null && r > 0 && last.r > 0) assert.ok(Math.abs(e - last.e) / 0.25 <= 0.3 + 1e-9, `hold ${hold}: at t ${t} the galaxy's edge moves ${(Math.abs(e - last.e) / 0.25).toFixed(3)} deg/s (at most 0.3)`);
      top = Math.max(top, r); last = { r, e };
    }
    assert.equal(top, 1, `hold ${hold}: the galaxy never comes in whole (its rise peaks at ${top})`);
  }
  // the edge opens from the midline: at rise 0 the drawn set is empty (e + 1.5 <= 0, the soft edge's far side at or under
  // |b| 0), and at rise 1 M31 (|b| 21.6, 0.75 deg tall) and the band's crowding stars (to |b| 22) lie inside E - 1.5
  { const e0 = -1.5 + (E + 1.5) * 0; assert.ok(e0 + 1.5 <= 0, `the galaxy is drawn out to |b| ${(e0 + 1.5).toFixed(2)} at rise 0 (a pop as the rise leaves 0)`); }
  assert.ok(21.6 + 0.75 <= E - 1.5 && 22 <= E - 1.5, `at rise 1 the galaxy is not whole: M31 or the crowding beyond the edge (E ${E})`);
  assert.ok(g.includes('float lat = abs(degrees(asin(clamp(dot(d, uGal.xyz), -1.0, 1.0)))), e = mix(-1.5, GAL_E, uGalC.w);') && g.includes('return 1.0 - smoothstep(e - 1.5, e + 1.5, lat);'), 'the galaxy\'s edge does not open from its midline (|b|, from -1.5 to GAL_E)');
  // the hold case: a sky with no galaxy keeps its rise at 0, and at 0 the shader draws nothing
  { const SKY = { seq: [{ id: 'moonlit', at: 0, hold: 190, move: 57 }, { id: 'moonlit', at: 247, hold: 190, move: 57 }], i: 0, galRise: 1 };
    new Function('SKY', 'WSKY', 'clamp', fn + '\nreturn skyGal;')(SKY, WS, clamp)(100); assert.equal(SKY.galRise, 0, 'a stay with no galaxy keeps a rise'); }
  assert.ok(g.includes('if (uGalC.w <= 0.0) return 0.0;'), 'galVis is not 0 at rise 0');
  assert.ok(g.includes('if (uGal.w > 0.0 && uGalC.w > 0.0 && eS > 0.0) { gL = galaxyAt(uSkyF * rd, eS) * hzT; c += gL; }') && g.includes('* smoothstep(1.0, 12.0, e) * galVis(rd);'), 'the galaxy is drawn without its edge, or at rise 0');
  assert.ok(g.includes('uGal.w > 0.0 && uGalC.w > 0.0 ? 1.5 * uGal.w * galVis(sd0(jb, ib, n))'), 'the stars crowd into the band before the galaxy comes in (a pop)');
  assert.ok(WORLD.includes('gl.uniform4f(u.uGalC, G.core[0], G.core[1], G.core[2], SKY.galRise || 0);') && WORLD.includes('skyAur(t); skyGal(t);'), 'the galaxy\'s rise is not its own clock\'s');
});

test('physics: weather/moon-corona: the corona\'s rings only where thin cloud stands in front of the moon', () => {
  // sky-body's own lines: the rings are times hiCv, the 3 km veil's cover in the pixel's direction (0 with no veil: a clear
  // night has none), set in both of the veil's blocks (a hold's and a change into a night's), by place, never a clock
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  assert.ok(g.includes('  float hiCv = 0.0;'), 'the corona\'s cloud does not start at none (a clear sky would ring)');
  assert.ok(g.includes('if (ma < 7.0 && hiCv > 0.0) c += hiCv * uMoonG * 0.15 * ('), 'the corona\'s rings are not by the cloud in front of the moon');
  for (const w of ['uHi.y', 'uSunB.y']) assert.ok(g.includes(`hiCv = max(hiCv, clamp(max(cov - vm, 0.0) / max(1.0 - vm, 0.05) * vk, 0.0, 1.0) * smoothstep(0.0, 0.05, ${w}));`), `the veil's block by ${w} does not give the corona its cloud`);
  // the shader's own lines at the moonlit sky's real veil (uHi.x is its post.hi cover, 220's L.hi; the strength uHi.y
  // only gates, 1 from 0.05): a clear patch (the streaks no thicker than the veil's even mean) gives 0 (no rings), a
  // full streak gives 1; the streaks' noise n spans -0.5..0.5 (two value noises less 0.5)
  const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const { WSKY } = skyWorld(1, 'night', 0.5), x = WSKY.moonlit.post.hi;
  assert.ok(x > 0.05, `the moonlit sky's veil cover is ${x}: no veil to give a corona`);
  {
    const vm = ss(0.55 - x, 0.95 - x, 0.692), vk = ss(0, 0.05, x);
    assert.ok(vm < 0.95, `the moonlit veil's even mean is ${vm.toFixed(3)}: no streak can stand beyond it`);
    const hiCv = (n, y) => { const cov = ss(0.55 - x, 0.95 - x, n * 1.6 + 0.5) * ss(0.06, 0.25, y); return Math.min(Math.max(Math.max(cov - vm, 0) / Math.max(1 - vm, 0.05) * vk, 0), 1) * ss(0, 0.05, 1); };
    let lo = 9, hi = -9;
    for (let n = -0.5; n <= 0.5; n += 0.01) { const v = hiCv(n, 0.5); lo = Math.min(lo, v); hi = Math.max(hi, v); }
    assert.equal(lo, 0, `cover ${x}: no clear patch (the corona never switches off: lowest ${lo.toFixed(3)})`);
    assert.ok(Math.abs(hi - 1) < 1e-9, `cover ${x}: no full streak (the corona never whole: highest ${hi.toFixed(3)})`);
  }
  assert.ok(g.indexOf('float hiCv = 0.0;') < g.indexOf('if (uHi.x > 0.0 && rd.y > 0.01) {') && g.indexOf('hiCv > 0.0) c += hiCv') > g.indexOf('if (uSkyN.w > 0.0 && uHi.x > 0.0 && rd.y > 0.01) {'), 'the corona reads its cloud before the veil has set it');
  assert.ok(!/hiCv[^;]*(uT|clockNow|uTime)/.test(g), 'the corona follows a clock (it may only come and go with its cloud, by place)');
});

test('physics: twilight (B6, B7, B9): the Earth\'s shadow blue-grey at the sky\'s lightness, no belt in the blue hour, the stars steady (no twinkle)', () => {
  const { WSKY } = skyWorld(1, 'night', 0.5);
  const o2l = (L, a, b) => { let l = L + 0.3963377774 * a + 0.2158037573 * b, m = L - 0.1055613458 * a - 0.0638541728 * b, s = L - 0.0894841775 * a - 1.2914855480 * b; l **= 3; m **= 3; s **= 3; return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]; };
  const l2o = (c) => { const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]), m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]), s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]); const o = [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]; return [o[0], Math.hypot(o[1], o[2]), (Math.atan2(o[2], o[1]) * 180 / Math.PI + 360) % 360]; };
  const lch = (L, C, h) => o2l(L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180)).map((x) => Math.max(x, 0));
  // B6: sky-body.glsl's own shadow line, its core over every belted sky's low stops: h 260-280, L within 0.005 (equal: never a darkening)
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const SH = g.match(/c = mix\(c, dot\(c, LUMA\) \* vec3\(([\d.]+), ([\d.]+), ([\d.]+)\), sh \* sideS \* min\(uNight\.x \/ ([\d.]+), 1\.0\)\);/);
  assert.ok(SH, 'the Earth\'s shadow line (c = mix(c, dot(c, LUMA) * vec3(...), sh * sideS * min(uNight.x / a, 1.0))) not found');
  assert.ok(!/c \* vec3\(0\.72, 0\.78, 0\.95\)/.test(g), 'the Earth\'s shadow still multiplies the sky (a pink darkening)');
  const T = SH.slice(1, 4).map(Number), full = +SH[4];
  let belted = 0;
  for (const id of Object.keys(WSKY)) {
    const S = WSKY[id], belt = (S.fx && S.fx.belt) || 0;
    if (!belt) continue;
    belted++;
    assert.ok(belt >= full, `${id}'s belt ${belt} is under ${full}: its shadow's core would be a partial mix (mauve)`);
    for (const st of S.sky.slice(0, 4)) {
      const c = lch(...st), y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], d = T.map((t) => y * t), [L0] = l2o(c), [L1, C1, h1] = l2o(d);
      assert.ok(h1 >= 260 && h1 <= 280 && C1 >= 0.015, `${id}: the shadow over [${st}] is h ${h1.toFixed(0)}, C ${C1.toFixed(3)} (blue-grey: 260-280)`);
      assert.ok(Math.abs(L1 - L0) <= 0.005, `${id}: the shadow over [${st}] moves L ${(L1 - L0).toFixed(4)} (equal: within 0.005)`);
    }
  }
  assert.ok(belted >= 2, 'no sky draws the belt');
  // B7: no belt (the shadow and the Belt of Venus) in the blue hour: the sun too low for it
  assert.equal((WSKY.bluehour.fx || {}).belt || 0, 0, 'the blue hour draws the belt');
  // (the audit's rank 4) no twinkle at all: the stars steady in every frame, the live as the still and reduced motion
  assert.ok(WORLD.includes('SKYN.night[2] = 0;'), 'uNight.z is not held at 0');
  const sa = g.match(/^float starAt[\s\S]*?^}/m); assert.ok(sa, 'starAt');
  assert.ok(!/uT\b|uNight\.z/.test(sa[0]), 'a star\'s light still moves with the clock (a twinkle)');
});

// ------------------------------------------------------------------ the purple light (physics: sky/purple-light)
// 223's own purpleAt, run here: the high haze's glow above the hidden sun, whole 3-4 deg down, none above 1.5 or below 6,
// its centre sinking with the sun; composited over the twilights' skies where it stands (the shader's own lines): it
// shows, under L 0.50, the credit 4.5:1; and its depth is the sun's true one, one way through a change
test('physics: sky/purple-light: the purple light above the hidden sun, by its depth, under the ceiling', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const K = +g.match(/const float PURP_K = ([\d.]+);/)[1];
  const P = new Function('DEG', 'clamp', cut(WORLD, '  var PURP = new Float32Array(4);', '  function skyThemeWarm(') + '\nreturn purpleAt;')(Math.PI / 180, (x, a, b) => Math.min(Math.max(x, a), b));
  const at = (d) => Array.from(P(d, 0.7));
  for (const d of [5, 0, -1.5, -6, -7, -8, -24]) assert.ok(at(d)[3] === 0, `the purple light shows with the sun ${d} deg (only 1.5-6 deg down)`);
  for (const d of [-3, -4]) assert.ok(Math.abs(at(d)[3] - 1) < 1e-9, `the purple light not whole with the sun ${d} deg down`);
  let prevE = 99;
  for (let d = -1.6; d >= -6.9; d -= 0.1) { const e = Math.asin(at(d)[1]) * 180 / Math.PI; assert.ok(e <= prevE + 1e-9, `its centre climbs as the sun sinks (${d.toFixed(1)}: ${e.toFixed(1)} deg)`); prevE = e; }
  assert.ok(Math.abs(Math.asin(at(-3)[1]) * 180 / Math.PI - 28) < 1e-6 && Math.abs(Math.asin(at(-6)[1]) * 180 / Math.PI - 16) < 1e-6, 'its centre not 28 deg up at 3 down and 16 at 6');
  // the shader's lines: over the twilight's sky at its centre (the stops at their heights, the dunes' haze), it shows and stays under
  assert.ok(g.includes('vec3 pA = vec3(1.0, 0.56, 0.92) * PURP_K * uPurp.w * exp(-pa * pa / 392.0) * (1.0 - hazeSky(rd));') && g.includes('pA *= yP > 1e-6 ? roomP * (1.0 - exp(-yP / max(roomP, 1e-6))) / yP : 1.0;') && g.includes('for (int i = 0; i < 10; i++) { float m = 0.5 * (lo + hi); if (purpL(c + pA * m) > PURP_KC) hi = m; else lo = m; }') && g.includes('c += pA;'), 'the purple light is not the lines this test models');
  const { WSKY } = skyWorld(1, 'night', 0.5), D2R = Math.PI / 180, Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const o2l = (L, aa, bb) => { let l = L + 0.3963377774 * aa + 0.2158037573 * bb, m = L - 0.1055613458 * aa - 0.0638541728 * bb, s = L - 0.0894841775 * aa - 1.2914855480 * bb; l **= 3; m **= 3; s **= 3; return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map((x) => Math.max(x, 0)); };
  const lc = (s) => o2l(s[0], s[1] * Math.cos(s[2] * D2R), s[1] * Math.sin(s[2] * D2R));
  const Lof = (c) => 0.2104542553 * Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]) + 0.7936177850 * Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]) - 0.0040720468 * Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
  const E = [0, 3, 10, 26, 58], skyAt = (S, e) => { const st = S.sky.map(lc); for (let i = 0; i < 4; i++) if (e <= E[i + 1]) { const t = (e - E[i]) / (E[i + 1] - E[i]); return st[i].map((v, j) => v + (st[i + 1][j] - v) * t); } return st[4]; };
  const cap = (c0, ad) => { const y = Y(ad), room = Math.max(0.118 - Y(c0), 0); return ad.map((v) => v * (y > 1e-6 ? room * (1 - Math.exp(-y / Math.max(room, 1e-6))) / y : 1)); };
  let shown = 9;
  for (const id of ['afterglow', 'firstlight']) for (const hz of [0.45, 0.85]) for (const [e, off] of [[28, 0], [28, 10], [20, 0], [36, 0]]) {
    const h = 1 - Math.exp(-1e-3 * hz * Math.exp(-24 / 30) * 30 / Math.sin(e * D2R)), c0 = skyAt(WSKY[id], e);
    const ad = cap(c0, [1.0, 0.56, 0.92].map((v) => v * K * Math.exp(-(off * off + (e - 28) ** 2) / 392) * (1 - h))), c1 = c0.map((v, i) => v + ad[i]);
    assert.ok(ad.every((v) => v >= 0), 'the purple light takes light away');
    assert.ok(Lof(c1) <= Math.max(0.50, Lof(c0)) + 1e-9, `${id}: the purple light at ${e} deg reaches L ${Lof(c1).toFixed(3)} (at most 0.50)`);
    assert.ok((0.82 + 0.05) / (Y(c1) + 0.05) >= 4.5, `${id}: the credit over the purple light reads ${((0.82 + 0.05) / (Y(c1) + 0.05)).toFixed(2)}:1`);
    if (e === 28 && off === 0) shown = Math.min(shown, Lof(c1) - Lof(c0));
  }
  // strictly additive (the owner's never-darken, per channel): through the composite's grade (its saturation) and its light
  // ceiling (fs-comp's lines: 0.525 less its knee, colour scaled whole by the cube of the L ratio), no channel of the frame
  // with the purple light is below the frame without it, the sun 1-7 deg down, over the afterglow and first light, low to high
  for (const id of ['afterglow', 'firstlight', 'bluehour']) assert.equal(WSKY[id].ceil, 0.525, `${id}'s light ceiling is not the one this test models`);
  const KC = +g.match(/const float PURP_KC = ([\d.]+);/)[1], CEIL = 0.525, KNEE = +WORLD.match(/CEIL_KNEE = ([\d.]+)/)[1];
  const kneeCap = (c0, ad) => { if (Lof(c0.map((v, i) => v + ad[i])) <= KC) return ad; let lo = 0, hi = Lof(c0) >= KC ? 0 : 1; for (let i = 0; i < 10; i++) { const m = 0.5 * (lo + hi); if (Lof(c0.map((v, j) => v + ad[j] * m)) > KC) hi = m; else lo = m; } return ad.map((v) => v * lo); };
  // (the frame: the sky as the composite gets it, its bloom and grade raising it by up to L 0.035 (measured), the same
  // for both arms; then its saturation and the ceiling)
  const frame = (c, sat, up) => { c = c.map((v) => v * up); const y0 = Y(c); c = c.map((v) => Math.max(y0 + (v - y0) * sat, 0)); const Lk = Lof(c), Kc = CEIL - KNEE; return Lk > Kc ? c.map((v) => v * ((Kc + KNEE * (1 - Math.exp(-(Lk - Kc) / KNEE))) / Lk) ** 3) : c; };
  let worst = 0;
  // (the sky behind it: the stops at their heights, and toward the sun its warm side (skyW) and glow (glowC), the brightest
  // and reddest the patch ever stands on)
  for (const id of ['afterglow', 'firstlight']) for (let d = -1; d >= -7; d -= 0.5) for (const hz of [0.45, 0.85]) for (let e = 1; e <= 60; e += 1) for (const off of [0, 12, 25]) for (const [wc, f] of [['skyW', 0], ['skyW', 0.3], ['skyW', 0.6], ['skyW', 1], ['glowC', 0.5], ['glowC', 1]]) {
    const w = at(d)[3], ce = Math.asin(at(d)[1]) / D2R; if (!(w > 0)) continue;
    const h = 1 - Math.exp(-1e-3 * hz * Math.exp(-24 / 30) * 30 / Math.sin(e * D2R)), cw = lc(WSKY[id][wc]), c0 = skyAt(WSKY[id], e).map((v, i) => v + (cw[i] - v) * f), sat = WSKY[id].post.sat;
    const ad = kneeCap(c0, cap(c0, [1.0, 0.56, 0.92].map((v) => v * K * w * Math.exp(-(off * off + (e - ce) ** 2) / 392) * (1 - h))));
    const up = ((Lof(c0) + 0.035) / Lof(c0)) ** 3, f0 = frame(c0, sat, up), f1 = frame(c0.map((v, i) => v + ad[i]), sat, up);
    for (let i = 0; i < 3; i++) worst = Math.min(worst, f1[i] - f0[i]);
  }
  assert.ok(worst >= -1e-9, `the purple light takes ${(-worst * 255).toFixed(3)} of a level from a channel of the frame (it only adds light, channel by channel)`);
  assert.ok(shown >= 0.01, `the purple light adds only L ${shown.toFixed(4)} at its centre over the twilight's sky (it would not show: at least 0.01)`);
  // its depth the sun's true one, one way through a change (the change's two skies, never a waypoint), drawn behind the 3 km veil
  assert.ok(WORLD.includes('if (SUNU.on) return -SUNU.es;') && !WORLD.includes('function sunDepthNow('), 'the purple light does not read the sky\'s one sun depth (227\'s skyDepth), one way through a change');
  assert.ok(WORLD.includes('if (u.uPurp) gl.uniform4fv(u.uPurp, purpleAt(-skyDepth(),'), 'the purple light is not uploaded from the sun\'s true depth');
  assert.ok(g.indexOf('if (uPurp.w > 0.0') < g.indexOf('if (uHi.x > 0.0 && rd.y > 0.01)'), 'the purple light is drawn over the 3 km veil (it stands behind it, at 20 km)');
});

// the moon's disc against the moonlit clouds (the hub's round-3 ruling, 2026-11-16 04:19): the clouds are never darkened
// to make room, so the disc stands at the ceiling's L (its table L through fs-comp's shoulder, CEIL_KNEE), parts from the
// clouds by hue (at least 60 deg from their lit colour's) with low chroma (neutral to faintly warm, C <= 0.015), and
// its glow adds its own light up to its luminance (no per-channel max of a blue sky and a warm glow, which read olive)
test('night: the moon\'s disc stands at the ceiling, by hue apart from the moonlit clouds, low in chroma; its glow never olive', () => {
  const m = /moonlit: \{[^\n]*?clLit:\[([\d.]+),([\d.]+),([\d.]+)\][^\n]*?fx:\{moon:\{r:[\d.]+,L:\[([\d.]+),([\d.]+),([\d.]+)\],glow:\[([\d.]+),([\d.]+),([\d.]+)\][^\n]*?ceil:([\d.]+)/.exec(WORLD);
  assert.ok(m, 'the moonlit sky\'s clLit, fx.moon and ceil');
  const [cl, disc, glow, ceil] = [m.slice(1, 4), m.slice(4, 7), m.slice(7, 10), [m[10]]].map((a) => a.map(Number)), k = +/var CEIL_KNEE = ([\d.]+)/.exec(WORLD)[1];
  const shown = (L) => { const Kc = ceil[0] - k; return L > Kc ? Kc + k * (1 - Math.exp(-(L - Kc) / k)) : L; };
  assert.ok(Math.abs(shown(disc[0]) - ceil[0]) <= 0.01, `the disc shown at L ${shown(disc[0]).toFixed(3)}, the ceiling ${ceil[0]}`);
  const dh = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
  assert.ok(dh(disc[2], cl[2]) >= 60, `the disc's hue ${disc[2]} within 60 deg of the clouds' ${cl[2]}`);
  assert.ok(disc[1] <= 0.015 && glow[1] <= 0.015, `the disc's chroma ${disc[1]}, its glow's ${glow[1]} (at most 0.015)`);
  assert.ok(dh(glow[2], cl[2]) >= 60, 'the glow\'s hue apart from the clouds\' too');
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  assert.ok(g.includes('c += uMoonG / max(gy, 1e-5) * max(gy - dot(c, LUMA), 0.0) * gk;') && !g.includes('max(c, uMoonG)'), 'the glow adds its own light up to its luminance, never a per-channel max');
  assert.ok(g.includes('smoothstep(mr - max(mpx * 0.8, 0.04), mr + max(mpx * 0.8, 0.04), ma)'), 'the disc\'s edge crisp: about a pixel either side');
});

// ------------------------------------------------------------------ the meteors (delight-night §2)
// 219's own plan and stroke run here (meteorList, meteorPlan, meteorShape): the counts a stay over 10^4 stays; a long one
// from under 2 deg up or out of the view to out of it, its wake rigid, its light constant, at most 2.7 px a frame at 60 Hz
// on a laptop; a short one 0.3-1 s at 3-25 deg/s, its light rising and falling softly (one of the owner's two exceptions to
// no-fades, quoted in RULES.json), its stroke over each frame's own path; none in a twilight; none under reduced motion;
// sky-body.glsl's meteorAt keeps its light within 2% as it slides between pixels
const METEORS = cut(WORLD, '  var METEOR = {', '  function meteorStep(');
const metWorld = () => vm.runInThisContext('(function () { var PI = Math.PI, DEG = PI / 180;\n' + STREAMS + VEC + METEORS + ' return { meteorList, meteorPlan, meteorShape, meteorAt3, meteorFrom, METEOR }; })')();
test('night: meteors, long grazers crossing the view and short soft ones, on the night skies only', () => {
  const K = metWorld(), ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;
  const tanX = Math.tan(36 * Math.PI / 180), tanY = tanX / 1.6, pxDeg = 900 / (2 * Math.atan(tanY) * 180 / Math.PI);   // (1440x900)
  const inView = (d, psi, pitch) => { const a = psi * Math.PI / 180, b = pitch * Math.PI / 180, f = [Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b)], r = [Math.cos(a), 0, -Math.sin(a)], u = [-Math.sin(a) * Math.sin(b), Math.cos(b), -Math.cos(a) * Math.sin(b)], z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2]; if (z <= 0) return false; return Math.abs((d[0] * r[0] + d[2] * r[2]) / z / tanX) < 1 && Math.abs((d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / z / tanY) < 1; };
  for (const id of ['afterglow', 'bluehour', 'firstlight']) assert.equal(K.meteorList({ id, n: 3, at: 0, hold: 100 }, 7, 4, 100).length, 0, id + ': no meteor in a twilight');
  const N = 10000, cnt = { milkyway: [0, 0], aurora: [0, 0], moonlit: [0, 0] };
  for (const id of Object.keys(cnt)) for (let s = 1; s <= N; s++) {
    const L = K.meteorList({ id, n: s % 9, at: 0, hold: id === 'moonlit' ? 190 : 100 }, s * 2654435761 >>> 0, 4, id === 'moonlit' ? 190 : 100);
    let t = -Infinity;
    for (const M of L) {
      cnt[id][M.long ? 0 : 1]++;
      assert.ok(M.at >= 4 && M.at + M.dur <= (id === 'moonlit' ? 190 : 100) + 1e-9 && M.at >= t, `${id}: in its stay, in turn, apart`); t = M.at + M.dur + K.METEOR.GAP - 1e-9;
      if (id === 'moonlit') assert.ok(M.y >= K.METEOR.BRIGHT, 'the moonlit sky: bright ones only');
      if (!M.long) assert.ok(M.dur >= 0.3 && M.dur <= 1 && M.w >= 3 && M.w <= 25, 'a short one: 0.3-1 s at 3-25 deg/s');
    }
  }
  const mean = (id, k) => cnt[id][k] / N;
  assert.ok(mean('milkyway', 0) > 0.85 && mean('milkyway', 0) < 1.15, `about one long one a stay (${mean('milkyway', 0).toFixed(2)})`);
  assert.ok(mean('aurora', 1) > 1.5 && mean('aurora', 1) <= 3, `1-3 short ones a stay (${mean('aurora', 1).toFixed(2)})`);
  assert.ok(mean('moonlit', 0) < 0.6 && mean('moonlit', 1) <= 0.6, `the moonlit sky's fewer (${mean('moonlit', 0).toFixed(2)}, ${mean('moonlit', 1).toFixed(2)})`);
  let worst = 0; const spans = [];
  for (let s = 1; s <= 400; s++) for (const long of [true, false]) {
    const R = ((x) => () => ((x = (x * 1103515245 + 12345) >>> 0) / 2 ** 32))(s), w = long ? 3 + 2 * R() : 3 + 22 * R(), M = { long, w, dur: long ? 0 : 0.3 + 0.7 * R(), y: 0.08, u: [R(), R(), R(), R()], at: 0, plan: null };
    if (long) { const P0 = K.meteorPlan(M, 0, 0, 1, 1); M.dur = (P0.th1 - P0.th0) / w; spans.push(P0.th1 - P0.th0); }
    const psi = 360 * R(), pitch = 6; M.plan = K.meteorPlan(M, psi, pitch, tanX, tanY);
    const a = K.meteorShape(M, 0, 1 / 60), b = K.meteorShape(M, M.dur - 1e-6, 1 / 60);
    if (long) {
      assert.ok(a.head[1] <= Math.sin(2.05 * Math.PI / 180) || !inView(a.head, psi, pitch), `seed ${s}: a long one starts under 2 deg up or out of the view`);
      assert.ok(b.head[1] <= Math.sin(2.05 * Math.PI / 180), `seed ${s}: and ends under 2 deg up again (${(Math.asin(b.head[1]) * 180 / Math.PI).toFixed(2)}), so no drag shows it ending in the open sky`);
      for (let t = 1; t < M.dur - 1; t += 0.7) { const p = K.meteorShape(M, t, 1 / 60), q = K.meteorShape(M, t + 1 / 60, 1 / 60); assert.ok(Math.abs(ang(p.head, p.tail) - K.METEOR.WAKE) < 1e-6 && p.y === M.y, 'rigid, its light constant'); worst = Math.max(worst, ang(p.head, q.head) * pxDeg); }
    } else {
      assert.ok(a.y < 1e-4 && b.y < 1e-3, 'a short one rises from nothing and falls to nothing');
      const m = K.meteorShape(M, M.dur / 2, 1 / 60); assert.ok(Math.abs(m.y - M.y) < 1e-9, 'its light at its height mid-way');
      const p = K.meteorShape(M, 0.2, 1 / 60), q = K.meteorShape(M, 0.2 + 1 / 60, 1 / 60); if (p && q) assert.ok(ang(q.head, q.tail) >= ang(p.head, q.head) - 1e-9, 'its stroke covers the frame\'s own path');
      const el0 = Math.asin(a.head[1]) * 180 / Math.PI; assert.ok(el0 >= 20 - 1e-6 && el0 <= 55 + 1e-6, `a short one starts mid-sky (${el0.toFixed(1)} deg up)`);
    }
  }
  assert.ok(worst <= 2.7, `a long one moves ${worst.toFixed(2)} px a frame at 60 Hz (1440x900; at most 2.7)`);
  const S = fs.readFileSync(path.join(ROOT, 'src', 'world', '219-meteors.js'), 'utf8');
  assert.ok(S.includes('var E = SKY.seq[SKY.i]; if (!E || reduced() || !SIM.V) return;') && S.includes("if (E && E.met && !reduced())"), 'none under reduced motion');
  for (const [at, t] of [[0, 0], [0, 3.5], [-20, 1], [5, 2]]) { assert.ok(K.meteorFrom({ at }, t, true) >= t + 8, `the opening stay's none before 8 s after its first step (${at}, ${t})`); assert.ok(K.meteorFrom({ at }, t, false) >= at + 4, 'another stay\'s none in its first 4 s'); }
  assert.ok(S.includes('E.met = meteorList(E, AFTER && !first ? SEEDR : J.seed, meteorFrom(E, t, first), E.at + E.hold);'), 'the opening stay\'s from its seed, every later one from the visit\'s own read (as the halo\'s veils)');
  const RJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'RULES.json'), 'utf8')), NF = (RJ.rules || RJ).find((r) => r.id === 'no-fades');
  assert.ok(NF.rule.includes('short shooting stars') && NF.source.some((q) => q.quote === 'Allow short ones too' && q.date === '2026-11-15'), 'no-fades names the short meteors\' exception, quoting the owner');
  console.log(`# meteors a stay: milky way ${mean('milkyway', 0).toFixed(2)} long + ${mean('milkyway', 1).toFixed(2)} short, moonlit ${mean('moonlit', 0).toFixed(2)} + ${mean('moonlit', 1).toFixed(2)}; a long one ${worst.toFixed(2)} px a frame, its path ${Math.min(...spans).toFixed(0)}-${Math.max(...spans).toFixed(0)} deg`);
});
test('night: a meteor\'s stroke keeps its light as it slides between pixels (no glitter)', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const fn = (name) => g.match(new RegExp('^float ' + name + '\\(([^)]*)\\) \\{(.*)\\}\\s*$', 'm'));
  const js = (src) => src.replace(/\bfloat\s+/g, 'let ').replace(/\b(sign|sqrt|exp)\(/g, 'Math.$1(').replace(/(\d)\.(?!\d)/g, '$1.0');
  const E = fn('starErf'), B = fn('starBox'), starErf = new Function(E[1].replace(/float /g, ''), js(E[2])), starBox = new Function('starErf', B[1].replace(/float /g, ''), js(B[2])).bind(null, starErf);
  assert.ok(g.includes('float v = uMetH.w * (starBox(d, sg) * along * tap + SKYTAU * sg * sg * starBox(dh.x, sg) * starBox(dh.y, sg));'), 'meteorAt\'s light as measured here');
  const shown = (Ax, Ay, Bx, By, sg) => { const L = Math.hypot(Bx - Ax, By - Ay), ax = (Bx - Ax) / L, ay = (By - Ay) / L, k = 0.70710678 / sg; let sum = 0;
    for (let y = -40; y <= 40; y++) for (let x = -60; x <= 60; x++) { const fx = x - Ax, fy = y - Ay, s = fx * ax + fy * ay, d = Math.abs(fx * ay - fy * ax), along = 0.5 * (starErf(s * k) - starErf((s - L) * k)), tap = 0.2 + 0.8 * Math.min(Math.max(s / L, 0), 1);
      sum += starBox(d, sg) * along * tap + 2 * Math.PI * sg * sg * starBox(x - Bx, sg) * starBox(y - By, sg); } return sum; };
  let lo = Infinity, hi = 0, seed = 5; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (let k = 0; k < 48; k++) { const ox = rnd() - 0.5, oy = rnd() - 0.5, v = shown(-20 + ox, -6 + oy, 20 + ox, 6 + oy, 0.75); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  assert.ok((hi - lo) / hi < 0.02, `its light swings ${(100 * (hi - lo) / hi).toFixed(2)}% as it slides (at most 2%)`);
});

test('physics: night/moon-phase: a near-full moon, lit by its hidden sun opposite (lit fraction over 0.97), its dark sliver the sky', () => {
  // sky-body.glsl's own moon lines, made JS (their vectors by hand): over the disc, at every height the moon stands
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const PH = +g.match(/const float MOON_PHASE = ([\d.]+);/)[1];
  assert.ok(g.includes('vec3 mn = mo.x * mt1 + mo.y * mt2 - mz * uMoon.xyz;') && g.includes('float mlit = smoothstep(-0.06, 0.06, dot(mn, msun));') && g.includes('vec3 msun = normalize(vec3(-uMoon.x, 0.0, -uMoon.z) + vec3(1e-5, 0.0, 0.0)) * cos(mse) + vec3(0.0, sin(mse), 0.0);'), 'the moon\'s phase lines are not the ones this test models');
  assert.ok(g.includes('c = mix(c, mix(c, mC * (ma < mr + 0.1 ? moonFace(mn, uMoon.xyz) : 1.0), mlit), 1.0 - smoothstep('), 'the moon\'s unlit part is not the sky behind it (it would be painted darker)');
  const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  for (const e of [0, 5, 15, 30, 60]) for (const az of [0, 2.1]) {
    const m = [Math.sin(az) * Math.cos(e * Math.PI / 180), Math.sin(e * Math.PI / 180), Math.cos(az) * Math.cos(e * Math.PI / 180)];
    const t1 = norm(cross([0, 1, 0], m).map((x, i) => x + (i === 0 ? 1e-5 : 0))), t2 = cross(m, t1);
    const se = -Math.asin(m[1]) - PH * Math.PI / 180, h = norm([-m[0] + 1e-5, 0, -m[2]]), sun = [h[0] * Math.cos(se), Math.sin(se), h[2] * Math.cos(se)];
    const sunAz = Math.atan2(sun[0], sun[2]), moonAz = Math.atan2(m[0], m[2]), dAz = Math.abs(((sunAz - moonAz) * 180 / Math.PI + 540) % 360 - 180);
    assert.ok(Math.abs(dAz - 180) < 0.01 && sun[1] < 0, `moon at ${e} deg: its sun stands at ${dAz.toFixed(2)} deg of azimuth from it, ${(Math.asin(sun[1]) * 180 / Math.PI).toFixed(1)} up (opposite, under the horizon)`);
    let lit = 0, n = 0, top = 0, nt = 0;
    for (let y = -1; y <= 1; y += 0.02) for (let x = -1; x <= 1; x += 0.02) {
      if (x * x + y * y > 1) continue;
      const z = Math.sqrt(Math.max(1 - x * x - y * y, 0)), nrm = [0, 1, 2].map((i) => x * t1[i] + y * t2[i] - z * m[i]), l = ss(-0.06, 0.06, dot(nrm, sun));
      lit += l; n++; if (y > 0.9) { top += l; nt++; }
    }
    const f = lit / n;
    assert.ok(f > 0.97 && f < 0.995, `moon at ${e} deg: lit ${(100 * f).toFixed(1)}% of its disc (a near-full moon: over 97%, not a flat coin)`);
    assert.ok(top / nt < f, `moon at ${e} deg: its dark sliver is not on the limb away from its sun (the top)`);
  }
});

// ------------------------------------------------------------------ the Milky Way's structure (delight-night section 3)
// sky-body.glsl's own shape lines (galAlong, galBand, galCore, galRift, galCoal, galLMC, galSMC, galM31), run here as JS
// over galactic longitude and latitude: the rift's dark lane only inside ld -55..85; the core at least 3x the anticentre;
// each object's peak within 0.5 deg of its place; the band's peak within 5% of the old band's (1)
test('night: the Milky Way\'s structure, the rift, the bulge\'s lane, the fall to the anticentre, the Coalsack, the Clouds and M31 at their places', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const names = ['galAlong', 'galBand', 'galCore', 'galRift', 'galCoal', 'galLMC', 'galSMC', 'galM31'];
  const src = names.map((nm) => { const m = g.match(new RegExp('^float ' + nm + '\\(([^)]*)\\) \\{(.*)\\}\\s*$', 'm')); assert.ok(m, nm + ' is one line in sky-body.glsl'); return 'function ' + nm + '(' + m[1].replace(/float /g, '') + ') {' + m[2].replace(/\bfloat\s+/g, 'let ') + '}'; }).join('\n');
  const K = new Function('const { exp, cos, sin, pow, sqrt, abs, max, min } = Math, radians = (d) => d * Math.PI / 180, smoothstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };\n' + src + '\nreturn { ' + names.join(', ') + ' };')();
  assert.ok(g.includes('float dark = (1.0 - 0.8 * galRift(ld, bd - bo) * brk) * (1.0 - 0.85 * galCoal(ld, bd))') && !g.includes('float lanes ='), 'the rift and the Coalsack darken the band; the old noise lanes are gone');
  for (let ld = -180; ld <= 180; ld += 1) for (let bd = -10; bd <= 10; bd += 0.25) {
    const r = K.galRift(ld, bd); if (ld < -55 || ld > 85) assert.ok(r < 1e-9, `no rift at ld ${ld}`);
  }
  for (let ld = -45; ld <= 75; ld += 5) { let mx = 0; for (let bd = -4; bd <= 4; bd += 0.05) mx = Math.max(mx, K.galRift(ld, bd)); assert.ok(mx > 0.95, `the rift whole at ld ${ld} (${mx.toFixed(2)})`); }
  const peak = (f, ld) => { let mx = 0; for (let bd = -15; bd <= 15; bd += 0.05) mx = Math.max(mx, f(ld, bd)); return mx; };
  const whole = (ld, bd) => K.galBand(ld, bd) * 0.525 + 1.3 * K.galCore(ld, bd);   // (the band at its noise's mean, (0.25 + 1.1 n^2) at n 0.5)
  const core = peak(whole, 0), anti = peak(whole, 180);
  assert.ok(core >= 3 * anti, `the core ${core.toFixed(3)} at least 3x the anticentre ${anti.toFixed(3)}`);
  const fall = K.galAlong(180) / K.galAlong(0); assert.ok(fall <= 0.35, `the band at the anticentre ${fall.toFixed(2)} of its brightness at the core (about 0.3)`);
  let amax = 0; for (let ld = -180; ld <= 180; ld += 0.5) amax = Math.max(amax, K.galAlong(ld)); assert.ok(amax <= 1.05, `the band's peak ${amax.toFixed(3)} within 5% of the old band's (1)`);
  let bright = -999, bv = 0; for (let ld = -180; ld <= 180; ld += 1) { const v = peak(K.galBand, ld); if (v > bv) { bv = v; bright = ld; } } assert.ok(bright >= -80 && bright <= 0, `the brightest band at ld ${bright} (the star clouds, -80..0)`);
  assert.ok(K.galCore(0, 0) < 0.3 * K.galCore(0, 4), 'the bulge cut by its mid-plane lane');
  const at = (f, l0, b0) => { let best = 0, L = 0, B = 0; for (let ld = l0 - 8; ld <= l0 + 8; ld += 0.05) for (let bd = b0 - 6; bd <= b0 + 6; bd += 0.05) { const v = f(ld, bd); if (v > best) { best = v; L = ld; B = bd; } } return [L, B, best]; };
  for (const [nm, f, l0, b0] of [['Coalsack', K.galCoal, 302.8 - 360, 0.4], ['LMC', K.galLMC, 280.5 - 360, -32.9], ['SMC', K.galSMC, 302.8 - 360, -44.3], ['M31', K.galM31, 121.2, -21.6]]) {
    const [L, B, v] = at(f, l0, b0);
    assert.ok(Math.hypot((L - l0) * Math.cos(b0 * Math.PI / 180), B - b0) <= 0.5 && v > 0, `${nm} peaks at (${L.toFixed(2)}, ${B.toFixed(2)}), its place (${l0.toFixed(1)}, ${b0})`);
  }
  const lmcW = (() => { let w = 0; for (let x = 0; x < 15; x += 0.05) if (K.galLMC(-79.5 + x / Math.cos(32.9 * Math.PI / 180), -32.9) > 0.5 * K.galLMC(-79.5, -32.9)) w = x; return 2 * w; })();
  assert.ok(lmcW > 4 && lmcW < 12, `the LMC ${lmcW.toFixed(1)} deg across at half its peak (10.75 x 9.2 deg in all)`);
  console.log(`# milky way: core ${core.toFixed(3)} / anticentre ${anti.toFixed(3)} = ${(core / anti).toFixed(1)}x, brightest band at ld ${bright}, its peak ${amax.toFixed(3)}`);
});

// the airglow (NIGHT): a steady faint green band low over the horizon on the night skies only, behind the haze; its peak
// at most Y 0.0045 (a tenth to a quarter of a dark night's own sky low down), its colour at luminance 1 and low in chroma
test('night: the airglow, a faint steady green band low over the horizon, only once the sun is 15-18 deg down', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const A = +g.match(/const float AIRGLOW_Y = ([\d.]+);/)[1];
  const L = g.match(/^  if \(uSunD\.z > 0\.0 && eS > 0\.0\) \{ vec3 aG = vec3\(([\d.]+), ([\d.]+), ([\d.]+)\) \* \(AIRGLOW_Y \* \(1\.0 - uStarM\.w\) \* smoothstep\(0\.0, 6\.0, eS\) \* exp\(-eS \/ 14\.0\)\) \* hzT; gL \+= aG; c \+= aG; \}/m);
  assert.ok(L, 'the airglow\'s line: by the stars\' weight (none in a twilight), rising over 6 deg, falling over 14, behind the haze (hzT), its light held apart from nightLim\'s sky (gL)');
  const ph2 = g.slice(g.lastIndexOf('#ifdef SKY_PH2', L.index), L.index);
  assert.ok(!ph2.includes('#endif'), 'drawn in the night sky\'s program (SKY_PH2), with the galaxy and the aurora');
  const C = [+L[1], +L[2], +L[3]], Y = 0.2126 * C[0] + 0.7152 * C[1] + 0.0722 * C[2];
  const l = Math.cbrt(0.4122214708 * C[0] + 0.5363325363 * C[1] + 0.0514459929 * C[2]), m = Math.cbrt(0.2119034982 * C[0] + 0.6806995451 * C[1] + 0.1073969566 * C[2]), q = Math.cbrt(0.0883024619 * C[0] + 0.2817188376 * C[1] + 0.6299787005 * C[2]);
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * q, b = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * q;
  assert.ok(Math.abs(Y - 1) < 2e-3, `its colour at luminance 1 (${Y.toFixed(4)})`);
  assert.ok(Math.hypot(a, b) <= 0.08 && a < 0, `pale green (a ${a.toFixed(3)}, C ${Math.hypot(a, b).toFixed(3)}, at most 0.08)`);
  const ss = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };
  let peak = 0, at = 0; for (let e = 0; e <= 90; e += 0.1) { const v = A * ss(0, 6, e) * Math.exp(-e / 14); if (v > peak) { peak = v; at = e; } }
  assert.ok(peak * Math.max(...C) <= 0.0045, `its brightest channel at most Y 0.0045 (${(peak * Math.max(...C)).toFixed(5)})`);
  assert.ok(at >= 4 && at <= 10, `brightest ${at.toFixed(1)} deg up (low over the horizon)`);
  assert.ok(A * ss(0, 6, 90) * Math.exp(-90 / 14) < 0.01 * peak, 'all but gone overhead');
  console.log(`# airglow: peak Y ${peak.toFixed(5)} at ${at.toFixed(1)} deg, colour C ${Math.hypot(a, b).toFixed(3)}`);
});

// the moon's pace against the sky's one clock (the hub's physics map, the Moon row; the owner's briefs: "Drift all night",
// "Slower moon"): 225's moonPlan fits the crossing to its stay (STEP 7); over 400 planned stays on the real route its
// speed through the hold is at most SKY_RATE times the sidereal rate (0.418 deg/s), within 1% (over 4000 plans: its
// median 0.86 of it, the fastest 1.002: the legs' bounds, STEP 7's quickening; today 78-96x real)
test('night: the moon crosses no faster than the sky\'s declared rate (SKY_RATE x sidereal), within 1%', () => {
  const ROUTE = vm.runInThisContext('(function () {\n' + cut(WORLD, '  // MOON-ROUTE-BEGIN', '  // MOON-ROUTE-END') + '\n  return { moonPlan: moonPlan, moonAt: moonAt };\n})')();
  const SR = +WORLD.match(/var SKY_RATE = (\d+);/)[1], SID = +WORLD.match(/AIR_SIDEREAL = ([\d.]+)/)[1], rate = SR * 360 / SID;
  let s = 0x5eed; const R = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const tan = Math.tan(36 * Math.PI / 180), boxes = [[600, 380, 1000, 440], [650, 450, 950, 480], [700, 490, 900, 510], [650, 800, 950, 830], [1500, 20, 1580, 60]], speeds = [];
  for (let i = 0; i < 400; i++) {
    const psi = R() * 360 - 180, keyAz = R() * 360 - 180, side = R() < 0.5 ? -1 : 1, sigma = R() < 0.5 ? -1 : 1, p = -6 + 4 * R();
    const hold0 = 40 + 60 * R(), move0 = 55 + 5 * R(), hold = 150 + 60 * R(), move = 55 + 5 * R(), t0 = -20 + hold0, t1 = t0 + move0, t2 = t1 + hold, t3 = t2 + move;
    const P = ROUTE.moonPlan({ psi, pN: p, pL: p, tanX: tan, tanY: tan * 9 / 16, W: 1600, H: 900, boxes, keepPx: 12, coarse: false, noRoom: false, keyAz, side, sigma, lift: 0, t0, t1, t2, t3 });
    if (!P || P.fail) continue;
    let prev = null, worst = 0;
    for (let t = t1; t <= t2; t += 0.5) {
      const o = { d: [0, 0, 0] }; ROUTE.moonAt(P, t, o);
      if (prev) { const c = Math.max(-1, Math.min(1, o.d[0] * prev[0] + o.d[1] * prev[1] + o.d[2] * prev[2])); worst = Math.max(worst, Math.acos(c) * 180 / Math.PI / 0.5); }
      prev = o.d.slice();
    }
    speeds.push(worst);
  }
  assert.ok(speeds.length > 350, `${speeds.length} of 400 stays planned (the test is not empty)`);
  const fastest = Math.max(...speeds);
  assert.ok(fastest <= rate * 1.01, `the moon crossed at ${fastest.toFixed(4)} deg/s in its hold, past SKY_RATE x sidereal (${rate.toFixed(4)} deg/s) by over 1%`);
  const med = [...speeds].sort((a, b) => a - b)[speeds.length >> 1];
  console.log(`# the moon's pace: median ${med.toFixed(3)} deg/s (${(100 * med / rate * SR / 100).toFixed(0)}x real), fastest ${fastest.toFixed(3)} (${(SR * fastest / rate).toFixed(0)}x), SKY_RATE ${SR}x`);
});

// (physics: sky/cirrus, the hub's physics map: "High veil (cirrus) ... Physics: Looks") the high veil is cirrus: 7 km up
// (WMO: 5-13 km temperate, 3-8 km polar), its streaks along the air's wind at that height (215's AIR_H.deck), and a
// change's cover comes in by place: a front carried along that wind from upwind, never a strength over the whole sky
test('sky: the cirrus stands 7 km up on the air\'s wind there, and a change brings its cover by place, from upwind', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const H = +/const float HI_H = ([\d.]+), HIF_W = ([\d.]+);/.exec(g)[1], W = +/const float HI_H = [\d.]+, HIF_W = ([\d.]+);/.exec(g)[1];
  assert.ok(H >= 6000 && H <= 8000, `the cirrus at ${H} m (real cirrus at 64 N: 6-8 km, inside both the temperate and the polar ranges)`);
  assert.equal((g.match(/vec2 P = uCam\.xz \+ rd\.xz \/ rd\.y \* \(HI_H - uCam\.y\);/g) || []).length, 2, 'both veil blocks at HI_H');
  assert.equal(+/var AIR_H = \{[^}]*deck: (\d+)/.exec(WORLD)[1], H, 'the air\'s declared deck height (its wind, the streaks\' lie and drift) is not the cirrus\'s');
  assert.equal((g.match(/float hx = hiCov\(P, dD\);/g) || []).length, 2, 'both veil blocks read the cover by place');
  assert.ok(!/smoothstep\(0\.55 - uHi\.x|veilMean\(uHi\.x\)|smoothstep\(0\.0, 0\.05, uHi\.x\)/.test(g), 'a veil block still reads the one cover over the whole sky');
  // the shader's cover at the deck's point, and 224's front, run here
  const cov = g.match(/float hiCov\(vec2 P, vec2 dD\) \{ return (uHiP\.w > 0\.0 \? mix\(uHiP\.x, uHiP\.y, clamp\(\(uHiP\.z - dot\(P - uCam\.xz, dD\)\) \/ HIF_W \+ 0\.5, 0\.0, 1\.0\)\) : uHi\.x); \}/);
  assert.ok(cov, 'hiCov is not the front along the deck\'s wind');
  const hiCov = (a, P4, hx) => P4[3] > 0 ? P4[0] + (P4[1] - P4[0]) * Math.min(1, Math.max(0, (P4[2] - a) / W + 0.5)) : hx;
  const js = /var xa = \(1 - w\) \* X\.d\.hi\[0\] \+ w \* X\.a\.hi\[0\], xb = \(1 - w\) \* Y\.d\.hi\[0\] \+ w \* Y\.a\.hi\[0\];\n\s*HIP\[0\] = xa; HIP\[1\] = xb; HIP\[2\] = HIF_R \* \(2 \* q - 1\); HIP\[3\] = q > 0 && q < 1 && xa !== xb \? 1 : 0;/.exec(WORLD);
  assert.ok(js, '224 does not set the front from the two skies\' covers and the change\'s q');
  const R = +/var HIP = new Float32Array\(4\), HIF_R = (\d+);/.exec(WORLD)[1];
  assert.ok(R >= (H - 1500) / 0.06, `the front starts ${R} m upwind: inside the visible deck (${Math.round((H - 1500) / 0.06)} m at the streaks' fade, from 1.5 km up)`);
  const hip = (xa, xb, q) => [xa, xb, R * (2 * q - 1), q > 0 && q < 1 && xa !== xb ? 1 : 0];
  for (const [xa, xb] of [[0, 0.15], [0.15, 0], [0.1, 0.15]]) {
    let prev = null;
    for (let q = 0; q <= 1.0001; q += 0.01) {
      const P4 = hip(xa, xb, q), blend = xa + (xb - xa) * q;
      if (q === 0) assert.equal(P4[3], 0, 'a hold draws as before');
      const row = [-R * 1.2, -60000, -6000, 0, 6000, 60000, R * 1.2].map((a) => hiCov(a, P4, blend));
      for (let i = 1; i < row.length; i++) assert.ok(Math.abs(row[i] - xb) >= Math.abs(row[i - 1] - xb) - 1e-12, `q ${q.toFixed(2)}: the new cover not reached first upwind (${row})`);
      for (const v of row) assert.ok(Math.min(xa, xb) - 1e-12 <= v && v <= Math.max(xa, xb) + 1e-12, 'a cover between the two skies\'');
      if (q > 0.02 && q < 0.98) { assert.ok(Math.abs(row[0] - xb) < 1e-12 && Math.abs(row[6] - xa) < 1e-12, `q ${q.toFixed(2)}: far upwind the new sky's cover, far downwind the old`); }
      if (prev) for (let i = 0; i < row.length; i++) assert.ok(Math.abs(row[i] - xb) <= Math.abs(prev[i] - xb) + 1e-12, 'a place never goes back to the old cover');
      prev = row;
    }
  }
});

test('physics: Looks: the gas\'s path is the slant integral of air thinning with its 8 km scale height (gasPath)', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src/world/glsl/lib-air.glsl'), 'utf8');
  const m = g.match(/float gasPath\(vec3 rd, float t\) \{([^\n]*)\}\n/);
  assert.ok(m, 'lib-air.glsl has no gasPath');
  const js = m[1].replace(/\bfloat\b/g, 'let').replace(/\bexp\(/g, 'Math.exp(').replace(/\babs\(/g, 'Math.abs(');
  const gasPath = vm.runInThisContext('(function (rd, t, uCam) {' + js + '})');
  for (const [y0, ry, t] of [[0, 0, 30000], [40, 0.1, 30000], [200, 0.23, 30000], [20, -0.01, 5000], [500, 0.5, 14000]]) {
    let n = 0; const N = 20000; for (let i = 0; i < N; i++) { const s = (i + 0.5) * t / N; n += Math.exp(-(y0 + ry * s) / 8000) * t / N; }
    const v = gasPath({ y: ry }, t, { y: y0 });
    assert.ok(Math.abs(v - n) / n < 1e-4, 'gasPath at eye ' + y0 + ' m, rd.y ' + ry + ', ' + t + ' m: ' + v.toFixed(1) + ' against the integral ' + n.toFixed(1));
  }
  assert.ok(/float gp = gasPath\(rd, t\)/.test(g) && /vec3 T = exp\(-\(m \* pow\(vec3\(680\.0, 550\.0, 440\.0\) \/ 550\.0, vec3\(-uAer\.w\)\) \+ BR \* gp\)\), T0 = exp\(-\(m \+ BR \* gp\)\)/.test(g), 'atmos does not take the gas along its path (and the aerosol by wavelength)');
  assert.ok(g.includes('c = max(c * T + fq * (1.0 - T), c * T0 + fq * (1.0 - T0))'), 'atmos lets the physical aerosol darken a channel below the grey air it replaced (nothing is darkened)');
  assert.ok(g.includes('return 1.0 - exp(-fogOD(rd, t) - BR.g * gasPath(rd, t));'), 'fogAmt does not take the gas along its path');
});

// the moon's face (NIGHT, the hub's review crops: a flat tan disc, then evenly toned spots): the near side's albedo from
// NASA's Scientific Visualization Studio CGI Moon Kit (https://svs.gsfc.nasa.gov/4720/, public domain), resampled by
// tools/night/moonmap.py to an orthographic 32 x 32 disc at 4 bits a cell; sky-body.glsl's moonFace run here as JS: the
// maria where they stand (Imbrium, Serenitatis, Tranquillitatis, Crisium, Procellarum darker than the southern highlands),
// the disc's mean light steady within 2% and no pixel jumping more than half its contrast as it slides by quarter pixels
test('night: the moon\'s face, the near side\'s albedo read bilinear, the maria where they stand, no glitter', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const MD = +g.match(/const float MOON_DARK = ([\d.]+), MOON_EW = (-?[\d.]+);/)[1], EW = +g.match(/MOON_EW = (-?[\d.]+);/)[1];
  const W = [...g.match(/const uint MOONA\[128\] = uint\[128\]\(([\s\S]*?)\);/)[1].matchAll(/0x([0-9a-f]{8})u/g)].map((m) => parseInt(m[1], 16));
  assert.equal(W.length, 128, 'the map: 128 words of 8 cells');
  assert.ok(g.includes('vec2 g = vec2(dot(n, E) * 16.0 + 15.5, 15.5 - dot(n, N) * 16.0), f = fract(g); ivec2 c = ivec2(floor(g));') && g.includes('return mix(MOON_DARK, 1.0, a);') && g.includes('mix(mix(moonCell(c.x, c.y), moonCell(c.x + 1, c.y), f.x), mix(moonCell(c.x, c.y + 1), moonCell(c.x + 1, c.y + 1), f.x), f.y)'), 'moonFace\'s bilinear read and light, as run here');
  const cell = (i, j) => { const k = Math.min(Math.max(j, 0), 31) * 32 + Math.min(Math.max(i, 0), 31); return ((W[k >> 3] >>> ((k & 7) * 4)) & 15) / 15; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const face = (n, m, pole) => {   // (moonFace, line for line)
    const N = norm(pole.map((p, i) => p - dot(pole, m) * m[i] + (i === 1 ? 1e-5 : 0))), E = cross(m, N).map((x) => x * EW);
    const gx = dot(n, E) * 16 + 15.5, gy = 15.5 - dot(n, N) * 16, fx = gx - Math.floor(gx), fy = gy - Math.floor(gy), cx = Math.floor(gx), cy = Math.floor(gy);
    const a = (cell(cx, cy) * (1 - fx) + cell(cx + 1, cy) * fx) * (1 - fy) + (cell(cx, cy + 1) * (1 - fx) + cell(cx + 1, cy + 1) * fx) * fy;
    return MD + (1 - MD) * a;
  };
  const m = norm([0.3, 0.25, 1]), pole = norm([0, 0.9, -0.44]);   // (the moon low in the south, the pole 64 deg up in the north)
  const N = norm(pole.map((p, i) => p - dot(pole, m) * m[i])), E = cross(m, N).map((x) => x * EW);
  const at = (la, lo) => { const L = la * Math.PI / 180, O = lo * Math.PI / 180; return [0, 1, 2].map((i) => -m[i] * Math.cos(L) * Math.cos(O) + E[i] * Math.cos(L) * Math.sin(O) + N[i] * Math.sin(L)); };
  const high = face(at(-45, 5), m, pole);   // (the southern highlands)
  for (const [nm, la, lo] of [['Imbrium', 34.7, -14.9], ['Serenitatis', 27.3, 18.4], ['Tranquillitatis', 8.4, 30.8], ['Crisium', 16.2, 59.1], ['Procellarum', 20, -50]]) {   // (the gazetteer's centres: https://planetarynames.wr.usgs.gov)
    const v = face(at(la, lo), m, pole); assert.ok(v < high - 0.2 * (1 - MD), `Mare ${nm} (${v.toFixed(3)}) not darker than the southern highlands (${high.toFixed(3)})`);
  }
  assert.ok(high > 0.85, `the southern highlands near the disc's own colour (${high.toFixed(3)})`);
  const R = 18, means = [], img = {};
  for (const ox of [0, 0.25, 0.5, 0.75]) for (const oy of [0, 0.25, 0.5]) {
    let s = 0, n = 0; const px1 = img[ox + ',' + oy] = new Map();
    for (let py = -R - 1; py <= R + 1; py++) for (let px = -R - 1; px <= R + 1; px++) {
      const x = (px + 0.5 - ox) / R, y = (py + 0.5 - oy) / R, d = Math.hypot(x, y); if (d >= 1) continue;
      const z = Math.sqrt(1 - d * d), t1 = norm(cross([0, 1, 0], m)), t2 = cross(m, t1), nn = [0, 1, 2].map((i) => x * t1[i] + y * t2[i] - z * m[i]);
      const v = face(nn, m, pole); s += v; n++; px1.set(px + ',' + py, v);
    }
    means.push(s / n);
  }
  let jump = 0; for (const [k, v] of img['0,0']) { const w = img['0.25,0'].get(k); if (w !== undefined) jump = Math.max(jump, Math.abs(v - w)); }
  assert.ok(jump <= 0.5 * (1 - MD), `a pixel's light jumps ${jump.toFixed(3)} as the disc slides a quarter pixel (at most half the face's contrast, ${(0.5 * (1 - MD)).toFixed(3)}): it would glitter`);
  const lo = Math.min(...means), hi = Math.max(...means);
  assert.ok((hi - lo) / hi < 0.02, `the disc's mean light swings ${(100 * (hi - lo) / hi).toFixed(2)}% as it slides (at most 2%)`);
  console.log(`# moon face: mean light ${lo.toFixed(3)}-${hi.toFixed(3)} of the disc's colour, the darkest at ${MD}, a pixel's largest jump a quarter pixel on ${jump.toFixed(3)}`);
});

// the air's extinction (NIGHT, the hub's item of 2026-11-25): a star k (X - 1) magnitudes dimmer through X airmasses (the
// revised relative optical air mass, https://doi.org/10.1364/AO.28.004735, as pvlib/atmosphere.py writes it), k in V 0.15
// (La Palma's typical, https://www.ing.iac.es/Astronomy/observing/manuals/html_manuals/wht_instr/pfip/node244.html); the
// shader's lines run here as JS: the flux against elevation follows 10^(-0.4 k X) (as a ratio to the zenith's, X 1), the
// count of stars shown by elevation band falls toward the horizon (the faint first), nothing ever brighter than overhead
test('night: the stars (and the moon) dimmed by airmass, the faint ones gone first low down', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  for (const L of ['const float EXT_V = 0.15; const vec3 EXT_K = EXT_V * vec3(0.07, 0.11, 0.20) / 0.11;',
    'float airmass(float y) { float h = max(degrees(asin(clamp(y, 0.0, 1.0))), 0.0); return 1.0 / (sin(radians(h)) + 0.50572 * pow(h + 6.07995, -1.6364)); }',
    'float sX = airmass(sw.y), sx = EXT_V * max(sX - 1.0, 0.0);', 'float bk = nightShow(starMag(b) + sx, ml);', 'b *= exp2(-0.4 * 3.3219281 * sx);',
    'float mX = airmass(uMoon.y); vec3 mC = extTint(uMoonC, mX) * exp2(-0.4 * 3.3219281 * EXT_V * max(mX - 1.0, 0.0));',
    'float starMag(float b) { return 6.2 - 4.0 * log(b / 0.07) / log(10.0); }', 'float nightShow(float m, float ml) { return clamp((ml - m) / 0.5, 0.0, 1.0); }'])
    assert.ok(g.includes(L), `sky-body.glsl no longer holds, as run here: ${L}`);
  const k = 0.15, X = (h) => 1 / (Math.sin(h * Math.PI / 180) + 0.50572 * Math.pow(h + 6.07995, -1.6364));
  // the formula: sec z where the plane-parallel air holds (within 0.5% above 30 deg), finite at the horizon (about 38)
  for (const h of [30, 45, 60, 90]) assert.ok(Math.abs(X(h) * Math.sin(h * Math.PI / 180) - 1) < 0.005, `X(${h}) ${X(h)} against sec z`);
  assert.ok(X(0) > 35 && X(0) < 40 && X(90) > 0.999 && X(90) <= 1, `X(0) ${X(0)}, X(90) ${X(90)}`);
  const mag = (b) => 6.2 - 4 * Math.log10(b / 0.07), show = (m, ml) => Math.max(0, Math.min(1, (ml - m) / 0.5));
  const flux = (b, h, ml) => { const sx = k * Math.max(X(h) - 1, 0); return b * show(mag(b) + sx, ml) * Math.pow(2, -0.4 * 3.3219281 * sx); };
  // a bright star (b 1, magnitude 1.6) against elevation: its flux over the zenith's is 10^(-0.4 k X) / 10^(-0.4 k), to 1e-6
  let worst = 0;
  for (let h = 3; h <= 90; h += 1) { const r = flux(1, h, 7) / flux(1, 90, 7), want = Math.min(1, Math.pow(10, -0.4 * k * X(h)) / Math.pow(10, -0.4 * k)); worst = Math.max(worst, Math.abs(r - want) / want); assert.ok(r <= 1 + 1e-12, `brighter at ${h} deg than overhead`); }
  assert.ok(worst < 1e-6, `the flux against elevation off 10^(-0.4 k X) by ${worst}`);
  // the field (b = 0.95 u^6 + 0.07, u uniform: starAt's draw) on a dark night (the limit 7): the share shown by band
  const bands = [[2, 5], [5, 10], [10, 20], [20, 40], [40, 90]], share = bands.map(([a, z]) => {
    let s = 0, n = 0; for (let h = a; h < z; h += 0.25) for (let i = 0; i < 400; i++) { const b = 0.95 * Math.pow((i + 0.5) / 400, 6) + 0.07; s += show(mag(b) + k * Math.max(X(h) - 1, 0), 7) > 0 ? 1 : 0; n++; } return s / n; });
  for (let i = 1; i < share.length; i++) assert.ok(share[i - 1] < share[i] || share[i] === 1 && share[i - 1] === 1, `the stars shown by band (${bands.map((b) => b.join('-')).join(', ')} deg): ${share.map((v) => v.toFixed(3)).join(', ')}: not falling toward the horizon`);
  assert.equal(share[4], 1, 'every star of the field overhead');
  assert.ok(share[0] < 0.6, `low down (2-5 deg) ${share[0].toFixed(3)} of the field still shows`);
  console.log(`# extinction: k ${k}, X(5) ${X(5).toFixed(2)}, X(20) ${X(20).toFixed(2)}; stars shown by band ${bands.map((b) => b.join('-')).join(', ')} deg: ${share.map((v) => v.toFixed(3)).join(', ')}`);
});

// moonlight washes out the stars (NIGHT, the hub's pick of 2026-11-25): the moonlit sky's brightness at each direction by the
// published moonlight model (https://doi.org/10.1086/132921; its equations as specsim/atmosphere.py writes them), over the
// dark sky (V 21.8), the naked eye's limit falling 0.3834 per magnitude the sky brightens (https://arxiv.org/abs/1405.4209,
// eq. 54); the shader's moonLim run here as JS: the limit follows the relation, the stars shown rise outward from the moon,
// nothing on a moonless night changes, and the limit never rises
test('night: moonlight washes out the faint stars, most beside the moon', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  for (const L of ['const float MLIM_K = 0.3834, SKY_DARK_V = 21.8;', 'if (uMoon.w <= 0.0) return 0.0;',
    'float m = -12.73 + 0.026 * MOON_PHASE + 4e-9 * pow(MOON_PHASE, 4.0), I = pow(10.0, -0.4 * (m + 16.57));',
    'float f = pow(10.0, 5.36) * (1.06 + cr * cr) + pow(10.0, 6.15 - rho / 40.0);',
    'float zo = clamp(rd.y, 0.0, 1.0), zm = clamp(uMoon.y, 0.0, 1.0), Xo = inversesqrt(1.0 - 0.96 * (1.0 - zo * zo)), Xm = inversesqrt(1.0 - 0.96 * (1.0 - zm * zm));',
    'float Bm = f * I * pow(10.0, -0.4 * EXT_V * Xm) * (1.0 - pow(10.0, -0.4 * EXT_V * Xo));',
    'float B0 = 34.08 * exp(20.7233 - 0.92104 * SKY_DARK_V) * pow(10.0, -0.4 * EXT_V * (Xo - 1.0)) * Xo;',
    'return -MLIM_K * 2.5 * log(1.0 + uMoon.w * Bm / B0) / log(10.0);', 'float ml = nightLim(c - gL) + moonLim(rd);',
    'const float MOON_PHASE = 15.0;', 'const float EXT_V = 0.15;'])
    assert.ok(g.includes(L), `sky-body.glsl no longer holds, as run here: ${L}`);
  const k = 0.15, PH = 15, rad = Math.PI / 180;
  const nL = (V) => 34.08 * Math.exp(20.7233 - 0.92104 * V), Vof = (B) => (20.7233 - Math.log(B / 34.08)) / 0.92104;   // (the model's eq. 1 and its inverse)
  const X = (cz) => 1 / Math.sqrt(1 - 0.96 * (1 - cz * cz));
  const parts = (d, moon, w) => {   // d, moon: unit vectors (y up); [B0, Bmoon] in nL
    const m = -12.73 + 0.026 * PH + 4e-9 * PH ** 4, I = 10 ** (-0.4 * (m + 16.57)), cr = Math.max(-1, Math.min(1, d[0] * moon[0] + d[1] * moon[1] + d[2] * moon[2])), rho = Math.acos(cr) / rad;
    const f = 10 ** 5.36 * (1.06 + cr * cr) + 10 ** (6.15 - rho / 40), Xo = X(Math.max(0, d[1])), Xm = X(Math.max(0, moon[1]));
    return [nL(21.8) * 10 ** (-0.4 * k * (Xo - 1)) * Xo, w * f * I * 10 ** (-0.4 * k * Xm) * (1 - 10 ** (-0.4 * k * Xo))];
  };
  const lim = (d, moon, w) => { const [B0, Bm] = parts(d, moon, w); return -0.3834 * 2.5 * Math.log10(1 + Bm / B0); };
  // the relation: the limit's shift is 0.3834 times the sky's change in mag/arcsec^2 (the cited eq. 54's slope), within 1e-3 mag
  // (eq. 1's 0.92104 against 0.4 ln 10)
  const moon = [0, Math.sin(30 * rad), Math.cos(30 * rad)];   // (the moon 30 deg up in the south)
  for (const [az, el] of [[0, 40], [90, 20], [180, 60], [30, 35], [-60, 10]]) {
    const d = [Math.sin(az * rad) * Math.cos(el * rad), Math.sin(el * rad), Math.cos(az * rad) * Math.cos(el * rad)], [B0, Bm] = parts(d, moon, 1);
    const want = 0.3834 * (Vof(B0 + Bm) - Vof(B0));
    assert.ok(Math.abs(lim(d, moon, 1) - want) < 1e-3, `the limit's shift ${lim(d, moon, 1)} off the relation's ${want} at az ${az}, el ${el}`);
    assert.ok(lim(d, moon, 1) <= 0 && lim(d, moon, 0) === 0, 'a limit raised by the moon, or moved on a moonless night');
  }
  // the dark sky's own value: the model's eq. 1 at V 21.8 (its dark night sky, about V 21.8-22.0) near 65 nL
  assert.ok(Math.abs(nL(21.8) - 64.9) < 0.5, `nL(21.8) ${nL(21.8)}`);
  // the field (b = 0.95 u^6 + 0.07, starAt's draw) shown at a dark night's limit 7 plus the moon's shift, by angle from the moon
  const mag = (b) => 6.2 - 4 * Math.log10(b / 0.07);
  const shown = (ml) => { let s = 0; for (let i = 0; i < 2000; i++) { const b = 0.95 * ((i + 0.5) / 2000) ** 6 + 0.07; s += mag(b) < ml ? 1 : 0; } return s / 2000; };
  const ring = (r) => {   // the mean share over a ring r deg from the moon, above 10 deg
    let s = 0, n = 0;
    for (let a = 0; a < 360; a += 5) {
      const u = [1, 0, 0], v = [0, Math.cos(30 * rad), -Math.sin(30 * rad)], d = [0, 1, 2].map((i) => moon[i] * Math.cos(r * rad) + (u[i] * Math.cos(a * rad) + v[i] * Math.sin(a * rad)) * Math.sin(r * rad));
      if (d[1] < Math.sin(10 * rad)) continue; s += shown(7 + lim(d, moon, 1)); n++;
    }
    return s / n;
  };
  const R = [5, 15, 30, 60, 90], share = R.map(ring);
  for (let i = 1; i < R.length; i++) assert.ok(share[i] > share[i - 1], `the stars shown by angle from the moon (${R.join(', ')} deg): ${share.map((v) => v.toFixed(3)).join(', ')}: not rising outward`);
  assert.ok(share[0] < 0.6 * shown(7), `beside the moon ${share[0].toFixed(3)} of the field still shows (a dark night: ${shown(7).toFixed(3)})`);
  console.log(`# moon limit: stars shown ${R.map((r, i) => `${r} deg ${share[i].toFixed(3)}`).join(', ')}; a dark night ${shown(7).toFixed(3)}; the limit beside the moon ${(7 + lim([0, Math.sin(35 * rad), Math.cos(35 * rad)], moon, 1)).toFixed(2)}`);
});

test('physics: Looks: the aerosol keeps the look\'s amount, and takes its colour by wavelength, green\'s extinction that amount (aerU)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/world/370-frame-uniforms.js'), 'utf8');
  const a = src.indexOf('  var AER_RH'), b = src.indexOf('  function setFrameUniforms', a);
  assert.ok(a > 0 && b > a, 'aerU not found in 370');
  const code = src.slice(a, b) + '\n  this.aerU = aerU;';
  const WX = { vis: 10, moist: 0, dust: 0 }, got = [];
  const ctx = { Math, Float32Array, SIM: { t: 0 }, airWx: () => WX, AIR_WXK: { vis: [10, 4] }, gl: { uniform4fv: (u, v) => got.push(Array.from(v)) } };
  vm.runInNewContext(code, ctx);
  // green's extinction is the amount's: the wavelength factor is exactly 1 at 550 nm
  const g = fs.readFileSync(path.join(ROOT, 'src/world/glsl/lib-air.glsl'), 'utf8');
  assert.ok(g.includes('m * pow(vec3(680.0, 550.0, 440.0) / 550.0, vec3(-uAer.w))'), 'the aerosol\'s wavelength factor is not normalised at 550 nm (green would move off the look\'s amount)');
  const cases = [{ vis: 10, moist: 0, dust: 0 }, { vis: 4, moist: 0, dust: 1 }, { vis: 10, moist: 1, dust: 0 }, { vis: 7, moist: 0.5, dust: 0.5 }];
  let t = 0;
  for (const c of cases) {
    Object.assign(WX, c); ctx.SIM.t = ++t;
    ctx.aerU({ uAer: 1 }, {});
    const U = got[got.length - 1], rh = 0.3 + 0.6 * c.moist, gr = Math.pow((1 - rh) / 0.7, -0.3), main = 10 / c.vis * gr;   // (the amount as main sets it: the look's baseline over the visit's vis, times the growth)
    assert.ok(Math.abs(U[0] - main) / main < 1e-6, `the aerosol's amount ${U[0]} is not the look's ${main} (vis ${c.vis} km, growth ${gr.toFixed(2)})`);
    assert.ok(U[3] >= 0 && U[3] <= 1.5, 'the wavelength exponent ' + U[3] + ' outside the measured 0-1.5');
    if (c.dust === 0 && c.moist === 0) assert.ok(Math.abs(U[3] - 1.3) < 1e-6, 'clean dry air: alpha ' + U[3] + ', not the continental 1.3');
    if (c.dust === 1) assert.ok(U[3] <= 0.31, 'blown dust: alpha ' + U[3] + ' (desert dust 0-0.5)');
  }
});

// (night, the hub's ruling of Nov 25: the evening star at its true scale) a planet's light on the stars' own energy scale:
// Venus (-4.4) 15x a -1.46 star's within 10%, the air keeping 21% of it at 4 deg up; its core as wide as that light asks,
// sigma 0.85-1.4 px (never a disc), its peak at its head (never over the light's ceiling)
test('night: the evening star at its true scale: 15x Sirius, 21% kept at 4 deg, a steady core up to sigma 1.4 at its head', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const STF = +/const float STF = ([\d.]+);/.exec(g)[1], EXT = +/const float EXT_V = ([\d.]+);/.exec(g)[1];
  const PS = /const float PL_SIRIUS = ([\d.]+) \* ([\d.]+) \* STF;/.exec(g); assert.ok(PS, 'PL_SIRIUS on the stars\' scale');
  const sirB = 0.07 * Math.pow(10, (6.2 + 1.46) / 4); assert.ok(Math.abs(+PS[1] * +PS[2] - sirB) / sirB < 1e-3, `PL_SIRIUS's b ${+PS[1] * +PS[2]} is a -1.46 star's on starMag (${sirB.toFixed(3)})`);
  assert.ok(g.includes('float planetE(float m, float y) { return PL_SIRIUS * exp2(-0.4 * 3.3219281 * (m + 1.46 + EXT_V * max(airmass(y) - 1.0, 0.0))); }'), 'planetE: the true light, the air taken from it');
  const am = (y) => { const h = Math.max(Math.asin(Math.min(Math.max(y, 0), 1)) * 180 / Math.PI, 0); return 1 / (Math.sin(h * Math.PI / 180) + 0.50572 * Math.pow(h + 6.07995, -1.6364)); };
  const E = (m, deg) => sirB * STF * Math.pow(10, -0.4 * (m + 1.46 + EXT * Math.max(am(Math.sin(deg * Math.PI / 180)) - 1, 0)));
  const r = E(-4.4, 90) / (sirB * STF); assert.ok(Math.abs(r - 15) / 15 < 0.1, `Venus overhead ${r.toFixed(2)}x a -1.46 star's light (15 within 10%)`);
  const kept = E(-4.4, 4) / E(-4.4, 90); assert.ok(Math.abs(kept - 0.21) < 0.02, `at 4 deg the air keeps ${(100 * kept).toFixed(1)}% (21%)`);
  // drawn: the core as wide as the light asks, at its head; on every sky Venus's light asks more than sigma 1.4 at its head holds
  const top = 0.118, draw = (m, deg, sky) => { const hv = Math.max(top - sky, 0), e = E(m, deg), sg = Math.min(Math.max(Math.sqrt(e / Math.max(1.1 * 2 * Math.PI * hv, 1e-6)), 0.85), 1.4); return { sg, F: Math.min(e, 1.1 * 2 * Math.PI * hv * sg * sg), hv }; };
  for (const deg of [4, 17, 45, 90]) for (const sky of [0.002, 0.05, 0.09]) {
    const d = draw(-4.4, deg, sky); assert.ok(d.sg === 1.4, `Venus at ${deg} deg on sky Y ${sky}: sigma ${d.sg.toFixed(2)} (its light fills sigma 1.4 at its head)`);
    assert.ok(d.sg <= 1.4 && d.F <= 1.1 * 2 * Math.PI * d.hv * 1.96 + 1e-12, 'never a disc, never over its head');
  }
  const STOP = +/STAR_TOP_Y = ([\d.]+)/.exec(WORLD)[1]; assert.ok(top > STOP, 'Venus\'s head over the stars\' top: the brightest point');
});

// (physics: night/extinction) a meteor, 80-120 km up, is seen through the same air as the stars: k (X - 1) magnitudes from
// its light at its head's height, a little redder; nothing overhead changes, never brighter, still capped at its head
test('night: a meteor loses the air\'s extinction low down, as the stars do (and stays under its head)', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8'), M = g.match(/^vec3 meteorAt[\s\S]*?^}/m);
  assert.ok(M, 'meteorAt');
  assert.ok(M[0].includes('  float mX = airmass(uMetH.y);') && M[0].includes('return extTint(uMetC, mX) * min(v * exp2(-0.4 * 3.3219281 * EXT_V * max(mX - 1.0, 0.0)), max(MET_TOP - dot(c, LUMA), 0.0));'), 'the meteor\'s light dimmed and reddened by the air at its head\'s height, then capped at its head');
  const am = (y) => { const h = Math.max(Math.asin(Math.min(Math.max(y, 0), 1)) * 180 / Math.PI, 0); return 1 / (Math.sin(h * Math.PI / 180) + 0.50572 * Math.pow(h + 6.07995, -1.6364)); };
  const EXT = +/const float EXT_V = ([\d.]+);/.exec(g)[1], kept = (deg) => Math.pow(10, -0.4 * EXT * Math.max(am(Math.sin(deg * Math.PI / 180)) - 1, 0));
  assert.ok(kept(90) > 0.999 && Math.abs(kept(10) - 0.53) < 0.03 && kept(5) < kept(10) && kept(30) < 1, `a meteor's light kept: ${kept(90).toFixed(3)} overhead, ${kept(10).toFixed(2)} at 10 deg, ${kept(5).toFixed(2)} at 5`);
});

// the great comet (NIGHT, delight-night §6, the hub's item of 2026-11-25): 227's cometOn, cometPlan, cometDir and
// cometTail run here as the page runs them (venusWorld): it stands in 1 or 2 of the 16 openings' seeds (COM_K: the two
// whose twilight views face the sun's side), on a twilight opening only; its ion tail lies along the great circle from the sun through its head, away from the sun, within 2 deg
// at every depth the sun sinks through; the dust tail curves off it by design (0.35 x^2: 3 deg at its end)
test('night: the great comet, in 1-2 of the 16 openings, on twilight only, its tail away from the sun', () => {
  const on = [];
  for (let k = 0; k < 16; k++) { const s = (11 + k * 0x9e3779b9) >>> 0; if (venusWorld(s, 0, { sky: 'afterglow' }).cometOn(s)) on.push(k); }
  assert.ok(on.length >= 1 && on.length <= 2, `the comet in openings ${on.join(', ')} of 16 (1 or 2)`);
  const SW = JSON.parse(/var STILL_WORDS = (\{.*?\});/.exec(WORLD)[1]), key = Object.keys(SW).find((k) => /^hi-1728x1080$/.test(k)) || Object.keys(SW).find((k) => /x1080$/.test(k));
  const [Wd, Hd] = key.split('-')[1].split('x').map(Number), tanY = Math.tan(32 * Math.PI / 180);
  let planned = 0, worst = 0, away = true, nonTw = 0;
  for (const k of on) for (let a = 0; a < 12; a++) for (const sky of ['afterglow', 'bluehour', 'firstlight', 'moonlit', 'milkyway', 'aurora']) {
    const s = (11 + k * 0x9e3779b9) >>> 0, keyAz = (a * 30 + 7) % 360, K = venusWorld(s, keyAz, { sky });
    const I = { W: Wd, H: Hd, tanY, tanX: tanY * Wd / Hd, pN: 8, pL: 8, keepPx: 12, boxes: SW[key], psi: keyAz + (sky === 'firstlight' ? 1 : -1) * 25 };
    K.venusPlan(K.V, I);
    const twi = sky === 'afterglow' || sky === 'bluehour' || sky === 'firstlight';
    if (!twi) { if (K.COMB.eps >= 0) nonTw++; continue; }
    if (K.COMB.eps < 0) continue;
    planned++;
    const N = K.NIGHTB, F = K.venusFrame(K.V, N.morning, N.D0);
    for (let D = N.D0; D <= 24; D += 1) {
      const h = K.cometDir(F, K.COMB.eps, N.side, K.COMB.b, D, N.D0, [0, 0, 0]), S = K.airSkySun(K.V, -D), T = K.cometTail(h, S, [0, 0, 0]);
      const n = [S[1] * h[2] - S[2] * h[1], S[2] * h[0] - S[0] * h[2], S[0] * h[1] - S[1] * h[0]], nl = Math.hypot(...n);
      let prev = -2;
      for (let x = 1; x <= K.COM_L; x += 1) {
        const t = Math.tan(x * Math.PI / 180), p = [0, 1, 2].map((i) => h[i] + T[i] * t), pl = Math.hypot(...p);
        const off = Math.asin(Math.abs((p[0] * n[0] + p[1] * n[1] + p[2] * n[2]) / (pl * nl))) * 180 / Math.PI, fromS = Math.acos((p[0] * S[0] + p[1] * S[1] + p[2] * S[2]) / pl);
        worst = Math.max(worst, off); if (fromS <= prev) away = false; prev = fromS;
      }
    }
  }
  assert.equal(nonTw, 0, `a comet on ${nonTw} non-twilight openings`);
  assert.ok(planned > 0, 'no comet planned on any twilight opening of its seeds (the test is not empty)');
  assert.ok(worst < 2, `the ion tail ${worst.toFixed(3)} deg off the great circle from the sun through its head (within 2)`);
  assert.ok(away, 'the tail runs toward the sun somewhere');
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  for (const L of ['float x = dot(p, uComT.xyz), y = dot(p, cross(uCom.xyz, uComT.xyz)), pa = 2.0 * atan(uProj.y) / uRes.y;',
    'float io = xf * exp(-x / 0.25 - y * y / (wi * wi)), du = xf * exp(-x / 0.3 - yd * yd / (wd * wd));', 'vec3 p = rd / z - uCom.xyz;'])
    assert.ok(g.includes(L), `sky-body.glsl's comet no longer drawn as tested: ${L}`);
  console.log(`# comet: openings ${on.join(', ')} of 16; planned on ${planned} of ${on.length * 12 * 3} twilight cases; the ion tail at most ${worst.toFixed(4)} deg off the anti-sun great circle`);
});

test('sky: every noise read by azimuth wraps whole round the sky (no seam at azimuth 180)', () => {
  /* the wisps (both blocks) read the 3D noise by q.x = atan(rd.x, rd.z) / SKYTAU * K; the noise repeats every 1, so a read
     at q.x x m x s jumps by K m s at azimuth 180 and is seamless only when that is a whole number. Their 14 x 0.25 (3.5)
     drew a hard vertical edge in the blue hour's sky (8 codes over one column: the #489 base frame's box) */
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const blocks = [...g.matchAll(/vec2 q = vec2\(atan\(rd\.x, rd\.z\) \/ SKYTAU \* ([\d.]+),/g)];
  assert.ok(blocks.length >= 2, `the wisps' azimuth reads not found (${blocks.length})`);
  for (const B of blocks) {
    const K = +B[1], body = g.slice(B.index, g.indexOf('\n  }', B.index));
    const reads = [...body.matchAll(/textureLod\(uN3, vec3\(q\.x(?: \* ([\d.]+))?, [^)]*\) \* ([\d.]+), /g)].map((m) => K * (m[1] ? +m[1] : 1) * +m[2])
      .concat([...body.matchAll(/n3v\(vec3\(q\.x(?: \* ([\d.]+))?, /g)].map((m) => K * (m[1] ? +m[1] : 1)));
    assert.ok(reads.length >= 2, `a wisps block reads the noise by q.x ${reads.length} times (want 2)`);
    for (const r of reads) assert.ok(Math.abs(r - Math.round(r)) < 1e-9, `a read ${r} periods round the sky: a seam at azimuth 180`);
  }
});
