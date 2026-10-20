const {
  NO_PANEL_ID,
  WIDTH_MIN,
  WIDTH_MAX,
  HEIGHT_MIN,
  HEIGHT_MAX,
  SIZE_STEP,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_PRIMARY_LOCK_CODE,
  DEFAULT_SECONDARY_LOCK_CODE,
} = require("./apartment-constants");

const clampSize = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  const snapped = Math.round(n / SIZE_STEP) * SIZE_STEP;
  return Math.min(max, Math.max(min, snapped));
};

const byId = (items, id) => (items || []).find((item) => item.id === id) || null;

const modelsOfType = (catalog, type) =>
  (catalog?.models || []).filter((model) => model.type === type);

const pickFirst = (items, predicate) => {
  if (!items?.length) return null;
  if (!predicate) return items[0];
  return items.find(predicate) || items[0];
};

const emptyFinish = () => ({
  panelModel: NO_PANEL_ID,
  primaryTexture: null,
  secondaryTexture: null,
  casingTexture: null,
  primaryColor: null,
  secondaryColor: null,
  casingColor: null,
  undercoat: false,
});

const syncedFilm = (model, finish) => {
  const next = { ...finish };
  if (!model?.hasPrimaryFilmColor) {
    next.primaryTexture = null;
    next.secondaryTexture = null;
    next.casingTexture = null;
    return next;
  }
  if (!model.hasSecondaryFilmColor) next.secondaryTexture = null;
  if (!model.hasCasingFilmColor) {
    next.casingTexture = null;
  } else if (model.filmColorSource === "primary-to-casing") {
    next.casingTexture = next.primaryTexture;
  } else if (model.filmColorSource === "secondary-to-casing") {
    next.casingTexture = next.secondaryTexture;
  }
  return next;
};

const syncedPaint = (model, finish) => {
  const next = { ...finish };
  if (!model?.hasPrimaryPaint) {
    next.primaryColor = null;
    next.secondaryColor = null;
    next.casingColor = null;
    return next;
  }
  if (!model.hasSecondaryPaint) next.secondaryColor = null;
  if (!model.hasCasingPaint) {
    next.casingColor = null;
  } else if (model.paintColorSource === "primary-to-casing") {
    next.casingColor = next.primaryColor;
  } else if (model.paintColorSource === "secondary-to-casing") {
    next.casingColor = next.secondaryColor;
  }
  return next;
};

const finishFromModel = (model) => {
  if (!model) return emptyFinish();
  return syncedPaint(
    model,
    syncedFilm(model, {
      panelModel: model.id,
      primaryTexture: model.hasPrimaryFilmColor ? model.defaultPrimaryFilmColorId : null,
      secondaryTexture: model.hasSecondaryFilmColor ? model.defaultSecondaryFilmColorId : null,
      casingTexture: model.hasCasingFilmColor ? model.defaultCasingFilmColorId : null,
      primaryColor: model.hasPrimaryPaint ? model.defaultPrimaryPaintId : null,
      secondaryColor: model.hasSecondaryPaint ? model.defaultSecondaryPaintId : null,
      casingColor: model.hasCasingPaint ? model.defaultCasingPaintId : null,
      undercoat: false,
    }),
  );
};

const lockMechanism = (lock) => String(lock?.properties?.["Механизм"] || "");

const isCylindricalLock = (lock) => lockMechanism(lock) === "Цилиндровый";

const firstMatchingFurniture = (catalog, { type, color, shape, id } = {}) => {
  const items = catalog?.furnitures || [];
  if (id != null) {
    const current = byId(items, id);
    if (current) return current;
  }
  return (
    items.find(
      (item) =>
        (!type || item.type === type) &&
        (!color || item.color === color) &&
        (!shape || item.shape === shape),
    ) ||
    items.find((item) => (!type || item.type === type) && (!color || item.color === color)) ||
    items.find((item) => !type || item.type === type) ||
    items[0] ||
    null
  );
};

const lockNameCode = (lock) => String(lock?.name || "").replace(/\D+/g, "");

const pickLockByCode = (locks, code) =>
  pickFirst(locks, (lock) => lockNameCode(lock) === String(code || "")) || pickFirst(locks);

const defaultLocksFromCatalog = (catalog) => {
  const primary = pickLockByCode(catalog?.locks?.primary, DEFAULT_PRIMARY_LOCK_CODE);
  const secondary = pickLockByCode(catalog?.locks?.secondary, DEFAULT_SECONDARY_LOCK_CODE);
  const cylinders = catalog?.cylinders || [];
  return {
    primaryLockId: primary?.id ?? null,
    secondaryLockId: secondary?.id ?? null,
    primaryCylinderId: isCylindricalLock(primary) ? pickFirst(cylinders)?.id ?? null : null,
    secondaryCylinderId: isCylindricalLock(secondary) ? pickFirst(cylinders)?.id ?? null : null,
  };
};

