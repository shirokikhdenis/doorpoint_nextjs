const { assertKpPdfFonts } = require("./kpPdfFonts");
const { pageSizePt, marginPtForFormat, mmToPt } = require("./bookletFormats");
const { chunkItems, QR_HINT_TEXT } = require("../../booklet-formats");
const {
  SITE_NAME,
  BRAND_COLOR,
  TEXT_MUTED,
  TEXT_PRIMARY,
  SURFACE_MUTED,
  BORDER_COLOR,
} = require("./kpPdfCompany");

const FONT_REGULAR = "KpRegular";
const FONT_BOLD = "KpBold";
const ENTRY_LABEL = "Входные двери";
const INTERIOR_LABEL = "Межкомнатные двери";
const SERVICES_LINE = "Бесплатный замер · Доставка · Монтаж под ключ";
const COVER_BULLETS = [
  "Бесплатный замер по городу",
  "Доставка и монтаж под ключ",
  "Входные и межкомнатные в одном салоне",
];
const PRINT_BLACK = "#000000";
const DIVIDER_WIDTH = 0.7;

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

const collectPdfBuffer = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

const kindLabel = (kind) => (kind === "entry" ? ENTRY_LABEL : INTERIOR_LABEL);

const fitImage = (doc, buffer, x, y, width, height) => {
  if (!buffer || width < 4 || height < 4) return false;
  try {
    doc.image(buffer, x, y, { fit: [width, height], align: "center", valign: "center" });
    return true;
  } catch {
    return false;
  }
};

const drawDivider = (doc, x, y, width) => {
  doc
    .save()
    .strokeColor(BRAND_COLOR)
    .lineWidth(DIVIDER_WIDTH)
    .moveTo(x, y)
    .lineTo(x + width, y)
    .stroke()
    .restore();
};

const drawPhotoFrame = (doc, x, y, width, height, buffer) => {
  doc
    .save()
    .fillColor("#ffffff")
    .roundedRect(x, y, width, height, 4)
    .fill()
    .fillColor(SURFACE_MUTED)
    .roundedRect(x, y, width, height, 4)
    .fill()
    .strokeColor(BORDER_COLOR)
    .lineWidth(0.5)
    .roundedRect(x, y, width, height, 4)
    .stroke()
    .restore();
  const inset = 4;
  if (!fitImage(doc, buffer, x + inset, y + inset, width - inset * 2, height - inset * 2)) {
    doc
      .font(FONT_REGULAR)
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text("Фото", x, y + height / 2 - 6, { width, align: "center" });
  }
};

const drawBadge = (doc, label, x, y) => {
  const text = String(label || "").trim();
  if (!text) return 0;
  doc.font(FONT_BOLD).fontSize(6.5);
  const padX = 4;
  const padY = 2;
  const w = doc.widthOfString(text) + padX * 2;
  const h = 11;
  doc
    .save()
    .fillColor(BRAND_COLOR)
    .roundedRect(x, y, w, h, 2)
    .fill()
    .restore();
  doc.font(FONT_BOLD).fontSize(6.5).fillColor("#ffffff").text(text, x + padX, y + padY, {
    width: w - padX * 2,
    lineBreak: false,
  });
  return w;
};

