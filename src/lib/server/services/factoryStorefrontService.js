const factoryCardRepository = require("../repositories/factoryCardRepository");
const collectionCardRepository = require("../repositories/collectionCardRepository");
const productRepository = require("../repositories/productRepository");
const {
  FACTORY_SECTIONS,
  getFactorySectionById,
  findFactoryInSection,
  manufacturerCollectionsPath,
} = require("../../../lib/factory-sections");
const { manufacturerSlug } = require("../../../lib/factory-slug");
const { resolveCollectionAttrCode } = require("../domain/collectionAttrCode");

const indexByLowerName = (rows, key = "name") => {
  const map = new Map();
  rows.forEach((row) => {
    const value = String(row[key] || "").trim().toLowerCase();
    if (value) map.set(value, row);
  });
  return map;
};

const resolveImageUrl = (imageUrl, fallback) => {
  const custom = String(imageUrl || "").trim();
  if (custom) return custom;
  const fromCatalog = String(fallback || "").trim();
  return fromCatalog || null;
};

const DEFAULT_FACTORY_BADGE_LABEL = "Фабрика";
const FACTORY_LINK_TARGETS = new Set(["collections", "catalog"]);

const resolveBadgeLabel = (badgeLabel) => {
  const custom = String(badgeLabel || "").trim();
  return custom || DEFAULT_FACTORY_BADGE_LABEL;
};

const resolveLinkTarget = (linkTarget) => {
  const value = String(linkTarget || "").trim().toLowerCase();
  return FACTORY_LINK_TARGETS.has(value) ? value : "collections";
};

const normalizeStorefrontCardDescription = (value) => {
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "описание") return "";
  return text;
};

const indexSampleImagesByScope = (rows, limit = 3) => {
  const map = new Map();
  rows.forEach((row) => {
    const key = String(row.scopeName || "").trim().toLowerCase();
    const image = String(row.image || "").trim();
    if (!key || !image) return;
    if (!map.has(key)) map.set(key, []);
    const bucket = map.get(key);
    if (bucket.length >= limit || bucket.includes(image)) return;
    bucket.push(image);
  });
  return map;
};

/** [backLeft, backRight, front] — для эксперимента с тремя дверями на ярлыке */
const buildLabelDoorImages = (preferredImage, sampleImages = []) => {
  const merged = [];
  const seen = new Set();
  const push = (url) => {
    const trimmed = String(url || "").trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    merged.push(trimmed);
  };
  push(preferredImage);
  sampleImages.forEach(push);
  if (!merged.length) return [];
  const front = merged[0];
  const backLeft = merged[1] ?? front;
  const backRight = merged[2] ?? merged[1] ?? front;
  return [backLeft, backRight, front];
};

const resolveFactoryCardHref = (section, manufacturerName, linkTarget, buildManufacturerCatalogHref) => {
  if (resolveLinkTarget(linkTarget) === "catalog") {
    return buildManufacturerCatalogHref(manufacturerName, section.catalogPageSlug);
  }
  return manufacturerCollectionsPath(section.id, manufacturerName);
};

/** Сначала фабрики из конфига (порядок), затем остальные из каталога. */
const mergeSectionManufacturers = (section, productRows) => {
  const names = [];
  const seen = new Set();
  const push = (name) => {
    const trimmed = String(name || "").trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) return;
    seen.add(key);
    names.push(trimmed);
  };
  section.manufacturers.forEach(push);
  productRows.forEach((row) => push(row.name));
  return names;
};

const resolveManufacturerInSection = async (sectionId, manufacturerSlugValue) => {
  const fromConfig = findFactoryInSection(sectionId, manufacturerSlugValue);
  if (fromConfig) return fromConfig;

  const section = getFactorySectionById(sectionId);
  if (!section) return null;
  const slug = String(manufacturerSlugValue || "").trim().toLowerCase();
  if (!slug) return null;

  const productRows = await productRepository.listPublicManufacturers({
    categoryRootSlug: section.categoryRootSlug,
  });
  const manufacturer = productRows.find(
    (row) => manufacturerSlug(row.name).toLowerCase() === slug,
  )?.name;
  if (!manufacturer) return null;
  return { section, manufacturer };
};

