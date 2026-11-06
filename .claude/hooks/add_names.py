#!/usr/bin/env python3
# add_names.py: adds banned names to names.json as salted hashes, so the file never names them (RULES.json: naming).
#   python3 .claude/hooks/add_names.py < names.txt      (one name or phrase a line; keep names.txt outside the repo)
# Each name is stored lowercased, its words joined by one space, and also run together ("ab cd" and "abcd"), so a
# name written without its spaces is caught too. Prints how many hashes are new; never prints a name.
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guard import digest, norm, words

p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'names.json')
d = json.load(open(p, encoding='utf-8'))
have = set(d['hashes'])
new = set()
for line in sys.stdin:
    n = norm(line)
    if not n:
        continue
    for form in {n, n.replace(' ', '')}:
        new.add(digest(d['salt'], form))
    d['max_words'] = max(int(d.get('max_words') or 1), len(words(line)))
added = new - have
d['hashes'] = sorted(have | new)
with open(p, 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2)
    f.write('\n')
print(f'{len(added)} new hashes, {len(d["hashes"])} in all; max_words {d["max_words"]}')
