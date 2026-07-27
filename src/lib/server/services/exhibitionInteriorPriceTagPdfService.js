const { assertKpPdfFonts } = require("../domain/kpPdfFonts");
const { strokeSquircleRect } = require("../domain/pdfSquircle");
const { generateQrCodePng } = require("../domain/qrCodePng");
const {
  TAG_WIDTH_MM,
  TAG_HEIGHT_MM,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
  TAGS_PER_A4_PAGE,
  TAGS_PER_A4_COLS,
  QR_HINT_TEXT,
  mmToPt,
} = require("../domain/exhibitionPriceTagDocumentData");

const FONT_REGULAR = "KpRegular";
const FONT_BOLD = "KpBold";

const MARGIN_LEFT_MM = 7;
const MARGIN_RIGHT_MM = 5;
const MARGIN_TOP_MM = 5;
const MARGIN_BOTTOM_MM = 5;
const TEXT_COLOR = "#000000";
const BOX_STROKE = "#000000";

const TITLE_SIZE = 30;
const BODY_SIZE = 10;
const ACCESSORY_SIZE = 8.5;
const FOOTNOTE_SIZE = 6.5;
const FOOTNOTE_MIN_SIZE = 5;
const PRICE_LABEL_SIZE = 7;
const PRICE_VALUE_MAX_SIZE = 22;
const PRICE_VALUE_MIN_SIZE = 9;
const PRICE_BOX_HEIGHT_MM = 13;
const PRICE_BOX_RADIUS_MM = 2.5;
const PRICE_BOX_WIDTH_FILL = 0.92;
const PRICE_BOX_HEIGHT_FILL = 0.88;
const PRICE_COLUMN_GAP_MM = 2;
const PRICE_TOP_GAP_MM = 1;
const FOOTNOTE_GAP_MM = 1.5;
const ACCESSORIES_TOP_GAP_MM = 3;
const ACCESSORIES_HEADING_GAP_MM = 1;
const ACCESSORIES_BOTTOM_GAP_MM = 1;
const ACCESSORY_ROW_GAP_PT = 2;
const ACCESSORY_LEADER_GAP_PT = 2;
const ACCESSORY_LEADER_MIN_PT = 10;
const ACCESSORY_DOT = ".";
const MIN_ACCESSORY_FONT_SIZE = 5.5;
const PRICE_BOX_PADDING_MM = 1.2;
const QR_SIZE_MM = 20;
const QR_GAP_MM = 1.5;
const QR_TEXT_GAP_MM = 2;
const QR_HINT_SIZE = 7;
const HEADER_TITLE_GAP_PT = 0.25;
const TITLE_CAP_HEIGHT_RATIO = 0.72;
const HEADER_LINE_GAP_PT = 2.5;
const PRICE_LABEL_BOX_GAP_PT = 1;
const STROKE_INSET_PT = 0.25;
const BOX_LINE_WIDTH_PT = 0.5;
const CUT_LINE_COLOR = "#888888";
const CUT_LINE_WIDTH_PT = 0.35;
const CUT_LINE_DASH_PT = 4;
const CUT_LINE_GAP_PT = 3;
const MIN_TITLE_WIDTH_PT = 20;
const ROW_HEIGHT_PADDING_PT = 0.5;

let cachedPdfDocument = null;

