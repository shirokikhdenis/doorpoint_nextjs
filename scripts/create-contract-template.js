/**
 * Generates src/templates/contracts/contract.docx with docxtemplater placeholders.
 *
 * Table row loop: {#items} in the first cell, {/items} in the last cell of ONE data row.
 * docxtemplater duplicates that row for each item in the lead.
 *
 * Run: npm run contract:template
 */
const fs = require("node:fs/promises");
const path = require("node:path");
const PizZip = require("pizzip");

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const paragraph = (text) => `
  <w:p>
    <w:r>
      <w:t xml:space="preserve">${escapeXml(text)}</w:t>
    </w:r>
  </w:p>`;

const tableCell = (text, { widthTwips } = {}) => {
  const widthXml = widthTwips
    ? `<w:tcW w:w="${widthTwips}" w:type="dxa"/>`
    : "";
  return `
  <w:tc>
    <w:tcPr>${widthXml}</w:tcPr>
    ${paragraph(text)}
  </w:tc>`;
};

const tableRow = (cells) => `
  <w:tr>
    ${cells.join("")}
  </w:tr>`;

const itemsTable = `
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      </w:tblBorders>
    </w:tblPr>
    ${tableRow([
      tableCell("Наименование", { widthTwips: 4500 }),
      tableCell("Количество", { widthTwips: 1500 }),
      tableCell("Цена", { widthTwips: 1800 }),
      tableCell("Сумма", { widthTwips: 1800 }),
    ])}
    ${tableRow([
      tableCell("{#items}{name}", { widthTwips: 4500 }),
      tableCell("{kolvo}", { widthTwips: 1500 }),
      tableCell("{cena}", { widthTwips: 1800 }),
      tableCell("{summa}{/items}", { widthTwips: 1800 }),
    ])}
    ${tableRow([
      tableCell("", { widthTwips: 4500 }),
      tableCell("", { widthTwips: 1500 }),
      tableCell("Итого:", { widthTwips: 1800 }),
      tableCell("{itogo}", { widthTwips: 1800 }),
    ])}
  </w:tbl>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraph("ДОГОВОР КУПЛИ-ПРОДАЖИ")}
    ${paragraph("")}
    ${paragraph("Договор № {contractNumber} от {contractDate}")}
    ${paragraph("")}
    ${paragraph("Заказчик: {customerName}")}
    ${paragraph("Телефон: {phone}")}
    ${paragraph("Адрес: {address}")}
    ${paragraph("")}
    ${paragraph("Перечень продукции:")}
    ${itemsTable}
    ${paragraph("")}
    ${paragraph("Подпись заказчика: ___________________ / {customerName} /")}
    ${paragraph("")}
    ${paragraph("Подпись исполнителя: ___________________ / ___________________ /")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

const main = async () => {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", relsXml);
  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", documentRelsXml);

  const outDir = path.join(process.cwd(), "src", "templates", "contracts");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "contract.docx");
  const buffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  try {
    await fs.writeFile(outPath, buffer);
    console.log(`Created ${outPath}`);
  } catch (error) {
    if (error?.code !== "EBUSY") throw error;
    const fallbackPath = path.join(outDir, "contract.docx.new");
    await fs.writeFile(fallbackPath, buffer);
    console.log(`contract.docx is locked — wrote ${fallbackPath}`);
    console.log("Close contract.docx in Word and replace it with the .new file.");
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
