#!/usr/bin/env python3
# test_guard.py: guard.py's tests, run by CI ("The rules are data, and the hooks hold") and by hand:
#   python3 .claude/hooks/test_guard.py
# Each case runs the hook as Claude Code does (the event as JSON on stdin) in a throwaway git repository, with a test
# list of names (made-up words, not the real list), and checks it blocks (exit 2) or allows (exit 0). Also: it fails
# open on garbage input and on a broken names file, and an ordinary command costs little.
import json, os, shutil, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
GUARD = os.path.join(HERE, 'guard.py')
SALT = 'test-salt'
sys.path.insert(0, HERE)
from guard import digest  # noqa: E402

def setup():
    t = tempfile.mkdtemp(prefix='guard-test-')
    hooks = os.path.join(t, 'hooks'); os.mkdir(hooks)
    shutil.copy(GUARD, hooks)
    fake = ['zorblax', 'quintor vexley', 'quintorvexley']   # made-up test names
    json.dump({'salt': SALT, 'max_words': 2, 'hashes': [digest(SALT, n) for n in fake]},
              open(os.path.join(hooks, 'names.json'), 'w'))
    repo = os.path.join(t, 'repo'); os.mkdir(repo)
    g = lambda *a: subprocess.run(['git', '-C', repo, *a], check=True, capture_output=True)
    g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't')
    open(os.path.join(repo, 'a.txt'), 'w').write('hello\n'); g('add', '.'); g('commit', '-qm', 'one')
    g('update-ref', 'refs/remotes/origin/main', 'HEAD')
    g('checkout', '-qb', 'claude/x')
    return t, os.path.join(hooks, 'guard.py'), repo, g

def run(guard, ev):
    r = subprocess.run([sys.executable, guard], input=ev if isinstance(ev, str) else json.dumps(ev),
                       capture_output=True, text=True, timeout=30)
    return r.returncode, r.stderr

def bash(cmd, cwd):
    return {'tool_name': 'Bash', 'tool_input': {'command': cmd}, 'cwd': cwd}