const registerFonts = (doc) => {
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

const tagSizePt = () => [mmToPt(TAG_WIDTH_MM), mmToPt(TAG_HEIGHT_MM)];
const a4SizePt = () => [mmToPt(A4_WIDTH_MM), mmToPt(A4_HEIGHT_MM)];

const textHeight = (doc, text, width, options = {}) =>
  doc.heightOfString(text, { width, lineGap: 0, ...options });

const singleLineHeight = (doc) => doc.currentLineHeight(false);

const fitPriceValueFontSize = (doc, priceText, boxWidth, boxHeight) => {
  const targetWidth = boxWidth * PRICE_BOX_WIDTH_FILL;
  const strokeInset = STROKE_INSET_PT;
  const innerHeight = boxHeight - strokeInset * 2;
  const targetHeight = innerHeight * PRICE_BOX_HEIGHT_FILL;
  let fontSize = PRICE_VALUE_MAX_SIZE;

  doc.font(FONT_BOLD);
  while (fontSize >= PRICE_VALUE_MIN_SIZE) {
    doc.fontSize(fontSize);
    const width = doc.widthOfString(priceText);
    const height = singleLineHeight(doc);
    if (width <= targetWidth && height <= targetHeight) {
      return fontSize;
    }
    fontSize -= 0.5;
  }

  return PRICE_VALUE_MIN_SIZE;
};

const measureCombinedPriceBlockHeight = () => mmToPt(PRICE_BOX_HEIGHT_MM);

const drawCombinedPriceBlock = (doc, payload, topY, marginLeft, contentWidth) => {
  const boxH = mmToPt(PRICE_BOX_HEIGHT_MM);
  strokeSquircleRect(doc, marginLeft, topY, contentWidth, boxH, mmToPt(PRICE_BOX_RADIUS_MM), {
    strokeColor: BOX_STROKE,
    lineWidth: BOX_LINE_WIDTH_PT,
  });

  const columnGap = mmToPt(PRICE_COLUMN_GAP_MM);
  const columnWidth = (contentWidth - columnGap) / 2;
  const leftX = marginLeft;
  const rightX = marginLeft + columnWidth + columnGap;
  const padding = mmToPt(PRICE_BOX_PADDING_MM);
  const innerTop = topY + padding;

  doc.font(FONT_REGULAR).fontSize(PRICE_LABEL_SIZE).fillColor(TEXT_COLOR);
  const labelH = singleLineHeight(doc);
  doc.text("За полотно:", leftX, innerTop, { width: columnWidth, align: "center", lineGap: 0 });
  doc.text("За комплект:", rightX, innerTop, { width: columnWidth, align: "center", lineGap: 0 });

  const priceAreaTop = innerTop + labelH + PRICE_LABEL_BOX_GAP_PT;
  const priceAreaH = boxH - padding * 2 - labelH - PRICE_LABEL_BOX_GAP_PT;
  const leafFontSize = fitPriceValueFontSize(doc, payload.priceFormatted, columnWidth, priceAreaH);
  const kitFontSize = fitPriceValueFontSize(doc, payload.kitPriceFormatted, columnWidth, priceAreaH);
  const priceFontSize = Math.min(leafFontSize, kitFontSize);

  doc.font(FONT_BOLD).fontSize(priceFontSize).fillColor(TEXT_COLOR);
  const lineH = singleLineHeight(doc);
  const priceY = priceAreaTop + (priceAreaH - lineH) / 2;
  doc.text(payload.priceFormatted, leftX, priceY, { width: columnWidth, align: "center", lineGap: 0 });
  doc.text(payload.kitPriceFormatted, rightX, priceY, {
    width: columnWidth,
    align: "center",
    lineGap: 0,
  });
};

const drawTitleBlock = (doc, payload, margin, contentWidth, startY, titleWidth = contentWidth) => {
  let y = startY;

  doc.font(FONT_BOLD).fontSize(TITLE_SIZE).fillColor(TEXT_COLOR);
  doc.text(payload.productName, margin, y, { width: titleWidth, align: "center", lineGap: 0 });
  const titleBlockH = textHeight(doc, payload.productName, titleWidth, { align: "center" });
  const titleLineH = singleLineHeight(doc);
  const lastLineTrailingSpace = Math.max(0, titleLineH - TITLE_SIZE * TITLE_CAP_HEIGHT_RATIO);
  y += titleBlockH - lastLineTrailingSpace / 2 + HEADER_TITLE_GAP_PT;

  doc.font(FONT_REGULAR).fontSize(BODY_SIZE);
  doc.text(payload.coatingColor, margin, y, { width: contentWidth, align: "center", lineGap: 0 });
  y += textHeight(doc, payload.coatingColor, contentWidth, { align: "center" });

  return y;
};

const measureFooterSpecsHeight = (doc, payload, contentWidth) => {
  doc.font(FONT_REGULAR).fontSize(BODY_SIZE);
  const coatingH = textHeight(doc, payload.coatingTypeLine, contentWidth);
  const manufacturerH = textHeight(doc, payload.manufacturerLine, contentWidth);
  return coatingH + HEADER_LINE_GAP_PT + manufacturerH;
};

const drawFooterSpecs = (doc, payload, topY, margin, contentWidth) => {
  let y = topY;

  doc.font(FONT_REGULAR).fontSize(BODY_SIZE).fillColor(TEXT_COLOR);
  doc.text(payload.coatingTypeLine, margin, y, { width: contentWidth, lineGap: 0 });
  y += textHeight(doc, payload.coatingTypeLine, contentWidth) + HEADER_LINE_GAP_PT;
  doc.text(payload.manufacturerLine, margin, y, { width: contentWidth, lineGap: 0 });
  y += textHeight(doc, payload.manufacturerLine, contentWidth);

  return y;
};

const wrapWords = (doc, text, maxWidth) => {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const next = `${line} ${words[i]}`;
    if (doc.widthOfString(next) <= maxWidth) {
      line = next;
    } else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
};

const layoutAccessoryRow = (doc, name, priceFormatted, contentWidth) => {
  const priceW = doc.widthOfString(priceFormatted);
  const lastLineNameMax = Math.max(
    MIN_TITLE_WIDTH_PT,
    contentWidth - priceW - ACCESSORY_LEADER_MIN_PT - ACCESSORY_LEADER_GAP_PT * 2,
  );

  let lines = wrapWords(doc, name, contentWidth);
  const lastLine = lines[lines.length - 1];
  if (doc.widthOfString(lastLine) > lastLineNameMax) {
    if (lines.length === 1) {
      lines = wrapWords(doc, name, lastLineNameMax);
    } else {
      const tail = lines.pop();
      lines.push(...wrapWords(doc, tail, lastLineNameMax));
    }
  }

  return { lines, priceW };
};

const measureAccessoryRowHeight = (doc, item, contentWidth) => {
  const { lines } = layoutAccessoryRow(doc, item.name, item.priceFormatted, contentWidth);
  const lineH = singleLineHeight(doc);
  return Math.max(lines.length * lineH, doc._fontSize + ROW_HEIGHT_PADDING_PT);
};

const drawAccessoryLeaderRow = (doc, item, margin, y, contentWidth) => {
  const price = item.priceFormatted;
  const { lines, priceW } = layoutAccessoryRow(doc, item.name, price, contentWidth);
  const lineH = singleLineHeight(doc);
  const priceX = margin + contentWidth - priceW;
  const dotW = doc.widthOfString(ACCESSORY_DOT);

  lines.forEach((line, index) => {
    const rowY = y + index * lineH;
    const isLast = index === lines.length - 1;
    if (!isLast) {
      doc.text(line, margin, rowY, { width: contentWidth, lineGap: 0 });
      return;
    }

    doc.text(line, margin, rowY, { lineBreak: false });
    const dotStart = margin + doc.widthOfString(line) + ACCESSORY_LEADER_GAP_PT;
    const dotEnd = priceX - ACCESSORY_LEADER_GAP_PT;
    const dotCount = Math.max(0, Math.floor((dotEnd - dotStart) / dotW));
    if (dotCount > 0) {
      doc.text(ACCESSORY_DOT.repeat(dotCount), dotStart, rowY, { lineBreak: false });
    }
    doc.text(price, priceX, rowY, { lineBreak: false });
  });

  return lines.length * lineH;
};

const buildCompactAccessoryLayout = (doc, items, maxHeight, contentWidth) => {
  let fontSize = ACCESSORY_SIZE;

  while (fontSize >= MIN_ACCESSORY_FONT_SIZE) {
    doc.font(FONT_REGULAR).fontSize(fontSize);
    const rowHeights = items.map((item) => measureAccessoryRowHeight(doc, item, contentWidth));
    const gapCount = Math.max(items.length - 1, 0);
    const blockHeight =
      rowHeights.reduce((sum, height) => sum + height, 0) + gapCount * ACCESSORY_ROW_GAP_PT;
    if (blockHeight <= maxHeight) {
      return { fontSize, rowHeights, blockHeight };
    }
    fontSize -= 0.25;
  }

  doc.font(FONT_REGULAR).fontSize(MIN_ACCESSORY_FONT_SIZE);
  const rowHeights = items.map((item) => measureAccessoryRowHeight(doc, item, contentWidth));
  const gapCount = Math.max(items.length - 1, 0);
  const blockHeight =
    rowHeights.reduce((sum, height) => sum + height, 0) + gapCount * ACCESSORY_ROW_GAP_PT;

  return { fontSize: MIN_ACCESSORY_FONT_SIZE, rowHeights, blockHeight };
};

const drawAccessories = (doc, accessories, topY, bottomY, margin, contentWidth) => {
  const items =
    accessories.length === 0 ? [{ name: "—", priceFormatted: "—" }] : accessories;
  doc.font(FONT_BOLD).fontSize(ACCESSORY_SIZE);
  const headingHeight =
    textHeight(doc, "Комплектующие:", contentWidth) + mmToPt(ACCESSORIES_HEADING_GAP_MM);
  const maxRowsHeight = Math.max(0, bottomY - topY - headingHeight);
  const { fontSize, rowHeights } = buildCompactAccessoryLayout(
    doc,
    items,
    maxRowsHeight,
    contentWidth,
  );

  let y = topY;
  doc.font(FONT_BOLD).fontSize(ACCESSORY_SIZE).fillColor(TEXT_COLOR);
  doc.text("Комплектующие:", margin, y, { width: contentWidth, lineGap: 0 });
  y += headingHeight;

  doc.font(FONT_REGULAR).fontSize(fontSize);
  items.forEach((item, index) => {
    drawAccessoryLeaderRow(doc, item, margin, y, contentWidth);
    y += rowHeights[index];
    if (index < items.length - 1) y += ACCESSORY_ROW_GAP_PT;
  });

  return y;
};

const fitFootnoteFontSize = (doc, text, maxWidth) => {
  let fontSize = FOOTNOTE_SIZE;

  doc.font(FONT_REGULAR);
  while (fontSize >= FOOTNOTE_MIN_SIZE) {
    doc.fontSize(fontSize);
    if (doc.widthOfString(text) <= maxWidth) {
      return fontSize;
    }
    fontSize -= 0.25;
  }

  return FOOTNOTE_MIN_SIZE;
};

const measureQrBlockHeight = (doc, contentWidth) => {
  const qrSizePt = mmToPt(QR_SIZE_MM);
  const textWidth = contentWidth - qrSizePt - mmToPt(QR_TEXT_GAP_MM);
  doc.font(FONT_REGULAR).fontSize(QR_HINT_SIZE);
  const textH = textHeight(doc, QR_HINT_TEXT, Math.max(20, textWidth));
  return Math.max(qrSizePt, textH);
};

const drawQrBlock = (doc, qrPng, marginLeft, contentWidth, topY) => {
  const qrSizePt = mmToPt(QR_SIZE_MM);
  const textGapPt = mmToPt(QR_TEXT_GAP_MM);
  const textWidth = Math.max(20, contentWidth - qrSizePt - textGapPt);
  const qrX = marginLeft + contentWidth - qrSizePt;

  doc.font(FONT_REGULAR).fontSize(QR_HINT_SIZE).fillColor(TEXT_COLOR);
  const textH = textHeight(doc, QR_HINT_TEXT, textWidth);
  const blockH = Math.max(qrSizePt, textH);
  const textY = topY + (blockH - textH) / 2;
  const qrY = topY + (blockH - qrSizePt) / 2;

  doc.text(QR_HINT_TEXT, marginLeft, textY, { width: textWidth, lineGap: 0 });
  doc.image(qrPng, qrX, qrY, { width: qrSizePt, height: qrSizePt });

  return blockH;
};

const renderInteriorPriceTag = (doc, payload, qrPng = null, { originX = 0, originY = 0 } = {}) => {
  const marginLeft = originX + mmToPt(MARGIN_LEFT_MM);
  const marginRight = mmToPt(MARGIN_RIGHT_MM);
  const marginTop = originY + mmToPt(MARGIN_TOP_MM);
  const marginBottom = mmToPt(MARGIN_BOTTOM_MM);
  const contentWidth = mmToPt(TAG_WIDTH_MM) - mmToPt(MARGIN_LEFT_MM) - marginRight;
  const tagBottom = originY + mmToPt(TAG_HEIGHT_MM) - marginBottom;

  const footnoteFontSize = fitFootnoteFontSize(doc, payload.footnote, contentWidth);
  doc.font(FONT_REGULAR).fontSize(footnoteFontSize);
  const footnoteH = singleLineHeight(doc);

  const priceBoxH = measureCombinedPriceBlockHeight();
  const footnoteGapPt = mmToPt(FOOTNOTE_GAP_MM);
  const qrGapPt = mmToPt(QR_GAP_MM);
  const qrBlockH = qrPng ? measureQrBlockHeight(doc, contentWidth) : 0;
  const footerSpecsH = measureFooterSpecsHeight(doc, payload, contentWidth);

  let bottomY = tagBottom;
  let qrTop = null;
  if (qrPng) {
    qrTop = bottomY - qrBlockH;
    bottomY = qrTop - qrGapPt;
  }

  const footerTop = bottomY - footerSpecsH;
  const accessoriesBottom = footerTop - mmToPt(ACCESSORIES_BOTTOM_GAP_MM);

  let y = marginTop;
  const titleEnd = drawTitleBlock(doc, payload, marginLeft, contentWidth, y);
  y = titleEnd + mmToPt(PRICE_TOP_GAP_MM);

  drawCombinedPriceBlock(doc, payload, y, marginLeft, contentWidth);
  y += priceBoxH + footnoteGapPt;

  doc.font(FONT_REGULAR).fontSize(footnoteFontSize).fillColor(TEXT_COLOR);
  doc.text(payload.footnote, marginLeft, y, { width: contentWidth, align: "center", lineGap: 0 });
  y += footnoteH + mmToPt(ACCESSORIES_TOP_GAP_MM);

  drawAccessories(doc, payload.accessories, y, accessoriesBottom, marginLeft, contentWidth);
  drawFooterSpecs(doc, payload, footerTop, marginLeft, contentWidth);

  if (qrPng) {
    drawQrBlock(doc, qrPng, marginLeft, contentWidth, qrTop);
  }
};

const renderInteriorPriceTagPage = (doc, payload, qrPng = null) => {
  renderInteriorPriceTag(doc, payload, qrPng);
};

const getBulkTagOrigin = (slotIndex) => {
  const col = slotIndex % TAGS_PER_A4_COLS;
  const row = Math.floor(slotIndex / TAGS_PER_A4_COLS);
  return {
    originX: mmToPt(col * TAG_WIDTH_MM),
    originY: mmToPt(row * TAG_HEIGHT_MM),
  };
};

const drawBulkCutLines = (doc) => {
  const pageWidth = mmToPt(A4_WIDTH_MM);
  const pageHeight = mmToPt(A4_HEIGHT_MM);
  const verticalX = mmToPt(TAG_WIDTH_MM);
  const horizontalY = mmToPt(TAG_HEIGHT_MM);

  doc.save();
  doc.strokeColor(CUT_LINE_COLOR);
  doc.lineWidth(CUT_LINE_WIDTH_PT);
  doc.dash(CUT_LINE_DASH_PT, { space: CUT_LINE_GAP_PT });
  doc.moveTo(verticalX, 0).lineTo(verticalX, pageHeight).stroke();
  doc.moveTo(0, horizontalY).lineTo(pageWidth, horizontalY).stroke();
  doc.undash();
  doc.restore();
};

const renderPdfToBuffer = (draw, { pageSize = tagSizePt() } = {}) =>
  new Promise((resolve, reject) => {
    const PDFDocument = getPdfDocument();
    const doc = new PDFDocument({ size: pageSize, margin: 0, autoFirstPage: true });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    registerFonts(doc);
    draw(doc);
    doc.end();
  });

const renderInteriorPriceTagPdf = async (payload) => {
  const qrPng = payload.productUrl ? await generateQrCodePng(payload.productUrl) : null;
  return renderPdfToBuffer((doc) => {
    renderInteriorPriceTag(doc, payload, qrPng);
  });
};

const renderInteriorPriceTagPdfBulk = async (payloads) => {
  const qrByUrl = new Map();
  const urls = [...new Set(payloads.map((payload) => payload.productUrl).filter(Boolean))];
  await Promise.all(
    urls.map(async (url) => {
      qrByUrl.set(url, await generateQrCodePng(url));
    }),
  );

  return renderPdfToBuffer(
    (doc) => {
      payloads.forEach((payload, index) => {
        if (index > 0 && index % TAGS_PER_A4_PAGE === 0) {
          drawBulkCutLines(doc);
          doc.addPage({ size: a4SizePt(), margin: 0 });
        }
        const slot = index % TAGS_PER_A4_PAGE;
        const { originX, originY } = getBulkTagOrigin(slot);
        const qrPng = payload.productUrl ? qrByUrl.get(payload.productUrl) : null;
        renderInteriorPriceTag(doc, payload, qrPng, { originX, originY });
      });

      if (payloads.length > 0) {
        drawBulkCutLines(doc);
      }
    },
    { pageSize: a4SizePt() },
  );
};

module.exports = {
  renderInteriorPriceTag,
  renderInteriorPriceTagPage,
  renderInteriorPriceTagPdf,
  renderInteriorPriceTagPdfBulk,
};
