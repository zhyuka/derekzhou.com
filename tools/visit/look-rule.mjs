// tools/visit/look-rule.mjs: what a first heading's look must keep, and how the looks are weighed (the hub's reviews of
// #312, Nov 23 and 24: the score, not a hand pick). The measures are looks.mjs's (measured live in the gate).
//   WORD_CAP  the most of the words' boxes a heading may put under cloud, in any of the three frames (a bright cloud
//             behind the light words is the worst case)
//   NAME_CAP  the most of the name's own box under cloud: the name is the page's one picture of words
//             (and the most of it behind a solid, nameSolid: a floating island, a spire, a rock seen through the box makes the
//             name hang from it; the hub's ruling on #528, Nov 25: the frame against itself with the solids taken out)
//   discs     at dawn and sunset a heading must keep the low sun's disc in frame, clear of cloud and outside the words'
//             boxes, wherever the land's own heading shows it (the disc is a few pixels: the feature's light alone
//             cannot see it; on today's world no first frame shows one, so the glow below is what holds)
//   GLOW_KEEP the least of the low sun's light in frame (sunIn) a heading may keep against the land's own heading's (half:
//             at three quarters k0 and k5 had no heading under the caps, their own lit by the very clouds behind the words); the
//             glow main shows at dawn and sunset stays
//   lookScore the look's part of the pick: the opening's feature in frame (its light against the land's best candidate's)
//             and left clear (the Milky Way at night, the low sun or its glow at dawn and sunset), less the top band
//             under cloud
// worldKey: what the looks were measured on, the code (comments and white space aside) of only what moves a cloud in the
// opening frames or moves the words' boxes (the hub's review of #312, 15:35Z Nov 24: a key of the whole world would turn
// every world PR in every lane red), KEY_INPUTS:
//   the cloud layout   realm-above.js (the air above the land: its cells, its clouds); realm-dunes.js's air cell
//                      (dAirDir, dAir), its terrain-held lenses (HELD_*, dHeld) and its cloud(); 120 (the cloud bodies),
//                      210 (their volumes, baked), 212 (their drift), 231 (a cell's clouds seated and kept)
//   the opening view   215 (the air: the landing and airHeading0, its table blanked), 270 (the flight), 320 (the camera
//                      drawn between the last two), 386 (the frustum for the window)
//   the words          390 (the words' place), site/index.html, site/style.css
//   the solids' places (the hub's ruling on #533, 23:29Z Nov 25: a place moved behind the name is measured afresh; a
//                      surface's shading is not): realm-dunes.js's areas and their forms (DS, CUT_D, dSite, FORM_K, dGreat,
//                      dDetails, dDest, FORM_*, dForms, dSmall, its cell()), 217 (the destination), 230 (the cells),
//                      233's resolvePlaces (a place seated); realm-above.js's islands are in it whole already
//   the solids' forms  realm-kit.js whole (the hub, 00:00Z Nov 26: a taller spire or a bigger temple grows into the name's
//                      box without moving)
// Not the sky (the sun, the stars, the Milky Way: a feature's light is a score, not a cap), the land's surface or the
// birds. looksKey (below) adds the table and the measuring code: the gate measures afresh whenever it moves
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const WORD_CAP = 0.1, NAME_CAP = 0.02, FEATURE_W = 0.5, TOP_W = 0.25, GLOW_KEEP = 0.5, DISC_VIEWS = ['laptop-sunset', 'phone-dawn'];
export const lookKey = (deg) => (deg === null ? 'own' : String(deg));
// The views a heading is measured on in the gate (--table): all three for the table's heading, and for a land's own
// heading where it is the table's (null); else the own heading only on the low sun's two, the views rule() reads it on
// (keepsDiscs: its discs and sunIn). Its night view fed only glowWaived's keepsWords(own), where a lower wordCloud can
// only end a waiver, never grant one (stricter, not looser); 14 lands x 3 frames, 15.6% of the gate's frames
// (2026-11-26, the gate's p90: the looks shards set it). On the record of run 45754866608 rule() is the same either way.
export const viewsFor = (views, deg, tableDeg) => (deg === null && tableDeg !== null ? views.filter((v) => v.feature !== 'galaxy') : views);
// the feature: how much of its light is in frame against the land's best (bestIn), and how much of that is clear
export function lookScore(l, best) {
  const g = l.galaxy * Math.min(1, l.galaxyIn / Math.max(best.galaxyIn, 1e-6)), s = l.sun * Math.min(1, l.sunIn / Math.max(best.sunIn, 1e-6));
  return FEATURE_W * (g + s) / 2 - TOP_W * l.topCloud;
}
export const keepsWords = (l) => l.wordCloud <= WORD_CAP && l.nameCloud <= NAME_CAP && l.nameSolid <= NAME_CAP;
export const discShown = (l, view) => !!(l.discs && l.discs[view] && l.discs[view].shown);
export const keepsDiscs = (l, own) => DISC_VIEWS.every((v) => !discShown(own, v) || discShown(l, v)) && !(l.sunIn < GLOW_KEEP * (own.sunIn || 0));

