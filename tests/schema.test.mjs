import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { decode, toMarkdown, SLICES } = require('../src/decoder.js');

const schema = JSON.parse(readFileSync(new URL('../format.schema.json', import.meta.url), 'utf8'));
const BASE = '50510126103663109505100606200000000000000000000000021';

function walkNumbers(value, path = '$') {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `non-finite number at ${path}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkNumbers(v, `${path}[${i}]`));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkNumbers(v, `${path}.${k}`);
  }
}

test('format.schema.json is valid JSON and declares the output contract', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  for (const key of ['decoder', 'input', 'format', 'ok', 'report_type', 'language', 'battery', 'cranking', 'charging', 'vehicle_type', 'reserved', 'display_time', 'raw_slices', 'issues']) {
    assert.ok(schema.required.includes(key), `schema requires ${key}`);
  }
  assert.equal(schema.properties.format.properties.expected_length.const, 53);
});

test('decoded output is JSON-safe: no NaN/Infinity leaks into numbers', () => {
  for (const input of [BASE, BASE.slice(0, 52), '5', '?d=', 'https://e.dh5z.com/']) {
    const r = decode(input);
    walkNumbers(r);
    const round = JSON.parse(JSON.stringify(r));
    assert.deepEqual(round, JSON.parse(JSON.stringify(r)));
  }
});

test('raw_slices covers every documented slice', () => {
  const r = decode(BASE);
  assert.deepEqual(Object.keys(r.raw_slices).sort(), Object.keys(SLICES).sort());
  assert.equal(r.raw_slices.battery_type, '5');
  assert.equal(r.raw_slices.report_type, '1');
});

test('Markdown export contains the payload and every decoded value', () => {
  const r = decode(BASE);
  const md = toMarkdown(r);
  assert.ok(md.includes(BASE));
  for (const value of ['EFB', 'GOOD BATTERY', '51%', '95%', '366 A', '12.61 V', 'EN', '510 A', '6.06 mΩ', 'Car']) {
    assert.ok(md.includes(value), `markdown should contain ${value}`);
  }
  assert.ok(md.includes('TIME'));
  assert.ok(md.includes('not encoded'));
});

test('issues are structured and severities are limited', () => {
  const r = decode(BASE);
  for (const i of r.issues) {
    assert.ok(['error', 'warning', 'info'].includes(i.severity));
    assert.equal(typeof i.code, 'string');
    assert.equal(typeof i.message, 'string');
    assert.ok(i.field === null || typeof i.field === 'string');
  }
});
