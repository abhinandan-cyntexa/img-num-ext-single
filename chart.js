'use strict';

const ENCODING_IMAGE = 'image';
const ENCODING_VALUE = 'value';

let activeWorksheet = null;

setStatus({
  state: 'loading',
  label: 'Initializing',
  detail: 'Connecting to Tableau...',
});
bootstrap();

function bootstrap() {
  if (!window.tableau?.extensions?.initializeAsync) {
    renderEmptyState('Tableau Extensions API is unavailable.', 'error', 'API unavailable');
    return;
  }

  tableau.extensions.initializeAsync().then(() => {
    activeWorksheet = tableau.extensions.worksheetContent.worksheet;
    activeWorksheet.addEventListener(
      tableau.TableauEventType.SummaryDataChanged,
      () => render(activeWorksheet)
    );
    render(activeWorksheet);
  }).catch(err => {
    renderEmptyState(messageFromError(err), 'error', 'Initialization failed');
  });
}

async function render(worksheet) {
  clearError();
  setStatus({
    state: 'loading',
    label: 'Loading worksheet',
    detail: 'Reading mapped fields and summary data...',
  });

  try {
    const [vizSpec, dataTable] = await Promise.all([
      worksheet.getVisualSpecificationAsync(),
      fetchSummaryData(worksheet),
    ]);

    const diagnostics = getMappingDiagnostics(vizSpec, dataTable);

    if (diagnostics.issues.length) {
      renderEmptyCard();
      setStatus({
        state: 'warning',
        label: 'Needs mapping',
        detail: diagnostics.issues.join(' '),
        diagnostics,
      });
      return;
    }

    if (!dataTable.data.length) {
      renderEmptyCard();
      setStatus({
        state: 'warning',
        label: 'No data',
        detail: 'The mapped fields are valid, but Tableau returned no summary rows.',
        diagnostics,
      });
      return;
    }

    const cardData = parseSingleCard(dataTable, diagnostics);
    renderCard(cardData, diagnostics, dataTable.data.length);
  } catch (err) {
    renderEmptyState(messageFromError(err), 'error', 'Error');
  }
}

async function fetchSummaryData(worksheet) {
  const reader = await worksheet.getSummaryDataReaderAsync(undefined, {
    ignoreSelection: true,
  });

  try {
    return await reader.getAllPagesAsync();
  } finally {
    await reader.releaseAsync();
  }
}

function getMappingDiagnostics(vizSpec, dataTable) {
  const marksSpec = vizSpec?.marksSpecificationCollection?.[0];
  if (!marksSpec) {
    throw new Error('No marks specification found.');
  }

  const imageField = getEncodingFieldName(marksSpec, ENCODING_IMAGE);
  const valueField = getEncodingFieldName(marksSpec, ENCODING_VALUE);
  const columnIndex = Object.fromEntries(
    (dataTable.columns ?? []).map(column => [column.fieldName, column.index])
  );

  const diagnostics = {
    imageField,
    valueField,
    imageState: imageField ? 'mapped' : 'missing',
    valueState: valueField ? 'mapped' : 'missing',
    imageIndex: imageField ? columnIndex[imageField] : null,
    valueIndex: valueField ? columnIndex[valueField] : null,
    issues: [],
  };

  if (!imageField) {
    diagnostics.issues.push('Image URL is not mapped.');
  } else if (!(imageField in columnIndex)) {
    diagnostics.imageState = 'missing-column';
    diagnostics.issues.push(`Image URL is mapped to "${imageField}", but that field is not in summary data.`);
  }

  if (!valueField) {
    diagnostics.issues.push('Value is not mapped.');
  } else if (!(valueField in columnIndex)) {
    diagnostics.valueState = 'missing-column';
    diagnostics.issues.push(`Value is mapped to "${valueField}", but that field is not in summary data.`);
  }

  return diagnostics;
}

