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

export type CsvRowRangeSlice<T> = {
  rows: T[];
  /** Первая строка диапазона (1-based, без заголовка CSV). */
  startRow: number;
  /** Последняя строка диапазона (1-based, включительно). */
  endRow: number;
  error?: string;
};

/** Выбирает подмножество строк данных CSV по диапазону (1-based, заголовок не считается). */
export function sliceCsvDataRowsByRange<T>(
  rows: T[],
  fromInput: string,
  toInput: string,
): CsvRowRangeSlice<T> {
  const total = rows.length;
  const fromRaw = String(fromInput || "").trim();
  const toRaw = String(toInput || "").trim();

  if (!fromRaw && !toRaw) {
    return { rows, startRow: total > 0 ? 1 : 0, endRow: total };
  }

  const from = fromRaw ? Number.parseInt(fromRaw, 10) : 1;
  const to = toRaw ? Number.parseInt(toRaw, 10) : total;

  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return {
      rows: [],
      startRow: 0,
      endRow: 0,
      error: "Диапазон строк должен содержать целые числа",
    };
  }
  if (from < 1 || to < 1) {
    return {
      rows: [],
      startRow: 0,
      endRow: 0,
      error: "Номера строк должны быть не меньше 1",
    };
  }
  if (from > to) {
    return {
      rows: [],
      startRow: 0,
      endRow: 0,
      error: "Начало диапазона не может быть больше конца",
    };
  }
  if (total === 0) {
    return { rows: [], startRow: 0, endRow: 0, error: "Нет строк для импорта" };
  }
  if (from > total) {
    return {
      rows: [],
      startRow: 0,
      endRow: 0,
      error: `Начало диапазона (${from}) больше числа строк в файле (${total})`,
    };
  }

  const endRow = Math.min(to, total);
  return {
    rows: rows.slice(from - 1, endRow),
    startRow: from,
    endRow,
  };
}
