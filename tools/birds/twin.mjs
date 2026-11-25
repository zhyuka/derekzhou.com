// twin.mjs: the shipped ink birds (inkbirds.js as the build minifies it, its own properties renamed: tools/minify.mjs)
// and the source (src/birds assembled, as the bird suites run it) side by side in the bird sim (tools/birds/sim.mjs),
// the same scenes, and every frame the same (the hub's review of #531, 2026-11-25: a property reached only by a key
// built at run time, Object.keys or JSON would pass tools/props.mjs and the suites, which run the source, and break only
// in the shipped file). Each seed (1-6) under each of the world's six skies, 10 sim-minutes at the sim's step, with a
// pointer that wanders over the words and a click every 23 s: after every step the birds are drawn (the GL stub), and
// every array the draw uploads (each bird's place, pose, kind and colour, the instance ring) and the score's read of
// the birds (WORLD.birds.feed: the kinds, the nearest flocks and wings) must be the same, value for value, in both.
//   node tools/birds/twin.mjs [--secs S] [--seeds N]     (tools/checks/50-props.sh: the defaults)
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { makeSim, DT } from './sim.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? +process.argv[i + 1] : d; };
const SECS = arg('secs', 600), SEEDS = arg('seeds', 6);
const SKIES = ['afterglow', 'bluehour', 'firstlight', 'moonlit', 'milkyway', 'aurora'];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'twin-'));
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const ship = path.join(tmp, 'ship'), site = path.join(tmp, 'site');
fs.mkdirSync(site);
execFileSync(process.execPath, [path.join(ROOT, 'tools/parts.mjs'), 'assemble', '--ship', '--min-glsl', path.join(ROOT, 'src'), ship], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(ROOT, 'tools/minify.mjs'), '--build', ship, site], { stdio: 'pipe' });
const MIN = fs.readFileSync(path.join(site, 'inkbirds.js'), 'utf8');

function run(seed, sky, script) {
  let h = crypto.createHash('sha256');
  const add = (a, n) => { const v = a.subarray ? a.subarray(0, n) : a.slice(0, n); h.update(Buffer.from(v.buffer, v.byteOffset, v.byteLength)); };
  const opt = { seed, sky, script, size: '960x600', wind: [2.5, -1.2], yaw: 3,
    pointer: (t) => (Math.floor(t / 40) % 3 === 2 ? null : { x: 480 + 300 * Math.sin(t / 7), y: 280 + 90 * Math.cos(t / 5) }),
    clicks: Array.from({ length: Math.floor(SECS / 23) }, (_, i) => ({ t: 11 + 23 * i, x: 480 + 220 * Math.sin(i), y: 270 + 40 * Math.cos(i) })),
    draw: { data: add } };
  const sim = makeSim(opt), o = { f: new Float32Array(48), w: new Float32Array(24) }, steps = [];
  for (let k = 0; k < SECS / DT; k++) {
    sim.step();
    sim.feed(o); add(o.f, o.f.length); add(o.w, o.w.length); h.update(JSON.stringify([o.n, o.m, o.kinds]));
    steps.push(h.digest('hex')); h = crypto.createHash('sha256');
  }
  return steps;
}

let bad = 0, n = 0;
for (let seed = 1; seed <= SEEDS; seed++) for (const sky of SKIES) {
  const A = run(seed, sky, null), B = run(seed, sky, MIN);
  const k = A.findIndex((d, i) => d !== B[i]);
  n += A.length;
  if (k >= 0 || A.length !== B.length) { bad++; console.error('::error::twin: seed ' + seed + ', ' + sky + ': the shipped ink birds part from the source at step ' + k + ' (t ' + (k * DT).toFixed(2) + ' s): a property read by a key the minifier renamed'); }
}
if (bad) process.exit(1);
console.log('twin: the shipped and the source ink birds the same in ' + SEEDS + ' seeds x ' + SKIES.length + ' skies x ' + SECS + ' s: ' + n + ' steps, every array drawn and the score\'s feed equal');
