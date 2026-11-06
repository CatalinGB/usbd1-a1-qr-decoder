// Offline browser acceptance test for the built decoder.html.
// Uses a real Chromium engine, file:// origin, offline context, and records
// every non-file request attempt.
// Optional acceptance test. Requires playwright-core and a Chromium binary:
//   npm i -D playwright-core
//   node tools/offline-browser-test.cjs
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('fs');
const path = require('path');

const fileUrl = 'file://' + path.resolve(__dirname, '..', 'decoder.html');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium', headless: true });
  const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Europe/Bucharest' });
  await context.setOffline(true);
  const external = [];
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('request', (r) => { if (!r.url().startsWith('file://')) external.push(r.url()); });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(String(e && e.message || e)));

  const out = { fileUrl, offline: true, steps: [] };

  await page.goto(fileUrl);
  out.steps.push({ step: 'load', title: await page.title(), externalRequests: external.length });

  // Sample buttons
  for (let i = 0; i < 3; i++) {
    await page.locator('#samples button').nth(i).click();
    await page.waitForTimeout(200);
    const text = await page.locator('#output').innerText();
    out.steps.push({ step: 'sample-' + (i + 1), ok: /Battery|Cranking|Wynik|TEST RESULT/i.test(text), text: text.slice(0, 500) });
  }

  // Paste raw payload
  await page.fill('#input', '50510126103663109505100606200000000000000000000000021');
  await page.click('#decode');
  await page.waitForTimeout(200);
  let text = await page.locator('#output').innerText();
  out.steps.push({ step: 'paste-raw', ok: text.includes('GOOD BATTERY') && text.includes('51%'), text: text.slice(0, 500) });

  // Unsupported length warning
  await page.fill('#input', '5051012610366310950510060620000000000000000000000002');
  await page.click('#decode');
  await page.waitForTimeout(200);
  text = await page.locator('#output').innerText();
  out.steps.push({ step: 'unsupported-length', ok: text.includes('Unsupported payload length: 52'), text: text.slice(0, 300) });

  // Downloads
  const dlJson = await Promise.all([page.waitForEvent('download'), page.click('#download-json')]);
  const jsonPath = await dlJson[0].path();
  const jsonText = fs.readFileSync(jsonPath, 'utf8');
  out.steps.push({ step: 'download-json', filename: dlJson[0].suggestedFilename(), ok: JSON.parse(jsonText).input.payload.length === 52 });

  const dlMd = await Promise.all([page.waitForEvent('download'), page.click('#download-md')]);
  const mdPath = await dlMd[0].path();
  const mdText = fs.readFileSync(mdPath, 'utf8');
  out.steps.push({ step: 'download-markdown', filename: dlMd[0].suggestedFilename(), ok: mdText.includes('# USBD1 A1 report') });

  // Auto-fill via ?d=
  const auto = await context.newPage();
  auto.on('request', (r) => { if (!r.url().startsWith('file://')) external.push(r.url()); });
  await auto.goto(fileUrl + '?d=00000000000000000000000000010603580100000000000000022');
  await auto.waitForTimeout(300);
  const autoText = await auto.locator('#output').innerText();
  out.steps.push({ step: 'auto-fill-query', ok: autoText.includes('Cranking Test') && autoText.includes('3580 ms') });

  out.externalRequests = external;
  out.consoleErrors = consoleErrors;
  out.pageErrors = pageErrors;
  out.allStepsPassed = out.steps.every((s) => s.ok !== false);
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
