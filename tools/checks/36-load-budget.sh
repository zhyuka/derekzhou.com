#!/usr/bin/env bash
# check: The page loads within its budget
# enforces: load-budget
# (load-perf, 2026-11-07) The plain build (build/site) served on 127.0.0.1 as Cloudflare Pages serves it, the text
# compressed at Brotli 11 as the deploy build stores it, with the 103 Early Hints (tools/loadperf.mjs), loaded cold
# 3 times in headless Chrome under Lighthouse's mobile profile (150 ms RTT, 1.6 Mbps, CPU 4x). It fails when:
#   - a file the page loads is over its budget (its body as sent: Brotli for text, as is for fonts and images), or
#     the page loads a file that has no budget (give it one here), or anything from another origin;
#   - the bytes the first paint waits for (the document, the stylesheet, the hour, both fonts) are over theirs;
#   - every byte the page loads is over the total's;
#   - the first paint waits for anything but its own: a file the browser marks render-blocking other than the
#     stylesheet and the hour (Resource Timing's renderBlockingStatus), or, in any run, the first-paint hold's link
#     (rel=expect, blocking=render) still in the head when the body begins. The profile loads as an Android phone (tools/loadperf.mjs), so
#     hour.js takes the hold out as on a phone, on any machine: on a CI runner (more than 4 cores, 8 GB) the hold once
#     stayed, and the first paint waited for the world's scripts (1,580 ms, main's gate at cd5df2e). Both rules read
#     what the page is, never a clock, so a busy runner cannot move them (load-perf, 2026-11-23: the old wall-clock
#     bar, 1,200 ms, failed six bird PRs that could not move the paint, 1,224-1,968 ms with five gates on one runner,
#     each green on a re-run; and a busy runner paints after the world's scripts arrive, 2,092-2,396 ms against
#     1,482-1,824, since the paint is CPU and the arrival is the link's: so no rule here compares the two);
#   - the first paint (medians of the 3) is later than 4,000 ms: a net for a gross regression only (~580 ms here, up
#     to 2,400 ms on a busy runner, 2026-11-23). Over it, it is measured once more and the earlier median kept.
# Budgets: today's bytes and about a tenth more (at least 1 KB), so ordinary work fits and a regression does not
# (2026-11-07: the stylesheet's 8 KB of notes coming back, a full font, a new unbudgeted script). A deliberate
# growth raises its line here, in the PR that grows it, with the reason. Measure a change in under a minute:
#   node tools/build.mjs --plain build/site && node tools/loadperf.mjs build/site --profiles mobile --runs 3 --cold-only --br 11
# The runner's Chrome, driven by playwright-core (pinned as W7's; PW_CORE and CHROME_PATH name others where set).
# plant: {"file": "build/site/style.css", "find": "Geist-400-500.sub3.woff2", "with": "Geist-Variable.woff2", "why": "the full 69 KB font loaded for the words"}
# plant: {"file": "build/site/index.html", "find": "<script data-cfasync=\"false\" src=\"/hour.js\"></script>", "with": "<script data-cfasync=\"false\" src=\"/hour.js\"></script><script data-cfasync=\"false\" src=\"/world.js\"></script>", "why": "the world's script in the head: the first paint waits for it"}
# plant: {"file": "build/site/hour.js", "find": "hold.remove()", "with": "void 0", "why": "the first-paint hold left on for the phone profile"}
if [ -z "${PW_CORE:-}" ]; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/w7" playwright-core@1.49.1 >/dev/null
  export PW_CORE="$RUNNER_TEMP/w7/node_modules/playwright-core"
fi
node tools/loadperf.mjs build/site --profiles mobile --runs 3 --cold-only --br 11 --json "$RUNNER_TEMP/load.json"
# (a first paint over its budget is measured once more, and the earlier of the two medians kept: a runner busy for a
# moment with the checks beside this one slows a run, it never speeds one)
if node -e "process.exit(require('$RUNNER_TEMP/load.json')['mobile cold'].fcp > 4000 ? 0 : 1)"; then
  node tools/loadperf.mjs build/site --profiles mobile --runs 3 --cold-only --br 11 --json "$RUNNER_TEMP/load2.json"
