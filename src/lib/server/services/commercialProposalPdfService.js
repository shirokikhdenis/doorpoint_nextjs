const catalogService = require("./catalogService");
const {
  buildKpFilename,
  buildKpPayload,
} = require("../domain/commercialProposalDocumentData");
const { resolveImageBuffer } = require("../domain/resolveImageBuffer");
const { assertKpPdfFonts } = require("../domain/kpPdfFonts");
const {
  SITE_NAME,
  SITE_PHONE_DISPLAY,
  SITE_EMAIL,
  SITE_ADDRESS_SHORT,
  SITE_LOGO_PATH,
  BRAND_COLOR,
  TEXT_MUTED,
  TEXT_PRIMARY,
  SURFACE_MUTED,
  BORDER_COLOR,
} = require("../domain/kpPdfCompany");

const PAGE_MARGIN = 48;
const HEADER_LOGO_WIDTH = 132;
const HEADER_META_GAP = 16;
const FONT_REGULAR = "KpRegular";
const FONT_BOLD = "KpBold";

const COL_GAP = 24;
const BLOCK_GAP = 14;
const IMAGE_MIN_HEIGHT = 280;

let cachedPdfDocument = null;

const registerKpFonts = (doc) => {
  const fonts = assertKpPdfFonts();
  doc.registerFont(FONT_REGULAR, fonts.regular);
  doc.registerFont(FONT_BOLD, fonts.bold);
};

const getPdfDocument = () => {
  if (cachedPdfDocument) return cachedPdfDocument;

  const mod = eval("require")("pdfkit");
  const ctor = typeof mod === "function" ? mod : mod?.default;
  if (typeof ctor !== "function") {
    throw new Error("pdfkit: PDFDocument constructor not found");
  }

  cachedPdfDocument = ctor;
  return cachedPdfDocument;
};

const pageWidth = (doc) => doc.page.width;
const contentWidth = (doc) => pageWidth(doc) - PAGE_MARGIN * 2;

const drawDivider = (doc, y) => {
  doc
    .save()
    .strokeColor(BRAND_COLOR)
    .lineWidth(1)
    .moveTo(PAGE_MARGIN, y)
    .lineTo(pageWidth(doc) - PAGE_MARGIN, y)
    .stroke()
    .restore();
};

const drawHeader = async (doc, payload) => {
  const topY = PAGE_MARGIN;
  const metaX = PAGE_MARGIN + HEADER_LOGO_WIDTH + HEADER_META_GAP;
  const metaWidth = pageWidth(doc) - PAGE_MARGIN - metaX;
  const logo = await resolveImageBuffer(SITE_LOGO_PATH);

  let logoBottom = topY + 36;
  if (logo) {
    try {
      doc.image(logo.buffer, PAGE_MARGIN, topY, { fit: [HEADER_LOGO_WIDTH, 36], valign: "top" });
      logoBottom = topY + 38;
    } catch {
      doc.font(FONT_BOLD).fontSize(15).fillColor(BRAND_COLOR).text(SITE_NAME, PAGE_MARGIN, topY, {
        width: HEADER_LOGO_WIDTH,
      });
      logoBottom = doc.y;
    }
  } else {
    doc.font(FONT_BOLD).fontSize(15).fillColor(BRAND_COLOR).text(SITE_NAME, PAGE_MARGIN, topY, {
      width: HEADER_LOGO_WIDTH,
    });
    logoBottom = doc.y;
  }

  doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_MUTED);
  doc.text("Коммерческое предложение", metaX, topY, { width: metaWidth, align: "right" });
  doc
    .font(FONT_BOLD)
    .fontSize(10.5)
    .fillColor(TEXT_PRIMARY)
    .text(payload.kpNumber, metaX, topY + 13, { width: metaWidth, align: "right" });
  doc
    .font(FONT_REGULAR)
    .fontSize(9)
    .fillColor(TEXT_MUTED)
    .text(payload.generatedAtFormatted, metaX, topY + 27, { width: metaWidth, align: "right" });

  const metaBottom = topY + 40;
  const dividerY = Math.max(logoBottom, metaBottom) + 12;
  drawDivider(doc, dividerY);
  return dividerY + 20;
};

