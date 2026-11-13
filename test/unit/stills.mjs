// test/unit/stills.mjs: the baked stills between the PC and the Cloudflare build (tools/stills.mjs, docs/stills-hosting.md)
import { test, assert, fs, os, path, crypto } from '../unit-lib.mjs';

const S = await import(new URL('../../tools/stills.mjs', import.meta.url));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
function bake(dir, stills) {   // a bake folder as bake-stills.js leaves one
  fs.mkdirSync(dir, { recursive: true }); const man = {};
  for (const [n, b] of Object.entries(stills)) { fs.writeFileSync(path.join(dir, n), b); man[n] = { key: 'k', sha: sha(b) }; }
  fs.writeFileSync(path.join(dir, 'bake.json'), JSON.stringify(man));
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'stills-'));
const SET = { 'day-0-hi-1440x900.avif': Buffer.from('A'.repeat(50)), 'dawn-0-hi-1440x900.avif': Buffer.from('A'.repeat(50)), 'night-3-lo-393x852.avif': Buffer.from('night') };
const KEY = 'a'.repeat(64);
// a fetch stand-in: the release and its asset, or a status
function gh(packBuf, { release = 200, asset = 200 } = {}) {
  const calls = [];
  const f = async (url, o) => {
    calls.push(url);
    if (/\/releases\/tags\//.test(url)) return release === 200 ? new Response(JSON.stringify({ assets: [{ id: 7, name: 'stills.pack' }] }), { status: 200 }) : new Response('', { status: release });
    if (/\/releases\/assets\/7$/.test(url)) return asset === 200 ? new Response(packBuf, { status: 200 }) : new Response('', { status: asset });
    throw new Error('unexpected ' + url);
  };
  f.calls = calls; return f;
}

test('stills: the world key is the plain build but its stills and build.txt; a byte anywhere else changes it', () => {
  const d = tmp(); fs.writeFileSync(path.join(d, 'index.html'), '<p>x</p>'); fs.mkdirSync(path.join(d, 'assets/still'), { recursive: true });
  const k = S.worldKey(d);
  fs.writeFileSync(path.join(d, 'assets/still/day-0-hi-1x1.avif'), 'z'); fs.writeFileSync(path.join(d, 'build.txt'), 'f'.repeat(40));
  assert.equal(S.worldKey(d), k, 'the stills and build.txt are not the world');
  fs.writeFileSync(path.join(d, 'world.js'), '1');
  assert.notEqual(S.worldKey(d), k, 'a new file is a new world');
  fs.rmSync(d, { recursive: true, force: true });
});

test('stills: a pack keeps every still, each distinct one once, and checks every byte', () => {
  const d = tmp(); bake(d, SET);
  const buf = S.pack(d, KEY), back = S.unpack(buf, KEY);
  assert.deepEqual([...back.keys()], Object.keys(SET).sort());
  for (const [n, b] of Object.entries(SET)) assert.ok(back.get(n).equals(b), n);
  assert.ok(buf.length < 50 * 2 + 5 + 600, 'dawn and day share their bytes once');
  const bad = Buffer.from(buf); bad[bad.length - 1] ^= 1;
  assert.throws(() => S.unpack(bad, KEY), /sha256/, 'a changed byte');
  assert.throws(() => S.unpack(buf, 'b'.repeat(64)), /another world/, "the wrong world's set");
  fs.writeFileSync(path.join(d, 'day-0-hi-1440x900.avif'), 'tampered');
  assert.throws(() => S.pack(d, KEY), /bake\.json/, 'a still that is not the bake\'s');
  fs.rmSync(d, { recursive: true, force: true });
});

test('stills: the build fetches its own world\'s set; anything else ships without stills, and no token never touches the network', async () => {
  const d = tmp(); bake(d, SET); const good = S.pack(d, KEY); fs.rmSync(d, { recursive: true, force: true });
  const f0 = gh(good);
  const none = await S.fetchSet({ key: KEY, token: '', fetch: f0 });
  assert.equal(none.stills, null); assert.equal(f0.calls.length, 0, 'no token: no request at all');
  const ok = await S.fetchSet({ key: KEY, token: 't', fetch: gh(good) });
  assert.equal(ok.stills.size, 3, ok.why);
  assert.equal((await S.fetchSet({ key: KEY, token: 't', fetch: gh(good, { release: 404 }) })).stills, null, 'no release: none');
  assert.equal((await S.fetchSet({ key: KEY, token: 't', fetch: gh(good, { asset: 500 }) })).stills, null, 'a failed download: none');
  const bad = Buffer.from(good); bad[bad.length - 1] ^= 1;
  assert.equal((await S.fetchSet({ key: KEY, token: 't', fetch: gh(bad) })).stills, null, 'a bad sha: none');
  assert.equal((await S.fetchSet({ key: 'b'.repeat(64), token: 't', fetch: gh(good) })).stills, null, "the wrong world's set: none");
  const r = await S.fetchSet({ key: KEY, token: 't', fetch: async () => { throw new Error('offline'); } });
  assert.equal(r.stills, null); assert.match(r.why, /offline/, 'a network error: none, never thrown');
  const out = tmp(); S.place(out, ok.stills);
  assert.deepEqual(fs.readdirSync(path.join(out, 'assets/still')).sort(), Object.keys(SET).sort());
  fs.rmSync(out, { recursive: true, force: true });
});
