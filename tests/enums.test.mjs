import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lib = require('../src/decoder.js');

const BASE = '50510126103663109505100606200000000000000000000000021';

function withChar(index, ch) {
  return BASE.slice(0, index) + ch + BASE.slice(index + 1);
}

test('battery technology codes 0-6 have the captured labels; unknown codes are not invented', () => {
  const expected = { '0': '--', '1': 'Regular Flooded', '2': 'AGM Flat Plate', '3': 'AGM Spiral', '4': 'GEL', '5': 'EFB', '6': 'Lithium Ion' };
  for (const [code, label] of Object.entries(expected)) {
    const r = lib.decode(withChar(0, code));
    assert.equal(r.battery.technology.known, true);
    assert.equal(r.battery.technology.label, label);
  }
  for (const code of ['7', '8', '9', 'a', 'A']) {
    const r = lib.decode(withChar(0, code));
    assert.equal(r.battery.technology.known, false);
    assert.equal(r.battery.technology.label, null);
    assert.equal(r.battery.technology.vendor_fallback, 'batteryTest.type_' + code);
    assert.ok(r.issues.some((i) => i.code === 'unknown_code' && i.field === 'battery.technology'));
  }
});

test('battery verdict codes 0-5 have the captured labels', () => {
  const expected = { '0': '--', '1': 'GOOD BATTERY', '2': 'REPLACE', '3': 'GOOD-RECHARGE', '4': 'CHARGE & RETEST', '5': 'BAD CELL' };
  for (const [code, label] of Object.entries(expected)) {
    const r = lib.decode(withChar(14, code));
    assert.equal(r.battery.verdict.label, label);
    assert.equal(r.battery.verdict.code, code);
    assert.equal(r.battery.verdict.label_localized, label);
  }
  const r = lib.decode(withChar(14, '6'));
  assert.equal(r.battery.verdict.vendor_fallback, 'batteryTest.result_6');
});

test('cranking verdict codes 0-3 have the captured labels', () => {
  const expected = { '0': '--', '1': 'NORMAL', '2': 'LOW', '3': 'HIGH' };
  for (const [code, label] of Object.entries(expected)) {
    const r = lib.decode(withChar(52, '2').slice(0, 35) + code + withChar(52, '2').slice(36));
    assert.equal(r.cranking.verdict.label, label);
  }
  const r = lib.decode(withChar(52, '2').slice(0, 35) + '4' + withChar(52, '2').slice(36));
  assert.equal(r.cranking.verdict.vendor_fallback, 'crankingTest.cranking_4');
});

test('charging verdict codes 0-3 have the captured labels', () => {
  const expected = { '0': 'NO OUTPUT', '1': 'VOLTAGE NORMAL', '2': 'VOLTAGE HIGH', '3': 'VOLTAGE LOW' };
  for (const [code, label] of Object.entries(expected)) {
    const p = withChar(52, '3');
    const r = lib.decode(p.slice(0, 50) + code + p.slice(51));
    assert.equal(r.charging.verdict.label, label);
  }
  const p = withChar(52, '3');
  const r = lib.decode(p.slice(0, 50) + 'a' + p.slice(51));
  assert.equal(r.charging.verdict.vendor_fallback, 'chargingTest.charging_a');
});

test('vehicle type codes 0-3 have the captured labels', () => {
  const expected = { '0': '--', '1': 'Motorcycle', '2': 'Car', '3': 'Truck' };
  for (const [code, label] of Object.entries(expected)) {
    const r = lib.decode(withChar(26, code));
    assert.equal(r.vehicle_type.label, label);
    assert.equal(r.vehicle_type.display, label);
  }
  const r = lib.decode(withChar(26, '4'));
  assert.equal(r.vehicle_type.display, 'carType_4');
});

