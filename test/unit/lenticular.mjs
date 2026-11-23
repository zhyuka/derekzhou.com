// test/unit/lenticular.mjs: terrain-held clouds, the lenticulars over the far ridges (delight-weather 3)
// The realm's own dHeld (realm-dunes.js) on a stub cell, with the world's streams and the air: a lens stands over a
// far ridge only on a windy visit (the wind over the crest at least 7.7 m/s, within 30 deg of square to it), at the
// ridge the land raises (dunes-glsl's ridges(): the same hashes); its envelope is held (a world cell's: its place a
// constant of t) and only its billows flow, at the wind at its height (410's offset, within 5%). A census of the lenses
// within the dunes' cloud reach of a 20 min flight, a minute at a time, on windy and calm visits.
// plant: {"file": "src/realm-dunes.js", "find": "    if (sp < HELD_V) return;", "with": "    if (sp < 0) return;", "why": "lenses on calm visits"}
// plant: {"file": "src/realm-dunes.js", "find": "h = K.ihash(K.cellHash(jx, jz, C.salt) ^ 0x51ed27);", "with": "h = K.ihash(K.cellHash(jx, jz, C.salt) ^ 0x51ed28);", "why": "the lenses over ridges the land never raised"}
// plant: {"file": "src/world/410-drawing-frame.js", "find": "var q3 = (c0[k3] - (fl ? fl[k3] * tf : 0)) / nS;", "with": "var q3 = (c0[k3] + (fl ? fl[k3] * tf : 0)) / nS;", "why": "the billows flow upwind through the lens"}
// plant: {"file": "src/realm-dunes.js", "find": "    air: function (C, R) { dAir(C, R); },", "with": "    air: function (C, R) { dAir(C, R); dHeld(C); },", "why": "lenses laid out in air cells: the air carries them off their ridges"}
// plant: {"file": "src/world/410-drawing-frame.js", "find": "if (B.flow) { B.u4a[2] = B.det[0]; B.u4a[3] = B.det[1] * 0.5; }", "with": "", "why": "lenses take the desktop's deep cauliflower: holes flowing through smooth plates"}
// plant: {"file": "src/realm-dunes.js", "find": "flow: [hw.x, 0, hw.z]", "with": "flow: [hw.z, 0, hw.x]", "why": "the flow's components swapped: the billows cross the lens at the wrong way"}
// plant: {"file": "src/world/231-cells-resolve.js", "find": "PF.bodies[bi].base = PF.bodies[bi].flow ? undefined : ycB;", "with": "PF.bodies[bi].base = ycB;", "why": "a lens given a flat base: its plates cut in half, and with the base after the billows nothing of a thin lens is left"}
// plant: {"file": "src/realm-dunes.js", "find": "off = Math.min(PI * U / HELD_N, RS),", "with": "off = 300 + 300 * K.hfl(K.hk(h, 21)),", "why": "the lens right behind the ridge (a cap cloud), not at the lee wave's first crest"}
// plant: {"file": "src/realm-dunes.js", "find": "if (C.weights(x, z)[1] > 0.5) continue;", "with": "if (C.weights(cx, cz)[1] > 0.5) continue;", "why": "the cloud sea's gate read at the crest, not where the lens stands"}
// plant: {"file": "src/realm-dunes.js", "find": "var T = 45 + 30 * K.hfl(K.hk(h, 23)),", "with": "var T = 145 + 30 * K.hfl(K.hk(h, 23)),", "why": "the plates three times thicker"}
// plant: {"file": "src/realm-dunes.js", "find": "w = { x: w0.x, z: w0.z },", "with": "w = w0,", "why": "the crest's wind read from windAt's one object, which the lens height's read overwrites: later ridges gated on the wrong wind"}
// plant: {"file": "src/realm-dunes.js", "find": "      if (!C.inside(x, z)) continue;", "with": "      if (!C.inside(cx, cz)) continue;", "why": "a lens laid out by its ridge's cell, 2-3 km off: past that cell's reach, never drawn"}
// plant: {"file": "src/realm-dunes.js", "find": "x = cx + sg * nx * off, z = cz + sg * nz * off;", "with": "x = cx + w.x / sp * off, z = cz + w.z / sp * off;", "why": "the lens along the 100 m wind, not the crest's normal: short of half a wavelength and slid along the crest"}
// plant: {"file": "src/world/236-cells-streamer-work-pool.js", "find": " if (o.flow) return cellDistFade(C);", "with": "", "why": "a lens faded by its own distance: in view when its cell is made (a pop)"}
// plant: {"file": "src/realm-dunes.js", "find": "for (var jz = iz0 - 1; jz <= iz0 + 1; jz++) for (var jx = ix0 - 1; jx <= ix0 + 1; jx++) {", "with": "for (var jz = iz0; jz <= iz0; jz++) for (var jx = ix0; jx <= ix0; jx++) {", "why": "the cell's loop over its own ridge cell alone: the lenses whose ridge stands in a neighbour are lost"}
// plant: {"file": "src/world/120-cloud-bodies.js", "find": "var R = Math.max(0.8 * Math.max(sa * hu, sc * hu * hv), 0.15 * Rc) * rng.r(0.95, 1.05);", "with": "var R = Rc * rng.r(0.95, 1.05);", "why": "every lobe the centre's: a flat slab with square ends (PC GPU, 2026-11-23)"}
// plant: {"file": "src/world/120-cloud-bodies.js", "find": "var R = Math.max(0.8 * Math.max(sa * hu, sc * hu * hv), 0.15 * Rc) * rng.r(0.95, 1.05);", "with": "var R = Math.max(0.3 * Math.max(sa * hu, sc * hu * hv), 0.15 * Rc) * rng.r(0.95, 1.05);", "why": "the lobes a third of their spacing: a rim of loose round beads (PC GPU, 2026-11-23)"}
// plant: {"file": "src/world/120-cloud-bodies.js", "find": "b.squash = 0.52 * T / Rc;", "with": "b.squash = 1.56 * T / Rc;", "why": "the plates three times thicker"}
// plant: {"file": "src/realm-dunes.js", "find": "cl.n, { flow: cl.flow });", "with": "cl.n);", "why": "the lens's plates do not flow: their billows stand still with the envelope"}
// plant: {"file": "src/realm-dunes.js", "find": "dGreat(C, s); dForms(C, s, R); dHeld(C); return;", "with": "dGreat(C, s); dHeld(C); dForms(C, s, R); return;", "why": "the lens laid out before the forms' clouds: their places in the cell, and so their fallback seeds, move"}
import { test, assert, fs, path, vm, ROOT, TMP, WORLD, cut, STREAMS } from '../unit-lib.mjs';