const syncFactoryCards = async (sectionId) => {
  const section = getFactorySectionById(sectionId);
  if (!section) return { ok: false, message: "Раздел не найден" };
  const productRows = await productRepository.listPublicManufacturers({
    categoryRootSlug: section.categoryRootSlug,
  });
  const manufacturerNames = mergeSectionManufacturers(section, productRows);
  await Promise.all(
    manufacturerNames.map((name, index) =>
      factoryCardRepository.upsertIfMissing({
        sectionId: section.id,
        manufacturerName: name,
        sortOrder: index * 10,
      }),
    ),
  );
  return { ok: true };
};

const syncCollectionCards = async (sectionId, manufacturerName) => {
  const section = getFactorySectionById(sectionId);
  if (!section) return { ok: false, message: "Раздел не найден" };
  const manufacturer = String(manufacturerName || "").trim();
  if (!manufacturer) return { ok: false, message: "Укажите производителя" };

  const productRows = await productRepository.listPublicManufacturers({
    categoryRootSlug: section.categoryRootSlug,
  });
  const allowed = mergeSectionManufacturers(section, productRows);
  if (!allowed.some((name) => name.toLowerCase() === manufacturer.toLowerCase())) {
    return { ok: false, message: "Производитель не найден в разделе" };
  }
  const collectionAttrCode = await resolveCollectionAttrCode();
  const collections = await productRepository.listPublicCollections({
    categoryRootSlug: section.categoryRootSlug,
    manufacturerName: manufacturer,
    collectionAttrCode,
  });
  await Promise.all(
    collections.map((row, index) =>
      collectionCardRepository.upsertIfMissing({
        sectionId: section.id,
        manufacturerName: manufacturer,
        collectionName: row.name,
        sortOrder: index * 10,
      }),
    ),
  );
  return { ok: true };
};