test('standard codes 0-9 and unknown codes', () => {
  const expected = { '0': 'CCA', '1': 'DIN', '2': 'JIS', '3': 'EN', '4': 'IEC', '5': 'GB', '6': 'SAE', '7': 'MCA', '8': 'BCI', '9': 'CA' };
  for (const [code, label] of Object.entries(expected)) {
    const r = lib.decode(withChar(13, code));
    assert.equal(r.battery.standard.label, label);
  }
  const r = lib.decode(withChar(13, 'a'));
  assert.equal(r.battery.standard.known, false);
  assert.equal(r.battery.standard.label, null);
});

test('standard-specific RATED display: A, Ah (GB), and JIS designation table', () => {
  assert.equal(lib.decode(withChar(13, '3')).battery.rated.display, '510 A');
  assert.equal(lib.decode(withChar(13, '5')).battery.rated.display, '510 Ah');
  assert.equal(lib.decode(withChar(13, '0')).battery.rated.display, '510 A');

  const jis = (index) => withChar(13, '2').slice(0, 1) + index + withChar(13, '2').slice(5);
  assert.equal(lib.decode(jis('0026')).battery.rated.display, '65D23');
  assert.equal(lib.decode(jis('0000')).battery.rated.display, '26A17');
  assert.equal(lib.decode(jis('0070')).battery.rated.display, 'N200Z');
  assert.equal(lib.decode(jis('0071')).battery.rated.display, '');
  assert.ok(lib.decode(jis('0071')).issues.some((i) => i.code === 'jis_index_out_of_range'));

  assert.equal(lib.JIS_VALUES.length, 71);
});

test('language map 1-9,a-j and fallback to English', () => {
  const codes = { '1': 'de', '2': 'en', '3': 'es', '4': 'fr', '5': 'it', '6': 'nl', '7': 'zh', '8': 'jp', '9': 'ko', 'a': 'ru', 'b': 'pt', 'c': 'pl', 'd': 'fi', 'e': 'gr', 'f': 'se', 'g': 'cz', 'h': 'dk', 'i': 'bg', 'j': 'hr' };
  for (const [code, resolved] of Object.entries(codes)) {
    const r = lib.decode(withChar(51, code));
    assert.equal(r.language.resolved, resolved);
    assert.equal(r.language.known, true);
  }
  for (const code of ['0', 'A', 'z']) {
    const r = lib.decode(withChar(51, code));
    assert.equal(r.language.resolved, 'en');
    assert.equal(r.language.known, false);
    assert.ok(r.issues.some((i) => i.code === 'unknown_language'));
  }
});

test('report types 1-4 select the same sections as the captured page', () => {
  const expected = {
    '1': ['battery'],
    '2': ['cranking'],
    '3': ['charging'],
    '4': ['battery', 'cranking', 'charging']
  };
  for (const [code, sections] of Object.entries(expected)) {
    const r = lib.decode(withChar(52, code));
    assert.deepEqual(r.report_type.sections, sections);
    assert.equal(r.battery.visible, sections.includes('battery'));
    assert.equal(r.cranking.visible, sections.includes('cranking'));
    assert.equal(r.charging.visible, sections.includes('charging'));
  }
  for (const code of ['0', '5', 'a']) {
    const r = lib.decode(withChar(52, code));
    assert.equal(r.report_type.known, false);
    assert.deepEqual(r.report_type.sections, []);
    assert.equal(r.battery.visible, false);
    assert.equal(r.cranking.visible, false);
    assert.equal(r.charging.visible, false);
  }
});

test('localized verdict labels come from the encoded language', () => {
  const de = lib.decode(withChar(51, '1'));
  assert.equal(de.battery.technology.label_localized, 'EFB');
  assert.equal(de.battery.verdict.label_localized, 'GUTE BATTERIE');
  assert.equal(de.charging.verdict.label_localized, 'KEIN AUSGANG');

  const pl = lib.decode(withChar(51, 'c'));
  assert.equal(pl.battery.verdict.label_localized, 'DOBRA BATERIA');
  assert.equal(pl.vehicle_type.label_localized, 'Samochód');
});
