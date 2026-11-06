# Evidence directory

The public repository keeps **behavioral** evidence:

| File | Contents |
|---|---|
| `headers/` | HTTP headers for the public report page and the HTML shell |
| `method-notes.md` | how the format was established, evidence grades, limits |
| `test-observations.jsonl` | controlled observations and differential fixtures |
| `validation-run.txt` | actual test and CLI output |
| `offline-browser-test.json` | browser acceptance run of the local HTML app |
| `pages-test.json` | live GitHub Pages acceptance run |
| `pages-deployment.md` | Pages hosting and deployment notes |
| `legal-and-pii.md` | legal, ethical and PII analysis |

Detailed capture records — raw responses, the local renderer copy, asset
hashes and line-level analysis — are retained privately in `evidence/private/`,
which is gitignored. They are an audit trail and are not part of the published
artifact.

No vendor code is distributed. The decoder is an independent implementation.
