// test/unit/aurora.mjs: the aurora by its physics (the hub's spec, physics: aurora): one sheet D km toward the key, its
// colour by altitude, its motion at real speeds, its light under the words' floor; sky-body.glsl's own lines run here
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "a2 = SKYTAU * s / 40.0 - 0.157 * uT", "with": "a2 = SKYTAU * s / 40.0 - 1.57 * uT", "why": "folds ten times too fast: they would glitter"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "vec3(0.9, 0.1, 0.06) * r *", "with": "vec3(0.85, 0.25, 0.55) * r *", "why": "the old magenta top: mauve over the h 250 sky"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "var AUR_IN = 64, AUR_OUT = 80", "with": "var AUR_IN = 40, AUR_OUT = 80", "why": "the aurora rises over 40 s: 0.45 deg/s at its fastest"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "AUR_FRONT = 2.2;", "with": "AUR_FRONT = 22;", "why": "the breakup's front ten times too fast"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float fa = mix(3.0, 9.0, b)", "with": "float fa = mix(3.0, 30.0, b)", "why": "a breakup's folds 30 km deep (8-10)"}
import { test, assert, fs, path, ROOT, WORLD, cut } from '../unit-lib.mjs';

// ------------------------------------------------------------------ OKLab (the world's own matrices, 030-colour.js)
const oklab2lin = (L, a, b) => {
  let l = L + 0.3963377774 * a + 0.2158037573 * b, m = L - 0.1055613458 * a - 0.0638541728 * b, s = L - 0.0894841775 * a - 1.2914855480 * b;
  l **= 3; m **= 3; s **= 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
};
const lin2lab = (c) => {
  const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]), m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]), s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
};
const lch = (L, C, h) => { const r = h * Math.PI / 180; return oklab2lin(L, C * Math.cos(r), C * Math.sin(r)).map((x) => Math.max(x, 0)); };
const LCh = (c) => { const o = lin2lab(c); return [o[0], Math.hypot(o[1], o[2]), (Math.atan2(o[2], o[1]) * 180 / Math.PI + 360) % 360]; };

// ------------------------------------------------------------------ the aurora sky as 220 defines it
const line = cut(WORLD, '    aurora: { ', '\n');
const SKY = new Function('return ' + line.trim().replace(/^aurora:\s*/, '').replace(/,\s*$/, ''))();
const SKYE = JSON.parse(WORLD.match(/SKYE_W = (\[[^\]]*\])/)[1]);

