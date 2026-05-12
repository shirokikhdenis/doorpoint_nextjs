export type CsvRow = Record<string, string>;

/**
 * Минимальный RFC-4180 парсер: запятая или точка-с-запятой как разделитель,
 * кавычки `"..."` с экранированием `""`, переносы строк допустимы внутри кавычек.
 * Заголовок берётся из первой непустой строки.
 */
export const parseCsv = (input: string, delimiter?: "," | ";"): CsvRow[] => {
  const text = input.replace(/^\uFEFF/, "");
  if (!text.trim()) return [];

  const detectedDelimiter = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === detectedDelimiter) {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\n" || char === "\r") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  row.push(field);
  if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
    rows.push(row);
  }

  const filtered = rows.filter((entry) => entry.some((cell) => String(cell).trim() !== ""));
  if (filtered.length === 0) return [];

  const headers = filtered[0].map((cell) => String(cell).trim());
  return filtered.slice(1).map((entry) => {
    const obj: CsvRow = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      obj[header] = entry[idx] !== undefined ? String(entry[idx]) : "";
    });
    return obj;
  });
};

const detectDelimiter = (sample: string): "," | ";" => {
  const firstLine = sample.split(/\r?\n/, 1)[0] || "";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  return semiCount > commaCount ? ";" : ",";
};