/** Horizontal split: tall door photo left, copy right — matches door aspect better. */
const drawProductCardSplit = (doc, product, x, y, width, height, { showPrices, showCompare }) => {
  const photoW = Math.min(width * 0.38, height / 1.85);
  const gap = 8;
  const textX = x + photoW + gap;
  const textW = Math.max(24, width - photoW - gap);

  drawPhotoFrame(doc, x, y, photoW, height, product.imageBuffer);

  let cursorY = y + 2;
  const badges = Array.isArray(product.badges) ? product.badges.slice(0, 2) : [];
  if (badges.length) {
    let badgeX = textX;
    for (const badge of badges) {
      const used = drawBadge(doc, badge, badgeX, cursorY);
      badgeX += used + 4;
    }
    cursorY += 14;
  }

  const nameSize = height < 70 ? 7.5 : 9;
  doc.font(FONT_BOLD).fontSize(nameSize).fillColor(PRINT_BLACK);
  doc.text(product.name || "—", textX, cursorY, {
    width: textW,
    height: nameSize * 2.6 + 2,
    ellipsis: true,
    lineGap: 1,
  });
  cursorY = doc.y + 3;

  if (product.metaLine) {
    doc.font(FONT_REGULAR).fontSize(7).fillColor(TEXT_MUTED);
    doc.text(product.metaLine, textX, cursorY, {
      width: textW,
      height: 18,
      ellipsis: true,
    });
    cursorY = doc.y + 4;
  }

  if (showPrices && product.priceLabel) {
    const priceY = Math.max(cursorY, y + height - 22);
    if (showCompare && product.compareLabel) {
      doc.font(FONT_REGULAR).fontSize(7).fillColor(TEXT_MUTED);
      doc.text(product.compareLabel, textX, priceY - 10, {
        width: textW,
        lineBreak: false,
      });
      const strikeW = Math.min(textW, doc.widthOfString(product.compareLabel));
      doc
        .save()
        .strokeColor(TEXT_MUTED)
        .lineWidth(0.6)
        .moveTo(textX, priceY - 5)
        .lineTo(textX + strikeW, priceY - 5)
        .stroke()
        .restore();
    }
    doc.font(FONT_BOLD).fontSize(height < 70 ? 9 : 11).fillColor(BRAND_COLOR);
    doc.text(product.priceLabel, textX, priceY, { width: textW, lineBreak: false });
  }
};

/** Stacked card for tight booklet grid cells. */
const drawProductCardStacked = (doc, product, x, y, width, height, { showPrices, showCompare }) => {
  const textReserve = showPrices ? (showCompare && product.compareLabel ? 30 : 22) : 16;
  const photoH = Math.max(40, height - textReserve);
  drawPhotoFrame(doc, x, y, width, photoH, product.imageBuffer);

  let cursorY = y + photoH + 3;
  const badges = Array.isArray(product.badges) ? product.badges.slice(0, 1) : [];
  if (badges.length) {
    drawBadge(doc, badges[0], x, cursorY);
    cursorY += 13;
  }

  doc.font(FONT_BOLD).fontSize(7.5).fillColor(PRINT_BLACK);
  doc.text(product.name || "—", x, cursorY, {
    width,
    height: 18,
    ellipsis: true,
    lineGap: 1,
  });

  if (showPrices && product.priceLabel) {
    const priceY = y + height - 11;
    if (showCompare && product.compareLabel) {
      doc.font(FONT_REGULAR).fontSize(6.5).fillColor(TEXT_MUTED);
      doc.text(product.compareLabel, x, priceY - 9, { width, lineBreak: false });
    }
    doc.font(FONT_BOLD).fontSize(8.5).fillColor(BRAND_COLOR);
    doc.text(product.priceLabel, x, priceY, { width, lineBreak: false });
  }
};

const drawProductCard = (doc, product, x, y, width, height, options) => {
  const useSplit = options.layout === "split" || (height >= 58 && width / height >= 1.15);
  if (useSplit) {
    drawProductCardSplit(doc, product, x, y, width, height, options);
  } else {
    drawProductCardStacked(doc, product, x, y, width, height, options);
  }
};

