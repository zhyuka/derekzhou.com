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
  (doi:10.1017/S0001924000010939) are kept as the facts alone, `data/kinematics/goose_barnacle_facts.json`. The facts are
  cited.
- **stand-in / estimate:** as stated per channel.

## Open sources (usable with attribution)

Each source is credited by its licence and its DOI or a stable URL (CC BY 4.0 section 3(a)(2): the attribution may be
a URI to a resource that carries it); no person is named here.

| source | used for | licence |
|---|---|---|
| Avian wings, AIAA Paper 2004-2186 (2004; NASA Langley): https://ntrs.nasa.gov/citations/20040075526 (doi:10.2514/6.2004-2186) | the gull's, bar-headed goose's and crane's published Fourier coefficients (arm, hand, extension) | NASA work; the kinematics task recorded it as US public domain, the structure task as "facts only (cite)" (AIAA republication). Cited as facts; the PDF is not redistributed |
| Nature 603: 648 (2022), doi:10.1038/s41586-022-04477-8; data figshare doi:10.6084/m9.figshare.c.5503989 | the gull's fold table (markers), bones, the spread wrist places | data CC BY 4.0 |
| J R Soc Interface 18: 20210132 (2021), doi:10.1098/rsif.2021.0132; data figshare doi:10.6084/m9.figshare.c.5275490 | the gull's elbow-wrist coupling | data CC BY 4.0 |
| Sci Adv 5: eaaw6670 (2019), doi:10.1126/sciadv.aaw6670; data figshare doi:10.6084/m9.figshare.8856161 | the couplings of heron, crow, mallard, turkey vulture, swallow, pigeon; bones | data CC BY 4.0 |
| Science 367: 293 (2020), doi:10.1126/science.aaz3358; data figshare doi:10.6084/m9.figshare.11369364 | the primaries' fan against the wrist | data CC BY 4.0 |
| Biomimetics 9: 555 (2024), doi:10.3390/biomimetics9090555 (supplementary markers) | the pigeon's reach timing (the small birds' fold) | CC BY 4.0 |
| PLoS ONE 8: e63982 (2013), doi:10.1371/journal.pone.0063982 | the elbow's lead over the wrist | CC BY 3.0 |
| PLoS ONE 6: e28672 (2011), doi:10.1371/journal.pone.0028672; PLoS Biol 5: e197 (2007), doi:10.1371/journal.pbio.0050197 | bones; spans, masses, cruise speeds, the frequency benchmark's morphology | CC BY |
| Phil Trans R Soc B 371: 20150395 (2016), doi:10.1098/rstb.2015.0395; data Zenodo doi:10.5281/zenodo.4963689 | the gull's frequency, heave, surge, flight-mode shares, variation | CC0 |
| Sci Adv 2: e1500931 (2016), doi:10.1126/sciadv.1500931; data doi:10.5441/001/1.78152p3q | the white stork's frequency and flapping share | CC0 |
| Ecol Evol 6: 8706 (2016), doi:10.1002/ece3.2585 | stork thermalling circles | CC BY 4.0 |
| J Ornithol 163: 671 (2022), doi:10.1007/s10336-022-01978-1 | the bald ibis's frequency and flap-glide bouts | CC BY 4.0 |
| PLoS Biol 17: e3000299 (2019), doi:10.1371/journal.pbio.3000299 | the pigeon's heave and its phase; frequency changes made in the upstroke | CC BY 4.0 |
| J R Soc Interface 19: 20220168 (2022), doi:10.1098/rsif.2022.0168 | the heave's phase; amplitude and frequency independence | CC BY 4.0 |
| eLife 8: e44986 (2019), doi:10.7554/eLife.44986 (Supplementary file 4; Video 2) | the bar-headed goose's stroke amplitude and timing; the goose film check | CC0 (data), CC BY 4.0 (video) |
| Proc R Soc B 286: 20191083 (2019), doi:10.1098/rspb.2019.1083 (ESM M5; Appendix I) | the great egret film: downstroke share, landmarks for the footage check | CC BY 4.0 |
| "4K Free Stock Footage: Seagulls: Regular and Slow Motion" (Internet Archive; cited by its title: the item's URL carries a person's name) | the gull filmed from below (landmarks) and gliding (front profile) | CC BY 4.0 |
| eLife 8: e45071 (2019), doi:10.7554/eLife.45071 | no phase locking in shorebird Vs | CC BY 4.0 |
| J R Soc Interface 11: 20140645 (2014), doi:10.1098/rsif.2014.0645; PLoS ONE 4: e5400 (2009), doi:10.1371/journal.pone.0005400; J Exp Biol 228: jeb249393 (2025), doi:10.1242/jeb.249393; dataset figshare doi:10.6084/m9.figshare.4236305.v2 (2017) | wing tucks; frequency scaling; swallow glides; jackdaw glide spans | CC BY |
| The Feather Atlas, US Fish & Wildlife Service Forensics Laboratory, https://www.fws.gov/lab/featheratlas/ | slot counts per kind (numbers only) | US federal work |

## Study-only sources: facts only (cited, nothing from the files shipped)

| source | facts used |
|---|---|
| Aeronaut J 119 (2015), doi:10.1017/S0001924000010939 (via the first author's 2015 talk, ORBi https://hdl.handle.net/2268/179479) | the barnacle goose's section pitch (ranges, phases), hand lag, wrist fore-aft path, heave range |
| J Exp Biol 204: 3283 (2001), doi:10.1242/jeb.204.19.3283 | wild frequencies (heron, swan, crow, gulls); the benchmark formula |
| J Exp Biol 204: 2741 (2001), doi:10.1242/jeb.204.15.2741 | the barn swallow's stroke, downstroke share, span ratio, upstroke pauses |
| J Exp Biol 199: 263 (1996), doi:10.1242/jeb.199.2.263 | the magpie's downstroke share, span and wrist-span ratios; glide spans |
| J Exp Biol 201: 3057 (1998), doi:10.1242/jeb.201.22.3057 (abstract) | the primaries' strain ratio 2.2 and peak strain |
| Nature 505: 399 (2014), doi:10.1038/nature12939; PNAS 112: 2115 (2015), doi:10.1073/pnas.1413589112 | the ibis V's spatial phase rule and formation dynamics |
| Science 347: 250 (2015), doi:10.1126/science.1258732 | wild bar-headed goose frequency; continuous flapping |
| J R Soc Interface 16: 20180641 (2019), doi:10.1098/rsif.2018.0641; J Exp Biol 204: 1153 (2001), doi:10.1242/jeb.204.6.1153; PNAS 108: 19990 (2011), doi:10.1073/pnas.1107519108; J Exp Biol 218: 480 (2015), doi:10.1242/jeb.104141; Science 324: 252 (2009), doi:10.1126/science.1168431 | gliding gulls' elbow against wind; jackdaw glide span; turning asymmetries; damping |

The footage strips and the Feather Atlas scan overlays are study only in their own folders, and nothing here copies
them. The images in `out/` are this step's own drawings of the model.
