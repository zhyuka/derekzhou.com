// t1.mjs: T1, the software A/B. Base and head served side by side (serve.mjs, their own _headers) and rendered in the
// same job, in the same browser (harness.mjs: SwiftShader, the clock paused and stepped, the visit's entropy fixed):
// each arm stepped to its own first shown frame, then K frames more, and at each K the canvas read back and hashed in
// the page and the DOM serialised and hashed. A null test (base against base) runs in every shard: if the harness
// cannot reproduce a build against itself, the shard fails rather than report a difference it cannot trust. The
// still cases (no WebGL2, the 404 page) compare the DOM and a screenshot.
//   node .github/ci/t1.mjs --base BASE_BUILD --head HEAD_BUILD --shard 0 --shards 4 --out DIR
//        [--base-rec FILE] [--cache use|verify|off] [--save-base-rec FILE] [--save-head-rec FILE]
// The base's record (each case's frames, DOM, stills, errors and CSP reports, as hashes): a build's record depends only
// on its bytes and this harness, so gate.yml caches it by the plain build's content hash and the harness's files, and a
// shard whose base is already rendered renders only its head (--cache use, the default with --base-rec). The head is
// compared with the record exactly as with a live base arm. Any difference at all (frames, DOM, a never-shown arm, a
// case missing from the record) is not reported from the record: the case is rendered again fresh, base, head and null
// test as before, and the fresh render decides (so a cached base can never make a change, or a false one, of its own).
// --cache verify renders every case fresh and also proves the record byte for byte the fresh base's (a problem if not);
// --cache off ignores the record. --save-base-rec/--save-head-rec write this shard's records of what it rendered.
// Writes DIR/result.json (frames_identical) and, on a mismatch only, base/head PNGs and a diff image. Exit 1 when the
// harness cannot be trusted (null test, a build that never shows) or the head breaks a rule (a CSP violation, a page
// error the base does not have); a frame that differs is a result (frames_identical=false), not a failure.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { serve } from './serve.mjs';
import * as H from './harness.mjs';

const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const SHARD = +(A.shard || 0), SHARDS = +(A.shards || 1), OUT = A.out || 't1-out';
// --dom-only 1 (gate.yml, when T2 compares the same builds' canvas on the 4090): a world case compares the DOM alone
// (T2 owns the frames); the still cases (no world: the page as CSS draws it) compare in full as always
const DOM_ONLY = A['dom-only'] === '1';
fs.mkdirSync(OUT, { recursive: true });
const T = (iso) => Date.parse(iso);

// The cases, dealt to the shards in order (case i to shard i % SHARDS). The hours pick the landing sky (hour.js);
// the seeds the visit. Windows: a phone (393x852 at 3) and a laptop (1440x900, 6:5 or wider: the pitched camera).
const DESK = [1440, 900, 1], PHONE = [393, 852, 3];
const CASES = [
  { name: 'laptop-night', kind: 'world', vp: DESK, persona: 'generic', at: '2026-11-05T22:30:00Z', seeds: [11, 22, 33], ks: [1, 2, 3] },
  { name: 'phone-dawn', kind: 'world', vp: PHONE, mobile: true, persona: 'generic', at: '2026-11-05T06:30:00Z', seeds: [44, 55, 66], ks: [1, 2, 3] },
  { name: 'laptop-sunset-split', kind: 'world', vp: DESK, persona: 'nvidia', at: '2026-11-05T17:30:00Z', seeds: [77, 88, 99], ks: [1, 2] },
  { name: 'phone-dusk-reduced', kind: 'world', vp: PHONE, mobile: true, persona: 'generic', reduced: true, at: '2026-11-05T19:30:00Z', seeds: [12, 34, 56], ks: [1, 2] },
  { name: 'still-nowebgl-laptop', kind: 'still', vp: DESK, at: '2026-11-05T10:30:00Z', seeds: [1], nowebgl: true, shard: 3 },
  { name: 'still-nowebgl-phone', kind: 'still', vp: PHONE, mobile: true, at: '2026-11-05T14:30:00Z', seeds: [1], nowebgl: true, shard: 3 },
  { name: 'still-404-laptop', kind: 'still', vp: DESK, at: '2026-11-05T22:30:00Z', seeds: [1], path: 'no-such-page', shard: 3 },
  { name: 'still-404-phone', kind: 'still', vp: PHONE, mobile: true, at: '2026-11-05T06:30:00Z', seeds: [1], path: 'no-such-page', shard: 3 },
];
const mine = CASES.filter((c, i) => (c.shard !== undefined ? c.shard % SHARDS : i % SHARDS) === SHARD).filter((c) => !A.only || c.kind === A.only || c.name === A.only);   // (--only still|world|NAME: by hand)

