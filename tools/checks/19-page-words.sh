#!/usr/bin/env bash
# check: The page says what it says
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
cd build/site
# The words on the page and in its search and share text, exactly:
# the line under the name (in its own span), the credit,
# the two links and the noscript address; the JSON-LD's role.
python3 - <<'PY'
import html as H, json, re, sys
src = open('index.html', encoding='utf-8').read()
LINE = 'Hands-on technology leader in Agentic and Generative AI, Platform Engineering, and Product Development.'
def text(s): return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', s)).replace(' ', ' ').replace('⁠', '')).strip()
fail = 0
def need(ok, what):
    global fail
    if not ok: print('::error::' + what); fail = 1
m = re.search(r'<p class="words"><span>(.*?)</span></p>', src, re.S)
need(m and text(m.group(1)) == LINE, 'the line under the name must read "%s" in <p class="words"><span>' % LINE)
m = re.search(r'<p class="credit">(.*?)</p>', src, re.S)
need(m and text(m.group(1)) == 'Team Lead · Accenture Song · 2022 – Now', 'the credit must read "Team Lead · Accenture Song · 2022 – Now"')
need('<a href="#" id="email-link" aria-label="Send email to Derek Zhou">Email</a>' in src, 'the Email link changed')
need('<a href="https://www.linkedin.com/in/derek-z" rel="me" aria-label="Derek Zhou on LinkedIn">LinkedIn</a>' in src, 'the LinkedIn link changed')
need('<noscript><p class="noscript-email">hello&#64;derekzhou&#46;com</p></noscript>' in src, 'the noscript address changed')
need('<title>Derek Zhou &mdash; Technology Leader</title>' in src, 'the title changed')
need('<meta name="description" content="Derek Zhou is a hands-on technology leader in Agentic and Generative AI, Platform Engineering, and Product Development.">' in src, 'the meta description changed')
for p in ['og:description', 'twitter:description']:
    need(re.search(r'<meta (?:property|name)="%s" content="%s">' % (p, re.escape(LINE)), src), p + ' must be the line')
ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', src, re.S).group(1))
need(ld.get('jobTitle') == 'Team Lead' and ld.get('sameAs') == ['https://www.linkedin.com/in/derek-z'], 'the JSON-LD role or sameAs changed')
print('the words are the page\'s own' if not fail else 'FAILED'); sys.exit(fail)
PY
