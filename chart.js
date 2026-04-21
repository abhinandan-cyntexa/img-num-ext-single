'use strict';

const ENCODING_IMAGE = 'image';
const ENCODING_VALUE = 'value';

let activeWorksheet = null;

bootstrap();

function bootstrap() {
  if (!window.tableau?.extensions?.initializeAsync) {
    renderEmptyState('Tableau Extensions API is unavailable.');
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
    renderEmptyState(messageFromError(err));
  });
}

async function render(worksheet) {
  clearError();

  try {
    const [vizSpec, dataTable] = await Promise.all([
      worksheet.getVisualSpecificationAsync(),
      fetchSummaryData(worksheet),
    ]);

    const cardData = parseSingleCard(dataTable, vizSpec);
    renderCard(cardData);
  } catch (err) {
    renderEmptyState(messageFromError(err));
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

function parseSingleCard(dataTable, vizSpec) {
  const marksSpec = vizSpec?.marksSpecificationCollection?.[0];
  if (!marksSpec) {
    throw new Error('No marks specification found.');
  }

  const imageField = getEncodingFieldName(marksSpec, ENCODING_IMAGE);
  const valueField = getEncodingFieldName(marksSpec, ENCODING_VALUE);

  if (!imageField) {
    throw new Error('Map a field to the Image URL encoding.');
  }

  if (!valueField) {
    throw new Error('Map a numeric field to the Value encoding.');
  }

  const columnIndex = Object.fromEntries(
    dataTable.columns.map(column => [column.fieldName, column.index])
  );

  if (!(imageField in columnIndex)) {
    throw new Error(`Image URL field "${imageField}" was not found in summary data.`);
  }

  if (!(valueField in columnIndex)) {
    throw new Error(`Value field "${valueField}" was not found in summary data.`);
  }

  if (!dataTable.data.length) {
    throw new Error('No summary data rows found.');
  }

  const firstRow = dataTable.data[0];
  const imageCell = firstRow[columnIndex[imageField]];
  const valueCell = firstRow[columnIndex[valueField]];
  const numericValue = toNumber(cellRawValue(valueCell));

  if (numericValue === null) {
    throw new Error(`Value field "${valueField}" did not contain a numeric value.`);
  }

  return {
    imageUrl: normalizeImageUrl(cellDisplayValue(imageCell)),
    value: numericValue,
  };
}

function getEncodingFieldName(marksSpec, encodingId) {
  const encoding = marksSpec.encodingCollection?.find(item => item.id === encodingId);
  return encoding?.fieldCollection?.[0]?.fieldName ?? null;
}

function renderCard(cardData) {
  const image = document.getElementById('cardImage');
  const placeholder = document.getElementById('imagePlaceholder');
  const value = document.getElementById('cardValue');

  value.textContent = formatNumber(cardData.value);

  if (cardData.imageUrl) {
    image.onload = () => {
      image.hidden = false;
      placeholder.hidden = true;
    };
    image.onerror = () => {
      image.hidden = true;
      placeholder.hidden = false;
      image.removeAttribute('src');
    };
    image.src = cardData.imageUrl;
  } else {
    image.hidden = true;
    image.removeAttribute('src');
    placeholder.hidden = false;
  }
}

function renderEmptyState(message) {
  document.getElementById('cardValue').textContent = '--';
  document.getElementById('cardImage').hidden = true;
  document.getElementById('cardImage').removeAttribute('src');
  document.getElementById('imagePlaceholder').hidden = false;
  setError(message);
}

function cellRawValue(cell) {
  return cell?.value ?? cell?.nativeValue ?? cell?.formattedValue ?? null;
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

function messageFromError(err) {
  return err?.message || String(err);
}

function setError(message) {
  document.getElementById('error').textContent = message;
}

function clearError() {
  document.getElementById('error').textContent = '';
}
