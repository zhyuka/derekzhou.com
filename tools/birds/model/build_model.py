# build_model_fix.py (physics/lab, FIX ROUND): ../model/scripts/build_model.py with the judges' fixes (CHECKS.md Fix):
#   the stroke's size set from measured magnitudes (STROKE below), the crane's raw two-harmonic arm for stork and ibis,
#   the heron's stroke fitted to the great egret film (HERON env), the crow's and swallow's fold deepest at mid-upstroke
#   (doi:10.1242/jeb.199.2.263; doi:10.1242/jeb.204.15.2741), the body lowest at mid-downstroke (doi:10.1098/rsif.2022.0168 Fig. 2), the stork's
#   heave from the CC0 white stork tags. The research folders are read only.
# Build data/model.json: one kinematic and structural wing model per kind, from the sibling research folders' data.
# Run: python3 -I build_model.py <data folder> <out json>   (tools/birds/model/make.py runs it, on tools/birds/model/data)
# Reads only the derived data in data/ (kinematics/, structure/, dynamics/: each folder's LICENSES.md names its sources).
# Every channel is a Fourier series in the beat's phase p (0 = the top of the arm's stroke, 1 = the next top):
#   f(p) = a0 + sum_k a_k cos(2 pi k p) + b_k sin(2 pi k p)
import json, sys, os
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from linkage import Linkage, GULL_FOLD, check_gull, interp_table

PHYS = sys.argv[1]; OUT = sys.argv[2]
NG = 400
PG = np.arange(NG) / NG
TAU = 2 * np.pi


def J(*p):
    with open(os.path.join(PHYS, *p)) as f:
        return json.load(f)


def series(c, p):
    p = np.asarray(p, float)
    y = np.full(p.shape, c['a0'], float)
    for k, (a, b) in enumerate(zip(c['a'], c['b']), 1):
        y = y + a * np.cos(TAU * k * p) + b * np.sin(TAU * k * p)
    return y


def dseries(c, p):  # d/dp
    p = np.asarray(p, float); y = np.zeros(p.shape)
    for k, (a, b) in enumerate(zip(c['a'], c['b']), 1):
        y = y + TAU * k * (-a * np.sin(TAU * k * p) + b * np.cos(TAU * k * p))
    return y


def fit(y, N):
    y = np.asarray(y, float)
    a0 = float(np.mean(y)); a = []; b = []
    for k in range(1, N + 1):
        a.append(float(2 * np.mean(y * np.cos(TAU * k * PG)))); b.append(float(2 * np.mean(y * np.sin(TAU * k * PG))))
    return {'a0': a0, 'a': a, 'b': b}


def fit_auto(y, tol_frac=0.02, nmax=6, nmin=1):
    """fewest harmonics with RMS <= tol_frac of the curve's range (the kinematics task's shape criterion)"""
    rng = float(np.ptp(y)) or 1.0
    for N in range(nmin, nmax + 1):
        c = fit(y, N)
        if np.sqrt(np.mean((series(c, PG) - y) ** 2)) <= tol_frac * rng: break
    c['N'] = N; c['rms_fit'] = float(np.sqrt(np.mean((series(c, PG) - y) ** 2)))
    return c


def neg(c):
    return {'a0': -c['a0'], 'a': [-x for x in c['a']], 'b': [-x for x in c['b']]}


def rnd(c, n=4):
    o = dict(c)
    o['a0'] = round(c['a0'], n); o['a'] = [round(x, n) for x in c['a']]; o['b'] = [round(x, n) for x in c['b']]
    for k in ('rms_fit',):
        if k in o: o[k] = round(o[k], 5)
    return o


def warp_to(D_target, D_src):
    """phase map p_target -> p_src (smooth, periodic, monotone): moves the bottom of the stroke from D_src to D_target"""
    dlt = D_src - D_target
    return lambda p: p + dlt * np.sin(np.pi * p) ** 2 / np.sin(np.pi * D_target) ** 2


def shaped(pmin, pmax, mean, pp):
    """a smooth periodic curve with its minimum at pmin and maximum at pmax (a cosine on each side, joined with zero
    slope at the extremes): used where a source gives only ranges and phases (study-only sources: facts, not curves)"""
    p = PG
    rise = (pmax - pmin) % 1.0; fall = 1.0 - rise
    y = np.empty(NG)
    for i, x in enumerate(p):
        t = (x - pmin) % 1.0
        if t < rise: y[i] = mean - 0.5 * pp * np.cos(np.pi * t / rise)
        else: y[i] = mean + 0.5 * pp * np.cos(np.pi * (t - rise) / fall)
    return y


def ext_phases(c):
    y = series(c, PG); return float(PG[np.argmax(y)]), float(PG[np.argmin(y)])


# ------------------------------------------------------------------------------------------------------------ sources
K = 'kinematics/'
front = {n: J(K + n + '_ntrs2004.json')['measures'] for n in ('seagull', 'crane', 'goose')}
pig = J(K + 'pigeon_biomimetics2024.json')['measures']
BG = J(K + 'goose_barnacle_facts.json')   # (the barnacle goose: facts only, the study-only curves not kept: see its meta)
skel = J('structure/skeleton.json')
rec = skel['recommended']; kinds_s = skel['kinds']
body = J('dynamics/body_motion.json')


def coef(m, key='coef_recommended'):
    c = m['fourier'][key]; return {'a0': c['a0'], 'a': list(c['a']), 'b': list(c['b'])}


# barnacle goose facts (study only: ranges and phases as stated; the digitised curves are not kept). The facts file holds
# what was worked out from them: per measure the two runs' mean range, mean and phases, and the stroke's four marks
BF = BG['facts']
GM = BG['stroke_marks']


def stroke_marks(c):
    y = series(c, PG); v = dseries(c, PG)
    return {'top': float(PG[np.argmax(y)]), 'bottom': float(PG[np.argmin(y)]), 'vdown': float(PG[np.argmin(v)]), 'vup': float(PG[np.argmax(v)])}


def map_phase(p_src, src, dst):
    """carry a phase from one bird's stroke to another's: piecewise-linear between the strokes' top, fastest down,
    bottom and fastest up (each bird's own)"""
    ks = ['top', 'vdown', 'bottom', 'vup']
    s = [src[k] for k in ks]; d = [dst[k] for k in ks]
    s0 = s[0]; s = [((x - s0) % 1.0) for x in s] + [1.0]; d0 = d[0]; d = [((x - d0) % 1.0) for x in d] + [1.0]
    t = (p_src - s0) % 1.0
    return (d0 + np.interp(t, s, d)) % 1.0


