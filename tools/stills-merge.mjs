// stills-merge.mjs: bake-stills.js's outputs (each a folder of stills and its bake.json) as one, for the release
// (stills.yml: each bake job merges its two shards, the up job its twenty jobs').
//   node tools/stills-merge.mjs [--want N] OUT DIR...
// Every still of every DIR is copied into OUT and its bake.json entry kept; a still is checked against its entry's
// sha256 as it is copied, and a name in two folders must be the same bytes (the shards never overlap: --shard I/N),
// else it stops. --want N: the whole set or nothing (the up job: a set is immutable once up, so never a partial one).
// Writes OUT/bake.json and says how many stills it holds. Node built-ins only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const argv = process.argv.slice(2), wi = argv.indexOf('--want'), want = wi >= 0 ? +argv.splice(wi, 2)[1] : null;
const [out, ...dirs] = argv;
if (!out || !dirs.length) { console.error('usage: node tools/stills-merge.mjs OUT DIR...'); process.exit(2); }
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync(out, { recursive: true });
const man = {};
for (const d of dirs) {
  const mp = path.join(d, 'bake.json');
  if (!fs.existsSync(mp)) { console.error(`stills-merge: ${d} has no bake.json`); process.exit(1); }
  const m = JSON.parse(fs.readFileSync(mp, 'utf8'));
  for (const [name, e] of Object.entries(m)) {
    const f = path.join(d, name);
    if (!fs.existsSync(f)) continue;   // (an entry with no file: a still another shard baked, or a cache's old name)
    const b = fs.readFileSync(f);
    if (!e || sha(b) !== e.sha) { console.error(`stills-merge: ${f} is not the bytes its bake.json names`); process.exit(1); }
    if (man[name] && man[name].sha !== e.sha) { console.error(`stills-merge: ${name} baked twice, different bytes`); process.exit(1); }
    man[name] = e; fs.writeFileSync(path.join(out, name), b);
  }
}
const n = Object.keys(man).length;
if (want !== null && n !== want) { console.error(`stills-merge: ${n} stills, want the whole set's ${want}`); process.exit(1); }
fs.writeFileSync(path.join(out, 'bake.json'), JSON.stringify(man, null, 1));
console.log(`stills-merge: ${out}: ${n} stills from ${dirs.length} folder(s)`);
