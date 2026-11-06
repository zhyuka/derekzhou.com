# LICENSES (the wing model's data)

The served wing data, src/birds/model/model.js, is made by make.py here from the derived data in `data/`
(`kinematics/`, `structure/`, `dynamics/`: each folder's `LICENSES.md` names its sources and their licences, and each
dataset's own `meta.licence` governs its numbers). Nothing here was downloaded for this repository; the data came over
from the research that made it, whole, but for the barnacle goose (below).

The served file keeps the numbers and one credits comment; each number's `source`, `basis` and `licence` are in
`model_full.json` beside make.py:

- **data / derived:** curves or tables from open sources (CC0, CC BY, US federal works), or computed from them through
  the structural model. Usable with the attributions below.
- **facts:** ranges, phases and scalars that a study-only (rights-reserved) source states, rebuilt as smooth curves.
  No digitised curve, figure, image or file from those sources is kept here or shipped: the barnacle goose's
  (Dimitriadis et al. 2015) are kept as the facts alone, `data/kinematics/goose_barnacle_facts.json`. The facts are
  cited.
- **stand-in / estimate:** as stated per channel.

## Open sources (usable with attribution)

| source | used for | licence |
|---|---|---|
| Liu T, Kuykendoll K, Rhew R, Jones S (2004) Avian wings. AIAA Paper 2004-2186 (NASA Langley; NTRS 20040075526) | the gull's, bar-headed goose's and crane's published Fourier coefficients (arm, hand, extension) | NASA work; the kinematics task recorded it as US public domain, the structure task as "facts only (cite)" (AIAA republication). Cited as facts; the PDF is not redistributed |
| Harvey C, Baliga VB, Wong JCM, Altshuler DL, Inman DJ (2022) Nature 603: 648; data figshare 10.6084/m9.figshare.c.5503989 | the gull's fold table (markers), bones, the spread wrist places | data CC BY 4.0 |
| Harvey C, Baliga VB, Goates CD, Hunsaker DF, Inman DJ (2021) J R Soc Interface 18: 20210132; data figshare 10.6084/m9.figshare.c.5275490 | the gull's elbow-wrist coupling | data CC BY 4.0 |
| Baliga VB, Szabo I, Altshuler DL (2019) Sci Adv 5: eaaw6670; data figshare 10.6084/m9.figshare.8856161 | the couplings of heron, crow, mallard, turkey vulture, swallow, pigeon; bones | data CC BY 4.0 |
| Matloff LY et al. (2020) Science 367: 293; data figshare 10.6084/m9.figshare.11369364 | the primaries' fan against the wrist | data CC BY 4.0 |
| Shen Y, Zhang S, Huang W, Shang C, Sun T, Shi Q (2024) Biomimetics 9: 555 (supplementary markers) | the pigeon's reach timing (the small birds' fold) | CC BY 4.0 |
| Baier DB, Gatesy SM, Dial KP (2013) PLoS ONE 8: e63982 | the elbow's lead over the wrist | CC BY 3.0 |
| Wang X, McGowan AJ, Dyke GJ (2011) PLoS ONE 6: e28672; Alerstam T et al. (2007) PLoS Biol 5: e197 | bones; spans, masses, cruise speeds, the frequency benchmark's morphology | CC BY |
| Shamoun-Baranes J et al. (2016) Phil Trans R Soc B 371: 20150395; data Zenodo 10.5281/zenodo.4963689 | the gull's frequency, heave, surge, flight-mode shares, variation | CC0 |
| Flack A et al. (2016) Sci Adv 2: e1500931; data doi:10.5441/001/1.78152p3q | the white stork's frequency and flapping share | CC0 |
| Weinzierl R et al. (2016) Ecol Evol 6: 8706 | stork thermalling circles | CC BY 4.0 |
| Wehner H, Fritz J, Voelkl B (2022) J Ornithol 163: 671 | the bald ibis's frequency and flap-glide bouts | CC BY 4.0 |
| Taylor LA et al. (2019) PLoS Biol 17: e3000299 | the pigeon's heave and its phase; frequency changes made in the upstroke | CC BY 4.0 |
| Krishnan K et al. (2022) J R Soc Interface 19: 20220168 | the heave's phase; amplitude and frequency independence | CC BY 4.0 |
| Meir JU et al. (2019) eLife 8: e44986 (Supplementary file 4; Video 2) | the bar-headed goose's stroke amplitude and timing; the goose film check | CC0 (data), CC BY 4.0 (video) |
| Berg KS, Delgado S, Mata-Betancourt A (2019) Proc R Soc B 286: 20191083 (ESM M5; Appendix I) | the great egret film: downstroke share, landmarks for the footage check | CC BY 4.0 |
| Matos MJR, "4K Free Stock Footage: Seagulls: Regular and Slow Motion" (Internet Archive) | the gull filmed from below (landmarks) and gliding (front profile) | CC BY 4.0 |
| Corcoran AJ, Hedrick TL (2019) eLife 8: e45071 | no phase locking in shorebird Vs | CC BY 4.0 |
| Reynolds KV, Thomas ALR, Taylor GK (2014) J R Soc Interface 11: 20140645; Sato K et al. (2009) PLoS ONE 4: e5400; Chizhikova S et al. (2025) J Exp Biol 228: jeb249393; KleinHeerenbrink M et al. (2017) dataset figshare 4236305 | wing tucks; frequency scaling; swallow glides; jackdaw glide spans | CC BY |
| The Feather Atlas, US Fish & Wildlife Service Forensics Laboratory | slot counts per kind (numbers only) | US federal work |

## Study-only sources: facts only (cited, nothing from the files shipped)

| source | facts used |
|---|---|
| Dimitriadis G, Gardiner J, Tickle P, Codd J, Nudds R (2015) Aeronaut J 119: 1-30 (via the first author's 2015 talk) | the barnacle goose's section pitch (ranges, phases), hand lag, wrist fore-aft path, heave range |
| Pennycuick CJ (2001) J Exp Biol 204: 3283 | wild frequencies (heron, swan, crow, gulls); the benchmark formula |
| Park KJ, Rosén M, Hedenström A (2001) J Exp Biol 204: 2741 | the barn swallow's stroke, downstroke share, span ratio, upstroke pauses |
| Tobalske BW, Dial KP (1996) J Exp Biol 199: 263 | the magpie's downstroke share, span and wrist-span ratios; glide spans |
| Corning WR, Biewener AA (1998) J Exp Biol 201: 3057 (abstract) | the primaries' strain ratio 2.2 and peak strain |
| Portugal SJ et al. (2014) Nature 505: 399; Voelkl B et al. (2015) PNAS 112: 2115 | the ibis V's spatial phase rule and formation dynamics |
| Bishop CM et al. (2015) Science 347: 250 | wild bar-headed goose frequency; continuous flapping |
| Harvey C et al. (2019) J R Soc Interface 16: 20180641; Rosén M, Hedenström A (2001) J Exp Biol 204: 1153; Ros IG et al. (2011, 2015); Hedrick TL et al. (2009) | gliding gulls' elbow against wind; jackdaw glide span; turning asymmetries; damping |

The footage strips and the Feather Atlas scan overlays are study only in their own folders, and nothing here copies
them. The images in `out/` are this step's own drawings of the model.
