// deploy-inputs.mjs: deploy-inputs.txt, the paths the deploy build reads, for post-deploy.yml and Cloudflare's build
// watch paths. Node built-ins only.
//   node .github/ci/deploy-inputs.mjs            the pathspecs, one a line
//   node .github/ci/deploy-inputs.mjs --watch    the include patterns to enter in Cloudflare (a folder as folder/*)
//   node .github/ci/deploy-inputs.mjs --check    exit 1 unless every tool the build loads (tools/build.mjs and what it
//                                                imports, spawns or reads under tools/, followed through) is listed
// (A missing input would be a change Pages never builds, and post-deploy would not notice: so the check.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');   // (fileURLToPath: on Windows a URL's pathname keeps a leading /C:/)
const list = fs.readFileSync(path.join(ROOT, '.github/ci/deploy-inputs.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const mode = process.argv[2] || '';
const isDir = (p) => fs.existsSync(path.join(ROOT, p)) && fs.statSync(path.join(ROOT, p)).isDirectory();

if (mode === '--watch') { for (const p of list) console.log(isDir(p) ? p + '/*' : p); process.exit(0); }
if (mode !== '--check') { for (const p of list) console.log(p); process.exit(0); }

const covered = (f) => list.some((p) => f === p || f.startsWith(p + '/'));
const bad = [];
for (const p of list) if (!fs.existsSync(path.join(ROOT, p))) bad.push(`listed but missing: ${p}`);
// Local modules: './x.mjs' imports (static or dynamic) and path.join(..., 'tools', 'x.mjs') references, followed through.
const seen = new Set(), todo = ['tools/build.mjs'];
while (todo.length) {
  const f = todo.pop(); if (seen.has(f)) continue; seen.add(f);
  if (!covered(f)) bad.push(`the build loads ${f}, which deploy-inputs.txt does not list`);
  const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of t.matchAll(/['"]\.\/([\w.-]+\.m?js)['"]/g)) todo.push(path.posix.join(path.posix.dirname(f), m[1]));
  for (const m of t.matchAll(/'tools',\s*'([\w.-]+\.m?js)'/g)) todo.push('tools/' + m[1]);
}
for (const b of bad) console.log('::error::' + b);
console.log(`deploy inputs: ${list.length} paths; the build's tools: ${[...seen].sort().join(', ')}`);
process.exit(bad.length ? 1 : 0);
