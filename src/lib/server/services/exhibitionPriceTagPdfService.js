const exhibitionDoorRepository = require("../repositories/exhibitionDoorRepository");
const {
  buildInteriorPriceTagPayload,
  buildPriceTagFilename,
  buildBulkPriceTagFilename,
} = require("../domain/exhibitionPriceTagDocumentData");
const {
  renderInteriorPriceTagPdf,
  renderInteriorPriceTagPdfBulk,
} = require("./exhibitionInteriorPriceTagPdfService");

const ENTRY_NOT_IMPLEMENTED_MESSAGE =
  "Макет ценника для входных дверей пока не реализован";

const normalizeId = (id) => {
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  return numeric;
};

const assertInteriorRow = (row) => {
  if (!row) {
    return { ok: false, message: "Запись не найдена", status: 404 };
  }
  if (row.categoryType !== "interior") {
    return { ok: false, message: ENTRY_NOT_IMPLEMENTED_MESSAGE, status: 400 };
  }
  return { ok: true, row };
};

const generatePriceTagForExhibitionDoor = async (id) => {
  const numericId = normalizeId(id);
  if (!numericId) {
    return { ok: false, message: "Некорректный id записи", status: 400 };
  }

  const row = await exhibitionDoorRepository.getById(numericId);
  const check = assertInteriorRow(row);
  if (!check.ok) return check;

  const payload = buildInteriorPriceTagPayload(check.row);
  const buffer = await renderInteriorPriceTagPdf(payload);

  return {
    ok: true,
    buffer,
    filename: buildPriceTagFilename(check.row),
  };
};

const generatePriceTagsForExhibitionDoors = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, message: "Укажите хотя бы одну запись", status: 400 };
  }

  const uniqueIds = [...new Set(ids.map(normalizeId).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: false, message: "Некорректный список id", status: 400 };
  }

  const rows = await Promise.all(uniqueIds.map((id) => exhibitionDoorRepository.getById(id)));
  const missing = uniqueIds.filter((id, index) => !rows[index]);
  if (missing.length > 0) {
    return { ok: false, message: "Некоторые записи не найдены", status: 404 };
  }

  const entryRows = rows.filter((row) => row.categoryType === "entry");
  if (entryRows.length > 0) {
    return { ok: false, message: ENTRY_NOT_IMPLEMENTED_MESSAGE, status: 400 };
  }

  const interiorRows = rows.filter((row) => row.categoryType === "interior");
  if (interiorRows.length === 0) {
    return { ok: false, message: "Нет межкомнатных дверей для формирования ценников", status: 400 };
  }

  const payloads = interiorRows.map(buildInteriorPriceTagPayload);
  const buffer = await renderInteriorPriceTagPdfBulk(payloads);

  return {
    ok: true,
    buffer,
    filename: buildBulkPriceTagFilename(payloads.length),
  };
};

module.exports = {
  ENTRY_NOT_IMPLEMENTED_MESSAGE,
  generatePriceTagForExhibitionDoor,
  generatePriceTagsForExhibitionDoors,
};
