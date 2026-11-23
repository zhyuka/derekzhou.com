// cf-challenge.mjs: was a request of the smoke (smoke.mjs) answered by Cloudflare's bot protection, not by the site?
// Cloudflare may challenge a GitHub runner's datacenter IP (b4615db and a72acc9, 2026-11-23: / answered 403 with
// Cloudflare's challenge page, while the same URL from elsewhere answered 200 with the site's CSP). Then the site was
// never asked, and the smoke can't tell how it answers. A challenge is:
//   - cf-mitigated: challenge (Cloudflare's own marker), on any status; or
//   - a 403 from server: cloudflare that does not carry _headers' CSP (every page the site itself serves carries it).
// Anything else is the site's own answer, held to the smoke's checks as it is.
//   r: { status, headers } (headers a fetch Headers, or a plain object of lower-case names); csp: _headers' CSP for the path
export function challenged(r, csp) {
  if (!r || !r.headers) return false;
  const h = (k) => String((typeof r.headers.get === 'function' ? r.headers.get(k) : r.headers[k]) || '');
  if (/\bchallenge\b/i.test(h('cf-mitigated'))) return true;
  return r.status === 403 && /^cloudflare$/i.test(h('server').trim()) && (!csp || h('content-security-policy') !== csp);
}

// what the answer said, for the report: Cloudflare's markers and the body's start
export function said(r) {
  const h = (k) => (typeof r.headers.get === 'function' ? r.headers.get(k) : r.headers[k]);
  return [h('cf-mitigated') && 'cf-mitigated: ' + h('cf-mitigated'), h('server') && 'server: ' + h('server'), h('cf-ray') && 'cf-ray: ' + h('cf-ray')].filter(Boolean).join(', ') || 'no Cloudflare marker';
}
