#!/usr/bin/env bash
# check: No fades: no keyframes, transitions or animations
# enforces: no-fades
# (RULES.json no-fades, automated 2026-11-07) the stylesheet and the shipped scripts, comments blanked (nocomments.mjs):
# no @keyframes, no transition or animation property, and no script that sets one or calls Element.animate
# plant: {"file": "build/site/style.css", "find": "--color-text: #fdfcf7;", "with": "--color-text: #fdfcf7; transition: opacity 1s;", "why": "a transition in the stylesheet"}
node tools/checks/nocomments.mjs build/site "$RUNNER_TEMP/nc"
fail=0
if grep -nE '@keyframes|(^|[;{[:space:]])(transition|animation)(-[a-z-]+)?[[:space:]]*:' "$RUNNER_TEMP/nc/style.css"; then
  echo "::error::style.css: a keyframe, transition or animation (no fades anywhere: RULES.json no-fades)"; fail=1
fi
if grep -nE '\.animate\(|\.style\.(transition|animation)|setProperty\([[:space:]]*["'"'"'](transition|animation)|["'"'"'](transition|animation)(-[a-z-]+)?[[:space:]]*:' "$RUNNER_TEMP"/nc/*.js; then
  echo "::error::a script sets a transition or an animation, or calls Element.animate (no fades anywhere)"; fail=1
fi
[ "$fail" -eq 0 ] && echo "no fades: no keyframes, transitions or animations in the stylesheet or the scripts"
exit $fail