const REC_V = 1;
const MODE = A.cache || (A['base-rec'] ? 'use' : 'off');
if (!['use', 'verify', 'off'].includes(MODE)) throw new Error('--cache use|verify|off, not ' + MODE);
let baseRec = null;
if (A['base-rec'] && MODE !== 'off' && fs.existsSync(A['base-rec'])) {
  try { baseRec = JSON.parse(fs.readFileSync(A['base-rec'], 'utf8')); if (baseRec.v !== REC_V) baseRec = null; } catch { baseRec = null; }
}
const recs = { base: { v: REC_V, cases: {} }, head: { v: REC_V, cases: {} } };   // (what this run rendered, per arm)

const t0 = Date.now();
const S = { base: await serve(A.base), head: await serve(A.head) };
const res = { shard: SHARD, shards: SHARDS, dom_only: DOM_ONLY, cases: [], frames_identical: true, null_ok: true, problems: [], cache: { mode: MODE, base_rec: !!baseRec } };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const save = (name, dataUrl) => fs.writeFileSync(path.join(OUT, name), Buffer.from(dataUrl.split(',')[1], 'base64'));

// One browser per arm: a browser's WebGL runs in its one GPU process, which would draw the arms one after another.
async function open(build, c) {
  const browser = await H.launch();
  const arm = await H.openPage(browser, S[build].url + (c.path || ''), { vp: c.vp, mobile: !!c.mobile, persona: c.persona || 'generic', epoch: T(c.at), seeds: c.seeds, nowebgl: !!c.nowebgl, reducedMotion: c.reduced ? 'reduce' : 'no-preference' });
  arm.build = build; arm.browser = browser; return arm;
}

async function worldCase(c, withNull) {
  const names = ['base', 'head'].concat(withNull ? ['null'] : []);
  const arms = await Promise.all(names.map((n) => open(n === 'null' ? 'base' : n, c).then((a) => (a.name = n, a))));
  await Promise.all(arms.map((a) => H.stepToShow(a)));
  const out = { name: c.name, kind: c.kind, shownAt: Object.fromEntries(arms.map((a) => [a.name, a.shownAt])), samples: [] };
  const rec = { base: { shownAt: out.shownAt.base, samples: {} }, head: { shownAt: out.shownAt.head, samples: {} } };
  if (arms.some((a) => a.shownAt < 0)) {
    out.error = 'never shown: ' + arms.filter((a) => a.shownAt < 0).map((a) => a.name).join(', ');
    if (arms.find((a) => a.name === 'base').shownAt < 0 || (withNull && arms.find((a) => a.name === 'null').shownAt < 0)) res.null_ok = false;
    else res.frames_identical = false;   // the head no longer shows the world: a change anyone would see
  } else {
    for (const K of c.ks) {
      const live = arms.filter((a) => a.name !== 'null' || K === c.ks[0]);   // the null arm checks the first sample only
      await Promise.all(live.map((a) => H.step(a, a.shownAt + K - a.frames)));
      const cap = Object.fromEntries(await Promise.all(live.map(async (a) => [a.name, await H.capture(a)])));
      const s = { k: K, frame: { base: cap.base.frame, head: cap.head.frame }, dom: { base: cap.base.dom, head: cap.head.dom }, mean: { base: cap.base.mean, head: cap.head.mean } };
      s.same = (DOM_ONLY || cap.base.frame === cap.head.frame) && cap.base.dom === cap.head.dom;
      for (const n of ['base', 'head']) rec[n].samples[K] = { frame: cap[n].frame, dom: cap[n].dom, mean: cap[n].mean };
      if (cap.null) { s.null_same = (DOM_ONLY || cap.null.frame === cap.base.frame) && cap.null.dom === cap.base.dom; if (!s.null_same) res.null_ok = false; }
      if (!s.same) {
        res.frames_identical = false;
        const base = arms.find((a) => a.name === 'base'), head = arms.find((a) => a.name === 'head');
        const pb = await H.capture(base, { pixels: true }), ph = await H.capture(head, { pixels: true });
        if (pb.png && ph.png) {
          const tag = `${c.name}_k${K}`; save(tag + '_base.png', pb.png); save(tag + '_head.png', ph.png);
          if (pb.w === ph.w && pb.h === ph.h) { const d = await H.diffPng(base.page, pb.rgba, ph.rgba, pb.w, pb.h); save(tag + '_diff.png', d.png); s.changed_px = d.changed; }
          else s.changed_px = 'size ' + pb.w + 'x' + pb.h + ' -> ' + ph.w + 'x' + ph.h;
        }
        if (cap.base.dom !== cap.head.dom) s.root = { base: cap.base.root, head: cap.head.root };
      }
      out.samples.push(s);
    }
  }
  for (const a of arms) out[a.name + '_csp'] = (await a.page.evaluate(() => window.__ci.csp)).concat(a.logs.filter((l) => /Content Security Policy/.test(l)));
  out.errors = Object.fromEntries(arms.map((a) => [a.name, a.logs.filter((l) => !/Content Security Policy/.test(l))]));
  await Promise.all(arms.map((a) => a.browser.close()));
  if (!out.error) for (const n of ['base', 'head']) recs[n].cases[c.name] = Object.assign(rec[n], { errors: out.errors[n], csp: out[n + '_csp'] });
  return out;
}