const createDefaultDoorConfig = (catalog = {}) => {
  const exteriorModels = modelsOfType(catalog, "exterior");
  const interiorModels = modelsOfType(catalog, "interior");
  const exterior =
    pickFirst(exteriorModels, (model) => model.hasPrimaryFilmColor) || pickFirst(exteriorModels);
  const interior = pickFirst(interiorModels, (model) => model.hasPrimaryFilmColor) || pickFirst(interiorModels);
  const furniture = firstMatchingFurniture(catalog, { type: "push" });
  const locks = defaultLocksFromCatalog(catalog);

  return {
    doorConstructive: "Comfort",
    doorBoxDesign: "Opened",
    doorHandleSide: "Left",
    doorWidth: DEFAULT_WIDTH,
    doorHeight: DEFAULT_HEIGHT,
    exterior: finishFromModel(exterior),
    interior: finishFromModel(interior),
    furnitureType: furniture?.type || "push",
    furnitureColor: furniture?.color || "black",
    furnitureShape: furniture?.shape || "rectangular",
    furnitureId: furniture?.id ?? null,
    peepholePosition: "None",
    nightLatch: false,
    secondaryLock: true,
    stainlessSteelDoorsill: false,
    metalPainting: {
      undercoat: false,
    },
    ...locks,
  };
};

const getModel = (catalog, type, id) => {
  if (id == null || id === NO_PANEL_ID) return null;
  return modelsOfType(catalog, type).find((model) => model.id === id) || null;
};

const setExteriorModel = (config, catalog, modelId) => {
  const model = getModel(catalog, "exterior", modelId);
  return {
    ...config,
    exterior: {
      ...finishFromModel(model),
      undercoat: config.exterior?.undercoat || config.metalPainting?.undercoat || false,
    },
    metalPainting: {
      ...config.metalPainting,
      undercoat: config.exterior?.undercoat || config.metalPainting?.undercoat || false,
    },
  };
};

const setInteriorModel = (config, catalog, modelId) => {
  if (modelId === NO_PANEL_ID) {
    return { ...config, interior: { ...emptyFinish(), panelModel: NO_PANEL_ID } };
  }
  const model = getModel(catalog, "interior", modelId);
  return { ...config, interior: finishFromModel(model) };
};

const isMetalExteriorModel = (model) => model?.classification === "apartment_metal-panel";

const patchFinish = (config, catalog, side, patch) => {
  const model = getModel(catalog, side, config[side]?.panelModel);
  let next = { ...config[side], ...patch };
  if ("primaryTexture" in patch || "secondaryTexture" in patch) {
    next = syncedFilm(model, next);
  }
  if ("primaryColor" in patch || "secondaryColor" in patch) {
    next = syncedPaint(model, next);
  }
  const result = { ...config, [side]: next };
  if (side === "exterior" && Object.prototype.hasOwnProperty.call(patch, "undercoat")) {
    result.metalPainting = { ...config.metalPainting, undercoat: Boolean(patch.undercoat) };
  }
  return result;
};

const setFurniture = (config, catalog, furnitureId) => {
  const furniture = byId(catalog?.furnitures, furnitureId);
  if (!furniture) return { ...config, furnitureId };
  return {
    ...config,
    furnitureId: furniture.id,
    furnitureType: furniture.type,
    furnitureColor: furniture.color,
    furnitureShape: furniture.shape,
  };
};

const clampDoorSizes = (config) => ({
  ...config,
  doorWidth: clampSize(config.doorWidth, WIDTH_MIN, WIDTH_MAX),
  doorHeight: clampSize(config.doorHeight, HEIGHT_MIN, HEIGHT_MAX),
});

const pickRandom = (items, rng = Math.random) => {
  if (!items?.length) return null;
  return items[Math.floor(rng() * items.length)];
};

const randomizeDoorConfig = (catalog = {}, rng = Math.random, current = null) => {
  let config = createDefaultDoorConfig(catalog);
  if (current?.doorConstructive) config.doorConstructive = current.doorConstructive;
  if (current?.doorBoxDesign) config.doorBoxDesign = current.doorBoxDesign;
  if (current?.doorWidth) config.doorWidth = current.doorWidth;
  if (current?.doorHeight) config.doorHeight = current.doorHeight;
  config.doorHandleSide = pickRandom(["Left", "Right"], rng);

  const exterior = pickRandom(modelsOfType(catalog, "exterior"), rng);
  const interior = pickRandom([null, ...modelsOfType(catalog, "interior")], rng);
  config = setExteriorModel(config, catalog, exterior?.id);
  config = interior
    ? setInteriorModel(config, catalog, interior.id)
    : setInteriorModel(config, catalog, NO_PANEL_ID);

  const furniture = pickRandom(catalog?.furnitures, rng);
  if (furniture) config = setFurniture(config, catalog, furniture.id);

  const primary = pickRandom(catalog?.locks?.primary, rng);
  const secondary = pickRandom(catalog?.locks?.secondary, rng);
  const cylinder = pickRandom(catalog?.cylinders, rng);
  config.primaryLockId = primary?.id ?? null;
  config.secondaryLockId = secondary?.id ?? null;
  config.primaryCylinderId = isCylindricalLock(primary) ? cylinder?.id ?? null : null;
  config.secondaryCylinderId = isCylindricalLock(secondary) ? cylinder?.id ?? null : null;
  config.secondaryLock = true;
  config.nightLatch = rng() > 0.6;
  config.stainlessSteelDoorsill = rng() > 0.5;
  config.peepholePosition = pickRandom(["None", "center", "side"], rng);
  config = patchFinish(config, catalog, "exterior", { undercoat: rng() > 0.7 });
  return clampDoorSizes(config);
};

module.exports = {
  clampSize,
  createDefaultDoorConfig,
  finishFromModel,
  getModel,
  isCylindricalLock,
  lockMechanism,
  firstMatchingFurniture,
  patchFinish,
  randomizeDoorConfig,
  setExteriorModel,
  setFurniture,
  setInteriorModel,
  clampDoorSizes,
  syncedFilm,
  syncedPaint,
  isMetalExteriorModel,
};
