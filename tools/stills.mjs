// stills.mjs: the openings' baked stills (A2's first frames, baked on the 4090 by tools/gpu/bake-stills.js), between
// the PC that bakes them and the Cloudflare build that serves them (docs/deploy.md, "The stills"). Node built-ins only.
//
// The key: worldKey(dir), a sha256 of a plain build's files (tools/build.mjs --plain, the bytes a visitor gets) but the
// stills themselves (assets/still/) and build.txt. The PC computes it on the gate's served/head, the build on its own
// plain output, so a set is found only for the world it was baked from.
// The set: one release of this repository per key, tagged stills-<key>, its one asset stills.pack: a header line
// (STILLS1 and the header's length), the header (JSON: the key, each still's name -> its bytes' sha256, the blobs in
// order), then each distinct blob once (dawn and day, rain and sunset share most of theirs). unpack() checks every
// blob's sha256 and every name.
// fetchSet() never throws and, without a token, never touches the network: no STILLS_TOKEN, no release, a wrong
// world's set or a bad byte all return no stills, and the build ships without them (today's first paint).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const STILL = /^(dawn|day|rain|sunset|dusk|night)-\d+-(hi|lo)-\d+x\d+\.avif$/;   // (bake-stills.js's names)
export const ASSET = 'stills.pack', TAG = (key) => 'stills-' + key, STILL_DIR = 'assets/still';
const MAGIC = 'STILLS1';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

function files(dir, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...files(dir, r)); else if (e.isFile()) out.push(r);
  }
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function worldKey(dir) {
  const h = crypto.createHash('sha256');
  for (const r of files(dir)) {
    if (r === 'build.txt' || r === STILL_DIR || r.startsWith(STILL_DIR + '/')) continue;
    h.update(r + '\0').update(fs.readFileSync(path.join(dir, r))).update('\0');
  }
  return h.digest('hex');
}

// a bake folder (bake.json and its stills) as one pack for the key; only the bake's own stills, each its recorded sha256
export function pack(bakeDir, key) {
  const man = JSON.parse(fs.readFileSync(path.join(bakeDir, 'bake.json'), 'utf8')), names = {}, blobs = new Map();
  for (const n of Object.keys(man).sort()) {
    if (!STILL.test(n) || !man[n] || !man[n].sha) continue;
    const b = fs.readFileSync(path.join(bakeDir, n)), s = sha(b);
    if (s !== man[n].sha) throw new Error(n + ': its bytes are not the sha256 bake.json recorded');
    names[n] = s; if (!blobs.has(s)) blobs.set(s, b);
  }
  if (!Object.keys(names).length) throw new Error(bakeDir + ': no stills in bake.json');
  const order = [...blobs.keys()].sort(), head = Buffer.from(JSON.stringify({ key, names, blobs: order.map((s) => [s, blobs.get(s).length]) }));
  return Buffer.concat([Buffer.from(MAGIC + ' ' + head.length + '\n'), head, ...order.map((s) => blobs.get(s))]);
}

// a pack back to name -> bytes; throws unless every byte is the one its header names
export function unpack(buf, key) {
  const nl = buf.indexOf(10), first = buf.subarray(0, nl).toString('latin1').split(' ');
  if (nl < 0 || first[0] !== MAGIC || !/^\d+$/.test(first[1] || '')) throw new Error('not a stills pack');
  const hl = +first[1], head = JSON.parse(buf.subarray(nl + 1, nl + 1 + hl).toString('utf8'));
  if (head.key !== key) throw new Error('the set is for another world (' + String(head.key).slice(0, 12) + ', not ' + key.slice(0, 12) + ')');
  let at = nl + 1 + hl; const bytes = new Map();
  for (const [s, len] of head.blobs) { const b = buf.subarray(at, at + len); at += len; if (b.length !== len || sha(b) !== s) throw new Error('a blob is not its sha256'); bytes.set(s, b); }
  if (at !== buf.length) throw new Error('trailing bytes');
  const out = new Map();
  for (const n of Object.keys(head.names).sort()) {
    if (!STILL.test(n) || !bytes.has(head.names[n])) throw new Error(n + ': not a still of the set');
    out.set(n, bytes.get(head.names[n]));
  }
  return out;
}

// the set for key, from the release stills-<key>: { stills: Map | null, why }
export async function fetchSet({ key, token, repo = 'zhyuka/derekzhou.com', fetch = globalThis.fetch, timeoutMs = 120000, api: base = 'https://api.github.com' }) {
  if (!token) return { stills: null, why: 'no STILLS_TOKEN: built without stills' };
  try {
    const h = { authorization: 'Bearer ' + token, 'x-github-api-version': '2022-11-28', 'user-agent': 'derekzhou.com-build' }, api = base + '/repos/' + repo;
    const rel = await fetch(api + '/releases/tags/' + TAG(key), { headers: { ...h, accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(timeoutMs) });
    if (rel.status === 404) return { stills: null, why: 'no set baked for this world yet (' + key.slice(0, 12) + ')' };
    if (!rel.ok) return { stills: null, why: 'the release lookup answered ' + rel.status };
    const a = ((await rel.json()).assets || []).find((x) => x.name === ASSET);
    if (!a) return { stills: null, why: 'the release has no ' + ASSET };
    const r = await fetch(api + '/releases/assets/' + a.id, { headers: { ...h, accept: 'application/octet-stream' }, signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return { stills: null, why: 'the download answered ' + r.status };
    const stills = unpack(Buffer.from(await r.arrayBuffer()), key);
    return { stills, why: stills.size + ' stills for this world' };
  } catch (e) {
    return { stills: null, why: 'the fetch failed (' + (e && e.message || e) + ')' };
  }
}

export function place(out, stills) {   // the set into a build, at assets/still/<name>, in name order
  const d = path.join(out, STILL_DIR); fs.mkdirSync(d, { recursive: true });
  for (const n of [...stills.keys()].sort()) fs.writeFileSync(path.join(d, n), stills.get(n));
}