# ------------------------------------------------------------------------------------------------- the kinds' bodies
# real birds (the measured species or the stand-in's measured species), for frequency scaling and the twist's inflow
REAL = {
    # f Hz (wild, within flapping), b span m, U cruise airspeed m/s
    'gull':    {'f': 3.19, 'b': 1.34, 'U': 12.0, 'f_src': 'lesser black-backed gull 3.188 +- 0.241 Hz, 18 wild birds, 7,316 bursts (doi:10.5281/zenodo.4963689, CC0; analysed in ../dynamics); Larus 2.91-3.27 Hz (doi:10.1242/jeb.204.19.3283 Table 2, study only)', 'b_src': 'herring gull 1.34 m (doi:10.1371/journal.pbio.0050197, CC BY)', 'U_src': 'LBBG median airspeed 11.8 m/s (../dynamics, CC0); doi:10.1371/journal.pbio.0050197 13.1 m/s'},
    'goose':   {'f': 3.95, 'b': 1.69, 'U': 16.7, 'f_src': 'Canada goose benchmark 3.95 Hz (doi:10.1242/jeb.204.19.3283 eq. 2 on doi:10.1371/journal.pbio.0050197 morphology, CC BY); wild bar-headed goose 3.94 Hz below 2300 m (doi:10.1126/science.1258732, study only); tunnel 4.97 Hz (doi:10.7554/eLife.44986, CC0)', 'b_src': 'Canada goose 1.69 m (doi:10.1371/journal.pbio.0050197)', 'U_src': 'Canada goose 16.7 m/s (doi:10.1371/journal.pbio.0050197)'},
    'swan':    {'f': 3.38, 'b': 2.30, 'U': 16.2, 'f_src': 'mute swan 3.38 +- 0.09 Hz (doi:10.1242/jeb.204.19.3283, study only) = its benchmark 3.37 Hz (doi:10.1371/journal.pbio.0050197 morphology, CC BY)', 'b_src': 'mute swan 2.30 m (doi:10.1371/journal.pbio.0050197)', 'U_src': 'mute swan 16.2 m/s (doi:10.1371/journal.pbio.0050197)'},
    'stork':   {'f': 3.09, 'b': 1.91, 'U': 16.0, 'f_src': 'white stork 3.090 +- 0.139 Hz, 1,883 wild flapping bursts (doi:10.5441/001/1.78152p3q, CC0; ../dynamics)', 'b_src': 'white stork 1.91 m (doi:10.1371/journal.pbio.0050197)', 'U_src': 'white stork 16.0 m/s (doi:10.1371/journal.pbio.0050197, radar subset); 9.4 m/s circling (doi:10.1002/ece3.2585, CC BY)'},
    'heron':   {'f': 2.90, 'b': 1.73, 'U': 12.5, 'f_src': 'grey heron 2.90 +- 0.04 Hz (doi:10.1242/jeb.204.19.3283, study only; benchmark 2.79 Hz); great egret 1.74-1.81 Hz (doi:10.1098/rspb.2019.1083 Appendix I and ESM M5, CC BY; flight while calling)', 'b_src': 'grey heron 1.73 m (doi:10.1371/journal.pbio.0050197)', 'U_src': 'grey heron 12.5 m/s (doi:10.1371/journal.pbio.0050197)'},
    'ibis':    {'f': 4.0, 'b': 1.3, 'U': 11.7, 'f_src': 'northern bald ibis 3.9-4.1 Hz in straight flight (doi:10.1007/s10336-022-01978-1 Table 3, CC BY)', 'b_src': 'ESTIMATE 1.3 m for the bald ibis (no span in the research folders)', 'U_src': 'bald ibis ground speed 11.7 m/s (doi:10.1007/s10336-022-01978-1)'},
    'crow':    {'f': 3.84, 'b': 0.91, 'U': 10.5, 'f_src': 'hooded crow 3.84 +- 0.05 Hz (doi:10.1242/jeb.204.19.3283, study only); jackdaw 4.00, rook 2.91 Hz alone (doi:10.1098/rsif.2018.0653, study only)', 'b_src': 'carrion/hooded crow 0.91 m (doi:10.1371/journal.pbio.0050197)', 'U_src': 'hooded crow 10.5 m/s (doi:10.1242/jeb.204.19.3283); carrion crow 13.5 m/s (doi:10.1371/journal.pbio.0050197)'},
    'swallow': {'f': 7.1, 'b': 0.32, 'U': 10.0, 'f_src': 'barn swallow 6.9-7.3 Hz at 9-10 m/s, minimum 7.04 Hz at 8.9 m/s (doi:10.1242/jeb.204.15.2741, wind tunnel, study only); benchmark 7.67 Hz', 'b_src': 'barn swallow 0.32 m (doi:10.1371/journal.pbio.0050197)', 'U_src': 'barn swallow 10.0-11.3 m/s (doi:10.1371/journal.pbio.0050197)'},
}
# ---- FIX: the stroke's size (the shoulder-tip line's sweep, deg p-p, measured on the posed form). Targets: the species'
# own measured stroke where one exists (bar-headed goose: doi:10.7554/eLife.44986 Suppl. file 4, CC0, stroke-plane amplitude
# 73.4 +- 5.2 deg: its -1 SD; barn swallow: doi:10.1242/jeb.204.15.2741, shoulder-wrist 48.0 + 5.03 V = 98 deg at 10 m/s, the tip
# about 10 deg more); elsewhere midway between two measured regularities over 60 species (doi:10.1098/rspb.2004.2838,
# Proc R Soc B 271: 2071, abstract): the stroke angle 67 b^-0.24, and the cruising Strouhal number 0.21 of direct fliers
# at the species' own f, U, b (theta = 2 asin(0.21 U / (f b))). The curves' SHAPE stays the source's (NTRS 20040075526); their
# oscillation about the mean is scaled by STROKE_SCALE (iterated on the posed form: tools/strokeiter.py).
import math
def _mid(k):
    r = REAL[k]; a = 67.0 * r['b'] ** -0.24; b = 2 * math.degrees(math.asin(min(1.0, 0.21 * r['U'] / (r['f'] * r['b'])))); return 0.5 * (a + b), a, b
