/**
 * Семантика атрибутов: что считается «осью варианта» и как нормализовать имя.
 *
 * Раньше эти данные жили в нескольких источниках (флаги в БД + хардкод-набор кодов
 * + распознавание по имени). Теперь источник один — attribute_definitions.scope:
 *   'product' — характеристика модели (цвет, наполнение, толщина)
 *   'variant' — ось варианта (размер, открывание)
 */

const normalizeAttrNameKey = (name) =>
  String(name || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");

const isVariantAxisRow = (row) => {
  if (!row) return false;
  if (row.scope === "variant") return true;
  return row.isVariantAxis === true;
};

const normalizeAttributeLabel = (name) =>
  String(name || "")
    .trim()
    .replace(/\s+/g, " ");

module.exports = {
  normalizeAttrNameKey,
  isVariantAxisRow,
  normalizeAttributeLabel,
};
