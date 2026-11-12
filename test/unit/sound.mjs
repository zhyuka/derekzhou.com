// test/unit/sound.mjs: the sound icon's score (src/score.js), played against a stand-in audio context and a scripted
// flight (round seventeen's: afterglow, a near change into the Milky Way, the dunes giving way to cloud, a far change
// through the mist into blue hour, a near change into the moonlit sea). No browser: every note it starts is read back
// (its pitch from the sheet's index, its time from its own start, swell and release) and checked:
//   - no two notes closer than a minor third at once; below C3 nothing closer than a fifth; one deep note at a time;
//   - each colour only in its own sky (horns in afterglow, harp in the Milky Way, piano in blue hour, clarinet in the
//     moonlit sea); no deep note in the mist;
//   - the same seed plays the same notes, another seed others;
//   - every sky change the world can make (all thirty: near, or far through the mist, as the world's own near lists
//     say) keeps the spacing rules, swells on a major chord and thins to a mist of three notes or more;
//   - two hours of a flight ordered as the world orders it: the rules hold, and nothing piles up;
//   - over those two hours the strings are never all there for long (the passages: five or more voices under 40% of
//     the time, never past 75 s at a stretch; two or fewer over 25% of it);
//   - the room and the air filled a slice at a time (as the switch has it) play exactly what they play filled at once.
// plant: {"file": "src/score.js", "find": "return m !== n && (Math.abs(m - n) <= 2 ||", "with": "return m !== n && (Math.abs(m - n) <= 0 ||", "why": "a note that moves by a step comes in before its neighbour lets go"}
import { test, assert, fs, path, vm, ROOT } from '../unit-lib.mjs';

const SRC = fs.readFileSync(path.join(ROOT, 'src/score.js'), 'utf8');
const NOTES = JSON.parse(/var NOTES = (\[\[.*?\]\]), MARK/.exec(SRC)[1]);
const INST = ['cello', 'viola', 'violin', 'clar', 'horn', 'cbass', 'tuba', 'harp', 'piano'];
const FLIGHT = [{ id: 'afterglow', at: 0, hold: 63, move: 57, far: false }, { id: 'milkyway', at: 120, hold: 86, move: 58, far: true },
  { id: 'bluehour', at: 264, hold: 63, move: 57, far: false }, { id: 'moonlit', at: 384, hold: 190, move: 58, far: false }];
