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
//   - over those two hours no chord is held under it (three or more held notes at once under 20% of the time, never
//     past 20 s at a stretch; a whole triad sounding under 20% of it), no note is held long (18 s at most, the deep
//     end 20 s), never one held note alone for long (8 s at most; past 4 s 30 times at most: alone, a held note reads
//     as a tone, a siren), and there is never a hole (nothing sounding for 3.5 s at most, 2.5 s or more four times at most),
//     but the Milky Way's breaths;
//   - the night's quiet: over those two hours the night skies thinner (the Milky Way and aurora begin fewer notes a
//     minute than blue hour, three voices at once rarer), each sky its own level (the strings under afterglow's horns
//     2.5 dB or more over those under the Milky Way's harp; the notes' energy a minute by day 1 dB or more over the
//     night's), and the Milky Way's breaths (only there, well inside it, 4-6 s of nothing but the air, no deep note
//     under one, a minute and a half apart at least);
//   - the air heard (the feed's wind at the camera): the stream on the wind's side by its bearing exactly, the billow
//     with the wind and the stream with its square, silent in a calm, a gust heard at the first tick it reaches the
//     camera; the sand's hiss none under its threshold, on at it, off only under 0.8 of it, none over the cloud;
//   - the sheet in parts: its cuts end after the tuba's and the violas' notes, then the strings' and the contrabass's; on
//     the first part alone the score plays only those (the first voice within 1.2 s), the rest joining when it comes;
//   - the room and the air filled a slice at a time (as the switch has it) play exactly what they play filled at once.
// plant: {"file": "src/score.js", "find": "if (d < 3 || d % 12 === 1 ||", "with": "if (d < 1 || d % 12 === 1 ||", "why": "a note let in a step from one it meets"}
// plant: {"file": "src/score.js", "find": "SAND = [6.2, 1.5, 0.8]", "with": "SAND = [3.1, 1.5, 0.8]", "why": "the sand hissing at half its threshold"}
// plant: {"file": "src/score.js", "find": "lr = -Math.sin(A.bear || 0);", "with": "lr = Math.sin(A.bear || 0);", "why": "the wind heard from the side it blows toward"}
// plant: {"file": "src/score.js", "find": "return !!a && a.every(function (e) { return e.s0 + e.len < UPTO - 0.05; });", "with": "return !!a;", "why": "a voice played from a part of the sheet not yet decoded"}
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

