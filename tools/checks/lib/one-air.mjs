// one-air.mjs (tools/checks/42-one-air.sh): the world's one state stays one (RULES.json one-world-state).
//   - every name of the air (src/world/215-air.js) is declared there, and only the air assigns it or writes its members
//     (tools/where.mjs: terser's scope analysis of the sections), so every other system reads it and none keeps its own;
//   - no wind or sun literal outside the air: in the world's sections and the realms (src/ assembled, comments blanked),
//     no wind times a speed of its own, no wind drawn, no landing heading drawn, no sun made or given a number, no sky
//     with its own sun, no second cruise band; in the billows' shader no clock times a number (a drift of its own)
//   node tools/checks/lib/one-air.mjs OUT_DIR   (src/ assembled into OUT_DIR/src; exit 1 on a breach)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import { where } from '../../where.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');   // (fileURLToPath: a URL's pathname doubles the drive on Windows, C:\C:\)
const OUT = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'one-air-'));
execFileSync(process.execPath, [path.join(ROOT, 'tools/parts.mjs'), 'assemble', path.join(ROOT, 'src'), path.join(OUT, 'src')], { stdio: 'ignore' });
const AIRF = 'src/world/215-air.js', errs = [];

// 1. the air's names: declared in the air, written only there
const NAMES = ['SKY_RATE', 'AIR_DIR', 'AIR_H', 'AIR_CIRRUS', 'AIR_KEY_EL', 'AIR_KEY_AZ', 'AIR_SUN_EL', 'AIR_SUN_NIGHT', 'AIR_CRUISE', 'AIR_APART', 'AIR_W', 'AIR_MOON', 'AIR_FRAME', 'AIRAPI',
  'airDraw', 'airSpeed', 'windAt', 'airVec3', 'airUpwind', 'airKeySet', 'keyAt', 'airSunEl', 'airSkySun', 'airMoon', 'skyFrame', 'weather', 'airHeading0', 'AIR_UT0'];
for (const n of NAMES) {
  let w; try { w = await where(n, 'world'); } catch (e) { errs.push(`${n}: not a name of the world (${e.message})`); continue; }
  if (!w || !w.decl || w.decl.file !== AIRF) { errs.push(`${n} is declared in ${w && w.decl ? w.decl.file : 'no section'}, not the air (${AIRF})`); continue; }
  for (const k of ['assigns', 'members']) for (const f of Object.keys(w[k] || {})) if (f !== AIRF) errs.push(`${f}:${w[k][f].join(',')} ${k === 'assigns' ? 'assigns' : 'writes a member of'} the air's ${n} (only ${AIRF} may)`);
}

// 2. no literal of the wind's or the sun's outside the air
function blank(s) {   // comments blanked to spaces (lines kept)
  const cs = []; acorn.parse(s, { ecmaVersion: 'latest', allowReturnOutsideFunction: true, onComment: (b, t, a, e) => cs.push([a, e]) });
  let o = s; for (const [a, e] of cs) o = o.slice(0, a) + o.slice(a, e).replace(/[^\n]/g, ' ') + o.slice(e); return o;
}
const world = fs.readFileSync(path.join(OUT, 'src/world.js'), 'utf8');
const air = fs.readFileSync(path.join(ROOT, AIRF), 'utf8'), at = world.indexOf(air.slice(0, 120));
if (at < 0) errs.push('the air is not in world.js as assembled');
const texts = { 'world.js (but the air)': blank(world.slice(0, at) + air.replace(/[^\n]/g, ' ') + world.slice(at + air.length)) };
for (const f of ['realm-dunes.js', 'realm-above.js', 'realm-kit.js']) texts[f] = blank(fs.readFileSync(path.join(OUT, 'src', f), 'utf8'));
const BAN = [
  [/\bwind\[[01]\]\s*\*\s*[\d.(]/, 'a wind times a speed of its own (windAt, A.vec3: the profile at the reader\'s height)'],
  [/\bWIND_AIR\b/, 'a wind speed of its own'],
  [/Math\.(sin|cos)\(wa\)/, 'a wind drawn (airDraw)'],
  [/subseed\(J\.seed,\s*77\)/, 'the landing\'s heading drawn (airHeading0)'],
  [/dirAzEl\([^)\n]*sun(Az|El)/, 'a sun made (airKeySet, airSkySun)'],
  [/\bsun(Az|El)\s*:\s*[^,}\n]*\d/, 'a sun given a number (AIR_KEY_EL, AIR_KEY_AZ)'],
  [/\bskyEl\s*:/, 'a sky with a sun of its own (AIR_SUN_EL)'],
  [/\bSUN_NIGHT\s*=/, 'a night sun of its own (AIR_SUN_NIGHT)'],
  [/\bwindDir\s*:\s*\[/, 'a water wind of its own'],
  [/\bcruise\s*:\s*\[|\bCRUISE\s*=\s*\[/, 'a second cruise band (AIR_CRUISE)'],
];
const APART = [/\bmc\.wind\b/];   // (AIR_APART.maps: the maps' own wind field, read by the director's cover and the plan's dunes; physics: air/wind-profile joins it)
for (const [f, s] of Object.entries(texts)) s.split('\n').forEach((l, i) => { if (APART.some((re) => re.test(l))) return; for (const [re, why] of BAN) if (re.test(l)) errs.push(`${f}:${i + 1}: ${why}: ${l.trim().slice(0, 140)}`); });
const vb = fs.readFileSync(path.join(ROOT, 'src/world/glsl/fs-vbody.glsl'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
if (/\buT\b/.test(vb)) errs.push('src/world/glsl/fs-vbody.glsl: the billows read the clock (they ride with their body, physics: clouds/drift)');

if (errs.length) { for (const e of errs) console.log('::error::' + e); console.log(`one air: ${errs.length} breach(es) (RULES.json one-world-state; src/world/215-air.js holds the world's one state)`); process.exit(1); }
console.log(`one air: ${NAMES.length} names held by the air alone, no wind or sun literal outside it`);