const DUNES = fs.readFileSync(path.join(TMP, 'src', 'realm-dunes.js'), 'utf8');
const DGLSL = fs.readFileSync(path.join(ROOT, 'src', 'glsl', 'dunes-glsl.glsl'), 'utf8');
const AIRSRC = cut(WORLD, '  var AIR_H = {', '\n', true) + cut(WORLD, '  var AIR_U10 =', '\n', true) + cut(WORLD, '  var AIR_W = {', '\n', true) + cut(WORLD, '  var AIR_P = {', '  function airU10(') +
  cut(WORLD, '  function u10Of(', '\n', true) + cut(WORLD, '  function windAt(', '  function airVec3(');
const HELD = cut(DUNES, '  var HELD_V = ', '  /* a small cell of open dunes');
const RSV = +/var DS = 1500, RS = (\d+)/.exec(DUNES)[1];
const make = vm.runInThisContext('(function () { var PI = Math.PI, SIM = { V: null }, RS = ' + RSV + ';\n' + STREAMS + AIRSRC +
  ' var K = { cellHash: cellHash, ihash: ihash, hk: hk, hfl: hfl }, A = { windAt: windAt };\n' + HELD + ' return { dHeld: dHeld, windAt: windAt, cellHash: cellHash, ihash: ihash, hk: hk, hfl: hfl, HELD_V: HELD_V, HELD_H: HELD_H, HELD_N: HELD_N }; })');
