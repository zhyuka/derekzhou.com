// test/unit/stills.mjs: the baked stills between the PC and the Cloudflare build (tools/stills.mjs, docs/deploy.md, "The stills")
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
function gh(packBuf, { release = 200, asset = 200, repo = 200 } = {}) {
  const calls = [];
  const f = async (url, o) => {
    calls.push(url);
    if (/\/repos\/[^/]+\/[^/]+$/.test(url)) return new Response('{}', { status: repo });
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
  assert.match((await S.fetchSet({ key: KEY, token: 't', fetch: gh(good, { release: 404 }) })).why, /no set baked for this world yet/, 'the repository visible: the set is not there');
  assert.match((await S.fetchSet({ key: KEY, token: 't', fetch: gh(good, { release: 404, repo: 404 }) })).why, /the token cannot see .* \(404\)/, 'the repository not visible either: the token is why (a private repository answers 404)');
  assert.match((await S.fetchSet({ key: KEY, token: 't', fetch: gh(good, { release: 401 }) })).why, /refused \(401\)/);
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

test('stills: the PC\'s release step and the live check, against a stand-in GitHub and site', async () => {
  const http = await import('node:http'), { execFile } = await import('node:child_process'), { promisify } = await import('node:util'), { fileURLToPath } = await import('node:url');
  const run = promisify(execFile), ROOT = fileURLToPath(new URL('../..', import.meta.url));   // (fileURLToPath: on Windows a URL's pathname is /C:/...)
  const site = tmp(); fs.writeFileSync(path.join(site, 'index.html'), '<p>w</p>');
  const key = S.worldKey(site), bk = tmp(); bake(bk, SET);
  const st = { releases: {}, assets: {}, statuses: [], served: null, uploads: 0 };
  const srv = http.createServer((q, r) => {
    const body = []; q.on('data', (c) => body.push(c)); q.on('end', () => {
      const b = Buffer.concat(body), u = q.url.split('?')[0], J = (s, o) => { r.writeHead(s, { 'content-type': 'application/json' }); r.end(JSON.stringify(o)); };
      let m;
      if ((m = /\/releases\/tags\/(.+)$/.exec(u))) return st.releases[m[1]] ? J(200, st.releases[m[1]]) : J(404, {});
      if (u.endsWith('/releases') && q.method === 'POST') { const o = JSON.parse(b); st.releases[o.tag_name] = { tag: o.tag_name, assets: [], upload_url: `http://127.0.0.1:${port}/up/${o.tag_name}{?name}` }; return J(201, st.releases[o.tag_name]); }
      if ((m = /^\/up\/(.+)$/.exec(u))) { st.uploads++; st.assets[9] = b; st.releases[m[1]].assets.push({ id: 9, name: 'stills.pack' }); return J(201, {}); }
      if (/\/releases\/assets\/9$/.test(u)) { r.writeHead(200); return r.end(st.assets[9]); }
      if ((m = /\/statuses\/(\w+)$/.exec(u))) { st.statuses.push({ sha: m[1], ...JSON.parse(b) }); return J(201, {}); }
      if (u === '/build.txt') { r.writeHead(200); return r.end('c'.repeat(40) + '\nstills: no STILLS_TOKEN: built without stills\n'); }
      if (u.startsWith('/assets/still/')) { const n = u.slice(14); if (!st.served || !st.served[n]) { r.writeHead(404); return r.end(); } r.writeHead(200); return r.end(st.served[n]); }
      J(500, { u });
    });
  });
  await new Promise((f) => srv.listen(0, '127.0.0.1', f)); const port = srv.address().port, base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'o/r', STILLS_API: base, STILLS_DEPLOY_HOOK: '' };
  const node = (args) => run(process.execPath, args, { cwd: ROOT, env }).then((x) => ({ code: 0, out: x.stdout + x.stderr }), (e) => ({ code: e.code, out: (e.stdout || '') + (e.stderr || '') }));
  const REL = path.join(ROOT, 'tools/stills-release.mjs'), LIVE = path.join(ROOT, '.github/ci/stills-live.mjs'), SHA = 'c'.repeat(40);
  try {
    assert.equal((await node([REL, '--site', site, '--have', '--status', SHA])).code, 3, 'no release yet: 3, and no status');
    assert.equal(st.statuses.length, 0);
    let x = await node([LIVE, '--plain', site, '--url', base, '--timeout', '0']);
    assert.equal(x.code, 1, 'no release for live\'s world: the live check fails'); assert.match(x.out, /no release/);
    assert.equal((await node([REL, '--site', site, '--bake', bk, '--status', SHA])).code, 0);
    assert.equal(st.uploads, 1); assert.deepEqual(st.statuses.map((s) => [s.sha, s.context, s.state]), [[SHA, 'stills', 'success']]);
    assert.equal((await node([REL, '--site', site, '--bake', bk])).code, 0, 'up already: left as it is');
    assert.equal(st.uploads, 1, 'never uploaded twice');
    assert.equal((await node([REL, '--site', site, '--have', '--status', SHA])).code, 0, 'a later commit of the same world: up, its status at once');
    assert.equal(st.statuses.length, 2);
    x = await node([LIVE, '--plain', site, '--url', base, '--timeout', '0']);
    assert.equal(x.code, 1, 'the release is up but the site serves no still (no STILLS_TOKEN): fails'); assert.match(x.out, /STILLS_TOKEN/);
    assert.match(x.out, /The live build says "stills: no STILLS_TOKEN: built without stills"/, 'the failure quotes what the live build said (build.txt line 2)');
    st.served = Object.fromEntries(Object.entries(SET).map(([n, b]) => [n, Buffer.from('other')]));
    x = await node([LIVE, '--plain', site, '--url', base, '--timeout', '0']);
    assert.equal(x.code, 1, 'another world\'s bytes: fails'); assert.match(x.out, /not the set's/);
    st.served = SET;
    x = await node([LIVE, '--plain', site, '--url', base, '--timeout', '0']);
    assert.equal(x.code, 0, x.out);
    assert.equal((await node([REL, '--fail', SHA, '--why', 'the bake failed'])).code, 0);
    assert.deepEqual(st.statuses.at(-1).state, 'failure');
    fs.writeFileSync(path.join(site, 'sound.js'), '1');   // (a served change that is not the world's still makes a new key: main's stills job puts its set up)
    assert.equal((await node([REL, '--site', site, '--have'])).code, 3, 'a new served build: no set until the PC puts one up');
    assert.ok(key !== S.worldKey(site));
  } finally { srv.close(); for (const d of [site, bk]) fs.rmSync(d, { recursive: true, force: true }); }
});

test('stills: the scripts that fetch never call process.exit (node on Windows crashes, 0xC0000409, with fetch\'s sockets open)', async () => {
  const { fileURLToPath } = await import('node:url'), ROOT = fileURLToPath(new URL('../..', import.meta.url));
  for (const f of ['tools/stills-release.mjs', '.github/ci/stills-live.mjs', 'tools/stills.mjs']) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    assert.ok(!/process\.exit\s*\(/.test(code), f + ' calls process.exit: set process.exitCode and return instead');
  }
});

test('stills: the twin the PC bakes gets the still\'s preload back (the build takes it out of a build with no stills)', async () => {
  const { fileURLToPath } = await import('node:url'), ROOT = fileURLToPath(new URL('../..', import.meta.url));
  const src = fs.readFileSync(path.join(ROOT, 'site/index.html'), 'utf8');
  assert.ok(S.PRELOAD.test(src), 'site/index.html has the preload block the build takes out');
  const stripped = src.replace(S.PRELOAD, '');
  assert.ok(!/class="still"/.test(stripped), 'taken out, the page asks for no still');
  assert.equal(S.withPreload(src, stripped), src, 'put back: the page as written');
  assert.equal(S.withPreload(src, src), src, 'there already: unchanged');
  const other = stripped.replace('<title>', '<title data-x="1">');   // (a built page that is not byte for byte the source)
  assert.match(S.withPreload(src, other), /<link rel="preload" as="image" class="still" fetchpriority="high">/);
  assert.ok(S.withPreload(src, other).indexOf('class="still"') < S.withPreload(src, other).indexOf('src="/hour.js"'), 'before hour.js reads it');
  assert.throws(() => S.withPreload('<p>no block</p>', stripped), /no still preload/);
});

test('stills: the PC\'s bake renders a twin with the still\'s preload (stills.yml puts it back before bake-stills.js)', async () => {
  const { fileURLToPath } = await import('node:url'), ROOT = fileURLToPath(new URL('../..', import.meta.url));
  const y = fs.readFileSync(path.join(ROOT, '.github/workflows/stills.yml'), 'utf8').replace(/\r\n/g, '\n');   // (a Windows checkout's CRLF: the patterns below match \n)
  const fix = y.indexOf('node tools/stills-twin.mjs site/index.html served/head-twin'), bake = y.indexOf('node tools/gpu/bake-stills.js');
  assert.ok(fix > 0, 'stills.yml puts the preload back in served/head-twin (run 43409850998: without it the page asks for no still)');
  assert.ok(bake > fix, 'and does it before the bake renders the twin');
  assert.ok(/--twin served\/head-twin/.test(y.slice(bake, y.indexOf('\n', bake))), 'the bake renders that same twin');
  // the twin as the PC gets it: a plain build with no stills (the preload taken out), the preload then put back
  const src = fs.readFileSync(path.join(ROOT, 'site/index.html'), 'utf8'), d = tmp();
  fs.writeFileSync(path.join(d, 'index.html'), src.replace(S.PRELOAD, ''));
  const k = S.worldKey(d);
  const r = await (await import('node:util')).promisify((await import('node:child_process')).execFile)(process.execPath, [path.join(ROOT, 'tools/stills-twin.mjs'), path.join(ROOT, 'site/index.html'), d]);
  assert.match(r.stdout, /put back/);
  assert.match(fs.readFileSync(path.join(d, 'index.html'), 'utf8'), /<link rel="preload" as="image" class="still"/, 'the twin asks for its still');
  assert.notEqual(S.worldKey(d), k, '(the twin is not what the key is read from: stills.yml keys served/head)');
  assert.ok(!/served\/head-twin/.test(y.slice(y.indexOf('worldKey'), y.indexOf('worldKey') + 120)), 'the key is read from served/head, never the twin');
  fs.rmSync(d, { recursive: true, force: true });
});

test('stills: build.txt says what the stills fetch did, on its second line, and never the token', async () => {
  const http = await import('node:http'), { execFile } = await import('node:child_process'), { promisify } = await import('node:util'), { fileURLToPath } = await import('node:url');
  const ROOT = fileURLToPath(new URL('../..', import.meta.url)), out = tmp();
  const srv = http.createServer((q, r) => { r.writeHead(/^\/repos\/[^/]+\/[^/]+$/.test(q.url) ? 200 : 404, { 'content-type': 'application/json' }); r.end('{}'); });   // (the repository visible, no release)
  await new Promise((f) => srv.listen(0, '127.0.0.1', f));
  try {
    const TOKEN = 'github_pat_SECRETSECRETSECRET';
    await promisify(execFile)(process.execPath, [path.join(ROOT, 'tools/build.mjs'), path.join(out, 'dist')], { cwd: ROOT, env: { ...process.env, STILLS_TOKEN: TOKEN, STILLS_API: 'http://127.0.0.1:' + srv.address().port, GITHUB_SHA: 'd'.repeat(40) }, maxBuffer: 1 << 26 });
    const bt = fs.readFileSync(path.join(out, 'dist/build.txt'), 'utf8').split('\n');
    assert.equal(bt[0], 'd'.repeat(40), 'line 1: the commit, as before');
    assert.match(bt[1], /^stills: no set baked for this world yet \([0-9a-f]{12}\)$/, 'line 2: the why');
    assert.ok(!fs.readFileSync(path.join(out, 'dist/build.txt'), 'utf8').includes('SECRET'), 'never the token');
  } finally { srv.close(); fs.rmSync(out, { recursive: true, force: true }); }
});

test('stills: the bake never holds the GPU runner for a whole set, and the newest tip wins (stills.yml)', async () => {
  const { fileURLToPath } = await import('node:url'), ROOT = fileURLToPath(new URL('../..', import.meta.url));
  const y = fs.readFileSync(path.join(ROOT, '.github/workflows/stills.yml'), 'utf8').replace(/\r\n/g, '\n');   // (a Windows checkout's CRLF: the patterns below match \n)
  assert.match(y, /cancel-in-progress: true\b/, 'a newer run cancels a stale one, on main too');
  assert.match(y, /group: stills-\$\{\{ github\.event\.workflow_run\.head_branch != 'main' && 'branches' \|\| \(github\.event\.workflow_run\.run_attempt == 1 && 'main' \|\| format\('main-\{0\}', github\.event\.workflow_run\.head_sha\)\) \}\}/, 'only a main gate\'s first run is in main\'s group: a branch\'s or a re-run\'s never cancels the tip\'s bake');
  assert.match(y, /need:\n\s+if: >-\n\s+github\.event\.workflow_run\.conclusion == 'success' && github\.event\.workflow_run\.head_branch == 'main'\n/, 'only main bakes: no branch warm bake holds the GPU runner ahead of T2');
  assert.match(y, /if \[ -n "\$tip" \] && \[ "\$tip" != "\$SHA" \]; then echo .*; exit 0; fi\n\s+k=\$\(node/, 'a run for a commit that is no longer main\'s tip bakes nothing (so a re-run of an old gate never takes the tip\'s bake\'s place)');
  assert.match(y, /max-parallel: 1/, 'the sky jobs run one at a time');
  assert.match(y, /sky: \[dawn, day, rain, sunset, dusk, night\]/, 'a job a sky (T2 takes the runner between two)');
  assert.match(y, /--skies \$\{\{ matrix\.sky \}\}/, 'each job bakes only its sky');
  assert.match(y, /need:\n(?:.*\n)*?\s+runs-on: \[self-hosted, linux, pc-wsl\]/, 'the look-up never holds the GPU runner');
});
