// tsc.mjs: tsc --checkJs over the assembled world (the dev build: node tools/parts.mjs assemble src), with
// tools/types/world.d.ts for what TypeScript's DOM types lack. Not a build step and not a dependency (the owner's
// no-frameworks rule: terser alone to build): it runs a pinned TypeScript through npx, into npm's cache.
//   node tools/tsc.mjs           print each error as section:line, and the count; exit 1 if there is any
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TS = 'typescript@5.6.3';
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'tsc-world-'));
execFileSync(process.execPath, [path.join(ROOT, 'tools/parts.mjs'), 'assemble', path.join(ROOT, 'src'), out], { stdio: 'ignore' });
const r = spawnSync('npx', ['-y', '-p', TS, 'tsc', '--allowJs', '--checkJs', '--noEmit', '--target', 'es2020', '--lib', 'es2020,dom',
  path.join(out, 'world.js'), path.join(ROOT, 'tools/types/world.d.ts')], { encoding: 'utf8' });
// each assembled line back to its section: the parts in the order assemble joins them (dev parts with the world's)
const asm = fs.readFileSync(path.join(out, 'world.js'), 'utf8');
const parts = [...fs.readdirSync(path.join(ROOT, 'src/world')).filter((f) => /^\d{3}-.*\.js$/.test(f) && !f.endsWith('.ship.js')).map((f) => ['src/world/' + f, f]),
  ...fs.readdirSync(path.join(ROOT, 'src/dev/world')).map((f) => ['src/dev/world/' + f, f])].sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
const starts = []; let pos = 0;
for (const [p] of parts) {
  const t = fs.readFileSync(path.join(ROOT, p), 'utf8'), probe = t.split('\n').find((l) => l.trim().length > 20 && !l.includes('@glsl'));
  const i = probe ? asm.indexOf(probe, pos) : -1; if (i < 0) continue;
  starts.push([asm.slice(0, i).split('\n').length - (t.slice(0, t.indexOf(probe)).split('\n').length - 1), p]); pos = i;
}
let n = 0;
for (const l of (r.stdout || '').split('\n')) {
  const m = /world\.js\((\d+),(\d+)\): (error TS\d+: .*)/.exec(l); if (!m) continue;
  let s = starts[0]; for (const x of starts) if (x[0] <= +m[1]) s = x;
  console.log(`${s[1]}:${+m[1] - s[0] + 1}  ${m[3]}`); n++;
}
if (r.status !== 0 && !n) { process.stderr.write(r.stderr || r.stdout || 'tsc did not run\n'); process.exit(2); }
console.log(`tsc --checkJs: ${n} error(s) in the assembled world`);
fs.rmSync(out, { recursive: true, force: true });
process.exit(n ? 1 : 0);
