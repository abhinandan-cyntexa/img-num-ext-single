# Image + Number Single Card Tableau Extension

This repo contains a focused Tableau Viz Extension that renders exactly one image-plus-number KPI card from worksheet data. It is a small validation project for testing the card architecture before moving the same behavior into a dynamic multi-card grid.

## Current Status

Last verified: 2026-04-22

- Confirmed working in Tableau Online with `img-num-ext-single-https-local.trex`
- Status panel renders inside Tableau and reports mapping/image state
- Broken-image fallback renders the neutral placeholder without the browser's broken-image square
- Runtime JavaScript parses successfully with `node --check chart.js`
- Local manifest XML files validate with `xmllint --noout`
- Python HTTP and HTTPS static servers return `200 OK` for `index.html`
- Minimal Excel test dataset exists at `test-data/image-number-single-card.xls`
- Tableau Extensions API is vendored locally at `vendor/tableau.extensions.1.latest.js`
- No `package.json` is required or included
- Tableau Desktop HTTP manifest points to `http://localhost:8081/index.html`
- Tableau Online HTTPS manifest points to `https://localhost:8443/index.html`

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
| `img-num-ext-single-local.trex` | Local HTTP Tableau Desktop manifest |
| `img-num-ext-single-https-local.trex` | Local HTTPS Tableau Online manifest |
| `img-num-ext-single-debug-https-local.trex` | HTTPS diagnostic manifest for isolating load issues |
| `debug.html` | Minimal Tableau SDK handshake page with no card-rendering logic |
| `serve_https.py` | Python HTTPS static server with no-cache headers |
| `test-data/image-number-single-card.xls` | Minimal Tableau test workbook |
| `vendor/tableau.extensions.1.latest.js` | Local Tableau Extensions API SDK |
| `.gitignore` | Ignores generated Python cache and local certificate files |
| `.planning/` | GSD planning and state artifacts |

## Test Dataset

The repo includes a real legacy Excel workbook:

```text
test-data/image-number-single-card.xls
```

Sheet:

```text
SingleCardData
```

Columns:

| Column | Purpose |
|---|---|
| `Scenario` | Optional filter field for switching test cases |
| `Image URL` | Field to map to the extension's `Image URL` encoding |
| `Value` | Field to map to the extension's `Value` encoding |

Rows:

| Scenario | Expected Behavior |
|---|---|
| `Primary valid image` | Renders the embedded SVG data URL and `1,223,661` |
| `Blank image fallback` | Renders the fallback icon and `875,000` |
| `Broken image fallback` | Renders the fallback icon and `250,000` |

The extension renders only the first summary row returned by Tableau. Use `Scenario` as a worksheet filter if you want to force a specific test row.

## Architecture

The manifest exposes two Tableau Marks card encodings:

- `Image URL` - discrete dimension, max one field
- `Value` - continuous measure, max one field

Runtime flow:

1. `tableau.extensions.initializeAsync()` connects to Tableau.
2. `worksheet.getVisualSpecificationAsync()` reads the mapped encoding fields.
3. `worksheet.getSummaryDataReaderAsync()` loads summary data.
4. `chart.js` supports both current Tableau visual-spec fields (`marksSpecifications`) and older sample-style fields (`marksSpecificationCollection`).
5. `chart.js` checks whether required fields are mapped and present in summary data.
6. The first row is parsed into `{ imageUrl, value }`.
7. The card renders the image and formatted number.
8. `SummaryDataChanged` triggers the same flow again.

## Prerequisites

- Tableau Desktop with local Viz Extension loading enabled
- Tableau Online, if testing in the browser-hosted authoring experience
- Python 3 available as `python3`
- The included `.xls` workbook, or another worksheet with:
  - one field containing image URLs
  - one numeric measure

No npm setup is needed for this project. The Tableau SDK is served locally from `vendor/`, so the extension does not depend on Tableau's CDN while testing.

## Run Locally For Tableau Desktop

From this repo:

```bash
cd /Users/abhinandansingh/Documents/cyntexa-dev/Tableau/Custom-Extensions/img-num-ext-single
python3 -m http.server 8081
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

## Run Locally For Tableau Online

Tableau Online is served over HTTPS, so the browser blocks any extension URL that starts with `http://`. If you see this warning, use the HTTPS path below:

```text
[blocked] The page at https://...online.tableau.com requested insecure content from http://localhost:8081/index.html
```

Create local certificate files:

```bash
mkdir -p certs
mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem localhost 127.0.0.1 ::1
```