def main():
    t, guard, repo, g = setup()
    fails = []
    def expect(want, ev, label):
        code, err = run(guard, ev)
        got = 'block' if code == 2 else 'allow' if code == 0 else f'exit {code}'
        if got != want:
            fails.append(f'{label}: wanted {want}, got {got} {err.strip()[:200]}')
        else:
            print(f'ok  {want:5}  {label}')
    try:
        B, A = 'block', 'allow'
        # pushes
        expect(A, bash('git push -u origin claude/x', repo), 'push a claude/* branch')
        expect(A, bash('git push', repo), 'bare push from a branch')
        expect(B, bash('git push origin main', repo), 'push to main')
        expect(B, bash('git push origin HEAD:main', repo), 'push HEAD:main')
        expect(B, bash('git push origin claude/x:refs/heads/main', repo), 'push to refs/heads/main')
        expect(B, bash('git push --force origin claude/x', repo), '--force')
        expect(B, bash('git push --force-with-lease origin claude/x', repo), '--force-with-lease')
        expect(B, bash('git push -uf origin claude/x', repo), '-uf')
        expect(B, bash('git push origin +claude/x', repo), '+refspec')
        expect(B, bash('git push origin --delete claude/old', repo), '--delete')
        expect(B, bash('git push origin :claude/old', repo), ':ref deletes')
        expect(B, bash('git push --all origin', repo), '--all')
        expect(B, bash('cd . && git status\ngit push origin main', repo), 'push to main on a second line')
        expect(B, bash("bash -c 'git push origin main'", repo), 'inside bash -c')
        expect(B, bash('GIT_TRACE=0 git -C . push origin main', repo), 'env and -C before push')
        expect(A, bash('git log --oneline main', repo), 'reading main')
        expect(A, bash('git fetch origin main && git checkout -b claude/y origin/main', repo), 'fetching main')
        expect(A, bash('echo "git push origin main" > notes.txt', repo), 'the words in an echo')
        g('checkout', '-q', 'main')
        expect(B, bash('git push', repo), 'bare push from main')
        expect(B, bash('git push origin HEAD', repo), 'push HEAD from main')
        g('checkout', '-q', 'claude/x')
        # merges
        expect(B, bash('gh pr merge 12 --squash', repo), 'gh pr merge')
        expect(B, bash('gh api -X PUT repos/o/r/pulls/12/merge', repo), 'gh api merge')
        expect(A, bash('gh pr view 12', repo), 'gh pr view')
        expect(B, {'tool_name': 'mcp__github__merge_pull_request', 'tool_input': {'pullNumber': 1}, 'cwd': repo}, 'merge tool')
        expect(B, {'tool_name': 'mcp__github__enable_pr_auto_merge', 'tool_input': {}, 'cwd': repo}, 'auto-merge tool')
        expect(B, {'tool_name': 'mcp__github__push_files', 'tool_input': {'branch': 'main', 'files': []}, 'cwd': repo}, 'push_files to main')
        expect(A, {'tool_name': 'mcp__github__push_files', 'tool_input': {'branch': 'claude/x', 'files': []}, 'cwd': repo}, 'push_files to a branch')
        # names
        expect(B, bash('git commit -m "Add the Zorblax sky"', repo), 'name in -m')
        expect(B, bash('git commit -m "after quintor   vexley"', repo), 'two-word name, odd spacing')
        expect(B, bash('git commit -m "QuintorVexley"', repo), 'name run together')
        expect(B, bash("git commit -F - <<'EOF'\nTitle\n\nmentions zorblax here\nEOF", repo), 'name in a heredoc message')
        expect(B, bash('git commit -m "$(cat <<\'EOF\'\nsee zorblax\nEOF\n)"', repo), 'name in $(cat <<EOF)')
        expect(A, bash('git commit -m "Add the evening sky"', repo), 'clean message')
        expect(A, bash('git commit -m "zorblaxian is another word"', repo), 'a longer word is not the name')
        open(os.path.join(repo, 'b.txt'), 'w').write('the zorblax look\n'); g('add', 'b.txt')
        expect(B, bash('git commit -m "clean"', repo), 'name in the staged diff')
        g('reset', '-q')
        open(os.path.join(repo, 'a.txt'), 'w').write('hello\nzorblax\n')
        expect(B, bash('git commit -am "clean"', repo), 'name in the changes -a takes')
        expect(B, bash('git add a.txt && git commit -m "clean"', repo), 'name in a file added in the same command')
        g('commit', '-qam', 'sneaks past (no hook here)')
        expect(B, bash('git push -u origin claude/x', repo), 'name in what a push sends')
        expect(B, {'tool_name': 'mcp__github__create_pull_request', 'tool_input': {'title': 'x', 'body': 'like Zorblax'}, 'cwd': repo}, 'name in a PR body')
        expect(A, {'tool_name': 'mcp__github__create_pull_request', 'tool_input': {'title': 'x', 'body': 'plain'}, 'cwd': repo}, 'clean PR body')
        # fails open
        expect(A, 'not json', 'garbage input')
        expect(A, bash('git push origin "unclosed', repo), 'unparseable command without a danger')
        expect(B, bash('git push origin main "unclosed', repo), 'unparseable command to main (plain patterns)')
        json.dump({'oops': 1}, open(os.path.join(os.path.dirname(guard), 'names.json'), 'w'))
        expect(A, bash('git commit -m "zorblax"', repo), 'broken names file: no name check')
        expect(B, bash('git push origin main', repo), 'broken names file: the push rules still hold')
        # cost
        t0 = time.time()
        for _ in range(5):
            run(guard, bash('ls -la && npm test', repo))
        per = (time.time() - t0) / 5
        print(f'ok  cost   {per * 1000:.0f} ms an ordinary command')
        if per > 0.5:
            fails.append(f'an ordinary command costs {per * 1000:.0f} ms (over 500)')
    finally:
        shutil.rmtree(t, ignore_errors=True)
    if fails:
        print('\n'.join('FAIL ' + f for f in fails))
        sys.exit(1)
    print('all guard tests pass')

if __name__ == '__main__':
    main()
