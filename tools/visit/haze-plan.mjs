// tools/visit/haze-plan.mjs: the numbers for the haze by physics (the land row: aerial perspective as the air's own
// extinction and in-scatter of the sun's and the sky's light, the aerosol's scatter by AIR's moisture; never a grey veil). What main does:
// lib-air.glsl atmos() is physical for the gas (BR by wavelength) and the aerosol (fogOD, uAer: AIR's visibility, the
// hygroscopic growth by its moisture, the wavelength exponent, the forward peak), its in-scatter the sky's own colour
// (fogCol). The ground haze over it (hazeAmt: a 30 m layer) is mixed toward hand colours (each sky's hazeC and hazeW,
// the dunes kit's own), not toward the light the air would scatter. This prints, per sky, how far those hand colours
// stand from the sky's own (OKLab distance to the nearest of its stops, and of the warm side to its skyW, glowC and
// stops), and the ground haze's share along the ground for the dunes kit's draw of its density.
//   node tools/visit/haze-plan.mjs
import fs from 'node:fs';
const SRC = fs.readFileSync(new URL('../../src/world/220-time-day.js', import.meta.url), 'utf8');
const lab = ([L, c, h]) => [L, c * Math.cos(h * Math.PI / 180), c * Math.sin(h * Math.PI / 180)];
const dE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));
const arr = (s) => s.split(',').map(Number);
let nh = 0;
console.log('the hand haze colours against the sky\'s own (OKLab; about 0.02 is a just-seen step):');
for (const m of SRC.matchAll(/^ {4}(\w+): \{ g:'(\w+)'.*$/gm)) {
  const line = m[0], get = (k) => { const r = new RegExp(k + ':\\[([-\\d.,]+)\\]').exec(line); return r ? arr(r[1]) : null; };
  const sky = /sky:\[(\[.*?\])\]/.exec(line), hc = get('hazeC'), hw = get('hazeW');
  if (!sky || !hc || !hw) continue;
  nh++;
  const stops = [...sky[1].matchAll(/\[([-\d.,]+)\]/g)].map((s) => arr(s[1])), warm = ['skyW', 'glowC'].map(get).filter(Boolean);
  const dc = Math.min(...stops.map((s) => dE(hc, s))), dw = Math.min(...[...warm, ...stops].map((s) => dE(hw, s)));
  console.log(`  ${m[1].padEnd(11)} ${m[2].padEnd(7)} cool side ${dc.toFixed(3)}, warm side ${dw.toFixed(3)}`);
}
if (!nh) console.log('  none: the skies hold no haze colours (the haze\'s light is the sky\'s own: lib-air hazeCol); run it on main\'s 220 for the before');
// the dunes kit's ground haze: haze [1e-3 hz, H 30 m, base 24 m under the eye], hz drawn in [0.45, 0.85] (realm-dunes)
const H = 30, base = 24;
for (const hz of [0.45, 0.85]) {
  const a0 = 1e-3 * hz * Math.exp(-base / H), share = (t) => 1 - Math.exp(-a0 * t);
  console.log(`the dunes' ground haze at hz ${hz}: along the ground ${[250, 1000, 5000].map((t) => `${(share(t) * 100).toFixed(0)}% at ${t} m`).join(', ')}`);
}
