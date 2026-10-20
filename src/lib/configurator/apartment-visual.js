const { NO_PANEL_ID } = require("./apartment-constants");
const { getModel, isCylindricalLock } = require("./apartment-door-config");

const compositeKey = (modelName, colorName) => `${modelName}|${colorName}`;

const hasComposite = (set, modelName, colorName) => {
  if (!set || !modelName || !colorName) return false;
  if (set instanceof Set) return set.has(compositeKey(modelName, colorName));
  if (Array.isArray(set)) return set.includes(compositeKey(modelName, colorName));
  return Boolean(set[compositeKey(modelName, colorName)]);
};

const compositeUrl = (side, modelName, colorName) => {
  if (!modelName || !colorName) return "";
  return `/uploads/configurator/apartment/${side}/${modelName} ${colorName}.webp`;
};

const byId = (items, id) => (items || []).find((item) => item.id === id) || null;

const filmName = (catalog, id) => byId(catalog?.films, id)?.name || "";
const paintName = (catalog, id) => byId(catalog?.paints, id)?.name || "";

const layerUrl = (map, key) => {
  if (!map || !key) return "";
  return map[key] || "";
};

const resolveFilmCasingSrc = (side, config, catalog, model) => {
  const finish = config?.[side];
  if (!model) return "";
  const film = filmName(catalog, finish?.casingTexture || finish?.primaryTexture);
  if (!film) return "";
  return layerUrl(catalog?.layerUrls?.casing, compositeKey(model.name, film));
};

const resolvePaintCasingSrc = (config, catalog) => {
  const paint = paintName(
    catalog,
    config?.exterior?.casingColor || config?.exterior?.primaryColor,
  );
  return layerUrl(catalog?.layerUrls?.casingPaint, paint);
};

const resolveCasingSrc = (side, config, catalog, model) =>
  resolveFilmCasingSrc(side, config, catalog, model) || resolvePaintCasingSrc(config, catalog);

const resolveInsertSrc = (catalog, model, finish) => {
  if (!model) return "";
  const film = filmName(catalog, finish?.casingTexture || finish?.primaryTexture);
  if (!film) return "";
  return layerUrl(catalog?.layerUrls?.insert, compositeKey(model.name, film));
};

const resolveLeafInsertSrc = (catalog, model, finish) => {
  if (!model) return "";
  const secondary = model.hasSecondaryFilmColor ? filmName(catalog, finish?.secondaryTexture) : "";
  const primary = filmName(catalog, finish?.primaryTexture);
  return (
    (secondary && layerUrl(catalog?.layerUrls?.leafInsert, compositeKey(model.name, secondary))) ||
    (primary && layerUrl(catalog?.layerUrls?.leafInsert, compositeKey(model.name, primary))) ||
    ""
  );
};

const resolveHingeSrc = (config, catalog) =>
  layerUrl(
    catalog?.layerUrls?.hinge,
    paintName(catalog, config?.exterior?.casingColor || config?.exterior?.primaryColor),
  );

const resolveThresholdSrc = (catalog, side) =>
  catalog?.layerUrls?.threshold?.[side] || catalog?.thresholdImageUrl || "";

const isExteriorDesignCatalogThumb = (src) => /\/models\/exterior\//.test(String(src || ""));

const PEEPHOLE_SIDE_SHIFT = 0.326;

const peepholeOverlay = (overlays, side, position) => {
  const src = side === "exterior" ? overlays.peepholeExterior : overlays.peepholeInterior;
  if (!src || !position || position === "None") return null;
  const shiftX =
    position === "side" ? (side === "exterior" ? PEEPHOLE_SIDE_SHIFT : -PEEPHOLE_SIDE_SHIFT) : 0;
  return { id: "peephole", src, kind: "overlay", shiftX };
};

const resolveBaseLayer = (side, config, catalog) => {
  const finish = config[side];
  if (!finish || finish.panelModel === NO_PANEL_ID) {
    return { src: "", kind: "empty" };
  }
  const model = getModel(catalog, side, finish.panelModel);
  if (!model) return { src: "", kind: "empty" };

  const film = filmName(catalog, finish.primaryTexture);
  const composites = catalog?.composites?.[side] || [];
  if (model.hasPrimaryFilmColor && film && hasComposite(composites, model.name, film)) {
    return { src: compositeUrl(side, model.name, film), kind: "composite" };
  }
  const paint = paintName(catalog, finish.primaryColor || finish.casingColor);
  if (model.hasPrimaryPaint && paint && hasComposite(composites, model.name, paint)) {
    // Hires metal renders already include frame and furniture — do not stack overlays.
    return { src: compositeUrl(side, model.name, paint), kind: "thumb" };
  }
  // Marketing shots from Прочее/modeli/naruzhnye-dizajn include furniture — never use them.
  if (isExteriorDesignCatalogThumb(model.imageUrl)) {
    return { src: "", kind: "empty" };
  }
  return { src: model.imageUrl || "", kind: model.imageUrl ? "thumb" : "empty" };
};