const T = 456;
const WSRC = fs.readFileSync(path.join(ROOT, 'src/world/220-time-day.js'), 'utf8');
const NEAR = {}, HOLD = {};
for (const m of WSRC.matchAll(/^\s+(\w+): \{ g:'\w+', w:'\w+', ph:\d, land:\[[^\]]*\], hold:(\d+), near:\[([^\]]*)\]/gm)) { HOLD[m[1]] = +m[2]; NEAR[m[1]] = m[3].replace(/'/g, '').split(',').filter(Boolean); }
const STRINGS = ['cello', 'viola', 'violin', 'clar'];

function play(seed, flight = FLIGHT, len = T, sliced = false) {
  const param = (v) => ({ value: v, calls: [], setValueAtTime(x, t) { this.calls.push(['set', t, x]); }, setValueCurveAtTime(c, t, d) { this.calls.push(['curve', t, d, c[0], c[c.length - 1]]); }, setTargetAtTime() {}, linearRampToValueAtTime() {} });
  const node = (x) => Object.assign({ out: [], connect(n) { this.out.push(n); return n; } }, x);
  const srcs = [], gains = [], convs = [], queue = [];
  const ctx = { currentTime: 0, sampleRate: 24000,
    createGain: () => { const g = node({ gain: param(1) }); gains.push(g); return g; }, createBiquadFilter: () => node({ type: '', frequency: param(0), Q: param(1), gain: param(0) }),
    createConvolver: () => { const c = node({ normalize: true, buffer: null }); convs.push(c); return c; }, createStereoPanner: () => node({ pan: param(0) }), createOscillator: () => node({ frequency: param(0), start() {} }),
    createBuffer(ch, n, sr) { const d = Array.from({ length: ch }, () => new Float32Array(n)); return { getChannelData: (c) => d[c], sampleRate: sr, length: n }; },
    createBufferSource() { const s = node({ buffer: null, loop: false, playbackRate: param(1), start(w, o) { this.when = w; this.off = o; }, stop(t) { this.stopAt = t; } }); srcs.push(s); return s; } };
  const mark = new Float32Array(24000); mark[4800] = 0.9;   // (the sheet's click at 0.2 s)
  const sheet = { getChannelData: () => mark, sampleRate: 24000 };
  let now = 0; const win = { WORLD: { sky() { let i = 0; while (i < flight.length - 1 && flight[i + 1].at <= now) i++; const x = Math.min(1, Math.max(0, (now - 150) / 40)); return { t: now, seq: flight.slice(i), wc: x * x * (3 - 2 * x), still: false, seed }; } } };
  vm.runInNewContext(SRC, { window: win, setTimeout: (f) => queue.push(f), Promise });
  const score = win.SCORE.play(ctx, node({}), sheet, sliced);
  let tasks = 0; while (queue.length) { queue.shift()(); tasks++; }   // (sliced: each step its own task, run here in order)
  for (now = 0; now < len; now += 0.5) score.tick(now);
  const notes = srcs.filter((s) => s.buffer === sheet).map((s) => {
    const e = NOTES.find((n) => s.off >= n[2] - 1e-6 && s.off <= n[2] + n[3] + 1e-6), rate = s.playbackRate.value, m = Math.round(e[1] + 12 * Math.log2(rate));
    const g = s.out[0].gain.calls, up = g.find((c) => c[0] === 'curve' && c[3] < c[4]), down = g.find((c) => c[0] === 'curve' && c[3] > c[4]);
    const a = e[4] ? s.when + (up ? up[2] : 0) * 0.5 : s.when, b = e[4] ? (down ? down[1] + down[2] * 0.45 : Infinity) : s.when + Math.min(3, e[3] / rate);
    return { inst: INST[e[0]], m, when: s.when, a, b };
  });
  notes.tasks = tasks; notes.fills = [...convs.map((c) => c.buffer), ...srcs.filter((s) => s.buffer && s.buffer !== sheet).map((s) => s.buffer)].map((b) => [0, 1].map((c) => b.getChannelData(c)));
  notes.airStarts = srcs.filter((s) => s.buffer && s.buffer !== sheet).map((s) => [s.when, s.off]);
  notes.swells = [...new Set(gains.flatMap((g) => g.gain.calls.filter((c) => c[0] === 'curve' && c[2] === 21).map((c) => +(c[1] + 11).toFixed(3))))];
  return notes;
}
const N = play(1501);
function spacing(notes, len) {   // (a sweep, every quarter second: the closest pair, low pairs closer than a fifth, two deep notes)
  const on = new Map(), starts = [...notes].sort((x, y) => x.a - y.a), ends = [...notes].sort((x, y) => x.b - y.b);
  let i = 0, j = 0, worst = 99, low = 0, deep = 0, most = 0;
  for (let t = 0; t < len; t += 0.25) {
    while (i < starts.length && starts[i].a <= t) { on.set(starts[i].m, (on.get(starts[i].m) || 0) + 1); i++; }
    while (j < ends.length && ends[j].b < t) { const k = on.get(ends[j].m) - 1; if (k) on.set(ends[j].m, k); else on.delete(ends[j].m); j++; }
    const ms = [...on.keys()].sort((x, y) => x - y); most = Math.max(most, ms.length);
    for (let k = 1; k < ms.length; k++) { worst = Math.min(worst, ms[k] - ms[k - 1]); }
    const lo = ms.filter((m) => m < 48); if (lo.some((m, k) => k && m - lo[k - 1] < 7)) low++;
    if (new Set(ms.filter((m) => m < 36).map((m) => m % 12)).size > 1) deep++;
  }
  return { worst, low, deep, most };
}

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
  const span = { horn: [0, 120], harp: [91, 232], piano: [240, 362], clar: [350, T + 12] };   // (the colour turns halfway through each change; the score plans ten seconds ahead)
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
test('sound: every sky change the world can make keeps the rules, swells on a major chord, and mists in three notes or more', () => {
  const ids = Object.keys(NEAR); assert.equal(ids.length, 6, 'six skies');
  for (const x of ids) for (const y of ids) {
    if (x === y) continue;
    const far = !NEAR[x].includes(y), F = [{ id: x, at: 0, hold: 60, move: 57, far }, { id: y, at: 117, hold: 400, move: 57, far: false }];
    const n = play(7, F, 200), r = spacing(n, 200), tag = `${x} to ${y} (${far ? 'far' : 'near'})`;
    assert.ok(r.worst >= 3, `${tag}: two notes ${r.worst} semitones apart`); assert.equal(r.low, 0, `${tag}: low notes closer than a fifth`); assert.equal(r.deep, 0, `${tag}: two deep notes`);
    assert.equal(n.swells.length, 1, `${tag}: ${n.swells.length} swells`);
    for (const p of n.swells) {
      const at = n.filter((v) => STRINGS.includes(v.inst) && v.a <= p && p <= v.b).map((v) => v.m), bass = Math.min(...at.filter((m) => m >= 36));
      assert.ok(at.length >= 3 && !at.some((m) => (m - bass) % 12 === 3), `${tag}: the swell at ${p.toFixed(1)} s is on a minor chord (${at})`);
    }
    if (far) { const mist = new Set(n.filter((v) => STRINGS.includes(v.inst) && v.a <= 88.5 && 88.5 <= v.b).map((v) => v.m)); assert.ok(mist.size >= 3, `${tag}: the mist has ${mist.size} notes`); }
  }
});
function long() {   // (two hours of a flight ordered as the world orders it: never one of the last two; near, or now and then far)
  if (long.v) return long.v;
  let r = 7 >>> 0; const f = () => ((r = (Math.imul(r ^ (r >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0) / 4294967296);
  const F = [], ids = Object.keys(NEAR); let id = 'bluehour', at = 0;
  while (at < 7300) {
    const hold = HOLD[id] * (0.9 + 0.25 * f()), move = 55 + 5 * f(), recent = F.slice(-2).map((e) => e.id).concat(id);
    const farNow = f() < 0.3, pool = (farNow ? ids : NEAR[id]).filter((k) => !recent.includes(k)), next = pool.length ? pool[Math.floor(f() * pool.length)] : ids.find((k) => k !== id);
    F.push({ id, at, hold, move, far: !NEAR[id].includes(next) }); at += hold + move; id = next;
  }
  return (long.v = { F, n: play(11, F, 7200) });
}
test('sound: two hours of a flight ordered as the world orders it: the rules hold and nothing piles up', () => {
  const { F, n } = long(), sp = spacing(n, 7200);
  assert.ok(sp.worst >= 3 && sp.low === 0 && sp.deep === 0, `the rules: closest ${sp.worst}, low ${sp.low}, deep ${sp.deep}`);
  const h1 = n.filter((v) => v.when < 3600).length, h2 = n.length - h1;
  assert.ok(h2 > 0.75 * h1 && h2 < 1.33 * h1, `notes an hour: ${h1}, then ${h2}`);
  assert.ok(sp.most <= 16, `at most ${sp.most} pitches sounding at once`);
  assert.ok(n.swells.length >= F.filter((e) => e.at + e.hold < 7100).length - 1, `${n.swells.length} swells for ${F.length - 1} changes`);
});
test('sound: the strings are never all there for long: the texture keeps changing, passage by passage, over two hours', () => {
  const s = long().n.filter((v) => STRINGS.includes(v.inst)).sort((x, y) => x.a - y.a), on = new Map(); let i = 0, full = 0, few = 0, total = 0, run = 0, longest = 0;
  for (let t = 10; t < 7180; t += 0.5) {   // (the string pitches sounding, every half second)
    while (i < s.length && s[i].a <= t) { const v = s[i++]; on.set(v, v.b); }
    for (const [v, b] of on) if (b < t) on.delete(v);
    const k = new Set([...on.keys()].map((v) => v.m)).size; total++;
    if (k >= 5) { full++; run += 0.5; longest = Math.max(longest, run); } else run = 0;
    if (k <= 2) few++;
  }
  assert.ok(full / total < 0.4, `all the strings (five or more) ${Math.round(100 * full / total)}% of the time (want under 40%)`);
  assert.ok(longest <= 75, `all the strings for ${longest} s at a stretch (want 75 s at most)`);
  assert.ok(few / total > 0.25, `two strings or fewer only ${Math.round(100 * few / total)}% of the time (want over 25%)`);
});
test('sound: the room and the air filled a slice at a time, as the switch has it, play exactly what they play filled at once', () => {
  const a = play(1501), b = play(1501, FLIGHT, T, true), key = (L) => L.map((n) => n.inst + n.m + '@' + n.when + ':' + n.a + '-' + n.b).join(' ');
  assert.ok(b.tasks >= 20, `the fill took ${b.tasks + 1} tasks (want it sliced)`);
  assert.equal(a.tasks, 0, 'filled at once, yet it queued tasks');
  assert.equal(key(b), key(a), 'sliced, it plays other notes');
  assert.equal(b.fills.length, 3, `${b.fills.length} filled buffers (want the room and two airs)`);
  b.fills.forEach((ch, i) => ch.forEach((x, c) => assert.ok(Buffer.from(x.buffer).equals(Buffer.from(a.fills[i][c].buffer)), `buffer ${i}, channel ${c}: other samples`)));
  assert.deepEqual(b.airStarts, a.airStarts, 'the air starts elsewhere');
});