fi
node - "$RUNNER_TEMP/load.json" "$RUNNER_TEMP/load2.json" <<'JS'
const fs = require('fs');
const m = require(process.argv[2])['mobile cold'];
if (fs.existsSync(process.argv[3])) { const m2 = require(process.argv[3])['mobile cold']; if (m2.fcp < m.fcp) { m.fcp = m2.fcp; m.fcpAll = m2.fcpAll; m.holdAll = m2.holdAll; } }
const K = 1024;
// each file the page loads: its budget in bytes, as sent (by its plain name: the deploy build adds the content hash)
const BUDGET = {
  '/': 6 * K,                      // 4,650 (the document; Cloudflare sends it at about Brotli 4: ~5.6 KB)
  '/style.css': 3 * K,             // 2,151 (served comment-free since #135; 4,995 with its notes)
  '/hour.js': 2 * K,               // 1,262
  '/site.js': 1 * K,               // 134
  '/sound.js': 1.5 * K,            // 614 (1,388 before Brotli) (the sound icon's switch, 2026-11-07). Its sheet of notes,
                                   // /assets/sound/notes-N.mp3, has no line on purpose: it is fetched only at the press, so a cold visit
                                   // that loads it fails here
  '/score.js': 9.5 * K,            // 9,259 (24,985 before Brotli) (the score the switch plays, deferred, low priority, 2026-11-12; its passages the same day; no chord under it, 2026-11-13; its tuning, room and wind, the same day; the night's quiet, 2026-11-16)
  '/assets/fonts/Geist-': 6.5 * K,  // 5,544 (Geist 400-500 cut to the pages' letters, .sub3; any .subN)
  '/assets/fonts/GeistMono-': 5.5 * K,    // 4,556 (the credit row's letters)
  '/world.js': 113 * K,            // 102,463
  '/realm-kit.js': 5 * K,          // 4,114
  '/realm-dunes.js': 12 * K,       // 11,115 (9,190 before the sand physics: the slip face, physics: sand/S1, and the brink rebuilt per fragment, S2, 2026-11-15)
  '/realm-above.js': 4.5 * K,      // 3,406
  '/plan.js': 15 * K,              // 13,268
  '/facetform.js': 3.5 * K,        // 2,301
  '/facetpose.js': 6 * K,          // 5,139
  '/wingmodel.js': 4 * K,          // 2,991
  '/model.js': 6.5 * K,            // 5,502
  '/labbird.js': 13 * K,           // 11,938
  '/birdwing.js': 10.5 * K,        // 9,257
  '/inkbirds.js': 29 * K,          // 29,239 with the turn, the phase lock, the glides and leaving together (#259, #262, #263, #273, the hub's flock physics spec: +1,044 B over main's 28,111; LOAD-PERF's OK up to 30 K once the cuts, #317, land)
  '/assets/favicon.png': 1 * K,    // 390
  '/assets/favicon.svg': 1 * K,    // 156
  // the opening's still (one per visit, by the window's shape; any sky, opening and tier: tools/gpu/bake-stills.js's
  // largest of each shape in the bake of 2026-11-12: 2,304 stills, 57.1 MB). It does not hold the first paint (an image)
  '/assets/still/393x861': 56 * K,     // 53,718
  '/assets/still/393x817': 55 * K,     // 52,317
  '/assets/still/393x770': 53 * K,     // 50,527
  '/assets/still/393x724': 50 * K,     // 47,265
  '/assets/still/393x676': 48 * K,     // 46,058
  '/assets/still/393x629': 47 * K,     // 44,647
  '/assets/still/393x524': 40 * K,     // 38,501
  '/assets/still/1080x1080': 54 * K,   // 51,567
  '/assets/still/1350x1080': 59 * K,   // 56,762
  '/assets/still/1728x1080': 67 * K,   // 64,770
  '/assets/still/1920x1080': 72 * K,   // 69,489
  '/assets/still/2268x1080': 80 * K,   // 77,334
};
const FIRST = 20 * K;   // 18,117 (31,269 before #135's stylesheet and #150's fonts): the document, the stylesheet, the hour and both fonts (the first paint waits for them)
const TOTAL = 315 * K;  // 211,968: everything, cold; + the opening's still, its largest budget (80 K, 2026-11-12)
const PAINT = 4000;     // ms, the first paint's median
const key = (p) => p.startsWith('/assets/fonts/') ? Object.keys(BUDGET).find((k) => k.startsWith('/assets/fonts/') && p.startsWith(k))
  : p.startsWith('/assets/still/') ? p.replace(/^\/assets\/still\/[a-z]+-\d+-(hi|lo)-(\d+x\d+)\.avif$/, '/assets/still/$2') : p;
