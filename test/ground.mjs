// test/ground.mjs: the land's real ground for the sims, recorded on the 4090 (tools/gpu/record-ground.mjs).
//   loadGround(seed)    { groundAt(x, z), seaW(x, z), seaLv(x, z), meta } from test/golden/ground/<seed>.bin and .json
// The recording is the world's own: its probe program's "camera's ground" (what the ink birds' host reads) on a grid
// about the landing, and the cloud sea's weight from its CPU maps (kitAt), for the world drawn from the seed's entropy.
// Whether it is today's world's is measured, not hashed (2026-11-14): tools/checks/37-ground-fresh.sh reads the same
// probe under SwiftShader (tools/ground-fresh.mjs) and fails on a recording metres off; a hash of a list of source
// files missed what seed 11 opens on, and blessed a recording 47 m stale.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIR = path.join(ROOT, 'test', 'golden', 'ground');
export const RERECORD = 'node tools/gpu/record-ground.mjs on the 4090';
export function loadGround(seed) {
  const jf = path.join(DIR, seed + '.json'), bf = path.join(DIR, seed + '.bin');
  if (!fs.existsSync(jf) || !fs.existsSync(bf)) throw new Error(`no recorded ground for seed ${seed} (${path.relative(ROOT, jf)}): ${RERECORD} --seed ${seed}`);
  const meta = JSON.parse(fs.readFileSync(jf, 'utf8'));
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
