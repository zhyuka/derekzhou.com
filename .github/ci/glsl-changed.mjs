// glsl-changed.mjs: whether any shader's text differs between the base's build and the head's (the plan job's shader
// census, gate.yml). Each build runs once per device in glsl_guard.js's fake browser (node, no Chrome: an NVIDIA, an
// Intel, an Adreno, an Apple and a Mali GPU, each with its own extensions), which keeps every source the page hands
// shaderSource until the world shows; the two builds' sets of (device, source hash) are compared. Every visit of a
// device compiles the same sources (validate.yml holds that), so one visit a device is the whole set.
//   node .github/ci/glsl-changed.mjs BASE_BUILD HEAD_BUILD
// Prints glsl_changed=true|false and the programs that differ (and appends glsl_changed to $GITHUB_OUTPUT). A build
// the fake cannot bring to its show counts as changed (T2 then looks).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';

const [base, head] = process.argv.slice(2);
const GUARD = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'workflows', 'glsl_guard.js');
const sources = (site) => new Promise((ok) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'glsl-'));
  execFile(process.execPath, [GUARD, site, '--visits', '1', '--dump', d], { maxBuffer: 1 << 26 }, (e) => {
    if (e && e.code === 3) return ok(null);   // (the fake could not bring the world to its show)
    const set = new Map();
    for (const f of fs.readdirSync(d)) {
      const dev = f.replace(/\d*_\d+_.*$/, ''), h = crypto.createHash('sha256').update(fs.readFileSync(path.join(d, f))).digest('hex').slice(0, 16);
      set.set(dev + ' ' + f.replace(/^[a-z]+\d*_\d+_/, '').replace(/\.(vert|frag)$/, '') + '.' + f.split('.').pop() + ' ' + h, true);
    }
    fs.rmSync(d, { recursive: true, force: true });
    ok(set.size ? set : null);
  });
});
const [b, h] = await Promise.all([sources(base), sources(head)]);
let changed, why;
if (!b || !h) { changed = true; why = `the fake browser could not read the ${!h ? 'head' : 'base'} build's shaders: counted as changed`; }
else {
  const only = (x, y) => [...x.keys()].filter((k) => !y.has(k));
  const gone = only(b, h), added = only(h, b);
  changed = gone.length > 0 || added.length > 0;
  why = changed ? `${added.length} source(s) new or changed in head, ${gone.length} gone: ` + added.slice(0, 8).map((k) => k.split(' ').slice(0, 2).join(' ')).join(', ') : `the same ${h.size} sources on every device`;
}
console.log(`glsl_changed=${changed} (${why})`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `glsl_changed=${changed}\n`);
