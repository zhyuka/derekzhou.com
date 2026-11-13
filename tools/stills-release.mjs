// stills-release.mjs: a bake's stills up as the release the Cloudflare build fetches (docs/stills-hosting.md), from the
// PC's stills job (.github/workflows/stills.yml) after tools/gpu/bake-stills.js (kept out of tools/gpu/: it renders
// nothing, so it is not T2's).
//   node tools/stills-release.mjs --site PLAIN_BUILD --have [--status SHA]   0: the set is up, 3: it is not
//   node tools/stills-release.mjs --site PLAIN_BUILD --bake DIR [--dry] [--status SHA]
//   node tools/stills-release.mjs --fail SHA --why TEXT                      the commit status `stills`, failed
// PLAIN_BUILD is the plain build the stills are of (the gate's served/head: tools/build.mjs --plain), whose worldKey
// names the release: stills-<key>, its one asset stills.pack (tools/stills.mjs pack: each distinct still once, every
// one checked against bake.json). DIR is bake-stills.js's --out. A release already there for the key is left as it is
// (a set is immutable: the same world bakes the same stills), and checked first, so a commit whose served build is an
// earlier one's costs one request. --status SHA: once the set is up, the commit status `stills` on SHA is success (the
// merge bot's deploy gate moves live to a tip that has the bake only once its status is: merge-bot.mjs). Needs
// GITHUB_TOKEN (contents: write; statuses: write for --status/--fail) and GITHUB_REPOSITORY; GITHUB_SHA is the release's
// commit. With STILLS_DEPLOY_HOOK set (a Pages deploy hook's URL, a secret), it is called once a new set is up.
// --dry: the key and the pack's size, nothing sent.
// It never calls process.exit: it sets process.exitCode and lets node end by itself. process.exit() with fetch's
// keep-alive sockets still open crashes node on Windows (0xC0000409, libuv's assertion on a closing handle: the
// 4090 runner, --have --status with the set up, 2026-11-13); test/unit/stills.mjs checks there is none.
import path from 'path';
import { worldKey, pack, unpack, ASSET, TAG } from './stills.mjs';

const A = {};
for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i].replace(/^--/, ''); const v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } }
const USAGE = 'usage: stills-release.mjs --site PLAIN_BUILD (--have | --bake DIR [--dry] [--status SHA]) | --fail SHA --why TEXT';
async function main() {   // the exit code (never process.exit: see the top)
if (!A.fail && (!A.site || (!A.have && !A.bake))) { console.error(USAGE); return 2; }

const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
const h = { authorization: 'Bearer ' + token, 'x-github-api-version': '2022-11-28', accept: 'application/vnd.github+json', 'user-agent': 'derekzhou.com-bake' };
const api = (process.env.STILLS_API || 'https://api.github.com') + '/repos/' + repo;   // (STILLS_API: a test's stand-in)
async function j(r) { const t = await r.text(); if (!r.ok) throw new Error(r.status + ' ' + t.slice(0, 300)); return t ? JSON.parse(t) : {}; }
function need() { if (!token || !repo) { console.error('stills-release: GITHUB_TOKEN and GITHUB_REPOSITORY are needed'); return false; } return true; }
async function status(sha, state, description) {
  await j(await fetch(api + '/statuses/' + sha, { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify({
    state, context: 'stills', description: description.slice(0, 140),
    target_url: process.env.GITHUB_RUN_ID ? `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}` : undefined,
  }) }));
  console.log(`stills-release: status stills ${state} on ${sha.slice(0, 10)}: ${description}`);
}

if (A.fail) { if (!need()) return 2; await status(String(A.fail), 'failure', String(A.why || 'the stills job failed')); return 0; }

const key = worldKey(path.resolve(A.site));
async function release() {   // the release for key, or null
  const r = await fetch(api + '/releases/tags/' + TAG(key), { headers: h });
  if (r.status === 404) { await r.body?.cancel(); return null; }   // (each body read or cancelled: no socket left half-used)
  return j(r);
}
const up = (rel) => !!rel && (rel.assets || []).some((a) => a.name === ASSET);

if (A.have) {
  if (!need()) return 2; const ok = up(await release());
  console.log(`stills-release: ${TAG(key)} ${ok ? 'is up' : 'is not up'}`);
  if (ok && A.status) await status(String(A.status), 'success', `${TAG(key).slice(0, 19)}: up already`);
  return ok ? 0 : 3;
}
const buf = pack(path.resolve(A.bake), key), n = unpack(buf, key).size;   // (unpacked once here: what the build will read)
console.log(`stills-release: key ${key}, ${n} stills, ${buf.length} B packed`);
if (A.dry) return 0;
if (!need()) return 2;
let rel = await release();
if (up(rel)) console.log('stills-release: ' + TAG(key) + ' is up already: left as it is');
else {
  if (!rel) rel = await j(await fetch(api + '/releases', { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify({
    tag_name: TAG(key), target_commitish: process.env.GITHUB_SHA || undefined, name: 'stills ' + key.slice(0, 12),
    body: `The openings' stills for world ${key} (${n} stills). Fetched by tools/build.mjs; docs/stills-hosting.md.`, prerelease: true, make_latest: 'false',
  }) }));
  const u = rel.upload_url.replace(/\{.*\}$/, '') + '?name=' + ASSET;
  await j(await fetch(u, { method: 'POST', headers: { ...h, 'content-type': 'application/octet-stream', 'content-length': String(buf.length) }, body: buf }));
  console.log('stills-release: ' + TAG(key) + ' up (' + buf.length + ' B)');
  if (process.env.STILLS_DEPLOY_HOOK) {
    const r = await fetch(process.env.STILLS_DEPLOY_HOOK, { method: 'POST' });
    console.log('stills-release: the deploy hook answered ' + r.status);
  }
}
if (A.status) await status(String(A.status), 'success', `${TAG(key).slice(0, 19)}: ${n} stills`);
return 0;
}
process.exitCode = await main();
