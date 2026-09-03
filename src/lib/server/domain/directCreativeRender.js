const fs = require("node:fs");
const sharp = require("sharp");
const opentype = require("opentype.js");
const { assertKpPdfFonts } = require("./kpPdfFonts");
const {
  BRAND_COLOR,
  TEXT_MUTED,
  TEXT_PRIMARY,
  SITE_NAME,
  SURFACE_MUTED,
  BORDER_COLOR,
} = require("./kpPdfCompany");
const {
  MAX_JPEG_BYTES,
  DEFAULT_SCALE,
  DEFAULT_CTA_TEXT,
  resolveScale,
  resolveLayoutScale,
  isCompactBlock,
  formatPriceFrom,
  formatPriceRub,
  MAX_COLLAGE_PHOTOS,
} = require("../../direct-creative-sizes");

const WHITE = { r: 255, g: 255, b: 255 };
const WHITE_HEX = "#ffffff";
const COMPARE_COLOR = "#52525b";
const JPEG_QUALITIES = [84, 76, 68, 60, 52, 44, 36];
const ELLIPSIS = "...";
const LOGO_ASPECT_FALLBACK = 3.02;
const PRICE_PREFIX_SCALE = 0.78;

let cachedFonts = null;

const loadFontFile = (filePath) => opentype.parse(fs.readFileSync(filePath));

const loadCreativeFonts = () => {
  if (cachedFonts) return cachedFonts;
  const paths = assertKpPdfFonts();
  cachedFonts = {
    regular: loadFontFile(paths.regular),
    bold: loadFontFile(paths.bold),
  };
  return cachedFonts;
};

const hexToRgb = (hex) => {
  const raw = String(hex || "").replace("#", "");
  if (raw.length !== 6) return { r: 244, g: 244, b: 245 };
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
};

const SURFACE_RGB = hexToRgb(SURFACE_MUTED);

const xmlEscape = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");

const measureWidth = (font, text, fontSize) => {
  if (!text) return 0;
  return font.getAdvanceWidth(String(text), fontSize);
};

const wrapText = (font, text, fontSize, maxWidth, maxLines) => {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const limit = Math.max(1, maxLines || 3);
  const words = raw.split(/\s+/);
  const lines = [];
  let current = "";
  let overflow = false;

  const fitWord = (word) => {
    if (measureWidth(font, word, fontSize) <= maxWidth) return word;
    return truncateText(font, word, fontSize, maxWidth);
  };

  for (let index = 0; index < words.length; index += 1) {
    const piece = fitWord(words[index]);
    const trial = current ? `${current} ${piece}` : piece;
    if (measureWidth(font, trial, fontSize) <= maxWidth) {
      current = trial;
      continue;
    }
    if (current) lines.push(current);
    if (lines.length >= limit) {
      overflow = true;
      current = "";
      break;
    }
    current = piece;
    if (index < words.length - 1 && lines.length + 1 >= limit) {
      overflow = true;
    }
  }
  if (current && lines.length < limit) lines.push(current);
  else if (current) overflow = true;

  if (overflow && lines.length > 0) {
    const last = lines[lines.length - 1].replace(/\.\.\.$/, "");
    const withEllipsis = `${last}${ELLIPSIS}`;
    lines[lines.length - 1] =
      measureWidth(font, withEllipsis, fontSize) <= maxWidth
        ? withEllipsis
        : truncateText(font, last, fontSize, maxWidth);
  }

  return lines.filter(Boolean);
};

const truncateText = (font, text, fontSize, maxWidth) => {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (measureWidth(font, raw, fontSize) <= maxWidth) return raw;
  let fitted = raw;
  while (fitted.length > 1 && measureWidth(font, `${fitted}${ELLIPSIS}`, fontSize) > maxWidth) {
    fitted = fitted.slice(0, -1);
  }
  return `${fitted}${ELLIPSIS}`;
};

const fitFontSize = (font, text, fontSize, maxWidth, minSize = 10) => {
  let size = fontSize;
  while (size > minSize && measureWidth(font, text, size) > maxWidth) {
    size -= 1;
  }
  return size;
};

const fitWrappedText = (font, text, fontSize, maxWidth, maxLines, minSize = 10) => {
  let size = fontSize;
  const raw = String(text || "").trim();
  if (!raw) return { lines: [], fontSize: size };
  while (size > minSize) {
    const lines = wrapText(font, text, size, maxWidth, maxLines);
    const overflow =
      lines.some((line) => line.endsWith(ELLIPSIS)) || lines.join(" ") !== raw;
    if (!overflow) return { lines, fontSize: size };
    size -= 1;
  }
  return { lines: wrapText(font, text, minSize, maxWidth, maxLines), fontSize: minSize };
};

const splitPriceLabel = (label) => {
  const raw = String(label || "").trim();
  const match = /^(от)\s+(.+)$/i.exec(raw);
  if (!match) return { prefix: "", amount: raw };
  return { prefix: match[1], amount: match[2] };
};

const formatColorCountLabel = (count) => {
  const n = Number(count) || 0;
  if (n < 2) return "";
  return `${n} цвета`;
};

const ctaMetrics = (fontSize, maxWidth) => ({
  fontSize,
  height: Math.round(fontSize * 2.1),
  padX: Math.round(fontSize * 0.95),
  maxWidth,
});

const fmt = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number(n.toFixed(2));
};

