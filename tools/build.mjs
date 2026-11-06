// build.mjs: the site's build, in one command (restructure steps 0 and 5). It makes the deployable folder from the
// sources: site/ copied as it is, then the built scripts written over it: src/ assembled (tools/parts.mjs: the dev
// build, and the shipped build with the dev-only parts left out), then tools/minify.mjs --build: the five minified
// scripts from the shipped build, the plan's worker (tools/plan.mjs: the world's plan spans, verbatim, from the dev
// build) and the start file with its table (tools/start.mjs, from the dev build). Each build
// assembles into a folder of its own beside its output (OUT.parts/), so two builds at once never share one.
// site/ holds only the sources the site serves as written (the pages, _headers, the hand-written scripts, the
// fonts). The files the build writes (the five minified scripts, the plan's worker, the start file and its table) are never committed
// there: Cloudflare Pages runs the deploy build (below) and serves its output. CI proves the build deterministic and
// that site/ holds none of the built files.
// (step 5) The deploy build then names every shipped script and stylesheet by its content: world.v8.js is served as
// world.<sha8>.js, <sha8> the first 8 hex of the sha256 of the file's final bytes. Files that load another by name
// (the world starts the plan's worker, the start file its table) are named after the ones they load, leaves first, so
// a file's hash covers the names it loads; a cycle is an error. Every reference is rewritten: in the scripts,
// index.html, 404.html, _headers (the Link preloads and each file's exact block) and _routes.json where there is one
// (exact names, never wildcards). A changed file gets a new name by itself: no one renames by hand, no two branches
// pick the same name, and immutable caching stays correct.
//
//   node tools/build.mjs OUT              the deploy build: into OUT (made or emptied first), named by content,
//                                         checked (below), OUT/build.txt written; prints the manifest
//   node tools/build.mjs --plain OUT      the plain build only (the vN names, no build.txt): what CI checks and renders
//   node tools/build.mjs --check          build twice into two temporary folders at once; exit 1 unless both builds are
//                                         the same bytes (deterministic), site/ holds none of the files the build
//                                         writes, and the deploy build is the same from both and passes its checks
//   node tools/build.mjs --manifest DIR   print DIR's manifest
//
// The deploy build's checks (else exit 1): every script and stylesheet at the top level has a content name and the
// name's hash is its bytes'; no old name is referenced anywhere; every page src/href, Link preload, _headers file path
// and new Worker('/...') names a file in the build; every script and stylesheet is loaded by a page or another script
// and has its own _headers block with an immutable Cache-Control.
// (2026-11-06) Then every content-named script and stylesheet is stored Brotli-compressed at quality 11 (the window
// 2^24, the size hinted) and its _headers block says Content-Encoding: br. Cloudflare compresses what it serves at
// about quality 4 (world.js 143,281 B on the wire against 121,022 B at 11); a file whose response already carries
// Content-Encoding is passed through to a client that accepts br, and decoded for one that does not (checked on a
// preview: br 121,022 B, the original once decoded; gzip and identity the original). The content names are the hashes
// of the bytes before compression, so the names do not change. The HTML, the fonts and the images are left to Cloudflare.
//
// The manifest: one line per file, "<sha256>  <path>", paths relative to the folder with '/' separators, sorted by
// path in code-unit order; build.txt is left out (it changes with every commit).
// build.txt: the commit the build was made from, one 40-hex line (the post-deploy check reads /build.txt to know the
// live site serves this build). The commit is CF_PAGES_COMMIT_SHA (Cloudflare Pages' build), else GITHUB_SHA (CI),
// else `git rev-parse HEAD`; anything but 40 hex characters is an error.
// Node built-ins only (terser, pinned in package.json, is loaded by tools/minify.mjs). Deterministic: no time, no
// absolute paths in any output byte.
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { spawn, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { buildPlan, workerName } from './plan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src'), SITE = path.join(ROOT, 'site'), WING = path.join(SRC, 'birds', 'model');
const PARTS = path.join(ROOT, 'tools', 'parts.mjs'), MINIFY = path.join(ROOT, 'tools', 'minify.mjs');
const STAMP = 'build.txt';
const NAMED = /^[a-z0-9-]+(\.v\d+)?\.(js|css)$/, HASHED = /^[a-z0-9-]+\.[0-9a-f]{8}\.(js|css)$/;
const REWRITTEN = ['index.html', '404.html', '_headers', '_routes.json'];

function die(msg) { console.error('build: FAIL: ' + msg); process.exit(1); }

