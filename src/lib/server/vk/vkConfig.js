const { loadEnv } = require("../env");

const DEFAULT_API_VERSION = "5.199";
const DEFAULT_MARKET_CATEGORY_ID = 20009;
const DEFAULT_BATCH_DELAY_MS = 350;

const getVkConfig = () => {
  loadEnv();
  const accessToken = String(process.env.VK_ACCESS_TOKEN || "").trim();
  const groupId = Number(process.env.VK_GROUP_ID);
  const apiVersion = String(process.env.VK_API_VERSION || DEFAULT_API_VERSION).trim() || DEFAULT_API_VERSION;
  const marketCategoryId = Number(process.env.VK_MARKET_CATEGORY_ID) || DEFAULT_MARKET_CATEGORY_ID;
  const batchDelayMs = Number(process.env.VK_BATCH_DELAY_MS) || DEFAULT_BATCH_DELAY_MS;
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "")
    .trim()
    .replace(/\/$/, "");

  return {
    accessToken,
    groupId: Number.isInteger(groupId) && groupId > 0 ? groupId : null,
    ownerId: Number.isInteger(groupId) && groupId > 0 ? -groupId : null,
    apiVersion,
    marketCategoryId,
    batchDelayMs,
    siteUrl,
  };
};

const isVkConfigured = () => {
  const config = getVkConfig();
  return Boolean(config.accessToken && config.groupId);
};

const assertVkConfigured = () => {
  const config = getVkConfig();
  if (!config.accessToken) {
    throw new Error("VK_ACCESS_TOKEN не задан в окружении");
  }
  if (!config.groupId) {
    throw new Error("VK_GROUP_ID не задан или некорректен");
  }
  return config;
};

module.exports = {
  DEFAULT_API_VERSION,
  DEFAULT_MARKET_CATEGORY_ID,
  getVkConfig,
  isVkConfigured,
  assertVkConfigured,
};
