// Bundles the tested parser (lib/dates.js, lib/data.js, lib/parse.js) into one
// classic script, so a page opened straight from disk (file://, where ES
// modules are blocked) can use it. Flight Quest loads the output as talk-parser.js.
//
//   node scripts/export-classic.mjs ../flight-quest/talk-parser.js

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = process.argv[2];
if (!out) {
  console.error('usage: node scripts/export-classic.mjs <output file>');
  process.exit(1);
}

const lib = (f) => readFileSync(fileURLToPath(new URL(`../lib/${f}`, import.meta.url)), 'utf8');
const strip = (src) =>
  src
    .replace(/^import [^;]+;\n/gm, '')
    .replace(/^export (const|function|let) /gm, '$1 ');

const body = ['dates.js', 'data.js', 'parse.js'].map((f) => `// ---- ${f} ----\n${strip(lib(f))}`).join('\n');
const banner = `// GENERATED from prototypes/where-to/lib/{dates,data,parse}.js by
// prototypes/where-to/scripts/export-classic.mjs. Edit those files and re-run; do not edit this one.
`;
writeFileSync(out, `${banner}window.TalkParser = (() => {\n${body}\nreturn { parse, normalize, byCode, NETWORK, weekendFriday, todayISO, addDays };\n})();\n`);
console.log(`wrote ${out}`);
