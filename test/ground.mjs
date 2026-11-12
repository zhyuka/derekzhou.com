// test/ground.mjs: the land's real ground for the sims, recorded once on the 4090 (tools/gpu/record-ground.mjs), and the
// guard that keeps a stale recording from ever being judged against.
//   landHash()          the fingerprint of the text of every source the land's height and the sea of cloud depend on,
//                       comments blanked (tools/checks/nocomments.mjs), paths left out: a comment edit or a byte-for-byte
//                       split needs no new recording
//   loadGround(seed)    { groundAt(x, z), seaW(x, z), seaLv(x, z), meta } from test/golden/ground/<seed>.bin and .json;
//                       throws, saying how to re-record, when the recording's hash is not today's landHash()
// The recording is the world's own: its probe program's "camera's ground" (what the ink birds' host reads) on a grid
// about the landing, and the cloud sea's weight from its CPU maps (kitAt), for the world drawn from the seed's entropy.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { strip } from '../tools/checks/nocomments.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIR = path.join(ROOT, 'test', 'golden', 'ground');
export const RERECORD = 'node tools/gpu/record-ground.mjs on the 4090';
/* what the land's height and the sea's weight are made from: the kits and their GLSL, the world's composition of them,
   the maps and the weights' grids (the sites, the regimes, kitAt), the programs and the probe that reads the ground */
export const INPUTS = ['src/glsl', 'src/world/glsl', 'src/realm-kit.js', 'src/realm-dunes.js', 'src/realm-above.js',
  'src/world/060-glsl-shared-library.js', 'src/world/070-programs.js', 'src/world/130-maps-director.js', 'src/world/131-noise.js', 'src/world/132-maps.js',
  'src/world/136-director.js', 'src/world/138-numbers.js', 'src/world/140-kits-one-world.js', 'src/world/150-maps-tick.js', 'src/world/160-weights-grids.js',
  'src/world/180-world-definition-two-kits-by.js', 'src/world/190-realm-programs.js', 'src/world/250-probes-realm-ground-read-back.js'];

// (2026-11-12) the hash of the land's TEXT, not of its files: every input's code, comments blanked, the files taken in
// name order (the order parts.mjs assembles a folder in) and joined as one text, with no path in it. So a section
// split byte for byte into two input files (the new name listed in INPUTS) keeps the hash and needs no re-record on the
// 4090; any edit to the code of an input, a missing input or a reordering of the text changes it.
export function landHash(root = ROOT, inputs = INPUTS) {
  const files = [];
  let text = '';
  for (const p of inputs) {
    const f = path.join(root, p);
    if (!fs.existsSync(f)) { text += '\nmissing ' + p + '\n'; continue; }
    if (fs.statSync(f).isDirectory()) for (const n of fs.readdirSync(f).sort()) files.push(p + '/' + n); else files.push(p);   // (forward slashes: the same order on Windows and Linux)
  }
  for (const p of files.sort()) text += strip(fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n'), false) + '\n';
  text = text.replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n');
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function loadGround(seed) {
  const jf = path.join(DIR, seed + '.json'), bf = path.join(DIR, seed + '.bin');
  if (!fs.existsSync(jf) || !fs.existsSync(bf)) throw new Error(`no recorded ground for seed ${seed} (${path.relative(ROOT, jf)}): ${RERECORD} --seed ${seed}`);
  const meta = JSON.parse(fs.readFileSync(jf, 'utf8')), now = landHash();
  if (meta.hash !== now) throw new Error(`the recorded ground for seed ${seed} is stale (recorded under ${meta.hash}, the land's sources are now ${now}): re-record: ${RERECORD} --seed ${seed}`);
  const b = fs.readFileSync(bf), all = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4), N = meta.n * meta.n;
  const H = all.subarray(0, N), W = all.subarray(N, 2 * N);
  const at = (A, x, z) => {   // bilinear, clamped to the recorded square
    const fx = Math.min(Math.max((x - meta.x0) / meta.cell, 0), meta.n - 1.000001), fz = Math.min(Math.max((z - meta.z0) / meta.cell, 0), meta.n - 1.000001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, n = meta.n;
    return (A[j * n + i] * (1 - u) + A[j * n + i + 1] * u) * (1 - v) + (A[(j + 1) * n + i] * (1 - u) + A[(j + 1) * n + i + 1] * u) * v;
  };
  return { meta, groundAt: (x, z) => at(H, x, z), seaW: (x, z) => at(W, x, z), seaLv: (x, z) => meta.seaLo + meta.rise * at(W, x, z),
    inside: (x, z) => x >= meta.x0 && z >= meta.z0 && x <= meta.x0 + (meta.n - 1) * meta.cell && z <= meta.z0 + (meta.n - 1) * meta.cell };
}
