// a real flight in the page (SwiftShader, the gate's harness): n steps flown at once by the scratch hook, ground and cells synchronous
import fs from 'node:fs';
import path from 'node:path';
const H = await import('/home/user/derekzhou.com/.github/ci/harness.mjs');
const { serve } = await import('/home/user/derekzhou.com/.github/ci/serve.mjs');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const srv = await serve(path.resolve(A.build));
const t0 = Date.now();
const browser = await H.launch();
const arm = await H.openPage(browser, srv.url, { vp: [320, 200, 1], persona: 'generic', epoch: Date.parse(A.at || '2026-11-05T03:30:00Z'), seeds: [+(A.seed || 11), 22, 33] });
const s = await H.stepToShow(arm, 4000);
console.log('shown', s, ((Date.now() - t0) / 1000).toFixed(1) + 's', arm.logs.slice(0, 2));
const out = [];
const chunks = +(A.chunks || 10), per = +(A.per || 600);
for (let c = 0; c < chunks; c++) {
  const r = await arm.page.evaluate(([n]) => window.__fly(n, 1), [per]);
  if (!r) { console.log('no flight'); break; }
  out.push(...r);
  const L = r[r.length - 1];
  console.log('chunk', c, 't', L[0], 'fixG', L[13], 'fixO', L[14], 'cells', L[18], ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
fs.writeFileSync(A.out || 'trace.json', JSON.stringify(out));
await browser.close(); srv.close && srv.close(); process.exit(0);
