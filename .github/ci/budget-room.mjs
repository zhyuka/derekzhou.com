// budget-room.mjs: how close each built script is to its load budget, for the merge bot (the hub, 03:50Z Nov 25: #427,
// #432 and #437 each fit world.js's line on their own gates, edited different sections, and landed together 77 B over
// it). For each line of tools/checks/36-load-budget.sh's BUDGET that names one file of the build (not a prefix: fonts
// and stills are not built from a PR's sources), its body as the check weighs it (Brotli 11, as tools/gpu/cfserve.js
// compresses with --br 11) against its line. Printed as one line of JSON for the plan job's output (the verdict keeps it):
// With BASE (the gate's base build), each also keeps its base size: a script the PR's change leaves byte for byte
// the same (a comment in a section) is not the PR's growth.
//   node .github/ci/budget-room.mjs BUILD [BASE] [--check CHECK_SH]   -> {"/world.js":{"size":124902,"base":124611,"line":125952},...}
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export function budgetsOf(sh) {
  const m = /const BUDGET = \{([\s\S]*?)\n\};/.exec(sh); if (!m) throw new Error('budget-room: BUDGET not found in the load budget check');
  const out = {};
  for (const l of m[1].matchAll(/^\s*'([^']+)':\s*([\d.]+)\s*\*\s*K\b/gm)) out[l[1]] = Math.round(+l[2] * 1024);
  return out;
}
export const brotli = (b) => zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: b.length } }).length;
export function room(build, sh, baseBuild = null) {
  const out = {};
  for (const [p, line] of Object.entries(budgetsOf(sh))) {
    if (!/^\/[\w.-]+\.js$/.test(p)) continue;   // (a built script at the root: the outputs a PR's sources make)
    const f = path.join(build, p.slice(1)); if (!fs.existsSync(f)) continue;
    const b = baseBuild && path.join(baseBuild, p.slice(1));
    out[p] = { size: brotli(fs.readFileSync(f)), line };
    if (b) out[p].base = fs.existsSync(b) ? brotli(fs.readFileSync(b)) : 0;
  }
  return out;
}
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const a = process.argv.slice(2), i = a.indexOf('--check'), sh = i >= 0 ? a.splice(i, 2)[1] : 'tools/checks/36-load-budget.sh';
  process.stdout.write(JSON.stringify(room(a[0], fs.readFileSync(sh, 'utf8'), a[1] || null)) + '\n');
}
