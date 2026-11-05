// build.mjs: the site's build, in one command (restructure step 0). It makes the deployable folder from the sources:
// site/ copied as it is, then the built scripts written over it: src/ assembled (tools/parts.mjs: the dev build, and
// the shipped build with the dev-only parts left out), then tools/minify.mjs --build: the five minified scripts from
// the shipped build and the start file with its table (tools/start.mjs, from the dev build). Each build assembles into
// a folder of its own beside its output (OUT.parts/), so two builds at once never share one.
// Today that output is byte for byte the committed site/ (CI proves it); later steps change how the bytes are
// made, never silently what they are.
//
//   node tools/build.mjs OUT              build into OUT (made or emptied first), write OUT/build.txt, print the manifest
//   node tools/build.mjs --check          build twice into two temporary folders at once; exit 1 unless both builds are
//                                         the same bytes (deterministic) and their manifest equals site/'s files
//   node tools/build.mjs --manifest DIR   print DIR's manifest
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
import { spawn, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src'), SITE = path.join(ROOT, 'site');
const PARTS = path.join(ROOT, 'tools', 'parts.mjs'), MINIFY = path.join(ROOT, 'tools', 'minify.mjs');
const STAMP = 'build.txt';

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

async function build(out, stamp) {
  if (path.resolve(out) === SITE || path.resolve(out) === SRC) die('the output folder cannot be site/ or src/');
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(SITE, out, { recursive: true });
  const parts = path.resolve(out) + '.parts', dev = path.join(parts, 'src'), ship = path.join(parts, 'ship');
  fs.rmSync(parts, { recursive: true, force: true });
  await Promise.all([run(process.execPath, [PARTS, 'assemble', SRC, dev]), run(process.execPath, [PARTS, 'assemble', '--ship', SRC, ship])]);
  await run(process.execPath, [MINIFY, '--build', ship, out, '--start-src', dev]);
  fs.rmSync(parts, { recursive: true, force: true });
  if (stamp) fs.writeFileSync(path.join(out, STAMP), stamp + '\n');
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
  try { await Promise.all([build(d1, null), build(d2, null)]); } catch (e) { die(e.message); }
  const m1 = manifest(d1), m2 = manifest(d2), ms = manifest(SITE);
  let bad = 0;
  for (const l of diff(m1, m2, 'build one', 'build two')) { console.error('::error::not deterministic: ' + l); bad = 1; }
  for (const l of diff(m1, ms, 'the build', 'site/')) {
    console.error('::error::the build is not site/: ' + l + ' (rebuild site/: see CLAUDE.md, the minified scripts)'); bad = 1;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (bad) process.exit(1);
  const n = m1.trim().split('\n').length;
  console.log('build: ok: two builds, the same bytes, equal to site/ (' + n + ' files, manifest sha256 ' +
    crypto.createHash('sha256').update(m1).digest('hex').slice(0, 16) + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
} else if (a[0] === '--manifest' && a.length === 2) {
  process.stdout.write(manifest(a[1]));
} else if (a.length === 1 && !a[0].startsWith('--')) {
  const stamp = commit();
  try { await build(a[0], stamp); } catch (e) { die(e.message); }
  process.stdout.write(manifest(a[0]));
  console.error('build: ' + a[0] + ' made from ' + stamp);
} else die('usage: build.mjs OUT | --check | --manifest DIR');
