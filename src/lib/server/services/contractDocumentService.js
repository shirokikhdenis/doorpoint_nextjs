const fs = require("node:fs/promises");
const path = require("node:path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const leadService = require("./leadService");
const {
  buildContractData,
  buildContractFilename,
} = require("../domain/contractDocumentData");

const DEFAULT_TEMPLATE_NAME = "contract.docx";

const getTemplatePath = (templateName = DEFAULT_TEMPLATE_NAME) =>
  path.join(process.cwd(), "src", "templates", "contracts", templateName);

const renderContractDocx = async (lead, { templateName } = {}) => {
  const templatePath = getTemplatePath(templateName);
  let content;
  try {
    content = await fs.readFile(templatePath);
  } catch {
    throw new Error(`Шаблон договора не найден: ${templatePath}`);
  }

  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  try {
    doc.render(buildContractData(lead));
  } catch (error) {
    const details = error?.properties?.errors
      ?.map((item) => item.properties?.explanation || item.message)
      .filter(Boolean)
      .join("; ");
    throw new Error(details || error?.message || "Не удалось сформировать договор");
  }

  return doc.getZip().generate({ type: "nodebuffer" });
};

const generateContractForLead = async (leadId, options = {}) => {
  const result = await leadService.getLeadById(leadId);
  if (!result.ok) {
    return { ok: false, status: result.status || 404, message: result.message };
  }

  const buffer = await renderContractDocx(result.lead, options);
  return {
    ok: true,
    buffer,
    filename: buildContractFilename(result.lead),
    lead: result.lead,
  };
};

module.exports = {
  DEFAULT_TEMPLATE_NAME,
  getTemplatePath,
  renderContractDocx,
  generateContractForLead,
};