// The base from its record: the head alone, stepped and captured as in worldCase. null when anything differs (the
// caller then renders the case fresh), so only a case whose head matches the record in every sample is reported from it.
async function cachedWorldCase(c, b) {
  const head = await open('head', c); head.name = 'head';
  await H.stepToShow(head);
  const out = { name: c.name, kind: c.kind, shownAt: { base: b.shownAt, head: head.shownAt }, samples: [] };
  const hrec = { shownAt: head.shownAt, samples: {} };
  let ok = head.shownAt >= 0 && b.shownAt >= 0;
  for (const K of ok ? c.ks : []) {
    await H.step(head, head.shownAt + K - head.frames);
    const cap = await H.capture(head), bs = b.samples && b.samples[K];
    hrec.samples[K] = { frame: cap.frame, dom: cap.dom, mean: cap.mean };
    if (!bs || (!DOM_ONLY && bs.frame !== cap.frame) || bs.dom !== cap.dom) { ok = false; break; }
    out.samples.push({ k: K, frame: { base: bs.frame, head: cap.frame }, dom: { base: bs.dom, head: cap.dom }, mean: { base: bs.mean, head: cap.mean }, same: true });
  }
  out.base_csp = b.csp || []; out.head_csp = (await head.page.evaluate(() => window.__ci.csp)).concat(head.logs.filter((l) => /Content Security Policy/.test(l)));
  out.errors = { base: b.errors || [], head: head.logs.filter((l) => !/Content Security Policy/.test(l)) };
  await head.browser.close();
  if (!ok) return null;
  recs.head.cases[c.name] = Object.assign(hrec, { errors: out.errors.head, csp: out.head_csp });
  return out;
}

async function stillCase(c) {
  const arms = await Promise.all(['base', 'head', 'null'].map((n) => open(n === 'null' ? 'base' : n, c).then((a) => (a.name = n, a))));
  for (const a of arms) await H.step(a, 3);
  const r = {};
  for (const a of arms) {
    const cap = await H.capture(a);
    const shot = await a.page.screenshot({ animations: 'disabled', caret: 'hide' });
    r[a.name] = { dom: cap.dom, shot: sha(shot), png: shot, root: cap.root, csp: cap.csp.concat(a.logs.filter((l) => /Content Security Policy/.test(l))) };
  }
  const out = { name: c.name, kind: c.kind, samples: [{ k: 0, dom: { base: r.base.dom, head: r.head.dom }, shot: { base: r.base.shot, head: r.head.shot } }] };
  const s = out.samples[0];
  s.same = r.base.dom === r.head.dom && r.base.shot === r.head.shot;
  s.null_same = r.null.dom === r.base.dom && r.null.shot === r.base.shot; if (!s.null_same) { res.null_ok = false; s.null_what = (r.null.dom !== r.base.dom ? 'dom ' : '') + (r.null.shot !== r.base.shot ? 'screenshot' : ''); }
  if (!s.same) { res.frames_identical = false; fs.writeFileSync(path.join(OUT, c.name + '_base.png'), r.base.png); fs.writeFileSync(path.join(OUT, c.name + '_head.png'), r.head.png); s.root = { base: r.base.root, head: r.head.root }; }
  out.base_csp = r.base.csp; out.head_csp = r.head.csp; out.errors = Object.fromEntries(arms.map((a) => [a.name, a.logs.filter((l) => !/Content Security Policy/.test(l))]));
  await Promise.all(arms.map((a) => a.browser.close()));
  for (const n of ['base', 'head']) recs[n].cases[c.name] = { dom: r[n].dom, shot: r[n].shot, errors: out.errors[n], csp: r[n].csp };
  return out;
}

async function cachedStillCase(c, b) {
  const a = await open('head', c); a.name = 'head';
  await H.step(a, 3);
  const cap = await H.capture(a);
  const shot = sha(await a.page.screenshot({ animations: 'disabled', caret: 'hide' }));
  const csp = cap.csp.concat(a.logs.filter((l) => /Content Security Policy/.test(l)));
  const errors = { base: b.errors || [], head: a.logs.filter((l) => !/Content Security Policy/.test(l)) };
  await a.browser.close();
  if (b.dom !== cap.dom || b.shot !== shot) return null;
  recs.head.cases[c.name] = { dom: cap.dom, shot, errors: errors.head, csp };
  return { name: c.name, kind: c.kind, samples: [{ k: 0, dom: { base: b.dom, head: cap.dom }, shot: { base: b.shot, head: shot }, same: true }], base_csp: b.csp || [], head_csp: csp, errors };
}

