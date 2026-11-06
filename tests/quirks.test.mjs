import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { decode, parseInput } = require('../src/decoder.js');

const BASE = '50510126103663109505100606200000000000000000000000021';

test('leading zeros are preserved as raw text and decoded as numbers', () => {
  const r = decode(BASE);
  assert.equal(r.battery.rated.raw, '0510');
  assert.equal(r.battery.rated.value, 510);
  assert.equal(r.battery.soh_percent.value, 51);
  assert.equal(r.battery.soc_percent.value, 95);
  assert.equal(r.battery.resistance_mohm.value, 6.06);
});

test('parseInt quirks of the captured page are mirrored, not hidden', () => {
  const hex = BASE.slice(0, 21) + '0x606' + BASE.slice(26);
  const h = decode(hex);
  assert.equal(h.battery.resistance_mohm.value, 15.42);
  assert.equal(h.battery.resistance_mohm.decimal, false);
  assert.ok(h.issues.some((i) => i.code === 'non_decimal_numeric' && i.field === 'battery.resistance'));

  const plus = BASE.slice(0, 10) + '+' + BASE.slice(11);
  const p = decode(plus);
  assert.equal(p.battery.measured_a.value, 0);
  assert.equal(p.battery.measured_a.raw, '0+66');

  const letters = BASE.slice(0, 1) + 'ABCD' + BASE.slice(5);
  const l = decode(letters);
  assert.equal(l.battery.rated.value, null);
  assert.equal(l.battery.rated.invalid, true);
  assert.equal(l.battery.rated.display, 'NaN A');
  assert.ok(l.issues.some((i) => i.code === 'invalid_number' && i.field === 'battery.rated'));
});

test('empty and missing fields are distinguished from zero', () => {
  const zero = decode(BASE.slice(0, 15) + '000' + BASE.slice(18));
  assert.equal(zero.battery.soc_percent.value, 0);
  assert.equal(zero.battery.soc_percent.missing, false);
  assert.equal(zero.battery.soc_percent.invalid, false);
  assert.equal(zero.battery.soc_percent.display, '0%');

  const short = decode(BASE.slice(0, 52));
  assert.equal(short.report_type.code, null);
  assert.equal(short.report_type.known, false);
  assert.equal(short.battery.soc_percent.value, 95); // still present at [15,18)
  assert.equal(short.format.supported, false);
  assert.ok(short.issues.some((i) => i.code === 'unsupported_length'));

  const one = decode('5');
  assert.equal(one.battery.technology.code, '5');
  assert.equal(one.battery.rated.raw, null);
  assert.equal(one.battery.rated.missing, true);
  assert.equal(one.battery.rated.value, null);
  assert.equal(one.battery.rated.display, 'NaN A');
});

test('length 54 and longer are flagged, with trailing characters ignored', () => {
  const r = decode(BASE + '9');
  assert.equal(r.format.length_ok, false);
  assert.equal(r.format.actual_length, 54);
  assert.equal(r.ok, false);
  assert.equal(r.battery.technology.label, 'EFB');
  assert.ok(r.issues.some((i) => i.code === 'trailing_characters'));
});

test('payloads shorter than the field table are flagged but best-effort decoded', () => {
  const r = decode('5051012610366310950510060620000000000000000000000002');
  assert.equal(r.format.supported, false);
  assert.equal(r.report_type.code, null);
  assert.equal(r.issues.filter((i) => i.code === 'truncated_field').length > 0, true);
});

test('URL, query string, d= string and raw payload all work', () => {
  for (const input of [
    'https://e.dh5z.com/?d=' + BASE,
    '?d=' + BASE,
    'd=' + BASE,
    BASE
  ]) {
    const r = decode(input);
    assert.equal(r.input.payload, BASE);
    assert.equal(r.ok, true);
  }
});

test('percent-encoded d is decoded; plus is not treated as a space', () => {
  const encoded = '?d=' + Array.from(BASE).map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  assert.equal(decode(encoded).input.payload, BASE);

  const plus = BASE.slice(0, 10) + '+' + BASE.slice(11);
  const r = decode('?d=' + plus);
  assert.equal(r.input.payload, plus);
  assert.equal(r.battery.measured_a.raw, '0+66');
});

test('missing d, empty d and duplicate d behave like the original or are explicitly reported', () => {
  const missing = decode('https://e.dh5z.com/');
  assert.equal(missing.input.payload, null);
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some((i) => i.code === 'missing_d'));

  const empty = decode('?d=');
  assert.equal(empty.input.payload, '');
  assert.equal(empty.format.actual_length, 0);
  assert.equal(empty.format.supported, false);
  assert.equal(empty.report_type.code, null);

  // `?d` without '=' is null in the original page's query parser and crashes on
  // .split; `?d=` is an empty string and reaches the parser.
  const noEquals = decode('?d');
  assert.equal(noEquals.input.payload, null);
  assert.ok(noEquals.issues.some((i) => i.code === 'missing_d'));

  const dup = decode('?d=' + BASE + '&d=' + BASE);
  assert.equal(dup.input.payload, BASE);
  assert.equal(dup.input.d_count, 2);
  assert.ok(dup.issues.some((i) => i.code === 'duplicate_d'));
});

test('u parameter is not part of the payload and is redacted from exported URLs', () => {
  const r = decode('https://e.dh5z.com/?u=SECRETCIPHERTEXT&d=' + BASE);
  assert.equal(r.input.payload, BASE);
  assert.equal(r.input.has_u, true);
  assert.ok(r.input.url.includes('u=[redacted]'));
  assert.ok(!r.input.url.includes('SECRETCIPHERTEXT'));
  assert.ok(r.issues.some((i) => i.code === 'u_parameter_ignored'));
});

test('the reserved slice is reported, never interpreted', () => {
  const zero = decode(BASE);
  assert.equal(zero.reserved.raw, '00');
  assert.equal(zero.reserved.complete, true);
  assert.ok(!zero.issues.some((i) => i.code === 'reserved_nonzero'));

  const nonzero = decode(BASE.slice(0, 36) + '77' + BASE.slice(38));
  assert.equal(nonzero.reserved.raw, '77');
  assert.ok(nonzero.issues.some((i) => i.code === 'reserved_nonzero'));
});

test('parseInput does not crash on malformed percent escapes', () => {
  const r = parseInput('?d=%E0%A4%A');
  assert.equal(r.kind, 'query');
  assert.equal(r.payload, '%E0%A4%A');
});
