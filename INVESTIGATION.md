# Investigation report

**Date:** 2026-11-06
**Target:** `https://e.dh5z.com/` — the QR-report site used by the Ultimate
Speed USBD1 A1 car battery tester
**Captured application:** the public `e.dh5z.com` report page
**Result:** an offline decoder verified against the captured renderer, with
173 passing tests and 2,337 differential field comparisons.

## 1. Executive summary

1. **How the site works.** It is a static single-page app. The server
   returns the same 2,877-byte HTML shell for `/` and for every `/?d=…` URL.
   The `d` query parameter is split into fixed positions in the browser; there
   is no API call, no server-side rendering and no database lookup.
2. **Does the QR contain all necessary measurement data?** Yes for every
   measurement and verdict the page displays. It does **not** contain a
   timestamp, vehicle identity, serial number or location.
3. **Does the original site require server-side processing?** No. The only
   server role is serving static files. A HAR of four navigations shows 56
   static GETs, zero XHR/fetch and zero third-party hosts. If the domain
   disappears, the `d` value is still sufficient.
4. **Field layout.** See §4 and [FORMAT.md](FORMAT.md). The verified layout is
   53 characters; important corrections to the earlier guess are in §9.
5. **Mappings.** All captured code tables are in §5 and [FORMAT.md](FORMAT.md).
6. **Timestamp/localization.** TIME is page-load time, not measurement time;
   the language code is `[51,52)`.
7. **Existing tools.** None compatible were found in a bounded search (§7).
8. **Implementation.** `decoder.html`, `src/decoder.js`, `cli/decode.mjs`,
   `format.spec.json`, `format.schema.json`, tests and fixtures (§8).
9. **Validation.** 173 tests pass; 2,337 differential comparisons, 0
   mismatches; offline browser test passes with 0 external requests (§10).
10. **Unknowns.** Reserved `[36,38)`, other firmware layouts, tester-side
    checksum, tester diagnostic algorithm, opaque `u` parameter (§11).
11. **Preservation procedure.** §12.

## 2. Method and evidence grades

The investigation deliberately separates five kinds of evidence:

| Grade | Meaning |
|---|---|
| **A** | User-supplied observation |
| **B** | Behaviour reproduced from the live site |
| **C** | Behaviour recovered from the public report page |
| **D** | Inference |
| **E** | Unknown |

The two supplied reports were observed live (**A + B**), then reproduced by
the captured renderer (**C**), then tested differentially against that
renderer (**B + C**). The third, publicly indexed URL was captured live and
decoded; its expected values were not invented.

The format was established by observing the public report page and by
controlled differential tests against a captured local copy of its renderer.
The decoder is independently written. Detailed capture records are kept
private and are not redistributed; see §13.

## 3. Capture

### 3.1 Reachability

The local resolver returned `SERVFAIL`; Google Public DNS returned
`8.209.102.145`. The site itself was healthy (valid TLS, HTTP 200). Requests
used `curl --resolve` and Chromium `--host-resolver-rules`. This is recorded so
the capture can be reproduced.

### 3.2 Browser capture

A fresh Chromium context (no extensions, no warm vendor cache) opened:

* `/`
* the battery report URL
* the cranking report URL
* the indexed report URL

Captured per URL: status, final URL, console output, failed requests, DOM,
screenshot, raw main-document response, public assets, and a HAR with embedded
response bodies. The HAR was flushed by closing the context. It contains 56
entries, all `GET`, all `e.dh5z.com`; bodies were verified present (53 embedded;
3 font entries reused browser cache).

The main document is byte-identical for `/` and every report URL. The site
does not vary HTML by report.

### 3.3 Server-side check

No `fetch`, `XMLHttpRequest`, WebSocket, JSON API or third-party host appears
in the HAR. The report is produced entirely from the URL query string and the
page's client-side logic.

## 4. Field layout (summary)

The payload is 53 characters. Zero-based, end-exclusive slices:

