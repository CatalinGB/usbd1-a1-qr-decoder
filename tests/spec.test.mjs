import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lib = require('../src/decoder.js');
const LOCALES = require('../src/locales.js');
const spec = JSON.parse(readFileSync(new URL('../format.spec.json', import.meta.url), 'utf8'));

test('format.spec.json describes the same payload length and slices as the decoder', () => {
  assert.equal(spec.payload.length, lib.EXPECTED_LENGTH);
  const byName = new Map(spec.fields.map((f) => [f.name, f]));
  for (const [name, range] of Object.entries(lib.SLICES)) {
    const f = byName.get(name);
    assert.ok(f, `spec has field ${name}`);
    assert.equal(f.start, range[0], `${name} start`);
    assert.equal(f.end, range[1], `${name} end`);
    assert.equal(f.end - f.start, range[1] - range[0], `${name} length`);
  }
  assert.equal(byName.size, Object.keys(lib.SLICES).length);
});

test('format.spec.json enum tables match the decoder', () => {
  assert.deepEqual(spec.enums.battery_type, LOCALES.en.battery_type);
  assert.deepEqual(spec.enums.battery_result, LOCALES.en.battery_result);
  assert.deepEqual(spec.enums.cranking_result, LOCALES.en.cranking_result);
  assert.deepEqual(spec.enums.charging_result, LOCALES.en.charging_result);
  assert.deepEqual(spec.enums.vehicle_type, LOCALES.en.vehicle_type);
  assert.deepEqual(spec.enums.standard, lib.STANDARDS);
});

test('format.spec.json language map, report types and JIS table match the decoder', () => {
  assert.deepEqual(spec.languages, lib.LANGUAGES);
  for (const [code, def] of Object.entries(lib.REPORT_TYPES)) {
    assert.equal(spec.report_types[code].name, def.name);
    assert.deepEqual(spec.report_types[code].sections, def.sections);
    assert.equal(spec.enums.report_type[code], def.name);
  }
  assert.deepEqual(spec.jis_values, lib.JIS_VALUES);
});

test('format.spec.json states the timestamp and checksum limits', () => {
  assert.equal(spec.timestamp.encoded_in_payload, false);
  assert.equal(spec.checksum.field_present, 'unknown');
  assert.equal(spec.checksum.validated_by_captured_renderer, false);
  assert.equal(spec.provenance.differential_mismatches, 0);
});
