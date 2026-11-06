# Deploy

<!-- Moved word for word from CLAUDE.md's section "Deploy" (restructure step 7, 2026-11-06). -->

Cloudflare Pages (the project's Settings > Build, its build configuration):
build command `npm ci --no-audit --no-fund --ignore-scripts && node
tools/build.mjs dist`, build output directory `dist`, NODE_VERSION 22.
Auto-deploys on push to main. Build watch paths (Settings > Build) limit that to
pushes that touch a deploy input, .github/ci/deploy-inputs.txt (include site/*, src/*,
tools/build.mjs, tools/minify.mjs, tools/parts.mjs, tools/plan.mjs, tools/start.mjs,
package.json, package-lock.json, .gitattributes; exclude nothing); post-deploy.yml waits
for the newest main commit that touched one, and CI fails if the build loads a tool not listed. The gate decides whether a change alters what
is served by building base and head (.github/ci/served.sh) and comparing the
two builds; T1 and T2 render those builds (T1 renders each base build once: its frames' hashes
are cached by the build's content, so a branch cut from a rendered main renders only its head). Every change to the live site goes through a pull
request the owner approves. The repository is private, so CI uses the
account's included Actions minutes (2,000 a month on GitHub Free) until they ran out
on 2026-11-06; since then every job runs on the owner's PC (the owner: "All on my PC,
free"): Linux jobs on a self-hosted runner in WSL2 labelled pc-wsl, T2 on the Windows
gpu-4090 runner. One job at a time, so T1 is skipped when T2 runs for the same head.
