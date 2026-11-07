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
#   - the first paint (the words and the lettered name; medians of the 3) is later than 1,200 ms (it was ~630 ms
#     here on 2026-11-07: twice that, so a busy runner does not make it flake). The profile loads as an Android phone
#     (tools/loadperf.mjs), so hour.js takes the first-paint hold out as on a phone, on any machine: on a CI runner
#     (more than 4 cores, 8 GB) the hold stayed, and the first paint waited for the world's scripts (1,580 ms, main's
#     gate at cd5df2e). Over the budget, it is measured once more and the earlier median kept.
# Budgets: today's bytes and about a tenth more (at least 1 KB), so ordinary work fits and a regression does not
# (2026-11-07: the stylesheet's 8 KB of notes coming back, a full font, a new unbudgeted script). A deliberate
# growth raises its line here, in the PR that grows it, with the reason. Measure a change in under a minute:
#   node tools/build.mjs --plain build/site && node tools/loadperf.mjs build/site --profiles mobile --runs 3 --cold-only --br 11
# The runner's Chrome, driven by playwright-core (pinned as W7's; PW_CORE and CHROME_PATH name others where set).
# plant: {"file": "build/site/style.css", "find": "Geist-400-500.sub2.woff2", "with": "Geist-Variable.woff2", "why": "the full 69 KB font loaded for the words"}
if [ -z "${PW_CORE:-}" ]; then
  npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/w7" playwright-core@1.49.1 >/dev/null
  export PW_CORE="$RUNNER_TEMP/w7/node_modules/playwright-core"
fi
node tools/loadperf.mjs build/site --profiles mobile --runs 3 --cold-only --br 11 --json "$RUNNER_TEMP/load.json"
# (a first paint over its budget is measured once more, and the earlier of the two medians kept: a runner busy for a
# moment with the checks beside this one slows a run, it never speeds one)
if node -e "process.exit(require('$RUNNER_TEMP/load.json')['mobile cold'].fcp > 1200 ? 0 : 1)"; then
  node tools/loadperf.mjs build/site --profiles mobile --runs 3 --cold-only --br 11 --json "$RUNNER_TEMP/load2.json"
fi
node - "$RUNNER_TEMP/load.json" "$RUNNER_TEMP/load2.json" <<'JS'
const fs = require('fs');
const m = require(process.argv[2])['mobile cold'];
if (fs.existsSync(process.argv[3])) { const m2 = require(process.argv[3])['mobile cold']; if (m2.fcp < m.fcp) { m.fcp = m2.fcp; m.fcpAll = m2.fcpAll; } }
const K = 1024;
// each file the page loads: its budget in bytes, as sent (by its plain name: the deploy build adds the content hash)
const BUDGET = {
  '/': 6 * K,                      // 4,650 (the document; Cloudflare sends it at about Brotli 4: ~5.6 KB)
  '/style.css': 5.5 * K,           // 4,995 (2,151 once #135's comment-free stylesheet lands: lower this then)
  '/hour.js': 2 * K,               // 1,262
  '/site.js': 1 * K,               // 134
  '/assets/fonts/Geist-': 12 * K,  // 10,932 (Geist 400-500; any .subN)
  '/assets/fonts/GeistMono-': 10.5 * K,   // 9,320
  '/world.js': 113 * K,            // 102,463
  '/realm-kit.js': 5 * K,          // 4,114
  '/realm-dunes.js': 10.5 * K,     // 9,190
  '/realm-above.js': 4.5 * K,      // 3,406
  '/plan.js': 15 * K,              // 13,268
  '/facetform.js': 3.5 * K,        // 2,301
  '/facetpose.js': 6 * K,          // 5,139
  '/wingmodel.js': 4 * K,          // 2,991
  '/model.js': 6.5 * K,            // 5,502
  '/labbird.js': 13 * K,           // 11,938
  '/birdwing.js': 10.5 * K,        // 9,257
  '/inkbirds.js': 26.5 * K,        // 24,040
  '/assets/favicon.png': 1 * K,    // 390
  '/assets/favicon.svg': 1 * K,    // 156
};
const FIRST = 34 * K;   // 31,269: the document, the stylesheet, the hour and both fonts (the first paint waits for them)
const TOTAL = 250 * K;  // 226,140: everything, cold
const PAINT = 1200;     // ms, the first paint's median
const key = (p) => p.startsWith('/assets/fonts/') ? Object.keys(BUDGET).find((k) => k.startsWith('/assets/fonts/') && p.startsWith(k)) : p;
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
if (!(m.fcp <= PAINT)) err(`the first paint at ${Math.round(m.fcp)} ms, later than ${PAINT} ms (Lighthouse's mobile profile, cold, the median of 3)`);
if (!fail) console.log(`load budget: ${m.res.length + 1} files, ${(total / K).toFixed(1)} KB of ${TOTAL / K}, the first paint's ${(first / K).toFixed(1)} KB of ${FIRST / K}, painted at ${Math.round(m.fcp)} ms of ${PAINT}`);
process.exit(fail);
JS
