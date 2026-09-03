const fs = require("node:fs");
const sharp = require("sharp");
const catalogService = require("./catalogService");
const { buildCartKpPayload } = require("../domain/cartCommercialProposalDocumentData");
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
const FONT_REGULAR = "KpRegular";
const FONT_BOLD = "KpBold";
const PNG_WIDTH = 1240;
const PNG_SCALE = 2;

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

const xmlEscape = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

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

const ensureSpace = (doc, y, needed) => {
  const limit = doc.page.height - PAGE_MARGIN - 70;
  if (y + needed <= limit) return y;
  doc.addPage();
  return PAGE_MARGIN;
};

const drawHeader = async (doc, payload) => {
  const topY = PAGE_MARGIN;
  const logo = await resolveImageBuffer(SITE_LOGO_PATH);
  let logoBottom = topY + 36;
  if (logo) {
    try {
      doc.image(logo.buffer, PAGE_MARGIN, topY, { fit: [132, 36], valign: "top" });
      logoBottom = topY + 38;
    } catch {
      doc.font(FONT_BOLD).fontSize(15).fillColor(BRAND_COLOR).text(SITE_NAME, PAGE_MARGIN, topY);
      logoBottom = doc.y;
    }
  } else {
    doc.font(FONT_BOLD).fontSize(15).fillColor(BRAND_COLOR).text(SITE_NAME, PAGE_MARGIN, topY);
    logoBottom = doc.y;
  }

  const metaX = PAGE_MARGIN + 150;
  const metaWidth = pageWidth(doc) - PAGE_MARGIN - metaX;
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

  const dividerY = Math.max(logoBottom, topY + 40) + 12;
  drawDivider(doc, dividerY);
  return dividerY + 18;
};

const drawDoorBlock = async (doc, payload, startY) => {
  const width = contentWidth(doc);
  const leftWidth = Math.floor(width * 0.4);
  const rightWidth = width - leftWidth - 20;
  const leftX = PAGE_MARGIN;
  const rightX = PAGE_MARGIN + leftWidth + 20;
  const imageHeight = 250;
  const image = await resolveImageBuffer(payload.door.imageUrl);

  if (payload.door.showImageFrame) {
    doc
      .save()
      .fillColor(SURFACE_MUTED)
      .roundedRect(leftX, startY, leftWidth, imageHeight, 8)
      .fill()
      .strokeColor(BORDER_COLOR)
      .lineWidth(1)
      .roundedRect(leftX, startY, leftWidth, imageHeight, 8)
      .stroke()
      .restore();
  }

  if (image) {
    try {
      const inset = payload.door.showImageFrame ? 12 : 0;
      doc.image(image.buffer, leftX + inset, startY + inset, {
        fit: [leftWidth - inset * 2, imageHeight - inset * 2],
        align: "center",
        valign: "center",
      });
    } catch {
      /* ignore */
    }
  }

  let y = startY + 8;
  doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_MUTED).text(payload.door.categoryLabel, rightX, y, {
    width: rightWidth,
  });
  y = doc.y + 8;
  doc.font(FONT_BOLD).fontSize(16).fillColor(TEXT_PRIMARY).text(payload.door.displayName, rightX, y, {
    width: rightWidth,
  });
  y = doc.y + 8;
  if (payload.door.sku) {
    doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_MUTED).text(`Артикул: ${payload.door.sku}`, rightX, y, {
      width: rightWidth,
    });
    y = doc.y + 10;
  }
  doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_MUTED).text("Карточка товара:", rightX, y, {
    width: rightWidth,
  });
  y = doc.y + 2;
  doc
    .font(FONT_REGULAR)
    .fontSize(9)
    .fillColor(BRAND_COLOR)
    .text(payload.door.productPageLinkLabel, rightX, y, {
      width: rightWidth,
      link: payload.door.productPageUrl,
      underline: true,
    });

  return Math.max(startY + imageHeight, doc.y) + 18;
};

