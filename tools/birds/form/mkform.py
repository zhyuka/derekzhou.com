#!/usr/bin/env python3
"""mkform.py (form designer, majestic round): generates src/birds/model/facetform.js, the faceted solid of the tattoo's M.

The bird is the M and nothing else: two wings meeting at the body point (no head, tail, neck, bill, legs or body
bulge). Each wing is a low-poly solid of a few planes:
  - the arm panel (root R to wrist W) and the inner hand panel (wrist W to the knuckle K), either side of the wrist's
    fold line; each a faceted wedge: the leading edge crease, the bevel up to the crest, the upper plane back to the
    sharp trailing edge, and the lower plane and lower bevel under it (4 facets a panel, 8 triangles);
  - the knuckle's cap (the hand's thickness closed at K, 2 triangles);
  - 3 primaries (flat paper, both sides lit), their bases on the hand at K and their tips on their own joints (curl,
    lag, twist, spread), tiling the hand's tip with no overlap (no coplanar overlap, no depth fight).
The two wings share the root section (on the body: a crease, no body). Units: spans (a straight wing tip to tip 1),
body frame x forward, y left, z up. Each vertex is given in its bone's frame:
  0 body; per side (L then R, R mirrored in y): 1 arm, 2 wrist (the fold: the arm turned by half the hand's turn),
  3 hand, 4..6 the primaries' tips (pivot at K's leading edge).
Run: python3 -I tools/birds/form/mkform.py [OUT]  (writes OUT, by default src/birds/model/facetform.js; CI runs it
again and fails unless its output is that file byte for byte). No DOM, no clock, no entropy.
"""
import json, math, os, sys, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))   # (tools/birds/form/ -> the repository)

# The last round's per-kind flight data, kept (birdform.js 23a8b00b): size, beat rate band (Hz), airspeed (m/s), bound,
# soar, the arm's length A (spans), the glide [arm dih, swp, twi, ext, hand dih, swp, twi] (deg), the beat params
# (the stand-in beat only: the motion designer's beat replaces it), the burst's entry phase.
LAST = {
 "gull":   dict(size=1.15, hz=[2.2, 2.6], air=11, bound=False, soar=False, A=0.235, glide=[30.76, 8.46, 2, 1, -52.79, -4.98, -2], entry=0.7586),
 "goose":  dict(size=1.0, hz=[2.3, 2.7], air=18, bound=False, soar=False, A=0.235, glide=[36.13, 9.83, 2, 1, -62.51, -4.96, -2], entry=0.7586),
 "ibis":   dict(size=1.0, hz=[2.6, 3.0], air=13, bound=False, soar=False, A=0.235, glide=[36.36, 10.03, 2, 1, -62.81, -4.97, -2], entry=0.7586),
 "heron":  dict(size=1.35, hz=[1.9, 2.2], air=10, bound=False, soar=False, A=0.185, glide=[37.15, -0.03, 2, 1, -64.2, -16.01, -2], entry=0.7643),
 "crow":   dict(size=0.9, hz=[2.8, 3.2], air=12, bound=False, soar=False, A=0.24, glide=[37.79, 8.79, 2, 1, -66.79, -4.96, -2], entry=0.7586),
 "finch":  dict(size=0.62, hz=[5.0, 6.0], air=9, bound=True, soar=False, A=0.24, glide=[37.67, 8.36, 2, 1, -66.79, -4.95, -2], entry=0.7586),
 "swallow":dict(size=0.75, hz=[3.8, 4.6], air=9, bound=False, soar=False, A=0.155, glide=[32.71, -0.01, 2, 1, -58.16, -11.69, -2], entry=0.7643),
 "stork":  dict(size=1.25, hz=[1.9, 2.2], air=11, bound=False, soar=True, A=0.235, glide=[30.71, 8.27, 2, 1, -52.88, -4.98, -2], entry=0.7586),
}

