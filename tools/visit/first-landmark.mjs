// tools/visit/first-landmark.mjs: the numbers for one landmark per land within the first minute's line (the hub's bar: a
// first near pass by 90 s on every land, with the words clear and half the low sun's glow kept). For each land: its
// landing heading, the land under the first minute (the maps' cloud weight wC along it: the dune sea, a coast or the
// cloud sea, so the kit that raises the landmark), today's first near pass (tools/visit/ruler.mjs), and where the
// landmark goes: D m down the line, S m to one side, so its centre bears atan(S / D) off the heading in the first frame.
// The words' boxes in the first frame (measured in T1's frames, the day opening): the laptop's text spans +-11.4 deg of
// the centre (half its frame, 36 deg), the phone's +-18.5 deg (half its frame, 21 deg); the name sits over them. So a
// form W m wide clears every box on both when atan(S / D) - atan(W / 2 / D) is over 18.5 deg plus a margin, and the
// near pass (its centre within 150 m of the way) comes at D / 12 s.
//   node tools/visit/first-landmark.mjs [--d 290] [--s 145] [--w 60] [--k 0,1,2,11,13]
import { flyLand, NEAR } from './ruler.mjs';
const A = { d: 290, s: 145, w: 60, k: '0,1,2,11,13' };
for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const D = +A.d, S = +A.s, W = +A.w, DEG = 180 / Math.PI, PHONE = 18.5, LAPTOP = 11.4, V = 12;
const bear = Math.atan(S / D) * DEG, half = Math.atan(W / 2 / D) * DEG, inner = bear - half;
console.log(`the landmark ${D} m down the line, ${S} m to the side, ${W} m wide: its centre bears ${bear.toFixed(1)} deg, its inner edge ${inner.toFixed(1)} deg (the phone's words end at ${PHONE}, the laptop's at ${LAPTOP}: ${(inner - PHONE).toFixed(1)} and ${(inner - LAPTOP).toFixed(1)} deg clear); passed ${S} m off (within ${NEAR}: ${S <= NEAR}) at ${(D / V).toFixed(0)} s`);
for (const k of String(A.k).split(',').map(Number)) {
  const r = flyLand(k, 180), near = r.places.filter((p) => p.d <= NEAR && p.t >= 0).sort((a, b) => a.t - b.t)[0];
  const at = r.sea.filter((q) => Math.abs(q.t - D / V) <= 4).map((q) => q.wC), wC = at.reduce((a, b) => a + b, 0) / Math.max(at.length, 1);
  const ground = wC > 0.7 ? 'the cloud sea (the above kit: an isle with its temple)' : wC > 0.3 ? 'a coast (the dunes kit: its forms rise out of the sea)' : 'the dune sea (the dunes kit)';
  console.log(`  k${k}: heading ${(r.heading * DEG).toFixed(0)} deg; today's first near pass ${near ? `${near.t.toFixed(0)} s (${near.kind})` : 'none in 180 s'}; under the landmark wC ${wC.toFixed(2)}: ${ground}`);
}