const drawInvoiceTable = (doc, payload, startY) => {
  let y = startY;
  const width = contentWidth(doc);
  const cols = {
    name: PAGE_MARGIN,
    nameW: width - 220,
    price: PAGE_MARGIN + width - 220,
    priceW: 70,
    qty: PAGE_MARGIN + width - 150,
    qtyW: 50,
    sum: PAGE_MARGIN + width - 100,
    sumW: 100,
  };

  const drawRow = (line, header = false) => {
    y = ensureSpace(doc, y, 28);
    const font = header ? FONT_BOLD : FONT_REGULAR;
    const size = header ? 8 : 9;
    doc.font(font).fontSize(size).fillColor(header ? TEXT_MUTED : TEXT_PRIMARY);
    const nameHeight = doc.heightOfString(line.name, { width: cols.nameW });
    const rowHeight = Math.max(18, nameHeight + 6);
    doc.text(line.name, cols.name, y, { width: cols.nameW });
    doc.text(line.priceFormatted || "Цена", cols.price, y, { width: cols.priceW, align: "right" });
    doc.text(header ? "Кол-во" : String(line.quantity), cols.qty, y, {
      width: cols.qtyW,
      align: "right",
    });
    doc.text(line.sumFormatted || "Сумма", cols.sum, y, { width: cols.sumW, align: "right" });
    y += rowHeight;
    if (!header) {
      doc
        .save()
        .strokeColor(BORDER_COLOR)
        .lineWidth(0.5)
        .moveTo(PAGE_MARGIN, y - 2)
        .lineTo(pageWidth(doc) - PAGE_MARGIN, y - 2)
        .stroke()
        .restore();
    }
  };

  drawRow(
    { name: "Наименование", priceFormatted: "Цена", quantity: "Кол-во", sumFormatted: "Сумма" },
    true,
  );
  y += 4;
  for (const line of payload.lines) {
    drawRow(line);
  }

  y = ensureSpace(doc, y, 36);
  y += 8;
  doc
    .font(FONT_BOLD)
    .fontSize(12)
    .fillColor(TEXT_PRIMARY)
    .text(`Итого: ${payload.totalFormatted}`, PAGE_MARGIN, y, {
      width,
      align: "right",
    });
  return doc.y + 16;
};

const drawFooter = (doc, payload, startY) => {
  let y = ensureSpace(doc, startY, 70);
  drawDivider(doc, y);
  y += 12;
  doc
    .font(FONT_REGULAR)
    .fontSize(9)
    .fillColor(TEXT_PRIMARY)
    .text(`${SITE_PHONE_DISPLAY}  ·  ${SITE_EMAIL}`, PAGE_MARGIN, y, {
      width: contentWidth(doc),
    });
  doc.fillColor(TEXT_MUTED).text(SITE_ADDRESS_SHORT, PAGE_MARGIN, doc.y + 4, {
    width: contentWidth(doc),
  });
  doc
    .font(FONT_REGULAR)
    .fontSize(8.5)
    .fillColor(TEXT_MUTED)
    .text(`Предложение действительно до ${payload.validUntilFormatted}.`, PAGE_MARGIN, doc.y + 6, {
      width: contentWidth(doc),
    });
};

const renderCartKpPdf = async (payload) => {
  const PDFDocument = getPdfDocument();
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  registerKpFonts(doc);
  let y = await drawHeader(doc, payload);
  y = await drawDoorBlock(doc, payload, y);
  y = drawInvoiceTable(doc, payload, y);
  drawFooter(doc, payload, y);
  doc.end();
  return finished;
};

const fontDataUri = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  return `data:font/otf;base64,${buffer.toString("base64")}`;
};

const imageDataUri = async (url) => {
  const resolved = await resolveImageBuffer(url);
  if (!resolved?.buffer || !resolved.kind) return null;
  const mime = resolved.kind === "png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${resolved.buffer.toString("base64")}`;
};

