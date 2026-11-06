# rules_check.py: RULES.json is valid, and every enforcement it claims exists. Run by validate.yml ("The rules are data,
# and the hooks hold") from the repository's root: python3 .github/workflows/rules_check.py
#   - each rule has a unique kebab-case id, an area, a rule, a source (a list of quote/date/via/doc, at least one of
#     them) and enforced_by (a list, at least one entry)
#   - ci-step: a `- name:` of exactly that text in some .github/workflows/*.yml
#   - world-rule: an id world_rules.py fails under (fail('ID', ...))
#   - absence: a numbered block `# (N)` in the step "Absences are enforced"
#   - hook: the file exists, settings.json runs it, and it cites the rule (RULES.json "<id>")
#   - permission-deny: the entry is in .claude/settings.json's permissions.deny
#   - prose: nothing to check (an optional note)
import glob, json, os, re, sys

fails = []
def fail(m): fails.append(m)
try:
    data = json.load(open('RULES.json', encoding='utf-8'))
except Exception as e:
    print(f'::error::RULES.json does not parse: {e}'); sys.exit(1)

steps = set()
absences = set()
for y in glob.glob('.github/workflows/*.yml'):
    t = open(y, encoding='utf-8').read()
    steps |= {m.strip().strip('"\'') for m in re.findall(r'^\s*-\s+name:\s*(.+?)\s*$', t, re.M)}
    m = re.search(r'-\s+name:\s*Absences are enforced\s*\n(.*?)(?=^\s*-\s+name:|\Z)', t, re.S | re.M)
    if m:
        absences |= {int(n) for n in re.findall(r'^\s*#\s*\((\d+)\)', m.group(1), re.M)}
wr = open('.github/workflows/world_rules.py', encoding='utf-8').read()
world = set(re.findall(r"fail\('([^']+)'", wr))
try:
    settings = open('.claude/settings.json', encoding='utf-8').read()
    deny = set(json.loads(settings).get('permissions', {}).get('deny', []))
except Exception as e:
    settings, deny = '', set(); fail(f'.claude/settings.json does not parse: {e}')

rules = data.get('rules')
if not isinstance(rules, list) or not rules:
    fail('RULES.json has no rules list')
    rules = []
seen = set()
for i, r in enumerate(rules):
    rid = r.get('id') if isinstance(r, dict) else None
    at = f'rule {rid or "#" + str(i)}'
    if not isinstance(rid, str) or not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', rid):
        fail(f'{at}: id must be kebab-case'); continue
    if rid in seen: fail(f'{at}: id used twice')
    seen.add(rid)
    for k in ('area', 'rule'):
        if not isinstance(r.get(k), str) or not r[k].strip(): fail(f'{at}: no {k}')
    src = r.get('source')
    if not isinstance(src, list) or not src or not all(isinstance(s, dict) and set(s) <= {'quote', 'date', 'via', 'doc'} and s for s in src):
        fail(f'{at}: source must be a list of {{quote, date, via, doc}}, each with at least one')
    else:
        for s in src:
            if 'date' in s and not re.fullmatch(r'\d{4}-\d{2}-\d{2}', s['date']): fail(f'{at}: date {s["date"]!r} is not YYYY-MM-DD')
    enf = r.get('enforced_by')
    if not isinstance(enf, list) or not enf:
        fail(f'{at}: enforced_by must be a non-empty list'); continue
    for e in enf:
        k = e.get('kind') if isinstance(e, dict) else None
        if k == 'ci-step':
            if e.get('name') not in steps: fail(f'{at}: no CI step is named {e.get("name")!r}')
        elif k == 'world-rule':
            if e.get('id') not in world: fail(f'{at}: world_rules.py has no rule {e.get("id")!r}')
        elif k == 'absence':
            if e.get('number') not in absences: fail(f'{at}: "Absences are enforced" has no block ({e.get("number")})')
        elif k == 'hook':
            f = e.get('file', '')
            if not os.path.isfile(f): fail(f'{at}: hook file {f!r} is missing')
            else:
                if os.path.basename(f) not in settings: fail(f'{at}: .claude/settings.json does not run {f}')
                if f'RULES.json "{rid}"' not in open(f, encoding='utf-8').read(): fail(f'{at}: {f} does not cite RULES.json "{rid}"')
        elif k == 'permission-deny':
            if e.get('rule') not in deny: fail(f'{at}: .claude/settings.json does not deny {e.get("rule")!r}')
        elif k == 'prose':
            pass
        else:
            fail(f'{at}: unknown enforcement kind {k!r}')

for m in fails: print(f'::error::{m}')
if fails: sys.exit(1)
print(f'RULES.json: {len(rules)} rules, every enforcement found')