function parseSingleCard(dataTable, diagnostics) {
  const firstRow = dataTable.data[0];
  const imageCell = firstRow[diagnostics.imageIndex];
  const valueCell = firstRow[diagnostics.valueIndex];
  const numericValue = toNumber(cellRawValue(valueCell) ?? cellDisplayValue(valueCell));

  if (numericValue === null) {
    throw new Error(`Value field "${diagnostics.valueField}" did not contain a numeric value.`);
  }

  return {
    imageUrl: normalizeImageUrl(cellRawValue(imageCell) ?? cellDisplayValue(imageCell)),
    value: numericValue,
  };
}

function getEncodingFieldName(marksSpec, encodingId) {
  const encoding = marksSpec.encodingCollection?.find(item => item.id === encodingId);
  return encoding?.fieldCollection?.[0]?.fieldName ?? null;
}

function renderCard(cardData, diagnostics, rowCount) {
  const image = document.getElementById('cardImage');
  const placeholder = document.getElementById('imagePlaceholder');
  const value = document.getElementById('cardValue');

  value.textContent = formatNumber(cardData.value);
  image.onload = null;
  image.onerror = null;
  image.hidden = true;
  placeholder.hidden = false;

  if (cardData.imageUrl) {
    image.onload = () => {
      image.hidden = false;
      placeholder.hidden = true;
      setStatus({
        state: 'ready',
        label: 'Ready',
        detail: `Rendering row 1 of ${rowCount}.`,
        diagnostics,
      });
    };
    image.onerror = () => {
      image.hidden = true;
      placeholder.hidden = false;
      image.removeAttribute('src');
      setStatus({
        state: 'warning',
        label: 'Image fallback',
        detail: 'The mapped image URL could not be loaded. The value is still rendered.',
        diagnostics,
      });
    };
    image.src = cardData.imageUrl;
    setStatus({
      state: 'loading',
      label: 'Loading image',
      detail: `Rendering row 1 of ${rowCount}.`,
      diagnostics,
    });
  } else {
    image.hidden = true;
    image.removeAttribute('src');
    placeholder.hidden = false;
    setStatus({
      state: 'warning',
      label: 'Image fallback',
      detail: `Rendering row 1 of ${rowCount}; the image URL value is blank.`,
      diagnostics,
    });
  }
}

function renderEmptyState(message, state = 'error', label = 'Error') {
  renderEmptyCard();
  setError(message);
  setStatus({
    state,
    label,
    detail: message,
  });
}

function renderEmptyCard() {
  const image = document.getElementById('cardImage');
  image.hidden = true;
  image.removeAttribute('src');
  document.getElementById('imagePlaceholder').hidden = false;
  document.getElementById('cardValue').textContent = '--';
}

function cellRawValue(cell) {
  return cell?.value ?? cell?.nativeValue ?? null;
}

function cellDisplayValue(cell) {
  return cell?.formattedValue ?? cell?.value ?? cell?.nativeValue ?? '';
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) {
    return null;
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeImageUrl(value) {
  const url = String(value ?? '').trim();
  if (!url || url.toLowerCase() === 'null') {
    return '';
  }

  return url;
}

function formatNumber(value) {
  const hasFraction = Math.abs(value % 1) > Number.EPSILON;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(value);
}

function setStatus({ state = 'loading', label, detail, diagnostics = {} }) {
  const panel = document.getElementById('statusPanel');
  const labelEl = document.getElementById('statusLabel');
  const detailEl = document.getElementById('statusDetail');

  if (!panel || !labelEl || !detailEl) {
    return;
  }

  panel.dataset.status = state;
  labelEl.textContent = label;
  detailEl.textContent = detail;

  setMappingText('imageMapping', diagnostics.imageField, diagnostics.imageState);
  setMappingText('valueMapping', diagnostics.valueField, diagnostics.valueState);
}

function setMappingText(elementId, fieldName, state) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  let text = fieldName || 'Not mapped';
  if (state === 'missing-column') {
    text = `Missing in data: ${fieldName}`;
  }

  element.textContent = text;
  element.title = text;
  element.classList.toggle('is-missing', state !== 'mapped');
}

function messageFromError(err) {
  return err?.message || String(err);
}

function setError(message) {
  document.getElementById('error').textContent = message;
}

function clearError() {
  document.getElementById('error').textContent = '';
}
