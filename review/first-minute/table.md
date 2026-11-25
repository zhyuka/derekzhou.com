# The first minute's path bent toward a place: measured, not built (FLIGHT for the hub, 19:14Z)

Measured with SKY's ruler: `tools/visit/ruler.mjs` on main 835c7e4f, NEAR 150 m, 16 lands × 6 hours × 3 reads, the first 14 min. The base column reproduces SKY's openings score (283, 108, 377, … s).

## The rule conflict, before the numbers
RULES.json **steer-only-by-drag** and the owner's H1 ("should keep flying same-ish direction unless user drags", docs/world.md) forbid a path that turns by itself. `test/unit/flight-sim.mjs` plants "the autopilot H1 took out, back". A bend toward a place is that autopilot. These numbers are for the ruling, not a proposal to build without the owner.

## The limits used
**B (bend).** From t > 0 (nothing at t = 0 changes), the way turns toward one place at most 1.64°/s: the turn whose bank stays under the flight's BANK_MAX of 2° at 12 m/s, ω = g·tan 2°/v. The view turns with it. It turns only in the first 60 s. After the pass, or at 60 s, it turns back to the landing heading at the same rate, so the visit keeps "same-ish direction". The target is whichever place within 1.6 km of the first 10 min gives the earliest near pass.

**Only where it pays.** A land bends only if that moves its first near pass 10 s earlier or more; otherwise it flies straight (k5's best bend turns 98° to gain 2 s).

**S (slip, for comparison).** The heading and view are held. The line shifts sideways toward the place at the slip's gentle speed (0.13·v = 1.56 m/s, eased at 0.034·v/s), as the slip already passes solids. Only in the first 60 s, so at most 94 m. Shown where it gains 10 s or more.

## The table (base → bent)

| land | first near, base | first near, bent (target, view turned, back on heading) | first near, slip | destination arrival (min, m off the dome's centre) | longest gap (worst of 18) | places in 14 min (worst of 18) |
|---|---|---|---|---|---|---|
| k0 | 283 | **99** (tower, 65°, 99 s) | 165 | 10.9 → 11.4, 1 → 710 (r 777) | 137 → 158 | 13 → 10 |
| k1 | 108 | **57** (butte, 10°, 65 s) | – | 10.2 → 10.2, 0 → 121 | 130 → 159 | 13 → 10 |
| k2 | 377 | **80** (shard, 68°, 101 s) | 281 | 10.2 → 10.7, 1 → 735 (r 714) | 126 → 124 | 14 → 13 |
| k3 | 75 | 75 (straight) | – | 10.4 | 137 | 12 |
| k4 | 30 | 30 (straight; best gain 1 s) | – | 10.2 | 175 | 8 |
| k5 | 22 | 22 (straight; best gain 2 s for 98°) | – | 10.3 | 203 | 7 |
| k6 | 18 | 18 (straight; best gain 2 s) | – | 11.1 | 141 | 10 |
| k7 | 65 | 65 (straight) | – | 10.9 | 248 | 9 |
| k8 | 71 | 71 (straight) | – | 10.2 | 265 | 6 |
| k9 | 111 | **66** (ruins, 9°, 65 s) | – | 10.6 → 10.6, 1 → 107 | 184 → 184 | 12 → 11 |
| k10 | 380 | **83** (temple, 84°, 111 s) | 103 | 10.7 → 11.4, 1 → 856 (r 748) | 197 → 172 | 8 → 12 |
| k11 | 145 | 145 (straight: no place in reach) | – | 9.8 | 165 | 11 |
| k12 | 88 | **55** (mesa, 14°, 68 s) | – | 10.8 → 10.8, 0 → 170 | 174 → 144 | 12 → 13 |
| k13 | 140 | **113** (butte, 25°, 75 s) | – | 11.1 → 11.2, 3 → 307 | 152 → 139 | 11 → 13 |
| k14 | 56 | 56 (straight; best gain 1 s) | – | 11.0 | 182 | 16 |
| k15 | 80 | 80 (straight) | – | 11.1 | 150 | 12 |

## Summary
- **Near pass by 40 s:** 3 of 16 base, **still 3 of 16 bent** (k4, k5, k6). At 1.64°/s a bend moves the way about 275 m sideways in 40 s, so no other land has a place within reach that early.
- **Median first near:** 84 s → **68.5 s**. Worst 380 s (k10) → **145 s** (k11, no place in reach).
- **The big wins need big turns:** k0, k2 and k10 gain 184–297 s, but their views swing 65–84° by themselves in the first minute and are back on the heading only at 99–111 s. The small turns (9–25°: k1, k9, k12, k13) gain 27–51 s.
- **The destination is still reached on every land** (within r + 600 m, at 9.8–11.4 min; base 9.8–11.1). On k0, k2 and k10 the way comes back to the landing heading 710–856 m off its old line, so it meets the dome at its foot's edge (k0 inside its 777 m foot) and the slip carries it round (#484, #516).
- **Visit bars (#508: gap ≤ 280 s, places ≥ 4, first near ≤ 400 s): all pass, base and bent.**
  - Lands with a gap over 180 s: 6 → 5 (k10 drops under).
  - Places fall on k0 (13 → 10), k1 (13 → 10), k2 and k9 (−1); they rise on k10 (8 → 12), k12 and k13.
  - The worst land's places are unchanged: 6 (k8).
- **The slip (no view turn) barely helps:** 94 m of shift in 60 s gains only on k0 (283 → 165), k2 (377 → 281) and k10 (380 → 103).