const listPublicFactorySections = async () => {
  const { buildManufacturerCatalogHref } = require("./collectionService");
  const { buildEntryFactoryCatalogLinks } = require("../domain/subcategoryRelatedDoors");
  const sections = await Promise.all(
    FACTORY_SECTIONS.map(async (section) => {
      await syncFactoryCards(section.id);
      const productRows = await productRepository.listPublicManufacturers({
        categoryRootSlug: section.categoryRootSlug,
      });
      const sampleRows = await productRepository.listPublicManufacturerSampleImages({
        categoryRootSlug: section.categoryRootSlug,
      });
      const samplesByName = indexSampleImagesByScope(sampleRows);
      const manufacturerNames = mergeSectionManufacturers(section, productRows);
      const settings = await factoryCardRepository.listBySection(section.id);
      const settingsByName = indexByLowerName(
        settings.map((row) => ({ ...row, name: row.manufacturerName })),
      );
      const productsByName = indexByLowerName(productRows);

      const factories = manufacturerNames
        .map((name, index) => {
          const setting = settingsByName.get(name.trim().toLowerCase());
          if (setting?.isActive === false) return null;
          const product = productsByName.get(name.trim().toLowerCase());
          const preferredDoorImage = resolveImageUrl(setting?.imageUrl, product?.coverImage);
          const linkTarget = resolveLinkTarget(setting?.linkTarget);
          const catalogLinks =
            section.id === "entry" && linkTarget === "catalog"
              ? buildEntryFactoryCatalogLinks(name)
              : null;
          return {
            name,
            badgeLabel: resolveBadgeLabel(setting?.badgeLabel),
            description: normalizeStorefrontCardDescription(setting?.description),
            productCount: product?.productCount ?? 0,
            logoImage: resolveImageUrl(setting?.logoUrl, null),
            doorImage: preferredDoorImage,
            doorImages: buildLabelDoorImages(
              preferredDoorImage,
              samplesByName.get(name.trim().toLowerCase()) || [],
            ),
            linkTarget,
            catalogLinks,
            href:
              catalogLinks?.[0]?.href ??
              resolveFactoryCardHref(section, name, linkTarget, buildManufacturerCatalogHref),
            sortOrder: setting?.sortOrder ?? index * 10,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ru"));

      return {
        id: section.id,
        title: section.title,
        factories,
      };
    }),
  );
  return sections;
};

const getPublicManufacturerCollectionsPage = async (
  sectionId,
  manufacturerSlugValue,
  deps = {},
) => {
  const buildCollectionCatalogHref =
    deps.buildCollectionCatalogHref || require("./collectionService").buildCollectionCatalogHref;
  const buildManufacturerCatalogHref =
    deps.buildManufacturerCatalogHref || require("./collectionService").buildManufacturerCatalogHref;

  const resolved = await resolveManufacturerInSection(sectionId, manufacturerSlugValue);
  if (!resolved) return null;

  const { section, manufacturer } = resolved;
  await syncCollectionCards(section.id, manufacturer);

  const collectionAttrCode = await resolveCollectionAttrCode();
  const [settings, productRows, sampleRows] = await Promise.all([
    collectionCardRepository.listByScope(section.id, manufacturer),
    productRepository.listPublicCollections({
      categoryRootSlug: section.categoryRootSlug,
      manufacturerName: manufacturer,
      collectionAttrCode,
    }),
    productRepository.listPublicCollectionSampleImages({
      categoryRootSlug: section.categoryRootSlug,
      manufacturerName: manufacturer,
      collectionAttrCode,
    }),
  ]);
  const samplesByName = indexSampleImagesByScope(sampleRows);

  const settingsByName = indexByLowerName(
    settings.map((row) => ({ ...row, name: row.collectionName })),
  );

  const collections = productRows
    .map((row, index) => {
      const setting = settingsByName.get(row.name.trim().toLowerCase());
      if (setting?.isActive === false) return null;
      const preferredCoverImage = resolveImageUrl(setting?.imageUrl, row.coverImage);
      return {
        name: row.name,
        description: normalizeStorefrontCardDescription(setting?.description),
        productCount: row.productCount,
        coverImage: preferredCoverImage,
        doorImages: buildLabelDoorImages(
          preferredCoverImage,
          samplesByName.get(row.name.trim().toLowerCase()) || [],
        ),
        catalogHref: buildCollectionCatalogHref(
          section.catalogPageSlug,
          manufacturer,
          row.name,
          collectionAttrCode,
        ),
        sortOrder: setting?.sortOrder ?? index * 10,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ru"));

  return {
    section: {
      id: section.id,
      title: section.title,
      catalogPageSlug: section.catalogPageSlug,
    },
    manufacturer,
    manufacturerCatalogHref: buildManufacturerCatalogHref(manufacturer, section.catalogPageSlug),
    collections,
  };
};

const listAdminFactoryCards = async (sectionId) => {
  const section = getFactorySectionById(sectionId);
  if (!section) return { ok: false, message: "Раздел не найден", status: 404 };
  await syncFactoryCards(section.id);

  const productRows = await productRepository.listPublicManufacturers({
    categoryRootSlug: section.categoryRootSlug,
  });
  const manufacturerNames = mergeSectionManufacturers(section, productRows);
  const settings = await factoryCardRepository.listBySection(section.id);
  const settingsByName = indexByLowerName(
    settings.map((row) => ({ ...row, name: row.manufacturerName })),
  );
  const productsByName = indexByLowerName(productRows);

  const cards = manufacturerNames
    .map((manufacturerName, index) => {
      const setting =
        settingsByName.get(manufacturerName.trim().toLowerCase()) ||
        settings.find((row) => row.manufacturerName === manufacturerName);
      if (!setting) return null;
      const product = productsByName.get(manufacturerName.trim().toLowerCase());
      return {
        id: setting.id,
        manufacturerName,
        description: setting.description,
        isActive: setting.isActive,
        imageUrl: setting.imageUrl,
        logoUrl: setting.logoUrl,
        badgeLabel: setting.badgeLabel,
        linkTarget: resolveLinkTarget(setting.linkTarget),
        sortOrder: setting.sortOrder ?? index * 10,
        productCount: product?.productCount ?? 0,
        defaultCoverImage: product?.coverImage ?? null,
        previewDoorImage: resolveImageUrl(setting.imageUrl, product?.coverImage),
        previewLogoImage: resolveImageUrl(setting.logoUrl, null),
        collectionsAdminPath: `/admin/factory-collections?sectionId=${encodeURIComponent(section.id)}&manufacturer=${encodeURIComponent(manufacturerName)}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.manufacturerName.localeCompare(b.manufacturerName, "ru"));

  return {
    ok: true,
    section: { id: section.id, title: section.title },
    cards,
  };
};

const updateAdminFactoryCard = async (id, payload) => {
  const existing = await factoryCardRepository.getById(id);
  if (!existing) return { ok: false, message: "Карточка не найдена", status: 404 };
  const updated = await factoryCardRepository.update(id, {
    isActive: payload.isActive,
    imageUrl: payload.imageUrl,
    logoUrl: payload.logoUrl,
    badgeLabel: payload.badgeLabel,
    linkTarget: payload.linkTarget,
    sortOrder: payload.sortOrder,
    description: payload.description,
  });
  if (!updated) return { ok: false, message: "Не удалось сохранить", status: 400 };
  return { ok: true, card: updated };
};

const listAdminCollectionCards = async (sectionId, manufacturerName) => {
  const section = getFactorySectionById(sectionId);
  if (!section) return { ok: false, message: "Раздел не найден", status: 404 };
  const manufacturer = String(manufacturerName || "").trim();
  const manufacturerRows = await productRepository.listPublicManufacturers({
    categoryRootSlug: section.categoryRootSlug,
  });
  const allowed = mergeSectionManufacturers(section, manufacturerRows);
  if (!manufacturer || !allowed.some((name) => name.toLowerCase() === manufacturer.toLowerCase())) {
    return { ok: false, message: "Производитель не найден в разделе", status: 404 };
  }
  await syncCollectionCards(section.id, manufacturer);

  const collectionAttrCode = await resolveCollectionAttrCode();
  const [settings, collectionRows] = await Promise.all([
    collectionCardRepository.listByScope(section.id, manufacturer),
    productRepository.listPublicCollections({
      categoryRootSlug: section.categoryRootSlug,
      manufacturerName: manufacturer,
      collectionAttrCode,
    }),
  ]);
  const settingsByName = indexByLowerName(
    settings.map((row) => ({ ...row, name: row.collectionName })),
  );
  const productsByName = indexByLowerName(collectionRows);

  const cards = settings
    .map((setting, index) => {
      const product = productsByName.get(setting.collectionName.trim().toLowerCase());
      return {
        id: setting.id,
        collectionName: setting.collectionName,
        description: setting.description,
        isActive: setting.isActive,
        imageUrl: setting.imageUrl,
        sortOrder: setting.sortOrder ?? index * 10,
        productCount: product?.productCount ?? 0,
        defaultCoverImage: product?.coverImage ?? null,
        previewImage: resolveImageUrl(setting.imageUrl, product?.coverImage),
        inCatalog: Boolean(product),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.collectionName.localeCompare(b.collectionName, "ru"));

  // Include collections from catalog not yet in settings (shouldn't happen after sync)
  collectionRows.forEach((row, index) => {
    if (settingsByName.has(row.name.trim().toLowerCase())) return;
    cards.push({
      id: 0,
      collectionName: row.name,
      description: "",
      isActive: true,
      imageUrl: null,
      sortOrder: index * 10,
      productCount: row.productCount,
      defaultCoverImage: row.coverImage,
      previewImage: row.coverImage,
      inCatalog: true,
    });
  });

  return {
    ok: true,
    section: { id: section.id, title: section.title },
    manufacturer,
    cards,
  };
};

const updateAdminCollectionCard = async (id, payload) => {
  const existing = await collectionCardRepository.getById(id);
  if (!existing) return { ok: false, message: "Карточка не найдена", status: 404 };
  const updated = await collectionCardRepository.update(id, {
    isActive: payload.isActive,
    imageUrl: payload.imageUrl,
    sortOrder: payload.sortOrder,
    description: payload.description,
  });
  if (!updated) return { ok: false, message: "Не удалось сохранить", status: 400 };
  return { ok: true, card: updated };
};

module.exports = {
  syncFactoryCards,
  syncCollectionCards,
  listPublicFactorySections,
  getPublicManufacturerCollectionsPage,
  listAdminFactoryCards,
  updateAdminFactoryCard,
  listAdminCollectionCards,
  updateAdminCollectionCard,
};
