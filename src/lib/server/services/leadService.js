const leadRepository = require("../repositories/leadRepository");
const {
  validateAdminOrderPayload,
  validateLeadPatch,
} = require("../domain/leadValidation");

const createAdminOrder = async (body) => {
  const validation = validateAdminOrderPayload(body);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  const lead = await leadRepository.createLeadWithItems(validation.data, validation.data.items);
  return { ok: true, lead };
};

const listLeads = async (query = {}) => {
  const status = query.status ? String(query.status).trim() : undefined;
  const limit = query.limit;
  const offset = query.offset;
  const items = await leadRepository.listLeads({ status, limit, offset });
  return { items };
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

module.exports = {
  createAdminOrder,
  listLeads,
  getLeadById,
  updateLead,
  deleteLead,
};