const drawHeader = (doc, payload, margin, contentWidth, compact) => {
  const topY = margin;
  const logoH = compact ? 22 : 28;
  const logoW = compact ? 92 : 118;
  let logoBottom = topY + 16;
  if (payload.logoBuffer) {
    if (fitImage(doc, payload.logoBuffer, margin, topY, logoW, logoH)) {
      logoBottom = topY + logoH;
    } else {
      doc.font(FONT_BOLD).fontSize(compact ? 11 : 13).fillColor(BRAND_COLOR).text(SITE_NAME, margin, topY, {
        width: logoW,
      });
      logoBottom = doc.y;
    }
  } else {
    doc.font(FONT_BOLD).fontSize(compact ? 11 : 13).fillColor(BRAND_COLOR).text(SITE_NAME, margin, topY, {
      width: logoW,
    });
    logoBottom = doc.y;
  }

  doc
    .font(FONT_BOLD)
    .fontSize(compact ? 10 : 12)
    .fillColor(PRINT_BLACK)
    .text(payload.phone, margin, topY, { width: contentWidth, align: "right" });

  const headlineY = Math.max(logoBottom, topY + 16) + (compact ? 6 : 8);
  doc
    .font(FONT_BOLD)
    .fontSize(compact ? 12 : 15)
    .fillColor(PRINT_BLACK)
    .text(payload.headline, margin, headlineY, { width: contentWidth });

  let cursorY = doc.y + 3;
  if (payload.subhead) {
    doc
      .font(FONT_REGULAR)
      .fontSize(compact ? 7.5 : 8.5)
      .fillColor(TEXT_MUTED)
      .text(payload.subhead, margin, cursorY, { width: contentWidth });
    cursorY = doc.y + (compact ? 5 : 7);
  } else {
    cursorY += compact ? 4 : 6;
  }

  drawDivider(doc, margin, cursorY, contentWidth);
  return cursorY + (compact ? 8 : 10);
};

const drawCouponStrip = (doc, text, x, y, width, compact) => {
  if (!text) return y;
  const h = compact ? 22 : 26;
  doc
    .save()
    .strokeColor(BRAND_COLOR)
    .lineWidth(0.8)
    .dash(3, { space: 2 })
    .roundedRect(x, y, width, h, 3)
    .stroke()
    .undash()
    .restore();
  doc
    .font(FONT_BOLD)
    .fontSize(compact ? 7.5 : 8.5)
    .fillColor(BRAND_COLOR)
    .text(text, x + 8, y + (compact ? 7 : 8), { width: width - 16, align: "center" });
  return y + h;
};

const drawFooter = (doc, payload, pageWidth, pageHeight, margin, contentWidth, compact) => {
  const qrSize = compact ? mmToPt(16) : mmToPt(20);
  const couponH = payload.couponText ? (compact ? 28 : 34) : 0;
  const footerH = qrSize + (compact ? 18 : 22) + couponH;
  let top = pageHeight - margin - footerH;

  if (payload.couponText) {
    top = drawCouponStrip(doc, payload.couponText, margin, top, contentWidth, compact) + 6;
  }

  doc
    .save()
    .strokeColor(BORDER_COLOR)
    .lineWidth(0.5)
    .moveTo(margin, top - 6)
    .lineTo(margin + contentWidth, top - 6)
    .stroke()
    .restore();

  const textWidth = contentWidth - qrSize - 12;
  doc.font(FONT_BOLD).fontSize(compact ? 7.5 : 8.5).fillColor(PRINT_BLACK);
  doc.text(payload.addressShort, margin, top, { width: textWidth });
  doc.font(FONT_REGULAR).fontSize(compact ? 7 : 8).fillColor(TEXT_MUTED);
  doc.text(payload.hours, margin, doc.y + 2, { width: textWidth });
  doc.font(FONT_BOLD).fontSize(compact ? 7.5 : 8.5).fillColor(BRAND_COLOR);
  doc.text(payload.siteHost, margin, doc.y + 2, { width: textWidth });

  const qrX = margin + contentWidth - qrSize;
  if (payload.qrBuffer) {
    fitImage(doc, payload.qrBuffer, qrX, top, qrSize, qrSize);
  }
  doc
    .font(FONT_REGULAR)
    .fontSize(6)
    .fillColor(TEXT_MUTED)
    .text(payload.qrHint || QR_HINT_TEXT, qrX - 4, top + qrSize + 2, {
      width: qrSize + 8,
      align: "center",
    });

  return pageHeight - margin - footerH - 8;
};

