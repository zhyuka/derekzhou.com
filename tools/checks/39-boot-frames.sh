#!/usr/bin/env bash
# check: The boot shows within its frames, its GPU work before the show no heavier, on every device profile
# plant: {"file": "src/world/455-boot-stages.js", "find": "BOOT_BAKE0 = 1024,", "with": "BOOT_BAKE0 = 4,", "why": "a boot that bakes 4 units a frame, not 1,024 (it shows 7 frames later)", "rebuild": true}
# plant: {"file": "src/world/180-world-definition-two-kits-by.js", "find": "radius: 12000, one: true", "with": "radius: 12000, one: false", "why": "the destination's scale makes every 16 km cell in reach (#494 before its fix: the same frames to the show, more cloud bakes before it)", "rebuild": true}
# (the PC fast-checks lane, 2026-11-07) the boot on the fake page: each device profile's frames to the world's show
# against test/golden/boot-frames.json, in seconds without a GPU; a boot that shows later, or not at all, fails; and
# (load-perf, 2026-11-25) its GPU work before the show, the 3D texels made and the draws, against
# test/golden/boot-bakes.json: more than 3% over fails
node test/sims/boot.mjs build/site