If `mkcert` is not installed, this OpenSSL fallback creates a self-signed certificate:

```bash
mkdir -p certs
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout certs/localhost-key.pem \
  -out certs/localhost.pem \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

Start the HTTPS server:

```bash
python3 serve_https.py
```

Open the debug URL directly in the same browser once:

```text
https://localhost:8443/debug.html
```

If the browser shows a certificate warning, accept it before loading the extension in Tableau Online.

Add this diagnostic manifest in Tableau Online first:

```text
img-num-ext-single-debug-https-local.trex
```

Expected debug result inside Tableau:

```text
Debug page loaded
Tableau initializeAsync completed.
```

If the debug manifest works, add the real extension manifest:

```text
img-num-ext-single-https-local.trex
```

If the debug manifest does not show `Debug page loaded`, Tableau Online is still not reaching the local HTTPS server. If it shows `Debug page loaded` but says the Tableau SDK failed, the HTTPS source is reachable and the failure is in the Tableau handshake. Do not debug `chart.js` until this diagnostic page loads and initializes.

## Tableau Online Test

1. Start the HTTPS server from the repo root:

   ```bash
   python3 serve_https.py
   ```

2. Open this in the same browser and accept the certificate warning if prompted:

   ```text
   https://localhost:8443/debug.html
   ```

3. In Tableau Online, add:

   ```text
   img-num-ext-single-debug-https-local.trex
   ```

4. Confirm the debug extension shows:

   ```text
   Debug page loaded
   Tableau initializeAsync completed.
   ```

5. Replace the debug extension with:

   ```text
   img-num-ext-single-https-local.trex
   ```

6. Map fields:

   - Drag `Image URL` to the extension's `Image URL` encoding
   - Drag `Value` or `SUM(Value)` to the extension's `Value` encoding

7. Confirm the status panel appears at the top of the extension.

8. Confirm the card renders:

   - valid image URL: image above the number
   - blank or broken image URL: neutral fallback icon above the number
   - value: comma-formatted number, such as `250,000`

## Tableau Desktop Test

1. Start the local server:

   ```bash
   python3 -m http.server 8081
   ```

2. Open Tableau Desktop.

3. Connect to the included Excel workbook:

   ```text
   /Users/abhinandansingh/Documents/cyntexa-dev/Tableau/Custom-Extensions/img-num-ext-single/test-data/image-number-single-card.xls
   ```

4. Open the `SingleCardData` sheet.

5. Create a worksheet.

6. Add the local Viz Extension:

   - On the Marks card, open the mark type dropdown
   - Choose `Viz Extensions`
   - Choose `Add Extension`
   - Choose local extension loading
   - Select:

     ```text
     /Users/abhinandansingh/Documents/cyntexa-dev/Tableau/Custom-Extensions/img-num-ext-single/img-num-ext-single-local.trex
     ```

7. Map fields:

   - Drag `Image URL` to the extension's `Image URL` encoding
   - Drag `Value` to the extension's `Value` encoding

8. Confirm the extension renders one card.

9. Optional: add `Scenario` as a filter and switch between rows to test valid, blank, and broken image behavior.

10. Change the filter or mapped data and confirm the card re-renders.

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
| `Image fallback` | Value rendered, but image URL was blank or failed to load; the neutral placeholder is expected |
| `Error` | Unexpected runtime or Tableau API error |

Mapping rows:

- `Image URL` shows the current image field or `Not mapped`
- `Value` shows the current value field or `Not mapped`
- If a mapped field is absent from summary data, the panel shows `Missing in data: <field name>`

## Manual Test Checklist

- [ ] `python3 -m http.server 8081` starts without errors
- [ ] `http://localhost:8081/index.html` is reachable
- [ ] For Tableau Online, `python3 serve_https.py` starts without errors
- [ ] For Tableau Online, `https://localhost:8443/debug.html` is reachable in the same browser
- [ ] For Tableau Online, `img-num-ext-single-debug-https-local.trex` shows `Debug page loaded`
- [ ] For Tableau Online, the debug page shows `Tableau initializeAsync completed`
- [ ] Tableau connects to `test-data/image-number-single-card.xls`
- [ ] `img-num-ext-single-local.trex` loads in Tableau Desktop
- [ ] `img-num-ext-single-https-local.trex` loads in Tableau Online
- [ ] Marks card shows `Image URL` and `Value`
- [ ] Missing `Image URL` mapping shows `Needs mapping`
- [ ] Missing `Value` mapping shows `Needs mapping`
- [ ] Valid mappings render one card
- [ ] Number uses comma formatting
- [ ] `Primary valid image` shows the icon and `1,223,661`
- [ ] `Blank image fallback` shows fallback icon and `875,000`
- [ ] `Broken image fallback` shows fallback icon and `250,000`
- [ ] Fallback state does not show a small broken-image square above the icon
- [ ] Filter or summary data changes update the rendered card