const drawImageColumn = (doc, image, x, y, width, height, { framed = true } = {}) => {
  const inset = framed ? 16 : 0;
  const innerWidth = width - inset * 2;
  const innerHeight = height - inset * 2;

  if (framed) {
    doc
      .save()
      .fillColor(SURFACE_MUTED)
      .roundedRect(x, y, width, height, 8)
      .fill()
      .strokeColor(BORDER_COLOR)
      .lineWidth(1)
      .roundedRect(x, y, width, height, 8)
      .stroke()
      .restore();
  }

  if (image) {
    try {
      doc.image(image.buffer, x + inset, y + inset, {
        fit: [innerWidth, innerHeight],
        align: "center",
        valign: "center",
      });
      return y + height;
    } catch {
      /* fall through */
    }
  }

  if (!framed && !image) {
    doc
      .font(FONT_REGULAR)
      .fontSize(11)
      .fillColor(TEXT_MUTED)
      .text("Фото недоступно", x, y + height / 2 - 6, {
        width,
        align: "center",
      });
    return y + height;
  }

  doc
    .font(FONT_REGULAR)
    .fontSize(11)
    .fillColor(TEXT_MUTED)
    .text("Фото недоступно", x + inset, y + height / 2 - 6, {
      width: innerWidth,
      align: "center",
    });

  return y + height;
};

const measureMetaBlockHeight = (doc, payload, width) => {
  let height = 0;

  doc.font(FONT_BOLD).fontSize(17);
  height += doc.heightOfString(payload.displayName, { width }) + 10;

  doc.font(FONT_REGULAR).fontSize(10);
  if (payload.sku) {
    height += doc.heightOfString(`Артикул: ${payload.sku}`, { width }) + 4;
  }
  if (payload.categoryLine) {
    height += doc.heightOfString(payload.categoryLine, { width }) + 10;
  }

  for (const attribute of payload.attributes) {
    height += doc.heightOfString(`${attribute.name}: ${attribute.value}`, { width }) + 4;
  }

  if (payload.attributes.length > 0) height += 4;
  return height;
};

const measurePriceBlockHeight = (doc, payload, width) => {
  const padding = 18;
  const innerWidth = width - padding * 2;
  let height = padding;

  doc.font(FONT_REGULAR).fontSize(10);
  height += 12 + 20;

  if (payload.compareAtPriceFormatted) {
    height += doc.heightOfString(`Было: ${payload.compareAtPriceFormatted}`, { width: innerWidth }) + 4;
  }

  if (payload.showKitPrice) {
    height += 12 + 22;
    const hint = payload.kitAvailable
      ? payload.kitHintText
      : "Комплект недоступен: не найдены коробка и наличник с флагом pogonazh_komplekt.";
    doc.fontSize(8.5);
    height += doc.heightOfString(hint, { width: innerWidth, lineGap: 2 });
  }

  return height + padding;
};

const drawMetaBlock = (doc, payload, x, y, width) => {
  let cursorY = y;

  doc.font(FONT_BOLD).fontSize(17).fillColor(TEXT_PRIMARY).text(payload.displayName, x, cursorY, {
    width,
  });
  cursorY = doc.y + 10;

  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_MUTED);

  if (payload.sku) {
    doc.text(`Артикул: ${payload.sku}`, x, cursorY, { width });
    cursorY = doc.y + 4;
  }

  if (payload.categoryLine) {
    doc.text(payload.categoryLine, x, cursorY, { width });
    cursorY = doc.y + 10;
  }

  for (const attribute of payload.attributes) {
    doc
      .font(FONT_REGULAR)
      .fontSize(10)
      .fillColor(TEXT_PRIMARY)
      .text(`${attribute.name}: ${attribute.value}`, x, cursorY, { width });
    cursorY = doc.y + 4;
  }

  if (payload.attributes.length > 0) cursorY += 4;
  return cursorY;
};

const drawPriceBlock = (doc, payload, x, y, width) => {
  const padding = 18;
  const innerWidth = width - padding * 2;
  const blockHeight = measurePriceBlockHeight(doc, payload, width);

  doc
    .save()
    .fillColor(SURFACE_MUTED)
    .roundedRect(x, y, width, blockHeight, 8)
    .fill()
    .strokeColor(BORDER_COLOR)
    .lineWidth(1)
    .roundedRect(x, y, width, blockHeight, 8)
    .stroke()
    .restore();

  let rowY = y + padding;

  doc
    .font(FONT_REGULAR)
    .fontSize(10)
    .fillColor(TEXT_MUTED)
    .text(payload.doorPriceLabel, x + padding, rowY, {
      width: innerWidth,
    });
  rowY += 12;

  if (payload.compareAtPriceFormatted) {
    doc
      .font(FONT_REGULAR)
      .fontSize(10)
      .fillColor(TEXT_MUTED)
      .text(`Было: ${payload.compareAtPriceFormatted}`, x + padding, rowY, { width: innerWidth });
    rowY = doc.y + 4;
  }

  doc
    .font(FONT_BOLD)
    .fontSize(17)
    .fillColor(TEXT_PRIMARY)
    .text(payload.doorPriceFormatted, x + padding, rowY, { width: innerWidth });

  if (payload.showKitPrice) {
    rowY += 24;
    doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_MUTED).text("Цена за комплект", x + padding, rowY, {
      width: innerWidth,
    });
    rowY += 12;

    doc
      .font(FONT_BOLD)
      .fontSize(17)
      .fillColor(payload.kitAvailable ? BRAND_COLOR : TEXT_MUTED)
      .text(payload.kitAvailable ? payload.kitPriceFormatted : "Не рассчитан", x + padding, rowY, {
        width: innerWidth,
      });
    rowY += 22;

    doc
      .font(FONT_REGULAR)
      .fontSize(8.5)
      .fillColor(TEXT_MUTED)
      .text(
        payload.kitAvailable
          ? payload.kitHintText
          : "Комплект недоступен: не найдены коробка и наличник с флагом pogonazh_komplekt.",
        x + padding,
        rowY,
        { width: innerWidth, lineGap: 2 },
      );
  }

  return y + blockHeight;
};