const H = make();
function cell(ix, iz, salt, V, wc = 0.1) {   // a stub 1500 m cell: its clouds
  const C = { ix, iz, x0: ix * 1500, z0: iz * 1500, size: 1500, salt, V, clouds: [] };
  C.inside = (x, z) => x >= C.x0 && x < C.x0 + C.size && z >= C.z0 && z < C.z0 + C.size;
  C.weights = (x, z) => { const w = typeof wc === 'function' ? wc(x, z) : wc; return [1 - w, w]; }; C.cloud = (cl) => { C.clouds.push(cl); return cl; };
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
  assert.match(HELD, /h = K\.ihash\(K\.cellHash\(jx, jz, C\.salt\) \^ 0x51ed27\);/); assert.match(HELD, /if \(\(K\.hk\(h, 2\) >>> 24\) >= 115\) continue;/);
  assert.match(HELD, /var cx = \(jx \+ 0\.25 \+ 0\.5 \* K\.hfl\(h\)\) \* RS, cz = \(jz \+ 0\.25 \+ 0\.5 \* K\.hfl\(K\.hk\(h, 1\)\)\) \* RS;/);
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
        assert.ok(cl.dy >= 1100 && cl.dy <= 1700 && cl.n >= 1 && cl.n <= 3 && cl.t >= 45 && cl.t <= 75 && cl.len >= 12 * cl.t, `a lens ${cl.dy} m up, ${cl.n} plates ${cl.t} m thick, ${cl.len} m long`);
        const wf = { ...H.windAt(0, 0, cl.dy, 0, V) };   // (the wind at its height, as a vector: x, y, z)
        assert.ok(cl.flow && Math.abs(cl.flow[0] - wf.x) < 1e-9 && cl.flow[1] === 0 && Math.abs(cl.flow[2] - wf.z) < 1e-9, `the flow ${cl.flow} is not the wind at its height (${wf.x}, ${wf.z})`);
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
  // laid out by the world cell alone: the realm's own dispatch (its air: and cell:) run with its pieces stubbed, a lens
  // from the great cell (scale 0) and never from an air cell (whose pieces the air carries)
  const DISP = cut(DUNES, '    air: function (C, R) {', '    build: function (it, B, R) {');
  const calls = [], R = vm.runInThisContext('(function (calls) { var DS = 1500;' +
    ' function dAir() { calls.push("air"); } function dHeld() { calls.push("held"); } function dSite() { return { kind: 0, x: 0, z: 0 }; } function dGreat() {} function dForms() {} function dSmall() {} function dDetails() {}' +
    ' return {\n' + DISP + '}; })')(calls);
  R.air({ air: true, scale: 3, x0: 0, z0: 0, size: 3000 }, {});
  assert.ok(!calls.includes('held'), 'an air cell lays out a lens: the air would carry a terrain-held cloud off its ridge');
  R.cell({ scale: 0, ix: 0, iz: 0, x0: 0, z0: 0, size: 1500, salt: 1 }, {});
  assert.deepEqual(calls, ['air', 'held'], 'the great cell does not lay out the lenses');
  R.cell({ scale: 1, ix: 0, iz: 0, x0: 0, z0: 0, size: 375, salt: 1 }, {});
  assert.equal(calls.filter((c) => c === 'held').length, 1, 'a small cell lays out lenses');
  // and resolved held: resolve's own lines, a world cell's body with no carry (w null, c0 its laid-out centre) and its
  // flow; an air cell's body carried, with no flow
  const RES = cut(WORLD, '        if (PF.bodies[bi].flow && !C.air) vb.out.flow = PF.bodies[bi].flow;', '\n', true) + cut(WORLD, '        vb.out.c0 = Float64Array.from(vb.out.c);', '\n', true);
  const res = (air) => vm.runInThisContext('(function (C, PF, bi, vb, V) { function airW() { return [3, 4]; }\n' + RES + ' return vb.out; })')(
    { air, dL: [100, 200] }, { bodies: [{ flow: [7, 0, -2] }] }, 0, { out: { c: [5000, 1400, -900] } }, {});
  const hw = res(false), ha = res(true);
  // and no flat base: resolve's own line, a lens's lobes and a free body's
  const BASE = cut(WORLD, '        var ycB = 1e9;', '\n', true);
  const base = (flow) => vm.runInThisContext('(function (PF, bi, bj0, bj1) { var j;' + BASE + ' return PF.bodies[bi].base; })')({ a: Float32Array.from([0, 1400, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1395, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), bodies: [{ flow }] }, 0, 0, 2);
  assert.equal(base([7, 0, -2]), undefined, 'a lens is given a flat base at its lowest lobes\' centres: the lower half of its plates cut away');
  assert.equal(base(undefined), 1395, 'a free body\'s flat base is not at its lowest lobe\'s centre');
  assert.ok(hw.w === null && Array.from(hw.c0).join() === '5000,1400,-900' && hw.flow && hw.flow.join() === '7,0,-2', 'a world cell\'s lens is not held with its flow');
  assert.ok(ha.w && !ha.flow, 'an air cell\'s body is given a flow, or is not carried');
  const o = { c0: Float64Array.from([4321.5, 1400, -987.25]) };
  // 410's offset, run at two moments: the billows' offset moves by the flow over the noise's scale
  const SRC = cut(WORLD, '      var fl = B.flow, tf = fl ? cloudT() : 0;', '      gl.uniform3fv(P.u.uVO, B.nO);');
  const nO = (t, B) => vm.runInThisContext('(function (B, c0, nS, cloudT) {' + SRC + ' return Array.from(B.nO); })')(B, B.c0, 120, () => t);
  const V = visitV(7, 6.8), w = { ...H.windAt(0, 0, 1400, 0, V) }, B = { c0: o.c0, nO: new Float32Array(3), flow: [w.x, 0, w.z] };
  const a = nO(1000, B), b = nO(1000.5, B), unwrap = (d) => d - Math.round(d);
  const vx = -unwrap(b[0] - a[0]) * 120 / 0.5, vz = -unwrap(b[2] - a[2]) * 120 / 0.5;
  assert.ok(Math.abs(vx - w.x) <= 0.05 * Math.hypot(w.x, w.z) && Math.abs(vz - w.z) <= 0.05 * Math.hypot(w.x, w.z), `the billows flow at ${vx.toFixed(3)}, ${vz.toFixed(3)} m/s, the wind ${w.x.toFixed(3)}, ${w.z.toFixed(3)}`);
  assert.equal(unwrap(b[1] - a[1]), 0, 'the billows rise or sink');
  assert.match(WORLD, /if \(PF\.bodies\[bi\]\.flow && !C\.air\) vb\.out\.flow = PF\.bodies\[bi\]\.flow;/, 'resolve does not hand a held body its flow');
  assert.match(DUNES, /if \(cl\.kind === 'lens'\) \{ K\.lens\(PF, R, cl\.x, cl\.base, cl\.z, cl\.dir, cl\.len, cl\.w, cl\.t, cl\.n, \{ flow: cl\.flow \}\); return; \}/, 'the lens\'s plates are not handed the flow');
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

// smooth and crisp (the spec): a held body's billows are the kit's size at half its depth on every look, never the
// desktop's deep cauliflower (four times the size, five the depth: 20 m billows through 28-78 m plates, flowing at
// 8-10 m/s, open holes that move through them). 410's own line run in Node on both looks
test('lenticular: a lens keeps small billows on every look; a free body takes the desktop\'s deep ones', () => {
  const L410 = /\n {6}(B\.u4a\[0\] = VSIGMA;[^\n]*)/.exec(WORLD)[1].replace(/\/\/.*$/, '');
  const run = (CRISP, B) => vm.runInThisContext('(function (CRISP, B, VSIGMA, steps) {' + L410 + ' return Array.from(B.u4a); })')(CRISP, { u4a: [0, 0, 0, 0], det: [120, 4], ...B }, 7, 48);
  for (const crisp of [true, false]) {
    const lens = run(crisp, { flow: [8, 0, -3] });
    assert.deepEqual(lens.slice(2), [120, 2], `a lens on the ${crisp ? 'desktop' : 'touch'} look: billows ${lens[2]} m, ${lens[3]} m deep`);
  }
  assert.deepEqual(run(true, {}).slice(2), [480, 12], 'a free body on the desktop: not the deep cauliflower');
  assert.deepEqual(run(false, {}).slice(2), [120, 4]);
});

// the lens at the lee wave's first crest (the hub's round-3 review): half a wavelength downwind of its ridge,
// lambda = 2 pi U / N, U the wind across the crest at the lens's height, N 0.01/s (a stable troposphere's buoyancy
// frequency: https://www.eoas.ubc.ca/books/Practical_Meteorology/, mountain waves); and the cloud sea's gate read
// where the lens stands, not at the crest
test('lenticular: half a lee wavelength downwind of its crest (pi U / N); none where the lens would stand over the cloud sea', () => {
  assert.equal(H.HELD_N, 0.01);
  let n = 0, lo = Infinity, hi = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const salt = (seed * 40503) >>> 0, V = visitV(seed, 7.2);
    for (let iz = -5; iz < 5; iz++) for (let ix = -5; ix < 5; ix++) for (const cl of cell(ix, iz, salt, V)) {
      // the crest the lens was laid out for: the ridge's own hashes, as dunes-glsl's ridges()
      const RS = RSV, [cx, cz] = cl.crest, jx = Math.floor(cx / RS), jz = Math.floor(cz / RS), h = H.ihash(H.cellHash(jx, jz, salt) ^ 0x51ed27);
      assert.ok((H.hk(h, 2) >>> 24) < 115 && Math.abs((jx + 0.25 + 0.5 * H.hfl(h)) * RS - cx) < 1e-6 && Math.abs((jz + 0.25 + 0.5 * H.hfl(H.hk(h, 1))) * RS - cz) < 1e-6, 'a lens for a crest the land never raised');
      assert.ok(cl.x >= ix * 1500 && cl.x < ix * 1500 + 1500 && cl.z >= iz * 1500 && cl.z < iz * 1500 + 1500, 'a lens laid out by a cell it does not stand in (it fades with its own distance only in its own cell)');
      const ang = H.hfl(H.hk(h, 5)) * Math.PI;
      const w = { ...H.windAt(0, 0, H.HELD_H, 0, V) }, hw = { ...H.windAt(0, 0, cl.dy, 0, V) }, sp = Math.hypot(w.x, w.z);
      const U = Math.abs(-hw.x * Math.sin(ang) + hw.z * Math.cos(ang)), want = Math.PI * U / H.HELD_N;
      // (on the crest's normal, downwind: the wave train runs across the crest)
      const nx = -Math.sin(ang), nz = Math.cos(ang), sg = w.x * nx + w.z * nz < 0 ? -1 : 1;
      const along = ((cl.x - cx) * nx + (cl.z - cz) * nz) * sg, across = Math.abs((cl.x - cx) * Math.cos(ang) + (cl.z - cz) * Math.sin(ang));
      assert.ok(Math.abs(along - want) < 1e-6 && across < 1e-6, `a lens ${along.toFixed(1)} m out on the crest's normal (want ${want.toFixed(1)}: pi U / N), ${across.toFixed(1)} m along the crest`);
      assert.ok(((cl.x - cx) * w.x + (cl.z - cz) * w.z) > 0, 'a lens upwind of its crest');
      lo = Math.min(lo, along); hi = Math.max(hi, along); n++;
    }
  }
  assert.ok(n > 20, `only ${n} lenses`);
  console.log(`lenticular: ${n} lenses, ${lo.toFixed(0)}-${hi.toFixed(0)} m downwind of their crests`);
  assert.ok(lo > 1500, `a lens ${lo.toFixed(0)} m behind its ridge: a cap cloud, not a lee-wave lens`);
  // the gate where the lens stands: the dunes within 1 km of every crest, the cloud sea everywhere else
  let atCrest = 0, gated = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const salt = (seed * 40503) >>> 0, V = visitV(seed, 7.2);
    for (let iz = -5; iz < 5; iz++) for (let ix = -5; ix < 5; ix++) {
      const open = cell(ix, iz, salt, V); atCrest += open.length;
      gated += cell(ix, iz, salt, V, (x, z) => (open.some((cl) => Math.hypot(x - cl.crest[0], z - cl.crest[1]) < 1000) ? 0.1 : 0.9)).length;
    }
  }
  assert.ok(atCrest > 20 && gated === 0, `${gated} of ${atCrest} lenses laid out over the cloud sea where they stand (the gate read at the crest)`);
});

