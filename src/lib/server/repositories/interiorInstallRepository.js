const { query } = require("../db/postgres");
const { ensureInteriorInstallTables } = require("../db/schemaPatches");

const brigadeSelect = `
  id,
  name,
  color,
  sort_order AS "sortOrder",
  is_active AS "isActive",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const installationSelect = `
  i.id,
  i.install_date::text AS "installDate",
  i.install_end_date::text AS "installEndDate",
  i.lead_id AS "leadId",
  i.order_number AS "orderNumber",
  i.doors_summary AS "doorsSummary",
  i.specification,
  i.brigade_id AS "brigadeId",
  i.kind,
  i.doors_on_site AS "doorsOnSite",
  i.customer_name AS "customerName",
  i.phone,
  i.address,
  i.notes,
  i.created_at AS "createdAt",
  i.updated_at AS "updatedAt",
  b.name AS "brigadeName",
  b.color AS "brigadeColor",
  b.is_active AS "brigadeIsActive"
`;

const mapBrigade = (row) => ({
  id: Number(row.id),
  name: String(row.name || ""),
  color: String(row.color || "#2563eb"),
  sortOrder: Number(row.sortOrder) || 0,
  isActive: Boolean(row.isActive),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapInstallation = (row) => ({
  id: Number(row.id),
  installDate: String(row.installDate || "").slice(0, 10),
  installEndDate: String(row.installEndDate || row.installDate || "").slice(0, 10),
  leadId: row.leadId != null ? Number(row.leadId) : null,
  orderNumber: String(row.orderNumber || ""),
  doorsSummary: String(row.doorsSummary || ""),
  specification: String(row.specification || ""),
  kind: row.kind === "delivery" ? "delivery" : "install",
  brigadeId: row.brigadeId != null ? Number(row.brigadeId) : null,
  doorsOnSite: Boolean(row.doorsOnSite),
  customerName: String(row.customerName || ""),
  phone: String(row.phone || ""),
  address: String(row.address || ""),
  notes: String(row.notes || ""),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  brigadeName: String(row.brigadeName || ""),
  brigadeColor: String(row.brigadeColor || "#2563eb"),
  brigadeIsActive: row.brigadeIsActive !== false,
});

const listBrigades = async ({ includeInactive = true } = {}) => {
  await ensureInteriorInstallTables();
  const res = await query(
    `
    SELECT ${brigadeSelect}
    FROM installation_brigades
    ${includeInactive ? "" : "WHERE is_active = TRUE"}
    ORDER BY sort_order ASC, id ASC
    `,
  );
  return res.rows.map(mapBrigade);
};

const getBrigadeById = async (id) => {
  await ensureInteriorInstallTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    SELECT ${brigadeSelect}
    FROM installation_brigades
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );
  return res.rows[0] ? mapBrigade(res.rows[0]) : null;
};

const countBrigades = async () => {
  await ensureInteriorInstallTables();
  const res = await query(`SELECT COUNT(*)::int AS count FROM installation_brigades`);
  return Number(res.rows[0]?.count) || 0;
};

const createBrigade = async (payload) => {
  await ensureInteriorInstallTables();
  const res = await query(
    `
    INSERT INTO installation_brigades (name, color, sort_order, is_active)
    VALUES ($1, $2, $3, $4)
    RETURNING ${brigadeSelect}
    `,
    [payload.name, payload.color, payload.sortOrder, payload.isActive],
  );
  return mapBrigade(res.rows[0]);
};

const updateBrigade = async (id, payload) => {
  await ensureInteriorInstallTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    UPDATE installation_brigades
    SET
      name = $2,
      color = $3,
      sort_order = $4,
      is_active = $5,
      updated_at = NOW()
    WHERE id = $1
    RETURNING ${brigadeSelect}
    `,
    [numericId, payload.name, payload.color, payload.sortOrder, payload.isActive],
  );
  return res.rows[0] ? mapBrigade(res.rows[0]) : null;
};

const countInstallationsForBrigade = async (brigadeId) => {
  await ensureInteriorInstallTables();
  const numericId = Number(brigadeId);
  if (!Number.isInteger(numericId) || numericId <= 0) return 0;
  const res = await query(
    `SELECT COUNT(*)::int AS count FROM interior_installations WHERE brigade_id = $1`,
    [numericId],
  );
  return Number(res.rows[0]?.count) || 0;
};

const deleteBrigade = async (id) => {
  await ensureInteriorInstallTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return false;
  const res = await query(`DELETE FROM installation_brigades WHERE id = $1 RETURNING id`, [numericId]);
  return Boolean(res.rows[0]);
};

const listInstallations = async ({ from, to, brigadeId } = {}) => {
  await ensureInteriorInstallTables();
  const params = [from, to];
  const clauses = [
    "i.install_date <= $2::date",
    "COALESCE(i.install_end_date, i.install_date) >= $1::date",
  ];
  if (brigadeId) {
    params.push(Number(brigadeId));
    clauses.push(`i.brigade_id = $${params.length}`);
  }
  const res = await query(
    `
    SELECT ${installationSelect}
    FROM interior_installations i
    LEFT JOIN installation_brigades b ON b.id = i.brigade_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY i.install_date ASC,
      CASE WHEN i.kind = 'delivery' THEN 0 ELSE 1 END,
      COALESCE(b.sort_order, 0) ASC,
      i.id ASC
    `,
    params,
  );
  return res.rows.map(mapInstallation);
};

