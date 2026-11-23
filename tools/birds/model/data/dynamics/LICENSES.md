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

Each source is credited by its licence and its DOI or a stable URL, never by a person's name. Each download's folder
is named in the research record; here only what it holds is said.

| download | what | licence | attribution |
|---|---|---|---|
| the gull tags (`README_for_gab.md`; `x/gps/`, `x/mor.csv`, `x/ela.csv`, `x/photos.pdf`). The raw `x/acc/` was deleted after analysis; re-download `gab.zip` from doi:10.5281/zenodo.4963689 to redo it. | Lesser black-backed gull GPS and 20 Hz acceleration, with the authors' behaviour classes | CC0 1.0 | Flap or soar? How a flight generalist responds to its aerial environment. Phil Trans R Soc B 371:20150395 (2016), doi:10.1098/rstb.2015.0395; data doi:10.5281/zenodo.4963689 |
| the stork tags (`acc4of4.csv.zip`, `gps.csv.zip`, `README.txt`, `reference-data.csv`) | White stork e-obs acceleration bursts (part 4 of 4) and GPS, Movebank Data Repository | CC0 1.0 | Costs of migratory decisions: a comparison across eight white stork populations. Sci Adv 2:e1500931 (2016), doi:10.1126/sciadv.1500931; data doi:10.5441/001/1.78152p3q |
| `rsfs20160081_si_001.csv`, `meta.json` | Jackdaw glide forces and posture (span, area, tail, body angle) by airspeed | CC BY 4.0 | Interface Focus 7:20160081 (2017), doi:10.1098/rsfs.2016.0081; figshare doi:10.6084/m9.figshare.4236305.v2 |
| `PMC6548498.xml/.txt`, `elife-45071-table3-data1-v1.zip`, `x/Table3/` | Shorebird compound-V flocks: full text and Table 3 source data (individual wingbeat frequencies) | CC BY 4.0 | eLife 8:e45071 (2019), doi:10.7554/eLife.45071 |
| a repository PDF and its text | Wingbeat frequency and amplitude in 14 species (Swansea repository copy) | CC BY 4.0 | J R Soc Interface 19:20220168 (2022), doi:10.1098/rsif.2022.0168 |
| full text | Pigeons solo and in pairs: frequency, body displacement, stroke phases | CC BY 4.0 | PLoS Biol 17:e3000299 (2019), doi:10.1371/journal.pbio.3000299 |
| a PDF and its text | Northern bald ibis flap-gliding and soaring on migration | CC BY 4.0 | J Ornithol 163:671-681 (2022), doi:10.1007/s10336-022-01978-1 |
| `m.pdf`, `m.txt` | Northern bald ibis intermittent gliding and heart rate | CC BY 4.0 | Front Ecol Evol 10:891079 (2022), doi:10.3389/fevo.2022.891079 |
| full text | Cliff swallow solo and tandem flapping frequency | CC BY 4.0 | J Exp Biol 228:jeb249393 (2025), doi:10.1242/jeb.249393 |
| full text | White stork thermalling circles (radius, period, bank, airspeed) | CC BY 4.0 | Ecol Evol 6:8706-8718 (2016), doi:10.1002/ece3.2585 |
| full text | Wing tucks in soaring flight | CC BY 4.0 | J R Soc Interface 11:20140645 (2014), doi:10.1098/rsif.2014.0645 |
| full text | Flight speeds (full text). The species table itself was read from the sibling task's structure download (Protocol S1, `sd001`) | CC BY | PLoS Biol 5:e197 (2007), doi:10.1371/journal.pbio.0050197 |
| full text | Flapping frequency scaling in soaring seabirds | CC BY | PLoS ONE 4:e5400 (2009), doi:10.1371/journal.pone.0005400 |
| full text | Accelerometry model; read, not used for numbers | CC BY 3.0 | J R Soc Interface 10:20130404 (2013), doi:10.1098/rsif.2013.0404 |
| full text | Vulture thermal soaring; read, not used | CC BY 4.0 | Sci Rep 6:27865 (2016), doi:10.1038/srep27865 |

Also used: numbers from the sibling task's copies of https://ntrs.nasa.gov/citations/20040075526 (NASA, US public
domain) and doi:10.7554/eLife.44986 (eLife, CC0).

## Rights reserved: study only (never shipped)

| download | what | terms |
|---|---|---|
| XML, figures f0001-f0003, supplement doc and pdf. The supplement movie was deleted. | Pigeon flock flight, author manuscript (Europe PMC PMC3162477; doi:10.1038/nature10164) | Nature author-manuscript terms: academic research use |
| `rhul.pdf`, `p.txt` | Ibis V-formation phasing, accepted manuscript (Royal Holloway repository; doi:10.1038/nature12939) | rights reserved |
| a PDF and its text | Jackdaw gliding in a wind tunnel (Lund University repository copy; doi:10.1242/jeb.204.6.1153) | private study per the repository's terms |
| a PDF and its text | Bar-headed goose migration, heart rate and wingbeat (University of Konstanz repository copy; doi:10.1126/science.1258732) | rights reserved (Science) |
| `t.txt` | Review (arXiv:1606.08969; doi:10.1016/j.biosystems.2016.05.010), used only for two SECONDARY goose wingtip-spacing values | arXiv licence; quoted as secondary |
| `b.txt` | CFD study of goose formations, Birds 2025, 6(2), 15, https://www.mdpi.com/2673-6004/6/2/15; text kept, PDF deleted; read for its citations only, no numbers used | CC BY 4.0, but not used |

Also read but not downloaded, as study only:

- through the web fetch tool, PMC pages: PNAS 2015 (doi:10.1073/pnas.1413589112), PNAS 2011
  (doi:10.1073/pnas.1107519108), J R Soc Interface 2018 (doi:10.1098/rsif.2018.0653), J R Soc Interface 2015
  (doi:10.1098/rsif.2015.0508);
- abstracts through Europe PMC: doi:10.1242/jeb.104141 (2015), doi:10.1242/jeb.002063 (2007), doi:10.1126/science.1168431
  (2009), doi:10.1242/jeb.174995 (2018);
- the sibling tasks' copies of doi:10.1242/jeb.204.19.3283 (2001), doi:10.1242/jeb.199.2.263 (1996),
  doi:10.1242/jeb.204.15.2741 (2001), doi:10.1098/rsif.2018.0641 (2019) and doi:10.1017/S0001924000010939 (2015).

## Not fetched

These were not fetched, and nothing was circumvented:

- the Journal of Experimental Biology PDF server (403) for doi:10.1242/jeb.150.1.171 (1990), doi:10.1242/jeb.199.7.1613
  (1996), doi:10.1242/jeb.128.1.445 (1987) and doi:10.1242/jeb.189.1.251 (1994);
- Wiley, ResearchGate and Academia for doi:10.1111/j.1474-919X.2010.01014.x (2010);
- SORA and USF digital commons (Cloudflare challenge) for doi:10.1093/auk/105.4.749 (1988) and doi:10.2307/4084469 (1974);
- Dryad files, which need a token.
