import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cli = path.join(root, 'cli', 'decode.mjs');
const BASE = '50510126103663109505100606200000000000000000000000021';

function run(args, input) {
  return spawnSync(process.execPath, [cli, ...args], { input, encoding: 'utf8' });
}

test('CLI --json decodes a URL and preserves raw codes', () => {
  const r = run(['--json', 'https://e.dh5z.com/?d=' + BASE]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.input.payload, BASE);
  assert.equal(out.battery.rated.raw, '0510');
  assert.equal(out.battery.verdict.label, 'GOOD BATTERY');
  assert.equal(out.ok, true);
});

test('CLI reads the payload from stdin', () => {
  const r = run(['--json'], BASE + '\n');
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.battery.technology.label, 'EFB');
});

test('CLI --markdown emits a readable report', () => {
  const r = run(['--markdown', BASE]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes('# USBD1 A1 report'));
  assert.ok(r.stdout.includes('GOOD BATTERY'));
});

test('CLI exit codes: missing d, unsupported length, strict warnings', () => {
  const missing = run(['--json', 'https://e.dh5z.com/']);
  assert.equal(missing.status, 2);

  const short = run(['--json', BASE.slice(0, 52)]);
  assert.equal(short.status, 3);

  const unknown = run(['--strict', '--json', BASE.slice(0, 14) + '6' + BASE.slice(15)]);
  assert.equal(unknown.status, 4);
});

test('CLI --version and --help', () => {
  const v = run(['--version']);
  assert.equal(v.status, 0);
  assert.ok(v.stdout.includes('usbd1-a1.dh5z'));
  const h = run(['--help']);
  assert.equal(h.status, 0);
  assert.ok(h.stdout.includes('Usage:'));
});
