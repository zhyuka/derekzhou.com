# The world's CI rules: run from the repository's root by .github/workflows/validate.yml ("The world's rules"), or
# locally: python3 .github/workflows/world_rules.py [root]. Exit 1 on any failure.
# Each rule prints OK or the files and lines that break it.
#   1  Rocket Loader: every <script> with a src in index.html and 404.html carries data-cfasync="false" (the JSON-LD
#      block is data, not script), so Rocket Loader leaves the scripts as served, in their order.
#   2  Worker targets: every target of `new Worker(` and `importScripts(` in the world's files exists and has an
#      immutable cache block in _headers (the world starts none today).
#   3  Production blind: every home-scope CSP block in _headers (/, /index.html, /404.html) and 404.html's meta CSP
#      say connect-src 'none', and the site carries none of the world's development pages (its diagnostics, control
#      and lab pages: diag.js, control.*, lab80.*, never shipped).
#   4  The world's absences: in world*.v*.js, realm-kit.v*.js, realm-*.v*.js and inkbirds.v*.js: no DOM
#      building; no URL hook, storage or sound; no module, worker, fetch, XHR or Blob but a named worker (rule 2);
#      entropy exactly once in world*.v*.js together, above its INIT-END marker, none in the realm, kit and ink birds'
#      files; no Date, Math.random or randomUUID; performance.now( exactly once in world*.v*.js, inside function
#      clockNow, none elsewhere; listeners only in world*.v*.js and only of the named kinds, exactly one
#      addEventListener('pointermove' with its one removeEventListener (event names in either quotes, every
#      listener's name a literal, no on* handler property in any of the world's files).
#   5  The script order: index.html loads birds.v*.js first, then world, the kit, the realms, the ink birds last, all
#      deferred.
#   6  The realm lint's report is a separate step (node lint_realms.js); the realms predate its API v4, so it reports.
#   7  Nothing darkens, and nothing is done to the world for the words (the owner's rule; the words' lift is
#      gone): no realm or kit file names the ink birds' keep-off (uInkKeep); the ink birds' file names it only to take
#      their own ink off the words' ground (its sampler's declaration and the one line that multiplies the ink's
#      visibility down), which can only leave a pixel lighter; in world*.v*.js the lift's parts (liftWords, LIB_LIFT,
#      uLiftOn, uVeil*, uLinkCore, worldToe, TOE_*, LIFT_FEATHER, VEILK, veilFor) are named nowhere, uInkKeep only in
#      the samplers' unit table, and the composite (FS_COMP) names no words input and declares only its fixed list
#      of uniforms. W7's unit test is its own step (w7_unit.js: the composite's tail is the encode and the dither, every
#      code the reference's, never lower and never higher; --mutate proves it catches a lift, a darkening, a panel).
#   7b Nothing is drawn onto the canvas after the composite but what is named (a panel planted in a pass of its own
#      after the composite would pass rule 7 and W7's unit test): the world's programs are a
#      fixed list (a new pass is a deliberate change here); every place the world targets the default framebuffer
#      (useTarget(null ...), bindFramebuffer(... null)) and then draws within its block names the composite or the blit
#      on that line (render, represent), or is the ink birds' target (the bird host's target()); no 2D canvas, Path2D,
#      Range or OffscreenCanvas in world*.v*.js (the words' glyphs drawn into a field). CI does not render the page:
#      the render check (the canvas read with the words' machinery on and off at the same instant, channel by channel:
#      the W7 twin runs) is part of verifying a change to the world before it ships (CLAUDE.md, Verify).
import json, os, re, sys
root = sys.argv[1] if len(sys.argv) > 1 else '.'
R = lambda *p: os.path.join(root, *p)
fails = []
def fail(rule, msg): fails.append(f'{rule}: {msg}')
def read(p):
    try: return open(R(p), encoding='utf-8').read()
    except FileNotFoundError: return None