// every lens is found (the hub's round 5: the cell's loop cut to its own ridge cell lost 53% of them and every test
// passed): each ridge the land raises, gated and offset here on its own, its lens at pi U / N on its normal, must be
// laid out exactly once, by the 1500 m cell it stands in; and the offset never reaches RS (at the visits' top U10,
// 7.5 m/s, it stays under 3.2 km of 4.5), so the 3 x 3 ridge cells about a cell hold every lens that can stand in it
test('lenticular: a census, every ridge\'s lens laid out once, by the cell it stands in, whatever the wind', () => {
  const RS = RSV;
  let want = 0, top = 0;
  for (let seed = 1; seed <= 200; seed++) for (const u10 of [6.2, 7.0, 7.5]) {
    const salt = (seed * 40503) >>> 0, V = visitV(seed, u10), w = { ...H.windAt(0, 0, H.HELD_H, 0, V) }, sp = Math.hypot(w.x, w.z);
    const found = new Map();
    for (let iz = -6; iz < 6; iz++) for (let ix = -6; ix < 6; ix++) for (const cl of cell(ix, iz, salt, V)) {
      const k = `${cl.x.toFixed(3)},${cl.z.toFixed(3)}`;
      assert.ok(!found.has(k), 'a lens laid out twice'); found.set(k, cl);
    }
    const expect = new Set();
    if (sp >= H.HELD_V) for (let jz = -4; jz < 4; jz++) for (let jx = -4; jx < 4; jx++) {
      const h = H.ihash(H.cellHash(jx, jz, salt) ^ 0x51ed27);
      if ((H.hk(h, 2) >>> 24) >= 115) continue;
      const cx = (jx + 0.25 + 0.5 * H.hfl(h)) * RS, cz = (jz + 0.25 + 0.5 * H.hfl(H.hk(h, 1))) * RS, ang = H.hfl(H.hk(h, 5)) * Math.PI;
      if (Math.abs((w.x * Math.cos(ang) + w.z * Math.sin(ang)) / sp) > 0.5) continue;
      const dy = 1100 + 600 * H.hfl(H.hk(h, 22)), hw = { ...H.windAt(0, 0, dy, 0, V) }, nx = -Math.sin(ang), nz = Math.cos(ang), sg = w.x * nx + w.z * nz < 0 ? -1 : 1;
      const off = Math.PI * Math.abs(hw.x * nx + hw.z * nz) / H.HELD_N, x = cx + sg * nx * off, z = cz + sg * nz * off;
      top = Math.max(top, off);
      if (x < -6 * 1500 || x >= 6 * 1500 || z < -6 * 1500 || z >= 6 * 1500) continue;   // (stands outside the cells laid out)
      const k = `${x.toFixed(3)},${z.toFixed(3)}`; expect.add(k);
      assert.ok(found.has(k), `the lens of the ridge at (${cx.toFixed(0)}, ${cz.toFixed(0)}) is never laid out: its cell's loop missed it`);
    }
    for (const k of found.keys()) assert.ok(expect.has(k), `a lens at ${k} that no ridge's wave puts there`);
    want += expect.size;
  }
  assert.ok(want > 200, `only ${want} lenses in the census`);
  assert.ok(top < RS, `a lens ${top.toFixed(0)} m from its crest: past RS, out of the 3 x 3 ridge cells (the cap would bind)`);
  console.log(`lenticular: census ${want} lenses, every one laid out once; the farthest ${top.toFixed(0)} m from its crest (RS ${RS})`);
});

