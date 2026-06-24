const FINISH_CSV_COLUMNS = [
  "manufacturer",
  "group_key",
  "name",
  "image_url",
  "price_delta",
  "sort_order",
  "is_active",
];

const parseCsvLine = (line, delimiter = ";") => {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
};

const detectDelimiter = (text) => {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || "";
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ";" : ",";
};

/** Парсит CSV покрытий: первая строка — заголовки (snake_case). */
const parseCsv = (content, delimiter) => {
  const text = String(content || "").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  const sep = delimiter || detectDelimiter(text);
  const header = parseCsvLine(lines[0], sep).map((cell) => cell.toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i], sep);
    if (cells.every((cell) => !cell)) continue;
    const row = {};
    header.forEach((key, index) => {
      row[key] = cells[index] ?? "";
    });
    rows.push(row);
  }

  return rows;
};

const getCsvRowValue = (row, ...keys) => {
  if (!row || typeof row !== "object") return undefined;
  const index = new Map();
  for (const [key, value] of Object.entries(row)) {
    index.set(String(key).trim().toLowerCase(), value);
  }
  for (const key of keys) {
    const value = index.get(String(key).trim().toLowerCase());
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
};

module.exports = {
  FINISH_CSV_COLUMNS,
  parseCsv,
  getCsvRowValue,
};
