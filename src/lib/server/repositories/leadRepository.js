const { query, withTransaction } = require("../db/postgres");
const { ensureLeadTables } = require("../db/schemaPatches");
const { computeLeadTotals, normalizeDiscountKind } = require("../domain/leadPricing");

const leadSelectFields = `
  id,
  type,
  customer_name AS "customerName",
  address,
  phone,
  contract_number AS "contractNumber",
  contract_date AS "contractDate",
  total_price AS "totalPrice",
  discount_kind AS "discountKind",
  discount_value AS "discountValue",
  status,
  manager_notes AS "managerNotes",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const mapLeadRow = (row) => ({
  id: Number(row.id),
  type: String(row.type || ""),
  customerName: String(row.customerName || ""),
  address: String(row.address || ""),
  phone: String(row.phone || ""),
  contractNumber: String(row.contractNumber || ""),
  contractDate: row.contractDate || null,
  totalPrice: Number(row.totalPrice) || 0,
  discountKind: normalizeDiscountKind(row.discountKind),
  discountValue: Number(row.discountValue) || 0,
  status: String(row.status || "new"),
  managerNotes: String(row.managerNotes || ""),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const enrichLead = (lead) => {
  const totals = computeLeadTotals(lead.items, lead.discountKind, lead.discountValue);
  return {
    ...lead,
    subtotalPrice: totals.subtotal,
    discountAmount: totals.discountAmount,
    totalPrice: totals.total,
  };
};

const mapLeadItemRow = (row) => ({
  id: Number(row.id),
  leadId: Number(row.leadId),
  productId: row.productId != null ? Number(row.productId) : null,
  name: String(row.name || ""),
  sku: String(row.sku || ""),
  color: String(row.color || ""),
  price: Number(row.price) || 0,
  quantity: Number(row.quantity) || 0,
  sortOrder: Number(row.sortOrder) || 0,
});

const createLeadWithItems = async (lead, items) => {
  await ensureLeadTables();

  return withTransaction(async (client) => {
    const leadRes = await client.query(
      `
      INSERT INTO leads(
        type,
        customer_name,
        address,
        phone,
        contract_number,
        contract_date,
        total_price,
        status,
        manager_notes,
        discount_kind,
        discount_value
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', '', 'none', 0)
      RETURNING ${leadSelectFields}
      `,
      [
        lead.type,
        lead.customerName,
        lead.address,
        lead.phone,
        lead.contractNumber,
        lead.contractDate,
        lead.totalPrice,
      ],
    );

    const createdLead = mapLeadRow(leadRes.rows[0]);
    const createdItems = [];

    for (const item of items) {
      const itemRes = await client.query(
        `
        INSERT INTO lead_items(
          lead_id,
          product_id,
          name,
          sku,
          color,
          price,
          quantity,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id,
          lead_id AS "leadId",
          product_id AS "productId",
          name,
          sku,
          color,
          price,
          quantity,
          sort_order AS "sortOrder"
        `,
        [
          createdLead.id,
          item.productId,
          item.name,
          item.sku,
          item.color,
          item.price,
          item.quantity,
          item.sortOrder,
        ],
      );
      createdItems.push(mapLeadItemRow(itemRes.rows[0]));
    }

    return enrichLead({ ...createdLead, items: createdItems });
  });
};

const listLeads = async ({ limit = 50, offset = 0, status } = {}) => {
  await ensureLeadTables();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const params = [safeLimit, safeOffset];
  let statusClause = "";

  if (status) {
    params.push(String(status));
    statusClause = `WHERE status = $3`;
  }

  const res = await query(
    `
    SELECT ${leadSelectFields}
    FROM leads
    ${statusClause}
    ORDER BY created_at DESC, id DESC
    LIMIT $1 OFFSET $2
    `,
    params,
  );

  return res.rows.map(mapLeadRow);
};

const getLeadById = async (id) => {
  await ensureLeadTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const leadRes = await query(
    `
    SELECT ${leadSelectFields}
    FROM leads
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );
  if (leadRes.rows.length === 0) return null;

  const itemsRes = await query(
    `
    SELECT
      id,
      lead_id AS "leadId",
      product_id AS "productId",
      name,
      sku,
      color,
      price,
      quantity,
      sort_order AS "sortOrder"
    FROM lead_items
    WHERE lead_id = $1
    ORDER BY sort_order ASC, id ASC
    `,
    [numericId],
  );

  return enrichLead({
    ...mapLeadRow(leadRes.rows[0]),
    items: itemsRes.rows.map(mapLeadItemRow),
  });
};

const updateLead = async (id, patch) => {
  await ensureLeadTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  return withTransaction(async (client) => {
    const currentRes = await client.query(
      `SELECT ${leadSelectFields} FROM leads WHERE id = $1 LIMIT 1`,
      [numericId],
    );
    if (currentRes.rows.length === 0) return null;

    const current = mapLeadRow(currentRes.rows[0]);

    if (Array.isArray(patch.items) && patch.items.length > 0) {
      for (const item of patch.items) {
        const updated = await client.query(
          `
          UPDATE lead_items
          SET price = $1, quantity = $2
          WHERE id = $3 AND lead_id = $4
          `,
          [item.price, item.quantity, item.id, numericId],
        );
        if (updated.rowCount === 0) {
          throw new Error(`Позиция ${item.id} не найдена в заявке`);
        }
      }
    }

    const itemsRes = await client.query(
      `
      SELECT
        id,
        lead_id AS "leadId",
        product_id AS "productId",
        name,
        sku,
        color,
        price,
        quantity,
        sort_order AS "sortOrder"
      FROM lead_items
      WHERE lead_id = $1
      ORDER BY sort_order ASC, id ASC
      `,
      [numericId],
    );
    const items = itemsRes.rows.map(mapLeadItemRow);

    const discountKind =
      patch.discountKind !== undefined ? patch.discountKind : current.discountKind;
    const discountValue =
      patch.discountValue !== undefined ? patch.discountValue : current.discountValue;
    const totals = computeLeadTotals(items, discountKind, discountValue);

    const updateRes = await client.query(
      `
      UPDATE leads
      SET
        status = COALESCE($2, status),
        manager_notes = COALESCE($3, manager_notes),
        discount_kind = $4,
        discount_value = $5,
        total_price = $6,
        updated_at = NOW()
      WHERE id = $1
      RETURNING ${leadSelectFields}
      `,
      [
        numericId,
        patch.status ?? null,
        patch.managerNotes ?? null,
        totals.discountKind,
        totals.discountValue,
        totals.total,
      ],
    );

    if (updateRes.rows.length === 0) return null;

    return enrichLead({
      ...mapLeadRow(updateRes.rows[0]),
      items,
    });
  });
};

const deleteLead = async (id) => {
  await ensureLeadTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const res = await query(`DELETE FROM leads WHERE id = $1 RETURNING id`, [numericId]);
  return res.rows[0] ? Number(res.rows[0].id) : null;
};

module.exports = {
  createLeadWithItems,
  listLeads,
  getLeadById,
  updateLead,
  deleteLead,
};