function files(dir, rel = '') {   // every file under dir, relative, '/'-separated, sorted
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...files(dir, r));
    else if (e.isFile()) out.push(r);
    else die(path.join(dir, r) + ' is neither a file nor a folder');
  }
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function manifest(dir) {
  return files(dir).filter((r) => r !== STAMP).map((r) => sha(path.join(dir, r)) + '  ' + r).join('\n') + '\n';
}

function commit() {
  let c = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA;
  if (!c) {
    try { c = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
    catch (e) { die('no commit: set CF_PAGES_COMMIT_SHA or GITHUB_SHA, or build inside the git checkout'); }
  }
  if (!/^[0-9a-f]{40}$/.test(c)) die('the commit is not 40 hex characters: ' + JSON.stringify(c));
  return c;
}

function run(cmd, args) {   // a child process; resolves with its stderr, rejects with it on a non-zero exit
  return new Promise((ok, no) => {
    const p = spawn(cmd, args, { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', no);
    p.on('close', (code) => (code === 0 ? ok(err) : no(new Error(args.join(' ') + ' exited ' + code + '\n' + err))));
  });
}

async function build(out, stamp) {   // the plain build
  if (path.resolve(out) === SITE || path.resolve(out) === SRC) die('the output folder cannot be site/ or src/');
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(SITE, out, { recursive: true });
  // the ink birds' wing model, served as written (copied first: the start file's maker reads them beside index.html): src/birds/model/'s scripts copied whole (two of them generated, by
  // tools/birds/: CI makes them again and compares)
  const wing = fs.readdirSync(WING).filter((n) => n.endsWith('.js')).sort();
  for (const n of wing) {
    if (fs.existsSync(path.join(out, n))) die(n + ' is in site/ and in src/birds/model/: one source only');
    fs.copyFileSync(path.join(WING, n), path.join(out, n));
  }
  const parts = path.resolve(out) + '.parts', dev = path.join(parts, 'src'), ship = path.join(parts, 'ship');
  fs.rmSync(parts, { recursive: true, force: true });
  await Promise.all([run(process.execPath, [PARTS, 'assemble', SRC, dev]), run(process.execPath, [PARTS, 'assemble', '--ship', SRC, ship])]);
  // the plan's worker, under the name the world starts it by (made first: the start file is made with the site in place)
  const world = fs.readFileSync(path.join(dev, 'world.js'), 'utf8'), pn = workerName(world);
  if (pn) fs.writeFileSync(path.join(out, pn), (await buildPlan(world, pn)).text);   // (minified as the world is: tools/plan.mjs)
  await run(process.execPath, [MINIFY, '--build', ship, out, '--start-src', dev]);
  // the files the build wrote: the shipped scripts (minify.mjs writes each top-level script of the shipped build), the
  // plan's worker, and the start file the page loads, with its table (start.js, start-table.js)
  const written = fs.readdirSync(ship).filter((n) => /\.js$/.test(n) && fs.statSync(path.join(ship, n)).isFile()).concat(wing);
  if (pn) written.push(pn);
  const sm = fs.readFileSync(path.join(SITE, 'index.html'), 'latin1').match(/\/(start(?:\.v\d+)?\.js)[\"']/);
  if (sm) written.push(sm[1], sm[1].replace(/^start\./, 'start-table.'));
  fs.rmSync(parts, { recursive: true, force: true });
  if (stamp) fs.writeFileSync(path.join(out, STAMP), stamp + '\n');
  return written.sort();
}

// ------------------------------------------------------------------ step 5: content names
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// a reference to /NAME: the slash not inside a longer path (no name character or slash before it), the name whole
const refRe = (n) => new RegExp('(?<![A-Za-z0-9_./-])/' + esc(n) + '(?![A-Za-z0-9_.-])', 'g');
const readB = (p) => fs.readFileSync(p, 'latin1');   // (byte for byte: every name is ASCII)
const writeB = (p, t) => fs.writeFileSync(p, t, 'latin1');
const short = (t) => crypto.createHash('sha256').update(Buffer.from(t, 'latin1')).digest('hex').slice(0, 8);

function contentNames(out) {   // renames OUT's scripts and stylesheets by content; returns [[old, new], ...] sorted
  const names = fs.readdirSync(out).filter((n) => NAMED.test(n) && fs.statSync(path.join(out, n)).isFile()).sort();
  const text = new Map(names.map((n) => [n, readB(path.join(out, n))]));
  const deps = new Map(names.map((n) => [n, names.filter((m) => m !== n && refRe(m).test(text.get(n)))]));
  const done = new Map(), state = new Map();
  const visit = (n, chain) => {
    if (state.get(n) === 2) return;
    if (state.get(n) === 1) die('a cycle of names: ' + chain.concat(n).join(' -> '));
    state.set(n, 1);
    for (const d of deps.get(n)) visit(d, chain.concat(n));
    let t = text.get(n);
    for (const d of deps.get(n)) t = t.replace(refRe(d), '/' + done.get(d));
    const h = n.replace(/(\.v\d+)?\.(js|css)$/, '') + '.' + short(t) + '.' + n.match(NAMED)[2];
    if (fs.existsSync(path.join(out, h))) die(h + ' exists already');
    fs.rmSync(path.join(out, n)); writeB(path.join(out, h), t);
    done.set(n, h); state.set(n, 2);
  };
  for (const n of names) visit(n, []);
  for (const f of REWRITTEN) {
    const p = path.join(out, f);
    if (!fs.existsSync(p)) continue;
    let t = readB(p);
    for (const [n, h] of done) t = t.replace(refRe(n), '/' + h);
    writeB(p, t);
  }
  return [...done].sort();
}

function headerBlocks(t) {   // _headers as [[path, [lines]]]
  const out = []; let cur = null;
  for (const l of t.split(/\r?\n/)) {
    if (!l.trim() || l.trimStart().startsWith('#')) continue;
    if (/^\s/.test(l)) { if (cur) cur[1].push(l.trim()); } else out.push(cur = [l.trim(), []]);
  }
  return out;
}

function verify(out, map) {   // the deploy build's checks; returns a list of errors
  const err = [];
  const top = fs.readdirSync(out).filter((n) => /\.(js|css)$/.test(n)).sort();
  for (const n of top) {
    if (!HASHED.test(n)) err.push(n + ' has no content name');
    else if (n.split('.')[1] !== short(readB(path.join(out, n)))) err.push(n + ': the name is not its bytes\' hash');
  }
  const texts = files(out).filter((r) => /\.(js|css|html|json)$|^_headers$/.test(r)).map((r) => [r, readB(path.join(out, r))]);
  for (const [old] of map) for (const [r, t] of texts) if (refRe(old).test(t)) err.push(r + ' still names /' + old);
  const has = (ref) => { const p = path.join(out, ref.slice(1)); return fs.existsSync(p) && fs.statSync(p).isFile(); };
  const refs = [];
  for (const f of ['index.html', '404.html']) {
    if (!fs.existsSync(path.join(out, f))) continue;
    for (const m of readB(path.join(out, f)).replace(/<!--[\s\S]*?-->/g, '').matchAll(/\b(?:src|href)="(\/(?!\/)[^"#?]*)"/g)) refs.push([f, m[1]]);
  }
  const H = fs.existsSync(path.join(out, '_headers')) ? readB(path.join(out, '_headers')) : '';
  for (const m of H.matchAll(/Link: <([^>]+)>/g)) refs.push(['_headers', m[1]]);
  const blocks = headerBlocks(H);
  for (const [p] of blocks) if (p.startsWith('/') && !/[*:]/.test(p) && /\.[a-z0-9]+$/.test(p)) refs.push(['_headers', p]);
  for (const [r, t] of texts) if (/\.js$/.test(r)) for (const m of t.matchAll(/new Worker\((['"])(\/[^'"]+)\1\)/g)) refs.push([r, m[2]]);
  for (const [f, ref] of refs) if (ref !== '/' && !has(ref)) err.push(f + ' names ' + ref + ', which is not in the build');
  const loaded = new Set(refs.filter(([f]) => f !== '_headers').map(([, r]) => r.slice(1)));
  for (const n of top) {
    if (!loaded.has(n)) err.push(n + ' is shipped but no page or script loads it');
    const b = blocks.find(([p]) => p === '/' + n);
    if (!b) err.push(n + ' has no _headers block of its own');
    else if (!b[1].some((l) => /^Cache-Control:.*\bimmutable\b/i.test(l))) err.push(n + ': its _headers block is not immutable');
  }
  return err;
}

function precompress(out) {   // each content-named script and stylesheet stored as Brotli 11, its block told so
  const H = path.join(out, '_headers'); let h = fs.readFileSync(H, 'utf8'); const done = [];
  for (const n of fs.readdirSync(out).filter((f) => HASHED.test(f)).sort()) {
    const p = path.join(out, n), raw = fs.readFileSync(p);
    const br = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_LGWIN]: 24,
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } });
    if (!zlib.brotliDecompressSync(br).equals(raw)) die(n + ': its Brotli bytes do not decode to it');
    const re = new RegExp('^/' + n.replace(/[.]/g, '\\.') + '\n', 'm'), m = re.exec(h);
    if (!m) die(n + ': no _headers block of its own to say Content-Encoding in');
    h = h.slice(0, m.index + m[0].length) + '  Content-Encoding: br\n' + h.slice(m.index + m[0].length);
    fs.writeFileSync(p, br); done.push([n, raw.length, br.length]);
  }
  fs.writeFileSync(H, h);
  return done;
}

async function deploy(out, stamp) {   // the plain build, named by content, checked
  await build(out, null);
  const map = contentNames(out), err = verify(out, map);
  if (err.length) die('the deploy build fails its checks:\n  ' + err.join('\n  '));
  precompress(out);
  if (stamp) fs.writeFileSync(path.join(out, STAMP), stamp + '\n');
  return map;
}

function diff(a, b, la, lb) {   // the lines of two manifests that differ, as a report
  const A = new Map(a.trim().split('\n').map((l) => [l.slice(66), l.slice(0, 64)]));
  const B = new Map(b.trim().split('\n').map((l) => [l.slice(66), l.slice(0, 64)]));
  const out = [];
  for (const [p, h] of A) if (!B.has(p)) out.push('only in ' + la + ': ' + p); else if (B.get(p) !== h) out.push('differs: ' + p);
  for (const p of B.keys()) if (!A.has(p)) out.push('only in ' + lb + ': ' + p);
  return out;
}

const a = process.argv.slice(2);
if (a[0] === '--check' && a.length === 1) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'build-'));
  const d1 = path.join(tmp, 'one'), d2 = path.join(tmp, 'two');
  const t0 = Date.now();
  let written;
  try { [written] = await Promise.all([build(d1, null), build(d2, null)]); } catch (e) { die(e.message); }
  const m1 = manifest(d1), m2 = manifest(d2);
  let bad = 0;
  for (const l of diff(m1, m2, 'build one', 'build two')) { console.error('::error::not deterministic: ' + l); bad = 1; }
  for (const n of written) if (fs.existsSync(path.join(SITE, n))) {
    console.error('::error::site/' + n + ' is a file the build writes: it is never committed (git rm it; its source is in src/)'); bad = 1;
  }
  if (bad) { fs.rmSync(tmp, { recursive: true, force: true }); process.exit(1); }
  // (step 5) the deploy build, from each plain build: the same names and bytes from both, and its checks passed
  const h1 = path.join(tmp, 'one-named'), h2 = path.join(tmp, 'two-named');
  fs.cpSync(d1, h1, { recursive: true }); fs.cpSync(d2, h2, { recursive: true });
  const map = contentNames(h1); contentNames(h2);
  const err = verify(h1, map);
  if (!err.length) { precompress(h1); precompress(h2); }
  const n1 = manifest(h1);
  for (const l of diff(n1, manifest(h2), 'deploy build one', 'deploy build two')) err.push('not deterministic: ' + l);
  fs.rmSync(tmp, { recursive: true, force: true });
  if (err.length) { for (const e of err) console.error('::error::the deploy build: ' + e); process.exit(1); }
  const n = m1.trim().split('\n').length, h = (m) => crypto.createHash('sha256').update(m).digest('hex').slice(0, 16);
  console.log('build: ok: two builds, the same bytes, site/ holding none of the ' + written.length + ' built files (' + n + ' files, manifest sha256 ' + h(m1) + ', ' +
    ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  console.log('build: ok: the deploy build, the same from both, named by content, every reference resolved, the scripts and stylesheet stored as Brotli 11 (manifest sha256 ' + h(n1) + '):');
  for (const [o, nn] of map) console.log('  ' + o + ' -> ' + nn);
} else if (a[0] === '--manifest' && a.length === 2) {
  process.stdout.write(manifest(a[1]));
} else if (a[0] === '--plain' && a.length === 2) {
  try { await build(a[1], null); } catch (e) { die(e.message); }
  process.stdout.write(manifest(a[1]));
} else if (a.length === 1 && !a[0].startsWith('--')) {
  const stamp = commit();
  let map;
  try { map = await deploy(a[0], stamp); } catch (e) { die(e.message); }
  process.stdout.write(manifest(a[0]));
  console.error('build: ' + a[0] + ' made from ' + stamp + ' (' + map.length + ' files named by content)');
} else die('usage: build.mjs OUT | --plain OUT | --check | --manifest DIR');
