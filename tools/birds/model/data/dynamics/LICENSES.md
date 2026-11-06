# Licences of every downloaded file (physics/dynamics)

> In this repository (tools/birds/model/data/dynamics/) only body_motion.json, which the wing model's build reads,
> and sources.json are kept. The downloads named below stayed with the research.

Each download is in its own folder, `dl/<source>/`. Every file was read only as data: `python3 -I` on the paths,
pdftotext or pdftocairo. Nothing inside a download was ever run.

- **usable** means the source is open (CC0, CC BY or US public domain). Its numbers, and curves derived from it, may be
  used in the build with the attribution given.
- **study only** means rights reserved. The facts were read for research, and nothing from the file is shipped.

The generated files in `data/` and `work/` are this task's own work. Each record names its source in `data/sources.json`,
and that source's licence governs any reuse of the numbers.

## Open: usable with attribution

| folder / file | what | licence | attribution |
|---|---|---|---|
| `dl/shamoun2016/` (`README_for_gab.md`; `x/gps/`, `x/mor.csv`, `x/ela.csv`, `x/photos.pdf`). The raw `x/acc/` was deleted after analysis; re-download `gab.zip` from Zenodo 4963689 to redo it. | Lesser black-backed gull GPS and 20 Hz acceleration, with the authors' behaviour classes | CC0 1.0 | Shamoun-Baranes J, Bouten W, van Loon EE, Meijer C, Camphuysen CJ (2016) Flap or soar? How a flight generalist responds to its aerial environment. Phil Trans R Soc B 371:20150395; data doi:10.5281/zenodo.4963689 |
| `dl/flack2016/` (`acc4of4.csv.zip`, `gps.csv.zip`, `README.txt`, `reference-data.csv`) | White stork e-obs acceleration bursts (part 4 of 4) and GPS, Movebank Data Repository | CC0 1.0 | Flack A et al. (2016) Costs of migratory decisions: a comparison across eight white stork populations. Sci Adv 2:e1500931; data doi:10.5441/001/1.78152p3q |
| `dl/kh2017fig/rsfs20160081_si_001.csv`, `meta.json` | Jackdaw glide forces and posture (span, area, tail, body angle) by airspeed | CC BY 4.0 | KleinHeerenbrink M, Johansson LC, Hedenström A (2017) Interface Focus 7:20160081; figshare doi:10.6084/m9.figshare.4236305.v2 |
| `dl/corcoran2019/` (`PMC6548498.xml/.txt`, `elife-45071-table3-data1-v1.zip`, `x/Table3/`) | Shorebird compound-V flocks: full text and Table 3 source data (individual wingbeat frequencies) | CC BY 4.0 | Corcoran AJ, Hedrick TL (2019) eLife 8:e45071 |
| `dl/krishnan2022/krishnan2022.pdf`, `k.txt` | Wingbeat frequency and amplitude in 14 species (Swansea repository copy) | CC BY 4.0 | Krishnan K et al. (2022) J R Soc Interface 19:20220168 |
| `dl/taylor2019/` | Pigeons solo and in pairs: frequency, body displacement, stroke phases | CC BY 4.0 | Taylor LA, Taylor GK, Lambert B, Walker JA, Biro D, Portugal SJ (2019) PLoS Biol 17:e3000299 |
| `dl/wehner2022/wehner2022.pdf`, `w.txt` | Northern bald ibis flap-gliding and soaring on migration | CC BY 4.0 | Wehner H, Fritz J, Voelkl B (2022) J Ornithol 163:671-681 |
| `dl/mizrahy2022/m.pdf`, `m.txt` | Northern bald ibis intermittent gliding and heart rate | CC BY 4.0 | Mizrahy-Rewald O et al. (2022) Front Ecol Evol 10:891079 |
| `dl/chizhikova2025/` | Cliff swallow solo and tandem flapping frequency | CC BY 4.0 | Chizhikova S, Mendez LX, Hedrick TL (2025) J Exp Biol 228:jeb249393 |
| `dl/weinzierl2016/` | White stork thermalling circles (radius, period, bank, airspeed) | CC BY 4.0 | Weinzierl R et al. (2016) Ecol Evol 6:8706-8718 |
| `dl/reynolds2014/` | Wing tucks in soaring flight | CC BY 4.0 | Reynolds KV, Thomas ALR, Taylor GK (2014) J R Soc Interface 11:20140645 |
| `dl/alerstam2007/` | Flight speeds (full text). The species table itself was read from the sibling task's `../structure/dl/alerstam2007/sd001` | CC BY | Alerstam T, Rosén M, Bäckman J, Ericson PGP, Hellgren O (2007) PLoS Biol 5:e197 |
| `dl/sato2009/` | Flapping frequency scaling in soaring seabirds | CC BY | Sato K et al. (2009) PLoS ONE 4:e5400 |
| `dl/spivey2013/` | Accelerometry model; read, not used for numbers | CC BY 3.0 | Spivey RJ, Bishop CM (2013) J R Soc Interface 10:20130404 |
| `dl/harel2016/` | Vulture thermal soaring; read, not used | CC BY 4.0 | Harel R et al. (2016) Sci Rep 6:27865 |

Also used: numbers from the sibling task's copies of Liu et al. 2004 (NASA, US public domain) and Meir et al. 2019
(eLife, CC0).

## Rights reserved: study only (never shipped)

| folder / file | what | terms |
|---|---|---|
| `dl/usherwood2011/` (XML, figures f0001-f0003, supplement doc and pdf). The supplement movie was deleted. | Pigeon flock flight, author manuscript (Europe PMC PMC3162477) | Nature author-manuscript terms: academic research use |
| `dl/portugal2014/rhul.pdf`, `p.txt` | Ibis V-formation phasing, accepted manuscript (Royal Holloway repository) | rights reserved |
| `dl/rosen2001/rosen2001.pdf`, `r.txt` | Jackdaw gliding in a wind tunnel (Lund University repository copy) | private study per the repository's terms |
| `dl/bishop2015/bishop2015.pdf`, `b.txt` | Bar-headed goose migration, heart rate and wingbeat (University of Konstanz repository copy) | rights reserved (Science) |
| `dl/trenchard2016/t.txt` | Review (arXiv 1606.08969), used only for two SECONDARY goose wingtip-spacing values | arXiv licence; quoted as secondary |
| `dl/birds2025/b.txt` | CFD study of goose formations (MDPI Birds 2025); text kept, PDF deleted; read for its citations only, no numbers used | CC BY 4.0, but not used |

Also read but not downloaded, as study only:

- through the web fetch tool, PMC pages: Voelkl et al. 2015 PNAS, Ros et al. 2011 PNAS, Ling et al. 2018 J R Soc
  Interface, Pete et al. 2015 J R Soc Interface;
- abstracts through Europe PMC: Ros et al. 2015, Hedrick et al. 2007, Hedrick et al. 2009, Williams et al. 2018;
- the sibling tasks' copies of Pennycuick 2001, Tobalske & Dial 1996, Park et al. 2001, Harvey et al. 2019 and
  Dimitriadis et al. 2015.

## Not fetched

These were not fetched, and nothing was circumvented:

- the Journal of Experimental Biology PDF server (403) for Pennycuick 1990 and 1996, Hainsworth 1987 and Cutts &
  Speakman 1994;
- Wiley, ResearchGate and Academia for Bruderer et al. 2010;
- SORA and USF digital commons (Cloudflare challenge) for Badgerow 1988 and Gould & Heppner 1974;
- Dryad files, which need a token.
