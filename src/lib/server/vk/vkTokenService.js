const { loadEnv } = require("../env");

const TOKEN_ENDPOINTS = ["https://id.vk.ru/oauth2/auth", "https://id.vk.com/oauth2/auth"];
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/** In-process cache: refreshed tokens are not written back to .env. */
const session = {
  accessToken: null,
  refreshToken: null,
  deviceId: null,
  expiresAtMs: 0,
};

const getVkOAuthCredentials = () => {
  loadEnv();
  return {
    accessToken: String(process.env.VK_ACCESS_TOKEN || "").trim(),
    refreshToken: String(process.env.VK_REFRESH_TOKEN || "").trim(),
    deviceId: String(process.env.VK_DEVICE_ID || "").trim(),
    clientId: String(process.env.VK_CLIENT_ID || process.env.VK_APP_ID || "").trim(),
    clientSecret: String(process.env.VK_CLIENT_SECRET || "").trim(),
  };
};

const canAutoRefresh = (credentials = getVkOAuthCredentials()) =>
  Boolean(
    credentials.refreshToken &&
      credentials.clientId &&
      credentials.clientSecret &&
      credentials.deviceId,
  );

const isVkAuthConfigured = (credentials = getVkOAuthCredentials()) => {
  const groupId = Number(process.env.VK_GROUP_ID);
  const hasGroup = Number.isInteger(groupId) && groupId > 0;
  const hasToken = Boolean(credentials.accessToken) || canAutoRefresh(credentials);
  return hasGroup && hasToken;
};

const parseRefreshResponse = async (response, endpoint) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    const description = payload.error_description || payload.error || `HTTP ${response.status}`;
    throw new Error(`Не удалось обновить VK access_token (${endpoint}): ${description}`);
  }
  const accessToken = String(payload.access_token || "").trim();
  if (!accessToken) {
    throw new Error("VK не вернул access_token при обновлении");
  }
  return {
    accessToken,
    refreshToken: String(payload.refresh_token || "").trim() || null,
    expiresInSec: Number(payload.expires_in) || 3600,
  };
};

const requestTokenRefresh = async (refreshToken, credentials) => {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: refreshToken,
    device_id: credentials.deviceId,
  });

  let lastError = null;
  for (const endpoint of TOKEN_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
      return await parseRefreshResponse(response, endpoint);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Не удалось обновить VK access_token");
};

const applyRefreshedToken = ({ accessToken, refreshToken, deviceId, expiresInSec }) => {
  session.accessToken = accessToken;
  if (refreshToken) session.refreshToken = refreshToken;
  if (deviceId) session.deviceId = deviceId;
  session.expiresAtMs = Date.now() + Math.max(60, expiresInSec) * 1000;
  return accessToken;
};

/**
 * Обновляет access_token перед синхронизацией (если настроен refresh flow).
 * При force=true всегда запрашивает новый токен — это снимает привязку к «чужому» IP.
 */
const ensureFreshVkAccessToken = async ({ force = false } = {}) => {
  const credentials = getVkOAuthCredentials();
  const now = Date.now();

  if (
    !force &&
    session.accessToken &&
    session.expiresAtMs > now + EXPIRY_BUFFER_MS
  ) {
    return session.accessToken;
  }

  if (canAutoRefresh(credentials)) {
    const refreshToken = session.refreshToken || credentials.refreshToken;
    const refreshed = await requestTokenRefresh(refreshToken, credentials);
    return applyRefreshedToken(refreshed);
  }

  if (credentials.accessToken) {
    session.accessToken = credentials.accessToken;
    session.expiresAtMs = now + EXPIRY_BUFFER_MS;
    return credentials.accessToken;
  }

  throw new Error(
    "VK не настроен для API: задайте VK_ACCESS_TOKEN или пару VK_REFRESH_TOKEN + VK_CLIENT_ID + VK_CLIENT_SECRET",
  );
};

const getActiveVkAccessToken = () => {
  const credentials = getVkOAuthCredentials();
  return session.accessToken || credentials.accessToken || "";
};

const resetVkTokenSession = () => {
  session.accessToken = null;
  session.refreshToken = null;
  session.deviceId = null;
  session.expiresAtMs = 0;
};

module.exports = {
  getVkOAuthCredentials,
  canAutoRefresh,
  isVkAuthConfigured,
  ensureFreshVkAccessToken,
  getActiveVkAccessToken,
  resetVkTokenSession,
  applyRefreshedToken,
  requestTokenRefresh,
};