const pathForText = (font, text, x, y, fontSize) => {
  if (!text) return "";
  const path = font.getPath(String(text), x, y, fontSize);
  const parts = [];
  for (const command of path.commands) {
    if (command.type === "M" || command.type === "L") {
      const px = fmt(command.x);
      const py = fmt(command.y);
      if (px === null || py === null) continue;
      parts.push(`${command.type}${px} ${py}`);
      continue;
    }
    if (command.type === "C") {
      const x1 = fmt(command.x1);
      const y1 = fmt(command.y1);
      const x2 = fmt(command.x2);
      const y2 = fmt(command.y2);
      const px = fmt(command.x);
      const py = fmt(command.y);
      if ([x1, y1, x2, y2, px, py].some((value) => value === null)) continue;
      parts.push(`C${x1} ${y1} ${x2} ${y2} ${px} ${py}`);
      continue;
    }
    if (command.type === "Q") {
      const x1 = fmt(command.x1);
      const y1 = fmt(command.y1);
      const px = fmt(command.x);
      const py = fmt(command.y);
      if ([x1, y1, px, py].some((value) => value === null)) continue;
      parts.push(`Q${x1} ${y1} ${px} ${py}`);
      continue;
    }
    if (command.type === "Z") parts.push("Z");
  }
  return parts.join("");
};

const normalizeBrandKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]+/gi, "")
    .trim();

const shouldDrawBrandLine = (siteName) => {
  const raw = String(siteName || "").trim();
  if (!raw) return false;
  return normalizeBrandKey(raw) !== normalizeBrandKey(SITE_NAME);
};

const textRect = (left, baseline, width, fontSize) => ({
  left,
  top: baseline - fontSize * 0.88,
  width,
  height: fontSize * 1.15,
});