// ------------------------------------------------------------------ the shader's own lines
const GLSL = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
const AUR = GLSL.slice(GLSL.indexOf('vec3 auroraSheet('), GLSL.indexOf('#endif', GLSL.indexOf('vec3 auroraAt(')));   // (the sheet and its night's)
const num = (re, what) => { const m = AUR.match(re); assert.ok(m, `auroraAt's ${what} not found (${re})`); return m.slice(1).map(Number); };
const R = 6371, DEG = Math.PI / 180;
const [eb0, eb1, eb2] = num(/float eb = radians\(mix\((-?[\d.]+), mix\((-?[\d.]+), (-?[\d.]+), uAurB\.x\), uAur\.x\)\);/, 'border elevation');
const [h0D] = num(/float D = 6371\.0 \* \(acos\(cos\(eb\) \/ \(1\.0 \+ ([\d.]+) \/ 6371\.0\)\) - eb\);/, 'distance from the border');
assert.ok(AUR.includes('float h = 6371.0 * (cos(el) / cos(ee) - 1.0)') && AUR.includes('float ee = el + rho / 6371.0;'), 'auroraAt\'s altitude is not the spherical h = R (cos e / cos(e + rho / R) - 1)');
const [sA, sL, sW] = num(/y = ([\d.]+) \* sin\(a1\)/, 'swell amplitude').concat(num(/float a1 = SKYTAU \* s \/ ([\d.]+) \+ ([\d.]+) \* uT/, 'swell'));
const [fL, fW] = num(/a2 = SKYTAU \* s \/ ([\d.]+) - ([\d.]+) \* uT/, 'folds');
const [fA, fAB] = num(/float fa = mix\(([\d.]+), ([\d.]+), b\) \* smoothstep\(8\.0, 16\.0, 40\.0/, 'fold amplitude');
const [rP, rP2] = num(/n3v\(vec3\(s \/ ([\d.]+) \+ uT \/ ([\d.]+),/, 'rays');
const [gC] = [num(/vec3\((-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\) \* g \* min/, 'green')];
const [rC] = [num(/\+ vec3\((-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\) \* r \* min/, 'red')];
const [K] = num(/min\(1\.0 \/ max\(cps, 1e-3\), 3\.0\)\) \* ([\d.]+);\n\}/, 'strength');
const [Ym] = num(/c \*= yl > 1e-6 \? ([\d.]+) \* \(1\.0 - exp\(-yl \/ ([\d.]+)\)\) \/ yl/, 'cap');
const Dof = (rise, p = 0) => { const eb = (eb0 + (eb1 + (eb2 - eb1) * p - eb0) * rise) * DEG; return R * (Math.acos(Math.cos(eb) / (1 + h0D / R)) - eb); };
const hAt = (e, rho) => R * (Math.cos(e) / Math.cos(e + rho / R) - 1);
const eFor = (h, rho) => { let lo = -0.4, hi = 1.4; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (hAt(m, rho) < h) lo = m; else hi = m; } return lo / DEG; };
const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const green = (h, ry, b = 0) => ss(103, 109, h) * Math.exp(-Math.max(h - 109, 0) / (15 + (20 + 35 * b) * ry)) * (0.75 + 0.5 * ry) * (1 + 0.5 * b), red = (h) => ss(180, 230, h) * Math.exp(-Math.max(h - 230, 0) / 60) * 0.2;
assert.ok(AUR.includes('smoothstep(103.0, 109.0, h) * exp(-max(h - 109.0, 0.0) / mix(15.0, mix(35.0, 70.0, b), ry)) * (0.75 + 0.5 * ry) * (1.0 + 0.5 * b)') && AUR.includes('smoothstep(180.0, 230.0, h) * exp(-max(h - 230.0, 0.0) / 60.0) * 0.2 * (1.0 + 1.5 * bk'), 'auroraAt\'s emission by altitude is not the one this test models');

test('physics: aurora/geometry: the border where the spherical formula puts it, the sheet at infinity and rising slowly', () => {
  for (const rise of [0.25, 0.5, 0.75, 1]) {
    const eb = eb0 + (eb1 - eb0) * rise, e = eFor(h0D, Dof(rise));
    assert.ok(Math.abs(e - eb) < 0.05, `rise ${rise}: the border (h ${h0D} km) stands at ${e.toFixed(3)} deg, not ${eb.toFixed(3)} (+-0.05)`);
  }
  assert.ok(Math.abs(eFor(h0D, 650) - 6.17) < 0.05 && Math.abs(eFor(h0D, 500) - 9.51) < 0.05, 'the spherical formula itself (D 650 -> 6.2 deg, 500 -> 9.5)');
  assert.ok(Math.abs(Dof(0) - 1950) < 5 && Math.abs(Dof(1) - 650) < 5 && Math.abs(Dof(1, 1) - 500) < 5, `the sheet comes in from ${Dof(0).toFixed(0)} km to ${Dof(1).toFixed(0)}, drifts to ${Dof(1, 1).toFixed(0)} (1950, 650, 500: physics: aurora/phases)`);
  // growth: at rise 0+ nothing of it (red's 300 km included) stands over 0.5 deg (its rate: the phases' test below)
  const D0 = Dof(0.001), eTop = eFor(300, D0);
  assert.ok(eTop < 0.5 || (green(hAt(0.5 * DEG, D0), 1) + red(hAt(0.5 * DEG, D0))) < 2e-3, `as it begins, 300 km stands at ${eTop.toFixed(2)} deg: it would show at once`);
});

test('physics: aurora/motion: every motion at real speeds, under the pixel limits (no glitter)', () => {
  // the swell's and folds' speeds along the sheet (km/s) from their wavelengths and phase rates; the rays' 1 km/s
  const vS = sW * sL / (2 * Math.PI), vF = fW * fL / (2 * Math.PI), vR = rP / rP2;
  assert.ok(Math.abs(vS - 0.3) < 0.02 && sA === 15 && sL === 500, `the swell: ${sA} km, ${sL} km, ${vS.toFixed(3)} km/s (15, 500, 0.3)`);
  assert.ok(Math.abs(vF - 1) < 0.05 && fA === 3 && fAB >= 8 && fAB <= 10 && fL === 40, `the folds: ${fA} km (${fAB} in a breakup), ${fL} km, ${vF.toFixed(3)} km/s (3, 8-10, 40, 1)`);
  assert.ok(vR >= 0.5 && vR <= 2 && rP >= 8, `the rays: ${rP} km a period at ${vR} km/s (at least 8 km, at most 2 km/s)`);
  for (const pxDeg of [0.0578, 0.0376]) for (const D of [500, 650]) {
    const px = (v) => v / D / DEG / 60 / pxDeg;   // pixels a frame, along the sheet at its nearest
    assert.ok(px(vF) <= 0.25 && px(vR) <= 0.25, `at ${pxDeg} deg/px, D ${D}: folds ${px(vF).toFixed(3)}, rays ${px(vR).toFixed(3)} px a frame (at most 0.25)`);
    assert.ok(px(vS) <= 0.5, `the swell ${px(vS).toFixed(3)} px a frame (at most 0.5)`);
    assert.ok(vS / D / DEG <= 0.05 && vF / D / DEG <= 0.15, `the swell ${(vS / D / DEG).toFixed(3)} and folds ${(vF / D / DEG).toFixed(3)} deg/s (today's were 1.0-1.15)`);
    // the rays at least 4 px a period wherever they can show (h at most 300 km: rho at most where 300 km meets the horizon)
    const rhoMax = R * Math.acos(1 / (1 + 300 / R)), perPx = rP / rhoMax / DEG / pxDeg;
    assert.ok(perPx >= 4, `the rays are ${perPx.toFixed(1)} px a period at their farthest (at least 4)`);
  }
  assert.ok(!/pulse|flicker|corona/.test(AUR.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'auroraAt pulses or flickers');
});

test('physics: aurora/colour: the green hem, no stop in the saddle, the red top, under the words\' floor', () => {
  const [, , hG] = LCh(gC), [, , hR] = LCh(rC);
  assert.ok(hG >= 140 && hG <= 150, `the green hem is h ${hG.toFixed(1)} (557.7 nm: 140-150)`);
  assert.ok(hR >= 20 && hR <= 40, `the red top is h ${hR.toFixed(1)} (630 nm: 20-40)`);
  assert.ok(green(170, 0) < 0.15 && red(170) < 0.002, 'the saddle (150-190 km) carries a colour of its own');
  // composited over the aurora sky at the border's height, at its centre (seen face on) and its ends (edge-on, x3), rays at their most
  const sky = SKY.sky.map((c) => lch(...c)), mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
  const skyAt = (e) => { let c = mix(sky[1], sky[2], ss(0, SKYE[0], e)); c = mix(c, sky[3], ss(SKYE[0], SKYE[1], e)); return mix(c, lch(...SKY.skyW), SKY.skyK[0] * Math.exp(-e / SKY.skyK[1])); };
  const Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const comp = (e, emis, proj) => {
    let a = emis.map((x) => x * proj * K); const yl = Y(a); a = a.map((x) => x * (yl > 1e-6 ? Ym * (1 - Math.exp(-yl / Ym)) / yl : 1));
    let c = skyAt(e).map((v, i) => v + a[i]); const y = Y(c); c = c.map((x) => Math.max(y + (x - y) * SKY.post.sat, 0));
    let [L] = LCh(c); const knee = +WORLD.match(/var CEIL_KNEE = ([\d.]+),/)[1], Kc = SKY.ceil - knee;
    if (L > Kc) { const k = Math.pow((Kc + knee * (1 - Math.exp(-(L - Kc) / knee))) / L, 3); c = c.map((x) => x * k); }
    return [c, LCh(c)];
  };
  const pk = gC.map((x) => x * green(109, 1)), word = 0.82;
  for (const proj of [1, 3]) {
    const [c, [L, , h]] = comp(7, pk, proj);
    assert.ok(L <= 0.50 + 1e-9, `the green's composited peak (x${proj}) is L ${L.toFixed(3)} (at most 0.50: the words' floor)`);
    assert.ok(h >= 140 && h <= 170, `the green's composited peak (x${proj}) is h ${h.toFixed(0)} (green: 140-170)`);
    const cr = (word + 0.05) / (Y(c) + 0.05);
    assert.ok(cr >= 4.6, `the credit over the green's peak (x${proj}) is ${cr.toFixed(2)}:1 (at least 4.6)`);
  }
  const [, [, Cs]] = comp(9, gC.map((x) => x * green(170, 1)), 1);
  assert.ok(Cs >= 0.035, `the saddle composites to C ${Cs.toFixed(3)} (the sky's own blue: at least 0.035)`);
});

test('aurora: its sky is near neutral where the arc stands, so the arc is the green in it', () => {
  for (let i = 0; i < 4; i++) assert.ok(SKY.sky[i][1] <= 0.05, `the aurora sky's stop ${i} has C ${SKY.sky[i][1]} (at most 0.05)`);
  for (const k of ['skyW', 'hazeC', 'hazeW']) assert.ok(SKY[k][1] <= 0.02, `the aurora sky's ${k} has C ${SKY[k][1]} (at most 0.02)`);
  assert.ok(SKY.clLit[1] <= 0.035, `the aurora sky's clLit has C ${SKY.clLit[1]} (about 0.03)`);
  // (light B) a faint green on the side facing the arc: key, rim and the light from above, never teal again
  for (const k of ['key', 'ambU', 'clRim']) {
    assert.ok(SKY[k][1] <= 0.065, `the aurora sky's ${k} has C ${SKY[k][1]} (faint: at most 0.065)`);
    assert.ok(SKY[k][2] >= 140 && SKY[k][2] <= 165, `the aurora sky's ${k} is h ${SKY[k][2]} (green, never teal: 140-165)`);
  }
});

test('aurora: no seam round the sky (its azimuth only through cos and sin)', () => {
  assert.ok(/float phi = atan\(rd\.x, rd\.z\) - uAur\.y, cp = cos\(phi\), sp = sin\(phi\);/.test(AUR), 'auroraAt\'s azimuth is not read through cos and sin alone');
  const uses = AUR.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/float phi = atan\(rd\.x, rd\.z\) - uAur\.y, cp = cos\(phi\), sp = sin\(phi\);/, '').match(/\bphi\b/g) || [];
  assert.equal(uses.length, 0, 'auroraAt reads phi other than by cos and sin');
});

test('physics: aurora/phases: it comes in, holds, drifts and goes by its own clock, at most 0.3 deg/s, a breakup\'s front at 2.2 km/s', () => {
  // 222's own skyAur over a stay (its hold and change at their shortest and longest), run here: the rise 0 or more to
  // 1, 0 at both ends of the stay; the border's elevation (the shader's eb) rising, drifting, then sinking, each one way,
  // never faster than 0.3 deg/s; the front west at 2.2 km/s from 20-40 deg east of centre; nothing between 0 and 1
  // for the breakup and the second arc
  const fn = cut(WORLD, '  var AUR_IN = ', '\n  }\n', true);
  const ss01 = (x) => { x = Math.min(Math.max(x, 0), 1); return x * x * (3 - 2 * x); }, clamp = (x, a, b) => Math.min(Math.max(x, a), b);
  const WSKY = { moonlit: { fx: {} }, aurora: { fx: { aurora: 1 } }, milkyway: { fx: { galaxy: 1 } } };
  for (const [hold, move] of [[90, 55], [115, 60]]) for (const f0 of [20, 40]) {
    const seq = [{ id: 'moonlit', at: 0, hold: 190, move: 57 }, { id: 'aurora', at: 247, hold, move }, { id: 'milkyway', at: 247 + hold + move, hold: 100, move: 55 }, { id: 'moonlit', at: 1e4, hold: 190, move: 57 }];   // (skyAt keeps the one after on the list)
    const SKY = { seq, i: 0, aur: { f0, bk: 1, dD: 200, rise: 0, p: 0, sf: 0 } };
    const skyAur = new Function('SKY', 'WSKY', 'ss01', 'clamp', 'DEG', fn + '\nreturn skyAur;')(SKY, WSKY, ss01, clamp, DEG);
    let last = null, phase = 0, top = 0;
    const t0 = 190, t1 = 247 + hold + move;
    for (let t = 150; t <= t1 + 40; t += 0.25) {
      SKY.i = t < 247 ? 0 : t < t1 ? 1 : 2; skyAur(t);
      const A = SKY.aur, eb = eb0 + (eb1 + (eb2 - eb1) * A.p - eb0) * A.rise;
      assert.ok(A.rise >= 0 && A.rise <= 1 && A.p >= 0 && A.p <= 1, `t ${t}: rise ${A.rise}, p ${A.p} out of [0, 1]`);
      if (t <= t0 || t >= t1) assert.equal(A.rise, 0, `t ${t}: the aurora stands (rise ${A.rise}) outside its stay`);
      if (last) {
        const r = (eb - last.eb) / 0.25;
        assert.ok(Math.abs(r) <= 0.3 + 1e-9, `hold ${hold}, move ${move}: at t ${t} the border moves ${r.toFixed(3)} deg/s (at most 0.3)`);
        if (r < -1e-9) phase = 1;   // (sinking: from here on it never rises again)
        assert.ok(!(phase && r > 1e-9), `t ${t}: the border rises again after it began to sink`);
        if (A.rise > 0 && last.sf !== 0) assert.ok(Math.abs((last.sf - A.sf) / 0.25 - 2.2) < 1e-6, `the front moves ${((last.sf - A.sf) / 0.25).toFixed(3)} km/s (west, 2.2)`);
      } else assert.ok(Math.abs(A.sf - 650 * Math.tan(f0 * DEG)) < 1e-6 || A.rise === 0, 'the front does not begin 20-40 deg east');
      top = Math.max(top, eb);
      last = { eb, sf: A.sf };
    }
    assert.ok(Math.abs(top - eb2) < 0.05, `hold ${hold}: the border's highest is ${top.toFixed(2)} deg (its drift's end, ${eb2})`);
  }
  // the stay's draws: after skyInit's others; a breakup and a second arc in half the stays (0 or 1, 0 or 150-300 km)
  const dr = WORLD.match(/SKY\.aur\.bk = SKY\.rV\.f\(\) < 0\.5 \? 1 : 0; SKY\.aur\.f0 = SKY\.rV\.r\(20, 40\); SKY\.aur\.dD = SKY\.rV\.f\(\) < 0\.5 \? SKY\.rV\.r\(150, 300\) : 0;/);
  assert.ok(dr, 'the stay\'s draws (a breakup, its front, a second arc) are not 222\'s as tested');
  assert.ok(WORLD.indexOf(dr[0]) > WORLD.indexOf('SKY.gal = best; SKY.aur = {'), 'the stay\'s draws come before skyInit\'s others: they would move them');
  assert.ok(AUR.includes('if (uAurB.z > 0.0) c += 0.6 * auroraSheet(el, cp, sp, D + uAurB.z,'), 'the second arc is not 0.6 of the first, uAurB.z km beyond it');
});

test('physics: aurora/phases: a breakup brighter, its folds deeper, its fringe pink, all under the words\' floor', () => {
  const [, , hP] = LCh(num(/vec3\((-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\) \* pk \* min/, 'pink fringe'));
  assert.ok(hP >= 330 || hP <= 15, `the breakup's fringe is h ${hP.toFixed(1)} (pink: 330-15)`);
  // the breakup's own green (x1.5, rays 70 km) at its most and edge-on, with the second arc's under it: the soft cap holds the composited peak
  const Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const em = gC.map((x) => x * green(109, 1, 1) * 3 * K * 1.6), yl = Y(em), capped = Ym * (1 - Math.exp(-yl / Ym));
  assert.ok(capped <= Ym + 1e-12, `the breakup adds Y ${capped.toFixed(3)} (the cap's ${Ym})`);
  assert.ok(green(109, 1, 1) > green(109, 1, 0) && green(160, 1, 1) > 2 * green(160, 1, 0), 'a breakup is not brighter, its rays not taller');
});
