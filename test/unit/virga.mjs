// test/unit/virga.mjs: virga (physics: clouds/virga, 213-virga.js): the strands' share by sky from the body's own
// seed, their lowest point, and their tilt by the air's shear against the body's wind, atan(dU / w), at every step.
// plant: {"file": "src/world/213-virga.js", "find": "a = airBase(0, 0, y, V); x += (a.x - bx) / w * dz; z += (a.z - bz) / w * dz;", "with": "a = airBase(0, 0, y, V); x += a.x / w * dz; z += a.z / w * dz;", "why": "the strand blown by the wind itself, not by the wind against its body (laid over in still shear)"}
// plant: {"file": "src/world/213-virga.js", "find": "a = airBase(0, 0, y, V); x += (a.x - bx) / w * dz; z += (a.z - bz) / w * dz;", "with": "a = airBase(0, 0, y, V); x += (a.x - bx) / w0 * dz; z += (a.z - bz) / w0 * dz;", "why": "the drops never shrink (the strand's tilt by the fall at its base all the way down)"}
// plant: {"file": "src/world/213-virga.js", "find": "var VIRGA_SHARE = { afterglow: 0.3, bluehour: 0.2 },", "with": "var VIRGA_SHARE = { afterglow: 0.3, bluehour: 0.2, firstlight: 0.2 },", "why": "virga on a sky that is not a dusk's"}
// plant: {"file": "src/world/213-virga.js", "find": "VIRGA_END = [0.4, 0.7],", "with": "VIRGA_END = [0.2, 0.7],", "why": "strands hanging nearly to the ground"}
// plant: {"file": "src/world/213-virga.js", "find": "return !!s && hfl(hk(seed >>> 0, 0x76a1)) < s;", "with": "return !!s && hfl(hk(seed >>> 0, 0x76a1)) < 2 * s;", "why": "twice the share of strands"}
// plant: {"file": "src/world/231-cells-resolve.js", "find": "if (C.air && SHOWNT >= 0 && clb &&", "with": "if (C.air && clb &&", "why": "virga on the boot's bodies, in sight at the cut (the program is late: they gain it in view, a pop; the stills hold none)"}
// plant: {"file": "src/world/231-cells-resolve.js", "find": "if (C.air && SHOWNT >= 0 && clb &&", "with": "if (SHOWNT >= 0 && clb &&", "why": "virga under the cloud sea's canyon walls"}
// plant: {"file": "src/world/410-drawing-frame.js", "find": "      if (B.vg && !(EP.virga && EP.virga.ok) && B.fade > 0) B.vg = null;", "with": "", "why": "a body in sight before the late program is made gains its strand in view (a pop)"}
// plant: {"file": "src/world/073-late-programs.js", "find": "'engine.beam', 'engine.virga'];   // (virga: none before the show, 231)", "with": "'engine.beam'];", "why": "virga's program issued before the show (the boot's frames)"}
// plant: {"file": "src/world/360-engine-programs.js", "find": "return l[0] !== 'virga' || lateCan();", "with": "return true;", "why": "virga's program made before the show where no program can be late (WebKit's and the byte phones' boots a frame or two longer)"}
// plant: {"file": "src/world/213-virga.js", "find": " gl.uniform3fv(P.u.uGP, g.p);", "with": "", "why": "the strand's path never handed to its program (a NaN strip, drawn nowhere)"}
import { test, assert, vm, WORLD, cut, STREAMS } from '../unit-lib.mjs';

const AIRSRC = cut(WORLD, '  var AIR_H = {', '\n', true) + cut(WORLD, '  var AIR_U10 =', '\n', true) + cut(WORLD, '  var AIR_W = {', '\n', true) + cut(WORLD, '  var AIR_P = {', '  function airU10(') +
  cut(WORLD, '  function u10Of(', '\n', true) + cut(WORLD, '  function airBase(', '  function airVec3(');
const VIRGA = cut(WORLD, '  var VIRGA_SHARE = ', '  /* ---------------------------------------------------------------- the air');
const G = vm.runInThisContext('(function () { var PI = Math.PI, SIM = { V: null };\n' + STREAMS + AIRSRC + VIRGA +
  ' return { virgaOn: virgaOn, virgaPath: virgaPath, airBase: airBase, AIR_H: AIR_H, VIRGA_N: VIRGA_N }; })')();
const visit = (u10, a = 0.7) => ({ wind: [Math.sin(a), Math.cos(a)], u10 });
const SEEDS = Array.from({ length: 400 }, (_, i) => (i * 2654435761 + 977) >>> 0);

test('virga: on 30% of the afterglow\'s new bodies and 20% of the blue hour\'s, by the body\'s own seed; on no other sky', () => {
  const N = 40000, share = (sky) => { let n = 0; for (let i = 0; i < N; i++) n += G.virgaOn((i * 2246822519 + 3) >>> 0, sky); return n / N; };
  assert.ok(Math.abs(share('afterglow') - 0.3) < 0.01, `afterglow ${share('afterglow')}`);
  assert.ok(Math.abs(share('bluehour') - 0.2) < 0.01, `blue hour ${share('bluehour')}`);
  for (const sky of ['firstlight', 'moonlit', 'milkyway', 'aurora', undefined]) assert.equal(share(sky), 0, `virga on ${sky}`);
  for (const s of SEEDS) assert.equal(G.virgaOn(s, 'afterglow'), G.virgaOn(s, 'afterglow'), 'the same body, the same answer');
});

