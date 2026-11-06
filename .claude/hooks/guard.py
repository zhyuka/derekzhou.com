#!/usr/bin/env python3
# guard.py: the project's PreToolUse hook (.claude/settings.json). It stops, before they run, the few mistakes that
# cannot be taken back here (RULES.json: merge-rights, git-safety, naming):
#   - a push to main, a force push (-f, --force*, a +refspec, --mirror) or a push that deletes a branch (--delete, :ref)
#   - a merge: `gh pr merge`, `gh api .../pulls/N/merge`, the GitHub tools' merge_pull_request and enable_pr_auto_merge,
#     and a GitHub tool that writes straight to main
#   - a banned name (names.json, salted hashes) in a commit's message or diff, in what a push sends, or in what a
#     GitHub tool posts
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


if __name__ == '__main__':
    main()