// the lens's shape (the spec: smooth plates, long and thin): 120's own lens() on a recording PF, a plate's lobes no
// thicker than the plate's T and the stack long along its crest, many times its thickness, each plate smaller than
// the one below; plates made thicker or rounder fail
test('lenticular: the plates are long thin lenses, tapered to their rims, each smaller than the one below', () => {
  const LENS = cut(WORLD, '  function lens(PF, rng, x, y0, z, dir, len, W, T, n, o) {', '\n    return b0;\n  }\n', true);
  const make2 = vm.runInThisContext('(function () { function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n' + LENS + ' return lens; })')();
  for (const [len, W, T, n] of [[1800, 450, 45, 1], [2600, 700, 75, 3], [2200, 520, 60, 2], [900, 380, 70, 3], [2240, 700, 45, 3]]) {
    const L = [], B = [], PF = { body: () => { const b = { i0: L.length }; B.push(b); return b; }, add: (x, y, z, r) => L.push([x, y, z, r, B.length - 1]), count: () => L.length };
    let s = 1; const rng = { f: () => ((s = (s * 16807) % 2147483647) / 2147483647), r: (a, b) => a + (b - a) * rng.f() };
    const flow = [6, 0, -3], b0 = make2(PF, rng, 0, 1400, 0, 0.3, len, W, T, n, { flow });
    assert.equal(B.length, n, `${n} plates in ${B.length} bodies`); assert.equal(b0, B[0]);
    const ax = [Math.sin(0.3), Math.cos(0.3)], ac = [Math.cos(0.3), -Math.sin(0.3)], spans = [];
    B.forEach((b, k) => {
      const P = L.filter((p) => p[4] === k), sq = b.squash, sk = 1 - 0.24 * k, half = len * sk / 2;
      assert.ok(b.flow === flow, `plate ${k + 1} does not flow`);
      assert.ok(P.length <= 96, `plate ${k + 1} has ${P.length} lobes: past a body's 96`);
      const along = (p) => p[0] * ax[0] + p[2] * ax[1], across = (p) => p[0] * ac[0] + p[2] * ac[1];
      const mid = P.filter((p) => Math.abs(along(p)) < 0.3 * half), end = P.filter((p) => Math.abs(along(p)) > 0.8 * half);
      const thick = (q) => 2 * Math.max(...q.map((p) => p[3] * sq)), wide = (q) => Math.max(...q.map((p) => Math.abs(across(p)) + p[3]));
      assert.ok(thick(mid) <= 0.6 * 2 * T * 1.05 && thick(mid) >= 0.45 * 2 * T, `plate ${k + 1} is ${thick(mid).toFixed(0)} m thick at its centre, for a ${T} m plate`);
      assert.ok(thick(end) <= 0.6 * thick(mid), `plate ${k + 1} is ${thick(end).toFixed(0)} m thick near its ends against ${thick(mid).toFixed(0)} m at its centre: a slab, not a lens`);
      assert.ok(wide(end) <= 0.6 * wide(mid), `plate ${k + 1} is ${wide(end).toFixed(0)} m wide near its ends against ${wide(mid).toFixed(0)} m at its centre: square ends`);
      const len2 = Math.max(...P.map((p) => along(p) + p[3])) - Math.min(...P.map((p) => along(p) - p[3]));
      assert.ok(len2 / thick(mid) >= 6, `plate ${k + 1} ${len2.toFixed(0)} m long and ${thick(mid).toFixed(0)} m thick: too round`);
      // (PC GPU, 2026-11-23: the rim a ring of loose round blobs) every lobe overlaps its nearest neighbour in its plate
      for (const p of P) {
        let best = Infinity, rq = 0;
        for (const q of P) if (q !== p) { const d = Math.hypot(q[0] - p[0], q[2] - p[2]); if (d < best) { best = d; rq = q[3]; } }
        assert.ok(best < 0.9 * (p[3] + rq), `a lobe ${best.toFixed(0)} m from its nearest neighbour, radii ${p[3].toFixed(0)} and ${rq.toFixed(0)} m: a loose bead on the rim`);
      }
      spans.push(len2);
    });
    for (let k = 1; k < n; k++) assert.ok(spans[k] < spans[k - 1], `plate ${k + 1} not smaller than the one below`);
  }
});

