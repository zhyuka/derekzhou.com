// citations.mjs: no author-style citation in any tracked file (RULES.json "naming": never name any person; the owner,
// 2026-11-15: no exemption, not even a licence's credit: a credit is its DOI or URL). Fails on, in any text file git
// tracks:
//   "et al"                                        (Smith et al. 2020)
//   Name & Name YEAR, Name and Name YEAR           (Smith & Jones 2020)
//   Name, Name YEAR                                (Smith, Jones 2020)
//   Name YEAR before a doi                         (Smith 2020, doi:10.1/x; Smith (2020) https://doi.org/...)
// A match whose capitalised words are all ALLOW (the fonts', the months', the journals') passes.
//   node tools/checks/lib/citations.mjs [ROOT]     exit 1 on a citation, naming each file and line
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

// ALLOW holds no person's name (the naming rule binds this file too): the fonts', the months', and the journals' own
// abbreviations a credit by its DOI is printed after (PLoS Biol 2007, doi:...; J R Soc Interface 2019, doi:...).
export const ALLOW = new Set(['Geist', 'Mono', 'Inter', 'Unicode', 'October', 'November',
  'ONE', 'Biol', 'Interface', 'Sci', 'Rep', 'Rev', 'Res', 'Lett', 'Nat', 'Proc', 'Commun', 'Phys', 'Ecol', 'Evol', 'Zool', 'Exp', 'Soc',
  'Bioinspir', 'Biomim', 'Biomimetics', 'eLife', 'Nature', 'Science', 'Paper']);
const Y = String.raw`\(?(?:1[6-9]|20)\d\d[a-z]?\)?`, N = String.raw`[A-Z][a-zA-Z'\-]+`;
export const PATTERNS = [
  ['et al', /\bet al\b/g],
  ['Name & Name YEAR', new RegExp(String.raw`\b(${N}) (?:&|and) (${N}),? ${Y}`, 'g')],
  ['Name, Name YEAR', new RegExp(String.raw`\b(${N}), (${N}),? ${Y}`, 'g')],
  ['Name YEAR before a doi', new RegExp(String.raw`\b([A-Z][a-zA-Z'\-]{2,})[, ]+${Y}[,;:.]? *(?:doi|https?://(?:dx\.)?doi)`, 'gi')]
];

// every citation in one text: [{ kind, text, line }]
export function citations(text) {
  const out = [];
  for (const [kind, re] of PATTERNS) for (const m of text.matchAll(re)) {
    const names = m.slice(1).filter(Boolean);
    if (names.length && names.every((n) => ALLOW.has(n))) continue;
    out.push({ kind, text: m[0], line: text.slice(0, m.index).split('\n').length });
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(process.argv[2] || '.');
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
    .filter((f) => !['tools/checks/lib/citations.mjs', 'test/unit/citations.mjs', 'tools/checks/45-citations.sh'].includes(f));   // (the patterns' own examples and plants)
  const bad = [];
  for (const f of files) {
    let b; try { b = fs.readFileSync(path.join(root, f)); } catch { continue; }
    if (b.includes(0)) continue;   // (binary)
    for (const c of citations(b.toString('utf8'))) bad.push(`${f}:${c.line}: ${c.kind}: ${c.text}`);
  }
  if (bad.length) { for (const l of bad.slice(0, 60)) console.log('::error::' + l); console.log(`citations: ${bad.length} author-style citation(s) in tracked files (RULES.json naming: a credit is its DOI or URL, never its authors)${bad.length > 60 ? '; the first 60 shown' : ''}`); process.exitCode = 1; }
  else console.log(`citations: none in ${files.length} tracked files`);
}