const cardOptions = (payload, compact) => ({
  showPrices: payload.showPrices,
  showCompare: payload.showComparePrices === true,
  compact,
  layout: "split",
});

const drawColumn = (doc, products, title, x, y, width, height, options) => {
  doc.font(FONT_BOLD).fontSize(options.compact ? 9 : 11).fillColor(BRAND_COLOR);
  doc.text(title, x, y, { width });
  const titleH = options.compact ? 14 : 18;
  if (!products.length) {
    doc.font(FONT_REGULAR).fontSize(8).fillColor(TEXT_MUTED).text("—", x, y + titleH, { width });
    return;
  }
  const gap = options.compact ? 6 : 8;
  const available = height - titleH;
  const cardH = (available - gap * (products.length - 1)) / products.length;
  let cursor = y + titleH;
  for (const product of products) {
    drawProductCard(doc, product, x, cursor, width, cardH, options);
    cursor += cardH + gap;
  }
};

const drawFlyerPage = (doc, payload, format) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = marginPtForFormat(format);
  const contentWidth = pageWidth - margin * 2;
  const compact = format.id !== "a4";
  const bodyTop = drawHeader(doc, payload, margin, contentWidth, compact);
  const footerTop = drawFooter(doc, payload, pageWidth, pageHeight, margin, contentWidth, compact);
  const bodyH = footerTop - bodyTop - 8;
  const entry = payload.entryProducts;
  const interior = payload.interiorProducts;
  const gap = compact ? 10 : 14;
  const options = cardOptions(payload, compact);

  if (entry.length && interior.length) {
    const colW = (contentWidth - gap) / 2;
    drawColumn(doc, entry, ENTRY_LABEL, margin, bodyTop, colW, bodyH, options);
    drawColumn(doc, interior, INTERIOR_LABEL, margin + colW + gap, bodyTop, colW, bodyH, options);
    return;
  }

  const only = entry.length ? entry : interior;
  if (!only.length) return;
  const title = entry.length ? ENTRY_LABEL : INTERIOR_LABEL;
  const cols = only.length > 2 || format.id === "a4" ? 2 : 1;
  doc.font(FONT_BOLD).fontSize(compact ? 9 : 11).fillColor(BRAND_COLOR);
  doc.text(title, margin, bodyTop, { width: contentWidth });
  const titleH = compact ? 14 : 18;
  const rows = Math.ceil(only.length / cols);
  const cardGap = compact ? 6 : 8;
  const colW = cols === 1 ? contentWidth : (contentWidth - cardGap) / 2;
  const cardH = (bodyH - titleH - cardGap * (rows - 1)) / rows;
  only.forEach((product, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = margin + col * (colW + cardGap);
    const y = bodyTop + titleH + row * (cardH + cardGap);
    drawProductCard(doc, product, x, y, colW, cardH, options);
  });
};

const drawInnerHeader = (doc, title, pageNo, pageCount, margin, contentWidth) => {
  doc.font(FONT_BOLD).fontSize(8).fillColor(BRAND_COLOR).text(SITE_NAME, margin, margin, {
    width: contentWidth * 0.65,
  });
  doc
    .font(FONT_REGULAR)
    .fontSize(8)
    .fillColor(TEXT_MUTED)
    .text(`${pageNo} / ${pageCount}`, margin, margin, { width: contentWidth, align: "right" });
  const titleY = margin + 14;
  doc.font(FONT_BOLD).fontSize(11).fillColor(PRINT_BLACK).text(title, margin, titleY, { width: contentWidth });
  const y = doc.y + 6;
  drawDivider(doc, margin, y, contentWidth);
  return y + 10;
};