// a lens-only change (the hub, 2026-11-23: "a lens-only change must leave every other cloud bit for bit"): the lens is laid
// out after every other draw of the cell's stream and takes none (dHeld has no stream), it is the cell's last cloud (so
// no other cloud's index, its seed's fallback, moves), every other cloud resolves from its own seed, and each of the
// lens's lines in the shared code acts only on a held body (flow, which only a lens's plates carry)
test('lenticular: the lens moves no other cloud: no draw of the cell\'s stream, laid out last, the shared lines held to flow', () => {
  assert.match(DUNES, /function dHeld\(C\) \{/, 'dHeld takes more than its cell');
  const HB = cut(DUNES, '  function dHeld(C) {', '\n  }\n', true);
  assert.ok(!/\bR\.(f|r|i|seed)\(/.test(HB), 'dHeld draws from the cell\'s stream: every later draw, every other cloud, moves');
  assert.match(DUNES, /dGreat\(C, s\); dForms\(C, s, R\); dHeld\(C\); return; \}/, 'dHeld is not the scale-0 cell\'s last layout');
  assert.match(WORLD, /V\.def\.cloud\(cl, PF, RNG\(cl\.seed \|\| \(C\.key \+ i \* 7919\) >>> 0\), KITAPI\)/, 'a cloud does not resolve from its own seed');
  const flowLines = WORLD.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).filter((l) => /\.flow\b/.test(l));
  for (const l of flowLines) assert.ok(/flow \?|flow\)|\.flow &&|if \(o\.flow\)|if \(B\.flow\)|fl \? |B\.flow, tf = fl|if \(o\.flow\) b\.flow = o\.flow|vb\.out\.flow = PF\.bodies\[bi\]\.flow/.test(l), `a shared line reads flow without holding to it: ${l.trim().slice(0, 140)}`);
  assert.ok(flowLines.length >= 5, `only ${flowLines.length} of the lens's shared lines found`);
});

