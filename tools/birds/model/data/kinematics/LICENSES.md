# Licences of every downloaded file (physics/kinematics)

> In this repository (tools/birds/model/data/kinematics/) only the files the wing model's build reads are kept: the
> three NASA-derived and the pigeon's datasets, and the barnacle goose's facts alone (goose_barnacle_facts.json: its
> datasets, study only, are not kept). The `dl/` folders named below stayed with the research.

Downloads live in `dl/<source>/`, one new folder per source, read only with `python3 -I` (or pdftotext / pymupdf on
the PDF), nothing inside them ever run. "Usable" means the numbers and curves may be used in the build with the
attribution given; "study only" means read for research and never shipped (the numbers in `data/` derived from them
are marked `study only` in each dataset's JSON `meta.licence`).

| folder / file | what | licence | use |
|---|---|---|---|
| `dl/shen2024/inner/data/marker_data1-3.csv`, `data.zip` | pigeon motion-capture marker coordinates (Supplementary Data of Shen et al. 2024, Biomimetics 9:555) | CC BY 4.0 | usable, attribute: Shen Y, Zhang S, Huang W, Shang C, Sun T, Shi Q (2024) Biomimetics 9(9):555, doi:10.3390/biomimetics9090555 |
| `dl/shen2024/inner/Supplementary Materials.pdf`, `supp.txt`, `Movie1.mp4`, `dl/shen2024/outer/*.gif,*.jpg` | the same article's supplement and figures (Movie S2, 57 MB, was not kept) | CC BY 4.0 | usable with the same attribution |
| `dl/baier2013/baier.xml`, `baier.txt`, `g006-g009.tif` | full text and original figures of Baier, Gatesy, Dial (2013) PLoS ONE 8:e63982 | CC BY 3.0 | usable, attribute: Baier DB, Gatesy SM, Dial KP (2013) PLoS ONE 8(5):e63982, doi:10.1371/journal.pone.0063982 |
| `dl/liu2004/liu2004.pdf`, `.txt` | Liu, Kuykendoll, Rhew, Jones (2004) AIAA Paper 2004-2186 from NASA NTRS 20040075526 | US Government work (NASA), public domain in the US | usable; cite the paper |
| `dl/meir2019/meir.xml`, `supp4.docx` | Meir et al. (2019) eLife 8:e44986 full text and Supplementary file 4 (bar-headed goose kinematics) | CC0 1.0 (as declared in the article XML) | usable; cite as a courtesy |
| `dl/dimitriadis2015/slides2015.pdf`, `slides.txt` | the first author's 2015 symposium talk on the barnacle-goose wind-tunnel study (ORBi 2268/179479) | no open licence stated (rights reserved) | study only |
| `dl/park2001/park2001.pdf`, `.txt` | Park, Rosen, Hedenstrom (2001) J Exp Biol 204:2741, Lund University repository copy | publisher copyright; repository terms: private study | study only |
| `dl/rosen2007/rsh_jrsi07.pdf`, `r.txt` | Rosen, Spedding, Hedenstrom (2007) J R Soc Interface 4:659, copy on a co-author's laboratory site | Royal Society, rights reserved | study only |
| `dl/tobalske1996/t1996.pdf`, `.txt` | Tobalske, Dial (1996) J Exp Biol 199:263, open copy | Company of Biologists, rights reserved | study only |
| `dl/stork_dryad/meta.json` | Dryad metadata of "White stork tri-axial accelerometer data with behaviour labels" (doi:10.5061/dryad.dz08kprxv); the data file itself could not be fetched (the API wants a bearer token) | CC0 1.0 (dataset) | metadata only |
| (outside this folder) `birds3d/majestic/motion/dl/p2001/p2001.pdf` | Pennycuick (2001) J Exp Biol 204:3283, read from the earlier round's download | rights reserved | study only |

Read but not downloaded (text via the web fetch tool or Crossref only): Krishnan et al. (2022) J R Soc Interface
19:20220168 (CC BY 4.0); Leontiuk et al. (2026) Biomimetics 11:212 (CC BY 4.0); Wehner, Fritz, Voelkl (2022)
J Ornithol 163:671 abstract (CC BY 4.0); KleinHeerenbrink et al. (2017) J R Soc Interface 14:20170099 (rights
reserved); Portugal et al. (2014) Nature 505:399 abstract (not open).

The generated files in `data/`, `plots/` and `work/` are this task's own work; each dataset's JSON carries the
licence of the source it comes from (`meta.licence`), and that licence governs any use of its numbers.