const innerPageTitle = (chunk) => {
  const kinds = new Set(chunk.map((item) => item.kind));
  if (kinds.size === 1) return kindLabel(chunk[0].kind);
  return "Примеры моделей";
};

const drawCoverBullets = (doc, x, y, width) => {
  let cursor = y;
  for (const line of COVER_BULLETS) {
    doc.font(FONT_BOLD).fontSize(9).fillColor(BRAND_COLOR).text("•", x, cursor, { width: 10 });
    doc
      .font(FONT_REGULAR)
      .fontSize(9)
      .fillColor(PRINT_BLACK)
      .text(line, x + 12, cursor, { width: width - 12 });
    cursor = doc.y + 6;
  }
  return cursor;
};

const drawBookletCover = (doc, payload, format) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = marginPtForFormat(format);
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  if (payload.logoBuffer) {
    fitImage(doc, payload.logoBuffer, margin + (contentWidth - 120) / 2, y, 120, 28);
  } else {
    doc
      .font(FONT_BOLD)
      .fontSize(14)
      .fillColor(BRAND_COLOR)
      .text(SITE_NAME, margin, y, { width: contentWidth, align: "center" });
  }
  y += 40;

  doc.font(FONT_BOLD).fontSize(17).fillColor(PRINT_BLACK);
  doc.text(payload.headline, margin, y, { width: contentWidth, align: "center" });
  y = doc.y + 6;
  if (payload.subhead) {
    doc
      .font(FONT_REGULAR)
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text(payload.subhead, margin, y, { width: contentWidth, align: "center" });
    y = doc.y + 8;
  }
  doc
    .font(FONT_BOLD)
    .fontSize(12)
    .fillColor(BRAND_COLOR)
    .text(payload.phone, margin, y, { width: contentWidth, align: "center" });
  y = doc.y + 14;

  const heroes = [...payload.entryProducts, ...payload.interiorProducts].slice(0, 2);
  const photoBottom = pageHeight - margin - 48;
  const photoH = Math.max(80, photoBottom - y);

  if (heroes.length === 2) {
    const gap = 10;
    const colW = (contentWidth - gap) / 2;
    const doorW = Math.min(colW, photoH / 1.9);
    const leftX = margin + (colW - doorW) / 2;
    const rightX = margin + colW + gap + (colW - doorW) / 2;
    drawPhotoFrame(doc, leftX, y, doorW, photoH, heroes[0].imageBuffer);
    drawPhotoFrame(doc, rightX, y, doorW, photoH, heroes[1].imageBuffer);
  } else if (heroes.length === 1) {
    const doorW = Math.min(mmToPt(58), contentWidth * 0.42);
    const doorX = margin;
    drawPhotoFrame(doc, doorX, y, doorW, photoH, heroes[0].imageBuffer);
    drawCoverBullets(doc, doorX + doorW + 12, y + 12, contentWidth - doorW - 12);
  } else {
    drawCoverBullets(doc, margin, y, contentWidth);
  }

  doc
    .font(FONT_REGULAR)
    .fontSize(8)
    .fillColor(TEXT_MUTED)
    .text(payload.addressShort, margin, pageHeight - margin - 22, {
      width: contentWidth,
      align: "center",
    });
  doc
    .font(FONT_BOLD)
    .fontSize(8)
    .fillColor(PRINT_BLACK)
    .text("Салон дверей", margin, pageHeight - margin - 10, {
      width: contentWidth,
      align: "center",
    });
};

const drawBookletInnerPage = (doc, chunk, payload, format, pageNo, pageCount) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = marginPtForFormat(format);
  const contentWidth = pageWidth - margin * 2;
  const bodyTop = drawInnerHeader(doc, innerPageTitle(chunk), pageNo, pageCount, margin, contentWidth);
  const bodyH = pageHeight - margin - bodyTop;
  const cols = 2;
  const rows = 2;
  const gap = 8;
  const colW = (contentWidth - gap) / cols;
  const rowH = (bodyH - gap) / rows;
  const options = { ...cardOptions(payload, true), layout: "stacked" };
  chunk.forEach((product, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = margin + col * (colW + gap);
    const y = bodyTop + row * (rowH + gap);
    drawProductCard(doc, product, x, y, colW, rowH - 2, options);
  });
};