// one piece (the hub, 2026-11-23: "no connected lit component apart from the main body at the rim"): each plate's field as
// the bake makes it, fs-vdens's own smooth union of its lobes (pinned below, line for line) with volPrep's blend (the
// median lobe times b.blend), sampled on a grid a sixth of the plate thick across its box: the solid (s < 0) is one
// connected piece, never a ring of beads or a bead apart at the rim
test('lenticular: each plate bakes as one connected piece, no bead apart', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), { ROOT } = await import('../unit-lib.mjs');
  const VD = fs.readFileSync(path.join(ROOT, 'src/world/glsl/fs-vdens.glsl'), 'utf8');
  assert.ok(VD.includes('vec4 L = uLobe[i]; vec3 d = p - L.xyz; d.y /= sq;') && VD.includes('float si = (length(d) - L.w) * min(sq, 1.0);') && VD.includes('float h = max(k - abs(s - si), 0.0) / k;') && VD.includes('s = min(s, si) - h * h * k * 0.25;'), 'fs-vdens\'s smooth union is not the one this test runs');
  assert.match(WORLD, /gl\.uniform4f\(P\.u\.uVK, B\.seed, B\.erode, vb\.tile, vb\.Rm \* B\.blend\);/, 'the bake\'s blend is not the median lobe times b.blend');
  const LENS = cut(WORLD, '  function lens(PF, rng, x, y0, z, dir, len, W, T, n, o) {', '\n    return b0;\n  }\n', true);
  const make2 = vm.runInThisContext('(function () { function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n' + LENS + ' return lens; })')();
  for (const [len, W, T, n] of [[1800, 450, 45, 1], [2600, 700, 75, 3], [900, 380, 70, 2], [2240, 700, 45, 3]]) {
    const L = [], B = [], PF = { body: () => { const b = { i0: L.length }; B.push(b); return b; }, add: (x, y, z, r) => L.push([x, y, z, r, B.length - 1]), count: () => L.length };
    let s = 7; const rng = { f: () => ((s = (s * 16807) % 2147483647) / 2147483647), r: (a, b) => a + (b - a) * rng.f() };
    make2(PF, rng, 0, 1400, 0, 0, len, W, T, n, {});
    B.forEach((b, k) => {
      const P = L.filter((p) => p[4] === k), sq = b.squash, rs = P.map((p) => p[3]).sort((a, c) => a - c), kb = rs[rs.length >> 1] * b.blend;
      const field = (x, y, z) => { let f = 1e5; for (const q of P) { const dx = x - q[0], dy = (y - q[1]) / sq, dz = z - q[2], si = (Math.hypot(dx, dy, dz) - q[3]) * Math.min(sq, 1), h = Math.max(kb - Math.abs(f - si), 0) / kb; f = Math.min(f, si) - h * h * kb * 0.25; } return f; };
      const lo = [0, 1, 2].map((a) => Math.min(...P.map((q) => q[a] - q[3]))), hi = [0, 1, 2].map((a) => Math.max(...P.map((q) => q[a] + q[3])));
      const st = T / 6, nx = Math.ceil((hi[0] - lo[0]) / (st * 2)), ny = Math.ceil((hi[1] - lo[1]) / st), nz = Math.ceil((hi[2] - lo[2]) / (st * 2));
      const solid = new Uint8Array(nx * ny * nz), id = (i, j, l) => (l * ny + j) * nx + i;
      for (let l = 0; l < nz; l++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) solid[id(i, j, l)] = field(lo[0] + (i + 0.5) * st * 2, lo[1] + (j + 0.5) * st, lo[2] + (l + 0.5) * st * 2) < 0 ? 1 : 0;
      let parts = 0, cells = 0; const seen = new Uint8Array(solid.length), stack = [];
      for (let c = 0; c < solid.length; c++) {
        if (!solid[c] || seen[c]) continue; parts++; seen[c] = 1; stack.push(c);
        while (stack.length) {
          const q = stack.pop(); cells++; const i = q % nx, j = ((q / nx) | 0) % ny, l = (q / (nx * ny)) | 0;
          for (const [di, dj, dl] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const a = i + di, b2 = j + dj, e = l + dl; if (a < 0 || b2 < 0 || e < 0 || a >= nx || b2 >= ny || e >= nz) continue; const w = id(a, b2, e); if (solid[w] && !seen[w]) { seen[w] = 1; stack.push(w); } }
        }
      }
      assert.ok(cells > 50, `plate ${k + 1} of a ${len} m lens bakes almost nothing (${cells} cells)`);
      assert.equal(parts, 1, `plate ${k + 1} of a ${len} m lens bakes as ${parts} pieces: beads apart at the rim`);
    });
  }
});

