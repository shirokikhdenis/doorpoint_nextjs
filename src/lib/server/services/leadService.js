const leadRepository = require("../repositories/leadRepository");
const interiorInstallRepository = require("../repositories/interiorInstallRepository");
const {
  validateAdminOrderPayload,
  validateCartLeadPayload,
  validateMeasureLeadPayload,
  validateLeadPatch,
  ADMIN_ORDER_TYPE,
  LEAD_TYPES,
  LEAD_STATUSES,
} = require("../domain/leadValidation");
const { suggestNextContractNumber } = require("../domain/contractNumber");
const LEAD_STATUS_SET = new Set(LEAD_STATUSES);

const createAdminOrder = async (body) => {
  const validation = validateAdminOrderPayload(body);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  const lead = await leadRepository.createLeadWithItems(validation.data, validation.data.items);
  return { ok: true, lead };
};

const createCartLead = async (body, meta = {}) => {
  const validation = validateCartLeadPayload(body, meta);
  if (!validation.ok) {
    return { ok: false, status: 400, message: validation.message };
  }

  const lead = await leadRepository.createLeadWithItems(validation.data, validation.data.items);
  return { ok: true, lead };
};

const createMeasureLead = async (body, meta = {}) => {
  const validation = validateMeasureLeadPayload(body, meta);
  if (!validation.ok) {
    return { ok: false, status: 400, message: validation.message };
  }

  const lead = await leadRepository.createLeadWithItems(validation.data, validation.data.items);
  return { ok: true, lead };
};

const parseStatusFilter = (value) => {
  if (value === undefined || value === null || value === "") return [];
  const raw = Array.isArray(value) ? value : String(value).split(",");
  return [
    ...new Set(
      raw
        .map((item) => String(item).trim())
        .filter((item) => item && LEAD_STATUS_SET.has(item)),
    ),
  ];
};

const listLeads = async (query = {}) => {
  const statuses = parseStatusFilter(query.status ?? query.statuses);
  const type = query.type ? String(query.type).trim() : undefined;
  if (type && !LEAD_TYPES.includes(type)) {
    return { ok: false, status: 400, message: "Некорректный тип заявки" };
  }

  const limit = query.limit;
  const offset = query.offset;
  const search = query.search ? String(query.search).trim() : undefined;
  const hideEstimates =
    query.hideEstimates === "0" || query.hideEstimates === "false" ? false : true;
  const excludeStatuses =
    hideEstimates && !statuses.includes("estimate") ? ["estimate"] : undefined;
  const items = await leadRepository.listLeads({
    statuses,
    type,
    limit,
    offset,
    search,
    excludeStatuses,
  });
  if (type !== "admin_order" || items.length === 0) {
    return { ok: true, items };
  }

  const scheduleRows = await interiorInstallRepository.listScheduleDatesByLeadIds(
    items.map((item) => item.id),
  );
  const scheduleByLead = new Map();
  for (const row of scheduleRows) {
    const current = scheduleByLead.get(row.leadId) || {};
    if (row.kind === "delivery") {
      current.deliveryId = row.id;
      current.deliveryDate = row.installDate;
      current.deliveryEndDate = row.installEndDate;
    } else {
      current.installId = row.id;
      current.installDate = row.installDate;
      current.installEndDate = row.installEndDate;
    }
    scheduleByLead.set(row.leadId, current);
  }

  return {
    ok: true,
    items: items.map((item) => {
      const schedule = scheduleByLead.get(item.id) || {};
      return {
        ...item,
        installId: schedule.installId ?? null,
        installDate: schedule.installDate ?? null,
        installEndDate: schedule.installEndDate ?? null,
        deliveryId: schedule.deliveryId ?? null,
        deliveryDate: schedule.deliveryDate ?? null,
        deliveryEndDate: schedule.deliveryEndDate ?? null,
      };
    }),
  };
};

const getLeadById = async (id) => {
  const lead = await leadRepository.getLeadById(id);
  if (!lead) return { ok: false, status: 404, message: "Заявка не найдена" };
  return { ok: true, lead };
};

const updateLead = async (id, body) => {
  const validation = validateLeadPatch(body);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  const lead = await leadRepository.updateLead(id, validation.data);
  if (!lead) return { ok: false, status: 404, message: "Заявка не найдена" };
  return { ok: true, lead };
};

const deleteLead = async (id) => {
  const deletedId = await leadRepository.deleteLead(id);
  if (!deletedId) return { ok: false, status: 404, message: "Заявка не найдена" };
  return { ok: true, id: deletedId };
};

