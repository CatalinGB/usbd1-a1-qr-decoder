# Evidence and method notes

**Investigation date:** 2026-11-06
**Target:** `https://e.dh5z.com/` — the public QR-report page used by the
Ultimate Speed USBD1 A1 battery tester.
**Result:** an independent offline decoder, verified against the captured
renderer, with 173 automated tests and 2,337 differential field comparisons.

## What is published, and what is not

Published here:

* the independently written decoder and format specification;
* behavioral test fixtures and captured rendered text;
* HTTP headers for the public report page;
* validation output and live-page test results.

Not published:

* vendor code, source materials or capture records;
* any embedded secret;
* vendor logos, icons, screenshots or trade dress;
* any personal data.

Detailed capture records (raw responses, local renderer copy, asset hashes and
line-level notes) are retained privately in `evidence/private/`, which is
gitignored. They are an audit trail, not a distributable artifact.

## 1. Reachability

The local resolver returned `SERVFAIL`; Google Public DNS returned
`8.209.102.145`. The site itself was healthy (valid TLS, HTTP 200). Requests
used `curl --resolve` and Chromium `--host-resolver-rules`.

## 2. What the server returns

`GET /` and every `GET /?d=...` return the same **2,877-byte HTML shell**:

| Header | Value |
|---|---|
| Server | `nginx/1.10.2` |
| Content-Type | `text/html` |
| Content-Length | `2877` |
| Last-Modified | `Fri, 29 Nov 2024 08:12:08 GMT` |
| ETag | `"67497758-b3d"` |

The report is a client-side single-page application. There is no report API.

A fresh Chromium context opened the home page and the three supplied report
URLs. The capture recorded status, console output, failed requests, DOM,
screenshots and a HAR with embedded bodies. The HAR contains **56 requests,
all GET, all to `e.dh5z.com`**, and **zero XHR/fetch calls or third-party
hosts**. The HTML response for a report URL is byte-identical to `/`.

Synthetic tests were run against a local copy of the captured renderer, with
all non-localhost requests aborted. Only four live navigations were made; no
synthetic payload was sent to the public host.

## 3. How the format was established

The format was established by observing the public report page and by
controlled differential testing against a captured local copy of its renderer.
The decoder is an independent implementation; no vendor code is included or
required.

For each candidate field, one character or code was changed at a time while the
rest of the payload was held constant. The captured renderer's parsed state
and rendered output were recorded. The result was then implemented in
`src/decoder.js` and compared field-by-field.

The detailed audit records are private; the public evidence here is behavioral
and reproducible through the tests in `tests/`.

## 4. Behaviour reproduced from the running page

All synthetic tests were local. Controlled observations:

| Observation | Result |
|---|---|
| `/` with no `d` | `TypeError: Cannot read properties of undefined (reading 'split')`; header + address render, no test section |
| `?d=` empty | Parses an empty string; all numeric fields `NaN`; no report section |
| duplicate `?d=...&d=...` | The page throws before parsing |
| length 52 | Report type missing; page renders header + vehicle/time only |
| length 54 / 80 | Extra characters ignored; page renders normally |
| unknown code | The i18n key is displayed literally (e.g. `batteryTest.type_9`) |
| non-decimal numeric | JavaScript conversion is displayed (`NaN` or a prefix value); no validation message |
| `0x606` in resistance | `parseInt("0x606")` = 1542 → `15.42 mΩ` |
| leading zeros | Numeric value drops them; raw text retains them |
| `+` in a numeric field | `parseInt("0+66")` = 0; `+` is not converted to a space |
| percent-encoded `d` | Decoded normally |
| `u` without `d` | Date applied, then the page throws on parsing; no report |
| reload | TIME changes |
| edit TIME via the picker | URL gains a `u` parameter; the chosen date survives reload |
| browser timezone | same instant displays differently in different zones |

Differential result: **2,337 parsed-field comparisons** against the captured
renderer (125 curated cases × 19 fields; 2 cases had no parsed state because the
page threw). **0 mismatches.** See `tests/reference.test.mjs` and
`fixtures/reference-state.json`.

## 5. Version stability

A 2025-09-28 archive snapshot of the same public application was stable
relative to the 2026-11-06 capture. This supports version stability for about
13 months. It is not evidence that every USBD1 A1 firmware version emits the
same payload layout.

## 6. Evidence grades

| Claim | Grade | Basis |
|---|---|---|
| Slices, scales, enum tables, language map, report types | **C. Recovered from the public page** | Implementation-level analysis of the public page; confirmed by differential rendering |
| Two supplied examples | **A + B + C** | User-supplied observations, live rendering, recovered format |
| Third indexed example | **B + C** | Live rendering and recovered format; its indexed title was `wyniki testu baterii` |
| No server-side processing | **B** | 56 static GETs, 0 XHR/fetch; identical HTML for all report URLs |
| No checksum or length validation in the page | **B + C** | Behaviour and controlled tests; no checksum code path |
| TIME is page-load time, not measurement time | **B + C** | Reload/timezone tests and rendered behaviour |
| Payload alphabet | **B + C** | Digits plus `a`–`j` observed for language; page accepts any character |
| Reserved `[36,38)` meaning | **E. Unknown** | Never read by the page; observed `00` in all three samples |
| Tester diagnostic algorithm | **E. Unknown** | Not in the web page; verdicts are encoded codes |
| Whether the tester computes a checksum | **E. Unknown** | Not observable from the page |
| Other firmware layouts | **E. Unknown** | No other firmware payloads captured |

## 7. Corrections to the earlier hypotheses

The earlier guesses were structurally wrong. The verified layout is in
[`../FORMAT.md`](../FORMAT.md). Key corrections:

* SoH is `[18,21)` and SoC is `[15,18)`; RATED is `[1,5)`.
* Resistance is `[21,26)`.
* Cranking voltage is `[27,31)` and duration `[31,35)`.
* `[36,38)` is reserved/unused; `[38,42)` is LOADED, `[42,46)` is UNLOADED,
  `[46,50)` is RIPPLE.
* `[51,52)` is the language code (`c` → Polish), not a checksum.
* `[52,53)` is the report type (1 battery, 2 cranking, 3 charging, 4 all).
* The payload is not decimal-only; `a`–`j` are valid language codes.
* The displayed TIME is not a measurement timestamp.

## 8. Privacy and legal notes

* Only public pages were accessed. No authentication, access control, CAPTCHA
  or rate-limit mechanism was bypassed.
* The `d` payload contains no name, plate, VIN, serial, address or location.
* The optional `u` parameter is opaque and is ignored and redacted by the
  decoder. It is not part of the QR.
* The decoder has no network requests, analytics, telemetry, cookies or
  external fonts. All processing is local.
* Vendor code, capture records and any embedded secrets are not redistributed.
* “Ultimate Speed”, “USBD1 A1”, “Lidl” and “OWIM” are used only to identify the
  device; no affiliation or endorsement is claimed.

See `../DISCLAIMER.md`, `../NOTICE` and `legal-and-pii.md`.