html = {p: read(p) for p in ('index.html', '404.html')}
headers = read('_headers') or ''
files = sorted(os.listdir(root))
world = [f for f in files if re.fullmatch(r'world[\w-]*\.v\d+\.js', f)]
kit = [f for f in files if re.fullmatch(r'realm-kit\.v\d+\.js', f)]
realms = [f for f in files if re.fullmatch(r'realm-(?!kit)[\w]+\.v\d+\.js', f)]
ink = [f for f in files if re.fullmatch(r'inkbirds\.v\d+\.js', f)]
gen = [f for f in files if re.fullmatch(r'gen\.v\d+\.js', f)]
src = {f: read(f) for f in world + kit + realms + ink + gen}

# 1 Rocket Loader
for p, s in html.items():
    if s is None: continue
    for m in re.finditer(r'<script\b[^>]*>', s):
        tag = m.group(0)
        if 'src=' in tag and 'data-cfasync="false"' not in tag:
            fail('1 rocket-loader', f'{p}: {tag}')

# 2 worker targets
def cache_block(name): return re.search(r'(?m)^/' + re.escape(name) + r'\n\s+Cache-Control: public, max-age=31536000, immutable', headers) is not None
for f, s in src.items():
    for m in re.finditer(r'(new Worker|importScripts)\(\s*([^)]*)\)', s or ''):
        targets = re.findall(r"""['"]/?([\w.\-/]+\.js)['"]""", m.group(2))
        if not targets: fail('2 worker-targets', f'{f}: {m.group(0)[:80]} names no literal file'); continue
        for t in targets:
            if not os.path.exists(R(t)): fail('2 worker-targets', f'{f}: {t} does not exist')
            if not cache_block(t): fail('2 worker-targets', f'{f}: /{t} has no immutable cache block in _headers')
    if f in world + kit + realms + ink and 'importScripts(' in (s or ''): fail('2 worker-targets', f'{f}: importScripts( in a page script (a worker file only)')
nw = sum((s or '').count('new Worker(') for f, s in src.items() if f in world)
if nw > 1: fail('2 worker-targets', f'world*.v*.js: {nw} new Worker( (at most one, by its literal file name)')

# 3 production blind
blocks = {}
cur = None
for line in headers.splitlines():
    if line and not line[0].isspace() and not line.startswith('#'): cur = line.strip(); blocks.setdefault(cur, [])
    elif cur and line.strip(): blocks[cur].append(line.strip())
for path in ('/', '/index.html', '/404.html'):
    csp = [l for l in blocks.get(path, []) if l.startswith('Content-Security-Policy:')]
    if not csp: fail('3 production-blind', f'_headers {path}: no Content-Security-Policy'); continue
    for l in csp:
        if "connect-src 'none'" not in l: fail('3 production-blind', f"_headers {path}: CSP without connect-src 'none': {l[:120]}")
if '/*' in blocks and any(l.startswith('Content-Security-Policy') for l in blocks['/*']): fail('3 production-blind', '_headers: a CSP on /* (it would combine with every page\'s)')
meta = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', html.get('404.html') or '')
if not meta or "connect-src 'none'" not in meta.group(1): fail('3 production-blind', "404.html: meta CSP without connect-src 'none'")
for p in tuple(f for f in files if re.fullmatch(r'(diag\.v\d+\.js|diag\.js|control\.html|control\.js|lab80\.html|lab80\.js)', f)):
    if os.path.exists(R(p)): fail('3 production-blind', f'{p} is in the site (a development page: never shipped)')

# 4 the world's absences
def lines(s, pat): return [(i + 1, l.strip()[:100]) for i, l in enumerate((s or '').split('\n')) if re.search(pat, l)]
def strip_comments(s):
    s = re.sub(r'/\*[\s\S]*?\*/', lambda m: '\n' * m.group(0).count('\n'), s or '')
    return re.sub(r'(?m)(^|[^:\'"\\])//.*$', r'\1', s)
