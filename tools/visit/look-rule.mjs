// tools/visit/look-rule.mjs: what a first heading's look must keep, and how the looks are weighed (the hub's reviews of
// #312, Nov 23 and 24: the score, not a hand pick). The measures are looks.mjs's (its record: tools/visit/looks.json).
//   WORD_CAP  the most of the words' boxes a heading may put under cloud, in any of the three frames (a bright cloud
//             behind the light words is the worst case)
//   NAME_CAP  the most of the name's own box under cloud: the name is the page's one picture of words
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
// Not the sky (the sun, the stars, the Milky Way: a feature's light is a score, not a cap), the land's surface or the
// birds. looks.json keeps the key; test/unit/ruler.mjs fails the record once it moves: re-run looks.mjs --table
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const WORD_CAP = 0.1, NAME_CAP = 0.02, FEATURE_W = 0.5, TOP_W = 0.25, GLOW_KEEP = 0.5, DISC_VIEWS = ['laptop-sunset', 'phone-dawn'];
export const lookKey = (deg) => (deg === null ? 'own' : String(deg));
// the feature: how much of its light is in frame against the land's best (bestIn), and how much of that is clear
export function lookScore(l, best) {
  const g = l.galaxy * Math.min(1, l.galaxyIn / Math.max(best.galaxyIn, 1e-6)), s = l.sun * Math.min(1, l.sunIn / Math.max(best.sunIn, 1e-6));
  return FEATURE_W * (g + s) / 2 - TOP_W * l.topCloud;
}
export const keepsWords = (l) => l.wordCloud <= WORD_CAP && l.nameCloud <= NAME_CAP;
export const discShown = (l, view) => !!(l.discs && l.discs[view] && l.discs[view].shown);
export const keepsDiscs = (l, own) => DISC_VIEWS.every((v) => !discShown(own, v) || discShown(l, v)) && !(l.sunIn < GLOW_KEEP * (own.sunIn || 0));

// a heading's look passes: the words clear, and the disc and glow kept, unless no heading measured on the land keeps both
// (k0 on Nov 24's world: the headings that face its sunset glow put cloud on the name), when the words alone hold
export const glowWaived = (land, own) => !Object.values(land).some((x) => keepsWords(x) && keepsDiscs(x, own));
export const keeps = (l, own, land) => keepsWords(l) && (keepsDiscs(l, own) || glowWaived(land, own));

const TABLE = /(function airHeading0\(\) \{ var T = )\[[^\]]*\]/;
export const KEY_INPUTS = [
  'src/realm-above.js',
  ['src/realm-dunes.js', ['function dAirDir(', 'function dAir(', 'var HELD_H=', 'function dHeld(', 'cloud:function(cl,PF,R)']],
  'src/world/120-cloud-bodies.js', 'src/world/210-cloud-volumes-baking.js', 'src/world/212-cloud-drift.js', 'src/world/231-cells-resolve.js',
  'src/world/215-air.js', 'src/world/270-flight.js', 'src/world/320-camera-drawn-between-last-two.js', 'src/world/386-frustum-resize.js',
  'src/world/390-words.js', 'site/index.html', 'site/style.css',
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
