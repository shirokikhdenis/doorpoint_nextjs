const vkSyncRepository = require("../repositories/vkSyncRepository");
const { getVkConfig, isVkConfigured } = require("../vk/vkConfig");

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

  return {
    configured: isVkConfigured(),
    groupId: config.groupId,
    marketCategoryId: config.marketCategoryId,
    tokenHint:
      "Используйте пользовательский access token администратора группы с правами market и photos, не ключ доступа сообщества.",
    latestRun,
    runs,
    failedProducts,
    stats,
  };
};

module.exports = {
  getVkSyncStatus,
};