const renderCartKpPng = async (payload) => {
  const fonts = assertKpPdfFonts();
  const width = PNG_WIDTH;
  const pad = 48;
  const contentW = width - pad * 2;
  const leftW = Math.floor(contentW * 0.4);
  const rightW = contentW - leftW - 24;
  const imageH = 420;
  let y = pad;

  const logoUri = await imageDataUri(SITE_LOGO_PATH);
  const doorUri = await imageDataUri(payload.door.imageUrl);

  const linesSvg = payload.lines
    .map((line, index) => {
      const rowY = index * 44;
      return `
        <text x="0" y="${rowY}" font-family="Geometria" font-size="18" fill="${TEXT_PRIMARY}">${xmlEscape(line.name.slice(0, 70))}</text>
        <text x="${contentW - 280}" y="${rowY}" text-anchor="end" font-family="Geometria" font-size="18" fill="${TEXT_PRIMARY}">${xmlEscape(line.priceFormatted)}</text>
        <text x="${contentW - 170}" y="${rowY}" text-anchor="end" font-family="Geometria" font-size="18" fill="${TEXT_PRIMARY}">${line.quantity}</text>
        <text x="${contentW}" y="${rowY}" text-anchor="end" font-family="GeometriaBold" font-size="18" fill="${TEXT_PRIMARY}">${xmlEscape(line.sumFormatted)}</text>
        <line x1="0" y1="${rowY + 14}" x2="${contentW}" y2="${rowY + 14}" stroke="${BORDER_COLOR}" stroke-width="1" />
      `;
    })
    .join("");

  const tableStart = pad + 70 + imageH + 48;
  const tableHeight = 40 + payload.lines.length * 44 + 70;
  const height = tableStart + tableHeight + 120;

  const doorName = xmlEscape(payload.door.displayName.slice(0, 90));
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Geometria';
        src: url('${fontDataUri(fonts.regular)}') format('opentype');
        font-weight: 400;
      }
      @font-face {
        font-family: 'GeometriaBold';
        src: url('${fontDataUri(fonts.bold)}') format('opentype');
        font-weight: 700;
      }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${logoUri ? `<image href="${logoUri}" x="${pad}" y="${y}" width="220" height="56" preserveAspectRatio="xMinYMid meet"/>` : `<text x="${pad}" y="${y + 36}" font-family="GeometriaBold" font-size="28" fill="${BRAND_COLOR}">${xmlEscape(SITE_NAME)}</text>`}
  <text x="${width - pad}" y="${y + 18}" text-anchor="end" font-family="Geometria" font-size="18" fill="${TEXT_MUTED}">Коммерческое предложение</text>
  <text x="${width - pad}" y="${y + 44}" text-anchor="end" font-family="GeometriaBold" font-size="22" fill="${TEXT_PRIMARY}">${xmlEscape(payload.kpNumber)}</text>
  <text x="${width - pad}" y="${y + 68}" text-anchor="end" font-family="Geometria" font-size="16" fill="${TEXT_MUTED}">${xmlEscape(payload.generatedAtFormatted)}</text>
  <line x1="${pad}" y1="${y + 88}" x2="${width - pad}" y2="${y + 88}" stroke="${BRAND_COLOR}" stroke-width="3"/>

  ${
    payload.door.showImageFrame
      ? `<rect x="${pad}" y="${y + 110}" width="${leftW}" height="${imageH}" rx="16" fill="${SURFACE_MUTED}" stroke="${BORDER_COLOR}"/>`
      : ""
  }
  ${
    doorUri
      ? `<image href="${doorUri}" x="${pad + (payload.door.showImageFrame ? 18 : 0)}" y="${y + 110 + (payload.door.showImageFrame ? 18 : 0)}" width="${leftW - (payload.door.showImageFrame ? 36 : 0)}" height="${imageH - (payload.door.showImageFrame ? 36 : 0)}" preserveAspectRatio="xMidYMid meet"/>`
      : ""
  }
  <text x="${pad + leftW + 24}" y="${y + 140}" font-family="Geometria" font-size="16" fill="${TEXT_MUTED}">${xmlEscape(payload.door.categoryLabel)}</text>
  <text x="${pad + leftW + 24}" y="${y + 190}" font-family="GeometriaBold" font-size="32" fill="${TEXT_PRIMARY}">${doorName}</text>
  ${payload.door.sku ? `<text x="${pad + leftW + 24}" y="${y + 250}" font-family="Geometria" font-size="18" fill="${TEXT_MUTED}">Артикул: ${xmlEscape(payload.door.sku)}</text>` : ""}
  <text x="${pad + leftW + 24}" y="${y + 300}" font-family="Geometria" font-size="18" fill="${TEXT_MUTED}">Карточка товара</text>
  <text x="${pad + leftW + 24}" y="${y + 330}" font-family="GeometriaBold" font-size="18" fill="${BRAND_COLOR}">${xmlEscape(payload.door.productPageLinkLabel)}</text>

  <text x="${pad}" y="${tableStart}" font-family="GeometriaBold" font-size="16" fill="${TEXT_MUTED}">Наименование</text>
  <text x="${width - pad - 280}" y="${tableStart}" text-anchor="end" font-family="GeometriaBold" font-size="16" fill="${TEXT_MUTED}">Цена</text>
  <text x="${width - pad - 170}" y="${tableStart}" text-anchor="end" font-family="GeometriaBold" font-size="16" fill="${TEXT_MUTED}">Кол-во</text>
  <text x="${width - pad}" y="${tableStart}" text-anchor="end" font-family="GeometriaBold" font-size="16" fill="${TEXT_MUTED}">Сумма</text>
  <g transform="translate(${pad}, ${tableStart + 36})">
    ${linesSvg}
  </g>
  <text x="${width - pad}" y="${tableStart + 36 + payload.lines.length * 44 + 36}" text-anchor="end" font-family="GeometriaBold" font-size="28" fill="${TEXT_PRIMARY}">Итого: ${xmlEscape(payload.totalFormatted)}</text>
  <line x1="${pad}" y1="${height - 110}" x2="${width - pad}" y2="${height - 110}" stroke="${BRAND_COLOR}" stroke-width="3"/>
  <text x="${pad}" y="${height - 74}" font-family="Geometria" font-size="18" fill="${TEXT_PRIMARY}">${xmlEscape(`${SITE_PHONE_DISPLAY}  ·  ${SITE_EMAIL}`)}</text>
  <text x="${pad}" y="${height - 48}" font-family="Geometria" font-size="16" fill="${TEXT_MUTED}">${xmlEscape(SITE_ADDRESS_SHORT)}</text>
  <text x="${pad}" y="${height - 22}" font-family="Geometria" font-size="15" fill="${TEXT_MUTED}">Предложение действительно до ${xmlEscape(payload.validUntilFormatted)}.</text>
