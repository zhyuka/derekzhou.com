#!/usr/bin/env bash
# check: The boot shows within its frames, on every device profile
# plant: {"file": "src/world/455-boot-stages.js", "find": "BOOT_BAKE0 = 1024,", "with": "BOOT_BAKE0 = 4,", "why": "a boot that bakes 4 units a frame, not 1,024 (it shows 7 frames later)", "rebuild": true}
# (the PC fast-checks lane, 2026-11-07) the boot on the fake page: each device profile's frames to the world's show
# against test/golden/boot-frames.json, in seconds without a GPU; a boot that shows later, or not at all, fails
node test/sims/boot.mjs build/site