# THE FORM, per kind (spans; a straight wing's half-span 0.5 = A + the hand H):
#   cR, cW, cK  chords at the root, the wrist and the knuckle (K at kf of the hand); the strip was .080 / .065 / .040
#   tR, tW, tK  thickness (crest above the chord line + the lower ridge below it) at R, W, K
#   crest       where the crest stands, a share of the chord back from the leading edge (the bevel's depth)
#   up          the share of the thickness above the chord line (camber: the upper bevel the steeper)
#   kx          the knuckle's leading edge, back of the hand's line (spans: the hand's leading edge sweeps back a little)
#   prim        the primaries: base cuts at K (shares of cK from the leading edge), each one's length (share of what
#               is left of the hand past K) and its tip's width (share of its base: pointed .2, fingered .5)
#   tipg        the glide's tip set [dih (curl), swp, twi, spread] (deg): soaring kinds spread their fingers and curl them up
FORM = {   # (final, round 1: every chord about 0.85 of the first cut's and the broad kinds' hands slimmer, their glide's
            #  tip curl taken out: the A1 sweeps (FORM.md 3) showed the wider chords cost 0.01-0.07 of A1 at 40 px)
 "gull":    dict(cR=0.085, cW=0.080, cK=0.056, kf=0.42, tR=0.020, tW=0.015, tK=0.007, crest=0.27, up=0.64, kx=0.008,
                 fan=dict(cut=[0.38, 0.70], f=[0.30, 0.62], round=0.00, x0=-0.004), tipg=[0, 0, 0, 0]),
 "goose":   dict(cR=0.090, cW=0.085, cK=0.061, kf=0.42, tR=0.021, tW=0.016, tK=0.008, crest=0.27, up=0.62, kx=0.008,
                 fan=dict(cut=[0.38, 0.70], f=[0.30, 0.62], round=0.04, x0=-0.004), tipg=[0, 0, 0, 0]),
 "ibis":    dict(cR=0.092, cW=0.088, cK=0.066, kf=0.42, tR=0.021, tW=0.016, tK=0.008, crest=0.27, up=0.62, kx=0.006,
                 fan=dict(cut=[0.38, 0.70], f=[0.32, 0.64], round=0.08, x0=-0.006), tipg=[0, 0, 0, 3]),
 "heron":   dict(cR=0.094, cW=0.090, cK=0.063, kf=0.38, tR=0.022, tW=0.017, tK=0.008, crest=0.28, up=0.62, kx=0.004,
                 fan=dict(cut=[0.36, 0.68], f=[0.32, 0.64], round=0.06, x0=-0.008), tipg=[0, 0, 0, 2]),
 "crow":    dict(cR=0.097, cW=0.095, cK=0.072, kf=0.40, tR=0.022, tW=0.017, tK=0.008, crest=0.28, up=0.62, kx=0.004,
                 fan=dict(cut=[0.36, 0.68], f=[0.34, 0.66], round=0.12, x0=-0.008), tipg=[0, 0, 0, 4]),
 "finch":   dict(cR=0.095, cW=0.092, cK=0.071, kf=0.42, tR=0.021, tW=0.016, tK=0.008, crest=0.27, up=0.62, kx=0.006,
                 fan=dict(cut=[0.38, 0.70], f=[0.32, 0.64], round=0.10, x0=-0.008), tipg=[0, 0, 0, 2]),
 "swallow": dict(cR=0.078, cW=0.070, cK=0.046, kf=0.40, tR=0.018, tW=0.013, tK=0.006, crest=0.26, up=0.64, kx=0.012,
                 fan=dict(cut=[0.40, 0.72], f=[0.28, 0.60], round=-0.04, x0=-0.006), tipg=[0, 0, 0, 0]),
 "stork":   dict(cR=0.098, cW=0.096, cK=0.072, kf=0.36, tR=0.023, tW=0.017, tK=0.008, crest=0.28, up=0.62, kx=0.004,
                 fan=dict(cut=[0.36, 0.68], f=[0.34, 0.66], round=0.10, x0=-0.010), tipg=[2, 0, 0, 4]),
}
CHORD_K = float(os.environ.get('CHORD_K', '1'))
ROOT_K = float(os.environ.get('ROOT_K', '0.5'))   # the root's chord, a share of the arm's (cR): the M's valley at the body (FORM.md 3)
THICK_K = float(os.environ.get('THICK_K', '1'))

# the tip's three pleats on their joints: the outermost (the leading edge's, to the point) takes the most of the tip
# set, the inner ones less (the trailing edge's pleats curl and twist less); spread fans them back from the point
PRIM_W = dict(curl=[1.0, 0.8, 0.6], swp=[1.0, 0.85, 0.7], twist=[1.0, 0.8, 0.6], spread=[0.0, -0.5, -1.0])

BONES = ["body", "armL", "wristL", "handL", "tipL0", "tipL1", "tipL2", "armR", "wristR", "handR", "tipR0", "tipR1", "tipR2"]


def section(c, t, crest, up, x_le):
    """the wedge's section at a station: leading edge, crest, trailing edge, lower ridge (x, z in the bone's frame)"""
    return [(x_le, 0.0), (x_le - crest * c, up * t), (x_le - c, 0.0), (x_le - crest * c, -(1 - up) * t)]


