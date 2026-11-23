// test/unit/smoke.mjs: the post-deploy smoke tells Cloudflare's bot challenge from the site's own answer
// (.github/ci/cf-challenge.mjs; b4615db, 2026-11-23: / answered 403 to GitHub's runner with Cloudflare's challenge page).
import { test, assert, fs, path, ROOT } from '../unit-lib.mjs';

const { challenged, said } = await import(new URL('../../.github/ci/cf-challenge.mjs', import.meta.url));
const CSP = "default-src 'self'; script-src 'self'";
const H = (o) => new Headers(o);

test('smoke: Cloudflare\'s challenge is told from the site\'s answer', () => {
  assert.equal(challenged({ status: 403, headers: H({ 'cf-mitigated': 'challenge', server: 'cloudflare' }) }, CSP), true, 'cf-mitigated: challenge');
  assert.equal(challenged({ status: 403, headers: H({ server: 'cloudflare', 'cf-ray': '8f00-SJC' }) }, CSP), true, 'a 403 from Cloudflare without the site\'s CSP (b4615db)');
  assert.equal(challenged({ status: 403, headers: { 'cf-mitigated': 'challenge' } }, CSP), true, 'a plain object of headers is read too');
  // the site's own answers: held to the smoke's checks, never excused
  assert.equal(challenged({ status: 200, headers: H({ server: 'cloudflare', 'content-security-policy': CSP }) }, CSP), false, 'the page itself');
  assert.equal(challenged({ status: 200, headers: H({ server: 'cloudflare' }) }, CSP), false, 'a 200 with the CSP missing is the site\'s fault: it fails');
  assert.equal(challenged({ status: 403, headers: H({ server: 'cloudflare', 'content-security-policy': CSP }) }, CSP), false, 'a 403 carrying the site\'s CSP is the site\'s');
  assert.equal(challenged({ status: 500, headers: H({ server: 'cloudflare' }) }, CSP), false, 'a 500 is a failure, not a challenge');
  assert.equal(challenged({ status: 404, headers: H({ server: 'cloudflare' }) }, CSP), false);
  assert.equal(challenged({ status: 403, headers: H({ server: 'nginx' }) }, CSP), false, 'a 403 from anything but Cloudflare');
  assert.equal(challenged({ status: 403, headers: H({ server: 'cloudflare', 'cf-mitigated': 'block' }) }, CSP), true, 'a Cloudflare 403 with no CSP, whatever its marker, is not the site');
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
  const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/post-deploy.yml'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(yml, /- name: Open an issue\n\s+if: failure\(\)/, 'the issue opens on a failure only');
});
