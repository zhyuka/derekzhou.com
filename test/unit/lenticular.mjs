// test/unit/lenticular.mjs: terrain-held clouds, the lenticulars over the far ridges (delight-weather 3)
// The realm's own dHeld (realm-dunes.js) on a stub cell, with the world's streams and the air: a lens stands over a
// far ridge only on a windy visit (the wind over the crest at least 7.7 m/s, within 30 deg of square to it), at the
// ridge the land raises (dunes-glsl's ridges(): the same hashes); its envelope is held (a world cell's: its place a
// constant of t) and only its billows flow, at the wind at its height (410's offset, within 5%). A census of the lenses
// within the dunes' cloud reach of a 20 min flight, a minute at a time, on windy and calm visits.
// plant: {"file": "src/realm-dunes.js", "find": "if (sp < HELD_V || Math.abs((w.x * ax + w.z * az) / sp) > HELD_SQ) return;", "with": "if (Math.abs((w.x * ax + w.z * az) / sp) > HELD_SQ) return;", "why": "lenses on calm visits"}
// plant: {"file": "src/realm-dunes.js", "find": "h = K.ihash(K.cellHash(ix, iz, C.salt) ^ 0x51ed27);", "with": "h = K.ihash(K.cellHash(ix, iz, C.salt) ^ 0x51ed28);", "why": "the lenses over ridges the land never raised"}
// plant: {"file": "src/world/410-drawing-frame.js", "find": "var q3 = (c0[k3] - (fl ? fl[k3] * tf : 0)) / nS;", "with": "var q3 = (c0[k3] + (fl ? fl[k3] * tf : 0)) / nS;", "why": "the billows flow upwind through the lens"}
import { test, assert, fs, path, vm, ROOT, TMP, WORLD, cut, STREAMS } from '../unit-lib.mjs';

const DUNES = fs.readFileSync(path.join(TMP, 'src', 'realm-dunes.js'), 'utf8');
const DGLSL = fs.readFileSync(path.join(ROOT, 'src', 'glsl', 'dunes-glsl.glsl'), 'utf8');
const AIRSRC = cut(WORLD, '  var AIR_H = {', '\n', true) + cut(WORLD, '  var AIR_U10 =', '\n', true) + cut(WORLD, '  var AIR_W = {', '\n', true) + cut(WORLD, '  var AIR_P = {', '  function airU10(') +
  cut(WORLD, '  function u10Of(', '\n', true) + cut(WORLD, '  function windAt(', '  function airVec3(');
const HELD = cut(DUNES, '  var HELD_V = ', '  /* a small cell of open dunes');
const RSV = +/var DS = 1500, RS = (\d+)/.exec(DUNES)[1];
const make = vm.runInThisContext('(function () { var PI = Math.PI, SIM = { V: null }, RS = ' + RSV + ';\n' + STREAMS + AIRSRC +
  ' var K = { cellHash: cellHash, ihash: ihash, hk: hk, hfl: hfl }, A = { windAt: windAt };\n' + HELD + ' return { dHeld: dHeld, windAt: windAt, cellHash: cellHash, ihash: ihash, hk: hk, hfl: hfl, HELD_V: HELD_V, HELD_H: HELD_H }; })');
const H = make();
function cell(ix, iz, salt, V, wc = 0.1) {   // a stub 1500 m cell: its clouds
  const C = { ix, iz, x0: ix * 1500, z0: iz * 1500, size: 1500, salt, V, clouds: [] };
  C.inside = (x, z) => x >= C.x0 && x < C.x0 + C.size && z >= C.z0 && z < C.z0 + C.size;
  C.weights = () => [1 - wc, wc]; C.cloud = (cl) => { C.clouds.push(cl); return cl; };
  H.dHeld(C); return C.clouds;
}
const visitV = (seed, u10) => { const a = ((seed * 2654435761) >>> 0) / 4294967296 * 2 * Math.PI; return { wind: [Math.sin(a), Math.cos(a)], u10 }; };
function lensesNear(salt, V, x0, z0, r) {   // every lens whose cell lies within r of (x0, z0)
  const out = [], i0 = Math.floor((x0 - r) / 1500), i1 = Math.floor((x0 + r) / 1500), j0 = Math.floor((z0 - r) / 1500), j1 = Math.floor((z0 + r) / 1500);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (const cl of cell(i, j, salt, V)) if (Math.hypot(cl.x - x0, cl.z - z0) < r) out.push(cl);
  return out;
}

