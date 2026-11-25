// dune-shadow.mjs (tools/physics): the numbers for the dunes' cast shadows (the sand row "cast shadows": a crest's shadow
// over the next interdune at a low sun). The realm's key is 5-14 deg up, within 55 deg of upwind (215 AIR_KEY_EL,
// AIR_KEY_AZ; realm-dunes light), so the brinks stand between the sun and the lee: the slip face is in its own shade
// already (its normal faces downwind, n.l < 0: drawn today), but the shadow the brink casts past the slip face's toe,
// over the interdune floor and up the next stoss, is not drawn (those faces turn toward the sun and are lit).
// The profile, one wavelength along the wind (the main dunes: 205 m, 32 m x amp, amp 0.25-1: 8-32 m high; dunes-glsl
// s1Phase, duneS1): the brink at x = 0, the slip face at the angle of repose (33 deg) down to its toe, a level floor,
// the stoss rising at 7-15 deg to the next brink (the hub's sand spec: a gentle windward slope 7-15 deg, a slip face).
// The sun's ray across the dunes falls at tan(e) / cos(da), da its azimuth off the wind (the shadow is cast along the
// sun's azimuth; across the dune lines only its along-wind part counts). The penumbra: the sun's disc, 0.53 deg.
//   node tools/physics/dune-shadow.mjs [--lambda 205]
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = +process.argv[i + 1];
const LAM = A.lambda ?? 205, REPOSE = 33, DEG = Math.PI / 180;
export function profile(h, lam = LAM) {   // the brink at 0; the toe, the floor's end and the next brink (m)
  const xt = h / Math.tan(REPOSE * DEG), stossMin = h / Math.tan(15 * DEG), stossMax = h / Math.tan(7 * DEG);
  const stoss = Math.min(Math.max(lam - xt, stossMin), stossMax), xs = Math.max(lam - stoss, xt);
  const y = (x) => x <= xt ? h - x * Math.tan(REPOSE * DEG) : x <= xs ? 0 : h * (x - xs) / (lam - xs);
  return { xt, xs, lam, y, stossDeg: Math.atan(h / (lam - xs)) / DEG };
}
export function castShadow(h, eDeg, daDeg, lam = LAM) {   // where the brink's shadow ends, and how much of the wavelength it covers past the toe
  const P = profile(h, lam), s = Math.tan(eDeg * DEG) / Math.max(Math.cos(daDeg * DEG), 1e-3);
  let x = P.xt; while (x < lam && h - x * s > P.y(x)) x += 0.05;
  const onStoss = Math.max(0, x - P.xs);
  return { end: x, past: (x - P.xt) / lam, floor: Math.min(x, P.xs) - P.xt, stoss: onStoss, reachesNext: x >= lam - 0.05, pen: x * 0.53 * DEG };
}
if (process.argv[1] && process.argv[1].endsWith('dune-shadow.mjs')) {
  console.log(`the main dunes, wavelength ${LAM} m; slip face ${REPOSE} deg; stoss 7-15 deg. The share of a wavelength in the brink's cast shadow past the slip face's toe (not drawn today), the shadow's end (m from the brink), its run up the next stoss, its penumbra at its end`);
  for (const h of [8, 16, 24, 32]) {
    const P = profile(h);
    console.log(`  h ${h} m: slip face to ${P.xt.toFixed(0)} m, floor to ${P.xs.toFixed(0)} m, stoss ${P.stossDeg.toFixed(1)} deg`);
    for (const da of [0, 30, 55]) {
      const row = [5, 8, 11, 14].map((e) => { const c = castShadow(h, e, da); return `e ${String(e).padStart(2)}: ${(100 * c.past).toFixed(0).padStart(3)}% (to ${c.end.toFixed(0)} m${c.stoss > 0 ? `, ${c.stoss.toFixed(0)} m up the stoss` : ''}${c.reachesNext ? ', the whole lee' : ''})`; });
      console.log(`    sun ${String(da).padStart(2)} deg off the wind  ${row.join('  ')}`);
    }
  }
  // the share of the land in the brinks' shadow, over the realm's keys (e uniform 5-14, da uniform -55..55) and the
  // dunes' heights (amp uniform 0.25-1)
  let n = 0, sum = 0, any = 0;
  for (let e = 5; e <= 14; e += 0.5) for (let da = 0; da <= 55; da += 5) for (let amp = 0.25; amp <= 1.0001; amp += 0.05) { const c = castShadow(32 * amp, e, da); sum += c.past; any += c.past > 0.02 ? 1 : 0; n++; }
  console.log(`over the realm's keys and the dunes' heights: on average ${(100 * sum / n).toFixed(0)}% of the dune field lies in a brink's cast shadow that is not drawn; ${(100 * any / n).toFixed(0)}% of the cases have one over 2% of a wavelength`);
}
