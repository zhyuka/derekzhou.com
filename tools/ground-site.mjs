// ground-site.mjs: the page the recorded ground is read from, and the measure of a recording against it.
//   hookedSite(out)                      builds the plain site into out/site and puts the readable world.js in its
//                                        place with the ground hook at its end (self.__GROUND(xz): the world's own
//                                        probe program's camera's ground, mode 1, and kitAt's sea weight, at points).
//                                        Never served: tools/gpu/record-ground.mjs (the 4090) and
//                                        tools/ground-fresh.mjs (SwiftShader, every check) read the same page.
//   points(meta, step)                   the recording's grid, every step-th point each way: { idx, xz }
//   measure(meta, all, idx, got, tol)    the recording (all: float32, the heights then the weights) against a fresh
//                                        read (got: { h, w }) at idx: { n, dh, dw, off, worst }
// (CI lane, 2026-11-14) the recording's freshness is measured, not hashed: a hash of the land's source files never
// knew every input (main's recording of 2026-11-11 was 47 m off a fresh one while its hash still matched: what seed
// 11 opens on had moved, in files no list held), and it made every sky edit wait for a re-record. The probe under
// SwiftShader reads the 4090's ground to a few cm (measured on fresh recordings, every 10th point: max 0.0030 m before
// the S1 dunes, 0.041 m on them at seed 3, their slip faces steep; the weights 3e-8), and a stale one is metres off.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';

export const TOL = { h: 0.05, w: 1e-5 };   // (metres, and the sea weight: the two devices differ by up to 4.1 cm (seed 3, on the S1 slip faces) and 3e-8)

export const HOOK = `
  /* (tools/ground-site.mjs, this copy only, never served) the camera's ground at points, by the world's probe, and the sea's weight */
  self.__GROUND = function (xz) {
    var V = SIM.V; if (!V || !READY || !shown) return null;
    var k, m = xz.length / 2, pts = new Float32Array(xz), J = probeJob(V, pts, m, 1, true), w = [];
    for (k = 0; k < m; k++) w.push(kitAt(pts[2 * k], pts[2 * k + 1]).wC);
    return { h: Array.from(J.h), w: w, seaLo: SEA_LO, rise: RISE, renderer: EXT.renderer };
  };
`;

export function hookedSite(root, out) {
  const site = path.join(out, 'site');
  execFileSync(process.execPath, [path.join(root, 'tools/build.mjs'), '--plain', site], { cwd: root, stdio: 'ignore' });
  execFileSync(process.execPath, [path.join(root, 'tools/parts.mjs'), 'assemble', '--min-glsl', path.join(root, 'src'), path.join(out, 'ship')], { cwd: root, stdio: 'ignore' });   // (the world readable, its GLSL as the build minifies it: the dev assembly, the record in it but off, REC null and DEVMODE false, so it runs as the shipped page does)
  const readable = fs.readFileSync(path.join(out, 'ship', 'world.js'), 'utf8'), end = readable.lastIndexOf('})();');
  if (end < 0) throw new Error('ground-site: the world script\'s end not found');
  fs.writeFileSync(path.join(site, 'world.js'), readable.slice(0, end) + HOOK + readable.slice(end));
  return site;
}

export function points(meta, step) {
  const idx = [], xz = [];
  for (let j = 0; j < meta.n; j += step) for (let i = 0; i < meta.n; i += step) { idx.push(j * meta.n + i); xz.push(meta.x0 + i * meta.cell, meta.z0 + j * meta.cell); }
  return { idx, xz };
}

export function measure(meta, all, idx, got, tol = TOL) {
  const N = meta.n * meta.n; let dh = 0, dw = 0, off = 0, worst = null;
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k], a = Math.abs(got.h[k] - all[i]), b = Math.abs(got.w[k] - all[N + i]);
    if (!(a <= tol.h) || !(b <= tol.w)) { off++; if (!worst || a > worst.dh) worst = { x: meta.x0 + (i % meta.n) * meta.cell, z: meta.z0 + Math.floor(i / meta.n) * meta.cell, recorded: all[i], now: got.h[k], dh: a }; }
    if (a > dh || a !== a) dh = a; if (b > dw || b !== b) dw = b;
  }
  return { n: idx.length, dh, dw, off, worst };
}
