// destination.mjs (tools/physics): the numbers for the horizon's destination over the dune sea (one colossal form per
// land, on its landing heading). The haze between the eye and the form is main's aerial perspective (lib-air: atmos's
// green, the dunes realm's tuned haze times uAer.x, the gas along its slant path), read at the form's height; the form's
// own contrast against the horizon sky is the realm's rock against its sky (OKLab L 0.60 lit, 0.50 shade, sky 0.80
// at the horizon); its size at laptop and phone size (render 1800 px high, tan 0.454; 2556, tan 0.832).
//   node tools/physics/destination.mjs [--eye 18] [--aer 1]
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = +process.argv[i + 1];
const FOG = [2.0e-4, 1 / 220, 0, 0.6e-4], EYE = A.eye ?? 18, AER = A.aer ?? 1, BRG = 13.5e-6;
export function transmission(d, h, eye = EYE, aer = AER, fog = FOG) {   // green, eye -> a point d out (m, level) and h up
  const t = Math.hypot(d, h - eye), ry = (h - eye) / t, [a, b, y0, w] = fog;
  const k = b * ry * t, f = Math.abs(k) < 1e-4 ? 1 - 0.5 * k : (1 - Math.exp(-k)) / k;
  const kg = ry * t / 8000, fg = Math.abs(kg) < 1e-4 ? 1 - 0.5 * kg : (1 - Math.exp(-kg)) / kg;
  return Math.exp(-((a * Math.exp(-b * (eye - y0)) * t * f + w * t) * aer + BRG * t * Math.exp(-eye / 8000) * fg));
}
const Y = (L) => L * L * L;   // (OKLab L to relative luminance, neutral)
export const C0 = { lit: (Y(0.60) - Y(0.80)) / Y(0.80), shade: (Y(0.50) - Y(0.80)) / Y(0.80) };
if (process.argv[1] && process.argv[1].endsWith('destination.mjs')) {
  const Fl = 1800 / (2 * 0.454), Fp = 2556 / (2 * 0.832);
  console.log(`the form's own contrast against the horizon sky: lit ${C0.lit.toFixed(2)}, shade ${C0.shade.toFixed(2)}; eye ${EYE} m, uAer.x ${AER}`);
  for (const d of [6000, 7000, 7500, 8000, 9000, 10000]) {
    const row = [0, 100, 200, 300, 400, 500, 700].map((h) => transmission(d, h));
    console.log(`  ${(d / 1000).toFixed(1)} km  T at 0/100/200/300/400/500/700 m: ${row.map((v) => v.toFixed(3)).join(' ')}  apparent contrast at 400 m lit ${(C0.lit * row[4]).toFixed(3)} shade ${(C0.shade * row[4]).toFixed(3)}`);
  }
  for (const [n, H, W] of [['inselberg', 350, 3000], ['neck spire', 480, 500], ['high inselberg', 700, 2500]])
    for (const d of [7500, 9000]) console.log(`  ${n} ${H} m x ${W} m at ${d / 1000} km: ${(H / d * Fl).toFixed(0)} x ${(W / d * Fl).toFixed(0)} px laptop, ${(H / d * Fp).toFixed(0)} x ${(W / d * Fp).toFixed(0)} px phone; reached at 12 m/s in ${(d / 12 / 60).toFixed(1)} min`);
}
