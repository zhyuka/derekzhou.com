// test/unit/aurora.mjs: the aurora by its physics (the hub's spec, physics: aurora): one sheet D km toward the key, its
// colour by altitude, its motion at real speeds, its light under the words' floor; sky-body.glsl's own lines run here
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "a2 = SKYTAU * s / 40.0 - 0.157 * uT", "with": "a2 = SKYTAU * s / 40.0 - 1.57 * uT", "why": "folds ten times too fast: they would glitter"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "vec3(0.9, 0.1, 0.06) * r *", "with": "vec3(0.85, 0.25, 0.55) * r *", "why": "the old magenta top: mauve over the h 250 sky"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "var AUR_IN = 64, AUR_OUT = 80", "with": "var AUR_IN = 40, AUR_OUT = 80", "why": "the aurora rises over 40 s: 0.45 deg/s at its fastest"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "AUR_FRONT = 2.2;", "with": "AUR_FRONT = 22;", "why": "the breakup's front ten times too fast"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "fa = min(mix(3.0, 9.0, b)", "with": "fa = min(mix(3.0, 30.0, b)", "why": "a breakup's folds 30 km deep (8-10)"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "smoothstep(3.0, 6.0, 6.0 * cpr / max(rho * pa, 1e-4))", "with": "smoothstep(-2.0, -1.0, 6.0 * cpr / max(rho * pa, 1e-4))", "why": "the rays never eased where they alias: they glitter seen along the sheet"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "40.0 * cw / max(rho * pa, 1e-4)), 2.0 * cp", "with": "40.0 / max(rho * pa, 1e-4)), 2.0 * cp", "why": "the folds faded by their face-on span: a breakup's flanks under a pixel glitter"}
import { test, assert, fs, path, ROOT, WORLD, cut, STREAMS, VEC } from '../unit-lib.mjs';

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
const [fA, fAB] = num(/fa = min\(mix\(([\d.]+), ([\d.]+), b\) \* smoothstep\(8\.0, 16\.0, 40\.0(?: \* cw)? \/ max\(rho \* pa, 1e-4\)\), [\d.]+ \* cp \/ max\(abs\(sp\), 1e-3\)\);/, 'fold amplitude (by its projected span, and the crossing held to converge)');
const [rP, rP2, rV, rW] = num(/textureLod\(uN3, vec3\(s \/ ([\d.]+) \+ uT \/ ([\d.]+), 0\.5 \+ s \/ ([\d.]+), 0\.19 \+ f0 \+ s \/ ([\d.]+)\), 0\.0\)\.a\)/, 'rays (level 0, v and w drifting with s)');
const [rMean, rLo, rHi, rSpan] = num(/float ry = mix\(([\d.]+), smoothstep\(0\.45, 0\.9, textureLod\(.*\), smoothstep\((-?[\d.]+), (-?[\d.]+), ([\d.]+) \* cpr \/ max\(rho \* pa, 1e-4\)\)\);/, 'the rays eased to their mean where they would alias');
const [EOK] = num(/float eo = inversesqrt\(cps \* cps \+ ([\d.]+)\);/, 'edge-on');
const EO = 1 / Math.sqrt(EOK);   // (edge-on brightening at its most)
const [gC] = [num(/vec3\((-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\) \* g \* eo/, 'green')];
const [rC] = [num(/\+ vec3\((-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\) \* r \* min/, 'red')];
const [K] = num(/pk \* eo\) \* ([\d.]+);\n\}/, 'strength');
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
  }
  // the rays read at level 0 (no mip before the hard smoothstep: 1x and 2x2 read the same texels), eased to their own
  // mean (the volume's: 0.12) wherever the noise's 8-cell octave (rP / 8 km) spans under rHi projected pixels, so they never alias
  assert.ok(Math.abs(rSpan - rP / 8) < 1e-9 && rLo >= 2 && rHi >= rLo, `the rays' ease: ${rSpan} km (the 8-cell octave, ${rP / 8}) over ${rLo}-${rHi} px`);
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
  const [fl0, fl1] = num(/return c \* uAur\.w \* smoothstep\(([\d.]+), ([\d.]+), e\);/, 'the floor it is drawn from'), FL = (e) => ss(fl0, fl1, e);   // (auroraAt's own floor)
  const comp = (e, emis, proj, knee) => {
    let a = emis.map((x) => x * proj * K); const yl = Y(a); a = a.map((x) => x * (yl > 1e-6 ? Ym * (1 - Math.exp(-yl / Ym)) / yl : 1) * FL(e));
    let c = skyAt(e).map((v, i) => v + a[i]); const y = Y(c); c = c.map((x) => Math.max(y + (x - y) * SKY.post.sat, 0));
    let [L] = LCh(c); const Kc = SKY.ceil - knee;
    if (L > Kc) { const k = Math.pow((Kc + knee * (1 - Math.exp(-(L - Kc) / knee))) / L, 3); c = c.map((x) => x * k); }
    return [c, LCh(c)];
  };
  // the green's peak, quiet and in a breakup (x1.5, rays 70 km tall) with the second arc's (0.6) under it, face on to
  // fully edge-on, at every height it can stand (0.5-40 deg), under main's ceiling knee and the night-contrast one (0.04)
  const pk = gC.map((x) => x * green(109, 1)), pkB = gC.map((x) => x * green(109, 1, 1) * 1.6), word = 0.82;
  const knees = [+WORLD.match(/var CEIL_KNEE = ([\d.]+),/)[1], 0.04];
  let worst = null;
  for (const knee of knees) for (const emis of [pk, pkB]) for (const proj of [1, 2, EO]) for (let e = 0.5; e <= 40; e += 0.5) {
    const [c, [L, , h]] = comp(e, emis, proj, knee);
    if (!worst || L > worst.L) worst = { L, e, proj, knee, b: emis === pkB };
    if (FL(e) >= 0.99) assert.ok(h >= 140 && h <= 170, `the green's composited peak (x${proj.toFixed(2)}, ${e} deg) is h ${h.toFixed(0)} (green: 140-170)`);
    const cr = (word + 0.05) / (Y(c) + 0.05);
    assert.ok(cr >= 4.6, `the credit over the green's peak (x${proj.toFixed(2)}, ${e} deg, knee ${knee}) is ${cr.toFixed(2)}:1 (at least 4.6)`);
  }
  assert.ok(worst.L <= 0.50 + 1e-9, `the green's composited peak is L ${worst.L.toFixed(4)} at ${worst.e} deg (x${worst.proj.toFixed(2)}, knee ${worst.knee}${worst.b ? ', a breakup' : ''}): at most 0.50, the words' floor`);
  const [, [, Cs]] = comp(9, gC.map((x) => x * green(170, 1)), 1, knees[0]);
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
  assert.ok(WORLD.indexOf(dr[0]) > WORLD.indexOf('lie: best }; SKY.aur = {'), 'the stay\'s draws come before skyInit\'s others: they would move them');
  assert.ok(AUR.includes('if (uAurB.z > 0.0) c += 0.6 * auroraSheet(el, cp, sp, D + uAurB.z, uAur.z + 0.37, 0.0, 0.0, pa);'), 'the second arc is not 0.6 of the first, uAurB.z km beyond it');
});