## Verification Commands

Run these from the repo root:

```bash
node --check chart.js
xmllint --noout img-num-ext-single-local.trex
xmllint --noout img-num-ext-single-https-local.trex
xmllint --noout img-num-ext-single-debug-https-local.trex
file test-data/image-number-single-card.xls
curl -I http://localhost:8081/vendor/tableau.extensions.1.latest.js
curl -I http://localhost:8081/index.html
curl -k -I https://localhost:8443/vendor/tableau.extensions.1.latest.js
curl -k -I https://localhost:8443/index.html
curl -k -I https://localhost:8443/debug.html
```

Expected result:

- `node --check` prints no syntax errors
- `xmllint` prints no XML errors
- `file` reports `CDFV2 Microsoft Excel`
- all `curl` commands return `HTTP/1.0 200 OK` or another `200 OK` response

## Troubleshooting

### The page is blank in Tableau

- If using Tableau Online, do not use `img-num-ext-single-local.trex`; it points to insecure HTTP and will be blocked.
- Use `python3 serve_https.py` and `img-num-ext-single-https-local.trex` for Tableau Online.
- Test `img-num-ext-single-debug-https-local.trex` first. If the static debug page is blank, the issue is the HTTPS local-server path, not the extension runtime.
- Confirm `http://localhost:8081/vendor/tableau.extensions.1.latest.js` returns `200 OK`.
- Reload the extension in Tableau after restarting the Python server.
- Confirm `img-num-ext-single-local.trex` points to `http://localhost:8081/index.html`.
- The extension no longer depends on Tableau's CDN; if the status panel is still missing, Tableau is likely not loading this repo's `index.html`.

### Tableau Online blocks localhost

Tableau Online runs under `https://...online.tableau.com`. Browsers block an HTTPS page from loading `http://localhost:8081/index.html` inside an iframe. That is mixed content blocking, and no JavaScript change in this repo can bypass it.

Use:

```text
https://localhost:8443/index.html
```

with:

```text
img-num-ext-single-https-local.trex
```

The `prod.telemetry.tableausoftware.com` CORS errors in the browser console are Tableau telemetry calls and are not the reason this extension is blank.

### Tableau Online says Could not connect to the server

This means the browser cannot reach `https://localhost:8443/...`.

- Confirm `python3 serve_https.py` is still running.
- Open `https://localhost:8443/debug.html` directly in the same browser.
- Accept the local certificate warning if the browser shows one.
- Run `curl -k -I https://localhost:8443/debug.html` and confirm `200 OK`.
- Confirm the Tableau Online manifest is `img-num-ext-single-https-local.trex` or `img-num-ext-single-debug-https-local.trex`, not the HTTP desktop manifest.

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

### Tableau cannot open the dataset

- Confirm the file exists at `test-data/image-number-single-card.xls`.
- Confirm `file test-data/image-number-single-card.xls` reports `CDFV2 Microsoft Excel`.
- Reconnect the workbook in Tableau if it was open before the file was created.

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

The fallback icon is expected for blank or broken image URLs. A small square above the fallback icon is not expected; `styles.css` includes a global `[hidden]` rule to keep failed image elements out of layout.

### Status shows No data

The fields are mapped, but Tableau returned no rows. Check worksheet filters and confirm the mapped fields produce at least one summary row.

### Number does not render

The `Value` field must be numeric or a numeric string. Values like `1,223,661` are accepted; non-numeric strings are rejected.

## Local Runtime Artifacts

These files and folders are local-only and ignored by git:

- `certs/` - local HTTPS certificate and key for Tableau Online testing
- `__pycache__/` - Python bytecode cache from running `serve_https.py`

The repo intentionally does not include:

- `package.json`
- `npm start`
- `test.html`
- committed browser screenshots

## Known Scope Limits

- Renders only the first row
- Does not render a grid
- Does not include card labels or titles
- Does not abbreviate numbers as `1.2M`
- Does not require npm or a build step
- Does not include a browser mock page
- Uses plain HTML, CSS, and JavaScript only

## Related GSD Artifacts

- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/quick/260421-001-single-card-architecture/260421-001-PLAN.md`
- `.planning/quick/260421-001-single-card-architecture/260421-001-SUMMARY.md`
