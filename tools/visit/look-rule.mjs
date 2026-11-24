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
// worldKey: what the looks were measured on, the assembled world script with airHeading0's table blanked and the two
// realms that lay out the clouds; looks.json keeps it, and test/unit/ruler.mjs fails the record once the world moves
// (any change to the world, the cloud layer's above all, can put a cloud behind the words: re-run looks.mjs)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
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
export function worldKey(root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lookkey-'));
  try {
    execFileSync(process.execPath, [path.join(root, 'tools', 'parts.mjs'), 'assemble', path.join(root, 'src'), path.join(tmp, 'src')], { stdio: 'ignore' });
    const h = crypto.createHash('sha256');
    h.update(fs.readFileSync(path.join(tmp, 'src', 'world.js'), 'utf8').replace(TABLE, '$1[]'));
    for (const r of ['realm-dunes.js', 'realm-above.js']) h.update(fs.readFileSync(path.join(tmp, 'src', r), 'utf8'));
    return h.digest('hex').slice(0, 16);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
