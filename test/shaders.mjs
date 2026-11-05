// shaders.mjs: every program the world issues, as golden texts, and each one compiled by a real Chrome (restructure
// step 3). The shaders' text now lives in .glsl files that the build writes back into the scripts; this proves the
// programs the page hands WebGL are exactly the committed ones, and that each compiles and links.
//
//   node test/shaders.mjs SITE                 compare with test/golden/shaders/ (exit 1 naming each program that differs)
//   node test/shaders.mjs SITE --write         write test/golden/shaders/ (after a deliberate change; commit it)
//   node test/shaders.mjs SITE --compile       also compile and link every golden program in headless Chrome (WebGL2)
//
// The programs are the reference device's (a desktop Chrome with float targets: the first device of
// .github/workflows/glsl_guard.js), as the page issues them in its first visit there, each named by its label in
// glsl_manifest.txt (program.<hash>): <label>.vert and <label>.frag. glsl_guard holds the hashes and the rules (the same
// sources on every visit, the manifest); this keeps the texts, so a change shows as a readable diff of the shader.
// --compile drives Chrome through playwright-core (PW_CORE names its package folder; CHROME_PATH a Chrome, else the
// installed Chrome channel), with SwiftShader as validate.yml's W7 step runs it. Exit 2: no WebGL2 context (warn).
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

const argv = process.argv.slice(2), SITE = argv.find((a) => !a.startsWith('--'));
const WRITE = argv.includes('--write'), COMPILE = argv.includes('--compile');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const GOLD = path.join(ROOT, 'test', 'golden', 'shaders'), GUARD = path.join(ROOT, '.github', 'workflows', 'glsl_guard.js');
const MANIFEST = path.join(ROOT, '.github', 'workflows', 'glsl_manifest.txt');
if (!SITE || !fs.existsSync(path.join(SITE, 'index.html'))) { console.error('usage: node test/shaders.mjs SITE [--write] [--compile]'); process.exit(2); }
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 24);

// ------------------------------------------------------------------ the programs as issued (glsl_guard's fake browser)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shaders-'));
try { execFileSync(process.execPath, [GUARD, SITE, '--dump', tmp, '--visits', '3'], { stdio: ['ignore', 'ignore', 'inherit'] }); }
catch (e) { console.error('shaders: glsl_guard could not run the page (exit ' + e.status + ')'); process.exit(1); }
const labels = new Map();
for (const l of fs.readFileSync(MANIFEST, 'utf8').split('\n')) { const w = l.split(' '); if (w[0] === 'program') labels.set(w[3] + ' ' + w[6], w[1]); }
const now = new Map();
for (let j = 0; ; j++) {
  const b = path.join(tmp, 'desktop0_' + String(j).padStart(2, '0') + '_');
  const f = fs.readdirSync(tmp).find((n) => path.join(tmp, n).startsWith(b) && n.endsWith('.vert'));
  if (!f) break;
  const vs = fs.readFileSync(path.join(tmp, f), 'utf8'), fsrc = fs.readFileSync(path.join(tmp, f.replace(/\.vert$/, '.frag')), 'utf8');
  const label = labels.get(sha(vs) + ' ' + sha(fsrc));
  if (!label) { console.error('::error::shaders: a program the page issues is not in glsl_manifest.txt (glsl_guard fails too: write the manifest first)'); process.exit(1); }
  now.set(label, { vs, fs: fsrc });
}
fs.rmSync(tmp, { recursive: true, force: true });
if (!now.size) { console.error('shaders: the page issued no program'); process.exit(1); }

// ------------------------------------------------------------------ the golden texts
if (WRITE) {
  fs.rmSync(GOLD, { recursive: true, force: true }); fs.mkdirSync(GOLD, { recursive: true });
  for (const [l, p] of [...now].sort()) { fs.writeFileSync(path.join(GOLD, l + '.vert'), p.vs); fs.writeFileSync(path.join(GOLD, l + '.frag'), p.fs); }
  console.log(`shaders: wrote ${now.size} programs into ${path.relative(ROOT, GOLD)}`);
} else {
  const had = fs.existsSync(GOLD) ? new Set(fs.readdirSync(GOLD)) : new Set();
  let bad = 0;
  for (const [l, p] of now) for (const [ext, t] of [['.vert', p.vs], ['.frag', p.fs]]) {
    const f = path.join(GOLD, l + ext); had.delete(l + ext);
    if (!fs.existsSync(f)) { console.error(`::error::shaders: ${l}${ext} is issued but has no golden text (node test/shaders.mjs site --write)`); bad++; continue; }
    const g = fs.readFileSync(f, 'utf8');
    if (g !== t) {
      const a = g.split('\n'), b = t.split('\n'); let k = 0; while (k < a.length && a[k] === b[k]) k++;
      console.error(`::error::shaders: ${l}${ext} differs from its golden text from line ${k + 1}: golden ${JSON.stringify((a[k] || '').slice(0, 100))}, issued ${JSON.stringify((b[k] || '').slice(0, 100))}`); bad++;
    }
  }
  for (const n of had) { console.error(`::error::shaders: test/golden/shaders/${n} is no longer issued (node test/shaders.mjs site --write)`); bad++; }
  if (bad) process.exit(1);
  console.log(`shaders: the ${now.size} programs the page issues are the golden texts`);
}

// ------------------------------------------------------------------ each one compiled and linked by Chrome
if (COMPILE) {
  const PW = createRequire(import.meta.url)(process.env.PW_CORE || 'playwright-core');
  const args = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const b = await (process.env.CHROME_PATH ? PW.chromium.launch({ executablePath: process.env.CHROME_PATH, args }) : PW.chromium.launch({ channel: 'chrome', args }));
  let r;
  try {
    const page = await b.newPage();
    await page.setContent('<canvas width="4" height="4"></canvas>');
    r = await page.evaluate((progs) => {
      const gl = document.querySelector('canvas').getContext('webgl2'); if (!gl) return { err: 'no webgl2' };
      const ext = gl.getSupportedExtensions() || []; for (const e of ext) gl.getExtension(e);
      const fails = [];
      for (const [l, p] of progs) {
        const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
        const v = sh(gl.VERTEX_SHADER, p.vs), f = sh(gl.FRAGMENT_SHADER, p.fs), P = gl.createProgram();
        gl.attachShader(P, v); gl.attachShader(P, f); gl.linkProgram(P);
        if (!gl.getProgramParameter(P, gl.LINK_STATUS)) fails.push(l + ': ' + ((gl.getShaderInfoLog(v) || '') + (gl.getShaderInfoLog(f) || '') + (gl.getProgramInfoLog(P) || '')).trim().slice(0, 400));
        gl.deleteProgram(P); gl.deleteShader(v); gl.deleteShader(f);
      }
      return { renderer: gl.getParameter(gl.RENDERER), n: progs.length, fails };
    }, [...now]);
  } finally { await b.close(); }
  if (r.err) { console.error('shaders: ' + r.err); process.exit(2); }
  for (const f of r.fails) console.error('::error::shaders: does not compile: ' + f);
  if (r.fails.length) process.exit(1);
  console.log(`shaders: all ${r.n} programs compile and link (${r.renderer})`);
}
