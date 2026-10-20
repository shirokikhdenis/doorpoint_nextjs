const fs = require("fs/promises");
const path = require("path");
const repository = require("../repositories/configuratorCatalogRepository");
const { getUploadsRoot } = require("../uploadsPath");
const { compositeKey } = require("../../configurator/apartment-visual");

const IMAGE_EXTS = new Set([".webp", ".png", ".jpg", ".jpeg"]);

const publicLayerUrl = (...segments) =>
  `/uploads/configurator/apartment/${segments.map((part) => String(part).replace(/^\/+/, "")).join("/")}`;

const listImageFiles = async (dir) => {
  try {
    const files = await fs.readdir(dir);
    return files.filter((name) => IMAGE_EXTS.has(path.extname(name).toLowerCase()));
  } catch {
    return [];
  }
};

const listCompositeKeys = async (side) => {
  const files = await listImageFiles(path.join(getUploadsRoot(), "configurator", "apartment", side));
  return files
    .map((name) => {
      const base = name.replace(/\.[^.]+$/, "");
      const split = base.indexOf(" ");
      if (split <= 0) return null;
      return compositeKey(base.slice(0, split), base.slice(split + 1));
    })
    .filter(Boolean);
};

const listKeyedLayerUrls = async (subdir, keyedBy) => {
  const dir = path.join(getUploadsRoot(), "configurator", "apartment", "layers", subdir);
  const files = await listImageFiles(dir);
  const urls = {};
  for (const file of files) {
    const base = file.replace(/\.[^.]+$/, "");
    const key =
      keyedBy === "name"
        ? base
        : (() => {
            const split = base.indexOf(" ");
            return split > 0 ? compositeKey(base.slice(0, split), base.slice(split + 1)) : "";
          })();
    if (!key) continue;
    urls[key] = publicLayerUrl("layers", subdir, file);
  }
  return urls;
};

const getApartmentCatalog = async () => {
  const [
    models,
    nomenclature,
    furnitures,
    priceOptions,
    exteriorComposites,
    interiorComposites,
    casingUrls,
    casingPaintUrls,
    insertUrls,
    leafInsertUrls,
    hingeUrls,
    thresholdUrls,
    boxFiles,
  ] = await Promise.all([
    repository.listModels(),
    repository.listNomenclature(),
    repository.listFurniture(),
    repository.listPriceOptions(),
    listCompositeKeys("exterior"),
    listCompositeKeys("interior"),
    listKeyedLayerUrls("casing", "composite"),
    listKeyedLayerUrls("casing-paint", "name"),
    listKeyedLayerUrls("inserts", "composite"),
    listKeyedLayerUrls("leaf-inserts", "composite"),
    listKeyedLayerUrls("hinges", "name"),
    listKeyedLayerUrls("threshold", "name"),
    listImageFiles(path.join(getUploadsRoot(), "configurator", "apartment", "layers", "box")),
  ]);

  const byKind = (kind) => nomenclature.filter((item) => item.kind === kind);

  const threshold = priceOptions.find((item) => item.code === "thresholdImage");

  return {
    models,
    paints: byKind("paint"),
    films: byKind("film"),
    handles: byKind("handle"),
    cylinders: byKind("cylinder"),
    locks: {
      primary: byKind("lock_primary"),
      secondary: byKind("lock_secondary"),
    },
    furnitures,
    priceOptions: priceOptions.filter((item) => item.code !== "thresholdImage"),
    composites: {
      exterior: exteriorComposites,
      interior: interiorComposites,
    },
    layerUrls: {
      casing: casingUrls,
      casingPaint: casingPaintUrls,
      insert: insertUrls,
      leafInsert: leafInsertUrls,
      hinge: hingeUrls,
      threshold: {
        exterior: thresholdUrls.exterior || "",
        interior: thresholdUrls.interior || "",
        ui: thresholdUrls.ui || "",
      },
      box: {
        Opened: boxFiles.includes("Opened.webp") ? publicLayerUrl("layers", "box", "Opened.webp") : "",
        Closed: boxFiles.includes("Closed.webp") ? publicLayerUrl("layers", "box", "Closed.webp") : "",
      },
    },
    thresholdImageUrl: threshold?.comment || "",
  };
};

module.exports = {
  getApartmentCatalog,
};
