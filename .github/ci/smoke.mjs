// smoke.mjs: the live site after a deploy. Waits (up to --timeout seconds) for the origin to serve this commit, then
// checks it as a visitor's browser would find it. Node built-ins only (fetch).
//   node .github/ci/smoke.mjs --url https://derekzhou.com --site site --sha SHA[,SHA...] [--timeout 600] [--out smoke.json]
// --sha: the commits whose build the live site may serve (post-deploy.yml: main's commits since the newest that touched
// a deploy input, every one of them the same build).
// Served = /build.txt names the commit (once the build writes one), or else every non-HTML file of site/ is served
// byte for byte and the home page references every file the commit's index.html does (Cloudflare rewrites HTML, so
// HTML is not compared byte for byte). Then: every file the pages reference answers 200 (immutable, but the HTML);
// the home page's CSP is _headers' own, with HSTS; an unknown path is the 404 page with status 404; the repository's
// own files are not served (/CLAUDE.md, /%43LAUDE.md, /.github/..., the font scripts); the private paths go to the
// Access sign-in (302 to *.cloudflareaccess.com, or 401/403), never 200. Exit 1 on any failure. A / that Cloudflare's
// bot protection still challenges after 3 tries (cf-challenge.mjs) is a warning, "can't tell", not a failure.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseHeaders, headersFor } from './serve.mjs';
import { challenged, said } from './cf-challenge.mjs';

