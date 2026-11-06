# Legal, ethical and PII notes

This is an interoperability and preservation project. It is **not legal
advice**; laws differ by jurisdiction. The notes below record what was done and
what was deliberately not done.

## What was accessed

* The public report site `https://e.dh5z.com/` and its public static assets.
* No login, account, token, paywall or access control was bypassed.
* No anti-abuse challenge was circumvented. There was no CAPTCHA, WAF
  challenge or rate-limit response.
* No private report IDs were enumerated. Only the three URLs supplied or
  publicly indexed were opened.
* Synthetic payload tests were run against a **local mirror**, not against the
  live server. The live server saw four page navigations (home + three
  reports) and their static assets.

## Copyright and source code

Vendor code, capture records, images, fonts and HAR are the vendor's material.
They are kept only in `evidence/private/`, which is gitignored, and are **not
redistributed** in the public repository.

The decoder in `src/`, `decoder.html` and `cli/` is an independent
implementation written from the observed format. It does not include or
require vendor code.

`src/locales.js` contains short functional UI labels (for example `EFB`,
`GOOD BATTERY`, `NORMAL`, `Car`) that were observed in the public page. They
are reproduced only so that an encoded label can be read back faithfully.
They are not a creative translation work; the provenance is recorded in the
file header and in `INVESTIGATION.md`.

The optional `u` parameter is opaque website state (a display date). The decoder does not decode it.

## Reverse engineering

The analysis used publicly available behaviour of the report page. It did not
decompile a binary, defeat a technical protection measure, or access a
non-public server.

In the EU, the Software Directive (2009/24/EC) Article 6 permits decompilation
for interoperability under conditions; national implementations differ. In the
US, interoperability reverse engineering and fair use are fact-specific, and
the DMCA anti-circumvention rules can apply to technical protection measures
(no such measure was bypassed here). Other jurisdictions have their own rules.
The repository therefore publishes **format facts and independent code**, not
vendor code.

## Trademarks

“Ultimate Speed”, “USBD1 A1”, “Lidl” and “OWIM” are used only to identify the
device and the report format (nominative use). This project is not affiliated
with, endorsed by or sponsored by OWIM GmbH & Co. KG, Lidl, or Ultimate Speed.
No vendor logo or trade dress is included.

## Personal data (PII)

The `d` payload contains **no** name, plate number, VIN, address, account ID,
device serial number or precise location. It contains battery measurements,
codes and a language code. Two reports with the same measurements and settings
can be identical; there is no per-report identifier in the captured format.

The three examples used here are:

1. a report URL supplied by the device owner,
2. a cranking report URL supplied by the device owner,
3. a report URL that was already publicly indexed by a search engine.

None contains personal data. The vehicle model supplied as context is not part
of the payload and is not recorded in the repository.

The `u` query parameter is different: it may carry a display date and, in some
versions, user-supplied metadata. A future share flow could put personal data
there. This decoder:

* never reads `u` as report data,
* redacts `u` from any URL it exports,
* reports only that a `u` parameter was present.

The decoder makes no network requests, has no analytics, no telemetry, no
cookies and no external fonts. All processing is local to the user's browser
or process. The project does not operate a server and therefore does not
receive any report data.

## Evidence handling

`evidence/private/` is for the device owner's local records. It contains
capture records and the captured HAR. It is gitignored. The public evidence
contains headers, URLs, factual notes and test observations only.

If the user later adds a report that contains personal data (for example a
plate number in `u`), that report should be redacted before it is committed or
shared. The decoder's JSON export already redacts `u`.

## No warranty

The decoder reproduces the behaviour of one captured web application version.
It is provided “as is”, without warranty. Do not use it as the sole basis for a
safety, warranty, insurance or vehicle-sale decision. Verdicts are
tester-reported codes, not an independent diagnosis.
