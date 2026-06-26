const fs = require("node:fs");
const path = require("node:path");

const FONTS_DIR = path.join(process.cwd(), "src", "fonts", "geometria");

const FONT_FILES = {
  regular: "geometria_light.otf",
  medium: "geometria_medium.otf",
  bold: "geometria_bold.otf",
};

const getKpPdfFontPaths = () => ({
  regular: path.join(FONTS_DIR, FONT_FILES.regular),
  medium: path.join(FONTS_DIR, FONT_FILES.medium),
  bold: path.join(FONTS_DIR, FONT_FILES.bold),
});

const assertKpPdfFonts = () => {
  const fonts = getKpPdfFontPaths();
  for (const filePath of Object.values(fonts)) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Шрифт КП не найден: ${filePath}`);
    }
  }
  return fonts;
};

module.exports = {
  FONTS_DIR,
  FONT_FILES,
  getKpPdfFontPaths,
  assertKpPdfFonts,
};