STROKE_TARGET = {k: round(_mid(k)[0], 1) for k in ('gull', 'stork', 'ibis', 'crow')}
STROKE_TARGET.update({'goose': 68.2, 'swan': 68.2, 'swallow': 108.0})
STROKE_WHY = {k: 'midway between the 60-species relation 67 b^-0.24 = %.1f deg and St 0.21 at this species\' f, U, b = %.1f deg (doi:10.1098/rspb.2004.2838)' % _mid(k)[1:] for k in ('gull', 'stork', 'ibis', 'crow')}
STROKE_WHY.update({'goose': 'bar-headed goose stroke-plane amplitude 73.4 +- 5.2 deg (doi:10.7554/eLife.44986 Suppl. file 4, CC0): its -1 SD (NTRS 20040075526\'s wild bird 51, the relation 59, St 0.21: 63)', 'swan': 'the goose\'s', 'swallow': 'doi:10.1242/jeb.204.15.2741: shoulder-wrist 98 deg at 10 m/s (bird 1: 48.0 + 5.03 V), the tip about 10 deg more'})
STROKE_SCALE = json.load(open(os.environ['STROKE_SCALE'])) if os.environ.get('STROKE_SCALE') else {}
HERON = json.loads(os.environ.get('HERON', '{}'))   # the egret fit: s (stroke), h (hand swing extra), lag (hand, cycles)
def scale_osc(c, sc):
    return {'a0': c['a0'], 'a': [x * sc for x in c['a']], 'b': [x * sc for x in c['b']]}
def lag_curve(c, lag):
    if not lag: return c
    return fit_auto(series(c, (PG - lag) % 1.0), nmax=4, nmin=2)
REAL['finch'] = dict(REAL['swallow']); REAL['finch'].update({'f_src': 'NO DATA (finch not researched): the swallow model stands in', 'b_src': 'the swallow', 'U_src': 'the swallow'})

# the world's birds (birds3d/shape/site/inkbirds.js: B_SPAN 3.2 m a mid bird x SORTS size)
WORLD_SIZE = {'goose': 1, 'ibis': 1, 'gull': 1.15, 'heron': 1.35, 'crow': 0.9, 'finch': 0.62, 'swallow': 0.75, 'stork': 1.25}
B_SPAN = 3.2

COUPLING = {   # wrist at each elbow angle (cadaver, the elbow moved and the wrist left to follow)
    'gull': {90: 54.0, 95: 60.7, 100: 67.6, 105: 75.2, 110: 84.4, 115: 94.1, 120: 103.9, 125: 113.6, 130: 122.7, 135: 131.5, 140: 141.7, 145: 151.7, 150: 160.7, 155: 166.7},
    'duck': {int(k): v for k, v in kinds_s['goose']['joints']['linkage']['curve_manus_by_elbow'].items()},
    'heron': {int(k): v for k, v in kinds_s['heron']['joints']['linkage']['curve_manus_by_elbow'].items()},
    'crow': {int(k): v for k, v in kinds_s['crow']['joints']['linkage']['curve_manus_by_elbow'].items()},
    'vulture': {int(k): v for k, v in kinds_s['stork']['joints']['linkage']['curve_manus_by_elbow'].items()},
    'swallow': {int(k): v for k, v in kinds_s['swallow']['joints']['linkage']['curve_manus_by_elbow'].items()},
    'pigeon': {60: 61, 80: 73, 90: 88, 100: 101, 110: 110, 120: 131, 130: 147, 140: 159, 150: 167},
}
COUPLING_SRC = {'gull': 'doi:10.6084/m9.figshare.c.5275490 gull curve (data CC BY 4.0)', 'duck': 'mallard (doi:10.6084/m9.figshare.8856161 data, CC BY 4.0): the goose and swan proxy',
                'heron': 'great blue heron (doi:10.6084/m9.figshare.8856161 data)', 'crow': 'northwestern crow (doi:10.6084/m9.figshare.8856161 data)', 'vulture': 'turkey vulture (doi:10.6084/m9.figshare.8856161 data): the stork proxy',
                'swallow': 'barn swallow (doi:10.6084/m9.figshare.8856161 data)', 'pigeon': 'pigeon (doi:10.6084/m9.figshare.8856161 data)'}

# per kind: skeleton (recommended fractions), coupling, the elbow at full spread
SK = {}
for k in ('gull', 'goose', 'swan', 'stork', 'heron', 'ibis', 'crow', 'swallow'):
    r = rec[k]
    SK[k] = {'shoulder': r['shoulder_offset'], 'humerus': r['humerus'], 'ulna': r['ulna'], 'cmc': r['cmc'], 'digit': r['digits'],
             'bones_end': r['bones_sum_with_shoulder'], 'primaries_beyond': r['primaries_beyond_bones']}
SK['finch'] = dict(SK['swallow'])
LINK = {'gull': ('gull', 154.0), 'goose': ('duck', 134.0), 'swan': ('duck', 134.0), 'stork': ('vulture', 145.0), 'heron': ('heron', 136.0),
        'ibis': ('heron', 136.0), 'crow': ('crow', 118.0), 'swallow': ('swallow', 133.0), 'finch': ('swallow', 133.0)}


def linkage(kind):
    c, Ef = LINK[kind]; s = SK[kind]
    return Linkage(s['humerus'], s['ulna'], s['shoulder'], COUPLING[c], Ef)


# the wrist's place in the spread wing (fractions of the semi-span), measured or from the bones
WRIST_MEASURED = {'gull': [0.37, 0.43, 'doi:10.6084/m9.figshare.c.5503989 markers / bones (../structure 2)'], 'heron': [0.47, 0.47, 'doi:10.6084/m9.figshare.c.5503989 markers'],
                  'crow': [0.395, 0.40, 'raven, doi:10.6084/m9.figshare.c.5503989 markers'], 'goose': [0.465, 0.50, 'doi:10.6084/m9.figshare.c.5503989 (not fully spread) / bones'],
                  'stork': [0.47, 0.57, 'bones / pelican proxy'], 'swan': [0.50, 0.52, 'bones'], 'ibis': [0.44, 0.46, 'bones'], 'swallow': [0.27, 0.30, 'bones']}

# ------------------------------------------------------------------------------------------------------ the channels
model = {'about': 'physics/model: a measured kinematic and structural model of the flapping wing, per kind (MODEL.md). Phase p: 0 = the top of the arm stroke. Fourier: f(p) = a0 + sum a_k cos 2 pi k p + b_k sin 2 pi k p. Angles deg; elevations + up, sweeps + forward, pitch/twist + leading edge up; the hand relative to the arm (+ above its line).',
         'kinds': {}, 'checks_targets': {}}


def chan(c, unit, src, basis, lic, note=None, N=None):
    o = rnd(c); o.update({'unit': unit, 'source': src, 'basis': basis, 'licence': lic})
    if note: o['note'] = note
    return o


BASIS = {'data': 'data: the source curve itself (open licence)', 'facts': 'facts: rebuilt here from ranges and phases a study-only source states (the digitised curve is not used)',
         'stand-in': 'stand-in: another species measured (named)', 'derived': 'derived: computed here from measured inputs through the structural model', 'estimate': 'estimate: no measurement exists (stated)'}


