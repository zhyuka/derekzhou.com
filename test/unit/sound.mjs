// test/unit/sound.mjs: the sound icon's score (src/score.js), played against a stand-in audio context and a scripted
// flight (round seventeen's: afterglow, a near change into the Milky Way, the dunes giving way to cloud, a far change
// through the mist into blue hour, a near change into the moonlit sea). No browser: every note it starts is read back
// (its pitch from the sheet's index, its time from its own start, swell and release) and checked:
//   - no two notes closer than a minor third at once; below C3 nothing closer than a fifth; one deep note at a time;
//   - each colour only in its own sky (horns in afterglow, harp in the Milky Way, piano in blue hour, clarinet in the
//     moonlit sea); no deep note in the mist;
//   - the same seed plays the same notes, another seed others.
// plant: {"file": "src/score.js", "find": "return m !== n && (Math.abs(m - n) <= 2 ||", "with": "return m !== n && (Math.abs(m - n) <= 0 ||", "why": "a note that moves by a step comes in before its neighbour lets go"}
import { test, assert, fs, path, vm, ROOT } from '../unit-lib.mjs';

const SRC = fs.readFileSync(path.join(ROOT, 'src/score.js'), 'utf8');
const NOTES = JSON.parse(/var NOTES = (\[\[.*?\]\]), MARK/.exec(SRC)[1]);
const INST = ['cello', 'viola', 'violin', 'clar', 'horn', 'cbass', 'tuba', 'harp', 'piano'];
const FLIGHT = [{ id: 'afterglow', at: 0, hold: 63, move: 57, far: false }, { id: 'milkyway', at: 120, hold: 86, move: 58, far: true },
  { id: 'bluehour', at: 264, hold: 63, move: 57, far: false }, { id: 'moonlit', at: 384, hold: 190, move: 58, far: false }];
const T = 456;

function play(seed) {
  const param = (v) => ({ value: v, calls: [], setValueAtTime(x, t) { this.calls.push(['set', t, x]); }, setValueCurveAtTime(c, t, d) { this.calls.push(['curve', t, d, c[0], c[c.length - 1]]); }, setTargetAtTime() {} });
  const node = (x) => Object.assign({ out: [], connect(n) { this.out.push(n); return n; } }, x);
  const srcs = [];
  const ctx = { currentTime: 0, sampleRate: 24000,
    createGain: () => node({ gain: param(1) }), createBiquadFilter: () => node({ type: '', frequency: param(0), Q: param(1), gain: param(0) }),
    createConvolver: () => node({ normalize: true, buffer: null }), createStereoPanner: () => node({ pan: param(0) }), createOscillator: () => node({ frequency: param(0), start() {} }),
    createBuffer(ch, n, sr) { const d = Array.from({ length: ch }, () => new Float32Array(n)); return { getChannelData: (c) => d[c], sampleRate: sr, length: n }; },
    createBufferSource() { const s = node({ buffer: null, loop: false, playbackRate: param(1), start(w, o) { this.when = w; this.off = o; }, stop(t) { this.stopAt = t; } }); srcs.push(s); return s; } };
  const mark = new Float32Array(24000); mark[4800] = 0.9;   // (the sheet's click at 0.2 s)
  const sheet = { getChannelData: () => mark, sampleRate: 24000 };
  let now = 0; const win = { WORLD: { sky() { let i = 0; while (i < FLIGHT.length - 1 && FLIGHT[i + 1].at <= now) i++; const x = Math.min(1, Math.max(0, (now - 150) / 40)); return { t: now, seq: FLIGHT.slice(i), wc: x * x * (3 - 2 * x), still: false, seed }; } } };
  vm.runInNewContext(SRC, { window: win });
  const score = win.SCORE.play(ctx, node({}), sheet);
  for (now = 0; now < T; now += 0.5) score.tick(now);
  return srcs.filter((s) => s.buffer === sheet).map((s) => {
    const e = NOTES.find((n) => s.off >= n[2] - 1e-6 && s.off <= n[2] + n[3] + 1e-6), rate = s.playbackRate.value, m = Math.round(e[1] + 12 * Math.log2(rate));
    const g = s.out[0].gain.calls, up = g.find((c) => c[0] === 'curve' && c[3] < c[4]), down = g.find((c) => c[0] === 'curve' && c[3] > c[4]);
    const a = e[4] ? s.when + (up ? up[2] : 0) * 0.5 : s.when, b = e[4] ? (down ? down[1] + down[2] * 0.45 : Infinity) : s.when + Math.min(3, e[3] / rate);
    return { inst: INST[e[0]], m, when: s.when, a, b };
  });
}
const N = play(1501);

test('sound: no two notes closer than a minor third at once; low down none closer than a fifth; one deep note at a time', () => {
  let worst = 99, low = 0, deep = 0;
  for (let t = 0; t < T; t += 0.25) {
    const on = [...new Set(N.filter((n) => n.a <= t && t <= n.b).map((n) => n.m))].sort((x, y) => x - y);
    for (let i = 1; i < on.length; i++) worst = Math.min(worst, on[i] - on[i - 1]);
    const lo = on.filter((m) => m < 48); for (let i = 1; i < lo.length; i++) if (lo[i] - lo[i - 1] < 7) { low++; break; }
    if (new Set(on.filter((m) => m < 36).map((m) => m % 12)).size > 1) deep++;
  }
  assert.ok(N.length > 150, `${N.length} notes in ${T} s`);
  assert.ok(worst >= 3, `two notes ${worst} semitones apart at once`);
  assert.equal(low, 0, 'low notes closer than a fifth'); assert.equal(deep, 0, 'two deep notes at once');
});
test('sound: each colour only in its own sky; no deep note in the mist', () => {
  const span = { horn: [0, 120], harp: [91, 232], piano: [240, 362], clar: [350, T] };   // (the colour turns halfway through each change)
  for (const [inst, [a, b]] of Object.entries(span)) {
    const out = N.filter((n) => n.inst === inst && (n.when < a || n.when > b));
    assert.equal(out.length, 0, `${inst} outside its sky: ${out.map((n) => n.when.toFixed(1)).join(', ')}`);
    assert.ok(N.some((n) => n.inst === inst), `no ${inst} at all`);
  }
  const mist = N.filter((n) => n.m < 36 && n.a < 238 && n.b > 228);
  assert.equal(mist.length, 0, 'a deep note in the mist');
});
test('sound: the same seed plays the same notes, another seed others', () => {
  const key = (L) => L.map((n) => n.inst + n.m + '@' + n.when.toFixed(3)).join(' ');
  assert.equal(key(play(1501)), key(N)); assert.notEqual(key(play(1502)), key(N));
});
