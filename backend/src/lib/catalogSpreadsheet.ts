import * as XLSX from 'xlsx';

export const TEMPLATE_HEADERS = [
  'Category',
  'Tag Number',
  'Name',
  'Type',
  'Article',
  'Metal',
  'Purity',
  'Display Price',
  'MRP',
  'Net Weight',
  'Gross Weight',
  'Total Weight',
  'Stone Weight',
  'Stone Charges',
  'Description',
] as const;

const HEADER_RULES: Array<{ field: string; match: (h: string) => boolean }> = [
  { field: 'group', match: (h) => /^(category|categories|group|groups|category\s*\/?\s*group|item\s*group)$/.test(h) },
  { field: 'tag_number', match: (h) => /^(tag|tag\s*(no|number|#)|item\s*tag|sku)$/.test(h) },
  { field: 'name', match: (h) => /^(name|product\s*name|item\s*name|product)$/.test(h) },
  { field: 'type', match: (h) => /^(type|item\s*type|product\s*type)$/.test(h) },
  { field: 'article', match: (h) => /^(article|articles)$/.test(h) },
  { field: 'metal_type', match: (h) => /^(metal|metal\s*type)$/.test(h) },
  { field: 'purity', match: (h) => /^(purity|karat|carat)$/.test(h) },
  { field: 'display_price', match: (h) => /^(display\s*price|selling\s*price|price|amount)$/.test(h) },
  { field: 'mrp', match: (h) => /^(mrp|max\s*retail\s*price)$/.test(h) },
  { field: 'net_weight', match: (h) => /^(net\s*weight|net\s*wt)$/.test(h) },
  { field: 'gross_weight', match: (h) => /^(gross\s*weight|gross\s*wt)$/.test(h) },
  { field: 'total_weight', match: (h) => /^(total\s*weight|total\s*wt)$/.test(h) },
  { field: 'stone_weight', match: (h) => /^(stone\s*weight|stone\s*wt)$/.test(h) },
  { field: 'stone_charges', match: (h) => /^(stone\s*charges|stone\s*charge)$/.test(h) },
  { field: 'description', match: (h) => /^(description|details|detail)$/.test(h) },
];

export type SpreadsheetItem = Record<string, string>;

function cleanHeader(raw: unknown) {
  return String(raw ?? '')
    .normalize('NFKC')
    .replace(/^\uFEFF/, '')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/₹/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[_./\\-]+/g, ' ')
    .replace(/[^a-z0-9#/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function mapHeaderToField(raw: unknown): string | null {
  const h = cleanHeader(raw);
  if (!h) return null;
  const hit = HEADER_RULES.find((rule) => rule.match(h));
  return hit?.field || null;
}

function cellToString(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value)) return String(value);
    return String(parseFloat(value.toPrecision(12)));
  }
  return String(value).replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function sheetToMatrix(buffer: Buffer): unknown[][] {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: false,
    raw: false,
    dense: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw Object.assign(new Error('Excel file has no sheets'), { status: 400 });
  }
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  }) as unknown[][];
}

export function parseCatalogSpreadsheet(
  buffer: Buffer,
  _filename: string,
  opts: { defaultCategory?: string; forceCategory?: boolean } = {},
): SpreadsheetItem[] {
  const defaultCategory = String(opts.defaultCategory || '').trim();
  const forceCategory = Boolean(opts.forceCategory && defaultCategory);
  const matrix = sheetToMatrix(buffer).filter((row) =>
    Array.isArray(row) && row.some((cell) => cellToString(cell) !== ''),
  );
  if (matrix.length < 2) {
    throw Object.assign(new Error('Spreadsheet needs a header row and at least one item row'), { status: 400 });
  }

  const headerRow = matrix[0];
  const fields = headerRow.map(mapHeaderToField);
  if (!fields.includes('tag_number') || !fields.includes('name')) {
    throw Object.assign(
      new Error('Spreadsheet must include Tag Number and Name columns'),
      { status: 400 },
    );
  }
  if (!fields.includes('group') && !defaultCategory) {
    throw Object.assign(
      new Error('Spreadsheet must include Category, Tag Number, and Name columns'),
      { status: 400 },
    );
  }

  const items: SpreadsheetItem[] = [];
  for (const row of matrix.slice(1)) {
    const item: SpreadsheetItem = {};
    fields.forEach((field, i) => {
      if (!field) return;
      const value = cellToString(row[i]);
      if (!item[field] || value) item[field] = value;
    });
    if (forceCategory) {
      item.group = defaultCategory;
    } else if (!item.group && defaultCategory) {
      item.group = defaultCategory;
    }
    if (!item.tag_number && !item.name) continue;
    items.push(item);
  }
  return items;
}

export function spreadsheetTemplateXlsx(category?: string) {
  const cat = String(category || 'EAR RINGS').trim() || 'EAR RINGS';
  const sample = [
    cat,
    'TJ0001',
    'Studs',
    'WOMEN',
    'STUDS',
    'silver',
    '92.5',
    '1676',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
  const blank = [cat, '', '', '', '', '', '', '', '', '', '', '', '', ''];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS], sample, blank, blank]);
  sheet['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
