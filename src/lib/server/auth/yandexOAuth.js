const { randomBytes } = require("node:crypto");
const { loadEnv } = require("../env");
const { resolveRequestOrigin } = require("../http/requestOrigin");

const YANDEX_AUTHORIZE_URL = "https://oauth.yandex.ru/authorize";
const YANDEX_TOKEN_URL = "https://oauth.yandex.ru/token";
const YANDEX_USERINFO_URL = "https://login.yandex.ru/info?format=json";

const OAUTH_STATE_COOKIE = "admin_oauth_state";
const OAUTH_NEXT_COOKIE = "admin_oauth_next";
const OAUTH_COOKIE_MAX_AGE_SECONDS = 60 * 10;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const getYandexOAuthConfig = () => {
  loadEnv();
  return {
    clientId: String(process.env.YANDEX_OAUTH_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.YANDEX_OAUTH_CLIENT_SECRET || "").trim(),
    adminEmail: normalizeEmail(process.env.ADMIN_EMAIL),
  };
};

const isYandexOAuthConfigured = () => {
  const { clientId, clientSecret, adminEmail } = getYandexOAuthConfig();
  return Boolean(clientId && clientSecret && adminEmail);
};

const isAllowedAdminEmail = (email) => {
  const { adminEmail } = getYandexOAuthConfig();
  if (!adminEmail) return false;
  return normalizeEmail(email) === adminEmail;
};

const resolveOAuthBaseUrl = resolveRequestOrigin;

const buildCallbackUrl = (request) =>
  `${resolveOAuthBaseUrl(request)}/api/admin/oauth/yandex/callback`;

const buildAuthorizeUrl = ({ redirectUri, state }) => {
  const { clientId } = getYandexOAuthConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `${YANDEX_AUTHORIZE_URL}?${params.toString()}`;
};

const exchangeAuthorizationCode = async (code, redirectUri) => {
  const { clientId, clientSecret } = getYandexOAuthConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: String(code || ""),
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: String(redirectUri || ""),
  });

  const response = await fetch(YANDEX_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error_description || payload.error || `HTTP ${response.status}`;
    throw new Error(message);
  }
  if (!payload.access_token) {
    throw new Error("Yandex OAuth: access_token missing");
  }
  return String(payload.access_token);
};

const fetchYandexUserInfo = async (accessToken) => {
  const response = await fetch(YANDEX_USERINFO_URL, {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Yandex userinfo HTTP ${response.status}`);
  }
  return payload;
};

const readYandexUserEmail = (userInfo) => {
  const direct = normalizeEmail(userInfo?.default_email);
  if (direct) return direct;
  const emails = Array.isArray(userInfo?.emails) ? userInfo.emails : [];
  for (const entry of emails) {
    const normalized = normalizeEmail(entry);
    if (normalized) return normalized;
  }
  return "";
};

const createOAuthState = () => randomBytes(32).toString("base64url");

const sanitizeAdminNextPath = (value) => {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/admin";
  return raw;
};

module.exports = {
  OAUTH_STATE_COOKIE,
  OAUTH_NEXT_COOKIE,
  OAUTH_COOKIE_MAX_AGE_SECONDS,
  isYandexOAuthConfigured,
  isAllowedAdminEmail,
  resolveOAuthBaseUrl,
  buildCallbackUrl,
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  fetchYandexUserInfo,
  readYandexUserEmail,
  createOAuthState,
  sanitizeAdminNextPath,
};
