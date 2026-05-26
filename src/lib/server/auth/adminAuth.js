const { createHash, createHmac, timingSafeEqual } = require("node:crypto");

const ADMIN_SESSION_COOKIE = "admin_session";
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 12;

const toBase64Url = (value) => Buffer.from(value, "utf8").toString("base64url");
const fromBase64Url = (value) => Buffer.from(value, "base64url").toString("utf8");

const hashPassword = (password) => createHash("sha256").update(password, "utf8").digest("hex");

const normalizeHash = (value) => String(value || "").trim().replace(/^sha256:/i, "");

const safeCompareHex = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

const getSessionSecret = () => String(process.env.SESSION_SECRET || "").trim();

const getSessionTtlSeconds = () => {
  const configured = Number(process.env.ADMIN_SESSION_TTL_SECONDS);
  if (Number.isFinite(configured) && configured > 0) return Math.floor(configured);
  return DEFAULT_SESSION_TTL_SECONDS;
};

const sign = (payloadPart) => {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("SESSION_SECRET is required");
  }
  return createHmac("sha256", secret).update(payloadPart).digest("base64url");
};

const verifyAdminCredentials = (login, password) => {
  const expectedLogin = String(process.env.ADMIN_LOGIN || "").trim();
  const expectedPasswordHash = normalizeHash(process.env.ADMIN_PASSWORD_HASH);
  if (!expectedLogin || !expectedPasswordHash) return false;
  if (String(login || "") !== expectedLogin) return false;
  const providedHash = hashPassword(String(password || ""));
  return safeCompareHex(providedHash, expectedPasswordHash);
};

const createAdminSessionToken = () => {
  const ttl = getSessionTtlSeconds();
  const payload = {
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + ttl,
  };
  const payloadPart = toBase64Url(JSON.stringify(payload));
  return `${payloadPart}.${sign(payloadPart)}`;
};

const verifyAdminSessionToken = (token) => {
  if (!token || typeof token !== "string") return false;
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return false;
  if (!safeCompareHex(signaturePart, sign(payloadPart))) return false;
  try {
    const payload = JSON.parse(fromBase64Url(payloadPart));
    if (!payload || payload.sub !== "admin") return false;
    if (!Number.isFinite(payload.exp)) return false;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
};

const requestHasAdminSession = (request) => {
  const token = request?.cookies?.get?.(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
};

module.exports = {
  ADMIN_SESSION_COOKIE,
  DEFAULT_SESSION_TTL_SECONDS,
  getSessionTtlSeconds,
  hashPassword,
  verifyAdminCredentials,
  createAdminSessionToken,
  verifyAdminSessionToken,
  requestHasAdminSession,
};
