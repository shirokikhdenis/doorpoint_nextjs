const { assertVkConfigured } = require("./vkConfig");
const { getActiveVkAccessToken } = require("./vkTokenService");
const { callVkMethod } = require("./vkApiClient");

const VK_SCOPE_BITS = {
  photos: 1 << 2,
  groups: 1 << 18,
  offline: 1 << 16,
  market: 1 << 27,
};

const REQUIRED_SCOPES = ["market", "photos", "groups"];

const REQUIRED_SCOPE_HINT =
  "При OAuth укажите scope: market photos groups offline. Право market часто выдаётся только после запроса в devsupport@corp.vk.com для приложения VK ID.";

const decodePermissions = (mask) => {
  const value = Number(mask) || 0;
  return Object.entries(VK_SCOPE_BITS)
    .filter(([, bit]) => (value & bit) === bit)
    .map(([name]) => name);
};

const detectTokenKind = (token) => {
  if (token.startsWith("vk2.")) return "vk2";
  if (token.startsWith("vk1.")) return "vk1";
  return "unknown";
};

const getVkTokenDiagnostics = async () => {
  const token = getActiveVkAccessToken();
  if (!token) {
    return {
      ok: false,
      tokenKind: null,
      permissions: [],
      missingScopes: REQUIRED_SCOPES,
      marketUploadOk: false,
      message: "Access token отсутствует",
      hint: REQUIRED_SCOPE_HINT,
    };
  }

  const tokenKind = detectTokenKind(token);
  let permissions = [];
  let permissionsError = null;

  try {
    permissions = decodePermissions(await callVkMethod("account.getAppPermissions"));
  } catch (error) {
    permissionsError = error instanceof Error ? error.message : "Не удалось получить права токена";
  }

  const missingScopes = REQUIRED_SCOPES.filter((scope) => !permissions.includes(scope));

  let marketUploadOk = false;
  let marketUploadError = null;
  try {
    const config = assertVkConfigured();
    await callVkMethod("photos.getMarketUploadServer", {
      group_id: config.groupId,
      main_photo: 1,
    });
    marketUploadOk = true;
  } catch (error) {
    marketUploadError = error instanceof Error ? error.message : "photos.getMarketUploadServer недоступен";
  }

  const ok = missingScopes.length === 0 && marketUploadOk;
  let message = ok ? "Токен готов к выгрузке в Market" : "Токен не готов к выгрузке в Market";
  if (permissionsError && /unknown method/i.test(permissionsError)) {
    message =
      "Токен VK ID без доступа к VK API (нужен scope market photos groups offline при авторизации)";
  } else if (missingScopes.length > 0) {
    message = `Не хватает прав: ${missingScopes.join(", ")}`;
  } else if (marketUploadError) {
    message = marketUploadError;
  }

  return {
    ok,
    tokenKind,
    permissions,
    missingScopes,
    permissionsError,
    marketUploadOk,
    marketUploadError,
    message,
    hint: REQUIRED_SCOPE_HINT,
  };
};

module.exports = {
  REQUIRED_SCOPES,
  REQUIRED_SCOPE_HINT,
  decodePermissions,
  getVkTokenDiagnostics,
};
