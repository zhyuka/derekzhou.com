# Where the baked stills live (A2's first frames)

Status: proposal, 2026-11-12. For #197 (claude/resume-stills). The build's fetch and the PC's upload step are #199.

**The world key** is `worldKey()` in `tools/stills.mjs`: a sha256 of the plain build's files (`tools/build.mjs --plain`), leaving out `assets/still/` and `build.txt`. The PC computes it on the gate's `served/head`, and the build on its own plain output, so a set is found only for the world it was baked from.

## The numbers (PC GPU's full bake for #197, 08e83a4)

- 2,304 stills (96 openings x 12 shapes x 2 tiers), 57.1 MB, 38.5-77.3 KB each.
- 76 min on the 4090. Cached by a hash of the world's inputs: an unchanged world bakes nothing, any world change re-bakes all.
- In 373 of 384 cases dawn = day and rain = sunset byte for byte, so naming by content drops about a third of the bytes.
- `tools/build.mjs` on #197 already copies a bake from `STILLS_DIR` (or `stills/`, git-ignored). It does so only when `bake.json` names each still with its sha256, and stops on anything else in the folder.

So the only missing piece is getting a finished bake into `stills/` before Cloudflare's build of `live` runs.

## Recommendation: a GitHub release asset on this repo, fetched by the build

- **Upload, on the PC.** The bake's workflow, on the PC's runner, packs the bake into one archive: `bake.json` plus the stills, deduplicated, about 38 MB. It uploads that as the asset of a release tagged `stills-<world-hash>`, using the job's own `GITHUB_TOKEN` with `contents: write`. No new token is needed on the PC.
- **Download, in Cloudflare's build.** When `STILLS_TOKEN` is set, `tools/build.mjs` first computes the world hash and asks GitHub for the release `stills-<world-hash>`. It downloads that release's archive into `stills/`, and then the existing `bake.json` check runs as now.
  - If there's no such release, or anything fails, the build ships without stills, and the first paint is the same as today.
  - It never ships a set baked from a different world.
- **No change to the Pages build command.** The fetch lives in `tools/build.mjs`.

### Why this beats the other routes

- **vs R2:** R2 needs a bucket and two tokens (the PC's write and the build's read). This route needs one read-only token, because the PC's workflow already holds `GITHUB_TOKEN`, and it puts nothing new in the Cloudflare account. Both keep the repository the same size.
- **vs a stills branch fetched at build:** every bake would add about 38-57 MB of git objects to this repository for good, because history can't be rewritten here (no force-push, no branch deletion). Every clone and every runner checkout would carry it. Release assets don't enter git history.
- **vs `wrangler pages deploy` from the PC:** each Pages deployment is a complete copy of the site, so Cloudflare's next build of `live` would replace whatever the PC uploaded. The PC would have to make every deploy, and publishing would stop whenever the PC is off. It was off for 12 hours on Nov 11.
- **vs committing the stills:** about 57 MB of history per look change, for good.

I haven't measured any of these routes. The numbers above are the bake's, from PC GPU, and the limits are from Cloudflare's and GitHub's documentation: 20,000 files and 25 MiB per file on Pages, 2 GiB per release asset.

## While a world change's 76-minute bake runs

- **The bake starts on the PR**, from the PR's served head, as soon as the PR's T2 says the world changed. It runs alongside the review rather than after the merge.
  - A world change is visible, so it waits for the owner. Usually the release is already up by the time the owner merges, and the first deploy has its stills.
- **If the owner merges first**, the deploy ships without stills (today's first paint). The next deploy that rebuilds `live` picks the release up.
- **No deploy hook is needed.** Pushing `live` already starts a Cloudflare build, and the merge bot moves `live` to every green main tip.
  - The cost of having no hook: if the bake finishes after the merge and nothing else lands, the stills wait for the next merge.
  - A deploy hook (one more secret, below) would close that gap. It's optional.

## The owner's steps (one token, one secret)

1. **Create the token.** GitHub, then Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token:
   - Token name: `derekzhou.com stills (Cloudflare build)`
   - Expiration: the longest he's comfortable with (renew it when it expires; the build then ships without stills until it is)
   - Resource owner: `zhyuka`
   - Repository access: Only select repositories, `zhyuka/derekzhou.com`
   - Permissions, Repository permissions, Contents: **Read-only**. Nothing else.
   - Generate, then copy the token. GitHub shows it only once.
2. **Give it to the build.** Cloudflare dashboard, then Workers & Pages, the derekzhou.com project, Settings, Variables and Secrets, Add:
   - Type: **Secret**
   - Name: `STILLS_TOKEN`
   - Value: the token from step 1
   - Environment: Production
   - Save. It applies from the next build.

3. **Add the new file to the build watch paths.** In the same project, Settings, Build, Build watch paths, add `tools/stills.mjs` to the include list. It should match `.github/ci/deploy-inputs.txt`.

That's all. No bucket, no Cloudflare API token, and no change to the build command.

**Optional, only to close the gap above:** in Settings, Builds, Deploy hooks, add a hook named `stills` for the branch `live`. Then give its URL to the PC runner as a repository secret, `STILLS_DEPLOY_HOOK`, in GitHub's repository Settings, Secrets and variables, Actions. The bake's workflow POSTs to it after uploading.

No secret is written in any file. The token lives only in Cloudflare's secret store, and the hook's URL only in GitHub's.

## What each lane builds (after the owner says yes)

- **PC GPU (#197):** the bake's upload step and the release tag `stills-<world-hash>`, plus the content-addressed packing.
- **CI lane:**
  - the fetch in `tools/build.mjs`, which only runs when `STILLS_TOKEN` is set;
  - its unit test (a missing release, a bad sha, and the wrong world's set all ship without stills);
  - the PR-time bake trigger in the gate.
