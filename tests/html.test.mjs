import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const decoder = readFileSync(new URL('../decoder.html', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('decoder.html and index.html are identical single-file builds', () => {
  assert.equal(index, decoder, 'index.html must be the same build as decoder.html');
});

for (const [name, html] of [['decoder.html', decoder], ['index.html', index]]) {
  test(`${name} is a single file with no external script/style dependencies`, () => {
    assert.ok(html.includes('<!doctype html>'));
    assert.ok(html.includes('id="input"'));
    assert.ok(html.includes('id="decode"'));
    assert.ok(html.includes('USBD1_LOCALES'));
    assert.ok(html.includes('window.USBD1') || html.includes('root.USBD1'));
    assert.ok(!/<script[^>]+src\s*=/i.test(html), 'no script src');
    assert.ok(!/<link[^>]+href\s*=/i.test(html), 'no link href');
  });

  test(`${name} has a deny-by-default CSP and no network APIs`, () => {
    assert.ok(html.includes('Content-Security-Policy'));
    assert.ok(html.includes("default-src 'none'"));
    assert.ok(html.includes("connect-src 'none'"));
    assert.ok(!/\bfetch\s*\(/.test(html));
    assert.ok(!/XMLHttpRequest/.test(html));
    assert.ok(!/sendBeacon/.test(html));
    assert.ok(!/https?:\/\/[^"'\\s]+\.(?:js|css|woff2?|png|svg)/i.test(html), 'no external asset URLs');
  });

  test(`${name} contains the format constants and timestamp warning`, () => {
    assert.ok(html.includes('EXPECTED_LENGTH = 53'));
    assert.ok(html.includes('TIME is not encoded in the QR payload'));
    assert.ok(html.includes('tester-reported'));
  });

}