```
[0,1)   battery type code
[1,5)   rated value (4 digits)
[5,9)   voltage × 100
[9,13)  measured current A
[13,14) standard code
[14,15) battery verdict code
[15,18) SoC %
[18,21) SoH %
[21,26) internal resistance × 100 mΩ
[26,27) vehicle type code
[27,31) cranking voltage × 100 V
[31,35) cranking duration ms
[35,36) cranking verdict code
[36,38) reserved (never read)
[38,42) charging loaded voltage × 100 V
[42,46) charging unloaded voltage × 100 V
[46,50) charging ripple mV
[50,51) charging verdict code
[51,52) language code
[52,53) report type code
```

This is the verified layout. Full semantics, units and code tables are in
[FORMAT.md](FORMAT.md).

## 5. Recovered mappings

### Battery technology (`[0,1)`)

`0` `--`, `1` Regular Flooded, `2` AGM Flat Plate, `3` AGM Spiral, `4` GEL,
`5` EFB, `6` Lithium Ion.

### Battery verdict (`[14,15)`)

`0` `--`, `1` GOOD BATTERY, `2` REPLACE, `3` GOOD-RECHARGE,
`4` CHARGE & RETEST, `5` BAD CELL.

### Cranking verdict (`[35,36)`)

`0` `--`, `1` NORMAL, `2` LOW, `3` HIGH.

### Charging verdict (`[50,51)`)

`0` NO OUTPUT, `1` VOLTAGE NORMAL, `2` VOLTAGE HIGH, `3` VOLTAGE LOW.

### Vehicle type (`[26,27)`)

`0` `--`, `1` Motorcycle, `2` Car, `3` Truck.

### Standard (`[13,14)`)

`0` CCA, `1` DIN, `2` JIS, `3` EN, `4` IEC, `5` GB, `6` SAE, `7` MCA,
`8` BCI, `9` CA. Unknown → blank.

### Report type (`[52,53)`)

`1` battery, `2` cranking, `3` charging, `4` all three.

### Language (`[51,52)`)

`1` de, `2` en, `3` es, `4` fr, `5` it, `6` nl, `7` zh, `8` jp, `9` ko,
`a` ru, `b` pt, `c` pl, `d` fi, `e` gr, `f` se, `g` cz, `h` dk, `i` bg,
`j` hr. Anything else → `en`.

Every mapping above was exercised against the captured renderer and is
covered by the differential tests.

## 6. Differential testing

A local mirror of the captured app was served on `127.0.0.1` with all
non-localhost requests aborted. A test driver loaded 125 curated query strings,
read the captured renderer's parsed state (btype, rated, vol, measured,
input, result, soc, soh, internal, carType, cvol, time, cranking, load, unload,
ripple, charging, lang, dataType) and compared it with the offline decoder.

**Result: 2,337 field comparisons, 0 mismatches.**
Two cases (`d` missing and duplicate `d`) had no parsed state because the
original page threw; the decoder's error/ambiguity handling is tested
separately.

The curated cases cover every enum value in the captured tables, every report
type, every language code, JIS index boundaries, unknown codes, short/long
payloads, empty/missing/duplicate `d`, numeric quirks (`0x`, `+`, `NaN`),
leading zeros and URL encoding.

Live-only observations (not synthetic) were the four page navigations. The
live request budget was four navigations plus their static assets; no synthetic
payload was sent to the public host. No fuzzing or load testing was performed
against the public site.

## 7. Existing solutions search

Bounded search, 2026-11-06:

* Web search for `"e.dh5z.com"`, `dh5z` decoders, `USBD1 A1` decoders and
  distinctive payload fragments: no compatible decoder. Results were LiFePO4
  cell serial/QR decoders (unrelated format), battery test reports, manuals and
  product pages.
* GitHub code search: `"e.dh5z.com"` → 0 results. The broad token `dh5z`
  returned many false positives (token splitting), none relevant.
