'use strict';

const ENCODING_IMAGE = 'image';
const ENCODING_VALUE = 'value';
const PAGE_ROW_COUNT = 5000;

let activeWorksheet = null;

window.addEventListener('error', event => {
  renderEmptyState(event.message || 'Unexpected script error.', 'error', 'Script error');
});

window.addEventListener('unhandledrejection', event => {
  renderEmptyState(messageFromError(event.reason), 'error', 'Async error');
});

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
    activeWorksheet = tableau.extensions.worksheetContent?.worksheet;
    if (!activeWorksheet) {
      throw new Error('This Viz Extension must be loaded inside a Tableau worksheet.');
    }

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
  const options = { ignoreSelection: true };
  if (tableau.IncludeDataValuesOption?.AllValues) {
    options.includeDataValuesOption = tableau.IncludeDataValuesOption.AllValues;
  }

  const reader = await worksheet.getSummaryDataReaderAsync(PAGE_ROW_COUNT, options);

  try {
    if (typeof reader.getAllPagesAsync === 'function') {
      return await reader.getAllPagesAsync();
    }

    const pageCount = reader.pageCount ?? 0;
    const pages = [];
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      pages.push(await reader.getPageAsync(pageIndex));
    }

    return mergeDataPages(pages);
  } finally {
    await reader.releaseAsync();
  }
}

function getMappingDiagnostics(vizSpec, dataTable) {
  const marksSpec = getActiveMarksSpecification(vizSpec);
  if (!marksSpec) {
    throw new Error('No marks specification found.');
  }

  const imageField = getEncodingField(marksSpec, ENCODING_IMAGE);
  const valueField = getEncodingField(marksSpec, ENCODING_VALUE);
  const columns = dataTable.columns ?? [];
  const imageIndex = findColumnIndex(columns, imageField);
  const valueIndex = findColumnIndex(columns, valueField);

  const diagnostics = {
    imageField: getFieldLabel(imageField),
    valueField: getFieldLabel(valueField),
    imageState: imageField ? 'mapped' : 'missing',
    valueState: valueField ? 'mapped' : 'missing',
    imageIndex,
    valueIndex,
    issues: [],
  };

  if (!imageField) {
    diagnostics.issues.push('Image URL is not mapped.');
  } else if (imageIndex < 0) {
    diagnostics.imageState = 'missing-column';
    diagnostics.issues.push(`Image URL is mapped to "${diagnostics.imageField}", but that field is not in summary data.`);
  }

  if (!valueField) {
    diagnostics.issues.push('Value is not mapped.');
  } else if (valueIndex < 0) {
    diagnostics.valueState = 'missing-column';
    diagnostics.issues.push(`Value is mapped to "${diagnostics.valueField}", but that field is not in summary data.`);
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
    imageUrl: normalizeImageUrl(cellStringValue(imageCell)),
    value: numericValue,
  };
}

function mergeDataPages(pages) {
  if (!pages.length) {
    return { columns: [], data: [] };
  }

  return {
    columns: pages[0].columns ?? [],
    data: pages.flatMap(page => page.data ?? []),
  };
}

function getActiveMarksSpecification(vizSpec) {
  const modernSpecs = vizSpec?.marksSpecifications;
  if (Array.isArray(modernSpecs) && modernSpecs.length) {
    const activeIndex = vizSpec.activeMarksSpecificationIndex ?? 0;
    return modernSpecs[activeIndex] ?? modernSpecs[0];
  }

  const legacySpecs = vizSpec?.marksSpecificationCollection;
  if (Array.isArray(legacySpecs) && legacySpecs.length) {
    return legacySpecs[0];
  }

  return null;
}

function getEncodingField(marksSpec, encodingId) {
  const modernEncoding = marksSpec.encodings?.find(
    encoding => normalizeToken(encoding?.id) === normalizeToken(encodingId)
  );
  if (modernEncoding?.field) {
    return modernEncoding.field;
  }

  const legacyEncoding = marksSpec.encodingCollection?.find(
    encoding => normalizeToken(encoding?.id) === normalizeToken(encodingId)
  );
  const legacyField = legacyEncoding?.fieldCollection?.[0];
  if (legacyField) {
    return {
      id: legacyField.fieldId,
      name: legacyField.fieldName,
      fieldName: legacyField.fieldName,
    };
  }

  return null;
}

function findColumnIndex(columns, field) {
  if (!field) {
    return -1;
  }

  const fieldTokens = [
    field.id,
    field.fieldId,
    field.name,
    field.fieldName,
  ].map(normalizeToken).filter(Boolean);

  for (let columnPosition = 0; columnPosition < columns.length; columnPosition += 1) {
    const column = columns[columnPosition];
    const columnTokens = [
      column?.fieldId,
      column?.fieldName,
      column?.name,
      column?.caption,
    ].map(normalizeToken).filter(Boolean);

    if (fieldTokens.some(token => columnTokens.includes(token))) {
      return columnPosition;
    }
  }

  return -1;
}

function getFieldLabel(field) {
  return field?.name ?? field?.fieldName ?? field?.id ?? field?.fieldId ?? null;
}

function normalizeToken(value) {
  return String(value ?? '').trim().toLowerCase();
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

function cellStringValue(cell) {
  const candidates = [
    cell?.value,
    cell?.nativeValue,
    cell?.formattedValue,
  ];

  const stringValue = candidates.find(value => typeof value === 'string' && value.trim());
  if (stringValue) {
    return stringValue;
  }

  const fallback = candidates.find(value => value !== null && value !== undefined);
  return fallback ?? '';
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
  panel.hidden = state === 'ready';
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
