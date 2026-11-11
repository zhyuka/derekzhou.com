// shaders.mjs: every program the world issues, each one compiled and linked by a real Chrome (restructure step 3).
// The shaders' text lives in .glsl files that the build writes back into the scripts; this proves each program the
// page hands WebGL compiles and links. Which programs a change edits is the gate's census of the base's and the head's
// builds (glsl_changed; T2 names and reads back each one): nothing derived from the shaders is committed (2026-11-06).
//
//   node test/shaders.mjs SITE                 list the programs the page issues
//   node test/shaders.mjs SITE --compile       also compile and link each one in headless Chrome (WebGL2)
//
// The programs are the reference device's (a desktop Chrome with float targets: the first device of
// .github/workflows/glsl_guard.js), as the page issues them in its first visit there, each named by glsl_guard's dump.
// --compile drives Chrome through playwright-core (PW_CORE names its package folder; CHROME_PATH a Chrome, else the
// installed Chrome channel), with SwiftShader as validate.yml's W7 step runs it. Exit 2: no WebGL2 context (warn).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

const argv = process.argv.slice(2), SITE = argv.find((a) => !a.startsWith('--'));
const COMPILE = argv.includes('--compile');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const GUARD = path.join(ROOT, '.github', 'workflows', 'glsl_guard.js');
if (!SITE || !fs.existsSync(path.join(SITE, 'index.html'))) { console.error('usage: node test/shaders.mjs SITE [--compile]'); process.exit(2); }

// ------------------------------------------------------------------ the programs as issued (glsl_guard's fake browser)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shaders-'));
try { execFileSync(process.execPath, [GUARD, SITE, '--first', '--dump', tmp], { stdio: ['ignore', 'ignore', 'inherit'] }); }
catch (e) { console.error('shaders: glsl_guard could not run the page (exit ' + e.status + ')'); process.exit(1); }
const now = new Map();
for (let j = 0; ; j++) {
  const b = path.join(tmp, 'desktop0_' + String(j).padStart(2, '0') + '_');
  const f = fs.readdirSync(tmp).find((n) => path.join(tmp, n).startsWith(b) && n.endsWith('.vert'));
  if (!f) break;
  const vs = fs.readFileSync(path.join(tmp, f), 'utf8'), fsrc = fs.readFileSync(path.join(tmp, f.replace(/\.vert$/, '.frag')), 'utf8');
  now.set(f.replace(/^desktop0_/, '').replace(/\.vert$/, ''), { vs, fs: fsrc });
}
fs.rmSync(tmp, { recursive: true, force: true });
if (!now.size) { console.error('shaders: the page issued no program'); process.exit(1); }

console.log(`shaders: the page issues ${now.size} programs`);

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