def twist_channels(kind, armc, real, chord_r=0.70, arm_r=0.30):
    """outer-wing and arm-section pitch: the barnacle goose's (the only twist record, study only: its ranges and
    phases), carried onto this bird's stroke (map_phase between the strokes' tops, fastest downs, bottoms and fastest
    ups) and scaled by this bird's own inflow angle at the hand and at the arm (atan of the section's peak flapping
    speed over the airspeed) relative to the goose's"""
    dst = stroke_marks(armc)
    ga = np.deg2rad(0.5 * BF['flap_gamma']['pp'])              # goose flap amplitude (rad)
    gb, gU, gf = 1.37, 18.0, 5.0                               # barnacle goose span (estimate), tunnel speed and rate (study facts)
    def inflow(f, amp, r, U): return np.degrees(np.arctan(TAU * f * amp * r / U))
    g_out = inflow(gf, ga, chord_r * gb / 2, gU); g_in = inflow(gf, ga, arm_r * gb / 2, gU)
    yk = series(armc, PG); amp = np.deg2rad(0.5 * np.ptp(yk))
    k_out = inflow(real['f'], amp, chord_r * real['b'] / 2, real['U']); k_in = inflow(real['f'], amp, arm_r * real['b'] / 2, real['U'])
    out = {}
    for name, fac, gi, ki in (('pitch_wrist', BF['pitch_wrist'], g_out, k_out), ('pitch_shoulder', BF['pitch_shoulder'], g_in, k_in)):
        pmin = map_phase(fac['pmin'], GM, dst); pmax = map_phase(fac['pmax'], GM, dst)
        y = shaped(pmin, pmax, 0.0, fac['pp'] * ki / gi)
        out[name] = (fit_auto(y, nmax=4, nmin=2), {'goose_inflow_deg': round(g_out if name == 'pitch_wrist' else g_in, 2), 'this_inflow_deg': round(ki, 2), 'scale': round(ki / gi, 3), 'pmin': round(pmin, 3), 'pmax': round(pmax, 3), 'pp': round(fac['pp'] * ki / gi, 2)})
    return out


def load_channel(armc, bendc, twc, extc_y, real, D):
    """the primaries' load through the beat (quasi-steady): dynamic pressure x residual incidence x the hand's spread
    area, at the outer wing (0.7 of the semi-span): the flapping inflow less the twist that cancels it; the mean
    incidence a0 is set so that the upstroke's (downward) peak is 1/2.2 of the downstroke's, the in-vivo strain ratio of
    pigeon primaries (doi:10.1242/jeb.201.22.3057). Normalised to +1 at its downstroke peak."""
    r = 0.70 * real['b'] / 2
    psi = np.deg2rad(series(armc, PG)); dpsi = np.deg2rad(dseries(armc, PG)) * real['f']   # rad/s
    zdot = r * dpsi * np.cos(psi)
    infl = np.arctan2(-zdot, real['U'])                     # + = air from below (downstroke)
    tw = np.deg2rad(series(twc, PG))
    q = (real['U'] ** 2 + zdot ** 2) / real['U'] ** 2
    area = np.clip(extc_y, 0.2, 1.0)
    best = None
    for a0 in np.linspace(0, 0.4, 801):
        lam = q * area * (a0 + infl + tw)
        mx, mn = lam.max(), lam.min()
        if mx <= 0: continue
        ratio = -mn / mx
        if best is None or abs(ratio - 1 / 2.2) < abs(best[1] - 1 / 2.2): best = (a0, ratio, lam / mx)
    a0, ratio, lam = best
    return fit_auto(lam, nmax=4, nmin=2), {'mean_incidence_deg': round(np.degrees(a0), 2), 'up_over_down': round(ratio, 3), 'peak_at': round(float(PG[np.argmax(lam)]), 3), 'trough_at': round(float(PG[np.argmin(lam)]), 3)}


def fold_from_extension(kind, arcc, lead=0.05):
    """the fold from the wing's measured extension (NTRS 20040075526's front-projected arc length over its maximum): invert the
    linkage's reach (the gull: its own measured fold table) for the elbow on the coupled path; the wrist follows the
    elbow by `lead` of a cycle (the elbow turns first: chukar XROMM 0.02-0.04 at the bottom, pigeon 0.08)"""
    L = linkage(kind)
    y = series(arcc, PG); y = y / y.max()
    if kind == 'gull':
        W = interp_table(np.clip(y, GULL_FOLD[:, 2].min(), 1.0), GULL_FOLD[:, 2], GULL_FOLD[:, 1])
        E = L.Einv(np.interp((PG + lead) % 1.0, PG, W, period=1.0))
    else:
        E = L.E_for_reach(np.clip(y, float(L.reach(60.0)), 1.0))
        W = L.W(np.interp((PG - lead) % 1.0, PG, E, period=1.0))
    return E, W, y


def pack_fold(kind, E, W):
    L = linkage(kind)
    if kind == 'gull':   # the measured table: ext and the hand stick's sweep by the wrist
        ext = interp_table(W, GULL_FOLD[:, 1], GULL_FOLD[:, 3] / 0.304); tau = interp_table(W, GULL_FOLD[:, 1], GULL_FOLD[:, 4])
    else:
        ext = L.ext(E); tau = L.tau(E, W)
    return ext, tau


# the primaries' fan with the wrist (pigeon, doi:10.6084/m9.figshare.11369364 data, CC BY): P10-P1 opens 10 deg (wrist 60) to 56 deg
# (wrist 135), ~0.61 deg per wrist degree; held at its spread value above 135 (no data beyond)
def fan(W): return 10.0 + (56.0 - 10.0) * np.clip((np.asarray(W, float) - 60.0) / 75.0, 0, 1)


SLOTS = {'gull': (0, 'none'), 'swallow': (0, 'none'), 'goose': (2, 'P10-P9 inner vane at 0.55-0.66, shallow'), 'heron': (2, 'P10-P9 at 0.66-0.68, shallow'),
         'ibis': (2, 'P10-P9 at 0.71'), 'swan': (3, 'P10-P8 at 0.57-0.63'), 'crow': (4, 'P10-P7 at 0.34-0.54, deep'), 'stork': (5, 'outer four inner-vane notches 0.37-0.54 + three outer-vane steps: 5-7 fingers'), 'finch': (0, 'no data')}

