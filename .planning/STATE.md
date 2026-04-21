# Project State

## Current Focus

- Phase: `1 / 2`
- Active plan: `260421-001`
- Status: Implemented, verified in Tableau Online, and prepared for GitHub Pages hosting
- Last activity: 2026-04-22 - Added GitHub Pages manifest and documentation for hosted HTTPS Tableau Online testing

## Decisions In Effect

- Runtime source of truth is the project root
- Tableau Desktop dev server is `python3 -m http.server 8081`
- Tableau Desktop manifest URL is `http://localhost:8081/index.html`
- Tableau Online dev server is `python3 serve_https.py`
- Tableau Online manifest URL is `https://localhost:8443/index.html`
- Tableau Online diagnostic manifest URL is `https://localhost:8443/debug.html`
- GitHub Pages hosted manifest URL is `https://abhinandan-cyntexa.github.io/img-num-ext-single/index.html`
- `package.json` is intentionally not used; Python static serving is sufficient
- The Tableau SDK is vendored locally at `vendor/tableau.extensions.1.latest.js`
- The renderer intentionally uses only the first summary data row
- Multi-card grid behavior is out of scope for this test project
- Local `certs/` and `__pycache__/` folders are ignored runtime artifacts

## Completed So Far

- Project planning artifacts created
- Single-card architecture plan created
- Static extension shell, renderer, README, and local manifest implemented
- UI status indicator added for extension state, missing mappings, missing summary fields, no-data state, ready state, and image fallback
- Minimal Excel test dataset added at `test-data/image-number-single-card.xls`
- Tableau SDK vendored locally to avoid blocking CDN/network failures
- Parser supports both `marksSpecifications`/`encodings` and legacy `marksSpecificationCollection`/`encodingCollection`
- Local manifest version bumped to `0.3.0`
- Runtime structure aligned with the working heatmap reference: local SDK in `<head>`, plain source URL, and in-flow status panel
- HTTPS local server added for Tableau Online because Tableau Online blocks HTTP localhost mixed content
- HTTPS diagnostic manifest added to verify source loading and `initializeAsync()` before card rendering
- Tableau Online test flow verified by user: status UI and card render successfully
- Broken-image fallback no longer shows the native browser broken-image square
- GitHub repository created at `https://github.com/abhinandan-cyntexa/img-num-ext-single`
- GitHub Pages manifest added for hosted HTTPS usage

## Open Verification Gates

- Optional: repeat the same mapping test in Tableau Desktop with `img-num-ext-single-local.trex`
- Optional: validate `SummaryDataChanged` refresh behavior after filter changes in Tableau Online
- Verify GitHub Pages deployment returns `200 OK` after Pages finishes publishing
- Load `img-num-ext-single-github-pages.trex` in Tableau Online

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260421-001 | Single-card architecture for image-plus-number Tableau test extension | 2026-04-21 | ddc5980 | [260421-001-single-card-architecture](./quick/260421-001-single-card-architecture/) |
| runtime-fixes | HTTPS Tableau Online support, diagnostic manifest, vendored SDK, fallback cleanup | 2026-04-22 | 89b5374 | n/a |
| github-pages | Hosted HTTPS manifest for GitHub Pages | 2026-04-22 | pending | n/a |

## Next Step

Enable GitHub Pages from the `main` branch root, then load `img-num-ext-single-github-pages.trex` in Tableau Online.

---
*Last updated: 2026-04-22 after GitHub Pages manifest setup*
