// test/unit/bird-skies.mjs: every sky of the world's (220's WSKY) is one of the ink birds' sky classes (010's SKY_CLS),
// and every class has its own rows: its patterns and kinds (LIFE), its goals (GOALS) and how many flocks (LIVE_N). So
// skyCls's 'day', the fallback with no sky from the host, is no sky the page shows, and its tables can stay gone (the
// hub's bird bytes, 2026-11-25: the day sky's patterns, kinds, flock count and the stork's soar, -61 B Brotli; glow's
// rows stand in for it)
// plant: {"file": "src/birds/inkbirds/010-constants.js", "find": "milkyway: 'moon', aurora: 'moon' };", "with": "milkyway: 'moon' };", "why": "the aurora flown as the day sky that is gone (glow's rows)"}
import { test, assert, fs, path, vm, ROOT } from '../unit-lib.mjs';

const ink = (f) => fs.readFileSync(path.join(ROOT, 'src/birds/inkbirds', f), 'utf8');
const one = (s, re, what) => { const m = s.match(re); assert.ok(m, what + ' not found'); return m[0]; };
const val = (src) => vm.runInThisContext('(function () {\n' + src + '\n})')();

test('bird-skies: every sky of the world\'s is a bird sky class with its own rows', () => {
  const W = fs.readFileSync(path.join(ROOT, 'src/world/220-time-day.js'), 'utf8');
  const skies = [...one(W, /  var WSKY = \{[\s\S]*?\n  \};\n/, 'WSKY').matchAll(/^    (\w+): \{ g:/gm)].map((m) => m[1]);
  assert.ok(skies.length >= 6, 'the world\'s skies read: ' + skies.join(', '));
  const C = ink('010-constants.js'), B = ink('210-one-bird.js');
  const T = val(one(C, /  var SKY_CLS = \{[^\n]*\n/, 'SKY_CLS') + one(C, /  var LIFE = \{[\s\S]*?\n  \};\n/, 'LIFE') +
    one(B, /  var LIVE_N = \{[^\n]*\n/, 'LIVE_N') + one(B, /  var GOALS = \{[\s\S]*?\] \};/, 'GOALS') +
    '\nreturn { SKY_CLS: SKY_CLS, LIFE: LIFE, LIVE_N: LIVE_N, GOALS: GOALS };');
  for (const s of skies) {
    const c = T.SKY_CLS[s];
    assert.ok(c, 'the sky ' + s + ' is no bird sky class (it would fly the day fallback, glow\'s rows)');
    assert.ok(T.LIFE[c] && T.GOALS[c] && T.LIVE_N[c], 'the class ' + c + ' (' + s + ') has its LIFE, GOALS and LIVE_N rows');
  }
  assert.ok(!('day' in T.LIFE) && !('day' in T.LIVE_N) && !('day' in T.GOALS), 'no day rows: no sky reaches them');
});
