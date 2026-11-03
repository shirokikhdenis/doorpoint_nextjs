/**
 * Inserts "Сумма без скидки" and "Скидка" rows before "Итого" in contract.docx.
 * Run: node scripts/patch-contract-discount-rows.js
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

if (xml.includes("{skidka}") || xml.includes(">Скидка:</w:t>")) {
  console.log("Template already has skidka — skip");
  process.exit(0);
}

const marker = ">Итого:</w:t>";
const pos = xml.indexOf(marker);
if (pos < 0) throw new Error("Итого row not found");

let start = pos;
while (start > 0) {
  const i = xml.lastIndexOf("<w:tr", start - 1);
  if (i < 0) throw new Error("tr start not found");
  const after = xml.slice(i, i + 10);
  if (after.startsWith("<w:tr ") || after.startsWith("<w:tr>")) {
    start = i;
    break;
  }
  start = i;
}
const end = xml.indexOf("</w:tr>", pos) + 7;
const itogoRow = xml.slice(start, end);

const makeRow = (label, placeholder) => {
  let row = itogoRow.replace(">Итого:</w:t>", `>${label}</w:t>`);
  const replaced = row.replace(
    /<w:t>\{\<\/w:t><\/w:r><w:r[\s\S]*?<w:t>itogo<\/w:t><\/w:r><w:r[\s\S]*?<w:t>\}<\/w:t>/,
    `<w:t>{${placeholder}}</w:t>`,
  );
  if (replaced === row) {
    throw new Error(`Failed to rewrite placeholder for ${placeholder}`);
  }
  return replaced;
};

const subtotalRow = makeRow("Сумма без скидки:", "subtotalFormatted");
const skidkaRow = makeRow("Скидка:", "skidka");

xml = xml.slice(0, start) + subtotalRow + skidkaRow + itogoRow + xml.slice(end);
zip.file(xmlPath, xml);
const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
fs.writeFileSync(templatePath, out);
console.log(`Patched ${templatePath} (${out.length} bytes)`);