const buildLayout = ({ blockWidth, blockHeight, family, logoAspect = 0 } = {}) => {
  const bw = Number(blockWidth);
  const bh = Number(blockHeight);
  const layoutScale = resolveLayoutScale(bw, bh);
  const width = Math.round(bw * layoutScale);
  const height = Math.round(bh * layoutScale);
  const compact = isCompactBlock(bh);
  const hideCta = bh <= 50 || (compact && bw <= 336);
  const hideCompare = compact;
  const smallFormat = compact || Math.min(bw, bh) <= 280;
  const pad = Math.max(Math.round(layoutScale * 2), Math.round(Math.min(width, height) * 0.055));
  const logoPad = Math.round(pad * 1.25);
  const accentH = Math.max(Math.round(layoutScale), Math.round(Math.min(width, height) * 0.012));
  const aspect = Number(logoAspect) > 0 ? Number(logoAspect) : 0;
  const hideBrand = aspect > 0 && smallFormat;
  const stackGap = Math.round(Math.min(width, height) * 0.025);
  const allowCollageFor = (photoW, photoH) =>
    !compact && photoW >= 180 && photoH >= 200;

  if (family === "portrait") {
    const barH = Math.round(height * 0.34);
    const photoH = Math.max(1, height - barH);
    const nameSize = Math.round(width * 0.05);
    const priceSize = Math.round(width * 0.082);
    const compareSize = Math.round(priceSize * 0.42);
    const brandSize = Math.round(width * 0.032);
    const logoH = aspect > 0 ? Math.round(barH * 0.18) : 0;
    const logoW = aspect > 0 ? Math.round(logoH * aspect) : 0;
    const ctaFont = Math.round(width * 0.038);
    const brandTop = height - logoPad - brandSize;
    const logoTop = height - logoPad - logoH;
    const chromeBottom = Math.max(logoH, hideBrand ? 0 : brandSize) + logoPad;
    return {
      canvas: { width, height },
      family,
      compact,
      hideCompare,
      hideCta,
      allowCollage: allowCollageFor(width, photoH),
      photo: { left: 0, top: 0, width, height: photoH, inset: Math.round(pad * 0.35) },
      accent: { left: 0, top: photoH, width, height: accentH, color: BRAND_COLOR },
      content: {
        left: pad,
        top: photoH + accentH + pad,
        width: width - pad * 2,
        height: Math.max(1, height - photoH - accentH - pad - chromeBottom - pad * 0.2),
      },
      stackAlign: "center",
      stackGap,
      name: { fontSize: nameSize, maxLines: 2 },
      price: { fontSize: priceSize, compareSize },
      cta: ctaMetrics(ctaFont, Math.round((width - pad * 2) * 0.72)),
      logo: {
        left: width - logoPad - logoW,
        top: logoTop,
        width: logoW,
        height: logoH,
        align: "bottom-right",
      },
      brandBox: hideBrand
        ? null
        : {
            left: pad,
            top: brandTop,
            width: Math.max(40, width - pad * 3 - logoW),
            fontSize: brandSize,
          },
      badge: {
        fontSize: Math.round(Math.min(width, photoH) * 0.055),
        height: Math.round(Math.min(width, photoH) * 0.09),
        padX: Math.round(Math.min(width, photoH) * 0.028),
        inset: Math.round(pad * 0.7),
      },
      borderWidth: layoutScale,
    };
  }

  if (family === "wide") {
    const photoW = Math.max(1, Math.round(Math.min(width * 0.28, height * 1.05)));
    const logoH = aspect > 0 ? Math.round(height * (compact ? 0.34 : 0.22)) : 0;
    const logoW = aspect > 0 ? Math.min(Math.round(logoH * aspect), Math.round(width * (compact ? 0.16 : 0.22))) : 0;
    const nameSize = compact ? Math.round(height * 0.22) : Math.round(height * 0.14);
    const priceSize = compact ? Math.round(height * 0.24) : Math.round(height * 0.2);
    const compareSize = Math.round(priceSize * 0.45);
    const brandSize = Math.round(height * 0.07);
    const ctaFont = compact ? Math.round(height * 0.18) : Math.round(height * 0.09);
    const textLeft = pad + photoW + pad;
    const textRight = width - logoPad - (logoW > 0 ? logoW + pad : 0);
    const textW = Math.max(40, textRight - textLeft);
    const brandBox =
      hideBrand
        ? null
        : {
            left: textLeft,
            top: height - pad - brandSize,
            width: textW,
            fontSize: brandSize,
          };
    const contentTop = pad + accentH;
    const contentHeight = brandBox
      ? Math.max(1, brandBox.top - pad - contentTop)
      : height - pad * 2 - accentH;
    const photoH = height - pad * 2;
    return {
      canvas: { width, height },
      family,
      compact,
      hideCompare,
      hideCta,
      allowCollage: allowCollageFor(photoW, photoH),
      photo: {
        left: pad,
        top: pad,
        width: photoW,
        height: photoH,
        inset: Math.round(pad * 0.25),
      },
      accent: { left: 0, top: 0, width, height: accentH, color: BRAND_COLOR },
      content: {
        left: textLeft,
        top: contentTop,
        width: textW,
        height: Math.max(1, contentHeight),
      },
      stackAlign: compact ? "spread" : "center",
      stackGap,
      name: { fontSize: nameSize, maxLines: 1 },
      price: { fontSize: priceSize, compareSize },
      cta: ctaMetrics(ctaFont, compact ? Math.round(textW * 0.42) : Math.round(textW * 0.55)),
      logo: {
        left: width - logoPad - logoW,
        top: Math.round((height - logoH) / 2),
        width: logoW,
        height: logoH,
        align: "right-center",
      },
      brandBox,
      badge: {
        fontSize: Math.round(Math.min(photoW, height) * (compact ? 0.16 : 0.08)),
        height: Math.round(Math.min(photoW, height) * (compact ? 0.26 : 0.13)),
        padX: Math.round(Math.min(photoW, height) * 0.04),
        inset: Math.round(pad * 0.4),
      },
      borderWidth: layoutScale,
    };
  }

  const photoRatio = family === "landscape" ? 0.58 : 0.5;
  const photoW = Math.round(width * photoRatio);
  const panelLeft = photoW;
  const panelW = width - photoW;
  const nameSize = Math.round(Math.min(panelW, height) * (family === "landscape" ? 0.07 : 0.078));
  const priceSize = Math.round(Math.min(panelW, height) * (family === "landscape" ? 0.11 : 0.125));
  const compareSize = Math.round(priceSize * 0.42);
  const brandSize = Math.round(Math.min(panelW, height) * 0.048);
  const logoH = aspect > 0 ? Math.round(height * (smallFormat ? 0.075 : 0.085)) : 0;
  const logoW = aspect > 0 ? Math.min(Math.round(logoH * aspect), panelW - logoPad * 2) : 0;
  const ctaFont = Math.round(Math.min(panelW, height) * 0.05);
  const brandTop = height - logoPad - brandSize;
  const logoTop = hideBrand ? height - logoPad - logoH : brandTop - Math.round(pad * 0.45) - logoH;
  return {
    canvas: { width, height },
    family,
    compact,
    hideCompare,
    hideCta,
    allowCollage: allowCollageFor(photoW, height),
    photo: { left: 0, top: 0, width: photoW, height, inset: Math.round(pad * 0.3) },
    accent: { left: photoW, top: 0, width: accentH, height, color: BRAND_COLOR },
    content: {
      left: panelLeft + pad,
      top: pad,
      width: panelW - pad * 2,
      height: Math.max(1, logoTop - pad * 1.2),
    },
    stackAlign: "center",
    stackGap,
    name: { fontSize: nameSize, maxLines: 2 },
    price: { fontSize: priceSize, compareSize },
    cta: ctaMetrics(ctaFont, panelW - pad * 2),
    logo: {
      left: panelLeft + logoPad,
      top: logoTop,
      width: logoW,
      height: logoH,
      align: "bottom-left",
    },
    brandBox: hideBrand
      ? null
      : {
          left: panelLeft + pad,
          top: brandTop,
          width: panelW - pad * 2,
          fontSize: brandSize,
        },
    badge: {
      fontSize: Math.round(Math.min(photoW, height) * 0.055),
      height: Math.round(Math.min(photoW, height) * 0.09),
      padX: Math.round(Math.min(photoW, height) * 0.028),
      inset: Math.round(pad * 0.6),
    },
    borderWidth: layoutScale,
  };
};

const measureSplitPrice = (fonts, prefix, amount, amountSize) => {
  const prefixSize = Math.max(8, Math.round(amountSize * PRICE_PREFIX_SCALE));
  const prefixText = prefix ? `${prefix} ` : "";
  const prefixW = prefixText ? measureWidth(fonts.regular, prefixText, prefixSize) : 0;
  const amountW = measureWidth(fonts.bold, amount, amountSize);
  return { prefixSize, prefixText, prefixW, amountW, totalW: prefixW + amountW };
};

const fitSplitPrice = (fonts, label, fontSize, maxWidth, minSize) => {
  const { prefix, amount } = splitPriceLabel(label);
  let size = fontSize;
  const floor = Math.max(8, minSize || 10);
  while (size > floor) {
    const measured = measureSplitPrice(fonts, prefix, amount || label, size);
    if (measured.totalW <= maxWidth) {
      return { prefix, amount: amount || label, fontSize: size, ...measured };
    }
    size -= 1;
  }
  const measured = measureSplitPrice(fonts, prefix, amount || label, floor);
  return { prefix, amount: amount || label, fontSize: floor, ...measured };
};

