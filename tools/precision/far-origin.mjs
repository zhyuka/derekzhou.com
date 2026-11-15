// far-origin.mjs: how fp32 world coordinates degrade in a long session (the large-world audit, 2026-11-14).
// Each world-anchored value the GPU reads (the camera, vertex positions, the noise domains' inputs) rounded to fp32 at a
// distance R from the start, as metres and as laptop pixels where it is drawn (1440x900, 72 deg: about 0.001 m a pixel
// a metre). The flight goes 12 m/s: 131 km is three hours, 524 km twelve.
//   node tools/precision/far-origin.mjs
const F = Math.fround, PXM = 2 * Math.tan(36 * Math.PI / 180) / 1.6 / 900;   // (tanY = tanX / aspect)
function ulp(x) { x = Math.abs(F(x)); const a = new Float32Array([x]), b = new Int32Array(a.buffer); b[0]++; return a[0] - x; }
// worst rounding error of x = p / s in fp32 (p at distance R), expressed back in metres: s * ulp(R / s) / 2 (plus p's own rounding, ulp(R)/2)
const dom = (R, s) => ulp(R) / 2 + s * ulp(R / s) / 2;
const rows = [
  // [what, metres of the feature, distance drawn (m) for pixels]
  ['camera position uCam (whole frame judders as the camera moves)', null, 14, (R) => ulp(R) / 2],
  ['  same, at 3 m (a bird or a perch passing close)', null, 3, (R) => ulp(R) / 2],
  ['vertex positions (land rings, landmark and creature buffers: static snap)', null, 14, (R) => ulp(R) / 2],
  ['sand grain h12(p.xz * 9) (0.11 m cells; drawn under 0.04 m a pixel)', 0.111, 40, (R) => dom(R, 1 / 9)],
  ['ripple phase dot(p, w) / 0.9 (drawn under 0.05 m a pixel)', 0.9, 50, (R) => dom(R, 0.9)],
  ['ripple warp n3v(p / 61) (61 m)', 61, 50, (R) => dom(R, 61)],
  ['A_Hd near domes gnd(p / 17) (17 m, vertex heights)', 17, 120, (R) => dom(R, 17)],
  ['dunes dN(p / 140), plateau terraces (140 m)', 140, 300, (R) => dom(R, 140)],
  ['cloud billows |P| / scale, scale drifting by 1e-4 (#221)', null, 300, (R) => R * 1e-4],
];
for (const R of [86e3, 131e3, 524e3]) {
  console.log(`\n${(R / 1e3).toFixed(0)} km from the start (fp32 ulp of R: ${ulp(R)} m)`);
  for (const [what, feat, dist, f] of rows) {
    const e = f(R), px = e / (dist * PXM);
    console.log(`  ${what.padEnd(78)} ${(e * 100).toFixed(2).padStart(7)} cm  ${px.toFixed(2).padStart(6)} px at ${dist} m${feat ? `  (${(e / feat * 100).toFixed(3)}% of the feature)` : ''}`);
  }
  const arg = 2 * Math.PI * R / 0.9; console.log(`  ripple cos(2 pi ph): argument ${arg.toExponential(2)} rad, its fp32 ulp ${ulp(arg).toFixed(3)} rad (${(ulp(arg) / (2 * Math.PI) * 100).toFixed(1)}% of a ripple)`);
}
