const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { SKIP_MODEL_NAMES } = require("../../configurator/apartment-constants");
const { getUploadsRoot, ensureWritableSubdir } = require("../uploadsPath");

const PUBLIC_PREFIX = "/uploads/configurator/apartment";
const IMAGE_EXTS = new Set([".webp", ".png", ".jpg", ".jpeg"]);

const FURNITURE_ROLES = {
  "glazok-naruzh": "peepholeExterior",
  "glazok-vnutr": "peepholeInterior",
  "glazok-preview": "peepholePreview",
  "nakladki-cilindr-naruzh": "primaryExteriorCylindrical",
  "nakladki-cilindr2-naruzh": "secondaryExteriorCylindrical",
  "nakladki-cilindr2-vnutr": "secondaryInteriorCylindrical",
  "nakladki-suvald-naruzh": "primaryExteriorLever",
  "nakladki-suvald-vnutr": "primaryInteriorLever",
  "nakladki-suvald2-naruzh": "secondaryExteriorLever",
  "nakladki-suvald2-vnutr": "secondaryInteriorLever",
  "ruchka-naruzh": "handleExterior",
  "ruchka-vnutr": "handleInterior",
  "vertushka": "nightLatchTurner",
  "shtift-cilindra": "cylinderRod",
  "preview-naruzhnye": "preview",
  "preview-vnutrennie": "interiorPreview",
  "nochnaya-zadvizhka-preview": "nightLatchPreview",
};

const skipPriceCodes = new Set(["Left", "Right"]);

const asBool = (value) => Boolean(Number(value) || value === true);
const asId = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const stripExt = (name) => name.replace(/\.[^.]+$/, "");

const normalizeKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[[\]]/g, " ")
    .replace(/[/\\]+/g, "-")
    .replace(/[_.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isImageFile = (name) => IMAGE_EXTS.has(path.extname(name).toLowerCase());

const listImageFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => isImageFile(name));
};

const copyFile = (src, dest) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
};

const publicUrl = (...segments) =>
  `${PUBLIC_PREFIX}/${segments.map((part) => String(part).replace(/^\/+/, "")).join("/")}`;

const buildNameIndex = (dir) => {
  const index = new Map();
  for (const file of listImageFiles(dir)) {
    const base = stripExt(file);
    index.set(base, file);
    index.set(normalizeKey(base), file);
  }
  return index;
};

const lookupFile = (index, name) => {
  if (!name) return null;
  return index.get(name) || index.get(normalizeKey(name)) || null;
};

const copyIndexedDir = (srcDir, destDir) => {
  const copied = [];
  for (const file of listImageFiles(srcDir)) {
    copyFile(path.join(srcDir, file), path.join(destDir, file));
    copied.push(file);
  }
  return copied;
};

const parseFurnitureId = (filename) => {
  const match = /id(\d+)/i.exec(filename);
  return match ? Number(match[1]) : null;
};

const parseCsv = (content) => {
  const lines = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(";");
    const row = {};
    headers.forEach((header, i) => {
      row[header] = cols[i] == null ? "" : cols[i];
    });
    return row;
  });
};

const propertiesFromNomenclature = (item) => {
  const out = {};
  for (const prop of item.nomenclature_properties || []) {
    if (prop?.property_name) out[prop.property_name] = prop.property_value;
  }
  return out;
};

const copyComposites = (parserDir, destRoot) => {
  const stats = { exterior: 0, interior: 0 };
  const interiorSrc = path.join(parserDir, "Внутренние");
  const exteriorSrc = path.join(parserDir, "Наружные");
  const interiorDest = path.join(destRoot, "interior");
  const exteriorDest = path.join(destRoot, "exterior");
  stats.interior = copyIndexedDir(interiorSrc, interiorDest).length;
  stats.exterior = copyIndexedDir(exteriorSrc, exteriorDest).filter((name) =>
    name.toLowerCase().endsWith(".webp"),
  ).length;
  return stats;
};

