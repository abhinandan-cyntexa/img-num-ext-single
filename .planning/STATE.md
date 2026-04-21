# Project State

## Current Focus

- Phase: `1 / 2`
- Active plan: `260421-001`
- Status: Implemented, pending Tableau Desktop verification
- Last activity: 2026-04-21 - Removed optional browser mock test page and added minimal Excel dataset for Tableau Desktop testing

## Decisions In Effect

- Runtime source of truth is the project root
- Local dev server is `python3 -m http.server 8081`
- Local manifest URL is `http://localhost:8081/index.html`
- `package.json` is intentionally not used; Python static serving is sufficient
- The Tableau SDK is loaded from Tableau's CDN
- The renderer intentionally uses only the first summary data row
- Multi-card grid behavior is out of scope for this test project

## Completed So Far

- Project planning artifacts created
- Single-card architecture plan created
- Static extension shell, renderer, README, and local manifest implemented
- UI status indicator added for extension state, missing mappings, missing summary fields, no-data state, ready state, and image fallback
- Minimal Excel test dataset added at `test-data/image-number-single-card.xls`

## Open Verification Gates

- Load `img-num-ext-single-local.trex` in Tableau Desktop
- Connect Tableau to `test-data/image-number-single-card.xls`
- Confirm `Image URL` and `Value` encodings appear on the Marks card
- Map a URL dimension and numeric measure
- Confirm the card renders and updates after worksheet data changes

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260421-001 | Single-card architecture for image-plus-number Tableau test extension | 2026-04-21 | ddc5980 | [260421-001-single-card-architecture](./quick/260421-001-single-card-architecture/) |

## Next Step

Run the local server from this folder, then load `img-num-ext-single-local.trex` in Tableau Desktop.

---
*Last updated: 2026-04-21 after dataset and README update*
