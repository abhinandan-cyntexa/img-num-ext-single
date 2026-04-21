# Image + Number Single KPI Card Extension

## What This Is

A focused Tableau custom worksheet extension that renders exactly one KPI card for testing an image-plus-number layout before using the more complex dynamic multi-card grid.

## Core Value

The extension must reliably show the image URL and numeric value from the first Tableau summary data row. This keeps the test harness small enough to isolate Tableau data mapping, image loading, and number formatting issues before grid behavior is introduced.

## Requirements

### Active

- [ ] Extension initializes through Tableau Extensions API v2
- [ ] Worksheet visual specification is read to resolve `Image URL` and `Value` encodings
- [ ] Worksheet summary data is loaded through `getSummaryDataReaderAsync()`
- [ ] Only the first valid row is rendered as one card
- [ ] Image source comes from a Tableau dimension field mapped to the image encoding
- [ ] Number comes from a Tableau measure field mapped to the value encoding
- [ ] Numbers are formatted with comma separators
- [ ] Missing or broken image URLs show a neutral placeholder
- [ ] UI status indicator shows current extension state and mapping diagnostics
- [ ] Summary data changes trigger a re-render
- [ ] Local `.trex` manifest points to `http://localhost:8081/index.html`

### Out of Scope

- Multi-card grid layout
- Card labels or titles
- Number abbreviation style
- Runtime settings UI
- External chart libraries
- Server-side code

## Context

- Reference project: `/Users/abhinandansingh/Documents/cyntexa-dev/Tableau/Custom-Extensions/img-num-ext`
- The reference screenshot shows a single white card with an image/icon above a comma-formatted value.
- The sibling `tableau-viz` project shows the local Tableau Viz Extension structure: static `index.html`, `chart.js`, and `.trex` files.
- This project intentionally tests one card only, even when Tableau returns multiple rows.

## Constraints

- Plain HTML/CSS/JS only
- Tableau Extensions API v2 loaded from `https://extensions.tableau.com/lib/tableau.extensions.2.latest.js`
- Local development uses `python3 -m http.server 8081`
- No `package.json` or `npm start` workflow is required for this project
- Tableau light-theme styling: white surface, subtle border/shadow, neutral typography

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Render only the first data row | Isolates card rendering before multi-card grid complexity | Locked |
| Keep two encodings only | Matches the minimum image-plus-number test need | Locked |
| Use DOM/CSS rendering | Avoids dependencies and keeps Tableau debugging simple | Locked |
| Use a local-only manifest first | The immediate target is Tableau Desktop testing | Locked |

---
*Last updated: 2026-04-21 after single-card scaffold*