const getNextContractNumber = async () => {
  const numbers = await leadRepository.listRecentContractNumbers({
    type: ADMIN_ORDER_TYPE,
    limit: 200,
  });
  return { ok: true, contractNumber: suggestNextContractNumber(numbers) };
};

/** Empty salon lead for the admin list "+" button — fill in details afterwards. */
const createBlankAdminOrder = async () => {
  // No contract number yet — stays "not_issued" (numeric № would become "issued").
  return createAdminOrder({
    customerName: "Новая заявка",
    phone: "н/д",
    contractNumber: "",
    items: [{ name: "—", price: 0, quantity: 1 }],
  });
};

/** Only these lead statuses participate in finance accounting. */
const FINANCE_LEAD_STATUSES = ["issued", "in_transit", "in_stock", "shipped"];

const getFinanceSummary = async (query = {}) => {
  const year = Number(query.year) || new Date().getFullYear();
  const type = query.type ? String(query.type).trim() : undefined;
  if (type && !LEAD_TYPES.includes(type)) {
    return { ok: false, status: 400, message: "Некорректный тип заявки" };
  }
  const types = type ? [type] : ["admin_order", "cart_lead"];
  const months = await leadRepository.listFinanceMonthlySummary({
    year,
    types,
    statuses: FINANCE_LEAD_STATUSES,
  });
  const totals = months.reduce(
    (acc, row) => {
      acc.leadsCount += row.leadsCount;
      acc.revenue += row.revenue;
      acc.purchaseCost += row.purchaseCost;
      acc.profit += row.profit;
      return acc;
    },
    { leadsCount: 0, revenue: 0, purchaseCost: 0, profit: 0 },
  );
  return { ok: true, year, months, totals };
};

const listFinanceLeads = async (query = {}) => {
  const type = query.type ? String(query.type).trim() : undefined;
  if (type && !LEAD_TYPES.includes(type)) {
    return { ok: false, status: 400, message: "Некорректный тип заявки" };
  }
  if (type === "measure_lead") {
    return { ok: false, status: 400, message: "Заявки на замер не участвуют в финучёте" };
  }
  const year = query.year ? Number(query.year) : undefined;
  const month = query.month ? String(query.month).trim() : undefined;
  const dateFrom = query.dateFrom || query.from ? String(query.dateFrom || query.from).trim() : undefined;
  const dateTo = query.dateTo || query.to ? String(query.dateTo || query.to).trim() : undefined;
  const search = query.search ? String(query.search).trim() : undefined;
  const items = await leadRepository.listFinanceLeads({
    year,
    month,
    dateFrom,
    dateTo,
    type,
    search,
    statuses: FINANCE_LEAD_STATUSES,
    limit: query.limit,
    offset: query.offset,
  });
  return { ok: true, items };
};

const FINANCE_STATUS_LABELS = {
  issued: "Оформлена",
  in_transit: "В пути",
  in_stock: "На складе",
  shipped: "Отгружена",
};

