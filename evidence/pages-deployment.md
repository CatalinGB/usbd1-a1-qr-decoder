# GitHub Pages deployment

**URL:** <https://catalingb.github.io/usbd1-a1-qr-decoder/>
**Deployed:** 2026-11-06
**Source:** `gh-pages` branch, repository root, with `.nojekyll`
**Sync workflow:** `.github/workflows/pages.yml`

## How it is published

`index.html` and `decoder.html` are identical single-file builds. On every push
to `main`, the `Publish decoder page` workflow copies those two files and
`.nojekyll` to the `gh-pages` branch. GitHub Pages serves the branch root.

The local file remains the primary artifact; Pages is a convenience.

## Why a branch instead of the artifact deployment

The first attempt used `actions/upload-pages-artifact` +
`actions/deploy-pages`. The artifact upload succeeded, but the deployment
consistently ended with GitHub's generic Pages backend error:

```
Getting Pages deployment status...
Error: Deployment failed, try again later.
```

This is a known GitHub Pages service-side failure mode, not a repository
configuration error (the environment allowed `main`, and the Pages status page
reported no incident). Disabling/re-enabling Pages and switching to a legacy
`gh-pages` branch deployment succeeded. The published files are byte-identical
to the local build.

## Live verification (2026-11-06)

`evidence/pages-test.json` records a Chromium test against the live URL:

* paste a full vendor report URL → GOOD BATTERY, 51%, 366 A, 12.61 V, 6.06 mΩ
* open `?d=…` → auto-decodes the cranking report (NORMAL, 10.6 V, 3580 ms)
* sample 3 → Polish AGM report, `DOBRZE - ŁADOWANIA`, 66%, 3.59 mΩ, `Samochód`
* dark-mode toggle works
* `decoder.html` route also loads
* **5/5 checks passed; 0 external requests, 0 console errors, 0 page errors**

The live page SHA-256 matched the committed `index.html` at capture time:

```
19a805f730c8dcdc405264066ce7359233cf87ae1098b17249eb209a71aace45
```