const drawProductLink = (doc, payload, x, y, width) => {
  doc
    .font(FONT_REGULAR)
    .fontSize(9)
    .fillColor(TEXT_MUTED)
    .text("Карточка на сайте: ", x, y, { width, continued: true })
    .fillColor(BRAND_COLOR)
    .text(payload.productPageLinkLabel, {
      link: payload.productPageUrl,
      underline: true,
    });
  return doc.y + 2;
};

const drawFooter = (doc, payload, startY) => {
  drawDivider(doc, startY);

  const footerWidth = contentWidth(doc);
  const textY = startY + 14;

  doc
    .font(FONT_REGULAR)
    .fontSize(9)
    .fillColor(TEXT_PRIMARY)
    .text(`${SITE_PHONE_DISPLAY}  ·  ${SITE_EMAIL}`, PAGE_MARGIN, textY, { width: footerWidth });

  doc.fillColor(TEXT_MUTED).text(SITE_ADDRESS_SHORT, PAGE_MARGIN, doc.y + 4, { width: footerWidth });

  doc
    .font(FONT_REGULAR)
    .fontSize(8.5)
    .fillColor(TEXT_MUTED)
    .text(`Предложение действительно до ${payload.validUntilFormatted}.`, PAGE_MARGIN, doc.y + 6, {
      width: footerWidth,
    });
};

const renderKpPdf = async (product) => {
  const payload = buildKpPayload(product);
  const [image] = await Promise.all([resolveImageBuffer(payload.imageUrl)]);

  const PDFDocument = getPdfDocument();
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  registerKpFonts(doc);

  const bodyTop = await drawHeader(doc, payload);
  const width = contentWidth(doc);
  const leftWidth = Math.floor(width * 0.42);
  const rightWidth = width - leftWidth - COL_GAP;
  const leftX = PAGE_MARGIN;
  const rightX = PAGE_MARGIN + leftWidth + COL_GAP;

  const metaHeight = measureMetaBlockHeight(doc, payload, rightWidth);
  const priceHeight = measurePriceBlockHeight(doc, payload, rightWidth);
  const linkHeight = 18;
  const rightColumnHeight = metaHeight + BLOCK_GAP + priceHeight + BLOCK_GAP + linkHeight;
  const imageHeight = Math.max(IMAGE_MIN_HEIGHT, rightColumnHeight);

  drawImageColumn(doc, image, leftX, bodyTop, leftWidth, imageHeight, {
    framed: payload.showImageFrame,
  });

  let rightY = bodyTop;
  rightY = drawMetaBlock(doc, payload, rightX, rightY, rightWidth);
  rightY += BLOCK_GAP;
  rightY = drawPriceBlock(doc, payload, rightX, rightY, rightWidth);
  rightY += BLOCK_GAP;
  rightY = drawProductLink(doc, payload, rightX, rightY, rightWidth);

  const contentBottom = Math.max(bodyTop + imageHeight, rightY);
  drawFooter(doc, payload, contentBottom + 24);

  doc.end();
  return finished;
};

const generateKpPdfForProduct = async (productId) => {
  const numericId = Number(productId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return { ok: false, status: 400, message: "Некорректный id товара" };
  }

  const product = await catalogService.getProductById(numericId);
  if (!product) {
    return { ok: false, status: 404, message: "Товар не найден" };
  }

  const buffer = await renderKpPdf(product);
  return {
    ok: true,
    buffer,
    filename: buildKpFilename(product),
    product,
  };
};

module.exports = {
  renderKpPdf,
  generateKpPdfForProduct,
};
