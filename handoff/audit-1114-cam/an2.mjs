import { makeSim } from './sim.mjs';
const S = makeSim({ world: './asm/src/world.js', seed: 3, obstOpts: { clouds: true } });
const DT = 1 / 60; let prev = null, chat = [], ev = [];
let lastLatT = null;
for (let k = 0; k < 300 * 60; k++) {
  S.stepOnce(); const { CS } = S.st();
  const a = prev === null ? 0 : (CS.sv - prev) / DT;
  if (lastLatT !== null && Math.abs((CS.latT - CS.lat) - lastLatT) > 0.5) ev.push([+(k * DT).toFixed(2), +lastLatT.toFixed(2), +(CS.latT - CS.lat).toFixed(2), +CS.sv.toFixed(3), CS.vs]);
  lastLatT = CS.latT - CS.lat;
  if (k > 120) chat.push([k, CS.sv, a, CS.latT - CS.lat]);
  prev = CS.sv;
}
// chatter episodes: consecutive steps where accel flips sign with |a| > 0.2
let maxSv = 0, maxE = 0, n = 0;
for (let i = 1; i < chat.length; i++) if (Math.abs(chat[i][2]) > 0.2 && Math.sign(chat[i][2]) !== Math.sign(chat[i - 1][2])) { n++; maxSv = Math.max(maxSv, Math.abs(chat[i][1])); maxE = Math.max(maxE, Math.abs(chat[i][3])); }
console.log('accel sign flips over 0.2 m/s2:', n, 'max |sv| during them', maxSv.toFixed(4), 'max |e|', maxE.toFixed(4));
console.log('target changes (> 0.5 m):', ev.length, ev.slice(0, 12));
// print a window
const i0 = chat.findIndex((c, i) => i > 0 && Math.abs(c[2]) > 0.2 && Math.sign(c[2]) !== Math.sign(chat[i - 1][2]));
for (let i = i0 - 3; i < i0 + 8; i++) console.log(chat[i].map((v) => +v.toFixed(5)).join(' '));
const flips = []; for (let i = 1; i < chat.length; i++) if (Math.abs(chat[i][2]) > 0.2 && Math.sign(chat[i][2]) !== Math.sign(chat[i - 1][2])) flips.push(i);
const j = flips[Math.floor(flips.length / 2)];
console.log('--- a flip in the middle, k sv a e');
for (let i = j - 4; i < j + 6; i++) console.log(chat[i].map((v) => +v.toFixed(5)).join(' '));
