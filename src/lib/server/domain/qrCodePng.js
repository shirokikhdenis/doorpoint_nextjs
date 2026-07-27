const QRCode = require("qrcode");

const DEFAULT_OPTIONS = {
  type: "png",
  errorCorrectionLevel: "M",
  margin: 1,
  width: 256,
};

const cache = new Map();

const generateQrCodePng = async (text, options = {}) => {
  const value = String(text || "").trim();
  if (!value) {
    throw new Error("qrCodePng: text is required");
  }

  const cacheKey = JSON.stringify({ value, options });
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const buffer = await QRCode.toBuffer(value, { ...DEFAULT_OPTIONS, ...options });
  cache.set(cacheKey, buffer);
  return buffer;
};

const clearQrCodePngCache = () => {
  cache.clear();
};

module.exports = {
  generateQrCodePng,
  clearQrCodePngCache,
};