// (compiled once, each play still in its own fresh context; its Math a local: a global looked up in a vm context goes through
// the sandbox's interceptor, and the score's stream reads Math millions of times a play, filling its room and its air)
const SCORE_JS = new vm.Script('(function (Math) {' + SRC + '\n})(Math);', { filename: 'src/score.js' });
const AIRT = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/world/215-air.js'), 'utf8').match(/var AIR_BYSKY = (\{[^;]*\});/)[1].replace(/(\w+):/g, '"$1":'));   // (the world's wind by sky, as its feed hands it to the score)
function play(seed, flight = FLIGHT, len = T, sliced = false, wind = null, wc = null, stage = null) {   // (stage: { upto, at }: the score given the sheet's first upto seconds, the whole at at s)
  const param = (v) => ({ value: v, calls: [], setValueAtTime(x, t) { this.calls.push(['set', t, x]); }, setValueCurveAtTime(c, t, d) { this.calls.push(['curve', t, d, c[0], c[c.length - 1]]); }, setTargetAtTime(x, t, k) { this.calls.push(['target', t, x, k]); }, linearRampToValueAtTime() {} });
  const node = (x) => Object.assign({ out: [], connect(n) { this.out.push(n); return n; } }, x);
  const srcs = [], gains = [], convs = [], queue = [];
  const ctx = { currentTime: 0, sampleRate: 24000,
    createGain: () => { const g = node({ gain: param(1) }); gains.push(g); return g; }, createBiquadFilter: () => node({ type: '', frequency: param(0), detune: param(0), Q: param(1), gain: param(0) }),
    createConvolver: () => { const c = node({ normalize: true, buffer: null }); convs.push(c); return c; }, createStereoPanner: () => node({ pan: param(0) }), createDelay: () => node({ delayTime: param(0) }), createOscillator: () => node({ frequency: param(0), start() {} }),
    createBuffer(ch, n, sr) { const d = Array.from({ length: ch }, () => new Float32Array(n)); return { getChannelData: (c) => d[c], sampleRate: sr, length: n }; },
    createBufferSource() { const s = node({ buffer: null, loop: false, playbackRate: param(1), start(w, o) { this.when = w; this.off = o; }, stop(t) { this.stopAt = t; } }); srcs.push(s); return s; } };
  const mark = new Float32Array(24000); mark[4800] = 0.9;   // (the sheet's click at 0.2 s)
  const sheet = { getChannelData: () => mark, sampleRate: 24000 };
  let now = 0; const win = { WORLD: { sky() { let i = 0; while (i < flight.length - 1 && flight[i + 1].at <= now) i++; const x = Math.min(1, Math.max(0, (now - 150) / 40)); return { t: now, seq: flight.slice(i), wc: wc === null ? x * x * (3 - 2 * x) : wc, air: AIRT, still: false, seed, wind: wind ? wind(now) : undefined }; } } };
  SCORE_JS.runInNewContext({ window: win, setTimeout: (f) => queue.push(f), Promise });
  const score = win.SCORE.play(ctx, node({}), stage ? null : sheet, sliced);
  if (stage) score.more(sheet, stage.upto);
  const cuts = win.SCORE.cuts;
  let tasks = 0; while (queue.length) { queue.shift()(); tasks++; }   // (sliced: each step its own task, run here in order)
  for (now = 0; now < len; now += 0.5) { if (stage && now >= stage.at && !stage.done) { score.more(sheet); stage.done = true; } score.tick(now); }
  const notes = srcs.filter((s) => s.buffer === sheet).map((s) => {
    const e = NOTES.find((n) => s.off >= n[2] - 1e-6 && s.off <= n[2] + n[3] + 1e-6), rate = s.playbackRate.value, m = Math.round(e[1] + 12 * Math.log2(rate));
    const g = s.out[0].gain.calls, up = g.find((c) => c[0] === 'curve' && c[3] < c[4]), down = g.find((c) => c[0] === 'curve' && c[3] > c[4]), set = g.find((c) => c[0] === 'set' && c[2] > 0);
    const a = e[4] ? s.when + (up ? up[2] : 0) * 0.5 : s.when, b = e[4] ? (down ? down[1] + down[2] * 0.45 : Infinity) : s.when + Math.min(3, e[3] / rate);
    return { inst: INST[e[0]], m, when: s.when, a, b, A: up ? up[4] : set ? set[2] : 0 };   // (A: the note's level, its gain at full)
  });
  notes.tasks = tasks; notes.fills = [...convs.map((c) => c.buffer), ...srcs.filter((s) => s.buffer && s.buffer !== sheet).map((s) => s.buffer)].map((b) => [0, 1].map((c) => b.getChannelData(c)));
  notes.airStarts = srcs.filter((s) => s.buffer && s.buffer !== sheet).map((s) => [s.when, s.off]);
  notes.cuts = cuts;
  notes.swells = [...new Set(gains.flatMap((g) => g.gain.calls.filter((c) => c[0] === 'curve' && c[2] === 21).map((c) => +(c[1] + 11).toFixed(3))))];
  notes.air = {};   // (the air's sources by their band's low edge: the billow 70 Hz, the stream 450, the sand's hiss 2500; each its gain's and its panner's targets)
  for (const s of srcs.filter((x) => x.buffer && x.buffer !== sheet)) {
    let n = s.out[0]; const f = n.frequency.value; while (n && !(n.gain && !n.frequency)) n = n.out[0];
    notes.air[f === 70 ? 'billow' : f === 450 ? 'stream' : f === 2500 ? 'hiss' : f] = { g: n.gain.calls.filter((c) => c[0] === 'target'), pan: n.out[0].pan.calls.filter((c) => c[0] === 'target') };
  }
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
test('sound: no chord under it: over two hours the notes come and go, none held long, none alone long, and never a hole', () => {
  const n = long().n, HELD = ['cello', 'viola', 'violin', 'clar', 'horn'], s = n.filter((v) => v.m >= 36).sort((x, y) => x.a - y.a), on = new Set();
  let i = 0, three = 0, run = 0, longest = 0, triad = 0, total = 0, quiet = 0, gaps = 0, worst = 0, lone = 0, lonest = 0, lones = 0;
  const F = long().F, milky = (t) => F.some((e) => e.id === 'milkyway' && t >= e.at - 30 && t <= e.at + e.hold);   // (the breaths: holes inside a Milky Way, below)
  for (let t = 15; t < 7180; t += 0.25) {   // (every quarter second: the held notes sounding, the pitch classes, a hole; the deep end is felt, not heard, so it fills none)
    while (i < s.length && s[i].a <= t) on.add(s[i++]);
    for (const v of on) if (v.b < t) on.delete(v);
    const held = new Set([...on].filter((v) => HELD.includes(v.inst)).map((v) => v.m)), pcs = new Set([...on].map((v) => v.m % 12)); total++;
    if (held.size >= 3) { three++; run += 0.25; longest = Math.max(longest, run); } else run = 0;
    if ([...pcs].some((r) => (pcs.has((r + 3) % 12) || pcs.has((r + 4) % 12)) && pcs.has((r + 7) % 12))) triad++;
    if (!on.size) quiet += 0.25; else { if (!(quiet >= 2.5 && milky(t - quiet))) { if (quiet >= 2.5) gaps++; worst = Math.max(worst, quiet); } quiet = 0; }
    if (on.size === 1 && HELD.includes([...on][0].inst)) { lone += 0.25; lonest = Math.max(lonest, lone); } else { if (lone > 4) lones++; lone = 0; }
  }
  const len = (v) => v.b - v.a, held = n.filter((v) => HELD.includes(v.inst) && isFinite(v.b)).map(len), deep = n.filter((v) => v.m < 36 && isFinite(v.b)).map(len);
  assert.ok(three / total < 0.2, `three or more held notes ${Math.round(100 * three / total)}% of the time (want under 20%)`);
  assert.ok(longest <= 20, `three or more held notes for ${longest} s at a stretch (want 20 s at most)`);
  assert.ok(triad / total < 0.2, `a whole triad sounding ${Math.round(100 * triad / total)}% of the time (want under 20%)`);
  assert.ok(Math.max(...held) <= 18 && Math.max(...deep) <= 20, `a note held ${Math.max(...held).toFixed(1)} s, a deep one ${Math.max(...deep).toFixed(1)} s (want 18 s, 20 s at most)`);
  assert.ok(lonest <= 8 && lones <= 30, `one held note alone for ${lonest} s; ${lones} times past 4 s (want 8 s at most, 30 times at most)`);
  assert.ok(worst <= 3.5 && gaps <= 4, `nothing sounding for ${worst} s; ${gaps} holes of 2.5 s or more outside the Milky Way's breaths (want 3.5 s at most, four at most)`);
});
test('sound: the night\'s quiet: the night skies thinner, and in the Milky Way now and then a breath of the air alone', () => {
  const { F, n } = long(), skyAt = (t) => { let e = F[0]; for (const x of F) if (x.at <= t) e = x; return e; };
  const per = {}; for (const e of F) { const a = e.at + 20, b = e.at + e.hold - 10, p = per[e.id] || (per[e.id] = { s: 0, min: 0, three: 0, n: 0 }); if (b <= a || b > 7180) continue;
    p.s += n.filter((v) => v.m >= 36 && v.when >= a && v.when < b).length; p.min += (b - a) / 60;
    for (let t = a; t < b; t += 0.5) { const k = n.filter((v) => v.m >= 36 && v.a <= t && t <= v.b).length; p.n++; if (k >= 3) p.three++; } }
  const rate = (id) => per[id].s / per[id].min, thr = (id) => per[id].three / per[id].n;
  /* each sky its own level: the strings in full under afterglow's horns, softer under the Milky Way's harp; and the
     notes' energy (level squared, for as long as each is heard) a minute, afterglow and first light over the night skies */
  const dB = (x) => 10 * Math.log10(x), STR = ['cello', 'viola', 'violin'], lv = {}, en = {};
  for (const e of F) { const a = e.at + 20, b = e.at + e.hold - 10; if (b <= a || b > 7180) continue; const L = lv[e.id] || (lv[e.id] = []), E = en[e.id] || (en[e.id] = { e: 0, d: 0 });
    for (const v of n) { if (v.m < 36 || v.when < a || v.when >= b) continue; if (STR.includes(v.inst)) L.push(v.A * v.A); E.e += v.A * v.A * Math.max(0, Math.min(v.b, b) - Math.max(v.a, a)); }
    E.d += b - a; }
  const mean = (id) => dB(lv[id].reduce((x, y) => x + y, 0) / lv[id].length), rateE = (ids) => dB(ids.reduce((x, id) => x + en[id].e, 0) / ids.reduce((x, id) => x + en[id].d, 0));
  const under = mean('afterglow') - mean('milkyway'), gap = rateE(['afterglow', 'firstlight']) - rateE(['moonlit', 'aurora', 'milkyway']);
  console.log(`# levels: the strings under the horns ${under.toFixed(1)} dB over those under the harp; day ${gap.toFixed(1)} dB over night`);
  assert.ok(under >= 2.5, `the strings under afterglow's horns ${under.toFixed(1)} dB over those under the Milky Way's harp (want 2.5 dB or more)`);
  assert.ok(gap >= 1, `the notes' energy by day ${gap.toFixed(1)} dB over the night's (want 1 dB or more: a proxy; rendered, the night is about 3 dB under)`);
  for (const id of ['milkyway', 'aurora']) {
    assert.ok(rate(id) < 0.8 * rate('bluehour'), `${id} begins ${rate(id).toFixed(1)} notes a minute, blue hour ${rate('bluehour').toFixed(1)} (want under 0.8 of it)`);
    assert.ok(thr(id) < 0.15, `${id}: three voices at once ${Math.round(100 * thr(id))}% of the time (want under 15%)`);
  }
  const s = n.filter((v) => v.m >= 36), deep = n.filter((v) => v.m < 36), holes = [];
  for (let t = 15, q = 0; t < 7180; t += 0.25) { if (!s.some((v) => v.a <= t && t <= v.b)) q += 0.25; else { if (q >= 2.5) holes.push([t - q, q]); q = 0; } }
  const breaths = holes.filter(([t]) => skyAt(t).id === 'milkyway' || skyAt(t + 30).id === 'milkyway');
  assert.ok(breaths.length >= 3, `${breaths.length} breaths in two hours (want three or more)`);
  for (const [t, q] of breaths) {
    const e = F.find((x) => x.id === 'milkyway' && t >= x.at - 30 && t <= x.at + x.hold);
    assert.ok(e, `a breath at ${t.toFixed(1)} s outside the Milky Way`);
    assert.ok(q <= 6.5, `a breath of ${q} s at ${t.toFixed(1)} s (want 6.5 s at most)`);
    assert.ok(!deep.some((v) => v.a < t + q && v.b > t), `a deep note under the breath at ${t.toFixed(1)} s`);
  }
  for (let j = 1; j < breaths.length; j++) assert.ok(breaths[j][0] - breaths[j - 1][0] >= 85, `breaths ${(breaths[j][0] - breaths[j - 1][0]).toFixed(0)} s apart (want 85 s at least)`);
});
test('sound: the air heard: the world\'s wind at the camera, on its side, with its gusts; the sand\'s hiss over its threshold', () => {
  const F1 = [{ id: 'afterglow', at: 0, hold: 400, move: 57, far: false }];
  const at = (L, t) => { let v = null; for (const c of L) if (c[1] <= t + 1e-9) v = c[2]; return v; };   // (the last target set by t)
  const blow = (sp, o = {}) => (t) => ({ x: sp * Math.cos(0.3), z: sp * Math.sin(0.3), gust: o.gust ? o.gust(t) : 0, sigma: 0.26 * sp, phase: t, carry: o.carry === undefined ? sp * 0.8 : o.carry, bear: o.bear === undefined ? 0.5 : o.bear, ax: sp * Math.cos(0.3), az: sp * Math.sin(0.3), y: 20 });
  const a = play(3, F1, 40, false, blow(4), 0).air, b = play(3, F1, 40, false, blow(8), 0).air, c = play(3, F1, 40, false, blow(0), 0).air;
  assert.ok(Math.abs(at(a.stream.pan, 30) - 0.4 * -Math.sin(0.5)) < 1e-9 && Math.abs(at(a.billow.pan, 30) - 0.12 * -Math.sin(0.5)) < 1e-9, `the air's side ${at(a.stream.pan, 30)}, ${at(a.billow.pan, 30)} (want the stream 0.4, the billow 0.12 of -sin(bear))`);
  assert.ok(Math.abs(at(b.stream.g, 30) / at(a.stream.g, 30) - 4) < 1e-9, `the stream at twice the wind ${(at(b.stream.g, 30) / at(a.stream.g, 30)).toFixed(4)} times (want 4: its square)`);
  assert.ok(Math.abs(at(b.billow.g, 30) / at(a.billow.g, 30) - 1.4) < 1e-9, `the billow at twice the wind ${(at(b.billow.g, 30) / at(a.billow.g, 30)).toFixed(4)} times (want 1.4: 0.6 + 1.6 w, w 0.25 to 0.5)`);
  assert.ok(at(c.billow.g, 30) === 0 && at(c.stream.g, 30) === 0 && at(c.hiss.g, 30) === 0, 'not silent in a calm');
  const g = play(3, F1, 40, false, blow(4, { gust: (t) => (t >= 20.25 ? 2 : 0) }), 0).air;   // (a gust of +2 m/s reaching the camera at 20.25 s)
  assert.ok(at(g.billow.g, 20) === at(a.billow.g, 20) && at(g.billow.g, 20.5) > 1.15 * at(a.billow.g, 20.5), 'the gust not heard at the first tick after it reaches the camera');
  const hiss = (sp, carry) => at(play(3, F1, 40, false, blow(sp, { carry }), 0).air.hiss.g, 30);
  assert.equal(hiss(6, 6.2 / 1.5 * 0.99), 0, 'a hiss under the sand\'s threshold (the crests\' wind 0.99 of it)');
  assert.ok(hiss(6, 6.2 / 1.5 * 1.01) > 0, 'no hiss over the threshold');
  const ramp = (t) => 6.2 / 1.5 * (t < 15 ? 1.1 : 0.9 - (t - 15) * 0.01);   // (over it, then down through 0.9 to 0.65 of it: 0.8 at 25 s)
  const h = play(3, F1, 40, false, (t) => blow(6, { carry: ramp(t) })(t), 0).air.hiss.g;
  assert.ok(at(h, 24) > 0 && at(h, 34) === 0, `the hiss on at 24 s: ${at(h, 24)}, at 34 s: ${at(h, 34)} (want it on down to 0.8 of the threshold, at 25 s, and off under it)`);
  assert.equal(at(play(3, F1, 40, false, blow(6, { carry: 6 }), 1).air.hiss.g, 30), 0, 'a hiss over the cloud');
});
test('sound: the sheet in parts: the score starts on its first part (the tuba and the violas) and the rest joins as it comes', () => {
  const ends = {}; for (const e of NOTES) ends[INST[e[0]]] = Math.max(ends[INST[e[0]]] || 0, e[2] + e[3]);
  const n0 = play(1501, FLIGHT, 4), cut = n0.cuts[0];
  assert.ok(Math.abs(cut - Math.max(ends.tuba, ends.viola)) < 1e-9 && Math.abs(n0.cuts[1] - Math.max(ends.violin, ends.cello, ends.cbass)) < 1e-9, `the cuts ${n0.cuts} (want the end of the tuba's and violas' notes, then of the strings' and the contrabass's)`);
  assert.ok(Object.entries(ends).every(([k, t]) => ['tuba', 'viola'].includes(k) ? t <= cut : t > cut), 'the sheet does not open with the tuba and the violas alone');
  const n = play(1501, FLIGHT, 60, false, null, null, { upto: cut + 0.3, at: 20 });
  const early = n.filter((v) => v.when < 20), late = n.filter((v) => v.when >= 20);
  assert.ok(early.length >= 2 && early.every((v) => v.inst === 'viola' || v.inst === 'tuba'), `before the rest: ${[...new Set(early.map((v) => v.inst))]} (want the violas and the tuba only, two notes or more)`);
  assert.ok(early.some((v) => v.inst === 'viola' && v.when < 1.2), `the first voice at ${Math.min(...early.filter((v) => v.inst === 'viola').map((v) => v.when)).toFixed(2)} s (want within 1.2 s of the score's start)`);
  assert.ok(new Set(late.map((v) => v.inst)).size >= 4, `after the rest: ${[...new Set(late.map((v) => v.inst))]} (want the other voices too)`);
});
test('sound: the room and the air filled a slice at a time, as the switch has it, play exactly what they play filled at once', () => {
  const a = play(1501), b = play(1501, FLIGHT, T, true), key = (L) => L.map((n) => n.inst + n.m + '@' + n.when + ':' + n.a + '-' + n.b).join(' ');
  assert.ok(b.tasks >= 7, `the fill took ${b.tasks + 1} tasks (want it sliced: 8 or more, so the press never holds the page for the whole fill)`);
  assert.equal(a.tasks, 0, 'filled at once, yet it queued tasks');
  assert.equal(key(b), key(a), 'sliced, it plays other notes');
  assert.equal(b.fills.length, 4, `${b.fills.length} sources on filled buffers (want the room, the two airs and the hiss, which plays the stream's noise)`);
  b.fills.forEach((ch, i) => ch.forEach((x, c) => assert.ok(Buffer.from(x.buffer).equals(Buffer.from(a.fills[i][c].buffer)), `buffer ${i}, channel ${c}: other samples`)));
  assert.deepEqual(b.airStarts, a.airStarts, 'the air starts elsewhere');
});