def build(kind):
    L, F = LAST[kind], FORM[kind]
    A = L["A"]; H = 0.5 - A
    cR, cW, cK = F["cR"] * CHORD_K, F["cW"] * CHORD_K, F["cK"] * CHORD_K
    tR, tW, tK = F["tR"] * THICK_K, F["tW"] * THICK_K, F["tK"] * THICK_K
    yK = F["kf"] * H
    V, B, T, FAC, nm = [], [], [], [], {}

    def vert(p, b, name):
        V.append([round(p[0], 6), round(p[1], 6), round(p[2], 6)]); B.append(b); nm[name] = len(V) - 1
        return len(V) - 1

    def facet(name, cls, side, panel):
        FAC.append(dict(name=name, cls=cls, side=side, panel=panel)); return len(FAC) - 1

    def tri(sg, a, b, c, f):   # outward winding on the left wing; mirrored (reversed) on the right
        T.append([a, b, c, f] if sg > 0 else [a, c, b, f])

    # the root section: on the body, shared by both wings (a crease, no body), its chord ROOT_K of the arm's (cR): the
    # two arms' trailing edges meet in a V at the body, the tattoo's M's valley (the strip's own notch, kept)
    rk = F.get("rootK", ROOT_K)
    for i, (x, z) in enumerate(section(rk * cR, tR, min(0.8, F["crest"] / rk), F["up"], 0.0)):
        vert((x, 0.0, z), 0, "R%d" % i)
    fan = F["fan"]
    for si, side in enumerate("LR"):
        sg = 1 if side == "L" else -1
        bW, bH = 2 + 6 * si, 3 + 6 * si
        # the wrist section: in the fold's frame (its origin the wrist joint)
        for i, (x, z) in enumerate(section(cW, tW, F["crest"], F["up"], 0.0)):
            vert((x, 0.0, z), bW, "W%s%d" % (side, i))
        # the knuckle section: on the hand, yK out along it, its leading edge kx back of the hand's line
        for i, (x, z) in enumerate(section(cK, tK, F["crest"], F["up"], -F["kx"])):
            vert((x, sg * yK, z), bH, "K%s%d" % (side, i))
        # the fan's base: K's leading edge (B0), two cuts along its chord line (B1, B2), K's trailing edge (B3)
        vert((-F["kx"] - fan["cut"][0] * cK, sg * yK, 0.0), bH, "B%s1" % side)
        vert((-F["kx"] - fan["cut"][1] * cK, sg * yK, 0.0), bH, "B%s2" % side)
        # the fan's edge: T0 the point (the leading edge runs to it), T1 and T2 along the trailing edge from it back
        # to K's trailing edge (a share f of the way, pushed out by round of the hand left past K: a blunter tip).
        # Each in its own joint's frame: the pivot (origin) is K's leading edge
        Lh = H - yK
        T0 = (fan["x0"], Lh)
        B3 = (-cK, 0.0)
        for j, fj in ((1, fan["f"][0]), (2, fan["f"][1])):
            x = T0[0] + (B3[0] - T0[0]) * fj; y = T0[1] + (B3[1] - T0[1]) * fj
            y += fan["round"] * Lh * math.sin(math.pi * fj) * (1 - fj)
            vert((x, sg * y, 0.0), 4 + j + 6 * si, "T%s%d" % (side, j))
        vert((T0[0], sg * T0[1], 0.0), 4 + 6 * si, "T%s0" % side)
        Rs = [nm["R%d" % i] for i in range(4)]
        Ws = [nm["W%s%d" % (side, i)] for i in range(4)]
        Ks = [nm["K%s%d" % (side, i)] for i in range(4)]
        # the arm (R -> W) and the inner hand (W -> K): the wedge's four faces each
        for S0, S1, panel in ((Rs, Ws, "arm"), (Ws, Ks, "hand")):
            for k, cls in enumerate(["bevel_up", "upper", "lower", "bevel_dn"]):
                a0, a1 = S0[k], S0[(k + 1) % 4]; b0, b1 = S1[k], S1[(k + 1) % 4]
                f = facet("%s_%s_%s" % (panel, cls, side), cls, side, panel)
                tri(sg, a0, b0, b1, f); tri(sg, a0, b1, a1, f)
        # the knuckle's cap: the hand's thickness closed at K
        f = facet("cap_%s" % side, "cap", side, "cap")
        tri(sg, Ks[0], Ks[2], Ks[1], f); tri(sg, Ks[0], Ks[3], Ks[2], f)   # (outward: along +y on the left)
        # the tip's three pleats (flat paper, both sides lit): quads B0 B1 T1 T0 and B1 B2 T2 T1, the triangle B2 B3 T2
        Bs = [Ks[0], nm["B%s1" % side], nm["B%s2" % side], Ks[2]]
        Ts = [nm["T%s0" % side], nm["T%s1" % side], nm["T%s2" % side]]
        f = facet("pleat0_%s" % side, "pleat", side, "pleat0"); tri(sg, Bs[0], Ts[0], Ts[1], f); tri(sg, Bs[0], Ts[1], Bs[1], f)
        f = facet("pleat1_%s" % side, "pleat", side, "pleat1"); tri(sg, Bs[1], Ts[1], Ts[2], f); tri(sg, Bs[1], Ts[2], Bs[2], f)
        f = facet("pleat2_%s" % side, "pleat", side, "pleat2"); tri(sg, Bs[2], Ts[2], Bs[3], f)
    chain = [nm["TL0"], nm["KL0"], nm["WL0"], nm["R0"], nm["WR0"], nm["KR0"], nm["TR0"]]
    trail = [nm["TL0"], nm["TL1"], nm["TL2"], nm["KL2"], nm["WL2"], nm["R2"], nm["WR2"], nm["KR2"], nm["TR2"], nm["TR1"], nm["TR0"]]
    # the last round's 16 points (the planner's lean, boxes and legacy code): 0 tip, 1 wrist, 2 shoulder, 3 the
    # shoulder's trailing edge, 4 the wrist's, 5 the hand's (K); 6-11 the right's; 12-15 the body point (-1)
    p16 = [nm["TL0"], nm["WL0"], nm["R0"], nm["R2"], nm["WL2"], nm["KL2"], nm["TR0"], nm["WR0"], nm["R0"], nm["R2"], nm["WR2"], nm["KR2"], -1, -1, -1, -1]
    return dict(A=A, H=H, yK=yK, v=[c for p in V for c in p], b=B, tri=[c for t in T for c in t[:3]], tf=[t[3] for t in T],
                facets=FAC, chain=chain, trail=trail, p16=p16,
                dims=dict(cR=cR, cW=cW, cK=cK, tR=tR, tW=tW, tK=tK, crest=F["crest"], up=F["up"], kf=F["kf"], kx=F["kx"], fan=fan),
                tipg=F["tipg"])


