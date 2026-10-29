/**
 * Soft-required product attributes by root category slug.
 * Used by admin UI create (not CSV). Visibility/sort tips live alongside.
 */

const GROUP_RULES = {
  "entry-doors": {
    productAttrs: ["color", "fill", "thickness", "manufacturer"],
    variantAttrs: ["size", "opening"],
    requireVariants: true,
  },
  "interior-doors": {
    productAttrs: ["color", "glass", "width", "height", "manufacturer", "collection"],
    variantAttrs: ["size", "opening"],
    requireVariants: true,
  },
  fittings: {
    productAttrs: ["color", "manufacturer"],
    variantAttrs: [],
    requireVariants: false,
  },
};

const ATTR_HINTS = {
  sort_order:
    "Единственный рычаг сортировки «По популярности» (больше = выше). Пусто = 0, в конце списка.",
  manufacturer:
    "Фильтры и дерево на витрине, название карточки (Браво+стекло), модули Аэлита, остатки Промет. Значение должно совпадать с уже существующими в каталоге.",
  manufacturer_id:
    "Артикул поставщика для остатков и поиска. На витрине в характеристиках не показывается.",
  color:
    "Всегда попадает в название карточки; участвует в фильтрах и группировке siblings по model_key.",
  glass:
    "Фильтр межкомнатных; для Браво добавляется в название карточки.",
  collection:
    "Ось дерева производитель→коллекция на витрине межкомнатных. Без значения товар хуже находится в фильтре.",
  fill: "Фильтр витрин входных / термо дверей.",
  thickness: "Фильтр входных дверей (слайдер диапазона на витрине).",
  width: "Фильтр межкомнатных; полезно и для входных (карточка/КП).",
  height: "Фильтр межкомнатных; полезно и для входных (карточка/КП).",
  size: "Размер на карточке товара (разновидность). Без вариантов покупатель не выберет комплектацию.",
  opening:
    "Сторона открывания на карточке (разновидность). Заполняйте вместе с размером.",
  model_key:
    "Связывает SKU одной модели разных цветов/стёкол. Одинаковое название + общий model_key.",
  pogonazh_id: "Связь с погонажем для цены комплекта на карточке.",
  handle_color_code: "Код цвета для чипов фурнитуры на витрине.",
  glazing: "Со стеклопакетом — полезно для входных дверей и КП.",
};

const GENERAL_HINTS = [
  "Без реального фото товар не попадает в листинг каталога.",
  "Поиск индексирует любые значения характеристик — опечатки в color/manufacturer ломают выдачу.",
];

const getRulesForRootSlug = (rootSlug) => {
  const slug = String(rootSlug || "").trim();
  return GROUP_RULES[slug] || {
    productAttrs: [],
    variantAttrs: [],
    requireVariants: false,
  };
};

const attrMapFromPayload = (attributes, attrDefs) => {
  const byId = new Map((attrDefs || []).map((def) => [Number(def.id), def]));
  const byCode = {};
  for (const entry of attributes || []) {
    const def = byId.get(Number(entry?.attributeId));
    if (!def) continue;
    let value = "";
    if (def.type === "number") {
      if (entry.valueNumber === null || entry.valueNumber === undefined || entry.valueNumber === "") {
        value = "";
      } else {
        value = String(entry.valueNumber);
      }
    } else {
      value = String(entry?.valueText ?? "").trim();
    }
    if (value !== "") byCode[def.code] = value;
  }
  return byCode;
};

const variantHasAttrs = (variant, codes, attrDefs) => {
  const map = attrMapFromPayload(variant?.attributes, attrDefs);
  return codes.every((code) => String(map[code] || "").trim() !== "");
};

/**
 * @returns {{ ok: true } | { ok: false, message: string, fields: string[] }}
 */
const validateProductCreatePayload = ({
  rootSlug,
  attributes = [],
  variants,
  imageUrls = [],
  imageUrl,
  attrDefs = [],
  requireImage = true,
} = {}) => {
  const rules = getRulesForRootSlug(rootSlug);
  const fields = [];
  const knownCodes = new Set((attrDefs || []).map((def) => String(def.code || "")));
  const byId = new Map((attrDefs || []).map((def) => [Number(def.id), def]));
  // Only enforce required attrs that were actually submitted (shown in the create form).
  const submittedCodes = new Set();
  for (const entry of attributes || []) {
    const def = byId.get(Number(entry?.attributeId));
    if (def?.code) submittedCodes.add(def.code);
  }
  const requiredProductAttrs = rules.productAttrs.filter(
    (code) => knownCodes.has(code) && submittedCodes.has(code),
  );
  const requiredVariantAttrs = rules.variantAttrs.filter((code) => knownCodes.has(code));
  const productMap = attrMapFromPayload(attributes, attrDefs);

  for (const code of requiredProductAttrs) {
    if (!String(productMap[code] || "").trim()) {
      fields.push(code);
    }
  }

  if (rules.requireVariants && requiredVariantAttrs.length > 0) {
    const list = Array.isArray(variants) ? variants : [];
    if (list.length === 0) {
      fields.push("variants");
    } else {
      const incomplete = list.some(
        (variant) => !variantHasAttrs(variant, requiredVariantAttrs, attrDefs),
      );
      if (incomplete) {
        for (const code of requiredVariantAttrs) {
          if (!fields.includes(code)) fields.push(code);
        }
      }
    }
  }

  if (requireImage) {
    const urls = [
      ...(Array.isArray(imageUrls) ? imageUrls : []),
      imageUrl,
    ]
      .map((url) => String(url || "").trim())
      .filter(Boolean);
    if (urls.length === 0) {
      fields.push("image");
    }
  }

  if (fields.length === 0) return { ok: true };

  const labels = fields
    .map((code) => {
      if (code === "variants") return "разновидности (размер/открывание)";
      if (code === "image") return "фото";
      return code;
    })
    .join(", ");

  return {
    ok: false,
    message: `Заполните обязательные поля для этой группы: ${labels}`,
    fields,
  };
};

module.exports = {
  GROUP_RULES,
  ATTR_HINTS,
  GENERAL_HINTS,
  getRulesForRootSlug,
  validateProductCreatePayload,
};