const FINANCE_TYPE_LABELS = {
  admin_order: "Салон",
  cart_lead: "Сайт",
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  if (/[",;\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const formatFinanceCsvDate = (value) => {
  if (!value) return "";
  const raw = String(value);
  const dateOnly = raw.slice(0, 10);
  if (DATE_ONLY_RE.test(dateOnly)) {
    const [y, m, d] = dateOnly.split("-");
    return `${d}.${m}.${y}`;
  }
  try {
    return new Date(raw).toLocaleDateString("ru-RU");
  } catch {
    return raw;
  }
};

const buildFinanceLeadsCsv = (items) => {
  const header = [
    "Дата",
    "Источник",
    "ФИО",
    "Телефон",
    "№ договора",
    "Товар",
    "Сумма договора",
    "Закуп",
    "Прибыль",
    "Статус",
  ];
  const lines = [header.map(escapeCsvCell).join(";")];
  for (const item of items) {
    const total = Number(item.totalPrice) || 0;
    const purchase = Number(item.purchaseCost) || 0;
    const dateValue = item.contractDate || item.createdAt;
    lines.push(
      [
        formatFinanceCsvDate(dateValue),
        FINANCE_TYPE_LABELS[item.type] || item.type || "",
        item.customerName || "",
        item.phone || "",
        item.contractNumber || "",
        item.firstProductName || "",
        total,
        purchase,
        total - purchase,
        FINANCE_STATUS_LABELS[item.status] || item.status || "",
      ]
        .map(escapeCsvCell)
        .join(";"),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
};

/** One CSV row per lead line item (nomenclature), with lead context repeated. */
const buildFinanceLeadsWithItemsCsv = (leads, lineItems) => {
  const itemsByLeadId = new Map();
  for (const line of lineItems) {
    const leadId = Number(line.leadId);
    if (!itemsByLeadId.has(leadId)) itemsByLeadId.set(leadId, []);
    itemsByLeadId.get(leadId).push(line);
  }

  const header = [
    "Дата",
    "Источник",
    "ФИО",
    "Телефон",
    "№ договора",
    "Статус",
    "Сумма договора",
    "Закуп",
    "Прибыль",
    "Наименование",
    "Артикул",
    "Артикул пр-ля",
    "Цвет",
    "Цена",
    "Кол-во",
    "Сумма позиции",
  ];
  const lines = [header.map(escapeCsvCell).join(";")];

  for (const lead of leads) {
    const total = Number(lead.totalPrice) || 0;
    const purchase = Number(lead.purchaseCost) || 0;
    const dateValue = lead.contractDate || lead.createdAt;
    const leadCols = [
      formatFinanceCsvDate(dateValue),
      FINANCE_TYPE_LABELS[lead.type] || lead.type || "",
      lead.customerName || "",
      lead.phone || "",
      lead.contractNumber || "",
      FINANCE_STATUS_LABELS[lead.status] || lead.status || "",
      total,
      purchase,
      total - purchase,
    ];
    const leadLines = itemsByLeadId.get(Number(lead.id)) || [];
    if (leadLines.length === 0) {
      lines.push(
        [...leadCols, "", "", "", "", "", "", ""]
          .map(escapeCsvCell)
          .join(";"),
      );
      continue;
    }
    for (const line of leadLines) {
      const price = Number(line.price) || 0;
      const quantity = Number(line.quantity) || 0;
      lines.push(
        [
          ...leadCols,
          line.name || "",
          line.sku || "",
          line.manufacturerId || "",
          line.color || "",
          price,
          quantity,
          price * quantity,
        ]
          .map(escapeCsvCell)
          .join(";"),
      );
    }
  }

  return `\uFEFF${lines.join("\r\n")}\r\n`;
};

const isTruthyQueryFlag = (value) => {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "items" || raw === "nomenclature";
};

const exportFinanceLeadsCsv = async (query = {}) => {
  const type = query.type ? String(query.type).trim() : undefined;
  if (type && !LEAD_TYPES.includes(type)) {
    return { ok: false, status: 400, message: "Некорректный тип заявки" };
  }
  if (type === "measure_lead") {
    return { ok: false, status: 400, message: "Заявки на замер не участвуют в финучёте" };
  }

  const dateFrom = String(query.dateFrom || query.from || "").trim();
  const dateTo = String(query.dateTo || query.to || "").trim();
  if (!DATE_ONLY_RE.test(dateFrom) || !DATE_ONLY_RE.test(dateTo)) {
    return { ok: false, status: 400, message: "Укажите период: dateFrom и dateTo (ГГГГ-ММ-ДД)" };
  }
  if (dateFrom > dateTo) {
    return { ok: false, status: 400, message: "Дата начала периода не может быть позже даты окончания" };
  }

  const withItems =
    isTruthyQueryFlag(query.withItems) ||
    isTruthyQueryFlag(query.items) ||
    String(query.mode || "").trim().toLowerCase() === "items";

  const search = query.search ? String(query.search).trim() : undefined;
  const leads = await leadRepository.listFinanceLeads({
    dateFrom,
    dateTo,
    type,
    search,
    statuses: FINANCE_LEAD_STATUSES,
    limit: 10000,
    offset: 0,
  });

  if (!withItems) {
    const csv = buildFinanceLeadsCsv(leads);
    const filename = `fin-leads-${dateFrom}_${dateTo}.csv`;
    return { ok: true, csv, filename, count: leads.length };
  }

  const lineItems = await leadRepository.listLeadItemsByLeadIds(leads.map((lead) => lead.id));
  const csv = buildFinanceLeadsWithItemsCsv(leads, lineItems);
  const filename = `fin-leads-items-${dateFrom}_${dateTo}.csv`;
  return { ok: true, csv, filename, count: leads.length, lineCount: lineItems.length };
};

module.exports = {
  createAdminOrder,
  createBlankAdminOrder,
  createCartLead,
  createMeasureLead,
  listLeads,
  listFinanceLeads,
  exportFinanceLeadsCsv,
  getFinanceSummary,
  getNextContractNumber,
  getLeadById,
  updateLead,
  deleteLead,
};