const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const URL0 = (A.url || 'https://derekzhou.com').replace(/\/$/, ''), SITE = A.site || 'site', SHA = A.sha || '', TIMEOUT = +(A.timeout || 600), SHAS = SHA.split(',').filter(Boolean);
const PRIVATE = (A.private || '/studio/,/studio').split(',');
const NOT_SERVED = ['/CLAUDE.md', '/%43LAUDE.md', '/.gitignore', '/.github/workflows/validate.yml', '/subset-fonts.sh', '/download-fonts.sh', '/package.json', '/src/world.v8.js', '/tools/minify.mjs'];
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const get = async (p, opt = {}) => { const r = await fetch(URL0 + p, { redirect: 'manual', headers: { 'cache-control': 'no-cache', 'user-agent': 'derekzhou.com-post-deploy-smoke' }, ...opt }); return { status: r.status, headers: r.headers, body: Buffer.from(await r.arrayBuffer()) }; };
const refsOf = (html) => [...new Set([...html.matchAll(/(?:href|src)="(\/[^"#?]+)"/g)].map((m) => m[1]))];
const files = fs.readdirSync(SITE, { recursive: true }).map(String).filter((f) => fs.statSync(path.join(SITE, f)).isFile() && !path.basename(f).startsWith('_'));

async function served() {
  const bt = await get('/build.txt').catch(() => null);
  const first = bt && bt.status === 200 ? bt.body.toString().split('\n')[0].trim() : '';   // (line 1 the commit; line 2 the stills' why, tools/build.mjs)
  if (/^[0-9a-f]{40}$/.test(first)) return SHAS.includes(first) ? 'build.txt ' + first.slice(0, 10) : null;
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
const fail = [], ok = [], warn = [];
const check = (cond, msg) => (cond ? ok : fail).push(msg);
check(!!how, how ? `this commit is served (${how}, after ${((Date.now() - t0) / 1000).toFixed(0)} s)` : `this commit was not served within ${TIMEOUT} s`);

const rules = parseHeaders(fs.readFileSync(path.join(SITE, '_headers'), 'utf8'));
const want = (p, name) => headersFor(rules, p).filter(([k]) => k.toLowerCase() === name.toLowerCase()).map(([, v]) => v);
// / challenged by Cloudflare (cf-challenge.mjs: the runner's IP, not the site): asked again 3 times, 15, 30 and 60 s
// apart. Still challenged: a warning that the smoke can't tell, its checks of / and of what / references skipped (the
// challenge page is not the site's), no failure and so no issue. Every other answer of / is held to its checks.
const homeCsp = want('/', 'Content-Security-Policy').join(', ');
let home = await get('/');
for (const s of [15, 30, 60]) {
  if (!challenged(home, homeCsp)) break;
  console.log(`/ challenged by Cloudflare (${home.status}; ${said(home)}): asked again in ${s} s`); await new Promise((r) => setTimeout(r, s * 1000));
  home = await get('/');
}
const homeChallenged = challenged(home, homeCsp);
if (homeChallenged) warn.push(`/ challenged by Cloudflare: can't tell (${home.status}; ${said(home)}; still so after 3 tries over 105 s): / answering 200 with _headers' CSP and HSTS, no start file, and the files / references were not checked`);
else {
  check(home.status === 200, `/ answers ${home.status}`);
  const csp = home.headers.get('content-security-policy') || '';
  check(csp && csp === homeCsp, `/'s CSP is _headers' own${csp ? '' : ' (none served)'}`);
  check(/max-age=\d+/.test(home.headers.get('strict-transport-security') || ''), `/ has HSTS`);
  check(!/\/start[.-][\w.-]*\.js/.test(home.body.toString() + ' ' + (home.headers.get('link') || '')), `/ loads no start file (deleted 2026-11-07), by tag or preload`);
}
const notFound = await get('/no-such-page-' + Date.now());
// Cloudflare's own bot protection may answer a datacenter's request itself (cf-mitigated): then the site was not asked,
// and the check is a warning, not a failure. Any other answer is the site's, and is held to the 404 page.
const why = (x) => [x.headers.get('cf-mitigated') && 'cf-mitigated: ' + x.headers.get('cf-mitigated'), x.headers.get('server') && 'server: ' + x.headers.get('server'), x.headers.get('cf-ray') && 'cf-ray: ' + x.headers.get('cf-ray'), JSON.stringify(x.body.toString().slice(0, 100))].filter(Boolean).join(', ');
if (notFound.status === 404 && notFound.body.toString().includes('404')) ok.push('an unknown path is the 404 page with status 404');
else if (challenged(notFound)) warn.push(`an unknown path challenged by Cloudflare: can't tell (${notFound.status}; ${why(notFound)})`);
else fail.push(`an unknown path is the 404 page with status ${notFound.status} (${why(notFound)})`);
const refs = new Set([...(homeChallenged ? [] : refsOf(home.body.toString())), ...refsOf((await get('/404.html')).body.toString())]);
for (const r of refs) {
  const x = await get(r);
  const imm = /immutable/.test(x.headers.get('cache-control') || '');
  check(x.status === 200 && (r.endsWith('.html') || imm), `${r}: ${x.status}${imm ? ', immutable' : ', NOT immutable'}`);
}
// not served: 404, or site/_redirects sending the spelling home (a 301 to /: Pages' asset-preservation cache still holds
// some of these from before the move into site/, and a redirect is checked before Pages falls back to it)
for (const p of NOT_SERVED) { const x = await get(p), loc = x.headers.get('location') || ''; check(x.status === 404 || (x.status === 301 && loc === '/'), `${p} not served (${x.status}${loc ? ' -> ' + loc : ''})`); }
for (const p of PRIVATE) {
  const x = await get(p), loc = x.headers.get('location') || '';
  if (challenged(x)) { warn.push(`${p} challenged by Cloudflare: can't tell whether it is behind Access (${x.status}; ${said(x)})`); continue; }   // (a challenge's 403 is not Access's)
  check((x.status === 302 && /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com\//.test(loc)) || [401, 403].includes(x.status), `${p} behind Access (${x.status}${loc ? ' -> ' + loc.split('?')[0] : ''})`);
}
const report = { url: URL0, sha: SHA, served: how, ok, warn, fail };
if (A.out) fs.writeFileSync(A.out, JSON.stringify(report, null, 1));
for (const m of ok) console.log('ok   ' + m); for (const m of warn) console.log('WARN ' + m + (process.env.GITHUB_ACTIONS ? '\n::warning::live smoke: ' + m : '')); for (const m of fail) console.log('FAIL ' + m);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Live smoke: ${fail.length ? '**failed**' : warn.length ? `passed, **${warn.length} can't tell**` : 'passed'}\n\n` + fail.map((m) => `- **${m}**\n`).join('') + warn.map((m) => `- warning: ${m}\n`).join('') + ok.map((m) => `- ${m}\n`).join(''));
process.exit(fail.length ? 1 : 0);