test('lenticular: the far ridges are the land\'s own (dunes-glsl\'s ridges(), the same hashes)', () => {
  const r = cut(DGLSL, 'vec3 ridges(vec2 p) {', '\n}\n');
  assert.match(r, /uint h = ih\(cellHash\(c\) \^ 0x51ed27u\);/); assert.match(r, /if \(\(ih\(h \+ 2u\) >> 24\) >= 115u\) continue;/);
  assert.match(r, /vec2 ctr = \(vec2\(c\) \+ 0\.25 \+ 0\.5 \* vec2\(hf\(h\), hf\(ih\(h \+ 1u\)\)\)\) \* RS;/);
  assert.match(r, /vec4 m = vec4\(ctr, 900\.0 \+ 700\.0 \* hf\(ih\(h \+ 3u\)\), /); assert.match(r, /vec4 b = vec4\(hf\(ih\(h \+ 5u\)\) \* PI, /);
  assert.match(DGLSL, /vec2 l = vec2\(ca \* d\.x \+ sa \* d\.y, -sa \* d\.x \+ ca \* d\.y\) \/ m\.z;/, 'the crest is not along (cos, sin)');
  assert.match(HELD, /h = K\.ihash\(K\.cellHash\(ix, iz, C\.salt\) \^ 0x51ed27\);/); assert.match(HELD, /if \(\(K\.hk\(h, 2\) >>> 24\) >= 115\) return;/);
  assert.match(HELD, /var cx = \(ix \+ 0\.25 \+ 0\.5 \* K\.hfl\(h\)\) \* RS, cz = \(iz \+ 0\.25 \+ 0\.5 \* K\.hfl\(K\.hk\(h, 1\)\)\) \* RS;/);
  assert.match(HELD, /var half = 900 \+ 700 \* K\.hfl\(K\.hk\(h, 3\)\), ang = K\.hfl\(K\.hk\(h, 5\)\) \* PI, ax = Math\.cos\(ang\), az = Math\.sin\(ang\);/);
  assert.equal(RSV, +/const float DS = 1500\.0, RS = ([\d.]+);/.exec(DGLSL)[1], 'the ridges\' cell is not the land\'s');
});

test('lenticular: only on windy visits (the crest\'s wind >= 7.7 m/s, within 30 deg of square), over the dunes, downwind of the crest, 1100-1700 m up', () => {
  let windy = 0, calm = 0, checked = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const salt = (seed * 40503) >>> 0;
    for (const u10 of [3.2, 5.0, 6.2, 7.4]) {
      const V = visitV(seed, u10), w = { ...H.windAt(0, 0, H.HELD_H, 0, V) }, sp = Math.hypot(w.x, w.z);   // (a copy: windAt returns its one object)
      for (let iz = -6; iz < 6; iz++) for (let ix = -6; ix < 6; ix++) for (const cl of cell(ix, iz, salt, V)) {
        checked++;
        assert.ok(sp >= H.HELD_V, `a lens at ${sp.toFixed(2)} m/s over the crest (U10 ${u10})`);
        const ax = Math.sin(cl.dir), az = Math.cos(cl.dir);
        assert.ok(Math.abs((w.x * ax + w.z * az) / sp) <= 0.5 + 1e-12, 'a lens with the wind along its ridge');
        assert.ok(cl.dy >= 1100 && cl.dy <= 1700 && cl.n >= 1 && cl.n <= 3, `a lens ${cl.dy} m up, ${cl.n} plates`);
        assert.ok(cl.flow && Math.abs(Math.hypot(cl.flow[0], cl.flow[2]) - Math.hypot(...Object.values(H.windAt(0, 0, cl.dy, 0, V)))) < 1e-9, 'the flow is not the wind at its height');
        if (u10 >= 6.2) windy++; else calm++;
      }
      // none where the cloud sea lies
      for (let iz = -2; iz < 2; iz++) for (let ix = -2; ix < 2; ix++) assert.equal(cell(ix, iz, salt, V, 0.8).length, 0, 'a lens over the cloud sea');
    }
  }
  assert.equal(calm, 0, `${calm} lenses on calm visits (U10 3.2 and 5.0)`);
  assert.ok(windy > 50, `only ${windy} lenses on windy visits: the gate never opens`);
  assert.ok(checked === windy);
});

test('lenticular: the envelope is held (its place a constant of t); its billows flow at the wind at its height, within 5%', () => {
  const D = vm.runInThisContext('(function (SIM, SIM_DT) { var PI = Math.PI;' + AIRSRC + cut(WORLD, '  function cloudWind(', '  /* ----') + ' return { cloudPos: cloudPos }; })')({ t: 0, alpha: 1 }, 1 / 60);
  const o = { c0: Float64Array.from([4321.5, 1400, -987.25]), w: null, flow: [6.1, 0, -4.2] };
  const p0 = Array.from(D.cloudPos(o, 0)), p1 = Array.from(D.cloudPos(o, 3600.5));
  assert.deepEqual(p1, p0, 'a held body moves');
  // 410's offset, run at two moments: the billows' offset moves by the flow over the noise's scale
  const SRC = cut(WORLD, '      var fl = B.flow, tf = fl ? cloudT() : 0;', '      gl.uniform3fv(P.u.uVO, B.nO);');
  const nO = (t, B) => vm.runInThisContext('(function (B, c0, nS, cloudT) {' + SRC + ' return Array.from(B.nO); })')(B, B.c0, 120, () => t);
  const V = visitV(7, 6.8), w = { ...H.windAt(0, 0, 1400, 0, V) }, B = { c0: o.c0, nO: new Float32Array(3), flow: [w.x, 0, w.z] };
  const a = nO(1000, B), b = nO(1000.5, B), unwrap = (d) => d - Math.round(d);
  const vx = -unwrap(b[0] - a[0]) * 120 / 0.5, vz = -unwrap(b[2] - a[2]) * 120 / 0.5;
  assert.ok(Math.abs(vx - w.x) <= 0.05 * Math.hypot(w.x, w.z) && Math.abs(vz - w.z) <= 0.05 * Math.hypot(w.x, w.z), `the billows flow at ${vx.toFixed(3)}, ${vz.toFixed(3)} m/s, the wind ${w.x.toFixed(3)}, ${w.z.toFixed(3)}`);
  assert.equal(unwrap(b[1] - a[1]), 0, 'the billows rise or sink');
  assert.match(WORLD, /if \(PF\.bodies\[bi\]\.flow && !C\.air\) vb\.out\.flow = PF\.bodies\[bi\]\.flow;/, 'resolve does not hand a held body its flow');
  assert.match(DUNES, /if \(cl\.kind === 'lens'\) \{ var bl = K\.lens\([^)]*\); bl\.flow = cl\.flow; return; \}/);
});