test('virga: the lowest point 40-70% of the base\'s height (never under 0.3 of it), the fall 1-4 m/s slowing as the drops shrink', () => {
  for (const base of [480, 560, 680, 1200]) for (const s of SEEDS) {
    const P = G.virgaPath(visit(6), s, base), low = base + P.p[P.p.length - 2];
    assert.ok(low >= 0.3 * base && low >= 0.4 * base - 1e-6 && low <= 0.7 * base + 1e-6, `the strand ends ${low.toFixed(1)} m up under a ${base} m base`);
    assert.ok(P.w0 >= 1 && P.w0 <= 4, `a fall of ${P.w0} m/s`);
    for (let i = 1; i < P.w.length; i++) assert.ok(P.w[i] < P.w[i - 1], 'the fall does not slow');
  }
});

test('virga: each step leans off the vertical by atan(dU / w), dU the air there against the body\'s (within 5 deg); straight where there is no shear', () => {
  let bent = 0, worst = 0;
  for (const u10 of [3, 5, 6, 7.5]) for (const a of [0, 1.3, 2.9, 4.4]) for (const base of [480, 600, 680]) for (const s of SEEDS.slice(0, 60)) {
    const V = visit(u10, a), P = G.virgaPath(V, s, base), n = G.VIRGA_N, dz = (base - P.end) / n;
    const B = { ...G.airBase(0, 0, G.AIR_H.clouds, V) };
    for (let i = 0; i < n; i++) {
      const dx = P.p[3 * (i + 1)] - P.p[3 * i], dzz = P.p[3 * (i + 1) + 2] - P.p[3 * i + 2], y = base - (i + 0.5) * dz;
      const W = { ...G.airBase(0, 0, y, V) }, du = Math.hypot(W.x - B.x, W.z - B.z), w = (P.w[i] + P.w[i + 1]) / 2;
      const want = Math.atan(du / w) * 180 / Math.PI, got = Math.atan(Math.hypot(dx, dzz) / dz) * 180 / Math.PI;
      worst = Math.max(worst, Math.abs(got - want));
      assert.ok(Math.abs(got - want) <= 5, `U10 ${u10}, ${y.toFixed(0)} m: leans ${got.toFixed(1)} deg, the shear gives ${want.toFixed(1)}`);
      if (y > 300 + dz) assert.ok(got < 1e-6, `bent ${got} deg at ${y.toFixed(0)} m, where the air is the body's`);
      if (du > 0.5) { bent++; assert.ok((dx * B.x + dzz * B.z) < 0, 'the strand leans ahead of its body (it trails back in slower air)'); }
    }
  }
  assert.ok(bent > 100, `only ${bent} steps bent: no shear met`);
  console.log(`# virga: the worst step ${worst.toFixed(2)} deg off atan(dU / w); ${bent} steps in shear`);
});

// (the hub, 2026-11-25: the program late, so the boot pays nothing: virga only on free clouds born after the world shows,
// at the stream's front beyond sight; none at the cut, so the stills hold none; and a body in sight before the program is
// made never gains its strand: no pop)
test('virga: only on free clouds born after the show; never gained in sight; its program late and held to the show', () => {
  assert.match(WORLD, /if \(C\.air && SHOWNT >= 0 && clb && !PF\.bodies\[bi\]\.flow && clb\.seed !== undefined && virgaOn\(clb\.seed, virgaSky\(V\)\)\) vb\.out\.vg = virgaBody\(/, 'virga chosen on a body that is not a free cloud born after the show');
  const late = /LATE_ALWAYS = \[([^\]]*)\]/.exec(WORLD)[1], held = /LATE_HELD = \[([^\]]*)\]/.exec(WORLD)[1];
  assert.ok(late.includes("'engine.virga'") && held.includes("'engine.virga'"), 'virga\'s program not late and held to the show');
  const L = WORLD.split('\n'), drop = L.findIndex((l) => l.includes('if (B.vg && !(EP.virga && EP.virga.ok) && B.fade > 0) B.vg = null;')), draw = L.findIndex((l) => l.includes('if (B.vg && EP.virga && EP.virga.ok) { drawVirga(B, EP.virga, V);'));
  assert.ok(drop >= 0 && draw === drop + 1, 'a body in sight without its program keeps its strand for later (a pop)');
  assert.equal((WORLD.match(/drawVirga\(/g) || []).length, 2, 'virga drawn somewhere else');
  // (its draw hands the program its top, its path and its width: a strand with no path is a NaN strip, drawn nowhere)
  const dv = WORLD.slice(WORLD.indexOf('  function drawVirga('), WORLD.indexOf('\n  }\n', WORLD.indexOf('  function drawVirga(')));
  for (const u of ['uGA', 'uGP', 'uGW']) assert.ok(dv.replace(/\/\/[^\n]*/g, '').includes('P.u.' + u), `virga's draw never sets ${u}`);
  assert.ok(WORLD.includes("list = list.filter(function (l) { return l[0] !== 'virga' || lateCan(); });"), 'virga\'s program made where it cannot be late (its boot pays for it)');
});
