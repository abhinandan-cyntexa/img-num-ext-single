# Image + Number Single Card

A minimal Tableau Viz Extension that renders one image-plus-number card from worksheet data. It is a test harness for validating the card architecture before moving back to a dynamic multi-card grid.

## Files

- `index.html` - Tableau runtime entry point
- `styles.css` - Tableau-light card styling
- `chart.js` - Tableau initialization, data parsing, and single-card rendering
- `test.html` - Browser-only mock test page
- `img-num-ext-single-local.trex` - Local Tableau manifest

## Local Test

```bash
python3 -m http.server 8081
```

Then open:

- Browser mock: `http://localhost:8081/test.html`
- Tableau manifest: `img-num-ext-single-local.trex`

## Tableau Mapping

Load the local manifest in Tableau Desktop through the worksheet Marks card, then map:

- `Image URL` - a dimension containing an image URL
- `Value` - a numeric measure

The renderer intentionally uses only the first summary data row. If Tableau returns multiple rows, this extension still renders exactly one card.
