import mammoth from 'mammoth/mammoth.browser';
import * as XLSX from 'xlsx';
import { OfficeDocumentState } from '../types';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_WORD_HTML_SIZE = 8 * 1024 * 1024;
const MAX_SHEETS = 20;
const MAX_ROWS_PER_SHEET = 1000;
const MAX_COLUMNS_PER_SHEET = 50;
const MAX_CELL_LENGTH = 1000;
const MAX_TOTAL_CELLS = 20000;
const MAX_TOTAL_TEXT_CHARS = 1 * 1024 * 1024;

const ALLOWED_WORD_TAGS = new Set([
  'P', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL',
  'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TFOOT',
  'TR', 'TD', 'TH', 'BLOCKQUOTE', 'SUP', 'SUB', 'IMG',
]);

function sanitizeWordHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.querySelectorAll('script, style, link, iframe, object, embed, form, input, button').forEach((node) => node.remove());
  const allElements = Array.from(parsed.body.querySelectorAll('*'));
  for (const element of allElements) {
    if (!ALLOWED_WORD_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const keep = name === 'colspan' || name === 'rowspan' ||
        (element.tagName === 'IMG' && ['src', 'alt', 'width', 'height'].includes(name));
      if (!keep) element.removeAttribute(attribute.name);
    }
    if (element.tagName === 'IMG') {
      const src = element.getAttribute('src') || '';
      if (!src.startsWith('data:image/')) element.remove();
    }
  }
  return parsed.body.innerHTML;
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).slice(0, MAX_CELL_LENGTH);
}

export async function parseOfficeFile(file: File): Promise<OfficeDocumentState> {
  const filename = file.name.toLowerCase();
  if (file.size > MAX_FILE_SIZE) throw new Error('Файл больше 20 МБ. Для показа выберите файл поменьше.');
  const arrayBuffer = await file.arrayBuffer();
  const id = 'office_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

  if (filename.endsWith('.docx')) {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const htmlContent = sanitizeWordHtml(result.value);
    if (htmlContent.length > MAX_WORD_HTML_SIZE) {
      throw new Error('После обработки документ Word слишком большой для синхронизации между окнами.');
    }
    return { id, title: file.name, kind: 'word', htmlContent, activeSheetIndex: 0 };
  }

  if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const sheets = [];
    let totalCells = 0;
    let totalCharacters = 0;
    for (const name of workbook.SheetNames.slice(0, MAX_SHEETS)) {
      const worksheet = workbook.Sheets[name];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1, raw: false, defval: '', blankrows: false,
      });
      const rows: string[][] = [];
      for (const row of matrix.slice(0, MAX_ROWS_PER_SHEET)) {
        const limitedRow: string[] = [];
        for (const rawValue of row.slice(0, MAX_COLUMNS_PER_SHEET)) {
          if (totalCells >= MAX_TOTAL_CELLS || totalCharacters >= MAX_TOTAL_TEXT_CHARS) break;
          const remainingCharacters = MAX_TOTAL_TEXT_CHARS - totalCharacters;
          const cell = normalizeCell(rawValue).slice(0, remainingCharacters);
          limitedRow.push(cell);
          totalCells += 1;
          totalCharacters += cell.length;
        }
        rows.push(limitedRow);
        if (totalCells >= MAX_TOTAL_CELLS || totalCharacters >= MAX_TOTAL_TEXT_CHARS) break;
      }
      sheets.push({ name: String(name).slice(0, 120), rows });
      if (totalCells >= MAX_TOTAL_CELLS || totalCharacters >= MAX_TOTAL_TEXT_CHARS) break;
    }
    if (sheets.length === 0) throw new Error('В книге Excel нет листов с данными.');
    return { id, title: file.name, kind: 'excel', sheets, activeSheetIndex: 0 };
  }

  throw new Error('Поддерживаются документы Word .docx и таблицы Excel .xlsx / .xls.');
}