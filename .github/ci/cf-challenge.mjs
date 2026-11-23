// cf-challenge.mjs: was a request of the smoke (smoke.mjs) answered by Cloudflare's bot challenge, not by the site?
// Cloudflare may challenge a GitHub runner's datacenter IP (b4615db and a72acc9, 2026-11-23: / answered 403 to the
// runner, while the same URL from elsewhere answered 200 with the site's CSP). Then the site was never asked, and the
// smoke can't tell how it answers. A challenge is only:
//   - cf-mitigated: challenge (Cloudflare marks every challenge page so, and "challenge" is its one value:
//     developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/detect-response); or
//   - a 403 from server: cloudflare, without _headers' CSP, whose body is Cloudflare's challenge page (its
//     /cdn-cgi/challenge-platform/ script), in case the marker is ever missing.
// A WAF block, an Access denial or an edge error is NOT a challenge: a visitor meets it too, and the smoke fails on it.
//   r: { status, headers, body } (headers a fetch Headers or a plain object of lower-case names; body a Buffer or string)
//   csp: _headers' CSP for the path
const hd = (r, k) => String((typeof r.headers.get === 'function' ? r.headers.get(k) : r.headers[k]) || '');
export function challenged(r, csp) {
  if (!r || !r.headers) return false;
  if (hd(r, 'cf-mitigated').trim().toLowerCase() === 'challenge') return true;
  return r.status === 403 && /^cloudflare$/i.test(hd(r, 'server').trim()) && (!csp || hd(r, 'content-security-policy') !== csp)
    && /\/cdn-cgi\/challenge-platform\//.test(String(r.body || ''));
}

// what the answer said, for the report: Cloudflare's markers
export function said(r) {
  return [['cf-mitigated', hd(r, 'cf-mitigated')], ['server', hd(r, 'server')], ['cf-ray', hd(r, 'cf-ray')]].filter(([, v]) => v).map(([k, v]) => k + ': ' + v).join(', ') || 'no Cloudflare marker';
}
