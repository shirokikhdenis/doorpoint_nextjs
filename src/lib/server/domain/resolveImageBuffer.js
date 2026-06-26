const fs = require("node:fs/promises");
const path = require("node:path");

const PLACEHOLDER_IMAGES = new Set(["x", "-", "n/a", "na", "null", "undefined", "none"]);

const normalizeImageUrl = (url) => {
  const raw = String(url ?? "").trim();
  if (!raw || PLACEHOLDER_IMAGES.has(raw.toLowerCase())) return "";

  if (raw.startsWith("/")) return raw;

  try {
    const parsed = new URL(raw);
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return raw;
    }
  } catch {
    /* not a URL */
  }

  return "";
};

const resolveLocalPublicPath = (publicPath) => {
  const normalized = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return path.join(process.cwd(), "public", ...normalized.split("/"));
};

const detectImageKind = (buffer) => {
  if (!buffer || buffer.length < 4) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "png";
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return "gif";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
};

/**
 * @param {string | null | undefined} url
 * @returns {Promise<{ buffer: Buffer, kind: string } | null>}
 */
const resolveImageBuffer = async (url) => {
  const normalized = normalizeImageUrl(url);
  if (!normalized) return null;

  try {
    let buffer;
    if (normalized.startsWith("/")) {
      buffer = await fs.readFile(resolveLocalPublicPath(normalized));
    } else {
      const response = await fetch(normalized);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    const kind = detectImageKind(buffer);
    if (!kind) return null;
    return { buffer, kind };
  } catch {
    return null;
  }
};

module.exports = {
  normalizeImageUrl,
  resolveImageBuffer,
  detectImageKind,
};
