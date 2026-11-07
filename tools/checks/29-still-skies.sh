#!/usr/bin/env bash
# check: Still skies keep the words legible
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
cd build/site
# The stylesheet's still skies (no WebGL2, no script, the moment
# before the world is drawn, a device too slow for it) must hold
# their words' colours against the whole gradient, wherever a window
# puts the words: the text colour (the lettered name, the line, the
# links) and the dimmed grey (the credit) 4.5:1, the focus ring 3:1
# (WCAG 1.4.3, 1.4.11). Two families: the hour's still skies (the
# 404 page, which has no canvas) and the world's (the home page:
# :has(canvas.sky)), the world's twice, each sky exactly once in
# each: as the camera of a window narrower than 6:5 draws it, and
# inside @media (min-aspect-ratio: 6/5), the query the world's
# camera reads (its wideWin; checked here too).
CSS=style.css; WORLD=world.js
python3 - "$CSS" "$WORLD" <<'EOF'
import re, sys
css = re.sub(r'/\*.*?\*/', '', open(sys.argv[1]).read(), flags=re.S)
def lin(v): v /= 255; return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
def rgb(h): h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]
def Y(c): r, g, b = [lin(x) for x in c]; return 0.2126 * r + 0.7152 * g + 0.0722 * b
def ratio(a, b): a, b = Y(a), Y(b); return (max(a, b) + .05) / (min(a, b) + .05)
WIDE = '@media (min-aspect-ratio: 6/5)'
def blocks(s):   # the stylesheet's top level: (the at-rule's head or None, the rules in it)
    out, i = [], 0
    while True:
        j = s.find('{', i)
        if j < 0: return out
        head = s[i:j].strip()
        if head.startswith('@'):
            d, k = 1, j + 1
            while d: d += {'{': 1, '}': -1}.get(s[k], 0); k += 1
            out.append((re.sub(r'\s+', ' ', head), re.findall(r'([^{}]+)\{([^{}]*)\}', s[j + 1:k - 1]))); i = k
        else:
            k = s.index('}', j); out.append((None, [(head, s[j + 1:k])])); i = k + 1
B = blocks(css)
rules = [r for q, rs in B if q is None for r in rs]   # outside every at-rule: the tokens and the base skies
wide = [r for q, rs in B if q == WIDE for r in rs]    # the world's on a window 6:5 or wider
def tokens(name, world):
    out = {}
    for sel, body in rules:
        sels = [x.strip() for x in sel.split(',')]
        mine = [':root', ':root[data-sky="%s"]' % name] + ([':root[data-sky="%s"]:has(canvas.sky)' % name] if world else [])
        if any(s in sels for s in mine) or (name == 'day' and not world and ':root:not([data-sky])' in sels):
            out.update(dict(re.findall(r'(--color-[a-z]+):\s*(#[0-9a-fA-F]{6})', body)))
    return out
def gradients(name, world, rs):   # every rule in rs whose selector list names the family's sky
    sel = (':root[data-sky="%s"]:has(canvas.sky) body' % name) if world else ('body' if name == 'day' else ':root[data-sky="%s"] body' % name)
    out = []
    for s_, body in rs:
        if sel in [x.strip() for x in s_.split(',')]:
            m = re.search(r'linear-gradient\(to bottom, ([^)]*)\)\s*(#[0-9a-fA-F]{6})?', body)
            if m:
                stops = [(float(p.rstrip('%')) / 100, rgb(c)) for c, p in (x.split() for x in m.group(1).split(','))]
                out.append((stops, (rgb(m.group(2)) if m.group(2) else None)))
    return out
fail = 0
if "matchMedia('(min-aspect-ratio: 6/5)')" not in open(sys.argv[2], encoding='utf-8').read():
    print("::error::%s does not read the wide windows' query, %s" % (sys.argv[2], WIDE)); fail = 1
for world in (False, True):
    for name in ['day', 'dawn', 'rain', 'sunset', 'dusk', 'night']:
        t = tokens(name, world)
        sets = [('world' if world else 'hour', gradients(name, world, rules))] + ([('world6:5', gradients(name, world, wide))] if world else [])
        for fam, gs in sets:
            if len(gs) != 1: print('::error::the %s still sky for %s: %d gradients found, exactly one wanted' % (fam, name, len(gs))); fail = 1; continue
            stops, solid = gs[0]
            ground = [solid] if solid else []
            for k in range(201):
                y = k / 200
                for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
                    if p0 <= y <= p1:
                        f = (y - p0) / (p1 - p0) if p1 > p0 else 0
                        ground.append([c0[i] + (c1[i] - c0[i]) * f for i in range(3)])
                        break
            for role, need in [('--color-text', 4.5), ('--color-dimmed', 4.5), ('--color-focus', 3.0)]:
                worst = min(ratio(rgb(t[role]), g) for g in ground)
                print('%-8s %-7s %-15s %5.2f' % (fam, name, role, worst))
                if worst < need:
                    print('::error::%s on the %s %s still sky falls to %.2f:1 (needs %.1f)' % (role, fam, name, worst, need)); fail = 1
# Print is on white over every still sky, the world's too ("Background graphics" on or off): the print
# block, after the still skies in the file, sets white paper with a rule as specific as each family's
# (:root[data-sky] body; :root[data-sky]:has(canvas.sky) body, a rule of its own).
at = css.find('@media print')
if at < 0: print('::error::no print block'); sys.exit(1)
depth, j = 0, css.index('{', at)
for k in range(j, len(css)):
    depth += {'{': 1, '}': -1}.get(css[k], 0)
    if depth == 0: break
block = css[j + 1:k]
if re.search(r'\]\s*(:has\(canvas\.sky\)\s*)?body\s*\{', css[k:]):
    print('::error::a still sky is set after the print block'); fail = 1
for need in (':root[data-sky] body', ':root[data-sky]:has(canvas.sky) body'):
    ok = any(need in [x.strip() for x in sel.split(',')] and re.search(r'background:\s*#fff(fff)?\s*(;|$)', body.strip())
             for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', block))
    print('print  %-40s %s' % (need, 'white' if ok else 'MISSING'))
    if not ok:
        print('::error::print: no white paper for %s (a still sky would print)' % need); fail = 1
sys.exit(fail)
EOF
