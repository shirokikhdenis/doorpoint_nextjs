const { query, withTransaction } = require("../db/postgres");
const { ensureServicesTables } = require("../db/schemaPatches");
const { DEFAULT_SERVICE_SECTIONS } = require("../domain/defaultServices");

const mapRow = (row) => ({
  id: Number(row.id),
  sectionId: Number(row.sectionId),
  name: String(row.name || ""),
  price: String(row.price || ""),
  notes: String(row.notes || ""),
  sortOrder: Number(row.sortOrder) || 0,
});

const mapSection = (row, rows = []) => ({
  id: Number(row.id),
  title: String(row.title || ""),
  sortOrder: Number(row.sortOrder) || 0,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  rows: rows.map(mapRow),
});

const seedDefaultServices = async () => {
  await withTransaction(async (client) => {
    for (const section of DEFAULT_SERVICE_SECTIONS) {
      const sectionRes = await client.query(
        `
        INSERT INTO service_sections(title, sort_order)
        VALUES ($1, $2)
        RETURNING id
        `,
        [section.title, section.sortOrder],
      );
      const sectionId = Number(sectionRes.rows[0].id);
      let rowOrder = 0;
      for (const row of section.rows) {
        rowOrder += 10;
        await client.query(
          `
          INSERT INTO service_rows(section_id, name, price, notes, sort_order)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [sectionId, row.name, row.price, row.notes, rowOrder],
        );
      }
    }
  });
};

const ensureDefaultSeed = async () => {
  await ensureServicesTables();
  const countRes = await query(`SELECT COUNT(*)::int AS count FROM service_sections`);
  if (Number(countRes.rows[0]?.count) > 0) return;
  await seedDefaultServices();
};

const listSections = async () => {
  await ensureDefaultSeed();
  const sectionsRes = await query(
    `
    SELECT
      id,
      title,
      sort_order AS "sortOrder",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM service_sections
    ORDER BY sort_order ASC, id ASC
    `,
  );
  if (sectionsRes.rows.length === 0) return [];

  const rowsRes = await query(
    `
    SELECT
      id,
      section_id AS "sectionId",
      name,
      price,
      notes,
      sort_order AS "sortOrder"
    FROM service_rows
    ORDER BY sort_order ASC, id ASC
    `,
  );
  const rowsBySection = new Map();
  for (const row of rowsRes.rows) {
    const sectionId = Number(row.sectionId);
    if (!rowsBySection.has(sectionId)) rowsBySection.set(sectionId, []);
    rowsBySection.get(sectionId).push(row);
  }

  return sectionsRes.rows.map((row) =>
    mapSection(row, rowsBySection.get(Number(row.id)) || []),
  );
};

const getSectionById = async (id) => {
  await ensureDefaultSeed();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const sectionRes = await query(
    `
    SELECT
      id,
      title,
      sort_order AS "sortOrder",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM service_sections
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );
  if (sectionRes.rows.length === 0) return null;

  const rowsRes = await query(
    `
    SELECT
      id,
      section_id AS "sectionId",
      name,
      price,
      notes,
      sort_order AS "sortOrder"
    FROM service_rows
    WHERE section_id = $1
    ORDER BY sort_order ASC, id ASC
    `,
    [numericId],
  );

  return mapSection(sectionRes.rows[0], rowsRes.rows);
};

const createSection = async ({ title, sortOrder }) => {
  await ensureDefaultSeed();
  const safeTitle = String(title || "").trim();
  if (!safeTitle) throw new Error("Укажите название раздела");

  const res = await query(
    `
    INSERT INTO service_sections(title, sort_order)
    VALUES ($1, $2)
    RETURNING
      id,
      title,
      sort_order AS "sortOrder",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [safeTitle, Number(sortOrder) || 0],
  );
  return mapSection(res.rows[0], []);
};

const updateSection = async (id, { title, sortOrder }) => {
  await ensureDefaultSeed();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const safeTitle = title !== undefined ? String(title || "").trim() : undefined;
  if (safeTitle !== undefined && !safeTitle) throw new Error("Название раздела не может быть пустым");

  const res = await query(
    `
    UPDATE service_sections
    SET
      title = COALESCE($2, title),
      sort_order = COALESCE($3, sort_order),
      updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [
      numericId,
      safeTitle ?? null,
      sortOrder !== undefined ? Number(sortOrder) || 0 : null,
    ],
  );
  if (res.rows.length === 0) return null;
  return getSectionById(numericId);
};

const deleteSection = async (id) => {
  await ensureDefaultSeed();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const res = await query(`DELETE FROM service_sections WHERE id = $1 RETURNING id`, [numericId]);
  return res.rows[0] ? { id: numericId } : null;
};

const createRow = async ({ sectionId, name, price, notes, sortOrder }) => {
  await ensureDefaultSeed();
  const numericSectionId = Number(sectionId);
  if (!Number.isInteger(numericSectionId) || numericSectionId <= 0) {
    throw new Error("Некорректный раздел");
  }

  const safeName = String(name || "").trim();
  if (!safeName) throw new Error("Укажите название услуги");

  const section = await getSectionById(numericSectionId);
  if (!section) throw new Error("Раздел не найден");

  const res = await query(
    `
    INSERT INTO service_rows(section_id, name, price, notes, sort_order)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      section_id AS "sectionId",
      name,
      price,
      notes,
      sort_order AS "sortOrder"
    `,
    [
      numericSectionId,
      safeName,
      String(price || "").trim(),
      String(notes || "").trim(),
      sortOrder !== undefined ? Number(sortOrder) || 0 : section.rows.length * 10 + 10,
    ],
  );
  return mapRow(res.rows[0]);
};

const updateRow = async (id, { name, price, notes, sortOrder }) => {
  await ensureDefaultSeed();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const safeName = name !== undefined ? String(name || "").trim() : undefined;
  if (safeName !== undefined && !safeName) throw new Error("Название услуги не может быть пустым");

  const res = await query(
    `
    UPDATE service_rows
    SET
      name = COALESCE($2, name),
      price = COALESCE($3, price),
      notes = COALESCE($4, notes),
      sort_order = COALESCE($5, sort_order)
    WHERE id = $1
    RETURNING
      id,
      section_id AS "sectionId",
      name,
      price,
      notes,
      sort_order AS "sortOrder"
    `,
    [
      numericId,
      safeName ?? null,
      price !== undefined ? String(price || "").trim() : null,
      notes !== undefined ? String(notes || "").trim() : null,
      sortOrder !== undefined ? Number(sortOrder) || 0 : null,
    ],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const deleteRow = async (id) => {
  await ensureDefaultSeed();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const res = await query(`DELETE FROM service_rows WHERE id = $1 RETURNING id`, [numericId]);
  return res.rows[0] ? { id: numericId } : null;
};

module.exports = {
  listSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  createRow,
  updateRow,
  deleteRow,
  seedDefaultServices,
};
