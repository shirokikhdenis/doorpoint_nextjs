const vkSyncRepository = require("../repositories/vkSyncRepository");
const { getVkConfig, isVkConfigured } = require("../vk/vkConfig");
const { canAutoRefresh, getVkOAuthCredentials, ensureFreshVkAccessToken } = require("../vk/vkTokenService");
const { getVkTokenDiagnostics, REQUIRED_SCOPE_HINT } = require("../vk/vkTokenDiagnostics");

const getVkSyncStatus = async (query = {}) => {
  const limit = Number(query.limit) || 20;
  const offset = Number(query.offset) || 0;
  const [latestRun, runs, failedProducts, stats] = await Promise.all([
    vkSyncRepository.getLatestSyncRun(),
    vkSyncRepository.listSyncRuns({ limit, offset }),
    vkSyncRepository.listFailedProductSyncs({ limit: 200 }),
    vkSyncRepository.getSyncStats(),
  ]);

  const config = getVkConfig();
  const credentials = getVkOAuthCredentials();

  let tokenCheck = null;
  if (isVkConfigured()) {
    try {
      await ensureFreshVkAccessToken({ force: false });
      tokenCheck = await getVkTokenDiagnostics();
    } catch (error) {
      tokenCheck = {
        ok: false,
        message: error instanceof Error ? error.message : "Не удалось проверить токен VK",
        hint: REQUIRED_SCOPE_HINT,
      };
    }
  }

  return {
    configured: isVkConfigured(),
    groupId: config.groupId,
    marketCategoryId: config.marketCategoryId,
    refreshConfigured: canAutoRefresh(credentials),
    clientId: credentials.clientId || null,
    tokenCheck,
    tokenHint:
      "Перед синхронизацией access_token обновляется по VK_REFRESH_TOKEN. При OAuth укажите scope: market photos groups offline (обмен code→token на VPS).",
    latestRun,
    runs,
    failedProducts,
    stats,
  };
};

module.exports = {
  getVkSyncStatus,
};
