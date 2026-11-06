#!/usr/bin/env node
// Build the single-file decoder.html from src/locales.js + src/decoder.js + src/ui.js.
// No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const template = read('tools/decoder.template.html');
const locales = read('src/locales.js');
const decoder = read('src/decoder.js');
const ui = read('src/ui.js');

for (const [name, src] of [['locales', locales], ['decoder', decoder], ['ui', ui]]) {
  if (src.includes('</script>')) throw new Error(`${name} contains </script>`);
}

const out = template
  .replace('/*__LOCALES__*/', () => locales)
  .replace('/*__DECODER__*/', () => decoder)
  .replace('/*__UI__*/', () => ui);

fs.writeFileSync(path.join(root, 'decoder.html'), out);
fs.writeFileSync(path.join(root, 'index.html'), out);
console.log(`wrote decoder.html and index.html (${out.length} bytes each)`);
