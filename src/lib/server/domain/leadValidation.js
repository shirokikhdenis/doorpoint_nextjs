const LEAD_STATUSES = ["new", "in_progress", "done", "cancelled"];
const ADMIN_ORDER_TYPE = "admin_order";
const CART_LEAD_TYPE = "cart_lead";
const MEASURE_LEAD_TYPE = "measure_lead";
const LEAD_TYPES = [ADMIN_ORDER_TYPE, CART_LEAD_TYPE, MEASURE_LEAD_TYPE];
const measureLeadService = require("../services/measureLeadService");
const { formatCartItemName } = require("../../cart-item-name");

const normalizePhone = (value) => String(value || "").replace(/[^\d+]/g, "").trim();

const parseContractDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const raw = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { error: "Некорректная дата договора" };
  }
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { error: "Некорректная дата договора" };
  }
  return { value: raw };
};

const normalizeLeadItem = (item, index) => {
  const productId = Number(item?.id ?? item?.productId);
  const price = Number(item?.price);
  const quantity = Number(item?.quantity);
  const name = formatCartItemName(
    String(item?.name || "").trim(),
    String(item?.color || "").trim(),
    String(item?.finishName || "").trim(),
  );
  if (!name) return { error: `Позиция ${index + 1}: укажите наименование` };
  if (!Number.isFinite(price) || price < 0) {
    return { error: `Позиция ${index + 1}: некорректная цена` };
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: `Позиция ${index + 1}: количество должно быть не меньше 1` };
  }
  return {
    value: {
      productId: Number.isInteger(productId) && productId > 0 ? productId : null,
      name,
      sku: String(item?.sku || "").trim(),
      color: String(item?.color || "").trim(),
      price: Math.floor(price),
      quantity,
      sortOrder: index,
    },
  };
};

const computeItemsTotal = (items) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const validateAdminOrderPayload = (body) => {
  const customerName = String(body?.customerName ?? body?.name ?? "").trim();
  if (customerName.length < 2) {
    return { ok: false, message: "Укажите ФИО (минимум 2 символа)" };
  }

  const phone = normalizePhone(body?.phone);
  if (phone.replace(/\D/g, "").length < 10) {
    return { ok: false, message: "Укажите корректный телефон" };
  }

  const contractDateResult = parseContractDate(body?.contractDate);
  if (contractDateResult?.error) {
    return { ok: false, message: contractDateResult.error };
  }

  const rawItems = Array.isArray(body?.items) ? body.items : [];
  if (rawItems.length === 0) {
    return { ok: false, message: "Добавьте хотя бы одну позицию в корзину" };
  }

  const items = [];
  for (let index = 0; index < rawItems.length; index += 1) {
    const itemResult = normalizeLeadItem(rawItems[index], index);
    if (itemResult.error) {
      return { ok: false, message: itemResult.error };
    }
    items.push(itemResult.value);
  }

  return {
    ok: true,
    data: {
      type: ADMIN_ORDER_TYPE,
      customerName,
      address: String(body?.address || "").trim(),
      phone,
      contractNumber: String(body?.contractNumber || "").trim(),
      contractDate: contractDateResult.value,
      totalPrice: computeItemsTotal(items),
      clientComment: "",
      sourcePage: "",
      items,
    },
  };
};

const validateCartLeadPayload = (body, meta = {}) => {
  const validated = measureLeadService.validateCartPayload(body);
  if (validated.error) {
    return { ok: false, message: validated.error };
  }

  const { name, phone, comment, items: rawItems } = validated.data;
  const items = [];
  for (let index = 0; index < rawItems.length; index += 1) {
    const itemResult = normalizeLeadItem(rawItems[index], index);
    if (itemResult.error) {
      return { ok: false, message: itemResult.error };
    }
    items.push(itemResult.value);
  }

  return {
    ok: true,
    data: {
      type: CART_LEAD_TYPE,
      customerName: name,
      address: "",
      phone,
      contractNumber: "",
      contractDate: null,
      clientComment: comment,
      sourcePage: String(meta.sourcePage || "").trim(),
      totalPrice: computeItemsTotal(items),
      items,
    },
  };
};

const validateMeasureLeadPayload = (body, meta = {}) => {
  const validated = measureLeadService.validatePayload(body);
  if (validated.error) {
    return { ok: false, message: validated.error };
  }

  const { name, phone, comment } = validated.data;
  return {
    ok: true,
    data: {
      type: MEASURE_LEAD_TYPE,
      customerName: name,
      address: "",
      phone,
      contractNumber: "",
      contractDate: null,
      clientComment: comment,
      sourcePage: String(meta.sourcePage || "").trim(),
      totalPrice: 0,
      items: [],
    },
  };
};

const validateLeadStatusUpdate = (body) => validateLeadPatch(body);

const validateLeadPatch = (body) => {
  const data = {};

  if (body?.status !== undefined) {
    const status = String(body.status).trim();
    if (!LEAD_STATUSES.includes(status)) {
      return { ok: false, message: "Некорректный статус" };
    }
    data.status = status;
  }

  if (body?.managerNotes !== undefined) {
    data.managerNotes = String(body.managerNotes).trim();
  }

  if (body?.discountKind !== undefined) {
    const { normalizeDiscountKind } = require("./leadPricing");
    data.discountKind = normalizeDiscountKind(body.discountKind);
    if (data.discountKind === "none") {
      data.discountValue = 0;
    }
  }

  if (body?.discountValue !== undefined) {
    const raw = Number(body.discountValue);
    if (!Number.isFinite(raw) || raw < 0) {
      return { ok: false, message: "Некорректное значение скидки" };
    }
    data.discountValue = Math.floor(raw);
  }

  if (body?.items !== undefined) {
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return { ok: false, message: "Укажите хотя бы одну позицию" };
    }
    const items = [];
    for (let index = 0; index < body.items.length; index += 1) {
      const raw = body.items[index];
      const id = Number(raw?.id);
      const price = Number(raw?.price);
      const quantity = Number(raw?.quantity);
      if (!Number.isInteger(id) || id <= 0) {
        return { ok: false, message: `Позиция ${index + 1}: некорректный id` };
      }
      if (!Number.isFinite(price) || price < 0) {
        return { ok: false, message: `Позиция ${index + 1}: некорректная цена` };
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        return { ok: false, message: `Позиция ${index + 1}: количество должно быть не меньше 1` };
      }
      items.push({
        id,
        price: Math.floor(price),
        quantity,
      });
    }
    data.items = items;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, message: "Нет данных для обновления" };
  }

  if (data.discountKind === "percent" && data.discountValue > 100) {
    return { ok: false, message: "Скидка не может быть больше 100%" };
  }

  return { ok: true, data };
};

module.exports = {
  LEAD_STATUSES,
  LEAD_TYPES,
  ADMIN_ORDER_TYPE,
  CART_LEAD_TYPE,
  MEASURE_LEAD_TYPE,
  normalizePhone,
  parseContractDate,
  normalizeLeadItem,
  computeItemsTotal,
  validateAdminOrderPayload,
  validateCartLeadPayload,
  validateMeasureLeadPayload,
  validateLeadStatusUpdate,
  validateLeadPatch,
};