* GitHub repository search: `dh5z` → `slender653/USBD1CH` (an unrelated SSH
  repository); `battery tester QR decoder` and `ultimate speed battery` → no
  relevant repository.
* GitLab blob search → HTTP 401 (authentication required); no result obtained.
* npm search `dh5z` → empty.
* Wayback Machine: no archived report page (`availability` empty), but a
  2025-09-28 archive snapshot of the same application exists. It supports
  version stability but is not a decoder.
* A `GFW-Tester` JSON file mentions `dh5z.com` in a domain list; it is
  unrelated to this format.

No existing project was reused. The implementation is independent.

## 8. Implementation artifacts

| Artifact | Purpose |
|---|---|
| `decoder.html` | single-file offline app; no CDN, no network, CSP `default-src 'none'` |
| `index.html` | identical GitHub Pages entry point (same build) |
| `DISCLAIMER.md` | independence, no-warranty and rights-holder notice |
| `src/decoder.js` | UMD decoder library; pure functions, no DOM |
| `src/locales.js` | captured short label tables, 19 languages |
| `src/ui.js` | browser UI, JSON/Markdown export |
| `cli/decode.mjs` | CLI with `--json`, `--markdown`, `--strict`, stdin |
| `format.schema.json` | JSON Schema for the decoder output |
| `format.spec.json` | machine-readable payload/field/enum specification |
| `fixtures/samples.json` | three verified samples with captured rendered text |
| `fixtures/reference-state.json` | 125 cases of original parsed state |
| `tests/` | 173 tests, no runtime dependencies |
| `evidence/` | headers, method notes, 144 observations, validation output |

The HTML is built from `src/` with `npm run build`; the built file is
committed so no build is needed to use it. The same build is published at
<https://catalingb.github.io/usbd1-a1-qr-decoder/> via GitHub Pages (served
from the `gh-pages` branch; see `evidence/pages-deployment.md`). Pages is a
convenience; the local file is the durable artifact.

## 9. Corrections to the earlier hypotheses

The earlier assistant's table was structurally wrong. The captured renderer shows:

| Earlier guess | Actual |
|---|---|
| `[0:1]` battery type | correct |
| `[1:4]` SoH | **wrong**: `[1,5)` is RATED; SoH is `[18,21)` |
| `[4:9]` voltage /100 | **wrong**: voltage is `[5,9)`; `[4:5)` is the last digit of RATED |
| `[9:13]` measured | correct |
| `[13:14]` standard | correct |
| `[14:15]` verdict | correct |
| `[15:18]` SoC | correct |
| `[18:22]` rated | **wrong**: `[18,21)` is SoH; `[21,26)` is resistance |
| `[22:26]` resistance | **wrong**: resistance starts at 21 |
| `[26:27]` vehicle | correct |
| `[26:30]` cranking voltage | **wrong**: `[27,31)` |
| `[30:35]` duration | **wrong**: `[31,35)` |
| `[35:36]` cranking verdict | correct |
| `[36:51]` unresolved | partially resolved: reserved `[36,38)`, loaded `[38,42)`, unloaded `[42,46)`, ripple `[46,50)`, charging `[50,51)` |
| `[51:52]` unresolved, “c” | **language code**, confirmed: `c` = Polish |
| `[52:53]` possible selector | **report type**, confirmed: 1/2/3/4 |

Other corrections:

* The payload is not digits-only. `a`–`j` are valid language codes.
* There is no checksum validation in the page.
* The page does not require 53 characters; it accepts short and long strings
  and produces `NaN`/ignored extras. The decoder flags this.
* The displayed TIME is page-load time, not measurement time.

The user's battery report values are nonetheless correctly explained by the
actual layout:

* `[1,5) = 0510` → 510 A
* `[5,9) = 1261` → 12.61 V
* `[9,13) = 0366` → 366 A
* `[13] = 3` → EN
* `[14] = 1` → GOOD BATTERY
* `[15,18) = 095` → SoC 95
* `[18,21) = 051` → SoH 51
* `[21,26) = 00606` → 6.06 mΩ
* `[26] = 2` → Car

