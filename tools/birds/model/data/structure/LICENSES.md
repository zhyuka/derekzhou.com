# LICENSES (research: structure)

> In this repository (tools/birds/model/data/structure/) only skeleton.json, which the wing model's build reads, is
> kept. The downloads and work files named below stayed with the research.

Nothing in this folder is meant to ship as is. What may feed shipped work is **numbers** (facts) and, where the licence
allows, derived tables. Downloads live in `dl/` (each source in its own folder, read as data only with `python3 -I` or
the venv's python with `-I`; nothing inside them was run).

| source (folder) | what was taken | licence | may be used in shipped work |
|---|---|---|---|
| Baliga, Szabo & Altshuler 2019, data (`dl/baliga2019`, figshare 8856161) | bones, wing lengths and areas, feather counts, cadaver 3D markers (ranges, coupled paths, out-of-plane), pigeon and zebra finch in-flight markers | CC BY 4.0 (the data); the article is CC BY-NC 4.0 (read only for definitions) | yes, with attribution: "Baliga VB, Szabo I, Altshuler DL (2019) Sci. Adv. 5: eaaw6670; data CC BY 4.0" |
| Harvey et al. 2022, data (`dl/harvey2022`, figshare c.5503989); article (`dl/harvey2022paper`, NSF PAR copy) | bones, spans, per-feather lengths and vane widths, 3D wing markers | data CC BY 4.0; article CC BY 4.0 | yes, with attribution: "Harvey C et al. (2022) Nature 603: 648; data CC BY 4.0" |
| Harvey et al. 2021, data (`dl/harvey2021`, figshare c.5275490) | the gull's coupled elbow-wrist curve; test-wing spans | CC BY 4.0 (data); article all rights reserved (read via PMC summary only) | the data yes, with attribution |
| Matloff et al. 2020, data (`dl/matloff2020`, figshare 11369364) | pigeon feather angles vs wrist angle, per-feather slopes, fastener force ratios | CC BY 4.0 (data); the article itself was not read | yes, with attribution |
| Baier, Gatesy & Dial 2013 (`dl/baier2013`, PLoS ONE article XML) | chukar joint ranges and timing (Table 2, text) | CC BY | yes, with attribution |
| Wang, McGowan & Dyke 2011 (`dl/wang2011`, PLoS ONE Table S1) | humerus and ulna lengths | CC BY | yes, with attribution |
| Alerstam et al. 2007 (`dl/alerstam2007`, PLoS Biol Protocol S1) | species mass, span, area | CC BY | yes, with attribution |
| The Feather Atlas, US Fish & Wildlife Service Forensics Laboratory (`dl/featheratlas`: SQLite database and 13 scans) | per-feather lengths; outlines digitized for emargination | a work of the US federal government (no copyright in the US under 17 U.S.C. 105); no licence statement found on the site | numbers yes (credit the Feather Atlas); the scan images and our overlays on them: study only, not shipped |
| Harvey et al. 2019 (`dl/harvey2019`, escholarship copy) | gulls' gliding joint ranges | article; repository copy, no open licence stated | facts only (cite) |
| Liu, Kuykendoll, Rhew & Jones 2004 (`dl/liu2004nasa`, NASA technical report server) | gull twist fit, gull/goose/crane fold fits | AIAA conference paper by NASA staff; AIAA reserves republication | facts only (cite); the PDF is not redistributed |
| Feo & Prum 2014 (`dl/feoprum2014`, author lab copy) | the rachis-position principle | journal copyright | facts only (cite) |
| Stowers 2017; Lees 2017; Lee 2015; Cheney 2020; Durston 2019; KleinHeerenbrink 2017; Deetjen 2024 | read as web pages (PMC) for the numbers quoted | Lees 2017, Lee 2015, Cheney 2020, Deetjen 2024: CC BY; the others all rights reserved | facts only (cite) |
| AvInertia manual (`dl/avinertia`, CRAN) | marker definitions | GPL-3 (package) | no code taken |
| Dryad "Skeletal traits for thousands of bird species" (`dl/dryad_skel`) | metadata only (files refused) | CC0 | - |
| Corning & Biewener 1998; Tucker 1993, 1995; Ennos et al. 1995; Norberg 1985 | abstracts or citing summaries only | - | facts only (cite) |

Derived here (CC BY inputs; ours to use, with the attributions above carried along): `data/skeleton.json`,
`data/*_raw.json`, `data/gull_fold_table.json`, `diagrams/*.png` except `emargination_digitized.png` and
`work/fa/*_overlay.png` (drawn on the Feather Atlas scans: study only).

Tools (run, not shipped or copied): Python 3 standard library; a local venv (`tools/venv`) with NumPy, SciPy, pandas,
openpyxl, Matplotlib, Pillow (BSD / MIT / PSF-style licences); poppler's pdftotext (GPL, run as a program);
LibreOffice (MPL 2.0, run headless once to convert a .doc table to text); curl. The diagrams' colours follow a
reference categorical palette; their text is set in Matplotlib's default font (system font, free licence).
