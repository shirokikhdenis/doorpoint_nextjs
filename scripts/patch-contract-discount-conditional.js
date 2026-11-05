/**
 * Wrap "Сумма без скидки" / "Скидка" rows in {#hasDiscount}...{/hasDiscount}.
 * Run: node scripts/patch-contract-discount-conditional.js
 */
const fs = require("node:fs");
const path = require("node:path");
const PizZip = require("pizzip");

const templatePath = path.join(
  process.cwd(),
  "src",
  "templates",
  "contracts",
  "contract.docx",
);
const zip = new PizZip(fs.readFileSync(templatePath));
const xmlPath = "word/document.xml";
let xml = zip.file(xmlPath).asText();

if (xml.includes("hasDiscount")) {
  console.log("Template already has hasDiscount — skip");
  process.exit(0);
}

const findTrContaining = (needle) => {
  const pos = xml.indexOf(needle);
  if (pos < 0) throw new Error(`Not found: ${needle}`);
  let start = pos;
  while (start > 0) {
    const i = xml.lastIndexOf("<w:tr", start - 1);
    if (i < 0) throw new Error(`tr start not found for ${needle}`);
    const after = xml.slice(i, i + 10);
    if (after.startsWith("<w:tr ") || after.startsWith("<w:tr>")) {
      start = i;
      break;
    }
    start = i;
  }
  const end = xml.indexOf("</w:tr>", pos) + 7;
  return { start, end, row: xml.slice(start, end) };
};

const appendRunAfterFirstText = (rowXml, text) => {
  const wtOpen = rowXml.indexOf("<w:t");
  if (wtOpen < 0) throw new Error("No <w:t> in row");
  const wtClose = rowXml.indexOf("</w:t>", wtOpen);
  const afterRun = rowXml.indexOf("</w:r>", wtClose) + "</w:r>".length;
  return `${rowXml.slice(0, afterRun)}<w:r><w:t>${text}</w:t></w:r>${rowXml.slice(afterRun)}`;
};

const appendRunAfterLastText = (rowXml, text) => {
  const lastWt = rowXml.lastIndexOf("<w:t");
  if (lastWt < 0) throw new Error("No last <w:t> in row");
  const lastClose = rowXml.indexOf("</w:t>", lastWt);
  const afterRun = rowXml.indexOf("</w:r>", lastClose) + "</w:r>".length;
  return `${rowXml.slice(0, afterRun)}<w:r><w:t>${text}</w:t></w:r>${rowXml.slice(afterRun)}`;
};

const subtotal = findTrContaining(">Сумма без скидки:</w:t>");
const skidka = findTrContaining(">Скидка:</w:t>");

if (subtotal.end > skidka.start) {
  throw new Error("Unexpected row order: Скидка before Сумма без скидки");
}

const newSubtotal = appendRunAfterFirstText(subtotal.row, "{#hasDiscount}");
const newSkidka = appendRunAfterLastText(skidka.row, "{/hasDiscount}");

xml =
  xml.slice(0, subtotal.start) +
  newSubtotal +
  xml.slice(subtotal.end, skidka.start) +
  newSkidka +
  xml.slice(skidka.end);

zip.file(xmlPath, xml);
const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
fs.writeFileSync(templatePath, out);
console.log(`Patched ${templatePath} (${out.length} bytes)`);