const placeOverlayItems = (slots, fonts, {
  name,
  priceLabel,
  compareLabel,
  ctaText,
  siteName,
  discountPercent = 0,
  photoCount = 1,
  collageActive = false,
} = {}) => {
  const items = {
    nameLines: [],
    compare: null,
    price: null,
    cta: null,
    brand: null,
    badge: null,
    colorCount: null,
  };
  const rects = {
    canvas: { left: 0, top: 0, width: slots.canvas.width, height: slots.canvas.height },
    photo: {
      left: slots.photo.left,
      top: slots.photo.top,
      width: slots.photo.width,
      height: slots.photo.height,
    },
    logo:
      slots.logo.width > 0 && slots.logo.height > 0
        ? {
            left: slots.logo.left,
            top: slots.logo.top,
            width: slots.logo.width,
            height: slots.logo.height,
          }
        : null,
    name: null,
    compare: null,
    price: null,
    cta: null,
    brand: null,
    badge: null,
    colorCount: null,
  };

  const content = slots.content;
  const nameFit = fitWrappedText(
    fonts.bold,
    name,
    slots.name.fontSize,
    content.width,
    slots.name.maxLines,
    Math.max(10, Math.round(slots.name.fontSize * 0.55)),
  );
  const nameLines = nameFit.lines;
  const nameFont = nameFit.fontSize;
  const nameLineGap = Math.round(nameFont * 1.18);

  const showCompare = Boolean(compareLabel) && !slots.hideCompare;
  const compareText = showCompare
    ? truncateText(fonts.regular, compareLabel, slots.price.compareSize, content.width)
    : "";

  const priceFit = fitSplitPrice(
    fonts,
    priceLabel,
    slots.price.fontSize,
    content.width,
    Math.max(10, Math.round(slots.price.fontSize * 0.5)),
  );

  const showCta = !slots.hideCta && Boolean(String(ctaText || "").trim());
  const ctaRaw = showCta ? String(ctaText).trim() : "";
  const ctaInnerMax = Math.max(12, slots.cta.maxWidth - slots.cta.padX * 2);
  const ctaFont = showCta
    ? fitFontSize(fonts.bold, ctaRaw, slots.cta.fontSize, ctaInnerMax, Math.max(8, Math.round(slots.cta.fontSize * 0.55)))
    : slots.cta.fontSize;
  const ctaLabel = showCta ? truncateText(fonts.bold, ctaRaw, ctaFont, ctaInnerMax) : "";
  const ctaTextW = measureWidth(fonts.bold, ctaLabel, ctaFont);
  const ctaW = showCta
    ? Math.min(slots.cta.maxWidth, Math.round(ctaTextW + slots.cta.padX * 2))
    : 0;
  const ctaH = showCta ? slots.cta.height : 0;

  const gap = slots.stackGap;
  const isRow = slots.stackAlign === "horizontal" || slots.stackAlign === "spread";

  const pushPrice = (x, y, fit) => {
    if (!fit.amount) return 0;
    items.price = {
      prefix: fit.prefixText,
      prefixSize: fit.prefixSize,
      prefixX: x,
      prefixY: y,
      text: fit.amount,
      x: x + fit.prefixW,
      y,
      fontSize: fit.fontSize,
    };
    rects.price = textRect(x, y, fit.totalW, fit.fontSize);
    return fit.totalW;
  };

  if (isRow) {
    const mid = content.top + content.height / 2;
    const nameMin = Math.max(20, Math.round(content.width * (showCta ? 0.22 : 0.36)));
    const minPriceW = Math.max(28, Math.round(content.width * 0.18));
    const rowCtaW = showCta
      ? Math.min(ctaW, Math.max(24, content.width - nameMin - minPriceW))
      : 0;
    const budget = Math.max(minPriceW, content.width - nameMin - (showCta ? rowCtaW : 0));
    const rowPrice = fitSplitPrice(
      fonts,
      priceLabel,
      slots.price.fontSize,
      budget,
      Math.max(8, Math.round(slots.price.fontSize * 0.4)),
    );
    const nameW = Math.max(nameMin, content.width - rowPrice.totalW - (showCta ? rowCtaW : 0));
    const fittedName = fitWrappedText(fonts.bold, name, slots.name.fontSize, nameW, 1, 8);
    const nameLine = fittedName.lines[0] || "";
    const nameDrawnW = nameLine
      ? measureWidth(fonts.bold, nameLine, fittedName.fontSize)
      : 0;
    const pieces = [];
    if (nameLine) {
      pieces.push({ type: "name", width: nameDrawnW, line: nameLine, fontSize: fittedName.fontSize });
    }
    if (rowPrice.amount) {
      pieces.push({ type: "price", width: rowPrice.totalW, fit: rowPrice });
    }
    if (showCta && ctaLabel && rowCtaW > 0) {
      pieces.push({ type: "cta", width: rowCtaW });
    }
    const used = pieces.reduce((sum, piece) => sum + piece.width, 0);
    const leftover = content.width - used;
    const maxRight = content.left + content.width;
    const placeX = (index, piece) => {
      if (pieces.length === 1) return content.left;
      if (index === pieces.length - 1) return maxRight - piece.width;
      const inner = leftover >= 0 ? leftover / (pieces.length - 1) : 0;
      return content.left + pieces.slice(0, index).reduce((sum, item) => sum + item.width, 0) + inner * index;
    };
    pieces.forEach((piece, index) => {
      const x = placeX(index, piece);
      if (piece.type === "name") {
        const nameY = mid + piece.fontSize * 0.35;
        items.nameLines.push({
          text: piece.line,
          x,
          y: nameY,
          fontSize: piece.fontSize,
        });
        rects.name = textRect(x, nameY, piece.width, piece.fontSize);
      } else if (piece.type === "price") {
        const priceY = mid + piece.fit.fontSize * 0.35;
        pushPrice(x, priceY, piece.fit);
      } else if (piece.type === "cta") {
        const ctaY = Math.round(mid - ctaH / 2);
        const drawnCtaW = Math.min(rowCtaW, Math.round(ctaTextW + slots.cta.padX * 2));
        items.cta = {
          text: ctaLabel,
          x,
          y: ctaY,
          width: drawnCtaW,
          height: ctaH,
          fontSize: ctaFont,
          rx: Math.round(ctaH / 2),
          textX: x + Math.round((drawnCtaW - Math.min(ctaTextW, drawnCtaW - 4)) / 2),
          textY: ctaY + Math.round(ctaH * 0.68),
        };
        rects.cta = { left: x, top: ctaY, width: drawnCtaW, height: ctaH };
      }
    });
  } else {
    const nameRectH = nameLines.length
      ? (nameLines.length - 1) * nameLineGap + nameFont * 1.16
      : 0;
    const compareRectH = compareText ? slots.price.compareSize * 1.15 : 0;
    const priceRectH = priceFit.amount ? priceFit.fontSize * 1.15 : 0;
    const heights = [];
    if (nameRectH) heights.push(nameRectH);
    if (compareRectH) heights.push(compareRectH);
    if (priceRectH) heights.push(priceRectH);
    if (showCta) heights.push(ctaH);
    const fittedGap =
      heights.length > 1
        ? Math.max(
            2,
            Math.min(gap, Math.floor((content.height - heights.reduce((sum, h) => sum + h, 0)) / (heights.length - 1))),
          )
        : 0;
    const stackH = heights.reduce((sum, h) => sum + h, 0) + Math.max(0, heights.length - 1) * fittedGap;
    let cursor = content.top + Math.max(0, Math.round((content.height - stackH) / 2));

    nameLines.forEach((line, index) => {
      const y = cursor + nameFont * 0.88 + index * nameLineGap;
      items.nameLines.push({
        text: line,
        x: content.left,
        y,
        fontSize: nameFont,
      });
    });
    if (nameLines.length) {
      const lastY = cursor + nameFont * 0.88 + (nameLines.length - 1) * nameLineGap;
      rects.name = {
        left: content.left,
        top: cursor,
        width: Math.max(...nameLines.map((line) => measureWidth(fonts.bold, line, nameFont))),
        height: lastY - cursor + nameFont * 0.28,
      };
      cursor = Math.round(rects.name.top + rects.name.height + fittedGap);
    }

    if (compareText) {
      const y = cursor + slots.price.compareSize * 0.88;
      const strikeW = measureWidth(fonts.regular, compareText, slots.price.compareSize);
      items.compare = {
        text: compareText,
        x: content.left,
        y,
        fontSize: slots.price.compareSize,
        strikeY: y - slots.price.compareSize * 0.32,
        strikeW,
        strikeH: Math.max(1, Math.round(slots.price.compareSize * 0.07)),
      };
      rects.compare = textRect(content.left, y, strikeW, slots.price.compareSize);
      cursor = Math.round(rects.compare.top + rects.compare.height + fittedGap);
    }

    if (priceFit.amount) {
      const y = cursor + priceFit.fontSize * 0.88;
      pushPrice(content.left, y, priceFit);
      cursor = Math.round(rects.price.top + rects.price.height + fittedGap);
    }

    if (showCta && ctaLabel) {
      items.cta = {
        text: ctaLabel,
        x: content.left,
        y: cursor,
        width: ctaW,
        height: ctaH,
        fontSize: ctaFont,
        rx: Math.round(ctaH / 2),
        textX: content.left + slots.cta.padX,
        textY: cursor + Math.round(ctaH * 0.68),
      };
      rects.cta = { left: content.left, top: cursor, width: ctaW, height: ctaH };
    }
  }

  if (slots.brandBox && shouldDrawBrandLine(siteName)) {
    const brand = truncateText(
      fonts.regular,
      siteName,
      slots.brandBox.fontSize,
      slots.brandBox.width,
    );
    if (brand) {
      const y = slots.brandBox.top + slots.brandBox.fontSize * 0.88;
      items.brand = {
        text: brand,
        x: slots.brandBox.left,
        y,
        fontSize: slots.brandBox.fontSize,
      };
      rects.brand = textRect(
        slots.brandBox.left,
        y,
        measureWidth(fonts.regular, brand, slots.brandBox.fontSize),
        slots.brandBox.fontSize,
      );
      const conflicts = ["name", "compare", "price", "cta", "logo"].some((key) =>
        rectsOverlap(rects.brand, rects[key]),
      );
      if (conflicts) {
        items.brand = null;
        rects.brand = null;
      }
    }
  }

  const placeBadge = (label, side) => {
    if (!slots.badge || !label) return null;
    const fontSize = slots.badge.fontSize;
    const tw = measureWidth(fonts.bold, label, fontSize);
    const bw = Math.round(tw + slots.badge.padX * 2);
    const bh = slots.badge.height;
    const left =
      side === "left"
        ? slots.photo.left + slots.badge.inset
        : slots.photo.left + slots.photo.width - slots.badge.inset - bw;
    const top = slots.photo.top + slots.badge.inset;
    return {
      item: {
        text: label,
        x: left,
        y: top,
        width: bw,
        height: bh,
        fontSize,
        rx: Math.round(bh * 0.22),
        textX: left + Math.round((bw - tw) / 2),
        textY: top + Math.round(bh * 0.7),
      },
      rect: { left, top, width: bw, height: bh },
    };
  };

  if (discountPercent > 0) {
    const placed = placeBadge(`-${discountPercent}%`, "right");
    if (placed) {
      items.badge = placed.item;
      rects.badge = placed.rect;
    }
  }

  if (photoCount > 1 && !collageActive) {
    const placed = placeBadge(formatColorCountLabel(photoCount), "left");
    if (placed) {
      items.colorCount = placed.item;
      rects.colorCount = placed.rect;
    }
  }

  return { items, rects };
};

