#!/usr/bin/env bash
# check: The wing model is what its generators make
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# Two of src/birds/model/'s scripts are generated, never edited by hand: facetform.js (the faceted M, by
# tools/birds/form/mkform.py) and model.js (the measured wingbeat, by tools/birds/model/make.py from the
# data in tools/birds/model/data/ and settings.json; with model_full.json, every number's notes, kept
# beside it and never served). Both are made again here and must be the committed files byte for byte, so
# a generated file can never drift from its source. numpy (BSD) pinned: the version they were made with.
python -m pip install --quiet --disable-pip-version-check numpy==2.5.3
python -I tools/birds/form/mkform.py build/facetform.js > /dev/null
if ! cmp -s build/facetform.js src/birds/model/facetform.js; then
  echo "::error::src/birds/model/facetform.js is not what tools/birds/form/mkform.py makes (run it and commit the result)"
  exit 1
fi
python -I tools/birds/model/make.py --check
