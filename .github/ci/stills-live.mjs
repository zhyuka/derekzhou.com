// stills-live.mjs: does the live site serve its own world's stills? (post-deploy.yml, once the bake exists: #197)
//   node .github/ci/stills-live.mjs --plain PLAIN_BUILD --url https://derekzhou.com [--timeout 600]
// PLAIN_BUILD is the live commit's plain build (tools/build.mjs --plain): its worldKey (tools/stills.mjs) names the
// release stills-<key> the Cloudflare build fetched. The release's pack is read (GITHUB_TOKEN, contents: read) and one
// still of it, the first by name, is fetched from the live site: 200 and the very bytes of the set (sha256), or this
// fails, naming why (no release for live's world: live ships without its stills, the old first paint). The site may
// still be deploying: a 404 is tried again until --timeout seconds have passed.
import path from 'node:path';
import crypto from 'node:crypto';
import { worldKey, unpack, ASSET, TAG, STILL_DIR } from '../../tools/stills.mjs';

const A = {};
for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i].replace(/^--/, ''); const v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } }
class Fail extends Error {}
const fail = (m) => { throw new Fail(m); };   // (never process.exit after a fetch: node on Windows crashes, tools/stills-release.mjs)
async function main() {
if (!A.plain || !A.url) { console.error('usage: stills-live.mjs --plain PLAIN_BUILD --url URL [--timeout S]'); return 2; }
const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
if (!token || !repo) fail('GITHUB_TOKEN and GITHUB_REPOSITORY are needed');
const h = { authorization: 'Bearer ' + token, 'x-github-api-version': '2022-11-28', 'user-agent': 'derekzhou.com-post-deploy' };
const api = (process.env.STILLS_API || 'https://api.github.com') + '/repos/' + repo;   // (STILLS_API: a test's stand-in)

const key = worldKey(path.resolve(A.plain));
const rel = await fetch(api + '/releases/tags/' + TAG(key), { headers: { ...h, accept: 'application/vnd.github+json' } });
if (rel.status === 404) { await rel.body?.cancel(); fail(`no release ${TAG(key)}: live's world has no stills (stills.yml puts it up; the deploy gate waits for it)`); }
if (!rel.ok) fail('the release lookup answered ' + rel.status);
const a = ((await rel.json()).assets || []).find((x) => x.name === ASSET);
if (!a) fail(TAG(key) + ' has no ' + ASSET);
const d = await fetch(api + '/releases/assets/' + a.id, { headers: { ...h, accept: 'application/octet-stream' } });
if (!d.ok) fail('the pack download answered ' + d.status);
const set = unpack(Buffer.from(await d.arrayBuffer()), key), name = [...set.keys()].sort()[0];
const want = crypto.createHash('sha256').update(set.get(name)).digest('hex');
const url = A.url.replace(/\/$/, '') + '/' + STILL_DIR + '/' + name, until = Date.now() + 1000 * +(A.timeout || 600);
for (;;) {
  const r = await fetch(url, { headers: { 'cache-control': 'no-cache', 'user-agent': 'derekzhou.com-post-deploy' } }).catch((e) => ({ status: 0, e }));
  if (r.status === 200) {
    const got = crypto.createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
    if (got !== want) fail(`${url}: its bytes are not the set's (${got.slice(0, 12)}, not ${want.slice(0, 12)})`);
    console.log(`stills-live: ${url} is the set's (${TAG(key).slice(0, 19)}, ${set.size} stills)`); return 0;
  }
  await r.body?.cancel?.();
  if (Date.now() > until) fail(`${url} answered ${r.status}${r.e ? ' (' + r.e.message + ')' : ''}: live does not serve its stills (is STILLS_TOKEN set in Pages?)`);
  await new Promise((f) => setTimeout(f, 15000));
}
}
// what the live build said of its stills: /build.txt's second line, "stills: <why>" (tools/build.mjs)
async function buildSaid() {
  try {
    const r = await fetch(A.url.replace(/\/$/, '') + '/build.txt', { headers: { 'cache-control': 'no-cache', 'user-agent': 'derekzhou.com-post-deploy' } });
    const line = (await r.text()).split('\n').find((l) => l.startsWith('stills: '));
    return line ? ' The live build says "' + line.replace(/[^ -~]/g, ' ').slice(0, 200) + '".' : ' (/build.txt says nothing of the stills: a build from before tools/build.mjs wrote it)';
  } catch (e) { return ''; }
}
try { process.exitCode = await main(); } catch (e) { if (!(e instanceof Fail)) throw e; console.error('stills-live: FAIL: ' + e.message + (A.url ? await buildSaid() : '')); process.exitCode = 1; }