def main():
    out = dict(
        about="facetform.js: the tattoo's M as a faceted solid (generated by tools/birds/form/mkform.py; do not edit by hand)",
        units="spans; body frame x forward, y left, z up; each vertex in its bone's frame",
        bones=BONES, primw=PRIM_W,
        pose="22 floats: per side (L 0-10, R 11-21) arm dih, swp, twi, ext; hand dih, swp, twi; tip dih (curl), swp, twi, spread (deg; ext a share; swp + forward)",
        kinds={})
    for k in LAST:
        g = build(k)
        L = LAST[k]
        g.update(size=L["size"], hz=L["hz"], air=L["air"], bound=L["bound"], soar=L["soar"], glide=L["glide"], entry=L["entry"])
        out["kinds"][k] = g
    js = json.dumps(out, separators=(",", ":"))
    dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "src", "birds", "model", "facetform.js")
    head = ("// facetform.js, the ink birds' wing model (src/birds/model/, served as written). Generated by tools/birds/form/mkform.py:\n"
            "// do not edit by hand. Its comments keep the tags of the development record it came from, outside this repository.\n"
            "/* facetform.js (majestic round, form): the tattoo's M as a faceted, low-poly solid. Generated by\n"
            "   tools/birds/form/mkform.py; do not edit by hand. Two wings meeting at the body point and nothing else (no head,\n"
            "   tail, neck, bill, legs or body bulge): per wing an arm panel and an inner hand panel either side of the wrist's\n"
            "   fold line, each a faceted wedge (the leading edge crease, the bevel up to the crest, the upper plane to the sharp\n"
            "   trailing edge, the lower plane and bevel under it), the knuckle's cap, and three flat primaries on their own\n"
            "   joints. Posed by facetpose.js. No DOM, no clock, no entropy. */\n")
    with open(dst, "w") as f:
        f.write(head + "self.FACETFORM = " + js + ";\n")
    n = out["kinds"]["gull"]
    print("wrote", dst, "md5", hashlib.md5(open(dst, "rb").read()).hexdigest()[:8], "gull: verts", len(n["v"]) // 3, "tris", len(n["tri"]) // 3, "facets", len(n["facets"]))


if __name__ == "__main__":
    main()
