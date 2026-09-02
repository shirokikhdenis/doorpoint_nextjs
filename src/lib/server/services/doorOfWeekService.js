const doorOfWeekRepository = require("../repositories/doorOfWeekRepository");
const {
  DOOR_OF_WEEK_SLOTS,
  normalizeDoorOfWeekSlot,
  pickCurrentProductId,
  clampDiscountPercent,
  applyDoorOfWeekDiscount,
  getNextMondayMoscowLabel,
  getNextMondayMoscowEndsAtIso,
} = require("../domain/doorOfWeek");

let cachedState = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

const invalidateCache = () => {
  cachedState = null;
  cachedAt = 0;
};

const loadSlotState = async (slot, force = false) => {
  const normalizedSlot = normalizeDoorOfWeekSlot(slot);
  if (!normalizedSlot) return null;

  const now = Date.now();
  if (!force && cachedState?.[normalizedSlot] && now - cachedAt < CACHE_MS) {
    return cachedState[normalizedSlot];
  }

  const [settings, pool] = await Promise.all([
    doorOfWeekRepository.getSettings(normalizedSlot),
    doorOfWeekRepository.listPool(normalizedSlot),
  ]);
  const currentProductId = settings?.isEnabled ? pickCurrentProductId(pool) : null;
  const state = {
    slot: normalizedSlot,
    settings: settings || {
      slot: normalizedSlot,
      isEnabled: false,
      discountPercent: 10,
      title: "Дверь недели",
    },
    pool,
    currentProductId,
  };

  cachedState = { ...(cachedState || {}), [normalizedSlot]: state };
  cachedAt = now;
  return state;
};

const loadAllStates = async (force = false) =>
  Promise.all(DOOR_OF_WEEK_SLOTS.map((slot) => loadSlotState(slot, force)));

const buildAdminBlock = (state) => {
  const currentProduct =
    state.currentProductId != null
      ? state.pool.find((row) => row.productId === state.currentProductId) || null
      : null;
  return {
    slot: state.slot,
    settings: {
      ...state.settings,
      discountPercent: clampDiscountPercent(state.settings.discountPercent),
    },
    pool: state.pool,
    currentProduct,
  };
};

const getAdminPayload = async () => {
  const states = await loadAllStates(true);
  return {
    blocks: states.filter(Boolean).map(buildAdminBlock),
    nextRotationLabel: getNextMondayMoscowLabel(),
  };
};

const updateSettings = async (slot, patch) => {
  const normalizedSlot = normalizeDoorOfWeekSlot(slot);
  if (!normalizedSlot) {
    return { ok: false, status: 400, message: "Некорректный блок" };
  }
  const title = patch.title !== undefined ? String(patch.title || "").trim() : undefined;
  const updated = await doorOfWeekRepository.updateSettings(normalizedSlot, {
    isEnabled: patch.isEnabled,
    discountPercent:
      patch.discountPercent !== undefined
        ? clampDiscountPercent(patch.discountPercent)
        : undefined,
    title: title || undefined,
  });
  invalidateCache();
  if (!updated) return { ok: false, status: 400, message: "Не удалось сохранить настройки" };
  return { ok: true, settings: updated };
};

const addProduct = async (slot, productId) => {
  const normalizedSlot = normalizeDoorOfWeekSlot(slot);
  if (!normalizedSlot) {
    return { ok: false, status: 400, message: "Некорректный блок" };
  }
  const row = await doorOfWeekRepository.addProduct(normalizedSlot, productId);
  invalidateCache();
  if (!row) return { ok: false, status: 400, message: "Товар не найден или уже в пуле" };
  return { ok: true, item: row };
};

const removeProduct = async (slot, productId) => {
  const normalizedSlot = normalizeDoorOfWeekSlot(slot);
  if (!normalizedSlot) {
    return { ok: false, status: 400, message: "Некорректный блок" };
  }
  const deleted = await doorOfWeekRepository.removeProduct(normalizedSlot, productId);
  invalidateCache();
  if (!deleted) return { ok: false, status: 404, message: "Товар не найден в пуле" };
  return { ok: true };
};

const moveProduct = async (slot, productId, direction) => {
  const normalizedSlot = normalizeDoorOfWeekSlot(slot);
  if (!normalizedSlot) {
    return { ok: false, status: 400, message: "Некорректный блок" };
  }
  if (direction !== "up" && direction !== "down") {
    return { ok: false, status: 400, message: "Некорректное направление" };
  }
  const pool = await doorOfWeekRepository.moveProduct(normalizedSlot, productId, direction);
  invalidateCache();
  if (!pool) return { ok: false, status: 404, message: "Товар не найден в пуле" };
  return { ok: true, pool };
};

const buildPublicItem = (state) => {
  if (!state?.settings.isEnabled || !state.currentProductId) return null;
  const product = state.pool.find((row) => row.productId === state.currentProductId);
  if (!product) return null;

  const discountPercent = clampDiscountPercent(state.settings.discountPercent);
  const pricing = applyDoorOfWeekDiscount(product.price, discountPercent);

  return {
    slot: state.slot,
    title: state.settings.title,
    productId: product.productId,
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    image: product.image,
    discountPercent,
    endsAt: getNextMondayMoscowEndsAtIso(),
    ...pricing,
  };
};

const getActiveContextForProduct = async (productId) => {
  const numericId = Number(productId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return { isActive: false, discountPercent: 0 };
  }

  const states = await loadAllStates();
  const activeContexts = states
    .filter((state) => state?.settings.isEnabled && state.currentProductId === numericId)
    .map((state) => ({
      isActive: true,
      discountPercent: clampDiscountPercent(state.settings.discountPercent),
    }));

  if (activeContexts.length === 0) {
    return { isActive: false, discountPercent: 0 };
  }

  return activeContexts.reduce((best, current) =>
    current.discountPercent > best.discountPercent ? current : best,
  );
};

const getPublicDoorOfWeekBlocks = async () => {
  const states = await loadAllStates();
  return states.map(buildPublicItem).filter(Boolean);
};

module.exports = {
  getAdminPayload,
  updateSettings,
  addProduct,
  removeProduct,
  moveProduct,
  getActiveContextForProduct,
  getPublicDoorOfWeekBlocks,
  applyDoorOfWeekDiscount,
  invalidateCache,
};
