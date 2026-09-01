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
  delivery_days AS "deliveryDays",
  arrival_date::text AS "arrivalDate",
  invoice_number AS "invoiceNumber",
  measure_note AS "measureNote",
  total_price AS "totalPrice",
  discount_kind AS "discountKind",
  discount_value AS "discountValue",
  status,
  manager_notes AS "managerNotes",
  client_comment AS "clientComment",
  source_page AS "sourcePage",
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
  deliveryDays: row.deliveryDays != null ? Number(row.deliveryDays) : null,
  arrivalDate: row.arrivalDate ? String(row.arrivalDate).slice(0, 10) : null,
  invoiceNumber: String(row.invoiceNumber || ""),
  measureNote: String(row.measureNote || ""),
  totalPrice: Number(row.totalPrice) || 0,
  discountKind: normalizeDiscountKind(row.discountKind),
  discountValue: Number(row.discountValue) || 0,
  status: String(row.status || "not_issued"),
  managerNotes: String(row.managerNotes || ""),
  clientComment: String(row.clientComment || ""),
  sourcePage: String(row.sourcePage || ""),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  ...(row.firstProductName !== undefined
    ? { firstProductName: String(row.firstProductName || "") }
    : {}),
  ...(row.firstProductItemId !== undefined
    ? {
        firstProductItemId:
          row.firstProductItemId != null ? Number(row.firstProductItemId) : null,
      }
    : {}),
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
  manufacturerId: String(row.manufacturerId || "").trim(),
  color: String(row.color || ""),
  price: Number(row.price) || 0,
  quantity: Number(row.quantity) || 0,
  sortOrder: Number(row.sortOrder) || 0,
});

const leadItemSelectSql = `
  SELECT
    li.id,
    li.lead_id AS "leadId",
    li.product_id AS "productId",
    li.name,
    li.sku,
    COALESCE(
      NULLIF(TRIM(li.manufacturer_id), ''),
      (
        SELECT NULLIF(TRIM(pv.attrs->>'manufacturer_id'), '')
        FROM product_variants pv
        WHERE pv.product_id = li.product_id
          AND TRIM(COALESCE(li.sku, '')) <> ''
          AND TRIM(pv.sku) = TRIM(li.sku)
          AND TRIM(COALESCE(pv.attrs->>'manufacturer_id', '')) <> ''
        LIMIT 1
      ),
      (
        SELECT NULLIF(TRIM(pv.attrs->>'manufacturer_id'), '')
        FROM product_variants pv
        WHERE pv.product_id = li.product_id
          AND TRIM(COALESCE(pv.attrs->>'manufacturer_id', '')) <> ''
        LIMIT 1
      ),
      NULLIF(TRIM(p.attrs->>'manufacturer_id'), '')
    ) AS "manufacturerId",
    li.color,
    li.price,
    li.quantity,
    li.sort_order AS "sortOrder"
  FROM lead_items li
  LEFT JOIN products p ON p.id = li.product_id
`;

const selectLeadItemsByLeadId = async (leadId, client) => {
  const sql = `
    ${leadItemSelectSql}
    WHERE li.lead_id = $1
    ORDER BY li.sort_order ASC, li.id ASC
  `;
  const itemsRes = client ? await client.query(sql, [leadId]) : await query(sql, [leadId]);
  return itemsRes.rows.map(mapLeadItemRow);
};

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
        delivery_days,
        total_price,
        status,
        manager_notes,
        client_comment,
        source_page,
        discount_kind,
        discount_value
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'not_issued', '', $9, $10, 'none', 0)
      RETURNING ${leadSelectFields}
      `,
      [
        lead.type,
        lead.customerName,
        lead.address,
        lead.phone,
        lead.contractNumber,
        lead.contractDate,
        lead.deliveryDays,
        lead.totalPrice,
        lead.clientComment || "",
        lead.sourcePage || "",
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
          manufacturer_id,
          color,
          price,
          quantity,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          id,
          lead_id AS "leadId",
          product_id AS "productId",
          name,
          sku,
          manufacturer_id AS "manufacturerId",
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
          item.manufacturerId || "",
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

const listLeads = async ({ limit = 50, offset = 0, status, type, search, excludeStatuses } = {}) => {
  await ensureLeadTables();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const params = [safeLimit, safeOffset];
  const clauses = [];
  let paramIndex = 3;

  if (type) {
    clauses.push(`type = $${paramIndex}`);
    params.push(String(type));
    paramIndex += 1;
  }
  if (status) {
    clauses.push(`status = $${paramIndex}`);
    params.push(String(status));
    paramIndex += 1;
  }
  const excluded = Array.isArray(excludeStatuses)
    ? excludeStatuses.map((item) => String(item).trim()).filter(Boolean)
    : [];
  if (excluded.length > 0) {
    const placeholders = excluded.map(() => `$${paramIndex++}`).join(", ");
    clauses.push(`status NOT IN (${placeholders})`);
    params.push(...excluded);
  }
  const searchTerm = String(search || "").trim();
  if (searchTerm) {
    clauses.push(
      `(customer_name ILIKE $${paramIndex} OR contract_number ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`,
    );
    params.push(`%${searchTerm}%`);
    paramIndex += 1;
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const res = await query(
    `
    SELECT
      ${leadSelectFields},
      (
        SELECT li.name
        FROM lead_items li
        WHERE li.lead_id = leads.id
        ORDER BY li.sort_order ASC, li.id ASC
        LIMIT 1
      ) AS "firstProductName",
      (
        SELECT li.id
        FROM lead_items li
        WHERE li.lead_id = leads.id
        ORDER BY li.sort_order ASC, li.id ASC
        LIMIT 1
      ) AS "firstProductItemId"
    FROM leads
    ${whereClause}
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

  const items = await selectLeadItemsByLeadId(numericId);

  return enrichLead({
    ...mapLeadRow(leadRes.rows[0]),
    items,
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

    if (patch.firstProductName !== undefined) {
      const firstItemRes = await client.query(
        `
        SELECT id
        FROM lead_items
        WHERE lead_id = $1
        ORDER BY sort_order ASC, id ASC
        LIMIT 1
        `,
        [numericId],
      );
      if (firstItemRes.rows[0]) {
        await client.query(`UPDATE lead_items SET name = $1 WHERE id = $2 AND lead_id = $3`, [
          patch.firstProductName,
          firstItemRes.rows[0].id,
          numericId,
        ]);
      }
    }

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

    const items = await selectLeadItemsByLeadId(numericId, client);

    const discountKind =
      patch.discountKind !== undefined ? patch.discountKind : current.discountKind;
    const discountValue =
      patch.discountValue !== undefined ? patch.discountValue : current.discountValue;
    const deliveryDays =
      patch.deliveryDays !== undefined ? patch.deliveryDays : current.deliveryDays;
    const arrivalDate =
      patch.arrivalDate !== undefined ? patch.arrivalDate : current.arrivalDate;
    const measureNote =
      patch.measureNote !== undefined ? patch.measureNote : current.measureNote;
    const invoiceNumber =
      patch.invoiceNumber !== undefined ? patch.invoiceNumber : current.invoiceNumber;
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
        delivery_days = $7,
        arrival_date = $8,
        measure_note = $9,
        invoice_number = $10,
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
        deliveryDays,
        arrivalDate,
        measureNote,
        invoiceNumber,
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