const copyMetalHires = async (parserDir, destRoot) => {
  const srcDir = path.join(parserDir, "hires");
  const destDir = path.join(destRoot, "exterior");
  if (!fs.existsSync(srcDir)) return 0;
  fs.mkdirSync(destDir, { recursive: true });
  let copied = 0;
  for (const file of listImageFiles(srcDir)) {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, `${stripExt(file)}.webp`);
    if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) {
      copied += 1;
      continue;
    }
    await sharp(src)
      .resize(2000, 4000, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, alphaQuality: 86 })
      .toFile(dest);
    copied += 1;
  }
  return copied;
};

const copyNamedFile = (src, dest) => {
  if (!fs.existsSync(src)) return false;
  copyFile(src, dest);
  return true;
};

const copyVisualizerLayers = (parserDir, destRoot) => {
  const sourceRoot = path.join(parserDir, "Наличники");
  const stats = { casing: 0, casingPaint: 0, insert: 0, leafInsert: 0, box: 0, hinge: 0, threshold: 0 };
  if (fs.existsSync(sourceRoot)) {
    stats.casing = copyIndexedDir(
      path.join(sourceRoot, "nalichniki"),
      path.join(destRoot, "layers", "casing"),
    ).length;
    stats.casingPaint = copyIndexedDir(
      path.join(sourceRoot, "nalichniki-kraska"),
      path.join(destRoot, "layers", "casing-paint"),
    ).length;
    stats.insert = copyIndexedDir(
      path.join(sourceRoot, "nalichniki-vstavki"),
      path.join(destRoot, "layers", "inserts"),
    ).length;

    const boxSrc = path.join(sourceRoot, "korob-ui");
    const boxDest = path.join(destRoot, "layers", "box");
    if (copyNamedFile(path.join(boxSrc, "Открытый.webp"), path.join(boxDest, "Opened.webp"))) stats.box += 1;
    if (copyNamedFile(path.join(boxSrc, "Закрытый.webp"), path.join(boxDest, "Closed.webp"))) stats.box += 1;
  }

  stats.leafInsert = copyIndexedDir(
    path.join(parserDir, "вставки", "vstavki-polotna"),
    path.join(destRoot, "layers", "leaf-inserts"),
  ).length;

  stats.hinge = copyIndexedDir(
    path.join(parserDir, "Петли", "petli"),
    path.join(destRoot, "layers", "hinges"),
  ).length;

  const thresholdSrc = path.join(parserDir, "Пороги");
  const thresholdDest = path.join(destRoot, "layers", "threshold");
  stats.threshold = 0;
  if (copyNamedFile(path.join(thresholdSrc, "Nerzhaveyushchiy porog snaruzhi.webp"), path.join(thresholdDest, "exterior.webp"))) {
    stats.threshold += 1;
  }
  if (copyNamedFile(path.join(thresholdSrc, "Nerzhaveyushchiy porog iznutri.webp"), path.join(thresholdDest, "interior.webp"))) {
    stats.threshold += 1;
  }
  if (copyNamedFile(path.join(thresholdSrc, "Nerzhaveyushchiy porog UI.png"), path.join(thresholdDest, "ui.png"))) {
    stats.threshold += 1;
  }
  return stats;
};

const collectFurnitureOverlays = (furnitureSrc, destRoot) => {
  const byId = new Map();
  for (const [folder, role] of Object.entries(FURNITURE_ROLES)) {
    const srcDir = path.join(furnitureSrc, folder);
    const destDir = path.join(destRoot, "furniture", folder);
    for (const file of listImageFiles(srcDir)) {
      copyFile(path.join(srcDir, file), path.join(destDir, file));
      const id = parseFurnitureId(file);
      if (!id) continue;
      if (!byId.has(id)) byId.set(id, {});
      byId.get(id)[role] = publicUrl("furniture", folder, file);
    }
  }
  return byId;
};