const getUpcomingByKind = async (kind) => {
  await ensureInteriorInstallTables();
  const entryKind = kind === "delivery" ? "delivery" : "install";
  const res = await query(
    `
    SELECT ${installationSelect}
    FROM interior_installations i
    LEFT JOIN installation_brigades b ON b.id = i.brigade_id
    WHERE i.kind = $1
      AND COALESCE(i.install_end_date, i.install_date) >= CURRENT_DATE
    ORDER BY
      CASE WHEN i.install_date <= CURRENT_DATE THEN 0 ELSE 1 END,
      i.install_date ASC,
      i.id ASC
    LIMIT 1
    `,
    [entryKind],
  );
  return res.rows[0] ? mapInstallation(res.rows[0]) : null;
};

const listInstallationsByLeadId = async (leadId) => {
  await ensureInteriorInstallTables();
  const numericId = Number(leadId);
  if (!Number.isInteger(numericId) || numericId <= 0) return [];
  const res = await query(
    `
    SELECT ${installationSelect}
    FROM interior_installations i
    LEFT JOIN installation_brigades b ON b.id = i.brigade_id
    WHERE i.lead_id = $1
    ORDER BY i.install_date ASC, i.id ASC
    `,
    [numericId],
  );
  return res.rows.map(mapInstallation);
};

const listScheduleDatesByLeadIds = async (leadIds) => {
  await ensureInteriorInstallTables();
  const ids = [
    ...new Set(
      (Array.isArray(leadIds) ? leadIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  ];
  if (ids.length === 0) return [];
  const res = await query(
    `
    SELECT DISTINCT ON (i.lead_id, i.kind)
      i.id,
      i.lead_id AS "leadId",
      i.kind,
      i.install_date::text AS "installDate",
      COALESCE(i.install_end_date, i.install_date)::text AS "installEndDate"
    FROM interior_installations i
    WHERE i.lead_id = ANY($1::bigint[])
    ORDER BY i.lead_id, i.kind, i.install_date ASC, i.id ASC
    `,
    [ids],
  );
  return res.rows.map((row) => ({
    id: Number(row.id),
    leadId: Number(row.leadId),
    kind: row.kind === "delivery" ? "delivery" : "install",
    installDate: String(row.installDate || "").slice(0, 10),
    installEndDate: String(row.installEndDate || row.installDate || "").slice(0, 10),
  }));
};

const getInstallationById = async (id) => {
  await ensureInteriorInstallTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    SELECT ${installationSelect}
    FROM interior_installations i
    LEFT JOIN installation_brigades b ON b.id = i.brigade_id
    WHERE i.id = $1
    LIMIT 1
    `,
    [numericId],
  );
  return res.rows[0] ? mapInstallation(res.rows[0]) : null;
};

const createInstallation = async (payload) => {
  await ensureInteriorInstallTables();
  const res = await query(
    `
    INSERT INTO interior_installations (
      install_date,
      install_end_date,
      lead_id,
      order_number,
      doors_summary,
      specification,
      brigade_id,
      kind,
      doors_on_site,
      customer_name,
      phone,
      address,
      notes
    )
    VALUES ($1::date, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
    `,
    [
      payload.installDate,
      payload.installEndDate,
      payload.leadId,
      payload.orderNumber,
      payload.doorsSummary,
      payload.specification,
      payload.brigadeId,
      payload.kind,
      payload.doorsOnSite,
      payload.customerName,
      payload.phone,
      payload.address,
      payload.notes,
    ],
  );
  return getInstallationById(res.rows[0].id);
};

const updateInstallation = async (id, payload) => {
  await ensureInteriorInstallTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    UPDATE interior_installations
    SET
      install_date = $2::date,
      install_end_date = $3::date,
      lead_id = $4,
      order_number = $5,
      doors_summary = $6,
      specification = $7,
      brigade_id = $8,
      kind = $9,
      doors_on_site = $10,
      customer_name = $11,
      phone = $12,
      address = $13,
      notes = $14,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [
      numericId,
      payload.installDate,
      payload.installEndDate,
      payload.leadId,
      payload.orderNumber,
      payload.doorsSummary,
      payload.specification,
      payload.brigadeId,
      payload.kind,
      payload.doorsOnSite,
      payload.customerName,
      payload.phone,
      payload.address,
      payload.notes,
    ],
  );
  if (!res.rows[0]) return null;
  return getInstallationById(res.rows[0].id);
};

const deleteInstallation = async (id) => {
  await ensureInteriorInstallTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return false;
  const res = await query(`DELETE FROM interior_installations WHERE id = $1 RETURNING id`, [
    numericId,
  ]);
  return Boolean(res.rows[0]);
};

module.exports = {
  listBrigades,
  getBrigadeById,
  countBrigades,
  createBrigade,
  updateBrigade,
  countInstallationsForBrigade,
  deleteBrigade,
  listInstallations,
  getUpcomingByKind,
  listInstallationsByLeadId,
  listScheduleDatesByLeadIds,
  getInstallationById,
  createInstallation,
  updateInstallation,
  deleteInstallation,
};
