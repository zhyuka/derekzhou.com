// test/unit/smoke.mjs: the post-deploy smoke tells Cloudflare's bot challenge from the site's own answer
// (.github/ci/cf-challenge.mjs; b4615db, 2026-11-23: / answered 403 to GitHub's runner with Cloudflare's challenge page).
import { test, assert, fs, path, ROOT } from '../unit-lib.mjs';

const { challenged, said } = await import(new URL('../../.github/ci/cf-challenge.mjs', import.meta.url));
const CSP = "default-src 'self'; script-src 'self'";
const H = (o) => new Headers(o);

test('smoke: Cloudflare\'s challenge is told from the site\'s answer', () => {
  assert.equal(challenged({ status: 403, headers: H({ 'cf-mitigated': 'challenge', server: 'cloudflare' }) }, CSP), true, 'cf-mitigated: challenge');
  const PAGE = '<!DOCTYPE html><title>Just a moment...</title><script src="/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1"></script>';
  assert.equal(challenged({ status: 403, headers: H({ server: 'cloudflare', 'cf-ray': '8f00-SJC' }), body: Buffer.from(PAGE) }, CSP), true, 'Cloudflare\'s challenge page with its marker missing');
  assert.equal(challenged({ status: 403, headers: { 'cf-mitigated': 'challenge' } }, CSP), true, 'a plain object of headers is read too');
  // a visitor meets these too: real failures, never "can't tell"
  assert.equal(challenged({ status: 403, headers: H({ server: 'cloudflare' }), body: 'Sorry, you have been blocked' }, CSP), false, 'a WAF block');
  assert.equal(challenged({ status: 403, headers: H({ server: 'cloudflare', 'cf-mitigated': 'block' }) }, CSP), false, 'cf-mitigated has one challenge value, "challenge"');
  assert.equal(challenged({ status: 403, headers: H({ server: 'cloudflare' }), body: 'Forbidden. Access denied.' }, CSP), false, 'an Access denial or an edge 403');
  // the site's own answers: held to the smoke's checks, never excused
  assert.equal(challenged({ status: 200, headers: H({ server: 'cloudflare', 'content-security-policy': CSP }) }, CSP), false, 'the page itself');
  assert.equal(challenged({ status: 200, headers: H({ server: 'cloudflare' }) }, CSP), false, 'a 200 with the CSP missing is the site\'s fault: it fails');
  assert.equal(challenged({ status: 403, headers: H({ server: 'cloudflare', 'content-security-policy': CSP }) }, CSP), false, 'a 403 carrying the site\'s CSP is the site\'s');
  assert.equal(challenged({ status: 500, headers: H({ server: 'cloudflare' }) }, CSP), false, 'a 500 is a failure, not a challenge');
  assert.equal(challenged({ status: 404, headers: H({ server: 'cloudflare' }) }, CSP), false);
  assert.equal(challenged({ status: 403, headers: H({ server: 'nginx' }) }, CSP), false, 'a 403 from anything but Cloudflare');
  assert.equal(challenged({ status: 403, headers: H({ server: 'cloudflare', 'content-security-policy': CSP }), body: PAGE }, CSP), false, 'the site\'s CSP: the site\'s answer');
  assert.equal(challenged(null, CSP), false);
  assert.match(said({ headers: H({ 'cf-mitigated': 'challenge', server: 'cloudflare', 'cf-ray': 'abc' }) }), /cf-mitigated: challenge, server: cloudflare, cf-ray: abc/);
  assert.equal(said({ headers: H({}) }), 'no Cloudflare marker');
});

test('smoke: a challenged / is asked again, then a warning, never a failure; its checks skipped, the rest strict', () => {
  const src = fs.readFileSync(path.join(ROOT, '.github/ci/smoke.mjs'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(src, /for \(const s of \[15, 30, 60\]\)/, 'three more tries, with backoff');
  assert.match(src, /if \(homeChallenged\) warn\.push\(`\/ challenged by Cloudflare: can't tell/, 'still challenged: a warning');
  assert.match(src, /else \{\n\s+check\(home\.status === 200/, 'not challenged: / is held to 200 and the rest');
  assert.match(src, /process\.exit\(fail\.length \? 1 : 0\)/, 'only a failure fails the job (and so opens the issue)');
  assert.match(src, /if \(challenged\(x\)\) \{ warn\.push\(`\$\{p\} challenged by Cloudflare: can't tell/, 'a challenged private path is not "behind Access"');
  assert.match(src, /else if \(challenged\(notFound\)\) warn\.push/, 'the unknown path: the same classifier');
  assert.match(src, /warn\.length \? `passed, \*\*\$\{warn\.length\} can't tell\*\*`/, 'the summary never says plain "passed" over what it could not check');
  const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/post-deploy.yml'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(yml, /- name: Open an issue\n\s+if: failure\(\)/, 'the issue opens on a failure only');
});

test('smoke: the stored Brotli is what is served, byte for byte, never re-encoded by the zone', async () => {
  const os = await import('node:os'), zlib = await import('node:zlib'), { spawn } = await import('node:child_process');
  const { serve } = await import(new URL('../../.github/ci/serve.mjs', import.meta.url));
  const br = (s, q) => zlib.brotliCompressSync(Buffer.from(s), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: q } });
  const JS = 'var a = 1;\n'.repeat(400), SHA = 'a'.repeat(40);
  const site = (dir, bytes) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '_headers'), '/w.0123abcd.js\n  Cache-Control: public, max-age=31536000, immutable\n  Content-Encoding: br\n');
    fs.writeFileSync(path.join(dir, 'build.txt'), SHA + '\n');
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>t</title><script src="/w.0123abcd.js"></script>');
    fs.writeFileSync(path.join(dir, '404.html'), '<!doctype html><title>404</title><h1>404</h1>');
    fs.writeFileSync(path.join(dir, 'w.0123abcd.js'), bytes);
  };
  const smoke = (url, dir) => new Promise((res) => {
    const c = spawn(process.execPath, [path.join(ROOT, '.github/ci/smoke.mjs'), '--url', url, '--site', dir, '--sha', SHA, '--timeout', '1', '--private', '/x'], { env: { ...process.env, GITHUB_ACTIONS: '', GITHUB_STEP_SUMMARY: '' } });
    let out = ''; c.stdout.on('data', (d) => (out += d)); c.on('close', () => res(out));
  });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-br-')), stored = path.join(tmp, 'stored'), live = path.join(tmp, 'live');
  site(stored, br(JS, 11));
  try {
    site(live, br(JS, 11));   // served as stored
    let s = await serve(live); let out = await smoke(s.url, stored); await s.close();
    assert.match(out, /^ok {3}\/w\.0123abcd\.js: the stored Brotli served as stored \(200, br, \d+ B\)$/m, out);
    site(live, br(JS, 1));   // the zone's re-encoding: the same text, other bytes
    s = await serve(live); out = await smoke(s.url, stored); await s.close();
    assert.match(out, /^FAIL \/w\.0123abcd\.js: the stored Brotli served as stored \(200, br, \d+ B against \d+ B stored\)$/m, out);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const src = fs.readFileSync(path.join(ROOT, '.github/ci/smoke.mjs'), 'utf8');
  assert.match(src, /'accept-encoding': ENC/, 'every request offers br, as a browser does');
});
