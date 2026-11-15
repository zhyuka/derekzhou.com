// test/unit/citations.mjs: the citation patterns (tools/checks/lib/citations.mjs) catch an author's credit in each of
// its forms and pass the physics' and the fonts' names.
import { test, assert } from '../unit-lib.mjs';
import { citations } from '../../tools/checks/lib/citations.mjs';

test('citations: each author-style form is caught, with its line', () => {
  for (const t of ['(Smith et al. 2020)', 'Smith et al., 2020', 'Smith & Jones 2019', 'Smith and Jones (2019)', 'Smith, Jones 2018', 'Smith, Jones (2018)',
    'Smith 2017, doi:10.1/x', 'Smith (2017) https://doi.org/10.1/x']) assert.ok(citations(t).length, t);
  assert.equal(citations('a\nb\n(Smith & Jones 2019)')[0].line, 3);
});

test('citations: the physics, the curves, the fonts, a credit by its DOI, and plain dates pass', () => {
  for (const t of ['Rayleigh and Mie scattering', 'the Ekman spiral', "Taylor's hypothesis", 'a Catmull-Rom spline', 'Geist, Geist Mono 2024',
    'Rayleigh & Mie 1908', 'credit: https://doi.org/10.1242/jeb.01234', 'the 2026-11-15 ruling', 'October, November 2026', 'In 1998, the wing']) assert.deepEqual(citations(t), [], t);
});
// plant: {"file": "tools/checks/lib/citations.mjs", "find": "  ['et al', /\\bet al\\b/g],\n", "with": "", "why": "the et al pattern dropped"}
