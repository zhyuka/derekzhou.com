// tools/checks/lib/reads.mjs: every file a check's node processes open, written down (CI lane, 2026-11-25, the hub's
// gate p90). tools/check.mjs preloads it (NODE_OPTIONS=--import) into a check that declares `# inputs:` globs; child
// processes inherit it. On exit each process writes the absolute paths it read, listed a directory, or asked about
// (exists, stat), and the modules it loaded, to CHECK_READS/r-<pid>.txt. check.mjs then fails the check for a path
// in the repository that no declared input matches: a check whose result is reused for the same inputs must read
// nothing else.
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

const OUT = process.env.CHECK_READS, seen = new Set();
const note = (p) => {
  try {
    if (p instanceof URL) { if (p.protocol === 'file:') seen.add(fileURLToPath(p)); return; }
    if (typeof p === 'string' || Buffer.isBuffer(p)) seen.add(path.resolve(String(p)));
  } catch { /* not a path */ }
};
if (OUT) {
  const wrap = (o, names) => { for (const n of names) { const f = o[n]; if (typeof f !== 'function') continue; o[n] = function (p, ...rest) { note(p); return f.call(this, p, ...rest); }; } };
  wrap(fs, ['readFileSync', 'readFile', 'openSync', 'open', 'createReadStream', 'readdirSync', 'readdir', 'existsSync', 'statSync', 'stat', 'lstatSync', 'opendirSync', 'accessSync', 'realpathSync']);
  wrap(fs.promises, ['readFile', 'open', 'readdir', 'stat', 'lstat', 'access', 'opendir']);
  registerHooks({ load(url, ctx, next) { if (url.startsWith('file:')) note(new URL(url)); return next(url, ctx); } });
  process.on('exit', () => { try { fs.writeFileSync(path.join(OUT, `r-${process.pid}.txt`), [...seen].join('\n')); } catch { /* the folder gone */ } });
}