// no pop (the hub's round-4 review): a lens is as large as 790 m about, so faded by its own distance it stood in view
// when its cell was made (the camera 5950 m from the cell's centre: the reach plus half a cell). The world's own fades
// (236) run in Node: from every bearing, at the cell's birth and at its freeing, every lens's fade is 0
test('lenticular: no lens shows when its cell is made or freed, from any bearing', () => {
  const FADE = cut(WORLD, '  function fadeZ(V, sc) {', '  function lateBorn(');
  const NEAR = cut(WORLD, '  function nearDist(C, x, z) {', '\n', true);
  const make3 = vm.runInThisContext('(function (CAM) { function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); } function airD() { return null; } function cloudT() { return 0; } function cloudPos(o) { return o.c; }\n' + NEAR + FADE + ' return { volDistFade: volDistFade }; })');
  const L = { radius: 5200, size: 1500 }, birth = L.radius + L.size * 0.5, freed = L.radius * 1.3 + L.size * 0.5;
  assert.match(WORLD, /if \(d > R \+ L\.size \* 0\.5\) continue;/, 'a cell is not made at its reach plus half a cell');
  assert.match(WORLD, /> streamR\(Lf, V\) \* 1\.3 \+ Lf\.size \* 0\.5\)/, 'a cell is not freed at 1.3 its reach plus half a cell');
  let n = 0, worst = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const salt = (seed * 40503) >>> 0, V = visitV(seed, 7.2);
    for (let iz = -5; iz < 5; iz++) for (let ix = -5; ix < 5; ix++) for (const cl of cell(ix, iz, salt, V)) {
      const C = { V: { def: { layout: { scales: [L] } } }, sc: 0, cx: ix * 1500 + 750, cz: iz * 1500 + 750, size: 1500, air: false };
      const r = Math.hypot(cl.len / 2, cl.w / 2), o = { cell: C, c: [cl.x, cl.dy, cl.z], r, flow: cl.flow };
      for (const D of [birth, freed]) for (let a = 0; a < 360; a += 5) {
        const CAM = { pos: [C.cx + D * Math.sin(a * Math.PI / 180), 0, C.cz + D * Math.cos(a * Math.PI / 180)] };
        const f = make3(CAM).volDistFade(o); worst = Math.max(worst, f); n++;
        assert.equal(f, 0, `a lens ${r.toFixed(0)} m about at fade ${f.toFixed(3)} when its cell is ${D === birth ? 'made' : 'freed'} (bearing ${a} deg): a pop`);
      }
    }
  }
  assert.ok(n > 1000, `only ${n} cases`);
});
