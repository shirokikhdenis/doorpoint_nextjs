const { assertVkConfigured } = require("./vkConfig");
const { ensureFreshVkAccessToken, getActiveVkAccessToken } = require("./vkTokenService");

const RETRYABLE_ERROR_CODES = new Set([6, 9, 10]);
const GROUP_AUTH_ERROR_CODE = 27;
const AUTH_FAILED_ERROR_CODE = 5;
const UNKNOWN_METHOD_ERROR_CODE = 3;
const MAX_RETRIES = 4;

const GROUP_AUTH_HINT =
  "Нужен пользовательский access token администратора группы с правами market и photos (Standalone-приложение VK), а не ключ доступа сообщества.";

const UNKNOWN_METHOD_HINT =
  "Токен не имеет доступа к VK API Market. Получите новый токен с scope: market photos groups offline (обмен code→token на VPS). Право market может потребовать согласования в devsupport@corp.vk.com.";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildVkError = (payload, method) => {
  const error = payload?.error || {};
  let message = error.error_msg || "VK API error";
  const code = Number(error.error_code) || 0;
  if (code === GROUP_AUTH_ERROR_CODE && /group auth/i.test(message)) {
    message = `${message}. ${GROUP_AUTH_HINT}`;
  }
  if (code === UNKNOWN_METHOD_ERROR_CODE) {
    message = `${message}. ${UNKNOWN_METHOD_HINT}`;
  }
  const err = new Error(method ? `${method}: ${message}` : message);
  err.vkErrorCode = code;
  err.vkError = error;
  err.vkMethod = method;
  return err;
};

const isAuthTokenError = (err) => {
  if (!err || err.vkErrorCode !== AUTH_FAILED_ERROR_CODE) return false;
  const message = String(err.message || "").toLowerCase();
  return (
    message.includes("access_token") ||
    message.includes("ip address") ||
    message.includes("invalid access_token")
  );
};

const callVkMethod = async (method, params = {}, attempt = 0, authRetried = false) => {
  const config = assertVkConfigured();
  const accessToken = getActiveVkAccessToken() || config.accessToken;
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    body.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  });
  body.set("access_token", accessToken);
  body.set("v", config.apiVersion);

  const response = await fetch(`${config.apiBase}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`${method}: VK HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    const err = buildVkError(payload, method);
    if (!authRetried && isAuthTokenError(err)) {
      await ensureFreshVkAccessToken({ force: true });
      return callVkMethod(method, params, attempt, true);
    }
    if (RETRYABLE_ERROR_CODES.has(err.vkErrorCode) && attempt < MAX_RETRIES) {
      const backoff = 400 * 2 ** attempt;
      await sleep(backoff);
      return callVkMethod(method, params, attempt + 1, authRetried);
    }
    throw err;
  }

  return payload.response;
};

const truncate = (value, max) => {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
};

const uploadMarketPhoto = async (imageUrl) => {
  const config = assertVkConfigured();
  const uploadServer = await callVkMethod("photos.getMarketUploadServer", {
    group_id: config.groupId,
    main_photo: 1,
  });

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Не удалось скачать фото: HTTP ${imageResponse.status}`);
  }

  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
  const extension = contentType.includes("png") ? "png" : "jpg";
  const buffer = Buffer.from(await imageResponse.arrayBuffer());

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: contentType }), `product.${extension}`);

  const uploadResponse = await fetch(uploadServer.upload_url, {
    method: "POST",
    body: form,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Ошибка загрузки фото в VK: HTTP ${uploadResponse.status}`);
  }

  const uploadPayload = await uploadResponse.json();
  if (!uploadPayload?.photo || !uploadPayload?.hash) {
    throw new Error("VK не вернул photo/hash после загрузки");
  }

  const saveParams = {
    group_id: config.groupId,
    photo: uploadPayload.photo,
    hash: uploadPayload.hash,
  };
  if (uploadPayload.server != null) saveParams.server = uploadPayload.server;
  if (uploadPayload.crop_data) saveParams.crop_data = uploadPayload.crop_data;
  if (uploadPayload.crop_hash) saveParams.crop_hash = uploadPayload.crop_hash;

  const saved = await callVkMethod("photos.saveMarketPhoto", saveParams);

  const photo = Array.isArray(saved) ? saved[0] : saved;
  if (!photo?.id) {
    throw new Error("VK не вернул id сохранённого фото");
  }
  return Number(photo.id);
};

const listAlbums = async () => {
  const config = assertVkConfigured();
  const response = await callVkMethod("market.getAlbums", {
    owner_id: config.ownerId,
    count: 100,
  });
  return Array.isArray(response?.items) ? response.items : [];
};

const createAlbum = async (title) => {
  const config = assertVkConfigured();
  const albumId = await callVkMethod("market.addAlbum", {
    owner_id: config.ownerId,
    title: truncate(title, 128),
  });
  return Number(albumId);
};

const addMarketItem = async (payload) => {
  const config = assertVkConfigured();
  return callVkMethod("market.add", {
    owner_id: config.ownerId,
    ...payload,
  });
};

const editMarketItem = async (itemId, payload) => {
  const config = assertVkConfigured();
  return callVkMethod("market.edit", {
    owner_id: config.ownerId,
    item_id: itemId,
    ...payload,
  });
};

const addItemToAlbum = async (itemId, albumId) => {
  const config = assertVkConfigured();
  return callVkMethod("market.addToAlbum", {
    owner_id: config.ownerId,
    item_id: itemId,
    album_ids: albumId,
  });
};

module.exports = {
  callVkMethod,
  uploadMarketPhoto,
  listAlbums,
  createAlbum,
  addMarketItem,
  editMarketItem,
  addItemToAlbum,
  truncate,
  GROUP_AUTH_HINT,
};
