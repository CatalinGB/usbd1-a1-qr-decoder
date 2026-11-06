import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { decode } = require('../src/decoder.js');
const fixtures = JSON.parse(readFileSync(new URL('../fixtures/samples.json', import.meta.url), 'utf8'));

for (const sample of fixtures.samples) {
  test(`sample ${sample.id}: decodes the three user-visible reports`, () => {
    const r = decode(sample.url);
    assert.equal(r.ok, true);
    assert.equal(r.format.supported, true);
    assert.equal(r.input.payload, sample.payload);
    assert.equal(r.input.payload_length, 53);
    assert.equal(r.report_type.code, sample.expected.report_type.code);
    assert.equal(r.report_type.name, sample.expected.report_type.name);
    assert.equal(r.language.code, sample.expected.language.code);
    assert.equal(r.language.resolved, sample.expected.language.resolved);
    assert.equal(r.language.name, sample.expected.language.name);
    assert.equal(r.vehicle_type.code, sample.expected.vehicle_type.code);
    assert.equal(r.vehicle_type.label, sample.expected.vehicle_type.label);
    if (sample.expected.vehicle_type.label_localized) {
      assert.equal(r.vehicle_type.label_localized, sample.expected.vehicle_type.label_localized);
    }

    if (sample.expected.battery) {
      const e = sample.expected.battery;
      assert.equal(r.battery.visible, true);
      assert.equal(r.battery.technology.code, e.technology.code);
      assert.equal(r.battery.technology.label, e.technology.label);
      assert.equal(r.battery.verdict.code, e.verdict.code);
      assert.equal(r.battery.verdict.label, e.verdict.label);
      if (e.verdict.label_localized) assert.equal(r.battery.verdict.label_localized, e.verdict.label_localized);
      assert.equal(r.battery.soh_percent.display, e.soh_percent);
      assert.equal(r.battery.soc_percent.display, e.soc_percent);
      assert.equal(r.battery.measured_a.display, e.measured_a);
      assert.equal(r.battery.voltage_v.display, e.voltage_v);
      assert.equal(r.battery.standard.code, e.standard.code);
      assert.equal(r.battery.standard.label, e.standard.label);
      assert.equal(r.battery.rated.display, e.rated);
      assert.equal(r.battery.resistance_mohm.display, e.resistance_mohm);
    }

    if (sample.expected.cranking) {
      const e = sample.expected.cranking;
      assert.equal(r.cranking.visible, true);
      assert.equal(r.cranking.verdict.code, e.verdict.code);
      assert.equal(r.cranking.verdict.label, e.verdict.label);
      assert.equal(r.cranking.voltage_v.display, e.voltage_v);
      assert.equal(r.cranking.duration_ms.display, e.duration_ms);
    }

    // Every decoded display value that the original page renders must appear in
    // the captured rendered text. Report type / language / reserved / TIME are
    // decoder annotations, not original page text.
    for (const row of require('../src/decoder.js').toRows(r)) {
      if (!row.value || row.value === 'not encoded') continue;
      if (['Language', 'Report type', 'Reserved [36,38)', 'TIME'].includes(row.label)) continue;
      assert.ok(sample.rendered_text.includes(row.value),
        `rendered text should contain ${JSON.stringify(row.value)} for ${row.label}`);
    }

    // The payload must never claim a timestamp.
    assert.equal(r.display_time.encoded_in_payload, false);
    assert.equal(r.display_time.value, null);
  });
}

test('raw payload is preserved exactly, including leading zeros', () => {
  const r = decode('50510126103663109505100606200000000000000000000000021');
  assert.equal(r.input.payload, '50510126103663109505100606200000000000000000000000021');
  assert.equal(r.battery.rated.raw, '0510');
  assert.equal(r.battery.measured_a.raw, '0366');
  assert.equal(r.battery.soh_percent.raw, '051');
  assert.equal(r.battery.soc_percent.raw, '095');
  assert.equal(r.battery.resistance_mohm.raw, '00606');
});

test('the indexed third sample is not assumed: its captured values are reproduced', () => {
  const r = decode('https://e.dh5z.com/?d=207601253061833083066003592000000000000000000000000c1');
  assert.equal(r.battery.technology.label, 'AGM Flat Plate');
  assert.equal(r.battery.verdict.label, 'GOOD-RECHARGE');
  assert.equal(r.battery.verdict.label_localized, 'DOBRZE - ŁADOWANIA');
  assert.equal(r.battery.soh_percent.display, '66%');
  assert.equal(r.battery.soc_percent.display, '83%');
  assert.equal(r.battery.measured_a.display, '618 A');
  assert.equal(r.battery.voltage_v.display, '12.53 V');
  assert.equal(r.battery.rated.display, '760 A');
  assert.equal(r.battery.resistance_mohm.display, '3.59 mΩ');
  assert.equal(r.vehicle_type.label_localized, 'Samochód');
  assert.equal(r.language.resolved, 'pl');
});
