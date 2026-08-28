const interiorInstallRepository = require("../repositories/interiorInstallRepository");
const leadRepository = require("../repositories/leadRepository");
const {
  buildDoorsSummary,
  nextBrigadeColor,
  parseBrigadeColor,
  parseCalendarEntryKind,
  parseInstallDate,
  resolveInstallEndDate,
} = require("../domain/interiorInstall");

const asPositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const prefillFromLead = (lead) => ({
  leadId: lead.id,
  orderNumber: String(lead.contractNumber || "").trim(),
  specification: buildDoorsSummary(lead.items || []),
  customerName: String(lead.customerName || "").trim(),
  phone: String(lead.phone || "").trim(),
  address: String(lead.address || "").trim(),
});

const getLeadPrefill = async (leadId) => {
  const id = asPositiveInt(leadId);
  if (!id) return { ok: false, status: 400, message: "Укажите заявку" };
  const lead = await leadRepository.getLeadById(id);
  if (!lead) return { ok: false, status: 404, message: "Заявка не найдена" };
  return { ok: true, prefill: prefillFromLead(lead) };
};

const listBrigades = async () => {
  const items = await interiorInstallRepository.listBrigades({ includeInactive: true });
  return { ok: true, items };
};

const createBrigade = async (payload) => {
  const name = String(payload?.name || "").trim();
  if (name.length < 2) {
    return { ok: false, status: 400, message: "Название бригады должно быть не короче 2 символов" };
  }
  const count = await interiorInstallRepository.countBrigades();
  const item = await interiorInstallRepository.createBrigade({
    name,
    color: parseBrigadeColor(payload?.color, nextBrigadeColor(count)),
    sortOrder: Number.isFinite(Number(payload?.sortOrder)) ? Math.round(Number(payload.sortOrder)) : count * 10,
    isActive: payload?.isActive !== false,
  });
  return { ok: true, item };
};

const updateBrigade = async (id, payload) => {
  const existing = await interiorInstallRepository.getBrigadeById(id);
  if (!existing) return { ok: false, status: 404, message: "Бригада не найдена" };
  const name = payload?.name !== undefined ? String(payload.name || "").trim() : existing.name;
  if (name.length < 2) {
    return { ok: false, status: 400, message: "Название бригады должно быть не короче 2 символов" };
  }
  const item = await interiorInstallRepository.updateBrigade(id, {
    name,
    color: payload?.color !== undefined ? parseBrigadeColor(payload.color, existing.color) : existing.color,
    sortOrder:
      payload?.sortOrder !== undefined && Number.isFinite(Number(payload.sortOrder))
        ? Math.round(Number(payload.sortOrder))
        : existing.sortOrder,
    isActive: payload?.isActive !== undefined ? payload.isActive !== false : existing.isActive,
  });
  if (!item) return { ok: false, status: 404, message: "Бригада не найдена" };
  return { ok: true, item };
};

const deleteBrigade = async (id) => {
  const existing = await interiorInstallRepository.getBrigadeById(id);
  if (!existing) return { ok: false, status: 404, message: "Бригада не найдена" };
  const used = await interiorInstallRepository.countInstallationsForBrigade(id);
  if (used > 0) {
    return {
      ok: false,
      status: 409,
      message: "Нельзя удалить бригаду с монтажами. Скройте её, чтобы она не предлагалась в форме.",
    };
  }
  const deleted = await interiorInstallRepository.deleteBrigade(id);
  if (!deleted) return { ok: false, status: 404, message: "Бригада не найдена" };
  return { ok: true };
};

const listInstallations = async (query = {}) => {
  const from = parseInstallDate(query.from);
  const to = parseInstallDate(query.to);
  if (!from || !to) {
    return { ok: false, status: 400, message: "Укажите период from и to в формате ГГГГ-ММ-ДД" };
  }
  if (from > to) {
    return { ok: false, status: 400, message: "Дата «с» не может быть позже даты «по»" };
  }
  const brigadeId = query.brigadeId ? asPositiveInt(query.brigadeId) : null;
  if (query.brigadeId && !brigadeId) {
    return { ok: false, status: 400, message: "Некорректная бригада" };
  }
  const items = await interiorInstallRepository.listInstallations({ from, to, brigadeId });
  return { ok: true, items };
};

const getUpcomingReminders = async () => {
  const [delivery, install] = await Promise.all([
    interiorInstallRepository.getUpcomingByKind("delivery"),
    interiorInstallRepository.getUpcomingByKind("install"),
  ]);
  return { ok: true, delivery, install };
};

const listInstallationsForLead = async (leadId) => {
  const id = asPositiveInt(leadId);
  if (!id) return { ok: false, status: 400, message: "Укажите заявку" };
  const items = await interiorInstallRepository.listInstallationsByLeadId(id);
  return { ok: true, items };
};

const resolveLeadPrefill = async (leadId) => {
  if (!leadId) return { ok: true, prefill: null };
  const id = asPositiveInt(leadId);
  if (!id) return { ok: false, status: 400, message: "Некорректная заявка" };
  const lead = await leadRepository.getLeadById(id);
  if (!lead) return { ok: false, status: 400, message: "Заявка не найдена" };
  return { ok: true, prefill: prefillFromLead(lead) };
};

