# LICENSES (research: structure)

> In this repository (tools/birds/model/data/structure/) only skeleton.json, which the wing model's build reads, is
> kept. The downloads and work files named below stayed with the research.

Nothing in this folder is meant to ship as is. What may feed shipped work is **numbers** (facts) and, where the licence
allows, derived tables. Downloads live in `dl/` (each source in its own folder, read as data only with `python3 -I` or
the venv's python with `-I`; nothing inside them was run).

Each source is credited by its licence and its DOI or a stable URL, never by a person's name; each download's folder is
named in the research record.

| source | what was taken | licence | may be used in shipped work |
|---|---|---|---|
| Sci Adv 2019, data figshare doi:10.6084/m9.figshare.8856161 (article doi:10.1126/sciadv.aaw6670) | bones, wing lengths and areas, feather counts, cadaver 3D markers (ranges, coupled paths, out-of-plane), pigeon and zebra finch in-flight markers | CC BY 4.0 (the data); the article is CC BY-NC 4.0 (read only for definitions) | yes, with attribution: "Sci. Adv. 5: eaaw6670 (2019), doi:10.1126/sciadv.aaw6670; data doi:10.6084/m9.figshare.8856161, CC BY 4.0" |
| Nature 2022, data figshare doi:10.6084/m9.figshare.c.5503989; article (NSF PAR copy) doi:10.1038/s41586-022-04477-8 | bones, spans, per-feather lengths and vane widths, 3D wing markers | data CC BY 4.0; article CC BY 4.0 | yes, with attribution: "Nature 603: 648 (2022), doi:10.1038/s41586-022-04477-8; data doi:10.6084/m9.figshare.c.5503989, CC BY 4.0" |
| J R Soc Interface 2021, data figshare doi:10.6084/m9.figshare.c.5275490 (article doi:10.1098/rsif.2021.0132) | the gull's coupled elbow-wrist curve; test-wing spans | CC BY 4.0 (data); article all rights reserved (read via PMC summary only) | the data yes, with attribution |
| Science 2020, data figshare doi:10.6084/m9.figshare.11369364 (article doi:10.1126/science.aaz3358) | pigeon feather angles vs wrist angle, per-feather slopes, fastener force ratios | CC BY 4.0 (data); the article itself was not read | yes, with attribution |
| PLoS ONE 2013, doi:10.1371/journal.pone.0063982 (article XML) | chukar joint ranges and timing (Table 2, text) | CC BY | yes, with attribution |
| PLoS ONE 2011, doi:10.1371/journal.pone.0028672 (Table S1) | humerus and ulna lengths | CC BY | yes, with attribution |
| PLoS Biol 2007, doi:10.1371/journal.pbio.0050197 (Protocol S1) | species mass, span, area | CC BY | yes, with attribution |
| The Feather Atlas, US Fish & Wildlife Service Forensics Laboratory, https://www.fws.gov/lab/featheratlas/ (SQLite database and 13 scans) | per-feather lengths; outlines digitized for emargination | a work of the US federal government (no copyright in the US under 17 U.S.C. 105); no licence statement found on the site | numbers yes (credit the Feather Atlas); the scan images and our overlays on them: study only, not shipped |
| J R Soc Interface 2019, doi:10.1098/rsif.2018.0641 (escholarship copy) | gulls' gliding joint ranges | article; repository copy, no open licence stated | facts only (cite) |
| AIAA Paper 2004-2186 (2004), https://ntrs.nasa.gov/citations/20040075526 (NASA technical report server) | gull twist fit, gull/goose/crane fold fits | AIAA conference paper by NASA staff; AIAA reserves republication | facts only (cite); the PDF is not redistributed |
| J Exp Zool B 2014, doi:10.1002/jez.b.22573 (author lab copy) | the rachis-position principle | journal copyright | facts only (cite) |
| J R Soc Interface 2017, doi:10.1098/rsif.2017.0224; R Soc Open Sci 2017, doi:10.1098/rsos.160927; Sci Rep 2015, doi:10.1038/srep09914; Proc R Soc B 2020, doi:10.1098/rspb.2020.1748; J Exp Biol 2019, doi:10.1242/jeb.185488; J R Soc Interface 2017, doi:10.1098/rsif.2017.0099; eLife 2024, doi:10.7554/eLife.89968 | read as web pages (PMC) for the numbers quoted | doi:10.1098/rsos.160927, doi:10.1038/srep09914, doi:10.1098/rspb.2020.1748, doi:10.7554/eLife.89968: CC BY; the others all rights reserved | facts only (cite) |
| AvInertia manual (CRAN, https://CRAN.R-project.org/package=AvInertia) | marker definitions | GPL-3 (package) | no code taken |
| Dryad "Skeletal traits for thousands of bird species" (doi:10.5061/dryad.v41ns1s4c) | metadata only (files refused) | CC0 | - |
| J Exp Biol 1998, doi:10.1242/jeb.201.22.3057; J Exp Biol 1993, doi:10.1242/jeb.180.1.285; J Exp Biol 1995, doi:10.1242/jeb.198.3.775; J Exp Biol 1995, doi:10.1242/jeb.198.5.1219; "Function of vane asymmetry and shaft curvature in bird flight feathers", The Beginnings of Birds (Eichstaett, 1985), 303-318 | abstracts or citing summaries only | - | facts only (cite) |

Derived here (CC BY inputs; ours to use, with the attributions above carried along): `data/skeleton.json`,
`data/*_raw.json`, `data/gull_fold_table.json`, `diagrams/*.png` except `emargination_digitized.png` and
`work/fa/*_overlay.png` (drawn on the Feather Atlas scans: study only).

Tools (run, not shipped or copied): Python 3 standard library; a local venv (`tools/venv`) with NumPy, SciPy, pandas,
openpyxl, Matplotlib, Pillow (BSD / MIT / PSF-style licences); poppler's pdftotext (GPL, run as a program);
LibreOffice (MPL 2.0, run headless once to convert a .doc table to text); curl. The diagrams' colours follow a
reference categorical palette; their text is set in Matplotlib's default font (system font, free licence).