const overlayForLock = (overlays, side, isPrimary, cylindrical) => {
  if (!overlays) return "";
  if (side === "exterior") {
    if (isPrimary) return cylindrical ? overlays.primaryExteriorCylindrical : overlays.primaryExteriorLever;
    return cylindrical ? overlays.secondaryExteriorCylindrical : overlays.secondaryExteriorLever;
  }
  if (isPrimary) {
    return cylindrical
      ? overlays.primaryInteriorCylindrical || overlays.cylinderRod
      : overlays.primaryInteriorLever;
  }
  return cylindrical ? overlays.secondaryInteriorCylindrical : overlays.secondaryInteriorLever;
};

const resolveVisualizerLayers = (config, catalog, side = "exterior") => {
  const layers = [];
  const finish = config?.[side];
  const model =
    finish && finish.panelModel !== NO_PANEL_ID ? getModel(catalog, side, finish.panelModel) : null;
  const base = resolveBaseLayer(side, config, catalog);
  const canAlignFrame = base.kind !== "thumb";
  const paintCasingSrc = canAlignFrame ? resolvePaintCasingSrc(config, catalog) : "";
  const filmCasingSrc = canAlignFrame ? resolveFilmCasingSrc(side, config, catalog, model) : "";
  const insertSrc = canAlignFrame ? resolveInsertSrc(catalog, model, finish) : "";
  const leafInsertSrc = canAlignFrame ? resolveLeafInsertSrc(catalog, model, finish) : "";

  // Metal box only when this side has no MDF casing — otherwise it sticks out
  // above/below the наличник. Gaps in the opening are filled with black in the visualizer.
  if (paintCasingSrc && !filmCasingSrc) {
    layers.push({ id: "casing-paint", src: paintCasingSrc, kind: "casing" });
  }
  if (filmCasingSrc) layers.push({ id: "casing", src: filmCasingSrc, kind: "casing" });
  if (insertSrc) layers.push({ id: "insert", src: insertSrc, kind: "insert" });
  if (base.src) layers.push({ id: "base", src: base.src, kind: base.kind });
  if (leafInsertSrc) layers.push({ id: "leaf-insert", src: leafInsertSrc, kind: "leaf-insert" });

  const hingeSrc = side === "exterior" && canAlignFrame ? resolveHingeSrc(config, catalog) : "";
  if (hingeSrc) layers.push({ id: "hinge", src: hingeSrc, kind: "hinge" });

  const furniture = byId(catalog?.furnitures, config.furnitureId);
  const overlays = furniture?.overlays || {};
  const primaryLock = byId(catalog?.locks?.primary, config.primaryLockId);
  const secondaryLock = byId(catalog?.locks?.secondary, config.secondaryLockId);

  if (canAlignFrame) {
    const primaryOverlay = overlayForLock(overlays, side, true, isCylindricalLock(primaryLock));
    if (primaryOverlay) layers.push({ id: "lock-primary", src: primaryOverlay, kind: "overlay" });

    if (config.secondaryLock) {
      const secondaryOverlay = overlayForLock(overlays, side, false, isCylindricalLock(secondaryLock));
      if (secondaryOverlay) layers.push({ id: "lock-secondary", src: secondaryOverlay, kind: "overlay" });
    }

    const handleSrc = side === "exterior" ? overlays.handleExterior : overlays.handleInterior;
    if (handleSrc) layers.push({ id: "handle", src: handleSrc, kind: "overlay" });

    if (config.peepholePosition && config.peepholePosition !== "None") {
      const peephole = peepholeOverlay(overlays, side, config.peepholePosition);
      if (peephole) layers.push(peephole);
    }

    if (side === "interior" && config.nightLatch && overlays.nightLatchTurner) {
      layers.push({ id: "night-latch", src: overlays.nightLatchTurner, kind: "overlay" });
    }
  }

  if (config.stainlessSteelDoorsill) {
    const thresholdSrc = resolveThresholdSrc(catalog, side);
    if (thresholdSrc) layers.push({ id: "threshold", src: thresholdSrc, kind: "overlay" });
  }

  return {
    layers,
    mirror: config.doorHandleSide === "Right",
  };
};

module.exports = {
  compositeKey,
  compositeUrl,
  hasComposite,
  PEEPHOLE_SIDE_SHIFT,
  resolveBaseLayer,
  resolveCasingSrc,
  resolveVisualizerLayers,
};
