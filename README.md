# Image + Number Single Card Tableau Extension

This repo contains a focused Tableau Viz Extension that renders exactly one image-plus-number KPI card from worksheet data. It is a smaller test harness for validating the card architecture before moving the same ideas into a more complex multi-card grid.

## Current Status

Last verified: 2026-04-21

- Runtime JavaScript parses successfully with `node --check chart.js`
- Local manifest XML validates with `xmllint --noout img-num-ext-single-local.trex`
- Python static server returns `200 OK` for `index.html` and `test.html`
- No `package.json` is required or included
- Local manifest points to `http://localhost:8081/index.html`

## What The Extension Does

- Initializes through the Tableau Extensions API
- Reads the worksheet visual specification to find mapped fields
- Loads worksheet summary data through `getSummaryDataReaderAsync()`
- Uses only the first summary data row
- Renders one image above one comma-formatted number
- Shows a fallback icon when the image URL is blank or broken
- Re-renders when Tableau fires `SummaryDataChanged`
- Shows a visible status panel for current state and field mappings

## Project Files

| File | Purpose |
|---|---|
| `index.html` | Main Tableau runtime page loaded by the `.trex` manifest |
| `styles.css` | Card layout, image fallback, status panel, and responsive styles |
| `chart.js` | Tableau initialization, mapping diagnostics, data parsing, rendering |
| `test.html` | Browser-only mock Tableau test page |
| `img-num-ext-single-local.trex` | Local Tableau Viz Extension manifest |
| `.planning/` | GSD planning and state artifacts |

## Architecture

The manifest exposes two Tableau Marks card encodings:

- `Image URL` - discrete dimension, max one field
- `Value` - continuous measure, max one field

Runtime flow:

1. `tableau.extensions.initializeAsync()` connects to Tableau.
2. `worksheet.getVisualSpecificationAsync()` reads the mapped encoding fields.
3. `worksheet.getSummaryDataReaderAsync()` loads summary data.
4. `chart.js` checks whether required fields are mapped and present in summary data.
5. The first row is parsed into `{ imageUrl, value }`.
6. The card renders the image and formatted number.
7. `SummaryDataChanged` triggers the same flow again.

## Prerequisites

- Tableau Desktop with local Viz Extension loading enabled
- Python 3 available as `python3`
- A worksheet with:
  - one field containing image URLs
  - one numeric measure

No npm setup is needed for this project.

## Run Locally

From this repo:

```bash
cd /Users/abhinandansingh/Documents/cyntexa-dev/Tableau/Custom-Extensions/img-num-ext-single
python3 -m http.server 8081
```

Open the browser mock test:

```text
http://localhost:8081/test.html
```

The Tableau runtime URL is:

```text
http://localhost:8081/index.html
```

The local manifest already points to that URL:

```text
img-num-ext-single-local.trex
```

If port `8081` is not available, either stop the process using that port or update the `.trex` `<source-location>` URL to the port you choose.

## Browser Mock Test

Use `test.html` before testing in Tableau. It provides a mocked Tableau API and sample data, so no Tableau session is required.

Expected result:

- One white card appears
- Image/icon appears above the number
- Number renders as `1,223,661`
- Status panel shows `Ready`
- Mapping panel shows:
  - `Image URL`
  - `Member Count`

Browser test URL:

```text
http://localhost:8081/test.html
```

## Tableau Desktop Test

1. Start the local server:

   ```bash
   python3 -m http.server 8081
   ```

2. Open Tableau Desktop.

3. Open or create a worksheet with at least:

   - an image URL field
   - a numeric value field

4. On the Marks card, open the mark type dropdown.

5. Choose `Viz Extensions`.

6. Choose `Add Extension`.

7. Choose local extension loading and select:

   ```text
   /Users/abhinandansingh/Documents/cyntexa-dev/Tableau/Custom-Extensions/img-num-ext-single/img-num-ext-single-local.trex
   ```

8. Map fields:

   - Drag the image URL field to `Image URL`
   - Drag the numeric measure to `Value`

9. Confirm the extension renders one card.

10. Change a worksheet filter or mapped data value and confirm the card re-renders.

## Status Panel

The top-left panel shows the extension state and mapping diagnostics.

| Status | Meaning |
|---|---|
| `Initializing` | Extension page loaded and is connecting to Tableau |
| `Loading worksheet` | Reading visual specification and summary data |
| `Needs mapping` | One or more required encodings are not mapped or missing from summary data |
| `No data` | Required mappings exist, but Tableau returned zero rows |
| `Loading image` | Value is rendered and the image URL is being loaded |
| `Ready` | Image and value rendered successfully |
| `Image fallback` | Value rendered, but image URL was blank or failed to load |
| `Error` | Unexpected runtime or Tableau API error |

Mapping rows:

- `Image URL` shows the current image field or `Not mapped`
- `Value` shows the current value field or `Not mapped`
- If a mapped field is absent from summary data, the panel shows `Missing in data: <field name>`

## Manual Test Checklist

Use this checklist before moving logic back into the multi-card grid.

- [ ] `python3 -m http.server 8081` starts without errors
- [ ] `http://localhost:8081/test.html` renders the mock card
- [ ] `img-num-ext-single-local.trex` loads in Tableau Desktop
- [ ] Marks card shows `Image URL` and `Value`
- [ ] Missing `Image URL` mapping shows `Needs mapping`
- [ ] Missing `Value` mapping shows `Needs mapping`
- [ ] Valid mappings render one card
- [ ] Number uses comma formatting
- [ ] Blank image URL shows fallback icon
- [ ] Broken image URL shows fallback icon and `Image fallback`
- [ ] Filter or summary data changes update the rendered card

## Verification Commands

Run these from the repo root:

```bash
node --check chart.js
xmllint --noout img-num-ext-single-local.trex
curl -I http://localhost:8081/index.html
curl -I http://localhost:8081/test.html
```

Expected result:

- `node --check` prints no syntax errors
- `xmllint` prints no XML errors
- both `curl` commands return `HTTP/1.0 200 OK` or another `200 OK` response

## Troubleshooting

### Tableau says the extension cannot load

- Confirm the Python server is running from this repo.
- Confirm the manifest URL is `http://localhost:8081/index.html`.
- Open `http://localhost:8081/index.html` in a browser to confirm the file is served.
- If using a different port, update `img-num-ext-single-local.trex`.

### Port 8081 is already in use

Find the process:

```bash
lsof -nP -iTCP:8081
```

Then either stop that process or run the server on another port and update the manifest.

### Status shows Needs mapping

Map both required encodings in Tableau:

- `Image URL`
- `Value`

If the panel says `Missing in data`, Tableau's visual specification has a field name that is not present in the summary data returned to the extension. Re-map the field or refresh the worksheet.

### Status shows Image fallback

The number is valid, but the image did not render. Check that the image URL:

- is not blank
- is a valid URL string
- is reachable from the Tableau iframe
- points directly to an image file or image response

### Status shows No data

The fields are mapped, but Tableau returned no rows. Check worksheet filters and confirm the mapped fields produce at least one summary row.

### Number does not render

The `Value` field must be numeric or a numeric string. Values like `1,223,661` are accepted; non-numeric strings are rejected.

## Known Scope Limits

- Renders only the first row
- Does not render a grid
- Does not include card labels or titles
- Does not abbreviate numbers as `1.2M`
- Does not require npm or a build step
- Uses plain HTML, CSS, and JavaScript only

## Related GSD Artifacts

- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/quick/260421-001-single-card-architecture/260421-001-PLAN.md`
- `.planning/quick/260421-001-single-card-architecture/260421-001-SUMMARY.md`
