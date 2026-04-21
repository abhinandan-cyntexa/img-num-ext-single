# Roadmap: Image + Number Single KPI Card Extension

## Overview

This project ships a minimal Tableau worksheet extension that renders one image-plus-number KPI card from worksheet data. It is a validation path for the larger dynamic grid project.

## Phases

- [x] **Phase 1: Single-Card Architecture** - Static extension scaffold, Tableau data binding, card renderer, and local manifest
- [ ] **Phase 2: Tableau Desktop Verification** - Load the local `.trex` and confirm data mappings in Tableau Desktop

## Phase Details

### Phase 1: Single-Card Architecture

**Goal**: Create a runnable static Tableau Viz Extension that renders one card from `Image URL` and `Value` encodings.

**Success Criteria**:

1. `index.html`, `styles.css`, and `chart.js` exist at the project root
2. `img-num-ext-single-local.trex` points to `http://localhost:8081/index.html`
3. Browser mock test renders one card without Tableau
4. The runtime listens for `SummaryDataChanged`
5. The renderer uses only the first Tableau summary data row

Plans:

- [x] `260421-001-PLAN.md` - Build the single-card static extension

### Phase 2: Tableau Desktop Verification

**Goal**: Confirm the extension works inside Tableau Desktop with real worksheet fields.

**Success Criteria**:

1. Tableau accepts `img-num-ext-single-local.trex`
2. The Marks card shows `Image URL` and `Value`
3. Mapping fields renders the expected single card
4. Worksheet filter changes re-render the card
5. Missing/broken image URLs show the placeholder

Plans:

- [ ] TBD - Human Tableau Desktop verification

## Progress

| Phase | Plans Complete | Status |
|-------|----------------|--------|
| 1. Single-Card Architecture | 1/1 | Implemented |
| 2. Tableau Desktop Verification | 0/1 | Pending human Tableau session |

---
*Last updated: 2026-04-21 after single-card scaffold*
