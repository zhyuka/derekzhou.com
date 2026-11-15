# rank.py ALL.csv OUT_DIR: per-still composite and the 96 openings (sky, k) ranked.
#   z(subject) - z(busy) over all 2,304 stills; on the night, +1 when its feature is visible (aurora green share > 0.1,
#   galaxy band share > 0.25), -1 when hidden (galaxy band < 0.2; moonlit: no disc in frame), 0 between.
#   Openings: the 64 distinct ones (dawn and day open on the same sky, as do rain and sunset: their stills are mostly
#   byte-identical), each averaged over its 24 windows (and both hour bands where they differ)
#   W8 fails (any px over L 0.53 outside a moon footprint) would rank first; there are none.
import sys, csv, json, numpy as np, collections as C
R = list(csv.DictReader(open(sys.argv[1]))); OUT = sys.argv[2]
for r in R:
    for k in ('w8', 'w8_small', 'busy', 'subject', 'aurora', 'galaxy', 'underL', 'underLmax', 'Lmax', 'k'): r[k] = float(r[k])
    r['k'] = int(r['k'])
KIND = {}
for k in range(16):
    n = [r for r in R if r['sky'] == 'night' and r['k'] == k]
    KIND[k] = 'aurora' if np.median([r['aurora'] for r in n]) > 0.1 else 'galaxy' if np.median([r['galaxy'] for r in n]) > 0.05 else 'moonlit'
z = lambda v, a: (v - a.mean()) / (a.std() + 1e-9)
S = np.array([r['subject'] for r in R]); B = np.array([r['busy'] for r in R])
feat = {'aurora': np.array([r['aurora'] for r in R if r['sky'] == 'night' and KIND[r['k']] == 'aurora']),
        'galaxy': np.array([r['galaxy'] for r in R if r['sky'] == 'night' and KIND[r['k']] == 'galaxy'])}
for r in R:
    r['zs'] = z(r['subject'], S); r['zb'] = z(r['busy'], B); r['zf'] = 0.0; r['kind'] = ''
    if r['sky'] == 'night':
        r['kind'] = KIND[r['k']]
        r['feature'] = r['aurora'] if r['kind'] == 'aurora' else r['galaxy'] if r['kind'] == 'galaxy' else 0.0
        vis = (r['kind'] == 'aurora' and r['feature'] > 0.1) or (r['kind'] == 'galaxy' and r['feature'] > 0.25)
        hid = r['kind'] == 'moonlit' or (r['kind'] == 'galaxy' and r['feature'] < 0.2)
        r['zf'] = 1.0 if vis else -1.0 if hid else 0.0; r['visible'] = 'yes' if vis else 'no' if hid else 'partly'
    r['score'] = r['zs'] - r['zb'] + r['zf'] - (10 if r['w8'] - r['w8_small'] > 0 else 0)
# identical stills across sky names (dawn = day, rain = sunset in most): from the bake manifest's sha, by name
GRP = {'dawn': 'firstlight (dawn/day)', 'day': 'firstlight (dawn/day)', 'rain': 'afterglow (rain/sunset)', 'sunset': 'afterglow (rain/sunset)', 'dusk': 'dusk', 'night': 'night'}
O = C.defaultdict(list)
for r in R: O[(GRP[r['sky']], r['k'])].append(r)
rows = []
for (sky, k), L in O.items():
    sc = np.array([r['score'] for r in L]); w = min(L, key=lambda r: r['score']); b = max(L, key=lambda r: r['score'])
    rows.append(dict(sky=sky, k=k, kind=L[0]['kind'], score=round(float(sc.mean()), 3), worst_window=w['tier'] + '-' + w['shape'], worst_score=round(w['score'], 3),
                     best_window=b['tier'] + '-' + b['shape'], subject=round(float(np.mean([r['subject'] for r in L])), 4), busy=round(float(np.mean([r['busy'] for r in L])), 3),
                     busy_max=round(max(r['busy'] for r in L), 3), underLmax=round(max(r['underLmax'] for r in L), 4),
                     feature=round(float(np.mean([r.get('feature', 0) for r in L])), 4) if sky == 'night' else '', visible=(C.Counter(r.get('visible', '') for r in L).most_common(1)[0][0]) if sky == 'night' else '',
                     w8=int(sum(r['w8'] for r in L)), Lmax=round(max(r['Lmax'] for r in L), 4)))
rows.sort(key=lambda r: r['score'])
with open(f'{OUT}/openings.csv', 'w', newline='') as f:
    wr = csv.DictWriter(f, fieldnames=list(rows[0])); wr.writeheader(); wr.writerows(rows)
with open(f'{OUT}/stills.csv', 'w', newline='') as f:
    keys = ['file', 'sky', 'k', 'tier', 'shape', 'kind', 'score', 'subject', 'subj_x', 'subj_y', 'busy', 'underL', 'underLmax', 'aurora', 'galaxy', 'w8', 'w8_small', 'Lmax']
    wr = csv.DictWriter(f, fieldnames=keys, extrasaction='ignore'); wr.writeheader(); wr.writerows(sorted(R, key=lambda r: r['score']))
print('night kinds:', {k: KIND[k] for k in range(16)})
print('WORST 20'); [print(f"{i+1:2d} {r['sky']:24s} k{r['k']:<2d} {r['kind']:7s} score {r['score']:+.2f}  subject {r['subject']:.3f} busy {r['busy']:.2f} (max {r['busy_max']:.2f}) feature {r['feature']} {r['visible']}  worst {r['worst_window']}") for i, r in enumerate(rows[:20])]
print('BEST 16'); [print(f"{i+1:2d} {r['sky']:24s} k{r['k']:<2d} {r['kind']:7s} score {r['score']:+.2f}  subject {r['subject']:.3f} busy {r['busy']:.2f} feature {r['feature']} {r['visible']}  best {r['best_window']}") for i, r in enumerate(rows[::-1][:16])]
