# Third-party notices

The runtime decoder (`decoder.html`, `src/`, `cli/`) has **no third-party
dependencies**. It does not bundle any JavaScript library, font, icon or
stylesheet.

The optional browser acceptance test (`tools/offline-browser-test.cjs`) uses
`playwright-core`, which is not bundled and is installed separately by the
user. Playwright is licensed under the Apache License 2.0:
<https://github.com/microsoft/playwright/blob/main/LICENSE>.

The format specification contains factual lookup tables (battery standards,
JIS designations, tester codes and short UI labels). Those are functional facts
and short phrases observed in the public page; see `NOTICE` for provenance.

No vendor code, image or font is distributed in this repository. See `evidence/legal-and-pii.md`.
