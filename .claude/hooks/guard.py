#!/usr/bin/env python3
# guard.py: the project's PreToolUse hook (.claude/settings.json). It stops, before they run, the few mistakes that
# cannot be taken back here (RULES.json: merge-rights, git-safety, naming):
#   - a push to main, a force push (-f, --force*, a +refspec, --mirror) or a push that deletes a branch (--delete, :ref)
#   - a merge: `gh pr merge` (--auto too), `gh api .../pulls/N/merge`, a GraphQL mergePullRequest or
#     enablePullRequestAutoMerge, the GitHub tools' merge_pull_request and enable_pr_auto_merge,
#     and a GitHub tool that writes straight to main
#   - a banned name (names.json, salted hashes) in a commit's message or diff, in what a push sends, or in what a
#     GitHub tool posts
# CI runs it as `python3 .claude/hooks/guard.py --scan`: every tracked file (names.json aside) checked for a banned
# name; exit 1 on one, and on a names.json it cannot read (CI fails closed; the hook fails open).
# CI also runs `python3 .claude/hooks/guard.py --messages` (tools/checks/44-names-in-messages.sh): every commit message
# from main to HEAD, and the PR's title and body (from the Actions event file), checked against the same list, so a
# named commit is caught before the merge bot can fast-forward it onto main. --selftest-messages proves it first.
# It fails open: any error of its own (a parse it cannot make, git missing, a timeout) lets the call through, so a broken
# hook never stops a session. Exit 2 blocks (its stderr is the reason); anything else allows.
# Test: python3 .claude/hooks/test_guard.py
import hashlib, json, os, re, shlex, signal, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SEP = {'&&', '||', ';', '|', '&', '(', ')', '\n', ';;', '|&'}
WRAP = {'sudo', 'env', 'command', 'time', 'nice', 'nohup', 'exec', 'xargs', 'timeout'}


class Block(Exception):
    pass


# --- banned names -------------------------------------------------------------------------------------------------
_names = None
def names():
    global _names
    if _names is None:
        try:
            d = json.load(open(os.path.join(HERE, 'names.json'), encoding='utf-8'))
            _names = (d['salt'], set(d.get('hashes') or ()), max(1, int(d.get('max_words') or 1)))
        except Exception:
            _names = ('', set(), 1)
    return _names

def words(text):
    return re.findall(r'[^\W_]+', text.lower())

def norm(name):
    return ' '.join(words(name))

def digest(salt, phrase):
    return hashlib.sha256((salt + phrase).encode('utf-8')).hexdigest()

def banned_in(text):
    """The first banned phrase's hash prefix found in text, or None."""
    salt, hashes, n = names()
    if not hashes or not text:
        return None
    w = words(text)
    seen = set()
    for k in range(1, n + 1):
        for i in range(len(w) - k + 1):
            p = ' '.join(w[i:i + k])
            if p in seen:
                continue
            seen.add(p)
            h = digest(salt, p)
            if h in hashes:
                return h[:12]
    return None

def check_text(text, where):
    h = banned_in(text)
    if h:
        raise Block(f'a banned name (names.json {h}...) is in {where}. RULES.json "naming": it never goes into the repo, '
                    'a commit or a PR. Reword it; the hash is shown, not the name, on purpose.')

def added_lines(diff):
    """Added lines of a unified diff, by file: [(file, line text)]."""
    out, f = [], '?'
    for l in diff.splitlines():
        if l.startswith('+++ '):
            f = l[6:] if l.startswith('+++ b/') else l[4:]
        elif l.startswith('+') and not l.startswith('+++'):
            out.append((f, l[1:]))
    return out

def check_diff(diff, where):
    if not names()[1]:
        return
    by = {}
    for f, l in added_lines(diff):
        by.setdefault(f, []).append(l)
    for f, ls in by.items():
        check_text('\n'.join(ls), f'{where}, {f}')


# --- git ------------------------------------------------------------------------------------------------------------
def git(cwd, *args):
    r = subprocess.run(['git', '-C', cwd, *args], capture_output=True, text=True, timeout=6)
    return r.stdout if r.returncode == 0 else ''