// a heading's look passes: the words clear, and the disc and glow kept, unless no heading measured on the land keeps both
// (k0 on Nov 24's world: the headings that face its sunset glow put cloud on the name), when the words alone hold
export const glowWaived = (land, own) => !Object.values(land).some((x) => keepsWords(x) && keepsDiscs(x, own));
export const keeps = (l, own, land) => keepsWords(l) && (keepsDiscs(l, own) || glowWaived(land, own));

const TABLE = /(function airHeading0\(\) \{ var T = )\[[^\]]*\]/;
export const KEY_INPUTS = [
  'src/realm-above.js',
  ['src/realm-dunes.js', ['function dAirDir(', 'function dAir(', 'var HELD_H=', 'function dHeld(', 'cloud:function(cl,PF,R)',
    'var DS=', 'var CUT_D=', 'function dSite(', 'var FORM_K=', 'function dGreat(', 'function dDetails(', 'function dDest(', 'var FORM_N=', 'function dForms(', 'function dSmall(', 'cell:function(C,R,K2)']],
  'src/world/120-cloud-bodies.js', 'src/world/210-cloud-volumes-baking.js', 'src/world/212-cloud-drift.js', 'src/world/231-cells-resolve.js',
  'src/world/215-air.js', 'src/world/270-flight.js', 'src/world/320-camera-drawn-between-last-two.js', 'src/world/386-frustum-resize.js',
  'src/world/390-words.js', 'site/index.html', 'site/style.css',
  'src/world/217-destination.js', 'src/world/230-cells-endless-world.js',
  'src/realm-kit.js',
];
// a piece of a file's code (minified: no comments, one spelling): from its head to the end of its declaration (a var's
// semicolon) or to the brace that closes its first open one
function piece(src, head) {
  const i = src.indexOf(head); if (i < 0) throw new Error('worldKey: ' + head + ' not found in the minified file');
  if (head.startsWith('var ')) return src.slice(i, src.indexOf(';', i) + 1);
  let d = 0, j = src.indexOf('{', i), q = null;
  for (; j < src.length; j++) {
    const c = src[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') q = c; else if (c === '{') d++; else if (c === '}' && --d === 0) break;
  }
  return src.slice(i, j + 1);
}
export async function worldKey(root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')) {
  const h = crypto.createHash('sha256'), { minify } = await import('terser');
  // the code alone (terser, neither compressed nor mangled: a comment or a space moves no look); a section is a run of
  // statements, so it is read as a function's body
  const code = async (src) => (await minify('function _(){' + src + '\n}', { compress: false, mangle: false, format: { comments: false } })).code;
  for (const inp of KEY_INPUTS) {
    const [f, heads] = Array.isArray(inp) ? inp : [inp, null], src = fs.readFileSync(path.join(root, f), 'utf8');
    h.update(f + '\0');
    if (f.endsWith('.html')) h.update(src.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' '));
    else if (f.endsWith('.css')) h.update(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' '));
    else if (heads) { const min = await code(src); for (const hd of heads) h.update(piece(min, hd)); }
    else h.update(await code(src.replace(TABLE, '$1[]')));
  }
  return h.digest('hex').slice(0, 16);
}

