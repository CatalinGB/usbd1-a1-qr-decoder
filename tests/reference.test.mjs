import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { decode } = require('../src/decoder.js');
const fixture = JSON.parse(readFileSync(new URL('../fixtures/reference-state.json', import.meta.url), 'utf8'));

function n(v) {
  if (v === undefined) return null;
  if (typeof v === 'number' && Number.isNaN(v)) return 'NaN';
  return v;
}

function numeric(field) {
  if (!field) return null;
  return field.invalid ? 'NaN' : field.value;
}

function actual(d) {
  return {
    btype: d.battery ? d.battery.technology.code : null,
    rated: numeric(d.battery && d.battery.rated),
    vol: numeric(d.battery && d.battery.voltage_v),
    measured: numeric(d.battery && d.battery.measured_a),
    input: d.battery ? d.battery.standard.code : null,
    result: d.battery ? d.battery.verdict.code : null,
    soc: numeric(d.battery && d.battery.soc_percent),
    soh: numeric(d.battery && d.battery.soh_percent),
    internal: numeric(d.battery && d.battery.resistance_mohm),
    carType: d.vehicle_type ? d.vehicle_type.code : null,
    cvol: numeric(d.cranking && d.cranking.voltage_v),
    time: numeric(d.cranking && d.cranking.duration_ms),
    cranking: d.cranking ? d.cranking.verdict.code : null,
    load: numeric(d.charging && d.charging.loaded_v),
    unload: numeric(d.charging && d.charging.unloaded_v),
    ripple: numeric(d.charging && d.charging.ripple_mv),
    charging: d.charging ? d.charging.verdict.code : null,
    lang: d.language.resolved,
    dataType: d.report_type.code
  };
}

let compared = 0;
for (const c of fixture.cases) {
  if (c.data === null) {
    test(`reference ${c.id}: original crashed before parsing`, () => {
      const r = decode(c.query);
      if (c.id === 'd_duplicate') {
        // Deliberate divergence: the original throws on an array-valued d;
        // we decode the first value and report the ambiguity.
        assert.ok(r.issues.some((i) => i.code === 'duplicate_d'));
        assert.equal(r.input.payload, c.query.split('d=')[1].split('&')[0]);
      } else {
        assert.equal(r.input.payload, null);
        assert.equal(r.ok, false);
      }
    });
    continue;
  }

  test(`reference ${c.id}: matches original parsed state`, () => {
    const r = decode(c.query);
    assert.ok(r.input.payload !== null, 'payload should be present');
    const got = actual(r);
    for (const key of Object.keys(got)) {
      compared++;
      assert.equal(String(n(got[key])), String(n(c.data[key])), `field ${key}`);
    }
  });
}

test('differential comparison covered all fields for every captured case', () => {
  const expectedComparisons = fixture.cases.filter((c) => c.data !== null).length * 19;
  assert.equal(compared, expectedComparisons);
  assert.ok(compared > 2000, `expected >2000 comparisons, got ${compared}`);
});