const drawBookletBack = (doc, payload, format) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = marginPtForFormat(format);
  const contentWidth = pageWidth - margin * 2;
  let y = margin + 12;

  if (payload.logoBuffer) {
    fitImage(doc, payload.logoBuffer, margin + (contentWidth - 130) / 2, y, 130, 30);
    y += 44;
  }

  doc
    .font(FONT_BOLD)
    .fontSize(16)
    .fillColor(PRINT_BLACK)
    .text(SITE_NAME, margin, y, { width: contentWidth, align: "center" });
  y = doc.y + 14;

  const block = (label, value, bold = false) => {
    doc.font(FONT_BOLD).fontSize(8).fillColor(BRAND_COLOR).text(label, margin, y, { width: contentWidth });
    y = doc.y + 2;
    doc
      .font(bold ? FONT_BOLD : FONT_REGULAR)
      .fontSize(bold ? 12 : 9)
      .fillColor(PRINT_BLACK)
      .text(value, margin, y, { width: contentWidth });
    y = doc.y + 8;
  };

  block("Адрес", payload.addressFull);
  block("Режим работы", payload.hours);
  block("Телефон", payload.phone, true);
  block("E-mail", payload.email);
  y += 4;

  const qrSize = mmToPt(26);
  const qrX = margin + (contentWidth - qrSize) / 2;
  if (payload.qrBuffer) {
    fitImage(doc, payload.qrBuffer, qrX, y, qrSize, qrSize);
  }
  y += qrSize + 6;
  doc
    .font(FONT_BOLD)
    .fontSize(10)
    .fillColor(BRAND_COLOR)
    .text(payload.siteHost, margin, y, { width: contentWidth, align: "center" });
  y = doc.y + 2;
  doc
    .font(FONT_REGULAR)
    .fontSize(7)
    .fillColor(TEXT_MUTED)
    .text(payload.qrHint || QR_HINT_TEXT, margin, y, { width: contentWidth, align: "center" });
  y = doc.y + 12;

  doc
    .font(FONT_REGULAR)
    .fontSize(8.5)
    .fillColor(TEXT_MUTED)
    .text(SERVICES_LINE, margin, y, { width: contentWidth, align: "center" });
  y = doc.y + 12;

  if (payload.couponText) {
    const couponTop = Math.min(y, pageHeight - margin - 30);
    drawCouponStrip(doc, payload.couponText, margin, couponTop, contentWidth, true);
  }
};

const taggedProducts = (payload) => [
  ...payload.entryProducts.map((item) => ({ ...item, kind: "entry" })),
  ...payload.interiorProducts.map((item) => ({ ...item, kind: "interior" })),
];

const renderBookletPdf = async (payload) => {
  const format = payload.format;
  const PDFDocument = getPdfDocument();
  const size = pageSizePt(format);
  const doc = new PDFDocument({ size, margin: 0 });
  const finished = collectPdfBuffer(doc);
  registerFonts(doc);

  if (format.kind === "booklet") {
    drawBookletCover(doc, payload, format);
    const chunks = chunkItems(taggedProducts(payload), format.productsPerPage || 4);
    const pageCount = 2 + chunks.length;
    chunks.forEach((chunk, index) => {
      doc.addPage({ size, margin: 0 });
      drawBookletInnerPage(doc, chunk, payload, format, index + 2, pageCount);
    });
    doc.addPage({ size, margin: 0 });
    drawBookletBack(doc, payload, format);
  } else {
    drawFlyerPage(doc, payload, format);
  }

  doc.end();
  return finished;
};

module.exports = {
  renderBookletPdf,
};
