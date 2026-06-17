const { formatCartItemName } = require("../../cart-item-name");
const { computeLeadTotals } = require("./leadPricing");
const { formatRublesInWords } = require("./rublesInWords");
const formatContractPrice = (price) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);
const formatContractDate = (value) => {
  if (!value) return "—";
  try {
    const raw = String(value);
    const date = raw.includes("T") ? new Date(raw) : new Date(`${raw}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const resolveContractNumber = (lead) => {
  const explicit = String(lead?.contractNumber || "").trim();
  if (explicit) return explicit;
  return `Д-${lead?.id ?? "000"}`;
};

const buildContractData = (lead) => {
  const items = Array.isArray(lead?.items) ? lead.items : [];
  const contractDateSource = lead?.contractDate || lead?.createdAt || null;
  const totals = computeLeadTotals(items, lead?.discountKind, lead?.discountValue);
  const totalPriceFormatted = formatContractPrice(totals.total);
  const subtotalFormatted = formatContractPrice(totals.subtotal);
  const discountFormatted =
    totals.discountAmount > 0 ? formatContractPrice(totals.discountAmount) : "—";
  const itogoWords = formatRublesInWords(totals.total);

  return {
    customerName: String(lead?.customerName || "").trim(),
    phone: String(lead?.phone || "").trim(),
    address: String(lead?.address || "").trim() || "—",
    contractNumber: resolveContractNumber(lead),
    contractDate: formatContractDate(contractDateSource),
    totalPriceFormatted,
    subtotalFormatted,
    discountFormatted,
    skidka: discountFormatted,
    itogo: totalPriceFormatted,
    itogoPropisju: itogoWords.full,
    itogoSlovami: itogoWords.inParentheses,
    itogoWords: itogoWords.wordsCap,
    itogoRubley: itogoWords.rublesLabel,
    itogoKopeek: `${itogoWords.kopecks} ${itogoWords.kopecksLabel}`,
    items: items.map((item, index) => {      const quantity = Number(item?.quantity) || 0;
      const price = Number(item?.price) || 0;
      const priceFormatted = formatContractPrice(price);
      const lineTotalFormatted = formatContractPrice(price * quantity);

      return {
        index: index + 1,
        name: formatCartItemName(item?.name, item?.color),
        sku: String(item?.sku || "").trim() || "—",
        color: String(item?.color || "").trim() || "—",
        quantity,
        priceFormatted,
        lineTotalFormatted,
        // Aliases for custom Word templates (kolvo / cena / summa).
        kolvo: quantity,
        cena: priceFormatted,
        summa: lineTotalFormatted,
      };
    }),
  };
};

const buildContractFilename = (lead) => {
  const number = resolveContractNumber(lead).replace(/[\\/:*?"<>|]+/g, "-");
  return `dogovor-${number}.docx`;
};

module.exports = {
  formatContractPrice,
  formatContractDate,
  resolveContractNumber,
  buildContractData,
  buildContractFilename,
};