</svg>`;

  return sharp(Buffer.from(svg), { density: 96 * PNG_SCALE })
    .png()
    .toBuffer();
};

const resolveDoorProduct = async (items) => {
  const { listCartKpDoors } = require("../domain/cartCommercialProposalDocumentData");
  const doors = listCartKpDoors(items);
  if (doors.length === 0) return null;
  return catalogService.getProductById(Number(doors[0].id));
};

const generateCartKpFiles = async ({ items, format = "both" } = {}) => {
  const doorProduct = await resolveDoorProduct(items);
  const payload = buildCartKpPayload({ items, doorProduct });
  if (!payload.ok) {
    return { ok: false, status: 400, message: payload.message };
  }

  const needPdf = format === "pdf" || format === "both";
  const needPng = format === "png" || format === "both";
  const [pdfBuffer, pngBuffer] = await Promise.all([
    needPdf ? renderCartKpPdf(payload) : Promise.resolve(null),
    needPng ? renderCartKpPng(payload) : Promise.resolve(null),
  ]);

  return {
    ok: true,
    payload,
    pdf: needPdf
      ? {
          buffer: pdfBuffer,
          filename: `${payload.filenameBase}.pdf`,
          contentType: "application/pdf",
        }
      : null,
    png: needPng
      ? {
          buffer: pngBuffer,
          filename: `${payload.filenameBase}.png`,
          contentType: "image/png",
        }
      : null,
  };
};

module.exports = {
  generateCartKpFiles,
  renderCartKpPdf,
  renderCartKpPng,
};
