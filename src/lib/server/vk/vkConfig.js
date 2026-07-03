const { loadEnv } = require("../env");
const {
  getVkOAuthCredentials,
  canAutoRefresh,
  isVkAuthConfigured,
  getActiveVkAccessToken,
} = require("./vkTokenService");

const DEFAULT_API_VERSION = "5.199";
const DEFAULT_API_BASE = "https://api.vk.ru/method";
const DEFAULT_MARKET_CATEGORY_ID = 20009;
const DEFAULT_BATCH_DELAY_MS = 350;

const getVkConfig = () => {
  loadEnv();
  const credentials = getVkOAuthCredentials();
  const accessToken = getActiveVkAccessToken() || credentials.accessToken;
  const groupId = Number(process.env.VK_GROUP_ID);
  const apiVersion = String(process.env.VK_API_VERSION || DEFAULT_API_VERSION).trim() || DEFAULT_API_VERSION;
  const apiBase = String(process.env.VK_API_BASE || DEFAULT_API_BASE).trim().replace(/\/$/, "") || DEFAULT_API_BASE;
  const marketCategoryId = Number(process.env.VK_MARKET_CATEGORY_ID) || DEFAULT_MARKET_CATEGORY_ID;
  const batchDelayMs = Number(process.env.VK_BATCH_DELAY_MS) || DEFAULT_BATCH_DELAY_MS;
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "")
    .trim()
    .replace(/\/$/, "");

  return {
    accessToken,
    refreshConfigured: canAutoRefresh(credentials),
    clientId: credentials.clientId || null,
    groupId: Number.isInteger(groupId) && groupId > 0 ? groupId : null,
    ownerId: Number.isInteger(groupId) && groupId > 0 ? -groupId : null,
    apiVersion,
    apiBase,
    marketCategoryId,
    batchDelayMs,
    siteUrl,
  };
};

const isVkConfigured = () => isVkAuthConfigured();

const assertVkConfigured = () => {
  const config = getVkConfig();
  if (!config.accessToken && !config.refreshConfigured) {
    throw new Error(
      "VK не настроен: задайте VK_ACCESS_TOKEN или VK_REFRESH_TOKEN + VK_CLIENT_ID + VK_CLIENT_SECRET",
    );
  }
  if (!config.groupId) {
    throw new Error("VK_GROUP_ID не задан или некорректен");
  }
  return config;
};

module.exports = {
  DEFAULT_API_VERSION,
  DEFAULT_API_BASE,
  DEFAULT_MARKET_CATEGORY_ID,
  getVkConfig,
  isVkConfigured,
  assertVkConfigured,
};
