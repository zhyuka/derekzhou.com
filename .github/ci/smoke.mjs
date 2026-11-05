// smoke.mjs: the live site after a deploy. Waits (up to --timeout seconds) for the origin to serve this commit, then
// checks it as a visitor's browser would find it. Node built-ins only (fetch).
//   node .github/ci/smoke.mjs --url https://derekzhou.com --site site --sha SHA [--timeout 600] [--out smoke.json]
// Served = /build.txt names the commit (once the build writes one), or else every non-HTML file of site/ is served
// byte for byte and the home page references every file the commit's index.html does (Cloudflare rewrites HTML, so
// HTML is not compared byte for byte). Then: every file the pages reference answers 200 (immutable, but the HTML);
// the home page's CSP is _headers' own, with HSTS; an unknown path is the 404 page with status 404; the repository's
// own files are not served (/CLAUDE.md, /%43LAUDE.md, /.github/..., the font scripts); the private paths go to the
// Access sign-in (302 to *.cloudflareaccess.com, or 401/403), never 200. Exit 1 on any failure.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseHeaders, headersFor } from './serve.mjs';

const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const URL0 = (A.url || 'https://derekzhou.com').replace(/\/$/, ''), SITE = A.site || 'site', SHA = A.sha || '', TIMEOUT = +(A.timeout || 600);
const PRIVATE = (A.private || '/studio/,/studio').split(',');
const NOT_SERVED = ['/CLAUDE.md', '/%43LAUDE.md', '/.github/workflows/validate.yml', '/subset-fonts.sh', '/download-fonts.sh', '/package.json', '/src/world.v8.js', '/tools/minify.mjs'];
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const get = async (p, opt = {}) => { const r = await fetch(URL0 + p, { redirect: 'manual', headers: { 'cache-control': 'no-cache', 'user-agent': 'derekzhou.com-post-deploy-smoke' }, ...opt }); return { status: r.status, headers: r.headers, body: Buffer.from(await r.arrayBuffer()) }; };
const refsOf = (html) => [...new Set([...html.matchAll(/(?:href|src)="(\/[^"#?]+)"/g)].map((m) => m[1]))];
const files = fs.readdirSync(SITE, { recursive: true }).map(String).filter((f) => fs.statSync(path.join(SITE, f)).isFile() && !path.basename(f).startsWith('_'));

async function served() {
  const bt = await get('/build.txt').catch(() => null);
  if (bt && bt.status === 200 && /^[0-9a-f]{40}\s*$/.test(bt.body.toString())) return bt.body.toString().trim() === SHA ? 'build.txt' : null;
  for (const f of files) {
    if (f.endsWith('.html')) continue;
    const r = await get('/' + f.split(path.sep).join('/')), mine = fs.readFileSync(path.join(SITE, f));
    if (r.status !== 200) return null;
    if (f === 'robots.txt') { if (!r.body.toString().includes(mine.toString().trim())) return null; continue; }   // (Cloudflare's managed robots.txt adds its own lines)
    if (sha256(r.body) !== sha256(mine)) return null;
  }
  const home = (await get('/')).body.toString(), want = refsOf(fs.readFileSync(path.join(SITE, 'index.html'), 'utf8'));
  return want.every((r) => home.includes('"' + r + '"')) ? 'bytes' : null;
}

const t0 = Date.now(); let how = null;
while (!(how = await served().catch(() => null))) {
  if ((Date.now() - t0) / 1000 > TIMEOUT) break;
  console.log(`not served yet (${((Date.now() - t0) / 1000).toFixed(0)} s)`); await new Promise((r) => setTimeout(r, 15000));
}
const fail = [], ok = [];
const check = (cond, msg) => (cond ? ok : fail).push(msg);
check(!!how, how ? `this commit is served (${how}, after ${((Date.now() - t0) / 1000).toFixed(0)} s)` : `this commit was not served within ${TIMEOUT} s`);

const rules = parseHeaders(fs.readFileSync(path.join(SITE, '_headers'), 'utf8'));
const want = (p, name) => headersFor(rules, p).filter(([k]) => k.toLowerCase() === name.toLowerCase()).map(([, v]) => v);
const home = await get('/');
check(home.status === 200, `/ answers ${home.status}`);
const csp = home.headers.get('content-security-policy') || '';
check(csp && csp === want('/', 'Content-Security-Policy').join(', '), `/'s CSP is _headers' own${csp ? '' : ' (none served)'}`);
check(/max-age=\d+/.test(home.headers.get('strict-transport-security') || ''), `/ has HSTS`);
const notFound = await get('/no-such-page-' + Date.now());
check(notFound.status === 404 && notFound.body.toString().includes('404'), `an unknown path is the 404 page with status ${notFound.status}`);
const refs = new Set([...refsOf(home.body.toString()), ...refsOf((await get('/404.html')).body.toString())]);
for (const r of refs) {
  const x = await get(r);
  const imm = /immutable/.test(x.headers.get('cache-control') || '');
  check(x.status === 200 && (r.endsWith('.html') || imm), `${r}: ${x.status}${imm ? ', immutable' : ', NOT immutable'}`);
}
for (const p of NOT_SERVED) { const x = await get(p); check(x.status === 404, `${p} not served (${x.status})`); }
for (const p of PRIVATE) {
  const x = await get(p), loc = x.headers.get('location') || '';
  check((x.status === 302 && /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com\//.test(loc)) || [401, 403].includes(x.status), `${p} behind Access (${x.status}${loc ? ' -> ' + loc.split('?')[0] : ''})`);
}
const report = { url: URL0, sha: SHA, served: how, ok, fail };
if (A.out) fs.writeFileSync(A.out, JSON.stringify(report, null, 1));
for (const m of ok) console.log('ok   ' + m); for (const m of fail) console.log('FAIL ' + m);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Live smoke: ${fail.length ? '**failed**' : 'passed'}\n\n` + fail.map((m) => `- **${m}**\n`).join('') + ok.map((m) => `- ${m}\n`).join(''));
process.exit(fail.length ? 1 : 0);
