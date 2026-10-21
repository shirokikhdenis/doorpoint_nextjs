const leadRepository = require("../repositories/leadRepository");
const interiorInstallRepository = require("../repositories/interiorInstallRepository");
const {
  validateAdminOrderPayload,
  validateCartLeadPayload,
  validateMeasureLeadPayload,
  validateLeadPatch,
  ADMIN_ORDER_TYPE,
  LEAD_TYPES,
} = require("../domain/leadValidation");
const { suggestNextContractNumber } = require("../domain/contractNumber");

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

const listLeads = async (query = {}) => {
  const status = query.status ? String(query.status).trim() : undefined;
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
    hideEstimates && status !== "estimate" ? ["estimate"] : undefined;
  const items = await leadRepository.listLeads({
    status,
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
  const search = query.search ? String(query.search).trim() : undefined;
  const items = await leadRepository.listFinanceLeads({
    year,
    month,
    type,
    search,
    statuses: FINANCE_LEAD_STATUSES,
    limit: query.limit,
    offset: query.offset,
  });
  return { ok: true, items };
};

module.exports = {
  createAdminOrder,
  createBlankAdminOrder,
  createCartLead,
  createMeasureLead,
  listLeads,
  listFinanceLeads,
  getFinanceSummary,
  getNextContractNumber,
  getLeadById,
  updateLead,
  deleteLead,
};
