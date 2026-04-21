# Image + Number Single KPI Card Extension

## What This Is

A focused Tableau custom worksheet extension that renders exactly one KPI card for testing an image-plus-number layout before using the more complex dynamic multi-card grid.

## Core Value

The extension must reliably show the image URL and numeric value from the first Tableau summary data row. This keeps the test harness small enough to isolate Tableau data mapping, image loading, and number formatting issues before grid behavior is introduced.

## Requirements

### Active

- [x] Extension initializes through Tableau Extensions API
- [x] Worksheet visual specification is read to resolve `Image URL` and `Value` encodings
- [x] Worksheet summary data is loaded through `getSummaryDataReaderAsync()`
- [x] Only the first valid row is rendered as one card
- [x] Image source comes from a Tableau dimension field mapped to the image encoding
- [x] Number comes from a Tableau measure field mapped to the value encoding
- [x] Numbers are formatted with comma separators
- [x] Missing or broken image URLs show a neutral placeholder
- [x] Failed image elements do not show the browser's broken-image square
- [x] UI status indicator shows current extension state and mapping diagnostics
- [x] Summary data changes trigger a re-render
- [x] HTTP `.trex` manifest points to `http://localhost:8081/index.html` for Tableau Desktop
- [x] HTTPS `.trex` manifest points to `https://localhost:8443/index.html` for Tableau Online
- [x] HTTPS diagnostic `.trex` verifies source loading and Tableau SDK initialization before testing card code
- [x] GitHub Pages `.trex` points to `https://abhinandan-cyntexa.github.io/img-num-ext-single/index.html` for hosted HTTPS testing

### Out of Scope

- Multi-card grid layout
- Card labels or titles
- Number abbreviation style
- Runtime settings UI
- External chart libraries
- Server-side code
- npm/package-based local server workflow

## Context

- Reference project: `/Users/abhinandansingh/Documents/cyntexa-dev/Tableau/Custom-Extensions/img-num-ext`
- The reference screenshot shows a single white card with an image/icon above a comma-formatted value.
- The sibling `tableau-viz` project shows the local Tableau Viz Extension structure: static `index.html`, `chart.js`, and `.trex` files.
- This project intentionally tests one card only, even when Tableau returns multiple rows.

## Constraints

- Plain HTML/CSS/JS only
- Tableau Extensions API loaded locally from `vendor/tableau.extensions.1.latest.js`
- Tableau Desktop local development uses `python3 -m http.server 8081`
- Tableau Online local development uses `python3 serve_https.py` on `https://localhost:8443`
- Hosted Tableau Online testing uses GitHub Pages at `https://abhinandan-cyntexa.github.io/img-num-ext-single/index.html`
- No `package.json` or `npm start` workflow is required for this project
- Tableau light-theme styling: white surface, subtle border/shadow, neutral typography

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Render only the first data row | Isolates card rendering before multi-card grid complexity | Locked |
| Keep two encodings only | Matches the minimum image-plus-number test need | Locked |
| Use DOM/CSS rendering | Avoids dependencies and keeps Tableau debugging simple | Locked |
| Keep HTTP and HTTPS manifests | Tableau Desktop can use HTTP; Tableau Online requires HTTPS to avoid mixed-content blocking | Locked |
| Keep a diagnostic HTTPS manifest | Separates source/SDK loading failures from `chart.js` rendering bugs | Locked |
| Add a GitHub Pages manifest | Gives Tableau Online a stable hosted HTTPS URL without localhost certificate prompts | Locked |

---
*Last updated: 2026-04-22 after GitHub Pages manifest setup*