The earlier decoder that required 53 decimal digits would have rejected the
third sample (`c` at `[51]`).

## 10. Validation performed

Commands:

```bash
npm test
# 173 tests, 173 pass, 0 fail

node tools/build-html.mjs
# writes decoder.html and index.html

PLAYWRIGHT_CORE=... node tools/offline-browser-test.cjs
# allStepsPassed: true, externalRequests: [], consoleErrors: [], pageErrors: []

node cli/decode.mjs --json '<sample>'
```

Results:

* 173 automated tests pass, 0 fail.
* 2,337 differential field comparisons, 0 mismatches.
* 144 evidence observations recorded.
* Offline browser test: sample buttons, pasted URL, raw payload,
  unsupported-length warning, JSON/Markdown downloads and `?d=` auto-fill all
  pass from `file://` with the browser offline; 0 external requests.
* JSON Schema validation with Ajv 2020: 8 representative outputs (three
  samples, short, long, missing, empty, `+` quirk), 0 invalid.

The exact commands and outputs are in `evidence/validation-run.txt`,
`evidence/offline-browser-test.json` and the test files.

## 11. Remaining unknowns

* Meaning of reserved `[36,38)`; the page never reads it.
* Whether the tester computes a checksum or has a longer internal record.
* Other firmware versions / payload lengths. Only one 53-char layout is
  verified.
* The tester's measurement and diagnostic algorithms. The page only reports
  encoded verdicts.
* The opaque `u` parameter (deliberately not decoded; not in the QR).
* Any future change to the vendor site. The decoder is independent, but a new
  firmware layout would need new evidence.
* The exact production date of the captured application beyond its
  `Last-Modified: 2024-11-29`.

## 12. Practical preservation procedure

1. **Keep the decoder.** Store `decoder.html` and a zip of this repository on
   at least two media (PC + USB/private cloud). It has no dependencies.
2. **Keep the spec.** `FORMAT.md` is readable without running code.
3. **Capture every report.** Scan the QR, save the raw text/URL, and decode it.
   Save the JSON/Markdown next to the QR text.
4. **Do not trust the site's TIME.** Record your own measurement/viewing time
   separately if it matters.
5. **After the domain dies.** The QR text still contains the full `d` payload.
   Paste it into `decoder.html`. No DNS, no server, no vendor code needed.
6. **If a future report looks different.** The decoder will report
   `unsupported_length` or unknown codes. Keep the payload, add a fixture, and
   investigate before extending the format. Do not edit the old layout to fit
   the new one.
7. **Keep the private evidence.** `evidence/private/` has the detailed capture
   records for later verification. It is not needed to decode, but it is the
   audit trail.

## 13. Legal, ethical and PII notes

* Only public pages and public static assets were accessed. No authentication,
  access control, CAPTCHA or rate-limit mechanism was bypassed.
* Synthetic tests were run against a local mirror, not the live site. The live
  site saw four navigations.
* Vendor code, capture records, images, fonts and HAR are **not**
  redistributed. They are in the gitignored `evidence/private/`.
* The optional `u` parameter is opaque and is not decoded.
* The `d` payload contains no personal data: no name, plate, VIN, serial,
  address or location. The three examples contain none. The vehicle model
  supplied as context is not part of the payload and is not recorded in the
  repository.
* The optional `u` parameter could contain a display date and (in commented-out
  future fields) plate/repair-shop/tester data. The decoder ignores it and
  redacts it from exported URLs.
* The decoder has no network requests, analytics, telemetry, cookies or
  external fonts. All processing is local.
* “Ultimate Speed”, “USBD1 A1”, “Lidl” and “OWIM” are used only to identify the
  device; no affiliation or endorsement is claimed.
* This is not legal advice. Reverse-engineering rules differ by jurisdiction;
  the user is responsible for their own use.

See `evidence/legal-and-pii.md` and `NOTICE`.