ALLOWED = {'pointerdown', 'pointerup', 'pointercancel', 'pointermove', 'click', 'touchend', 'dragstart', 'deviceorientation', 'resize', 'scroll', 'change', 'webglcontextlost', 'webglcontextrestored', 'load'}
for f in world + kit + realms + ink:
    s = src[f] or ''; c = strip_comments(s)
    for pat, what in [(r'createElement|innerHTML|appendChild|insertAdjacentHTML|document\.write', 'DOM building'),
                      (r'location\.(search|hash|href)|URLSearchParams|localStorage|sessionStorage|indexedDB|document\.cookie', 'a URL hook or storage'),
                      (r'new Audio\(|AudioContext|speechSynthesis', 'sound'),
                      (r'\bimport\(|\bBlob\(|\bfetch\(|XMLHttpRequest', 'a module, blob or network call'),
                      (r'Math\.random|\bDate\b|randomUUID', 'Math.random or a clock (Date)')]:
        for ln, t in lines(c, pat): fail('4 absences', f'{f}:{ln} {what}: {t}')
    if f not in world and 'getRandomValues' in c: fail('4 absences', f'{f}: entropy outside world*.v*.js')
    if f not in world:
        for ln, t in lines(c, r'performance\.now\('): fail('4 absences', f'{f}:{ln} performance.now( outside world*.v*.js')
        for ln, t in lines(c, r'addEventListener\('): fail('4 absences', f'{f}:{ln} a listener outside world*.v*.js')
gr = sum(strip_comments(src[f]).count('getRandomValues(') for f in world)
if world and gr != 1: fail('4 absences', f'world*.v*.js: getRandomValues( {gr} times (exactly once)')
for f in world:
    s = src[f] or ''; c = strip_comments(s)
    m = re.search(r'---- INIT-END:', s)
    if not m: fail('4 absences', f'{f}: INIT-END marker missing')
    elif 'getRandomValues(' in strip_comments(s[m.end():]): fail('4 absences', f'{f}: entropy below INIT-END')
    pn = c.count('performance.now(')
    if pn != 1: fail('4 absences', f'{f}: performance.now( {pn} times (exactly once, in clockNow)')
    elif not re.search(r'function clockNow\(\)\s*\{\s*return performance\.now\(\);\s*\}', c): fail('4 absences', f'{f}: performance.now( is not inside function clockNow')
    for m2 in re.finditer(r"""addEventListener\(\s*['"]([\w]+)['"]""", c):
        if m2.group(1) not in ALLOWED: fail('4 absences', f"{f}: a listener of a kind not in the named list (ALLOWED): '{m2.group(1)}'")
    for ln, t in lines(c, r"""addEventListener\(\s*[^'"\s]"""): fail('4 absences', f'{f}:{ln} a listener whose kind is not a literal: {t}')
    am, rm = len(re.findall(r"""addEventListener\(\s*['"]pointermove['"]""", c)), len(re.findall(r"""removeEventListener\(\s*['"]pointermove['"]""", c))
    if am != 1 or rm != 1: fail('4 absences', f'{f}: pointermove added {am} and removed {rm} times (exactly one each)')
    for ln, t in lines(c, r"""addEventListener\(\s*['"](mousemove|mouseleave|mouseout|mouseover|mouseenter|keydown|keyup|keypress|blur|focusout|beforeunload|unload|pagehide|visibilitychange)['"]|document\.title"""): fail('4 absences', f'{f}:{ln} a hover, key, blur, exit, idle or title handler: {t}')
for f in world + kit + realms + ink:
    for ln, t in lines(strip_comments(src[f]), r'\.on[a-z]+\s*=(?!=)'): fail('4 absences', f'{f}:{ln} an on* handler property (listeners are added by name, in world*.v*.js only): {t}')

