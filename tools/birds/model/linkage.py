# The wing's planar linkage (structure model): shoulder, humerus, elbow, ulna/radius, wrist, hand stick.
# Used by build_model.py. Validated on the gull against the doi:10.6084/m9.figshare.c.5503989 marker fold table (see check_gull()).
# Units: fractions of the semi-span (midline to wingtip, wing spread). Angles in degrees.
import numpy as np

D2R = np.pi / 180.0


def interp_table(x, xs, ys):
    xs = np.asarray(xs, float); ys = np.asarray(ys, float)
    o = np.argsort(xs)
    return np.interp(x, xs[o], ys[o])


class Linkage:
    """h, u: humerus and ulna (semi-span fractions); s0: the shoulder's offset from the midline;
    coupling: {elbow: wrist} (interior angles, 180 = straight; doi:10.6084/m9.figshare.8856161 / doi:10.6084/m9.figshare.c.5275490 data);
    Ef: the elbow at full spread; tau_f: the hand stick's sweep back of the shoulder-wrist line at full spread
    (gull measured 22.2 deg, doi:10.6084/m9.figshare.c.5503989 markers); the hand stick (wrist -> tip) turns with the carpometacarpus
    (gull: within 3 deg over the fold, check_gull)."""

    def __init__(self, h, u, s0, coupling, Ef, tau_f=22.2):
        self.h, self.u, self.s0 = h, u, s0
        ks = sorted(coupling)
        self.cE = np.array([float(k) for k in ks]); self.cW = np.array([float(coupling[k]) for k in ks])
        self.Ef = Ef; self.Wf = self.W(Ef); self.tau_f = tau_f
        self.df = self.d(Ef)
        self.Lh = (1.0 - s0 - self.df) / np.cos(tau_f * D2R)   # hand stick so that the spread tip reaches 1

    def W(self, E):            # the coupled wrist at an elbow angle (the default path; flight can depart from it)
        return np.interp(E, self.cE, self.cW)

    def Einv(self, W):         # the elbow on the coupled path for a wrist angle
        o = np.argsort(self.cW)
        return np.interp(W, self.cW[o], self.cE[o])

    def d(self, E):            # shoulder-wrist distance (law of cosines)
        E = np.asarray(E, float)
        return np.sqrt(self.h ** 2 + self.u ** 2 - 2 * self.h * self.u * np.cos(E * D2R))

    def gamma(self, E):        # angle at the wrist between the ulna and the shoulder-wrist line
        return np.arcsin(np.clip(self.h * np.sin(np.asarray(E, float) * D2R) / self.d(E), -1, 1)) / D2R

    def cmc_back(self, E, W):  # the carpometacarpus swept back of the shoulder-wrist line (deg, + back)
        return (180.0 - W) - self.gamma(E)

    def tau(self, E, W):       # the hand stick's sweep back of the shoulder-wrist line
        return self.tau_f + (self.cmc_back(E, W) - self.cmc_back(self.Ef, self.Wf))

    def ext(self, E):          # the rig's ext: the shoulder-wrist distance over its spread value
        return self.d(E) / self.df

    def reach(self, E, W=None):  # the tip's lateral reach (arm line lateral), over the spread reach (1)
        if W is None: W = self.W(E)
        return self.s0 + self.d(E) + self.Lh * np.cos(self.tau(E, W) * D2R)

    def E_for_reach(self, r):  # invert reach(E) on the coupled path (monotone over the flight range)
        Es = np.linspace(max(40.0, self.cE.min()), self.Ef, 400)
        R = self.reach(Es)
        o = np.argsort(R)
        return np.interp(r, R[o], Es[o])


# The gull's fold table (doi:10.6084/m9.figshare.c.5503989 markers, L. glaucescens 20_0341, on the doi:10.6084/m9.figshare.c.5275490 coupled path): E, W, tip
# reach fraction (lateral), wrist reach (m), hand stick swept back of the shoulder-wrist line (deg)
GULL_FOLD = np.array([[90.9, 54.3, 0.158, 0.224, 103.7], [95.4, 60.5, 0.198, 0.233, 101.1], [100.1, 68.3, 0.292, 0.240, 93.5],
                      [105.6, 74.9, 0.345, 0.251, 90.0], [109.2, 84.8, 0.451, 0.257, 81.4], [114.7, 93.3, 0.517, 0.265, 76.5],
                      [119.5, 104.9, 0.609, 0.272, 68.6], [124.5, 113.3, 0.695, 0.279, 61.3], [129.1, 122.1, 0.812, 0.287, 49.6],
                      [135.4, 131.5, 0.853, 0.293, 45.1], [140.7, 142.4, 0.913, 0.299, 37.2], [145.1, 151.4, 0.938, 0.302, 33.6],
                      [149.9, 158.3, 0.964, 0.305, 29.6], [147.3, 165.9, 1.0, 0.304, 22.2]])


def check_gull(L):
    """The linkage against the measured gull table: wrist reach, hand sweep and tip reach, rms and max."""
    out = []
    for E, W, tr, wr, sb in GULL_FOLD:
        out.append((E, W, float(L.ext(E)), wr / 0.304, float(L.tau(E, W)), sb, float(L.reach(E, W)), tr))
    a = np.array(out)
    return {
        'wrist_reach_rms': float(np.sqrt(np.mean((a[:, 2] - a[:, 3]) ** 2))),
        'sweep_rms_deg': float(np.sqrt(np.mean((a[:, 4] - a[:, 5]) ** 2))), 'sweep_max_deg': float(np.max(np.abs(a[:, 4] - a[:, 5]))),
        'reach_rms': float(np.sqrt(np.mean((a[:, 6] - a[:, 7]) ** 2))), 'reach_max': float(np.max(np.abs(a[:, 6] - a[:, 7]))),
        'rows': [[round(x, 3) for x in r] for r in out]}
