#!/usr/bin/env node
/*
 * Command-line decoder for USBD1 A1 / e.dh5z.com QR report payloads.
 * No dependencies. Node.js 18+.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lib = require('../src/decoder.js');

function usage() {
  return `Usage: node cli/decode.mjs [options] [URL-or-payload]

Decode a USBD1 A1 battery-tester QR report offline.

Input:
  A full report URL (https://e.dh5z.com/?d=...), a query string (?d=...),
  a bare d=... string, or the raw 53-character payload.
  If no argument is given, input is read from stdin.

Options:
  --json        Print machine-readable JSON.
  --markdown    Print a Markdown report.
  --strict      Exit nonzero if the payload is not a clean, fully known report.
  --version     Print decoder version.
  -h, --help    Show this help.

Exit codes:
  0  decoded; payload length is 53
  1  usage error
  2  no d payload found
  3  unsupported payload length
  4  --strict was used and warnings/unknown codes were found
`;
}

function main(argv) {
  const args = argv.slice(2);
  let json = false, markdown = false, strict = false, input = null;
  for (const a of args) {
    if (a === '--json') json = true;
    else if (a === '--markdown') markdown = true;
    else if (a === '--strict') strict = true;
    else if (a === '--version') { console.log(lib.FORMAT_ID + ' / decoder 1.0.0'); return 0; }
    else if (a === '-h' || a === '--help') { console.log(usage()); return 0; }
    else if (a.startsWith('-')) { console.error('Unknown option: ' + a + '\n\n' + usage()); return 1; }
    else if (input === null) input = a;
    else { console.error('Only one input is accepted.\n\n' + usage()); return 1; }
  }
  if (input === null) {
    try { input = readFileSync(0, 'utf8').trim(); }
    catch { console.error('No input on stdin.\n\n' + usage()); return 1; }
  }
  if (!input) { console.error('Empty input.\n\n' + usage()); return 1; }

  const result = lib.decode(input);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (markdown) {
    process.stdout.write(lib.toMarkdown(result));
  } else {
    // Human-readable but still complete: use the Markdown renderer, which is
    // plain text in a terminal.
    process.stdout.write(lib.toMarkdown(result));
  }

  if (!result.input || result.input.payload === null) return 2;
  if (!result.format || !result.format.supported) return 3;
  if (strict) {
    const hasWarning = result.issues.some((i) => i.severity === 'warning' || i.severity === 'error');
    if (hasWarning) return 4;
  }
  return 0;
}

process.exitCode = main(process.argv);
