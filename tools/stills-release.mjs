// stills-release.mjs: a bake's stills up as the release the Cloudflare build fetches (docs/stills-hosting.md), from the
// PC's bake job after tools/gpu/bake-stills.js (kept out of tools/gpu/: it renders nothing, so it is not T2's).
//   node tools/stills-release.mjs --bake DIR --site PLAIN_BUILD [--dry]
// DIR is bake-stills.js's --out (bake.json and the stills); PLAIN_BUILD the plain build the stills are of (the gate's
// served/head: tools/build.mjs --plain), whose worldKey names the release: stills-<key>, its one asset stills.pack
// (tools/stills.mjs pack: each distinct still once, every one checked against bake.json). A release already there
// for the key is left as it is (a set is immutable: the same world bakes the same stills). Needs GITHUB_TOKEN with
// contents: write (the job's own) and GITHUB_REPOSITORY; GITHUB_SHA is the release's commit. With STILLS_DEPLOY_HOOK
// set (a Pages deploy hook's URL, a secret), it is called once the set is up, so live is rebuilt with it.
// --dry: the key and the pack's size, nothing sent.
import fs from 'fs';
import path from 'path';
import { worldKey, pack, unpack, ASSET, TAG } from './stills.mjs';

const A = {};
for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i].replace(/^--/, ''); const v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } }
if (!A.bake || !A.site) { console.error('usage: stills-release.mjs --bake DIR --site PLAIN_BUILD [--dry]'); process.exit(2); }

const key = worldKey(path.resolve(A.site)), buf = pack(path.resolve(A.bake), key), n = unpack(buf, key).size;   // (unpacked once here: what the build will read)
console.log(`stills-release: key ${key}, ${n} stills, ${buf.length} B packed`);
if (A.dry) process.exit(0);

const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
if (!token || !repo) { console.error('stills-release: GITHUB_TOKEN and GITHUB_REPOSITORY are needed'); process.exit(2); }
const h = { authorization: 'Bearer ' + token, 'x-github-api-version': '2022-11-28', accept: 'application/vnd.github+json', 'user-agent': 'derekzhou.com-bake' };
const api = 'https://api.github.com/repos/' + repo;
async function j(r) { const t = await r.text(); if (!r.ok) throw new Error(r.status + ' ' + t.slice(0, 300)); return t ? JSON.parse(t) : {}; }

let rel = await fetch(api + '/releases/tags/' + TAG(key), { headers: h });
if (rel.status === 404) {
  rel = await j(await fetch(api + '/releases', { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify({
    tag_name: TAG(key), target_commitish: process.env.GITHUB_SHA || undefined, name: 'stills ' + key.slice(0, 12),
    body: `The openings' stills for world ${key} (${n} stills). Fetched by tools/build.mjs; docs/stills-hosting.md.`, prerelease: true, make_latest: 'false',
  }) }));
} else rel = await j(rel);
if ((rel.assets || []).some((a) => a.name === ASSET)) { console.log('stills-release: ' + TAG(key) + ' is up already: left as it is'); process.exit(0); }
const up = rel.upload_url.replace(/\{.*\}$/, '') + '?name=' + ASSET;
await j(await fetch(up, { method: 'POST', headers: { ...h, 'content-type': 'application/octet-stream', 'content-length': String(buf.length) }, body: buf }));
console.log('stills-release: ' + TAG(key) + ' up (' + buf.length + ' B)');
if (process.env.STILLS_DEPLOY_HOOK) {
  const r = await fetch(process.env.STILLS_DEPLOY_HOOK, { method: 'POST' });
  console.log('stills-release: the deploy hook answered ' + r.status);
}
