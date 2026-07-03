const { assertVkConfigured } = require("./vkConfig");

const VK_API_BASE = "https://api.vk.com/method";
const RETRYABLE_ERROR_CODES = new Set([6, 9, 10]);
const GROUP_AUTH_ERROR_CODE = 27;
const MAX_RETRIES = 4;

const GROUP_AUTH_HINT =
  "Нужен пользовательский access token администратора группы с правами market и photos (Standalone-приложение VK), а не ключ доступа сообщества.";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildVkError = (payload, method) => {
  const error = payload?.error || {};
  let message = error.error_msg || "VK API error";
  const code = Number(error.error_code) || 0;
  if (code === GROUP_AUTH_ERROR_CODE && /group auth/i.test(message)) {
    message = `${message}. ${GROUP_AUTH_HINT}`;
  }
  const err = new Error(method ? `${method}: ${message}` : message);
  err.vkErrorCode = code;
  err.vkError = error;
  err.vkMethod = method;
  return err;
};

const callVkMethod = async (method, params = {}, attempt = 0) => {
  const config = assertVkConfigured();
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    body.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  });
  body.set("access_token", config.accessToken);
  body.set("v", config.apiVersion);

  const response = await fetch(`${VK_API_BASE}/${method}`, {
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
    if (RETRYABLE_ERROR_CODES.has(err.vkErrorCode) && attempt < MAX_RETRIES) {
      const backoff = 400 * 2 ** attempt;
      await sleep(backoff);
      return callVkMethod(method, params, attempt + 1);
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

  const saved = await callVkMethod("photos.saveMarketPhoto", {
    group_id: config.groupId,
    photo: uploadPayload.photo,
    hash: uploadPayload.hash,
  });

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
