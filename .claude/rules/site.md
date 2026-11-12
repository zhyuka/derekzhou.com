---
paths:
  - "site/**"
---

# What is served as written (site/)

Read docs/security.md and docs/caching.md first; docs/content.md and docs/css.md for the page itself.

- Never commit a built file to site/ (world.js, the realms, inkbirds.js, sound.js, score.js, plan.js): their
  sources are in src/ (built-files-uncommitted).
- The page says exactly its words (page-words); the lettered name is a drawing, never redrawn here (lettered-name).
- No keyframes and no transitions in style.css (no-fades); the words' colours are fixed (light-words-only).
- CSP per HTML path in _headers, never on /*; 404.html carries the same policy in a meta tag (csp-scoping). Scripts in
  their order, each data-cfasync="false" (script-order).
- Fonts and images: changed bytes need a new name and every reference updated in the same commit
  (changed-bytes-new-name). Scripts and the stylesheet are renamed by the build, never by hand.
