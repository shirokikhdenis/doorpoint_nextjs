const { getFormatById } = require("../../booklet-formats");

const mmToPt = (mm) => (Number(mm) * 72) / 25.4;

const pageSizePt = (format) => [mmToPt(format.widthMm), mmToPt(format.heightMm)];

const marginPtForFormat = (format) => mmToPt(format.id === "a4" ? 12 : 8);

module.exports = {
  mmToPt,
  pageSizePt,
  marginPtForFormat,
  getFormatById,
};
