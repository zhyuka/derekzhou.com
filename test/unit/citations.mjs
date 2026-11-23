// test/unit/citations.mjs: the citation patterns (tools/checks/lib/citations.mjs) catch an author's credit in each of
// its forms, a person's name in a citation even where it is an eponym, and pass the fonts' and the journals' words.
import { test, assert } from '../unit-lib.mjs';
import { citations } from '../../tools/checks/lib/citations.mjs';

test('citations: each author-style form is caught, with its line', () => {
  for (const t of ['(Smith et al. 2020)', 'Smith et al., 2020', 'Smith & Jones 2019', 'Smith and Jones (2019)', 'Smith, Jones 2018', 'Smith, Jones (2018)',
    'Smith 2017, doi:10.1/x', 'Smith (2017) https://doi.org/10.1/x', 'Smith & Jones 1908']) assert.ok(citations(t).length, t);
  assert.equal(citations('a\nb\n(Smith & Jones 2019)')[0].line, 3);
});

test('citations: the fonts, a journal before its DOI, a credit by its DOI, and plain dates pass', () => {
  for (const t of ['Geist, Geist Mono 2024', 'PLoS Biol 2007, doi:10.1371/x', 'PLoS ONE 2013, doi:10.1371/x', 'J R Soc Interface 2019, doi:10.1098/x',
    'eLife 2024, doi:10.7554/x', 'credit: https://doi.org/10.1242/jeb.01234', 'the 2026-11-15 ruling', 'October, November 2026', 'In 1998, the wing']) assert.deepEqual(citations(t), [], t);
});
// plant: {"file": "tools/checks/lib/citations.mjs", "find": "  ['et al', /\\bet al\\b/g],\n", "with": "", "why": "the et al pattern dropped"}
