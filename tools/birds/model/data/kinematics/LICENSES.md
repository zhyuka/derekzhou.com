# Licences of every downloaded file (physics/kinematics)

> In this repository (tools/birds/model/data/kinematics/) only the files the wing model's build reads are kept: the
> three NASA-derived and the pigeon's datasets, and the barnacle goose's facts alone (goose_barnacle_facts.json: its
> datasets, study only, are not kept). The `dl/` folders named below stayed with the research.

Downloads live in `dl/<source>/`, one new folder per source, read only with `python3 -I` (or pdftotext / pymupdf on
the PDF), nothing inside them ever run. "Usable" means the numbers and curves may be used in the build with the
attribution given; "study only" means read for research and never shipped (the numbers in `data/` derived from them
are marked `study only` in each dataset's JSON `meta.licence`).

Each source is credited by its licence and its DOI or a stable URL, never by a person's name; each download's folder is
named in the research record.

| download | what | licence | use |
|---|---|---|---|
| `inner/data/marker_data1-3.csv`, `data.zip` | pigeon motion-capture marker coordinates (Supplementary Data of Biomimetics 9:555, 2024) | CC BY 4.0 | usable, attribute: Biomimetics 9(9):555 (2024), doi:10.3390/biomimetics9090555 |
| `inner/Supplementary Materials.pdf`, `supp.txt`, `Movie1.mp4`, `outer/*.gif,*.jpg` | the same article's supplement and figures (Movie S2, 57 MB, was not kept) | CC BY 4.0 | usable with the same attribution |
| full-text XML and text, `g006-g009.tif` | full text and original figures of PLoS ONE 8:e63982 (2013) | CC BY 3.0 | usable, attribute: PLoS ONE 8(5):e63982 (2013), doi:10.1371/journal.pone.0063982 |
| the report's PDF and text | AIAA Paper 2004-2186 (2004) from NASA NTRS, https://ntrs.nasa.gov/citations/20040075526 | US Government work (NASA), public domain in the US | usable; cite the paper |
| full-text XML, `supp4.docx` | eLife 8:e44986 (2019), doi:10.7554/eLife.44986, full text and Supplementary file 4 (bar-headed goose kinematics) | CC0 1.0 (as declared in the article XML) | usable; cite as a courtesy |
| `slides2015.pdf`, `slides.txt` | the first author's 2015 symposium talk on the barnacle-goose wind-tunnel study (ORBi https://hdl.handle.net/2268/179479; the paper doi:10.1017/S0001924000010939) | no open licence stated (rights reserved) | study only |
| a PDF and its text | J Exp Biol 204:2741 (2001), doi:10.1242/jeb.204.15.2741, Lund University repository copy | publisher copyright; repository terms: private study | study only |
| `rsh_jrsi07.pdf`, `r.txt` | J R Soc Interface 4:659 (2007), doi:10.1098/rsif.2007.0215, copy on a co-author's laboratory site | Royal Society, rights reserved | study only |
| `t1996.pdf`, `.txt` | J Exp Biol 199:263 (1996), doi:10.1242/jeb.199.2.263, open copy | Company of Biologists, rights reserved | study only |
| `stork_dryad/meta.json` | Dryad metadata of "White stork tri-axial accelerometer data with behaviour labels" (doi:10.5061/dryad.dz08kprxv); the data file itself could not be fetched (the API wants a bearer token) | CC0 1.0 (dataset) | metadata only |
| (outside this folder) `birds3d/majestic/motion/dl/p2001/p2001.pdf` | J Exp Biol 204:3283 (2001), doi:10.1242/jeb.204.19.3283, read from the earlier round's download | rights reserved | study only |

Read but not downloaded (text via the web fetch tool or Crossref only): J R Soc Interface 19:20220168 (2022),
doi:10.1098/rsif.2022.0168 (CC BY 4.0); Biomimetics 11:212 (2026), doi:10.3390/biomimetics11030212 (CC BY 4.0);
J Ornithol 163:671 (2022), doi:10.1007/s10336-022-01978-1, abstract (CC BY 4.0); J R Soc Interface 14:20170099 (2017),
doi:10.1098/rsif.2017.0099 (rights reserved); Nature 505:399 (2014), doi:10.1038/nature12939, abstract (not open).

The generated files in `data/`, `plots/` and `work/` are this task's own work; each dataset's JSON carries the
licence of the source it comes from (`meta.licence`), and that licence governs any use of its numbers.
