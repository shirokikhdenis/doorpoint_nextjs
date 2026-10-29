export type ProductGroupRules = {
  productAttrs: string[];
  variantAttrs: string[];
  requireVariants: boolean;
};

export const PRODUCT_GROUP_RULES: Record<string, ProductGroupRules> = {
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

export const PRODUCT_ATTR_HINTS: Record<string, string> = {
  sort_order:
    "Единственный рычаг сортировки «По популярности» (больше = выше). Пусто = 0, в конце списка.",
  manufacturer:
    "Фильтры и дерево на витрине, название карточки (Браво+стекло), модули Аэлита, остатки Промет. Значение должно совпадать с уже существующими в каталоге.",
  manufacturer_id:
    "Артикул поставщика для остатков и поиска. На витрине в характеристиках не показывается.",
  color:
    "Всегда попадает в название карточки; участвует в фильтрах и группировке siblings по model_key.",
  glass: "Фильтр межкомнатных; для Браво добавляется в название карточки.",
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

export const PRODUCT_GENERAL_HINTS = [
  "Без реального фото товар не попадает в листинг каталога.",
  "Поиск индексирует любые значения характеристик — опечатки в color/manufacturer ломают выдачу.",
] as const;

export const getRulesForRootSlug = (rootSlug: string | null | undefined): ProductGroupRules => {
  const slug = String(rootSlug || "").trim();
  return (
    PRODUCT_GROUP_RULES[slug] || {
      productAttrs: [],
      variantAttrs: [],
      requireVariants: false,
    }
  );
};

export const isProductAttrRequired = (
  rootSlug: string | null | undefined,
  code: string,
  availableCodes?: Iterable<string>,
) => {
  if (!getRulesForRootSlug(rootSlug).productAttrs.includes(code)) return false;
  if (!availableCodes) return true;
  const known = new Set(Array.from(availableCodes));
  return known.has(code);
};

export const getRequiredVariantAttrCodes = (
  rootSlug: string | null | undefined,
  availableCodes?: Iterable<string>,
) => {
  const codes = getRulesForRootSlug(rootSlug).variantAttrs;
  if (!availableCodes) return codes;
  const known = new Set(Array.from(availableCodes));
  return codes.filter((code) => known.has(code));
};