// The ruler (the hub's ask, 02:09Z Nov 25: looks.json, a stored record every key-input PR re-measured for 30 minutes
// and any other one landing first invalidated, is gone): the gate measures the table's headings and each land's own
// live, on the tree it gates (gate.yml's looks job: looks.mjs --table --check, a few lands a runner), whenever looksKey
// moved, and rule() is what fails it. Of the 12 times the stored key moved, 7 moved no table heading's figure at all and
// one by 0.002; the other four (#405, its revert, 270's new controllers) moved a words share by up to 0.028, the name's
// by 0.001: most re-measures were for nothing, yet a figure does move, and no narrower key of the files a change touches
// can tell which change will; the frames can.
export const AIR = 'src/world/215-air.js';
export const tableOf = (src) => { const m = /function airHeading0\(\) \{ var T = (\[[^\]]*\])/.exec(src); if (!m) throw new Error('airHeading0\'s table not found'); return JSON.parse(m[1]); };
// rule(rec, table, lands): each way the record fails the table on those lands (none: it keeps the words clear). rec is
// looks.mjs's record ({ lands: { k: { "<deg>"|"own": entry } } }), table airHeading0's
export function rule(rec, table, lands = [...Array(16).keys()]) {
  const bad = [];
  if (!(WORD_CAP <= 0.1 && NAME_CAP <= 0.02 && GLOW_KEEP >= 0.5)) bad.push(`the caps moved: words ${WORD_CAP} (want 0.1 at most), the name ${NAME_CAP} (0.02 at most), the glow kept ${GLOW_KEEP} (0.5 at least)`);
  if (table.length !== 16) bad.push(`the table has ${table.length} headings (want one for each of the 16 lands)`);
  for (const k of lands) {
    const land = (rec.lands || {})[k] || {}, h = lookKey(table[k]), l = land[h], own = land.own;
    if (!l) { bad.push(`k${k}: heading ${h} was not measured`); continue; }
    if (!own) { bad.push(`k${k}: the land's own heading was not measured`); continue; }
    if (!(l.wordCloud <= WORD_CAP)) bad.push(`k${k}: heading ${h} puts ${(l.wordCloud * 100).toFixed(1)}% of the words' boxes under cloud (want ${WORD_CAP * 100}% at most)`);
    if (!(l.nameCloud <= NAME_CAP)) bad.push(`k${k}: heading ${h} puts ${(l.nameCloud * 100).toFixed(1)}% of the name's box under cloud (want ${NAME_CAP * 100}% at most)`);
    if (!(l.nameSolid <= NAME_CAP)) bad.push(`k${k}: heading ${h} puts ${(l.nameSolid * 100).toFixed(1)}% of the name's box behind a solid (a floating island, a spire, a rock: want ${NAME_CAP * 100}% at most)`);
    if (!(keepsDiscs(l, own) || glowWaived(land, own))) bad.push(`k${k}: heading ${h} keeps sun light ${l.sunIn} against the own heading's ${own.sunIn} (want ${GLOW_KEEP} of it) or loses its disc`);
  }
  return bad;
}
// looksKey(root): what the ruler's answer depends on, so the gate measures only when it moved (base against head):
// worldKey, the table itself (worldKey blanks it) and the code that measures (looks.mjs, this file, T1's harness, the
// pinned browser). A root it cannot read (a key input missing, a piece not found) gets a key no other root has, so it is measured
export const MEASURE_INPUTS = ['tools/visit/looks.mjs', 'tools/visit/look-rule.mjs', '.github/ci/harness.mjs', '.github/ci/serve.mjs', '.github/actions/playwright/action.yml'];
export async function looksKey(root) {
  try {
    const h = crypto.createHash('sha256').update(await worldKey(root) + '\0' + JSON.stringify(tableOf(fs.readFileSync(path.join(root, AIR), 'utf8'))));
    for (const f of MEASURE_INPUTS) h.update('\0' + f + '\0' + fs.readFileSync(path.join(root, f)));
    return h.digest('hex').slice(0, 16);
  } catch (e) { return 'unread-' + crypto.randomUUID(); }
}