let fail = 0, first = m.doc.encoded, total = m.doc.encoded;
const err = (s) => { console.log('::error::' + s); fail = 1; };
const row = (p, b, lim) => console.log(`${p.padEnd(44)} ${String(b).padStart(7)} B  budget ${String(Math.round(lim)).padStart(7)} B`);
row('/ (the document)', m.doc.encoded, BUDGET['/']);
if (m.doc.encoded > BUDGET['/']) err(`the document is ${m.doc.encoded} B, over its ${BUDGET['/']} B`);
for (const r of m.res) {
  if (/^[a-z]+:/.test(r.name)) { err(`a file from another origin: ${r.name}`); continue; }
  const k = key(r.name), lim = k && BUDGET[k], body = r.encoded;   // (the body as sent, without its headers)
  if (!lim) { err(`${r.name} (${body} B) is loaded and has no budget: give it one in tools/checks/36-load-budget.sh`); continue; }
  row(r.name, body, lim);
  if (body > lim) err(`${r.name} is ${body} B, over its budget of ${Math.round(lim)} B`);
  total += body;
  if (/\.woff2$/.test(r.name) || r.name === '/style.css' || r.name === '/hour.js') first += body;
}
console.log(`the first paint's bytes ${first} B (budget ${FIRST}), all ${total} B (budget ${TOTAL}), first paint ${Math.round(m.fcp)} ms (runs ${m.fcpAll.join(', ')}; budget ${PAINT})`);
if (first > FIRST) err(`the first paint waits for ${first} B, over its ${FIRST} B`);
if (total > TOTAL) err(`the page loads ${total} B, over its ${TOTAL} B`);
const PAINT_BLOCK = ['/style.css', '/hour.js'];   // what the first paint may wait for (the document aside)
for (const r of m.res) if (r.blocking === 'blocking' && !PAINT_BLOCK.includes(r.name)) err(`${r.name} blocks the first paint (render-blocking; only ${PAINT_BLOCK.join(' and ')} may)`);
(m.holdAll || []).forEach((h, i) => { if (h !== false) err(`run ${i + 1}: the first-paint hold's link (rel=expect, blocking=render) still in the head when the body begins, on the phone profile (or not read: ${h}): the paint waits for the world`); });
if (!m.holdAll || m.holdAll.length !== m.runs) err('the load measure did not report the hold\'s link for every run');
if (!(m.fcp <= PAINT)) err(`the first paint at ${Math.round(m.fcp)} ms, later than ${PAINT} ms (Lighthouse's mobile profile, cold, the median of 3)`);
if (!fail) console.log(`load budget: ${m.res.length + 1} files, ${(total / K).toFixed(1)} KB of ${TOTAL / K}, the first paint's ${(first / K).toFixed(1)} KB of ${FIRST / K}, painted at ${Math.round(m.fcp)} ms of ${PAINT}`);
process.exit(fail);
JS