const pickText = (payloadValue, fallback) => {
  if (payloadValue != null) return String(payloadValue).trim();
  return String(fallback || "").trim();
};

const validateInstallationPayload = async (payload, existing = null) => {
  const installDate = parseInstallDate(payload?.installDate);
  if (!installDate) {
    return { ok: false, status: 400, message: "Укажите дату" };
  }
  const installEndDate = resolveInstallEndDate(installDate, payload?.installEndDate);
  if (!installEndDate) {
    return { ok: false, status: 400, message: "Дата «по» не может быть раньше даты «с»" };
  }

  const kind = parseCalendarEntryKind(payload?.kind, existing?.kind || "install");
  let brigadeId = null;
  if (kind === "install") {
    brigadeId = asPositiveInt(payload?.brigadeId);
    if (!brigadeId) {
      return { ok: false, status: 400, message: "Укажите бригаду" };
    }
    const brigade = await interiorInstallRepository.getBrigadeById(brigadeId);
    if (!brigade) return { ok: false, status: 400, message: "Бригада не найдена" };
    if (!brigade.isActive && (!existing || existing.brigadeId !== brigade.id)) {
      return { ok: false, status: 400, message: "Эта бригада скрыта. Выберите другую." };
    }
  }

  const hasLeadId = Boolean(payload) && Object.prototype.hasOwnProperty.call(payload, "leadId");
  const unlinkLead = hasLeadId && (payload.leadId === "" || payload.leadId === null);
  const requestedLeadId = unlinkLead ? null : hasLeadId ? payload.leadId : existing?.leadId;
  const leadResult = await resolveLeadPrefill(requestedLeadId);
  if (!leadResult.ok) return leadResult;
  const prefill = unlinkLead ? null : leadResult.prefill;

  const customerName = pickText(payload?.customerName, prefill?.customerName || existing?.customerName);
  const phone = pickText(payload?.phone, prefill?.phone || existing?.phone);
  if (customerName.length < 2) {
    return { ok: false, status: 400, message: "Укажите имя заказчика" };
  }
  if (phone.length < 5) {
    return { ok: false, status: 400, message: "Укажите телефон заказчика" };
  }

  return {
    ok: true,
    value: {
      installDate,
      installEndDate,
      leadId: prefill?.leadId ?? (unlinkLead ? null : asPositiveInt(requestedLeadId)),
      orderNumber: pickText(payload?.orderNumber, prefill?.orderNumber || existing?.orderNumber),
      doorsSummary: pickText(payload?.doorsSummary, existing?.doorsSummary),
      specification: pickText(payload?.specification, prefill?.specification || existing?.specification),
      kind,
      brigadeId,
      doorsOnSite: payload?.doorsOnSite !== undefined ? Boolean(payload.doorsOnSite) : Boolean(existing?.doorsOnSite),
      customerName,
      phone,
      address: pickText(payload?.address, prefill?.address || existing?.address),
      notes: pickText(payload?.notes, existing?.notes),
    },
  };
};

const createInstallation = async (payload) => {
  const validated = await validateInstallationPayload(payload);
  if (!validated.ok) return validated;
  const item = await interiorInstallRepository.createInstallation(validated.value);
  return { ok: true, item };
};

const updateInstallation = async (id, payload) => {
  const existing = await interiorInstallRepository.getInstallationById(id);
  if (!existing) return { ok: false, status: 404, message: "Запись не найдена" };
  const validated = await validateInstallationPayload(
    {
      installDate: payload?.installDate ?? existing.installDate,
      installEndDate: payload?.installEndDate ?? existing.installEndDate ?? existing.installDate,
      kind: existing.kind,
      brigadeId: payload?.brigadeId ?? existing.brigadeId,
      leadId: payload?.leadId !== undefined ? payload.leadId : existing.leadId,
      orderNumber: payload?.orderNumber ?? existing.orderNumber,
      doorsSummary: payload?.doorsSummary ?? existing.doorsSummary,
      specification: payload?.specification ?? existing.specification,
      doorsOnSite: payload?.doorsOnSite ?? existing.doorsOnSite,
      customerName: payload?.customerName ?? existing.customerName,
      phone: payload?.phone ?? existing.phone,
      address: payload?.address ?? existing.address,
      notes: payload?.notes ?? existing.notes,
    },
    existing,
  );
  if (!validated.ok) return validated;
  const item = await interiorInstallRepository.updateInstallation(id, validated.value);
  if (!item) return { ok: false, status: 404, message: "Запись не найдена" };
  return { ok: true, item };
};

const deleteInstallation = async (id) => {
  const deleted = await interiorInstallRepository.deleteInstallation(id);
  if (!deleted) return { ok: false, status: 404, message: "Запись не найдена" };
  return { ok: true };
};

module.exports = {
  listBrigades,
  createBrigade,
  updateBrigade,
  deleteBrigade,
  listInstallations,
  getUpcomingReminders,
  listInstallationsForLead,
  getLeadPrefill,
  createInstallation,
  updateInstallation,
  deleteInstallation,
};
