const nodemailer = require("nodemailer");

const normalizePhone = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return "";
};

const validateContactFields = (body) => {
  const name = String(body?.name || "").trim();
  const phone = normalizePhone(body?.phone);
  const comment = String(body?.comment || "").trim();
  const honeypot = String(body?.website || "").trim();

  if (honeypot) return { error: "Заявка отклонена" };
  if (name.length < 2 || name.length > 120) return { error: "Укажите имя (от 2 символов)" };
  if (!phone) return { error: "Укажите корректный номер телефона" };
  if (comment.length > 2000) return { error: "Комментарий слишком длинный" };

  return { data: { name, phone, comment } };
};

const validatePayload = (body) => validateContactFields(body);

const validateCartItems = (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: "Корзина пуста" };
  }
  if (rawItems.length > 100) {
    return { error: "Слишком много позиций в заказе" };
  }

  const items = rawItems
    .map((item) => ({
      id: Number(item?.id),
      name: String(item?.name || "").trim().slice(0, 500),
      sku: String(item?.sku || "").trim().slice(0, 120),
      color: String(item?.color || "").trim().slice(0, 120),
      price: Math.max(0, Math.round(Number(item?.price) || 0)),
      quantity: Math.min(99, Math.max(1, Math.round(Number(item?.quantity) || 0))),
    }))
    .filter((item) => item.id > 0 && item.name);

  if (!items.length) return { error: "Некорректный состав заказа" };
  return { data: items };
};

const validateCartPayload = (body) => {
  const contact = validateContactFields(body);
  if (contact.error) return contact;
  const items = validateCartItems(body?.items);
  if (items.error) return items;
  return { data: { ...contact.data, items: items.data } };
};

const formatMoney = (value) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(value));

const getMailConfig = () => {
  const host = String(process.env.SMTP_HOST || "smtp.yandex.ru").trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const to = String(process.env.LEADS_NOTIFY_EMAIL || user).trim();

  if (!user || !pass || !to) {
    return { error: "Почта не настроена на сервере" };
  }

  return {
    transport: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    from: user,
    to,
  };
};

const formatLeadText = ({ name, phone, comment, sourcePage }) => {
  const lines = [
    "Новая заявка на бесплатный замер",
    "",
    `Имя: ${name}`,
    `Телефон: ${phone}`,
  ];
  if (comment) lines.push(`Комментарий: ${comment}`);
  if (sourcePage) lines.push(`Страница: ${sourcePage}`);
  lines.push("", `Время: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`);
  return lines.join("\n");
};

const formatCartLeadText = ({ name, phone, comment, items, sourcePage }) => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const lines = [
    "Заявка из корзины",
    "",
    `Имя: ${name}`,
    `Телефон: ${phone}`,
  ];
  if (comment) lines.push(`Комментарий: ${comment}`);
  lines.push("", "Состав заказа:");
  items.forEach((item, index) => {
    const parts = [`${index + 1}. ${item.name}`];
    if (item.color) parts.push(`цвет: ${item.color}`);
    if (item.sku) parts.push(`арт. ${item.sku}`);
    const lineTotal = item.price * item.quantity;
    parts.push(
      `${item.quantity} шт. × ${formatMoney(item.price)} ₽ = ${formatMoney(lineTotal)} ₽`,
    );
    lines.push(parts.join(" · "));
  });
  lines.push("", `Итого: ${formatMoney(total)} ₽`);
  if (sourcePage) lines.push(`Страница: ${sourcePage}`);
  lines.push("", `Время: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`);
  return lines.join("\n");
};

const sendLeadMail = async ({ subject, text }) => {
  const mail = getMailConfig();
  if (mail.error) return { ok: false, status: 503, message: mail.error };

  try {
    await mail.transport.sendMail({
      from: `"Салон дверей" <${mail.from}>`,
      to: mail.to,
      replyTo: mail.from,
      subject,
      text,
    });
    return { ok: true };
  } catch (error) {
    console.error("[lead-mail] error:", error?.message || error);
    return {
      ok: false,
      status: 502,
      message: "Не удалось отправить заявку. Попробуйте позже или позвоните нам.",
    };
  }
};

const submitMeasureLead = async (body, meta = {}) => {
  const validated = validatePayload(body);
  if (validated.error) return { ok: false, status: 400, message: validated.error };

  const { name, phone, comment } = validated.data;
  const sourcePage = String(meta.sourcePage || "").trim();
  return sendMeasureLeadMail({ name, phone, comment, sourcePage });
};

const sendMeasureLeadMail = async ({ name, phone, comment, sourcePage }) => {
  const text = formatLeadText({ name, phone, comment, sourcePage });
  return sendLeadMail({
    subject: `Заявка на замер — ${name}, ${phone}`,
    text,
  });
};

const submitCartLead = async (body, meta = {}) => {
  const validated = validateCartPayload(body);
  if (validated.error) return { ok: false, status: 400, message: validated.error };

  const { name, phone, comment, items } = validated.data;
  const sourcePage = String(meta.sourcePage || "").trim();
  return sendCartLeadMail({ name, phone, comment, items, sourcePage });
};

const sendCartLeadMail = async ({ name, phone, comment, items, sourcePage }) => {
  const text = formatCartLeadText({ name, phone, comment, items, sourcePage });
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return sendLeadMail({
    subject: `Заявка из корзины — ${name}, ${formatMoney(total)} ₽`,
    text,
  });
};

module.exports = {
  submitMeasureLead,
  submitCartLead,
  sendMeasureLeadMail,
  sendCartLeadMail,
  formatLeadText,
  formatCartLeadText,
  validatePayload,
  validateCartPayload,
  normalizePhone,
};