# 7 nothing darkens, and nothing is done to the world for the words (the lift is gone, the owner's word of
# 2026-10-21): the composite takes no words input at all (no mask, keep-off, words' box, floor, gain or toe), its
# uniforms are a fixed list (a new one is a deliberate change here), and the lift's parts are named nowhere; the ink
# birds alone read the keep-off (uInkKeep), only to take their own ink off the words' ground
LIFT_PARTS = r'\b(liftWords|LIB_LIFT|uLiftOn|uVeil\w*|uLinkCore|worldToe|TOE_F|TOE_Y1|TOE_TINT|LIFT_FEATHER|VEILK|veilFor)\b|LIFT-BEGIN'
WORDS_IN = r'\b(uMask\w*|uInkKeep|uKeep\w*|uWords|uLift\w*On|uVeil\w*|uLinkCore|uFloor\w*|mk|mk4|liftWords|worldToe)\b'
COMP_UNIFORMS = {'uScene', 'uCloud', 'uBloom', 'uShaft', 'uLinD', 'uDepth', 'uSceneH', 'uHVP', 'uHC', 'uStb', 'uLay', 'uSc', 'uClS', 'uBlK', 'uShK', 'uShC', 'uLift', 'uGain', 'uOut', 'uPVP', 'uPCam', 'uSSR', 'uMi',
                 'uCeil'}   # (the time of day: the light ceiling on the skies with light words, the world's own light, the same everywhere on the window: no words input)
for f in kit + realms:
    for ln, t in lines(strip_comments(src[f]), r'\b(uMask|uInkKeep)\b'): fail('7 never-darker', f'{f}:{ln} names the words\' keep-off: {t}')
for f in ink:
    for i, l in enumerate(strip_comments(src[f]).split('\n')):
        if not re.search(r'\b(uMask|uInkKeep)\b', l): continue
        l = l.strip()
        if not (re.match(r'uniform sampler2D\b[^;]*;$', l) or re.search(r'texture\(uInkKeep, [^;]*;\s*vis \*= 1\.0 - smoothstep\(', l)): fail('7 never-darker', f'{f}:{i + 1} names the words\' keep-off beyond taking its own ink off the words: {l[:100]}')
for f in world:
    c = strip_comments(src[f])
    for i, l in enumerate(c.split('\n')):
        t = l.strip()
        m = re.search(LIFT_PARTS, t)
        if m: fail('7 never-darker', f'{f}:{i + 1} names the lift\'s part {m.group(0)} (the lift is gone): {t[:100]}')
        if re.search(r'\b(uMask|uInkKeep)\b', t) and not t.startswith('var UNITS = {'):
            fail('7 never-darker', f'{f}:{i + 1} names the keep-off uniform beyond the samplers\' unit table (the ink birds\' alone): {t[:100]}')
    cm = re.search(r'var FS_COMP = [^`]*`([\s\S]*?)`;', src[f] or '')
    if cm:
        body = strip_comments(cm.group(1))
        for i, l in enumerate(body.split('\n')):
            m = re.search(WORDS_IN, l)
            if m: fail('7 never-darker', f'{f}: FS_COMP names a words input ({m.group(0)}): {l.strip()[:100]}')
        un = set()
        for d in re.findall(r'uniform\s+[\w]+\s+([^;]+);', body):
            for v in d.split(','): un.add(v.strip().split('[')[0])
        extra = sorted(un - COMP_UNIFORMS)
        if extra: fail('7 never-darker', f'{f}: FS_COMP has uniforms beyond its fixed list: {extra} (a words input? if not, add it to COMP_UNIFORMS deliberately)')
        if '// W7-TAIL-BEGIN' not in cm.group(1) or '// W7-TAIL-END' not in cm.group(1): fail('7 never-darker', f'{f}: FS_COMP lacks its W7-TAIL markers (the unit test runs what lies between them)')
    elif 'FS_COMP' in (src[f] or ''): fail('7 never-darker', f'{f}: FS_COMP not found as one template (rule 7 cannot read it)')