test('physics: aurora/phases: a breakup brighter, its folds deeper, its fringe pink, all under the words\' floor', () => {
  const [, , hP] = LCh(num(/vec3\((-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\) \* pk \* eo/, 'pink fringe'));
  assert.ok(hP >= 330 || hP <= 15, `the breakup's fringe is h ${hP.toFixed(1)} (pink: 330-15)`);
  // the breakup's own green (x1.5, rays 70 km) at its most and edge-on, with the second arc's under it: the soft cap holds the composited peak
  const Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const em = gC.map((x) => x * green(109, 1, 1) * 3 * K * 1.6), yl = Y(em), capped = Ym * (1 - Math.exp(-yl / Ym));
  assert.ok(capped <= Ym + 1e-12, `the breakup adds Y ${capped.toFixed(3)} (the cap's ${Ym})`);
  assert.ok(green(109, 1, 1) > green(109, 1, 0) && green(160, 1, 1) > 2 * green(160, 1, 0), 'a breakup is not brighter, its rays not taller');
});

// ------------------------------------------------------------------ the meter: auroraAt at 1x against 2x2 (physics: aurora/sampling)
// The world's own noise volume (090's bake, the same bytes), sampled as WebGL samples level 0 (trilinear, repeat), and
// sky-body.glsl's own auroraSheet made JS a channel at a time (its vec3s are colour constants times scalars); auroraAt's
// few vector lines by hand. A pixel's one sample against the mean of four at its quarter-pixel corners (the same
// footprint), in display codes of the aurora's light alone: at most 3 apart anywhere, in a quiet stay and in a breakup
// with its second arc, at the sheet's centre and seen along it, on a laptop's and a phone's pixel
const NZ = cut(WORLD, '  var NOISE = { t: null', '  /* stage B: the texture');
const N3VOL = new Function(STREAMS + VEC + NZ + '\n NOISE.data = noiseData(); NOISE.d64 = new Float64Array(NOISE.data); NOISE.vol = new Uint8Array(NOISE_N * NOISE_N * NOISE_N * 4); for (var z = 0; z < NOISE_N; z++) noiseLayer(z); return NOISE.vol;')();
const N3 = 32, wrap3 = (i) => ((i % N3) + N3) % N3;
const n3a = (x, y, z) => {
  const X = x * N3 - 0.5, Y = y * N3 - 0.5, Z = z * N3 - 0.5, x0 = Math.floor(X), y0 = Math.floor(Y), z0 = Math.floor(Z), fx = X - x0, fy = Y - y0, fz = Z - z0;
  let v = 0;
  for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++)
    v += (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz) * N3VOL[((wrap3(z0 + dz) * N3 + wrap3(y0 + dy)) * N3 + wrap3(x0 + dx)) * 4 + 3];
  return v / 255;
};
const SHB = (() => {
  const a = GLSL.indexOf('vec3 auroraSheet('), b = GLSL.indexOf('\n}\n', a);
  let body = GLSL.slice(GLSL.indexOf('{', a) + 1, b).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/\bn3v\(|texture\(/.test(body), 'auroraSheet reads its noise with a mip (texture or n3v): 1x and 2x2 read different texels before the hard smoothstep');
  body = body.replace(/\bfloat\s+/g, 'let ').replace(/for \(int /g, 'for (let ').replace(/textureLod\(uN3, vec3\(([^;]*?)\), 0\.0\)\.a/g, (m, x) => 'NA(' + x + ')').replace(/\bvec3\(/g, 'V3(');
  return new Function('el', 'cp', 'sp', 'D', 'f0', 'bk', 'rk', 'pa', 'U', 'const { uT, uAurB, NA, V3 } = U, SKYTAU = 2 * Math.PI, { abs, sqrt, exp, sin, cos, min, max } = Math, inversesqrt = (x) => 1 / Math.sqrt(x), mix = (x, y, t) => x + (y - x) * t, smoothstep = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };' + body);
})();
const auroraJS = (rd, Un) => {
  const e = Math.asin(rd[1]) / DEG, eb = (eb0 + (eb1 + (eb2 - eb1) * Un.uAurB.x - eb0) * Un.uAur.x) * DEG, D = R * (Math.acos(Math.cos(eb) / (1 + h0D / R)) - eb);
  const phi = Math.atan2(rd[0], rd[2]) - Un.uAur.y, cp = Math.cos(phi), sp = Math.sin(phi);
  if (cp < 0.05) return [0, 0, 0];
  const el = Math.asin(rd[1]), c = [0, 0, 0];
  for (let ch = 0; ch < 3; ch++) {
    const U = { uT: Un.uT, uAurB: Un.uAurB, NA: n3a, V3: (p, q, r) => [p, q, r][ch] };
    c[ch] = SHB(el, cp, sp, D, Un.uAur.z, Un.uAurB.w, 1, Un.pa, U) + (Un.uAurB.z > 0 ? 0.6 * SHB(el, cp, sp, D + Un.uAurB.z, Un.uAur.z + 0.37, 0, 0, Un.pa, U) : 0);
  }
  const yl = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], k = (yl > 1e-6 ? Ym * (1 - Math.exp(-yl / Ym)) / yl : 1) * ss(0.5, 2.5, e);
  return c.map((x) => x * k);
};
const code = (x) => { x = Math.min(Math.max(x, 0), 1); return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055); };
function auroraMeter({ W = 1440, H = 900, degpx, yaw, pitch, step = 5, Un }) {
  const tv = Math.tan(degpx * H / 2 * DEG), U = { ...Un, pa: 2 * Math.atan(tv) / H }, y0 = Un.uAur.y + yaw * DEG, p = pitch * DEG;
  const f = [Math.sin(y0) * Math.cos(p), Math.sin(p), Math.cos(y0) * Math.cos(p)], r = [Math.cos(y0), 0, -Math.sin(y0)];
  const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
  const dir = (x, y) => { const nx = (2 * x / W - 1) * tv * W / H, ny = (1 - 2 * y / H) * tv, d = [0, 1, 2].map((i) => f[i] + r[i] * nx + u[i] * ny), l = Math.hypot(...d); return d.map((v) => v / l); };
  let worst = 0, at = null, lit = 0;
  for (let y = 0.5; y < H; y += step) for (let x = 0.5; x < W; x += step) {
    const one = auroraJS(dir(x, y), U), ref = [0, 0, 0];
    for (const [dx, dy] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) auroraJS(dir(x + dx, y + dy), U).forEach((v, i) => { ref[i] += v / 4; });
    if (one[1] + ref[1] > 1e-4) lit++;
    const d = Math.max(...[0, 1, 2].map((i) => Math.abs(code(one[i]) - code(ref[i]))));
    if (d > worst) { worst = d; at = [x, y]; }
  }
  return { worst, at, lit };
}
test('physics: aurora/sampling: auroraAt at 1x within 3 codes of 2x2, quiet and in a breakup, face on and seen along it', () => {
  // the folds fade by their projected span (40 km over rho pa / |cos psi| px, psi the sheet's swell-only angle to the
  // view: the spec's), and their depth is held where the crossing's fixed point would not converge (slope x tan phi <= 0.5)
  assert.ok(/float cw = abs\(cos\(el\) \* \(cp - ys \* sp\)\) \/ sqrt\(1\.0 \+ ys \* ys\), fa = min\(mix\([\d.]+, [\d.]+, b\) \* smoothstep\(8\.0, 16\.0, 40\.0 \* cw \/ max\(rho \* pa, 1e-4\)\)/.test(AUR), 'the folds fade by their face-on span, not their projected span (40 cos psi / rho pa)');
  const [fc] = num(/, ([\d.]+) \* cp \/ max\(abs\(sp\), 1e-3\)\);/, 'the folds held to converge');
  assert.ok(fc * 2 * Math.PI / fL * (1 + 1.3 * fL / 170) <= 0.5 + 1e-9, `the folds' slope times tan phi reaches ${(fc * 2 * Math.PI / fL * (1 + 1.3 * fL / 170)).toFixed(2)} (at most 0.5: the crossing's three steps converge)`);
  for (const [name, B] of [['a quiet stay', { x: 0.5, y: -1e5, z: 0, w: 0 }], ['a breakup with its second arc', { x: 0.3, y: -1e5, z: 220, w: 1 }]])
    for (const [yaw, pitch, both] of [[0, 8, 1], [40, 6, 1], [70, 3, 1], [80, 2, 0], [-45, 12, 0], [55, 4, 0]]) for (const degpx of both ? [0.0578, 0.0376] : [0.0578]) {   // (the last three: the hub's, where its own sweep found 3.03-3.32; their worst is a laptop's pixel)
      const m = auroraMeter({ degpx, yaw, pitch, Un: { uT: 523.7, uAur: { x: 1, y: 0.3, z: 6.2, w: 1 }, uAurB: B } });
      assert.ok(m.lit > 2000, `${name}, ${yaw} deg along, ${degpx} deg/px: the view holds only ${m.lit} lit samples (the meter looks past the sheet)`);
      assert.ok(m.worst <= 3, `${name}, ${yaw} deg along the sheet, ${degpx} deg/px: 1x is ${m.worst.toFixed(1)} codes from 2x2 at (${m.at.map(Math.round)}) (at most 3: it glitters)`);
    }
});

test('physics: aurora/rays: they never nearly repeat along the sheet (autocorrelation at most 0.6 for lags 10-1100 km)', () => {
  // the rays' own field along the sheet, as auroraSheet reads it from the world's noise volume (its u, v and w all drifting
  // with s), in 300 km windows: no lag from 10 to 1100 km (two places 1-90 deg apart at D 650, inside any view) finds
  // the pattern again (a correlation r at most 0.6), at three fold phases and two moments
  const ry = (s, uT, f0) => ss(0.45, 0.9, n3a(s / rP + uT / rP2, 0.5 + s / rV, 0.19 + f0 + s / rW));
  let worst = { r: -1 };
  for (const f0 of [5.0, 6.2, 7.9]) for (const uT of [0, 523.7]) for (const s0 of [-1500, -300, 900]) {
    const ds = 1, win = 300, a = [];
    for (let i = 0; i <= win + 1100; i += ds) a.push(ry(s0 + i, uT, f0));
    const n = win / ds, A = a.slice(0, n), mA = A.reduce((x, y) => x + y, 0) / n, vA = A.reduce((x, y) => x + (y - mA) ** 2, 0);
    for (let lag = 10; lag <= 1100; lag += ds) {
      const B = a.slice(lag / ds, lag / ds + n), mB = B.reduce((x, y) => x + y, 0) / n, vB = B.reduce((x, y) => x + (y - mB) ** 2, 0);
      let cv = 0; for (let i = 0; i < n; i++) cv += (A[i] - mA) * (B[i] - mB);
      const r = cv / Math.sqrt(vA * vB + 1e-12);
      if (r > worst.r) worst = { r, lag, f0, uT, s0 };
    }
  }
  assert.ok(worst.r <= 0.6, `the rays nearly repeat: r ${worst.r.toFixed(3)} at a lag of ${worst.lag} km (f0 ${worst.f0}, uT ${worst.uT}, from s ${worst.s0}): at most 0.6`);
});

test('physics: aurora/colour: the saddle keeps the sky\'s blue everywhere: the second arc on, at the arc\'s ends', () => {
  // auroraSheet's own lines (auroraJS), composited over the aurora sky (skyGrad, its warm band toward the key at its
  // strongest), saturated and under the ceiling, wherever the near sheet's saddle stands (150-190 km): the arc's centre
  // to its ends (|phi| to 60 deg), quiet and with the second arc 150 or 300 km beyond, at the hold's ends: the
  // composite keeps the sky's own chroma, or within 0.005 of it where the sky itself is greyer than 0.035
  const sky = SKY.sky.map((c) => lch(...c)), mix3 = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
  const skyAt = (e) => { let c = mix3(sky[1], sky[2], ss(0, SKYE[0], e)); c = mix3(c, sky[3], ss(SKYE[0], SKYE[1], e)); return mix3(c, lch(...SKY.skyW), SKY.skyK[0] * Math.exp(-e / SKY.skyK[1])); };
  const Yl = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], knee = +WORLD.match(/var CEIL_KNEE = ([\d.]+),/)[1];
  const post = (c) => { const y = Yl(c); c = c.map((x) => Math.max(y + (x - y) * SKY.post.sat, 0)); const [L] = LCh(c), Kc = SKY.ceil - knee; if (L > Kc) { const k = Math.pow((Kc + knee * (1 - Math.exp(-(L - Kc) / knee))) / L, 3); c = c.map((x) => x * k); } return c; };
  let worst = null;
  for (const p of [0, 1]) for (const dD of [0, 150, 300]) for (const phiD of [0, 20, 40, 50, 60]) for (const uT of [0, 523.7]) {
    const Un = { uT, uAur: { x: 1, y: 0, z: 6.2, w: 1 }, uAurB: { x: p, y: -1e5, z: dD, w: 0 }, pa: 2 * Math.atan(Math.tan(26 * DEG)) / 900 };
    const D = Dof(1, p), phi = phiD * DEG;
    for (let e = 1; e <= 40; e += 0.25) {
      const h = hAt(e * DEG, D / Math.cos(phi));
      if (h < 150 || h > 190) continue;
      const rd = [Math.sin(phi) * Math.cos(e * DEG), Math.sin(e * DEG), Math.cos(phi) * Math.cos(e * DEG)], a = auroraJS(rd, Un), s0 = skyAt(e);
      const [, Cs] = LCh(post(s0)), [, Cc] = LCh(post(s0.map((v, i) => v + a[i]))), need = Math.min(Cs, 0.035) - 0.005;
      if (!worst || Cc - need < worst.m) worst = { m: Cc - need, Cc, Cs, e, phiD, dD, p, h };
    }
  }
  assert.ok(worst.m >= 0, `the saddle greys: C ${worst.Cc.toFixed(4)} over a sky of ${worst.Cs.toFixed(4)} at ${worst.e} deg, ${worst.phiD} deg along the arc (h ${worst.h.toFixed(0)} km, second arc ${worst.dD} km, hold ${worst.p}): within 0.005 of the sky's own chroma, or of 0.035`);
});