const importDorstonConfigurator = async ({ parserDir, repository }) => {
  const sourceDir = path.resolve(parserDir);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Папка парсера не найдена: ${sourceDir}`);
  }

  const catalogPath = path.join(sourceDir, "Прочее", "dorston-apartment-catalogs.json");
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Нет каталога: ${catalogPath}`);
  }

  const destRoot = path.join(getUploadsRoot(), "configurator", "apartment");
  await ensureWritableSubdir("configurator/apartment");

  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const prochee = path.join(sourceDir, "Прочее");

  const compositeStats = copyComposites(sourceDir, destRoot);
  const metalHires = await copyMetalHires(sourceDir, destRoot);
  const layerStats = copyVisualizerLayers(sourceDir, destRoot);

  const paintDir = path.join(prochee, "kraski-metalla");
  const filmDir = path.join(prochee, "plenki-obrazcy");
  const lockPrimaryDir = path.join(prochee, "zamki", "osnovnye");
  const lockSecondaryDir = path.join(prochee, "zamki", "dopolnitelnye");
  const cylinderDir = path.join(prochee, "cilindry");
  const thresholdDir = path.join(prochee, "porog");
  const metalModelsDir = path.join(prochee, "modeli", "metallicheskie-paneli");
  const interiorModelsDir = path.join(prochee, "modeli", "vnutrennie-dizajn");

  copyIndexedDir(paintDir, path.join(destRoot, "paints"));
  copyIndexedDir(filmDir, path.join(destRoot, "films"));
  copyIndexedDir(lockPrimaryDir, path.join(destRoot, "locks", "primary"));
  copyIndexedDir(lockSecondaryDir, path.join(destRoot, "locks", "secondary"));
  copyIndexedDir(cylinderDir, path.join(destRoot, "cylinders"));
  copyIndexedDir(thresholdDir, path.join(destRoot, "threshold"));
  copyIndexedDir(metalModelsDir, path.join(destRoot, "models", "metal"));
  copyIndexedDir(interiorModelsDir, path.join(destRoot, "models", "interior"));
  fs.rmSync(path.join(destRoot, "models", "exterior"), { recursive: true, force: true });

  const paintIndex = buildNameIndex(paintDir);
  const filmIndex = buildNameIndex(filmDir);
  const lockPrimaryIndex = buildNameIndex(lockPrimaryDir);
  const lockSecondaryIndex = buildNameIndex(lockSecondaryDir);
  const cylinderIndex = buildNameIndex(cylinderDir);
  const metalIndex = buildNameIndex(metalModelsDir);
  const interiorIndex = buildNameIndex(interiorModelsDir);
  const furnitureOverlays = collectFurnitureOverlays(path.join(prochee, "furnitura"), destRoot);
  const filmNameById = new Map(
    (catalog.filmColors || []).map((item) => [Number(item.id), String(item.name || "")]),
  );
  const paintNameById = new Map(
    (catalog.paints || []).map((item) => [Number(item.id), String(item.name || "")]),
  );

  const compositePublicUrl = (side, modelName, colorName) => {
    if (!modelName || !colorName) return "";
    const file = `${modelName} ${colorName}.webp`;
    return fs.existsSync(path.join(destRoot, side, file)) ? publicUrl(side, file) : "";
  };

  const modelImageUrl = (model) => {
    if (model.type === "interior") {
      const file = lookupFile(interiorIndex, model.name);
      return file ? publicUrl("models", "interior", file) : "";
    }
    if (model.classification === "apartment_metal-panel") {
      const hires = compositePublicUrl(
        "exterior",
        model.name,
        paintNameById.get(Number(model.default_primary_paint_id)),
      );
      if (hires) return hires;
      const file = lookupFile(metalIndex, model.name);
      return file ? publicUrl("models", "metal", file) : "";
    }
    return compositePublicUrl(
      "exterior",
      model.name,
      filmNameById.get(Number(model.default_primary_film_color_id)),
    );
  };

  const nomenclatureImageUrl = (kind, name) => {
    if (kind === "paint") {
      const file = lookupFile(paintIndex, name);
      return file ? publicUrl("paints", file) : "";
    }
    if (kind === "film") {
      const file = lookupFile(filmIndex, name);
      return file ? publicUrl("films", file) : "";
    }
    if (kind === "lock_primary") {
      const file = lookupFile(lockPrimaryIndex, name);
      return file ? publicUrl("locks", "primary", file) : "";
    }
    if (kind === "lock_secondary") {
      const file = lookupFile(lockSecondaryIndex, name);
      return file ? publicUrl("locks", "secondary", file) : "";
    }
    if (kind === "cylinder") {
      const file = lookupFile(cylinderIndex, name);
      return file ? publicUrl("cylinders", file) : "";
    }
    return "";
  };

  let models = 0;
  const keptSourceIds = [];
  for (const [index, model] of (catalog.doorModels || []).entries()) {
    if (SKIP_MODEL_NAMES.has(String(model.name || ""))) continue;
    await repository.upsertModel({
      sourceId: model.id,
      name: model.name,
      type: model.type === "interior" ? "interior" : "exterior",
      classification: model.classification || null,
      imageUrl: modelImageUrl(model),
      hasPrimaryFilmColor: asBool(model.has_primary_film_color),
      hasSecondaryFilmColor: asBool(model.has_secondary_film_color),
      hasCasingFilmColor: asBool(model.has_casing_film_color),
      hasPrimaryPaint: asBool(model.has_primary_paint),
      hasSecondaryPaint: asBool(model.has_secondary_paint),
      hasCasingPaint: asBool(model.has_casing_paint),
      defaultPrimaryFilmColorId: asId(model.default_primary_film_color_id),
      defaultSecondaryFilmColorId: asId(model.default_secondary_film_color_id),
      defaultCasingFilmColorId: asId(model.default_casing_film_color_id),
      defaultPrimaryPaintId: asId(model.default_primary_paint_id),
      defaultSecondaryPaintId: asId(model.default_secondary_paint_id),
      defaultCasingPaintId: asId(model.default_casing_paint_id),
      filmColorSource: model.film_color_source || null,
      paintColorSource: model.paint_color_source || null,
      peepholePosition: model.peephole_position || "anywhere",
      markupAbs: Number(model.markup_abs) || 0,
      sortOrder: index,
    });
    keptSourceIds.push(model.id);
    models += 1;
  }
  if (typeof repository.deleteModelsNotIn === "function") {
    await repository.deleteModelsNotIn(keptSourceIds);
  }

  const nomenclatureGroups = [
    ["paint", catalog.paints || []],
    ["film", catalog.filmColors || []],
    ["lock_primary", catalog.locks?.primary || []],
    ["lock_secondary", catalog.locks?.secondary || []],
    ["cylinder", catalog.cylinders || []],
    ["handle", catalog.handles || []],
  ];

  let nomenclature = 0;
  for (const [kind, items] of nomenclatureGroups) {
    for (const [index, item] of items.entries()) {
      await repository.upsertNomenclature({
        sourceId: item.id,
        kind,
        name: item.name,
        imageUrl: nomenclatureImageUrl(kind, item.name),
        basePrice: Number(item.base_price) || 0,
        unit: item.unit || null,
        properties: propertiesFromNomenclature(item),
        sortOrder: index,
      });
      nomenclature += 1;
    }
  }

  let furniture = 0;
  for (const [index, item] of (catalog.furnitures || []).entries()) {
    const overlays = furnitureOverlays.get(item.id) || {};
    overlays.kit = {
      handle: item.handle || null,
      peephole: item.peephole || null,
      night_latch_turner: item.night_latch_turner || null,
      night_latch: item.night_latch || null,
      thumbturn: item.thumbturn || null,
      cylinder_rod: item.cylinder_rod || null,
      cylindrical_lock: item.cylindrical_lock || null,
      lever_lock: item.lever_lock || null,
      secondary_cylindrical_lock: item.secondary_cylindrical_lock || null,
      secondary_lever_lock: item.secondary_lever_lock || null,
      primary_exterior_cylindrical_lock_cover: item.primary_exterior_cylindrical_lock_cover || null,
      primary_interior_cylindrical_lock_cover: item.primary_interior_cylindrical_lock_cover || null,
      primary_exterior_lever_lock_cover: item.primary_exterior_lever_lock_cover || null,
      primary_interior_lever_lock_cover: item.primary_interior_lever_lock_cover || null,
      secondary_exterior_cylindrical_lock_cover: item.secondary_exterior_cylindrical_lock_cover || null,
      secondary_interior_cylindrical_lock_cover: item.secondary_interior_cylindrical_lock_cover || null,
      secondary_exterior_lever_lock_cover: item.secondary_exterior_lever_lock_cover || null,
      secondary_interior_lever_lock_cover: item.secondary_interior_lever_lock_cover || null,
    };
    await repository.upsertFurniture({
      sourceId: item.id,
      title: item.title || `Комплект ${item.id}`,
      type: item.type || "push",
      shape: item.shape || "",
      color: item.color || "",
      previewUrl: overlays.preview || "",
      interiorPreviewUrl: overlays.interiorPreview || "",
      overlays,
      handleId: asId(item.handle_id),
      primaryCylindricalLockId: asId(item.primary_cylindrical_lock_id),
      primaryLeverLockId: asId(item.primary_lever_lock_id),
      secondaryCylindricalLockId: asId(item.secondary_cylindrical_lock_id),
      secondaryLeverLockId: asId(item.secondary_lever_lock_id),
      peepholeId: asId(item.peephole_id),
      nightLatchId: asId(item.night_latch_id || item.night_latch_turner_id),
      cylinderRodId: asId(item.cylinder_rod_id),
      sortOrder: index,
    });
    furniture += 1;
  }

  const optionsCsvPath = path.join(sourceDir, "dorston-apartment-prices-options.csv");
  let priceOptions = 0;
  if (fs.existsSync(optionsCsvPath)) {
    const rows = parseCsv(fs.readFileSync(optionsCsvPath, "utf8"));
    for (const row of rows) {
      const code = String(row["ID"] || "").trim();
      const category = String(row["Категория"] || "").trim();
      if (!code || skipPriceCodes.has(code) || category.startsWith("Размер")) continue;
      const delta = Number(String(row["Дельта ₽"] || "0").replace(",", ".")) || 0;
      if (code === "Comfort") {
        const base = Number(String(row["Итого конфиг ₽"] || "0").replace(",", ".")) || 56500;
        await repository.upsertPriceOption({
          code: "base",
          name: "База Comfort",
          delta: base,
          category: "База",
          comment: row["Комментарий"] || "",
        });
        priceOptions += 1;
      }
      await repository.upsertPriceOption({
        code,
        name: String(row["Название"] || code),
        delta,
        category,
        comment: row["Комментарий"] || "",
      });
      priceOptions += 1;
    }
  }

  const thresholdFiles = listImageFiles(thresholdDir);
  if (thresholdFiles[0]) {
    await repository.upsertPriceOption({
      code: "thresholdImage",
      name: "Порог",
      delta: 0,
      category: "asset",
      comment: publicUrl("threshold", thresholdFiles[0]),
    });
    priceOptions += 1;
  }

  return {
    parserDir: sourceDir,
    destRoot,
    composites: compositeStats,
    metalHires,
    layers: layerStats,
    models,
    nomenclature,
    furniture,
    priceOptions,
  };
};

module.exports = {
  PUBLIC_PREFIX,
  importDorstonConfigurator,
};
