# The openings score (numbers only, no re-bake), main 6191c699 with #494

Measured on main's build:
- `tools/visit/ruler.mjs`: 16 lands x 6 hours x 3 reads.
- `tools/visit/looks.mjs --table`: each land's live opening (its table heading row; "own" for k6 and k13, which have no heading row).

How to read it:
- The flight's first near pass and first sighting do not depend on the hour group: each land's medians are the same in all six (dawn, day, rain, sunset, dusk, night). So one row per land.
- words / name: the share of the words' and name's boxes under cloud.
- top: the share of busy cloud in the top band.
- galaxy and sun: the night feature's and the sun's visible share in frame.

| land | cut | first near (s, kind) | first sight (s) | longest gap (s) | words | name | top | galaxy | sun |
|---|---|---|---|---|---|---|---|---|---|
| k0 | sea | 283 tower | 165 | 169 | .019 | 0 | .116 | .882 | .811 |
| k1 | meadow | 107 tower | 50 | 164 | .049 | .004 | .072 | .851 | .876 |
| k2 | forest | 377 canyon | 99 | 234 | .042 | 0 | .185 | .956 | .876 |
| k3 | dunes | 75 butte | 75 | 224 | .053 | .009 | 0 | .908 | .936 |
| k4 | bare | **30** butte | 30 | 188 | .003 | 0 | 0 | .984 | .979 |
| k5 | meadow | **22** form | 22 | 234 | .078 | 0 | 0 | .979 | .926 |
| k6 | dunes | **18** mesa | 18 | 165 | 0 | 0 | 0 | 1 | 1 |
| k7 | meadow | 64 ruins | 64 | 220 | .023 | 0 | .001 | .982 | .977 |
| k8 | meadow | 71 mesa | 58 | 210 | 0 | 0 | .001 | 1 | 1 |
| k9 | meadow | 111 ruins | 65 | 203 | .019 | 0 | .199 | .975 | .940 |
| k10 | meadow | 380 mesa | 100 | 211 | .071 | 0 | .038 | .970 | .905 |
| k11 | sea | 145 island | 145 | 167 | 0 | 0 | .163 | .863 | .947 |
| k12 | sea | 87 butte | 51 | 194 | .095 | .005 | .001 | .978 | .917 |
| k13 | meadow | 140 butte | 107 | 202 | .007 | 0 | .036 | .775 | .796 |
| k14 | sea | 56 form | 56 | 213 | .007 | .016 | .430 | .956 | .940 |
| k15 | sea | 80 island | 77 | 249 | .074 | .003 | 0 | .979 | .873 |

Summary:
- A near pass by 40 s on 3 of 16 lands (k4, k5, k6); the median is 87 s.
- 2 of 16 open over dunes (k3, k6).
- The name is clear on every opening (at most .016).

## The worst openings, ranked
1. **k10**: the first near pass is at 380 s and nothing is in sight until 100 s; words .071.
2. **k2**: the first near pass is at 377 s (the canyon), sight at 99 s; top cloud .185.
3. **k0**: the first near pass is at 283 s and nothing is in sight for 165 s; a weak night feature (.882) and sun (.811).
4. **k11**: nothing is in sight, or near, until 145 s; top cloud .163; night feature .863.
5. **k13**: the near pass is at 140 s (sight 107 s); the weakest night feature (.775) and sun (.796).
6. **k9**: the near pass is at 111 s; top cloud .199.
7. **k14**: the busiest top of all (.430) over the name; near pass 56 s.
8. **k12**: the most cloud under the words (.095); near pass 87 s.
9. **k1**: near pass 107 s; night feature .851.
10. **k15**: words .074; the longest stretch without a reward (249 s).

The best are k6, k4, k8 and k7: an early pass (or 58–71 s) and a clean frame.

## Caveat (subject)
The ruler's first sighting is never at 0 s: on every land the first place comes into its sight range later, even with #494's destination in the first frame. Its sight range is a near-place test, not "a subject in frame". The subject in each still was not scored separately here.
