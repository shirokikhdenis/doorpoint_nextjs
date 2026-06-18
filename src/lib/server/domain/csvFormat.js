const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  if (/[",;\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const buildCsvContent = (headers, rows, delimiter = ";") => {
  const headerLine = headers.map((header) => escapeCsvCell(header)).join(delimiter);
  const bodyLines = rows.map((row) =>
    headers.map((header) => escapeCsvCell(row[header] ?? "")).join(delimiter),
  );
  return `\uFEFF${[headerLine, ...bodyLines].join("\r\n")}`;
};

module.exports = {
  escapeCsvCell,
  buildCsvContent,
};