def git_parts(toks):
    """(cwd change, subcommand, args) for a git command's tokens after `git`."""
    i, cdir = 0, None
    while i < len(toks) and toks[i].startswith('-'):
        t = toks[i]
        if t in ('-C', '-c', '--git-dir', '--work-tree', '--namespace'):
            if t == '-C' and i + 1 < len(toks):
                cdir = toks[i + 1]
            i += 2
        else:
            i += 1
    if i >= len(toks):
        return cdir, None, []
    return cdir, toks[i], toks[i + 1:]

PUSH_VAL = {'-o', '--push-option', '--repo', '--receive-pack', '--exec'}
MAIN = {'main', 'refs/heads/main', 'heads/main'}

def check_push(args, cwd):
    pos, i = [], 0
    while i < len(args):
        a = args[i]
        if a in PUSH_VAL:
            i += 2
            continue
        if a.startswith('--'):
            o = a.split('=', 1)[0]
            if o in ('--force', '--force-with-lease', '--force-if-includes', '--mirror'):
                raise Block(f'`git push {o}`: no force pushes (RULES.json "git-safety"). Push a new commit instead.')
            if o in ('--delete', '--prune'):
                raise Block(f'`git push {o}`: never delete remote branches (RULES.json "git-safety").')
            if o == '--all':
                raise Block('`git push --all` would push main (RULES.json "merge-rights"). Push your branch by name.')
        elif a.startswith('-') and len(a) > 1:
            if 'f' in a[1:]:
                raise Block('`git push -f`: no force pushes (RULES.json "git-safety"). Push a new commit instead.')
            if 'd' in a[1:]:
                raise Block('`git push -d`: never delete remote branches (RULES.json "git-safety").')
        else:
            pos.append(a)
        i += 1
    refs = pos[1:]
    for r in refs:
        if r.startswith('+'):
            raise Block(f'`git push {r}`: a + refspec is a force push (RULES.json "git-safety").')
        if r.startswith(':'):
            raise Block(f'`git push {r}` deletes a remote branch (RULES.json "git-safety").')
        dst = r.split(':', 1)[1] if ':' in r else r
        if dst in MAIN or (dst in ('HEAD', '@') and git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD').strip() == 'main'):
            raise Block('a push to main: changes reach main only through a PR, merged by the owner or the merge bot '
                        '(RULES.json "merge-rights"). Push a claude/* branch and open a PR.')
    if not refs and git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD').strip() == 'main':
        raise Block('`git push` from main pushes main (RULES.json "merge-rights"). Make a branch, push that.')
    if names()[1]:
        base = git(cwd, 'merge-base', 'origin/main', 'HEAD').strip()
        if base:
            check_text(git(cwd, 'log', '--format=%B', f'{base}..HEAD'), 'a commit message this push sends')
            check_diff(git(cwd, 'diff', '-U0', '--no-color', '--no-ext-diff', base, 'HEAD'), 'what this push sends')

def check_commit(args, cwd, adds_first):
    if not names()[1]:
        return
    for i, a in enumerate(args):
        f = None
        if a in ('-F', '--file') and i + 1 < len(args):
            f = args[i + 1]
        elif a.startswith('--file='):
            f = a[7:]
        if f and f != '-':
            try:
                check_text(open(os.path.join(cwd, f), encoding='utf-8', errors='replace').read(), f'the message file {f}')
            except (OSError, ValueError):
                pass
    every = adds_first or any(a in ('-a', '--all') or (re.fullmatch(r'-[a-zA-Z]*a[a-zA-Z]*', a) and not a.startswith('--')) for a in args)
    check_diff(git(cwd, 'diff', '--cached', '-U0', '--no-color', '--no-ext-diff'), 'the staged diff')
    if every:
        check_diff(git(cwd, 'diff', 'HEAD', '-U0', '--no-color', '--no-ext-diff'), 'the changes this commit takes')


# --- the shell ------------------------------------------------------------------------------------------------------
HEREDOC = re.compile(r'<<-?[ \t]*([\'"]?)([A-Za-z_][A-Za-z0-9_]*)\1')

def flatten(cmd):
    """The command with each heredoc's body left out and each unquoted newline made a `;`."""
    out, i, q, n, ends = [], 0, None, len(cmd), []
    while i < n:
        c = cmd[i]
        if q:
            if c == '\\' and q == '"' and i + 1 < n:
                out.append(cmd[i:i + 2]); i += 2; continue
            if c == q:
                q = None
            out.append(c); i += 1; continue
        if c == '\\' and i + 1 < n:
            out.append(cmd[i:i + 2]); i += 2; continue
        if c in '\'"':
            q = c; out.append(c); i += 1; continue
        m = HEREDOC.match(cmd, i) if c == '<' else None
        if m:
            ends.append(m.group(2)); out.append(' '); i += m.end(); continue
        if c == '\n':
            out.append(' ; '); i += 1
            while ends:
                end = ends.pop(0)
                m = re.compile(r'^[ \t]*' + re.escape(end) + r'[ \t]*$', re.M).search(cmd, i)
                i = m.end() if m else n
            continue
        out.append(c); i += 1
    return ''.join(out)

def segments(cmd):
    lx = shlex.shlex(flatten(cmd), posix=True, punctuation_chars=True)
    lx.whitespace_split = True
    lx.commenters = ''
    seg, out = [], []
    for t in lx:
        if t in SEP or set(t) <= set('&|;()'):
            if seg:
                out.append(seg)
            seg = []
        else:
            seg.append(t)
    if seg:
        out.append(seg)
    return out

def strip_wrappers(toks):
    i = 0
    while i < len(toks):
        t = toks[i]
        if re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*=.*', t) or t in WRAP:
            i += 1
        elif t.startswith('-') and i > 0 and toks[i - 1] in WRAP:
            i += 1
        else:
            break
    return toks[i:]

def check_bash(cmd, cwd, depth=0):
    if depth == 0 and names()[1] and re.search(r'\bgit\b[\s\S]*\bcommit\b', cmd):
        check_text(cmd, 'the commit command (its message)')
    try:
        segs = segments(cmd)
    except ValueError:
        return check_raw(cmd, cwd)
    adds = False
    for seg in segs:
        toks = strip_wrappers(seg)
        if not toks:
            continue
        prog = os.path.basename(toks[0])
        if prog in ('bash', 'sh', 'zsh', 'dash') and '-c' in toks and depth < 3:
            j = toks.index('-c')
            if j + 1 < len(toks):
                check_bash(toks[j + 1], cwd, depth + 1)
            continue
        if prog == 'cd' and len(toks) > 1:
            cwd = os.path.join(cwd, os.path.expanduser(toks[1]))
            continue
        if prog == 'gh':
            rest = [t for t in toks[1:] if not t.startswith('-')]
            if rest[:2] == ['pr', 'merge']:
                raise Block('`gh pr merge`: only the owner, or the merge bot when nothing visible changes, merges '
                            '(RULES.json "merge-rights").')
            if rest[:1] == ['api'] and any(re.search(r'pulls/\d+/merge\b', t) for t in toks):
                raise Block('a merge through `gh api`: only the owner or the merge bot merges (RULES.json "merge-rights").')
            if rest[:1] == ['api'] and any(re.search(r'\b(enablePullRequestAutoMerge|mergePullRequest)\b', t) for t in toks):
                raise Block('a merge or auto-merge through `gh api graphql`: auto-merge is the owner\'s own "land it when '
                            'green", never an agent\'s (RULES.json "merge-rights").')
            continue
        if prog != 'git':
            continue
        cdir, sub, args = git_parts(toks[1:])
        here = os.path.join(cwd, cdir) if cdir else cwd
        if sub == 'push':
            check_push(args, here)
        elif sub == 'add':
            adds = True
        elif sub == 'commit':
            check_commit(args, here, adds)

def check_raw(cmd, cwd):
    """For a command the shell parser cannot read (an unclosed quote): the plain patterns."""
    for part in re.split(r'&&|\|\||[;|\n]', cmd):
        if re.search(r'\bgit\b.*\bpush\b', part):
            if re.search(r'--force|--mirror|--delete|\s-[a-zA-Z]*[fd]\b|\s\+\S|\bmain\b', part):
                raise Block('a push to main, a force push or a branch deletion (RULES.json "git-safety", "merge-rights").')
        if re.search(r'\bgh\b.*\bpr\s+merge\b', part):
            raise Block('`gh pr merge`: only the owner or the merge bot merges (RULES.json "merge-rights").')


# --- the GitHub tools -----------------------------------------------------------------------------------------------
def strings(v):
    if isinstance(v, str):
        yield v
    elif isinstance(v, dict):
        for x in v.values():
            yield from strings(x)
    elif isinstance(v, list):
        for x in v:
            yield from strings(x)

def check_tool(name, inp):
    op = name.rsplit('__', 1)[-1]
    if op in ('merge_pull_request', 'enable_pr_auto_merge'):
        raise Block(f'{op}: only the owner, or the merge bot when nothing visible changes, merges (RULES.json "merge-rights").')
    if op in ('push_files', 'create_or_update_file', 'delete_file') and str(inp.get('branch', '')) in MAIN:
        raise Block(f'{op} on main: changes reach main only through a PR (RULES.json "merge-rights").')
    check_text('\n'.join(strings(inp)), f'what {op} would post')


def main():
    try:
        signal.signal(signal.SIGALRM, lambda *a: (_ for _ in ()).throw(TimeoutError()))
        signal.alarm(8)
    except Exception:
        pass
    try:
        ev = json.load(sys.stdin)
        name = ev.get('tool_name') or ''
        inp = ev.get('tool_input') or {}
        cwd = ev.get('cwd') or os.getcwd()
        if name == 'Bash':
            check_bash(str(inp.get('command') or ''), cwd)
        elif name.startswith('mcp__'):
            check_tool(name, inp)
    except Block as b:
        print(f'Blocked by .claude/hooks/guard.py: {b}', file=sys.stderr)
        sys.exit(2)
    except BaseException as e:  # fail open: a hook that breaks never stops the session
        if isinstance(e, SystemExit):
            raise
        print(f'guard.py: skipped its checks ({type(e).__name__}: {e}); the call goes ahead', file=sys.stderr)
    sys.exit(0)


def scan(root='.'):
    """CI: every tracked text file checked for a banned name. Exit 1 on a hit or an unreadable names.json."""
    try:
        d = json.load(open(os.path.join(HERE, 'names.json'), encoding='utf-8'))
        assert isinstance(d['salt'], str) and isinstance(d['hashes'], list)
    except Exception as e:
        print(f'::error::.claude/hooks/names.json cannot be read ({type(e).__name__}: {e})')
        return 1
    if not d['hashes']:
        print('names: the list is empty (nothing to scan for)')
        return 0
    files = subprocess.run(['git', '-C', root, 'ls-files', '-z'], capture_output=True, text=True, check=True).stdout.split('\0')
    bad = 0
    for f in filter(None, files):
        p = os.path.join(root, f)
        if f.endswith('.claude/hooks/names.json') or not os.path.isfile(p) or os.path.getsize(p) > 4_000_000:
            continue
        b = open(p, 'rb').read()
        if b'\0' in b[:8192]:
            continue
        h = banned_in(f + '\n' + b.decode('utf-8', 'replace'))
        if h:
            print(f'::error::{f}: a banned name (names.json {h}...). RULES.json "naming"')
            bad = 1
    print('names: no tracked file holds a banned name' if not bad else 'names: banned names found')
    return bad


def messages(root='.', base=None, event=None):
    """CI: each commit message in base..HEAD (base: the merge base with origin/main) and the PR's title and body (the
    Actions event file) checked for a banned name. Exit 1 on a hit, or on a names.json it cannot read."""
    try:
        salt, hashes, _ = names()
        assert isinstance(salt, str) and salt
    except Exception as e:
        print(f'::error::.claude/hooks/names.json cannot be read ({type(e).__name__}: {e})')
        return 1
    if not hashes:
        print('messages: the list is empty (nothing to scan for)')
        return 0
    g = lambda *a: subprocess.run(['git', '-C', root, *a], capture_output=True, text=True)
    if base is None:
        r = g('merge-base', 'HEAD', 'origin/main')
        base = r.stdout.strip() if r.returncode == 0 else ''
    texts = []
    if base:
        log = g('log', '--format=%H%x00%B%x01', f'{base}..HEAD').stdout
        for rec in filter(None, (x.strip() for x in log.split('\x01'))):
            sha, _, body = rec.partition('\0')
            texts.append((f'commit {sha[:10]}\'s message', body))
    ev = event if event is not None else os.environ.get('GITHUB_EVENT_PATH')
    if ev and os.path.isfile(ev):
        pr = (json.load(open(ev, encoding='utf-8')) or {}).get('pull_request') or {}
        texts += [(f'the PR\'s {k}', pr.get(k) or '') for k in ('title', 'body')]
    bad = 0
    for where, text in texts:
        h = banned_in(text)
        if h:
            print(f'::error::{where}: a banned name (names.json {h}...). RULES.json "naming": reword it (a commit: a new '
                  'commit cannot fix it; the branch is cut again without it)')
            bad = 1
    print(f'messages: {len(texts)} checked ({"from " + base[:10] if base else "no range"}), '
          + ('banned names found' if bad else 'no banned name'))
    return bad


def selftest_messages():
    """A planted name must be caught in a commit message, the PR's title and its body; a clean range must pass."""
    global _names
    import tempfile
    keep, salt = _names, 'selftest'
    _names = (salt, {digest(salt, 'zqplanted')}, 1)
    fails = []
    with tempfile.TemporaryDirectory() as d:
        g = lambda *a: subprocess.run(['git', '-C', d, '-c', 'user.name=t', '-c', 'user.email=t@t', *a], capture_output=True, text=True, check=True)
        g('init', '-q', '-b', 'main'); open(os.path.join(d, 'a'), 'w').write('a'); g('add', 'a'); g('commit', '-qm', 'base')
        base = g('rev-parse', 'HEAD').stdout.strip()
        open(os.path.join(d, 'a'), 'w').write('b'); g('commit', '-qam', 'a clean change')
        ev = os.path.join(d, 'event.json')
        def event(title='a title', body='a body'):
            json.dump({'pull_request': {'title': title, 'body': body}}, open(ev, 'w'))
            return ev
        cases = [('a clean range', 0, lambda: messages(d, base, event()))]
        def planted():
            open(os.path.join(d, 'a'), 'w').write('c'); g('commit', '-qam', 'after Zqplanted\'s idea')
            return messages(d, base, event())
        cases += [('the PR title', 1, lambda: messages(d, base, event(title='Zqplanted\'s law'))),
                  ('the PR body', 1, lambda: messages(d, base, event(body='see ZQPLANTED, 1901'))),
                  ('a commit message', 1, planted)]
        import contextlib, io
        for what, want, fn in cases:
            with contextlib.redirect_stdout(io.StringIO()):   # (the planted runs' own ::error:: lines are not CI's)
                got = fn()
            if got != want: fails.append(f'{what}: exit {got}, want {want}')
    _names = keep
    for f in fails: print('::error::--selftest-messages: ' + f)
    print('selftest: ' + ('FAILED' if fails else 'a planted name is caught in a commit message, the PR title and its body; a clean range passes'))
    return 1 if fails else 0


if __name__ == '__main__':
    if '--scan' in sys.argv:
        sys.exit(scan())
    if '--selftest-messages' in sys.argv:
        sys.exit(selftest_messages())
    if '--messages' in sys.argv:
        sys.exit(messages())
    main()
