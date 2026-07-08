const { query } = require("../db/postgres");
const { ensureFactoryStorefrontTables } = require("../db/schemaPatches");
const homeFactoryLogoRepository = require("../repositories/homeFactoryLogoRepository");
const factoryService = require("./factoryService");
const factoryStorefrontService = require("./factoryStorefrontService");

const listDistinctManufacturersWithLogos = async () => {
  await ensureFactoryStorefrontTables();
  const res = await query(
    `
    SELECT DISTINCT ON (LOWER(TRIM(manufacturer_name)))
      manufacturer_name AS "manufacturerName",
      logo_url AS "logoUrl"
    FROM factory_cards
    WHERE NULLIF(TRIM(logo_url), '') IS NOT NULL
    ORDER BY LOWER(TRIM(manufacturer_name)), is_active DESC, sort_order ASC, id ASC
    `,
  );
  return res.rows.map((row) => ({
    manufacturerName: String(row.manufacturerName || ""),
    logoUrl: String(row.logoUrl || ""),
  }));
};

const buildFactoryHrefMap = async () => {
  const factories = await factoryService.listPublicFactories();
  const map = new Map();
  factories.forEach((item) => {
    const key = String(item.name || "").trim().toLowerCase();
    if (!key || map.has(key)) return;
    map.set(key, item.href || "/fabriki");
  });
  return map;
};

const bootstrapIfEmpty = async () => {
  const existing = await homeFactoryLogoRepository.listAll();
  if (existing.length > 0) return;

  const sections = await factoryStorefrontService.listPublicFactorySections();
  const seen = new Set();
  const entries = [];
  let sortOrder = 0;

  sections.forEach((section) => {
    section.factories.forEach((factory) => {
      const name = String(factory.name || "").trim();
      const key = name.toLowerCase();
      if (!name || !factory.logoImage || seen.has(key)) return;
      seen.add(key);
      entries.push({
        manufacturerName: name,
        sortOrder,
        isVisible: sortOrder < 12,
      });
      sortOrder += 1;
    });
  });

  if (entries.length > 0) {
    await homeFactoryLogoRepository.replaceAll(entries);
  }
};

const listPublicForHomepage = async () => {
  await bootstrapIfEmpty();
  const [configured, hrefMap, logos] = await Promise.all([
    homeFactoryLogoRepository.listVisible(),
    buildFactoryHrefMap(),
    listDistinctManufacturersWithLogos(),
  ]);
  const logoByName = new Map(
    logos.map((row) => [row.manufacturerName.trim().toLowerCase(), row.logoUrl]),
  );

  return configured
    .map((entry) => {
      const key = entry.manufacturerName.trim().toLowerCase();
      const logoUrl = logoByName.get(key);
      if (!logoUrl) return null;
      return {
        name: entry.manufacturerName,
        logoImage: logoUrl,
        href: hrefMap.get(key) || "/fabriki",
      };
    })
    .filter(Boolean);
};

const listAdminEntries = async () => {
  await bootstrapIfEmpty();
  const [configured, available] = await Promise.all([
    homeFactoryLogoRepository.listAll(),
    listDistinctManufacturersWithLogos(),
  ]);

  const configuredByName = new Map(
    configured.map((row) => [row.manufacturerName.trim().toLowerCase(), row]),
  );
  const availableNames = new Set(
    available.map((row) => row.manufacturerName.trim().toLowerCase()),
  );

  const merged = [...configured];
  available.forEach((row, index) => {
    const key = row.manufacturerName.trim().toLowerCase();
    if (configuredByName.has(key)) return;
    merged.push({
      id: 0,
      manufacturerName: row.manufacturerName,
      sortOrder: configured.length + index,
      isVisible: false,
    });
  });

  const logoByName = new Map(
    available.map((row) => [row.manufacturerName.trim().toLowerCase(), row.logoUrl]),
  );

  return merged
    .filter((row) => availableNames.has(row.manufacturerName.trim().toLowerCase()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.manufacturerName.localeCompare(b.manufacturerName, "ru"))
    .map((row) => ({
      manufacturerName: row.manufacturerName,
      sortOrder: row.sortOrder,
      isVisible: row.isVisible,
      logoUrl: logoByName.get(row.manufacturerName.trim().toLowerCase()) || "",
    }));
};

const saveAdminEntries = async (items) => {
  if (!Array.isArray(items)) {
    return { ok: false, message: "Некорректный список" };
  }

  const available = await listDistinctManufacturersWithLogos();
  const availableNames = new Set(
    available.map((row) => row.manufacturerName.trim().toLowerCase()),
  );

  const normalized = [];
  const seen = new Set();

  for (let index = 0; index < items.length; index += 1) {
    const raw = items[index] || {};
    const manufacturerName = String(raw.manufacturerName || "").trim();
    const key = manufacturerName.toLowerCase();
    if (!manufacturerName || !availableNames.has(key) || seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      manufacturerName,
      sortOrder: index,
      isVisible: raw.isVisible === true,
    });
  }

  await homeFactoryLogoRepository.replaceAll(normalized);
  return { ok: true, items: normalized };
};

module.exports = {
  listPublicForHomepage,
  listAdminEntries,
  saveAdminEntries,
  bootstrapIfEmpty,
};
