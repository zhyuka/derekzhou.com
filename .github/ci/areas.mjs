// areas.mjs: which gates a change needs, from the files it touches (areas.json; a file no pattern matches means ALL,
// so a new kind of file is tested everywhere until it is mapped). Also whether what a visitor is served changed: the
// two builds (served.sh: DIR/base, DIR/head, each commit's tools/build.mjs --plain) compared file by file. Byte for
// byte the base's, it is identical by construction and the frames need no rendering. (site/ holds only sources, so a
// change to src/, tools/ or the pinned terser changes what is served with site/ untouched: only the builds can say.)
//   node .github/ci/areas.mjs BASE_SHA HEAD_SHA --served DIR   -> areas=..., site_changed=... (what is served changed), run_t1=..., gpu_js=... (+ $GITHUB_OUTPUT)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { map } = JSON.parse(fs.readFileSync(path.join(here, 'areas.json'), 'utf8'));
const glob = (g) => new RegExp('^' + g.split('**').map((p) => p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*') + '$');
const RULES = map.map(([g, a]) => [glob(g), a]);

// tools/gpu/ files T2 never runs (the 4090's other jobs: the ground's recorder, the stills' bake): a change to one
// alone is not T2's own (2026-11-14: #237's recorder edit waited for T2 behind a stalled GPU queue)
export const NOT_T2 = new Set(['tools/gpu/record-ground.mjs', 'tools/gpu/bake-stills.js']);

export function areasOf(files) {
  const out = new Set(['static']); const unknown = [];
  for (const f of files) {
    const r = RULES.find(([re]) => re.test(f));
    if (!r) { unknown.push(f); continue; }
    for (const a of r[1]) out.add(a);
  }
  if (unknown.length) ['frames', 'gpu', 'harness'].forEach((a) => out.add(a));
  out.delete('none');
  return { areas: [...out].sort(), unknown };
}

// Input handling: T1 and T2 render with no pointer, touch or key, so a change to how the page answers one would read as
// "frames identical" and merge unseen. Such a change is found here and the verdict leaves it to the owner. Read in the
// readable sources only (src/, site/'s scripts and pages), and matched as event USE, not bare words (a bird's 'wheel'
// pattern, a dev option named clicks, a file named for the perched birds are not input):
//   an input event named to addEventListener / removeEventListener, or an on<event> handler set;
//   an input event object read (clientX/Y, pointerId, touches, deltaY, e.key ...);
//   the page's own input machinery by its identifiers (the click queue, clicks(), the drag's handlers, pointer capture,
//   the motion permission);
//   any change to a file named for input (the world's drag section).
// Safe-side: a pattern here may still flag a change that is not input; the owner then looks once.
const EV = '(pointer\\w*|touch\\w*|mouse\\w*|click|dblclick|auxclick|contextmenu|key\\w*|wheel|deviceorientation\\w*|devicemotion|drag\\w*|drop|gesture\\w*|select(start|ionchange)?)';
export const INPUT_LINE = new RegExp([
  `(add|remove)EventListener\\(\\s*['"\`]${EV}['"\`]`,
  `\\bon${EV}\\s*=`,
  `\\.(clientX|clientY|pageX|pageY|screenX|screenY|offsetX|offsetY|movementX|movementY|pointerId|pointerType|isPrimary|touches|changedTouches|targetTouches|deltaX|deltaY|deltaZ|deltaMode|keyCode|charCode|altKey|ctrlKey|metaKey|shiftKey)\\b`,
  `\\b(e|ev|evt|event)\\.(key|code|button|buttons|which|pressure)\\b`,
  `\\b(CLICKQ|onDown|endDrag|setPointerCapture|releasePointerCapture|hasPointerCapture|PointerEvent|TouchEvent|requestPermission)\\b`,
  `\\bclicks\\s*\\(`,
].join('|'));
export const INPUT_FILE = /input[^/]*$/i;
const READABLE = (f) => f.startsWith('src/') || /^site\/.*\.(js|html)$/.test(f);

export function inputChanges(base, head, git) {
  const hits = new Set();
  const files = git('diff', '--name-only', base, head).split('\n').filter(Boolean).filter(READABLE);
  for (const f of files) if (INPUT_FILE.test(f)) hits.add(f);
  if (files.length) {
    let cur = null;
    for (const line of git('diff', '-U0', base, head, '--', ...files).split('\n')) {
      if (line.startsWith('+++ ')) { cur = line.replace(/^\+\+\+ (b\/)?/, ''); continue; }
      if (/^[+-](?![+-]{2} )/.test(line) && INPUT_LINE.test(line) && cur && cur !== '/dev/null') hits.add(cur);
    }
  }
  return [...hits].sort();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [base, head, flag, served] = process.argv.slice(2);
  if (flag !== '--served' || !served) { console.error('usage: areas.mjs BASE_SHA HEAD_SHA --served DIR'); process.exit(2); }
  const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });
  const files = git('diff', '--name-only', base, head).split('\n').filter(Boolean);
  const { areas, unknown } = areasOf(files);
  // the served files that differ (in one build only, or other bytes), by path relative to the build
  const tree = (d) => { const m = new Map(); for (const f of fs.readdirSync(d, { recursive: true }).map(String)) { const p = path.join(d, f); if (fs.statSync(p).isFile()) m.set(f.split(path.sep).join('/'), crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')); } return m; };
  const B = tree(path.join(served, 'base')), H = tree(path.join(served, 'head'));
  if (!B.size || !H.size) { console.error('areas: a build is empty (' + B.size + ' base, ' + H.size + ' head files)'); process.exit(2); }
  const changedServed = [...new Set([...B.keys(), ...H.keys()])].filter((f) => B.get(f) !== H.get(f)).sort();
  const siteChanged = changedServed.length > 0;
  // T1 renders only when what is served changed (the builds), or when the harness itself did (so it is tested on its own PR);
  // T2 when the world's, the realms' or the birds' served JS changed (the census adds a changed shader).
  const harness = files.some((f) => f.startsWith('.github/ci/') || f.startsWith('.github/actions/') || f === '.github/workflows/gate.yml');
  const gpuJs = changedServed.some((f) => areasOf(['site/' + f]).areas.includes('gpu'));   // (a served file, mapped as site/'s)
  const t2Self = files.some((f) => f === '.github/workflows/gpu.yml' || (f.startsWith('tools/gpu/') && !NOT_T2.has(f)));   // (T2's own files: T2 runs on itself)
  const input = inputChanges(base, head, git);
  if (input.length) console.log(`input handling changed in: ${input.join(' ')}`);
  const o = { areas: areas.join(','), site_changed: siteChanged, run_t1: siteChanged || harness, gpu_js: gpuJs, t2_self: t2Self, input_changed: input.length > 0, input_files: input.join(' ').slice(0, 900), files: files.length };
  console.log(`${files.length} files changed${unknown.length ? '; unmapped (ALL): ' + unknown.join(' ') : ''}`);
  console.log(`served: ${changedServed.length ? changedServed.length + ' files differ: ' + changedServed.join(' ') : 'byte for byte the base\'s (' + H.size + ' files)'}`);
  for (const [k, v] of Object.entries(o)) console.log(`${k}=${v}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(o).map(([k, v]) => `${k}=${v}\n`).join(''));
}