# 7b nothing drawn onto the canvas after the composite but what is named
PROGRAMS = {'sky', 'depth', 'inkkeep', 'pre', 'down', 'up', 'smask', 'sblur', 'comp', 'blit', 'vdens', 'vlight', 'vbody', 'occ', 'creature', 'glow', 'beam', 'cacc'}
DRAWS = r'\b(dc|drawArrays|drawElements|drawArraysInstanced|drawElementsInstanced|drawRangeElements|blitFramebuffer)\s*\('
for f in world:
    c = strip_comments(src[f]); L = c.split('\n')
    names = set(re.findall(r"\[\s*'(\w+)'\s*,\s*VS_\w+\s*,\s*FS_\w+\s*\]", c))
    if not names: fail('7b canvas-last', f'{f}: the program table was not found (rule 7b cannot read it)')
    extra = sorted(names - PROGRAMS)
    if extra: fail('7b canvas-last', f'{f}: programs beyond the fixed list: {extra} (a new pass: add it to PROGRAMS deliberately, after the twin runs)')
    for ln, t in lines(c, r'\b(OffscreenCanvas|Path2D|createRange)\b|getContext\(\s*[\'"]2d|CanvasRenderingContext2D'): fail('7b canvas-last', f'{f}:{ln} a 2D canvas, path or range in the world (the words drawn into a field?): {t}')
    for i, l in enumerate(L):
        for m in re.finditer(r'useTarget\(\s*null\b|bindFramebuffer\(\s*gl\.(DRAW_)?FRAMEBUFFER\s*,\s*null\s*\)', l):
            seg = [l[m.end():]]
            for l2 in L[i + 1:i + 14]:
                if re.search(r'\bfunction\b|bindFramebuffer\(|useTarget\(|^\s*\}\s*,?\s*$|^\s*\w+\s*:\s*function', l2): break
                seg.append(l2)
            seg = '\n'.join(seg)
            if not re.search(DRAWS, seg): continue
            if re.search(r'P\s*=\s*EP\.(comp|blit)\b', l[m.end():m.end() + 60]): continue
            if re.search(r'target\s*:\s*function\s*\(\s*\)\s*\{\s*$', l[:m.start()].rstrip() + ' {') or re.search(r'\btarget\s*:\s*function\s*\(\s*\)\s*\{\s*gl\.bindFramebuffer', l): continue
            fail('7b canvas-last', f'{f}:{i + 1} draws onto the canvas with a program not named (the composite, the blit, the ink birds\' target): {l.strip()[:100]}')

# 5 the script order
s = html.get('index.html') or ''
order = re.findall(r'<script\b[^>]*src="/?([^"]+)"[^>]*>', s)
deferred = [x for x in re.findall(r'<script\b[^>]*>', s) if 'defer' in x]
names = [re.search(r'src="/?([^"]+)"', x).group(1) for x in deferred if 'src=' in x]
def kind(n):
    for k, p in (('birds', r'birds\.v\d+\.js'), ('world', r'world[\w-]*\.v\d+\.js'), ('kit', r'realm-kit\.v\d+\.js'), ('realm', r'realm-\w+\.v\d+\.js'), ('ink', r'inkbirds\.v\d+\.js'), ('diag', r'diag\.v\d+\.js')):
        if re.fullmatch(p, n): return k
    return 'other'
ks = [kind(n) for n in names if kind(n) != 'diag']
if world:
    want = ['birds', 'world', 'kit'] + ['realm'] * ks.count('realm') + ['ink']
    if ks != want: fail('5 script-order', f'index.html deferred scripts {names}: want birds, world, kit, the realms, the ink birds last')

print('\n'.join(fails) if fails else 'world rules OK (' + ', '.join(f'{len(x)} {n}' for n, x in (('world', world), ('kit', kit), ('realm', realms), ('ink birds', ink), ('worker', gen))) + ')')
sys.exit(1 if fails else 0)