const rectsOverlap = (a, b) => {
  if (!a || !b) return false;
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
};

const rectInside = (inner, outer, inset = 0) => {
  if (!inner || !outer) return true;
  return (
    inner.left >= outer.left - inset &&
    inner.top >= outer.top - inset &&
    inner.left + inner.width <= outer.left + outer.width + inset &&
    inner.top + inner.height <= outer.top + outer.height + inset
  );
};

const buildOverlaySvg = (slots, placed) => {
  const fonts = loadCreativeFonts();
  const { items } = placed;
  const parts = [];
  const { width, height } = slots.canvas;

  if (slots.accent) {
    parts.push(
      `<rect x="${slots.accent.left}" y="${slots.accent.top}" width="${slots.accent.width}" height="${slots.accent.height}" fill="${xmlEscape(slots.accent.color)}"/>`,
    );
  }

  for (const line of items.nameLines) {
    const d = pathForText(fonts.bold, line.text, line.x, line.y, line.fontSize);
    if (d) parts.push(`<path d="${d}" fill="${xmlEscape(TEXT_PRIMARY)}"/>`);
  }

  if (items.compare) {
    const d = pathForText(
      fonts.regular,
      items.compare.text,
      items.compare.x,
      items.compare.y,
      items.compare.fontSize,
    );
    if (d) parts.push(`<path d="${d}" fill="${xmlEscape(COMPARE_COLOR)}"/>`);
    parts.push(
      `<rect x="${items.compare.x}" y="${items.compare.strikeY}" width="${items.compare.strikeW}" height="${items.compare.strikeH}" fill="${xmlEscape(COMPARE_COLOR)}"/>`,
    );
  }

  if (items.price) {
    if (items.price.prefix) {
      const prefixPath = pathForText(
        fonts.regular,
        items.price.prefix,
        items.price.prefixX,
        items.price.prefixY,
        items.price.prefixSize,
      );
      if (prefixPath) parts.push(`<path d="${prefixPath}" fill="${xmlEscape(BRAND_COLOR)}"/>`);
    }
    const d = pathForText(
      fonts.bold,
      items.price.text,
      items.price.x,
      items.price.y,
      items.price.fontSize,
    );
    if (d) parts.push(`<path d="${d}" fill="${xmlEscape(BRAND_COLOR)}"/>`);
  }

  if (items.cta) {
    parts.push(
      `<rect x="${items.cta.x}" y="${items.cta.y}" width="${items.cta.width}" height="${items.cta.height}" rx="${items.cta.rx}" fill="${xmlEscape(BRAND_COLOR)}"/>`,
    );
    const d = pathForText(
      fonts.bold,
      items.cta.text,
      items.cta.textX,
      items.cta.textY,
      items.cta.fontSize,
    );
    if (d) parts.push(`<path d="${d}" fill="${xmlEscape(WHITE_HEX)}"/>`);
  }

  if (items.brand) {
    const d = pathForText(
      fonts.regular,
      items.brand.text,
      items.brand.x,
      items.brand.y,
      items.brand.fontSize,
    );
    if (d) parts.push(`<path d="${d}" fill="${xmlEscape(TEXT_MUTED)}"/>`);
  }

  if (items.badge) {
    parts.push(
      `<rect x="${items.badge.x}" y="${items.badge.y}" width="${items.badge.width}" height="${items.badge.height}" rx="${items.badge.rx}" fill="${xmlEscape(BRAND_COLOR)}"/>`,
    );
    const d = pathForText(
      fonts.bold,
      items.badge.text,
      items.badge.textX,
      items.badge.textY,
      items.badge.fontSize,
    );
    if (d) parts.push(`<path d="${d}" fill="${xmlEscape(WHITE_HEX)}"/>`);
  }

  if (items.colorCount) {
    parts.push(
      `<rect x="${items.colorCount.x}" y="${items.colorCount.y}" width="${items.colorCount.width}" height="${items.colorCount.height}" rx="${items.colorCount.rx}" fill="${xmlEscape(BRAND_COLOR)}"/>`,
    );
    const d = pathForText(
      fonts.bold,
      items.colorCount.text,
      items.colorCount.textX,
      items.colorCount.textY,
      items.colorCount.fontSize,
    );
    if (d) parts.push(`<path d="${d}" fill="${xmlEscape(WHITE_HEX)}"/>`);
  }

  const sw = slots.borderWidth;
  parts.push(
    `<rect x="${sw / 2}" y="${sw / 2}" width="${width - sw}" height="${height - sw}" fill="none" stroke="${xmlEscape(BORDER_COLOR)}" stroke-width="${sw}"/>`,
  );

  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`,
  );
};

const resolveCollageCells = (width, height, count, captionH = 0) => {
  const n = Math.max(1, Math.min(MAX_COLLAGE_PHOTOS, Number(count) || 1));
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  if (n === 1) {
    return [{ left: 0, top: 0, width: w, height: h }];
  }
  const gap = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  const cap = Math.max(0, Math.round(Number(captionH) || 0));
  const photoH = Math.max(1, h - cap);
  const cellW = Math.max(1, Math.floor((w - gap * (n + 1)) / n));
  const cells = [];
  for (let i = 0; i < n; i += 1) {
    cells.push({
      left: gap + i * (cellW + gap),
      top: 0,
      width: cellW,
      height: photoH,
    });
  }
  return cells;
};

const prepareContainInBox = async (buffer, box, inset = 0) => {
  const pad = Math.max(0, inset);
  const innerW = Math.max(1, box.width - pad * 2);
  const innerH = Math.max(1, box.height - pad * 2);
  const resized = await sharp(buffer)
    .rotate()
    .resize(innerW, innerH, { fit: "contain", background: { ...SURFACE_RGB, alpha: 1 } })
    .png()
    .toBuffer({ resolveWithObject: true });
  return {
    input: resized.data,
    left: box.left + pad + Math.round((innerW - resized.info.width) / 2),
    top: box.top + pad + Math.round((innerH - resized.info.height) / 2),
  };
};

const prepareContainLayer = async (buffer, slot) => {
  const inset = Math.max(0, slot.inset || 0);
  const layer = await sharp({
    create: {
      width: slot.width,
      height: slot.height,
      channels: 4,
      background: { ...SURFACE_RGB, alpha: 1 },
    },
  })
    .composite([await prepareContainInBox(buffer, { left: 0, top: 0, width: slot.width, height: slot.height }, inset)])
    .png()
    .toBuffer();
  return { input: layer, left: slot.left, top: slot.top };
};

const prepareCollageLayer = async (buffers, slot, labels = []) => {
  const n = Math.max(1, Math.min(MAX_COLLAGE_PHOTOS, buffers.length));
  const hasLabels = labels.some((label) => String(label || "").trim());
  const estFont = hasLabels
    ? Math.max(7, Math.min(13, Math.round(slot.width / (n * 5.5))))
    : 0;
  const captionH = hasLabels ? Math.round(estFont * 2.55) : 0;
  const cells = resolveCollageCells(slot.width, slot.height, buffers.length, captionH);
  const cellInset = Math.max(1, Math.round(Math.min(slot.width, slot.height) * 0.012));
  const composites = [];
  for (let index = 0; index < buffers.length; index += 1) {
    const cell = cells[index];
    if (!cell || !buffers[index]) continue;
    composites.push(await prepareContainInBox(buffers[index], cell, cellInset));
  }

  const fonts = loadCreativeFonts();
  const labelParts = [];
  cells.forEach((cell, index) => {
    const raw = String(labels[index] || "").trim();
    if (!raw || captionH < 12) return;
    const fontSize = Math.max(7, Math.min(estFont, Math.round(cell.width * 0.22)));
    const lines = wrapText(fonts.regular, raw, fontSize, Math.max(8, cell.width - 4), 2);
    if (!lines.length) return;
    const lineGap = Math.round(fontSize * 1.15);
    lines.forEach((line, lineIndex) => {
      const textW = measureWidth(fonts.regular, line, fontSize);
      const d = pathForText(
        fonts.regular,
        line,
        cell.left + Math.round((cell.width - textW) / 2),
        cell.top + cell.height + Math.round(fontSize * 0.95) + lineIndex * lineGap,
        fontSize,
      );
      if (d) labelParts.push(`<path d="${d}" fill="${xmlEscape(TEXT_PRIMARY)}"/>`);
    });
  });
  if (labelParts.length > 0) {
    composites.push({
      input: Buffer.from(
        `<svg width="${slot.width}" height="${slot.height}" viewBox="0 0 ${slot.width} ${slot.height}" xmlns="http://www.w3.org/2000/svg">${labelParts.join("")}</svg>`,
      ),
      left: 0,
      top: 0,
    });
  }

  const layer = await sharp({
    create: {
      width: slot.width,
      height: slot.height,
      channels: 4,
      background: { ...SURFACE_RGB, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
  return { input: layer, left: slot.left, top: slot.top, cells };
};

const prepareLogoLayer = async (buffer, slot) => {
  if (!slot.width || !slot.height) return null;
  const resized = await sharp(buffer)
    .rotate()
    .resize(slot.width, slot.height, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer({ resolveWithObject: true });
  const metaW = resized.info.width || slot.width;
  const metaH = resized.info.height || slot.height;
  let left = slot.left;
  let top = slot.top;
  if (slot.align === "bottom-right") {
    left = slot.left + slot.width - metaW;
    top = slot.top + slot.height - metaH;
  } else if (slot.align === "right-center") {
    left = slot.left + slot.width - metaW;
    top = slot.top + Math.round((slot.height - metaH) / 2);
  } else if (slot.align === "bottom-left") {
    top = slot.top + slot.height - metaH;
  }
  return { input: resized.data, left, top };
};

const readLogoAspect = async (logoBuffer) => {
  if (!logoBuffer) return 0;
  try {
    const meta = await sharp(logoBuffer).metadata();
    if (meta.width && meta.height) return meta.width / meta.height;
  } catch {
    /* ignore */
  }
  return LOGO_ASPECT_FALLBACK;
};

const encodeJpegUnderLimit = async (composedBuffer, maxBytes = MAX_JPEG_BYTES) => {
  let last = null;
  for (const quality of JPEG_QUALITIES) {
    last = await sharp(composedBuffer)
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:2:0" })
      .toBuffer();
    if (last.length <= maxBytes) return last;
  }
  return last;
};

const discountPercentFor = ({ price, compareAtPrice, isOnSale, showDiscountBadge }) => {
  if (showDiscountBadge === false) return 0;
  const current = Number(price);
  const compare = Number(compareAtPrice);
  if (isOnSale !== true || !Number.isFinite(current) || !Number.isFinite(compare)) return 0;
  if (compare <= current) return 0;
  return Math.min(99, Math.max(1, Math.round((1 - current / compare) * 100)));
};

const renderDirectCreative = async ({
  blockWidth,
  blockHeight,
  scale = DEFAULT_SCALE,
  family,
  photoBuffer,
  photoBuffers = null,
  photoLabels = [],
  logoBuffer = null,
  name,
  price,
  priceLabel = null,
  compareAtPrice = null,
  compareLabel = undefined,
  isOnSale = false,
  siteName = "",
  ctaText = DEFAULT_CTA_TEXT,
  showDiscountBadge = true,
} = {}) => {
  const bw = Number(blockWidth);
  const bh = Number(blockHeight);
  if (!Number.isInteger(bw) || !Number.isInteger(bh) || bw < 1 || bh < 1) {
    throw new Error("Некорректный размер креатива");
  }
  const photos = (Array.isArray(photoBuffers) ? photoBuffers : [])
    .filter(Boolean)
    .slice(0, MAX_COLLAGE_PHOTOS);
  if (photos.length === 0 && photoBuffer) photos.push(photoBuffer);
  if (photos.length === 0) {
    throw new Error("Нет фото двери для креатива");
  }
  const sc = resolveScale(scale) ?? DEFAULT_SCALE;
  const logoAspect = await readLogoAspect(logoBuffer);
  const slots = buildLayout({
    blockWidth: bw,
    blockHeight: bh,
    family,
    logoAspect,
  });

  const saleActive =
    isOnSale === true &&
    compareAtPrice != null &&
    Number.isFinite(Number(compareAtPrice)) &&
    Number(compareAtPrice) > Number(price);
  const resolvedPriceLabel = String(priceLabel ?? "").trim() || formatPriceFrom(price);
  const resolvedCompareLabel =
    compareLabel === undefined || compareLabel === null
      ? saleActive
        ? formatPriceRub(compareAtPrice)
        : ""
      : String(compareLabel).trim();
  const discountPercent = discountPercentFor({
    price,
    compareAtPrice,
    isOnSale,
    showDiscountBadge,
  });

  const fonts = loadCreativeFonts();
  const useCollage = photos.length > 1 && slots.allowCollage;
  const placed = placeOverlayItems(slots, fonts, {
    name,
    priceLabel: resolvedPriceLabel,
    compareLabel: resolvedCompareLabel,
    ctaText,
    siteName,
    discountPercent,
    photoCount: photos.length,
    collageActive: useCollage,
  });
  const overlay = buildOverlaySvg(slots, placed);

  const composites = [];
  const photoLayer = useCollage
    ? await prepareCollageLayer(photos, slots.photo, photoLabels)
    : await prepareContainLayer(photos[0], slots.photo);
  composites.push({ input: photoLayer.input, left: photoLayer.left, top: photoLayer.top });

  if (logoBuffer) {
    try {
      const logoLayer = await prepareLogoLayer(logoBuffer, slots.logo);
      if (logoLayer) composites.push(logoLayer);
    } catch {
      /* логотип опционален */
    }
  }

  composites.push({ input: overlay, left: 0, top: 0 });

  const design = slots.canvas;
  let composed = await sharp({
    create: {
      width: design.width,
      height: design.height,
      channels: 3,
      background: WHITE,
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  const outW = bw * sc;
  const outH = bh * sc;
  if (outW !== design.width || outH !== design.height) {
    composed = await sharp(composed)
      .resize(outW, outH, { fit: "fill" })
      .png()
      .toBuffer();
  }

  const jpeg = await encodeJpegUnderLimit(composed);
  let sourceWidth = 0;
  try {
    const widths = [];
    for (const buffer of photos) {
      const meta = await sharp(buffer).metadata();
      if (meta.width) widths.push(Number(meta.width));
    }
    sourceWidth = widths.length ? Math.min(...widths) : 0;
  } catch {
    sourceWidth = 0;
  }
  const cellWidth =
    Array.isArray(photoLayer.cells) && photoLayer.cells[0]
      ? photoLayer.cells[0].width
      : slots.photo.width;
  const outputPhotoWidth = Math.round(cellWidth * (outW / design.width));

  return {
    buffer: jpeg,
    width: outW,
    height: outH,
    bytes: jpeg.length,
    sourceWidth,
    outputPhotoWidth,
    slots,
    rects: placed.rects,
  };
};

module.exports = {
  loadCreativeFonts,
  wrapText,
  truncateText,
  pathForText,
  buildLayout,
  placeOverlayItems,
  rectsOverlap,
  rectInside,
  encodeJpegUnderLimit,
  resolveCollageCells,
  renderDirectCreative,
};