// The fields a record must reproduce (--cache verify): everything T1 compares or reports from the base. Not shownAt:
// the frame an arm first shows on varies run to run (11 or 52 for one build), which is why every arm is sampled at
// its own show + K; the frames there are the same bytes.
const recKey = (r) => JSON.stringify(r && (r.samples ? { samples: r.samples, errors: r.errors, csp: r.csp } : { dom: r.dom, shot: r.shot, errors: r.errors, csp: r.csp }));

let nulled = false;
for (const c of mine) {
  const tc = Date.now();
  const b = baseRec && baseRec.cases[c.name];
  let r = null;
  if (MODE === 'use' && b) r = c.kind === 'world' ? await cachedWorldCase(c, b) : await cachedStillCase(c, b);
  if (r) r.cache = 'cached base';
  else {
    r = c.kind === 'world' ? await worldCase(c, !nulled) : await stillCase(c);
    if (c.kind === 'world') nulled = true;
    r.cache = MODE === 'off' ? 'off' : !b ? 'no record: fresh' : MODE === 'use' ? 'record differs: rendered fresh' : 'fresh, verifying';
    if (MODE === 'verify' && b) {
      r.rec_identical = recKey(b) === recKey(recs.base.cases[c.name]);
      if (!r.rec_identical) res.problems.push(`${c.name}: the cached base record is not the fresh render's`);
    }
  }
  res.cache[c.name] = r.cache + (r.rec_identical === undefined ? '' : r.rec_identical ? ', record identical' : ', RECORD DIFFERS');
  r.seconds = (Date.now() - tc) / 1000;
  if (r.head_csp && r.head_csp.length) res.problems.push(`${c.name}: CSP violation in the head: ${r.head_csp.join('; ')}`);
  const fresh = (r.errors.head || []).filter((e) => !(r.errors.base || []).includes(e));
  if (fresh.length) res.problems.push(`${c.name}: page errors in the head only: ${fresh.join('; ')}`);
  if (r.error) res.problems.push(`${c.name}: ${r.error}`);
  res.cases.push(r);
  console.log(`${c.name} [${res.cache[c.name]}]: ${r.samples.map((s) => `+${s.k} ${s.same ? 'same' : 'DIFFERENT'}${s.null_same === false ? ' (NULL TEST FAILED)' : ''}`).join(', ') || r.error} (${r.seconds.toFixed(1)} s${r.shownAt ? ', shown at ' + JSON.stringify(r.shownAt) : ''})`);
}
await S.base.close(); await S.head.close();
res.seconds = (Date.now() - t0) / 1000;
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(res, null, 1));
// A record is saved only whole (every case of the shard) and from a run whose null test held.
for (const n of ['base', 'head']) {
  const f = A['save-' + n + '-rec'];
  if (f && res.null_ok && mine.every((c) => recs[n].cases[c.name])) { fs.mkdirSync(path.dirname(path.resolve(f)), { recursive: true }); fs.writeFileSync(f, JSON.stringify(recs[n])); console.log(`${n} record saved: ${f}`); }
}

const md = [`### T1 shard ${SHARD + 1}/${SHARDS}: frames ${res.frames_identical ? 'identical' : '**changed**'}${res.null_ok ? '' : ', **null test failed**'} (${res.seconds.toFixed(0)} s; base record: ${MODE}${baseRec ? ', found' : ', none'})`, '',
  '| case | base | sample | base | head | same | null |', '|---|---|---|---|---|---|---|'];
for (const c of res.cases) for (const s of c.samples) md.push(`| ${c.name} | ${c.cache} | +${s.k} | \`${(s.frame || s.shot).base.slice(0, 10)}\` | \`${(s.frame || s.shot).head.slice(0, 10)}\` | ${s.same ? 'yes' : '**no**' + (s.changed_px !== undefined ? ` (${s.changed_px} px)` : '')} | ${s.null_same === undefined ? '' : s.null_same ? 'yes' : '**no**'} |`);
for (const p of res.problems) md.push('', '- ' + p);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
console.log(md.join('\n'));
console.log(`frames_identical=${res.frames_identical} null_ok=${res.null_ok} problems=${res.problems.length} (${res.seconds.toFixed(1)} s)`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `frames_identical=${res.frames_identical}\n`);
if (!res.null_ok) console.log('::error::T1: the null test failed (the harness did not reproduce the base against itself)');
for (const p of res.problems) console.log('::error::' + p);
process.exit(!res.null_ok || res.problems.length ? 1 : 0);
