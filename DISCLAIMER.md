# Disclaimer

## Not affiliated

This is an independent interoperability and preservation project. It is **not**
affiliated with, endorsed by, sponsored by or approved by OWIM GmbH & Co. KG,
Lidl, Ultimate Speed, or any related company.

“Ultimate Speed”, “USBD1 A1”, “Lidl” and “OWIM” are trademarks of their
respective owners. They are used only to identify the device and the report
format (nominative use). No logo, icon, screenshot, trade dress or vendor
code is distributed in this repository.

## What this repository contains

* An independently written decoder for a publicly observable URL format.
* A factual specification of field positions, numeric scales and short code
  labels.
* Tests and behavioral evidence.
* Short functional UI labels observed in the public page, reproduced only so
  that an encoded label can be read back faithfully.

It does **not** contain:

* vendor code, capture records, images or fonts (these are kept only in the
  gitignored `evidence/private/`);
* any embedded secret;
* any bypass of authentication, access control, CAPTCHA or anti-abuse system;
* any personal data (the `d` payload contains no name, plate, VIN, serial,
  address or location).

## No warranty / not safety advice

The decoder reproduces one captured web-application version. It is provided
“as is”, without warranty of any kind. Verdicts are **tester-reported codes**,
not an independent diagnosis. Do not use this project as the sole basis for a
safety, warranty, insurance or vehicle-sale decision.

## If you are a rights holder

If you believe this repository contains material that should not be published,
please open an issue in the repository. Specific material can be reviewed and
removed. The factual format description can be expressed independently of any
particular implementation.

## Jurisdiction

Reverse-engineering and interoperability rules differ by country. In the EU,
the Software Directive (2009/24/EC) Article 6 permits certain decompilation for
interoperability; national implementations differ. In the US, interoperability
reverse engineering and fair use are fact-specific, and anti-circumvention
rules can apply to technical protection measures (none was bypassed here).
This document is not legal advice. The user is responsible for their own use
and should consult a qualified lawyer for their jurisdiction.
