const { query, withTransaction } = require("../db/postgres");
const { ensureDoorFactoryFittingBrandTables } = require("../db/schemaPatches");
const {
  INTERIOR_DOORS_CATEGORY_SLUG,
  FITTINGS_ROOT_SLUG,
  uniqueSortedNames,
} = require("../domain/doorFactoryFittingBrands");

const taxonomyJoin = `
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories parent ON parent.id = c.parent_id
`;

const listDistinctManufacturersByRootSlug = async (rootSlug) => {
  const slug = String(rootSlug || "").trim();
  if (!slug) return [];
  const res = await query(
    `
    SELECT DISTINCT TRIM(p.attrs->>'manufacturer') AS name
    FROM products p
    ${taxonomyJoin}
    WHERE p.is_active = TRUE
      AND TRIM(COALESCE(p.attrs->>'manufacturer', '')) <> ''
      AND COALESCE(parent.slug, c.slug) = $1
    ORDER BY name
    `,
    [slug],
  );
  return uniqueSortedNames(res.rows.map((row) => row.name));
};

const listDoorManufacturers = () => listDistinctManufacturersByRootSlug(INTERIOR_DOORS_CATEGORY_SLUG);

const listFittingsManufacturers = () => listDistinctManufacturersByRootSlug(FITTINGS_ROOT_SLUG);

const listMappings = async () => {
  await ensureDoorFactoryFittingBrandTables();
  const res = await query(
    `
    SELECT
      door_manufacturer_name AS "doorManufacturerName",
      fittings_manufacturer_name AS "fittingsManufacturerName"
    FROM door_factory_fitting_brands
    ORDER BY door_manufacturer_name ASC
    `,
  );
  return res.rows.map((row) => ({
    doorManufacturerName: String(row.doorManufacturerName || "").trim(),
    fittingsManufacturerName: String(row.fittingsManufacturerName || "").trim(),
  }));
};

const getFittingsManufacturerForDoorFactory = async (doorManufacturerName) => {
  await ensureDoorFactoryFittingBrandTables();
  const manufacturer = String(doorManufacturerName || "").trim();
  if (!manufacturer) return "";

  const res = await query(
    `
    SELECT fittings_manufacturer_name AS "fittingsManufacturerName"
    FROM door_factory_fitting_brands
    WHERE LOWER(TRIM(door_manufacturer_name)) = LOWER(TRIM($1))
    LIMIT 1
    `,
    [manufacturer],
  );
  return String(res.rows[0]?.fittingsManufacturerName || "").trim();
};

const replaceAll = async (items) => {
  await ensureDoorFactoryFittingBrandTables();
  const rows = Array.isArray(items) ? items : [];
  await withTransaction(async (client) => {
    await client.query("DELETE FROM door_factory_fitting_brands");
    for (const row of rows) {
      const doorManufacturerName = String(row.doorManufacturerName || "").trim();
      const fittingsManufacturerName = String(row.fittingsManufacturerName || "").trim();
      if (!doorManufacturerName || !fittingsManufacturerName) continue;
      await client.query(
        `
        INSERT INTO door_factory_fitting_brands (
          door_manufacturer_name,
          fittings_manufacturer_name
        )
        VALUES ($1, $2)
        `,
        [doorManufacturerName, fittingsManufacturerName],
      );
    }
  });
  return listMappings();
};

module.exports = {
  listDoorManufacturers,
  listFittingsManufacturers,
  listMappings,
  getFittingsManufacturerForDoorFactory,
  replaceAll,
};