for kind in ('gull', 'goose', 'swan', 'stork', 'heron', 'ibis', 'crow', 'swallow', 'finch'):
    real = REAL[kind]; ch = {}; meta = {}
    if kind == 'gull':
        D = 0.604
        armc = coef(front['seagull']['psi1']); bendc = neg(coef(front['seagull']['psi2']))
        sg_ = STROKE_SCALE.get(kind, 1.0); armc = scale_osc(armc, sg_); bendc = scale_osc(bendc, sg_); meta['stroke_scale'] = sg_; meta['stroke_target_deg'] = STROKE_TARGET[kind]; meta['stroke_why'] = STROKE_WHY[kind]
        ch['arm_elev'] = chan(armc, 'deg', 'gull (Larus sp.), wild, front-view film: NTRS 20040075526 Eq. 11 psi1 (two harmonics as published), its oscillation x%.3f for the measured stroke size (%s)' % (sg_, STROKE_WHY[kind]), 'data', 'NASA work (US public domain; AIAA conference paper: the published coefficients cited as facts)')
        ch['hand_bend'] = chan(bendc, 'deg', 'gull: -psi2 of NTRS 20040075526 (the hand below the arm line in the front view)', 'data', 'as above')
        E, W, ext_meas = fold_from_extension('gull', coef(front['seagull']['arclen']))
        fsrc = 'gull extension (NTRS 20040075526 arc length, 0.71-1.00) through the gull fold table (doi:10.6084/m9.figshare.c.5503989 markers on the doi:10.6084/m9.figshare.c.5275490 coupled path, data CC BY 4.0)'
        etas = None
    elif kind in ('goose', 'swan'):
        D = 0.545
        armc = coef(front['goose']['psi1']); bendc = neg(coef(front['goose']['psi2']))
        sg_ = STROKE_SCALE.get(kind, 1.0); armc = scale_osc(armc, sg_); bendc = scale_osc(bendc, sg_); meta['stroke_scale'] = sg_; meta['stroke_target_deg'] = STROKE_TARGET[kind]; meta['stroke_why'] = STROKE_WHY[kind]
        sp = 'bar-headed goose (Anser indicus), wild, front-view film: NTRS 20040075526' + ('' if kind == 'goose' else ' (STAND-IN for the swan: Anatidae, continuous flappers; no swan kinematics found)')
        ch['arm_elev'] = chan(armc, 'deg', sp + ' psi1', 'data' if kind == 'goose' else 'stand-in', 'as NTRS 20040075526')
        ch['hand_bend'] = chan(bendc, 'deg', sp + ' -psi2', 'data' if kind == 'goose' else 'stand-in', 'as NTRS 20040075526')
        L = linkage(kind)
        E = np.full(NG, L.Ef); W = L.W(E); ext_meas = series(coef(front['goose']['arclen']), PG)
        fsrc = 'none: the goose wing does not extend and fold much (NTRS 20040075526 arc length 0.98-1.01); held spread'
        # the hand's in-plane lag (barnacle goose, study only: 12.6-17.5 deg p-p, most forward at 0.24-0.35, back at 0.83-0.91)
        dst = stroke_marks(armc)
        pmax = map_phase(BF['lag_eta']['pmax'], GM, dst); pmin = map_phase(BF['lag_eta']['pmin'], GM, dst)
        etas = fit_auto(shaped(pmin, pmax, 0.0, BF['lag_eta']['pp']), nmax=3, nmin=2)
        ch['hand_lag'] = chan(etas, 'deg', 'barnacle goose (doi:10.1017/S0001924000010939, wind tunnel 18 m/s): the outer wing\'s lag, %.1f deg p-p, most forward at %.2f, most back at %.2f of its stroke, carried onto this stroke (forward %.3f, back %.3f)' % (BF['lag_eta']['pp'], BF['lag_eta']['pmax'], BF['lag_eta']['pmin'], pmax, pmin), 'facts', 'study only (rights reserved): ranges and phases only', 'checked against the bar-headed goose film (doi:10.7554/eLife.44986 Video 2, CC BY): the tip moves forward early in the downstroke and back from mid-downstroke')
    elif kind in ('stork', 'heron', 'ibis'):
        D = float(os.environ.get('HERON_D', '0.61')) if kind == 'heron' else 0.545
        armc0 = coef(front['crane']['psi1'], 'coef_shape_2pct'); bendc0 = neg(coef(front['crane']['psi2'])); arcc0 = coef(front['crane']['arclen'])   # FIX: the arm as NTRS 20040075526 published it (two harmonics), not its fundamental
        if kind == 'heron' and abs(D - 0.545) > 1e-6:   # carry the crane's curves onto the heron's measured downstroke share (great egret film)
            wmap = warp_to(D, 0.545)
            armc = fit_auto(series(armc0, wmap(PG)), nmax=4, nmin=2); bendc = fit_auto(series(bendc0, wmap(PG)), nmax=4, nmin=2)
            arcc = fit_auto(series(arcc0, wmap(PG)), nmax=4, nmin=2)
            wnote = '; carried onto the heron\'s downstroke share 0.61 (great egret film, doi:10.1098/rspb.2019.1083 ESM M5, CC BY: tip reversals) by a smooth phase warp'
        else:
            armc, bendc, arcc = armc0, bendc0, arcc0; wnote = ''
        if kind == 'heron':
            sg_ = HERON.get('s', 1.0); armc = scale_osc(armc, sg_); bendc = scale_osc(bendc, sg_ * HERON.get('h', 1.0)); bendc = lag_curve(bendc, HERON.get('lag', 0.0))
            meta['stroke_scale'] = sg_; meta['egret_fit'] = HERON; meta['stroke_why'] = 'fitted to the great egret film (doi:10.1098/rspb.2019.1083 ESM M5, CC BY): silhouette overlap through the fitted camera (tools/heronfit.py)'
            wnote += '; its stroke x%.3f, the hand\'s swing x%.3f and lag %.3f cycle fitted to the great egret film (silhouettes through the fitted camera)' % (sg_, HERON.get('h', 1.0), HERON.get('lag', 0.0))
        else:
            sg_ = STROKE_SCALE.get(kind, 1.0); armc = scale_osc(armc, sg_); bendc = scale_osc(bendc, sg_); meta['stroke_scale'] = sg_; meta['stroke_target_deg'] = STROKE_TARGET[kind]; meta['stroke_why'] = STROKE_WHY[kind]
            wnote += '; its oscillation x%.3f for the measured stroke size (%s)' % (sg_, STROKE_WHY[kind])
        sp = 'crane (Grus sp.), wild, front-view film: NTRS 20040075526 (STAND-IN for the %s: a long-winged, slow-beating wild bird; no %s kinematics found)%s' % (kind, kind, wnote)
        ch['arm_elev'] = chan(armc, 'deg', sp + ' psi1', 'stand-in', 'as NTRS 20040075526')
        ch['hand_bend'] = chan(bendc, 'deg', sp + ' -psi2', 'stand-in', 'as NTRS 20040075526')
        arcc = {'a0': arcc['a0'], 'a': arcc['a'][:1], 'b': arcc['b'][:1]}   # the fundamental only (MODEL.md 3.3)
        E, W, ext_meas = fold_from_extension(kind, arcc)
        fsrc = 'crane extension (NTRS 20040075526 arc length; its FUNDAMENTAL only, 0.93 +- 0.04: the second harmonic, larger than the first, is read as a front-view artefact) through this kind\'s linkage (its bones, ../structure; coupling: %s)' % COUPLING_SRC[LINK[kind][0]]
        etas = None
    else:   # crow, swallow, finch: no joint-level record of their cruising flight. The stroke: the gull's measured
            # cruise (NTRS 20040075526) on the kind's measured scalars; the fold's timing: a small bird's measured (the pigeon's
            # tip and wrist reach, doi:10.3390/biomimetics9090555, CC BY); the fold's depth: the kind's measured span ratios (solved on the
            # form, tools/solve.js). The pigeon's own joint angles are slow flight (~6 m/s: a tip-reversal upstroke,
            # the hand swinging 90 deg forward at the bottom), not a cruising crow's or swallow's, so they are not used.
        D = {'crow': 0.55, 'swallow': 0.44, 'finch': 0.44}[kind]
        wmap = warp_to(D, 0.604)
        ya = series(coef(front['seagull']['psi1']), wmap(PG)); yb = -series(coef(front['seagull']['psi2']), wmap(PG))
        AMP = {'crow': 0.9 * STROKE_TARGET['crow'], 'swallow': 98.0, 'finch': 98.0}[kind] * STROKE_SCALE.get(kind, 1.0)   # FIX: the arm 0.9 of the tip's stroke (the gull's ratio, NTRS 20040075526); swallow doi:10.1242/jeb.204.15.2741
        sa = AMP / np.ptp(ya); ya = ya.mean() + sa * (ya - ya.mean())
        if False:
            sb = sa
            nsrc = ('the gull\'s cruise (NTRS 20040075526) (STAND-IN for the crow: no Corvus kinematics; the magpie gives scalars only): downstroke 0.55 (magpie 0.50-0.59, doi:10.1242/jeb.199.2.263, '
                    'study only); the stroke ESTIMATED at 95 deg p-p (small birds measured: pigeon 100 at 6 m/s, doi:10.3390/biomimetics9090555 CC BY; barn swallow 87-95 at 8-10 m/s, doi:10.1242/jeb.204.15.2741), the hand\'s swing scaled with it')
        else:
            A_ = 0.29; H_ = 1 - A_
            def tip_pp(sbv):
                bb = yb.mean() + sbv * (yb - yb.mean()); a = np.deg2rad(ya); h = np.deg2rad(ya + bb)
                return np.ptp(np.degrees(np.arctan2(A_ * np.sin(a) + H_ * np.sin(h), A_ * np.cos(a) + H_ * np.cos(h))))
            if kind == 'crow': A_ = 0.40; H_ = 1 - A_   # (the raven's wrist, 0.40 of the semi-span)
            TT_ = STROKE_TARGET['crow' if kind == 'crow' else 'swallow']
            TT_ = TT_ * STROKE_SCALE.get(('crow' if kind == 'crow' else 'swallow') + '_tip', 1.0)   # (the solve sets the hand's swing for this before the fold; iterated so the folded wing's tip shows the target)
            meta['stroke_target_deg'] = STROKE_TARGET['crow' if kind == 'crow' else 'swallow']
            sb = 1.0   # FIX: the hand's bend relative to the arm kept at the measured gull's size (NTRS 20040075526): scaled x1.5-2.3 it hung the hand
            # vertical below a level arm late in the upstroke (the judges' 'staple'), where the measured small birds fold the hand back
            # (swept) instead; the tip's stroke comes from the arm (crow: STROKE_SCALE; swallow: the measured 98 deg, doi:10.1242/jeb.204.15.2741)
            meta['tip_stroke_note'] = 'the arm sets the stroke; the hand\'s bend the gull\'s'; meta['stroke_why'] = STROKE_WHY['crow' if kind == 'crow' else 'swallow']
            nsrc = ('the gull\'s cruise (NTRS 20040075526) (STAND-IN for the barn swallow\'s curves) on the swallow\'s measured cruise: shoulder-wrist stroke 90 deg p-p (87-95 at 8-10 m/s), '
                    'shoulder-tip 99 deg (92-106), downstroke 0.44 (0.42-0.46) (doi:10.1242/jeb.204.15.2741, wind tunnel, study only: facts)' + (' (the FINCH: no data; the swallow stands in)' if kind == 'finch' else ''))
        meta['arm_scale'] = round(float(sa), 3); meta['hand_swing_scale'] = round(float(sb), 3)
        if kind == 'crow': nsrc = ('the gull\'s cruise (NTRS 20040075526) (STAND-IN for the crow\'s curves: no Corvus kinematics) on the crow\'s measured scalars: downstroke 0.55 (magpie 0.50-0.59, doi:10.1242/jeb.199.2.263, study only); the stroke ' + STROKE_WHY['crow'])
        else: nsrc = nsrc.replace('shoulder-wrist stroke 90 deg p-p (87-95 at 8-10 m/s), shoulder-tip 99 deg (92-106)', 'shoulder-wrist stroke 98 deg p-p at 10 m/s (bird 1: 48.0 + 5.03 V), shoulder-tip about 10 deg more (108)')
        yb = yb.mean() + sb * (yb - yb.mean())
        armc = fit_auto(ya, nmax=4, nmin=2); bendc = fit_auto(yb, nmax=4, nmin=2)
        ch['arm_elev'] = chan(armc, 'deg', nsrc + ': psi1', 'stand-in', 'NTRS 20040075526 (facts) scaled')
        ch['hand_bend'] = chan(bendc, 'deg', nsrc + ': -psi2', 'stand-in', 'as above')
        # the fold's timing: the pigeon's measured tip and wrist reach (re-zeroed at its arm's top, on this kind's D)
        p0 = pig['arm_flap']['phase_of_max']; pm = (pig['arm_flap']['phase_of_min'] - p0) % 1.0; wmp = warp_to(D, pm)
        def pg(name): return series(coef(pig[name]), (wmp(PG) + p0) % 1.0)
        for nm, key in (('semispan', 'fold_coord'), ('wristspan', 'fold_coord_wrist')):
            y = pg(nm); fcoord = (y.max() - y) / (y.max() - y.min())
            # FIX: the fold deepest at mid-upstroke and the wing most spread at mid-downstroke (magpie: 'wingspan and wristspan
            # were always maximal at mid-downstroke and minimal during mid-upstroke', doi:10.1242/jeb.199.2.263; barn swallow: the span
            # ratio mid-upstroke / mid-downstroke 0.21-0.24 at 10 m/s, doi:10.1242/jeb.204.15.2741): the pigeon's reach curve (its shape)
            # shifted so its deepest point falls at mid-upstroke
            pu_ = D + 0.5 * (1 - D); pmx_ = float(PG[np.argmax(fcoord)]); sh_ = (pu_ - pmx_) % 1.0
            # (the pigeon's slow-flight reach, so shifted, kept the wing half-folded through the top and into the downstroke, putting
            # the tip's top at 0.2 and its downstroke at 0.33 of the cycle, where the magpie's (>0.5 by the tip,
            # doi:10.1242/jeb.199.2.263) and the swallow's (0.44-0.49, doi:10.1242/jeb.204.15.2741) are longer): the fold as the measured phases state it, the wing spread
            # through the downstroke (span greatest at mid-downstroke), folding after the bottom to its deepest at mid-upstroke and
            # spread again by the top (the wrist 0.05 cycle ahead of the tip: the elbow and wrist lead, doi:10.1371/journal.pone.0063982)
            ld_ = 0.05 if nm == 'wristspan' else 0.0; u_ = ((PG + ld_ - D) % 1.0) / (1 - D)
            fcoord = np.where(u_ <= 1.0, np.sin(np.pi * np.clip(u_, 0, 1)) ** 2, 0.0); meta['fold_rule'] = 'raised cosine over the upstroke, deepest at mid-upstroke (doi:10.1242/jeb.199.2.263; doi:10.1242/jeb.204.15.2741: facts)'
            ch[key] = chan(fit_auto(fcoord, nmax=4, nmin=2), 'share (0 spread, 1 most folded)', 'the fold\'s timing: the pigeon\'s measured %s reach (doi:10.3390/biomimetics9090555 markers, CC BY: %s), re-zeroed at its arm\'s top, on this kind\'s downstroke share' % ('tip' if nm == 'semispan' else 'wrist', '0.08-0.264 m' if nm == 'semispan' else '0.037-0.103 m'), 'stand-in', 'CC BY 4.0')
        L = linkage(kind)
        fc = series(ch['fold_coord_wrist'], PG)
        E = L.Ef - (L.Ef - 90.0) * np.clip(fc, 0, 1); W = L.W(np.interp((PG - 0.05) % 1.0, PG, E, period=1.0)); ext_meas = None   # (documentation: the elbow to 90 at the deepest, the pigeon's measured 77-121 range's middle)
        fsrc = 'the fold\'s timing from the pigeon\'s measured reach (doi:10.3390/biomimetics9090555), its depth solved on the form for the kind\'s measured span ratios (crow: magpie span 0.16-0.20 and wrist span 0.36-0.38 at 8-10 m/s, doi:10.1242/jeb.199.2.263 Fig. 9; swallow: span 0.17-0.25 at 9-10 m/s, doi:10.1242/jeb.204.15.2741 Fig. 4: study-only facts)'
        meta['span_ratio_target'] = {'crow': (0.16, 0.20, 0.27), 'swallow': (0.17, 0.21, 0.25), 'finch': (0.17, 0.21, 0.25)}[kind]
        meta['wristspan_ratio_target'] = (0.33, 0.36, 0.43)
        etas = None
    # ---- the extension the posed bird must show (front-projected arc length over its maximum: the NTRS 20040075526 measure)
    if kind == 'gull' or kind in ('stork', 'heron', 'ibis'):
        ext_t = ext_meas
    elif kind in ('goose', 'swan'):
        ext_t = None
    else:
        ext_t = None
    if ext_t is not None:
        ch['ext_target'] = chan(fit_auto(np.asarray(ext_t), nmax=4, nmin=1), 'share (front-projected arc length / its maximum)', 'the measured extension (gull, crane: NTRS 20040075526) or this kind\'s linkage reach (crow, swallow): the observable the solve matches on the form', 'data' if kind == 'gull' else 'derived', 'as its source')
    # ---- the fold, packed
    ext, tau = pack_fold(kind, E, W)
    Lk = linkage(kind)
    tau_rel = tau - tau.min()   # the hand's sweep back of its spread set
    ch['elbow'] = chan(fit_auto(E, nmax=4, nmin=2), 'deg (interior, 180 straight)', 'derived: ' + fsrc, 'derived', 'CC BY inputs', 'reported for the checks (elbow-wrist coupling); the rig uses the wrist channel')
    ch['wrist'] = chan(fit_auto(W, nmax=4, nmin=2), 'deg (interior, 180 straight)', 'derived: ' + fsrc, 'derived', 'CC BY inputs')
    ch['ext'] = chan(fit_auto(ext, nmax=4, nmin=1), 'share (shoulder-wrist distance / spread)', 'derived through the linkage (gull: the measured table) from the wrist channel', 'derived', 'CC BY inputs')
    ch['hand_fold_sweep'] = chan(fit_auto(-tau_rel, nmax=4, nmin=1), 'deg (+ forward; the hand stick swept back of its spread set, relative to the arm line)', 'derived through the linkage (gull: the measured table)', 'derived', 'CC BY inputs')
    fz = fan(W); ch['fan_change'] = chan(fit_auto(fz - fz.max(), nmax=4, nmin=1), 'deg (the primaries\' fan P10-P1 less its spread value; - closed)', 'pigeon feather angles vs wrist (doi:10.6084/m9.figshare.11369364 data, CC BY 4.0): 10 deg at wrist 60 to 56 deg at 135', 'stand-in', 'CC BY 4.0')
    # ---- the arm's sweep: the barnacle goose's wrist moves 16 mm fore and aft on a ~0.3 m arm (+-1.6 deg), most
    # forward late in the downstroke (0.38 of its cycle), most back late in the upstroke (0.93)
    dst = stroke_marks(armc)
    m_ = BG['wrist_fore_aft']
    pmax = map_phase(m_['phase_of_max'], GM, dst); pmin = map_phase(m_['phase_of_min'], GM, dst)
    ch['arm_sweep'] = chan(fit_auto(shaped(pmin, pmax, 0.0, 2 * np.degrees(np.arctan(0.5 * m_['peak_to_peak'] / 0.30))), nmax=2, nmin=1), 'deg (+ forward, about the glide\'s set)', 'barnacle goose wrist fore-aft (doi:10.1017/S0001924000010939 slide 18, 16 m/s; study only: range and phases), carried onto this stroke', 'facts', 'study only: facts')
    # ---- twist
    tw = twist_channels(kind, armc, real)
    ch['pitch_arm'] = chan(tw['pitch_shoulder'][0], 'deg (+ LE up, about the glide\'s set)', 'barnacle goose shoulder-section pitch (doi:10.1017/S0001924000010939, 18 m/s: %.1f deg p-p) scaled by this bird\'s inflow at 0.3 semi-span (x%.2f), carried onto its stroke' % (BF['pitch_shoulder']['pp'], tw['pitch_shoulder'][1]['scale']), 'facts', 'study only: facts', json.dumps(tw['pitch_shoulder'][1]))
    ch['pitch_hand'] = chan(tw['pitch_wrist'][0], 'deg (+ LE up, absolute section pitch at the outer wing, about its mean)', 'barnacle goose outer-wing pitch (doi:10.1017/S0001924000010939: %.1f deg p-p, nose-down early in the downstroke, nose-up early in the upstroke) scaled by this bird\'s inflow at 0.7 semi-span (x%.2f)' % (BF['pitch_wrist']['pp'], tw['pitch_wrist'][1]['scale']), 'facts', 'study only: facts', json.dumps(tw['pitch_wrist'][1]))
    # ---- the primaries' load
    lam, lmeta = load_channel(armc, bendc, tw['pitch_wrist'][0], np.clip(ext, 0, 1), real, D)
    ch['tip_load'] = chan(lam, 'share (+1 the downstroke peak; - the upstroke\'s downward load)', 'quasi-steady load at 0.7 semi-span (flapping inflow less the twist) x dynamic pressure x the wing\'s extension; the mean incidence set so the upstroke peak is 1/2.2 of the downstroke\'s (in-vivo primary strain ratio, pigeon, doi:10.1242/jeb.201.22.3057)', 'derived', 'derived', json.dumps(lmeta))
    # ---- body
    rows = np.array(body['body_path_template']['rows'])
    heave_pp = {'gull': 0.0293, 'goose': 0.020, 'swan': 0.020, 'stork': 0.0214, 'heron': 0.025, 'ibis': 0.025, 'crow': 0.032, 'swallow': 0.032, 'finch': 0.032}[kind]
    hsrc = {'gull': 'lesser black-backed gull 39.2 mm p-p = 2.93 % of span (../dynamics, CC0)', 'crow': 'pigeon 20.7 mm = 3.2 % (doi:10.1371/journal.pbio.3000299, CC BY) (stand-in)', 'swallow': 'pigeon 3.2 % (doi:10.1371/journal.pbio.3000299) (stand-in)', 'finch': 'pigeon 3.2 % (stand-in)',
            'goose': 'barnacle goose shoulder 15-31 mm = 1-2 % (doi:10.1017/S0001924000010939, study: facts; noisy) -> 2 %', 'swan': 'the goose\'s 2 % (stand-in)', 'stork': 'white stork 41.0 mm p-p median (IQR 37.5-43.8) = 2.14 % of a 1.91 m span, 440 pure-flap bursts (doi:10.5441/001/1.78152p3q, CC0; analysed by judge-bio, storkan.py)'}.get(kind, 'ESTIMATE 2.5 %: the measured 2-3 % of span (gull 2.9, pigeon 3.2, goose 1-2) for an unmeasured kind')
    phase0 = D / 2.0   # FIX: the template's 0 (body lowest = the heave acceleration's upward peak) at MID-DOWNSTROKE: 'peaks in the heave acceleration occur in the middle of the downstroke' (doi:10.1098/rsif.2022.0168 Fig. 2, pigeon, accelerometer synchronised with video, CC BY)
    hz = np.interp((PG - phase0) % 1.0, rows[:, 0], rows[:, 2], period=1.0); sz = np.interp((PG - phase0) % 1.0, rows[:, 0], rows[:, 3], period=1.0)
    ch['heave'] = chan(fit_auto(hz * heave_pp, nmax=3, nmin=2), 'span (+ up)', hsrc + '; shape: the gull\'s measured heave (fundamental + 2nd harmonic, ../dynamics body_path_template), lowest at %.2f of the cycle (mid-downstroke: doi:10.1098/rsif.2022.0168 Fig. 2, CC BY)' % phase0, 'data' if kind in ('gull', 'stork') else ('stand-in' if kind in ('crow', 'swallow', 'finch', 'swan') else ('facts' if kind == 'goose' else 'estimate')), 'CC0 / CC BY')
    ch['surge'] = chan(fit_auto(sz * heave_pp, nmax=2, nmin=1), 'span (+ forward)', 'the gull\'s surge (12 mm p-p, an upper bound: body pitch leaks into it; ../dynamics, CC0), scaled with the heave', 'data' if kind == 'gull' else 'stand-in', 'CC0', 'the body path: a near-vertical ellipse, the body surging forward as it rises')
    # ---- assemble
    sk = SK[kind]
    m = {'D': round(float(D), 3), 'real': real,
         'world_span_m': round(B_SPAN * WORLD_SIZE.get(kind, 1), 3) if kind in WORLD_SIZE else None,
         'skeleton': sk, 'wrist_spread_measured': WRIST_MEASURED.get(kind),
         'linkage': {'coupling': COUPLING_SRC[LINK[kind][0]], 'coupling_table': COUPLING[LINK[kind][0]], 'elbow_spread': LINK[kind][1],
                     'wrist_spread': round(float(Lk.Wf), 1), 'tau_spread_deg': Lk.tau_f, 'hand_stick': round(float(Lk.Lh), 4)},
         'slots': {'n': SLOTS[kind][0], 'what': SLOTS[kind][1]},
         'channels': ch, 'meta': meta}
    if ext_meas is not None: m['extension_measured_minmax'] = [round(float(np.min(ext_meas)), 3), round(float(np.max(ext_meas)), 3)]
    if WORLD_SIZE.get(kind):
        bw = B_SPAN * WORLD_SIZE[kind]
        m['world'] = {'span_m': round(bw, 2), 'f_size_scaled_hz': round(real['f'] * np.sqrt(real['b'] / bw), 3), 'U_size_scaled_ms': round(real['U'] * np.sqrt(bw / real['b']), 2),
                      'spans_per_beat_real': round(real['U'] / (real['f'] * real['b']), 2)}
    model['kinds'][kind] = m

model['gull_linkage_check'] = {k: v for k, v in check_gull(linkage('gull')).items() if k != 'rows'}
model['gull_linkage_check']['note'] = 'the planar linkage (bones, the doi:10.6084/m9.figshare.c.5275490 coupling, a hand stick turning with the carpometacarpus) against the measured gull fold (doi:10.6084/m9.figshare.c.5503989 markers): wrist reach, the hand\'s sweep, the tip\'s lateral reach'
model['basis'] = BASIS
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f: json.dump(model, f, indent=1)
# summary
for k, m in model['kinds'].items():
    c = m['channels']
    def rng(n): y = series(c[n], PG); return '%.1f..%.1f' % (y.min(), y.max())
    print('%-8s D %.3f arm %s bend %s elbow %s wrist %s ext %s fold %s pitchH %s pitchA %s load-peak %s heave %s' % (k, m['D'], rng('arm_elev'), rng('hand_bend'), rng('elbow'), rng('wrist'), rng('ext'), rng('hand_fold_sweep'), rng('pitch_hand'), rng('pitch_arm'), json.loads(c['tip_load']['note'])['peak_at'], rng('heave')))
print('gull linkage check', model['gull_linkage_check'])