test('lenticular: a census, the lenses within the dunes\' cloud reach (5.2 km) of a 20 min flight at 30 m/s, a minute at a time', () => {
  const rows = { windy: [], calm: [] };
  for (let seed = 1; seed <= 60; seed++) {
    const salt = (seed * 7919 + 13) >>> 0, a = seed * 1.7;
    for (const [kind, u10] of [['windy', 7.0], ['calm', 4.0]]) {
      const V = visitV(seed, u10);
      for (let m = 0; m < 20; m++) { const d = m * 60 * 30; rows[kind].push(lensesNear(salt, V, Math.sin(a) * d, Math.cos(a) * d, 5200).length); }
    }
  }
  const mean = (r) => r.reduce((x, y) => x + y, 0) / r.length, share = (r) => r.filter((n) => n > 0).length / r.length;
  console.log(`lenticular: windy visits (U10 7.0): ${mean(rows.windy).toFixed(2)} in reach a minute, a minute with one ${(100 * share(rows.windy)).toFixed(0)}%, at most ${Math.max(...rows.windy)}; calm (U10 4.0): ${mean(rows.calm).toFixed(2)}`);
  assert.equal(mean(rows.calm), 0);
  assert.ok(mean(rows.windy) > 0.1, 'a windy visit almost never meets one');
  assert.ok(Math.max(...rows.windy) <= 4, 'more than four in reach (the phone\'s budget)');
});
