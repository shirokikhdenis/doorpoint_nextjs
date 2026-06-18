import { buildPageTitle } from "@/lib/site-seo";

export type SeoPageCopy = {
  title: string;
  description: string;
};

/** DB override → fallback from this file. */
export const resolveSeoDescription = (
  override: string | null | undefined,
  fallback: string,
): string => {
  const trimmed = String(override ?? "").trim();
  return trimmed || fallback;
};

export const resolveSeoTitle = (
  override: string | null | undefined,
  fallback: string,
): string => {
  const trimmed = String(override ?? "").trim();
  return trimmed || fallback;
};

export const SEO_COPY = {
  home: {
    title: buildPageTitle("Двери в Архангельске"),
    description:
      "Дверная Точка — салон входных и межкомнатных дверей в Архангельске. Более 1000 моделей в наличии и под заказ, бесплатный замер и монтаж под ключ с гарантией.",
  },
  contact: {
    title: buildPageTitle("Контакты салона"),
    description:
      "Салон дверей в ТЦ «Новосёл», Архангельск, пр. Московский, д. 25. Тел. +7 921 290 5999. Пн–Пт 11–19, Сб–Вс 11–17. Запишитесь на бесплатный замер!",
  },
  uslugi: {
    title: buildPageTitle("Монтаж и доставка"),
    description:
      "Профессиональный монтаж межкомнатных и входных дверей от 3500₽ в Архангельске, Новодвинске, Северодвинске. Доставка, подъём, демонтаж старой двери. Прайс и условия на сайте.",
  },
  portfolio: {
    title: buildPageTitle("Наши работы"),
    description:
      "Фото наших работ по монтажу входных и межкомнатных дверей в Архангельске, Новодвинске, Северодвинске.",
  },
  privacy: {
    title: buildPageTitle("Политика конфиденциальности"),
    description:
      "Политика обработки персональных данных салона дверей Дверная Точка в Архангельске.",
  },
  catalog: {
    all: {
      title: buildPageTitle("Каталог"),
      description:
        "Мультибрендовый салон входных и межкомнатных дверей в Архангельске в ТЦ Новосёл. Подберите свою дверь по цене, размеру, материалу и стилю.",
    },
    "dveri-mezhkomnatnyye": {
      title: buildPageTitle("Межкомнатные двери"),
      description:
        "Огромный выбор качественных межкомнатных дверей в Архангельске в ТЦ Новосёл. ПЭТ, ПВХ, Эмаль, Экошпон, Массив. Бесплатный замер и монтаж под ключ.",
    },
    "vhodnye-dveri": {
      title: buildPageTitle("Входные двери"),
      description:
        "Входные двери с профессиональной установкой в квартиру и дом. С шумоизоляцией, зеркалом, терморазрывом, стеклопакетом. Бесплатный замер и монтаж под ключ.",
    },
    "termo-dveri": {
      title: buildPageTitle("Двери с терморазрывом"),
      description:
        "Уличные входные двери с терморазрывом для дома и коттеджа. Глухие и со стеклопакетом. Изготовление нестандартных размеров. В наличии и под заказ.",
    },
    furnitura: {
      title: buildPageTitle("Фурнитура для дверей"),
      description:
        "Ручки, замки и комплектующие для входных и межкомнатных дверей от фабрик Morelli, Bussare, Addenbau. Подберем под вашу модель. Архангельск, ТЦ «Новосёл».",
    },
  } satisfies Record<string, SeoPageCopy>,
} as const;

export const buildCatalogSeoCopy = (
  catalogPageSlug: string,
  pageName: string,
  overrides?: { seoTitle?: string | null; seoDescription?: string | null },
): SeoPageCopy => {
  const preset =
    SEO_COPY.catalog[catalogPageSlug as keyof typeof SEO_COPY.catalog] ??
    null;
  const fallbackTitle =
    catalogPageSlug === "all"
      ? SEO_COPY.catalog.all.title
      : buildPageTitle(pageName);
  const fallbackDescription =
    preset?.description ??
    `${pageName} в Архангельске. Подбор, бесплатный замер, доставка и монтаж дверей под ключ. Салон Дверная Точка.`;

  return {
    title: resolveSeoTitle(overrides?.seoTitle, preset?.title ?? fallbackTitle),
    description: resolveSeoDescription(overrides?.seoDescription, fallbackDescription),
  };
};

const formatSeoPrice = (price: number): string => {
  if (!Number.isFinite(price) || price <= 0) return "";
  return `${Math.round(price).toLocaleString("ru-RU")} ₽`;
};

export const buildProductSeoDescription = (input: {
  name: string;
  price?: number | null;
  category?: string | null;
  subcategory?: string | null;
  seoDescriptionOverride?: string | null;
}): string => {
  const override = String(input.seoDescriptionOverride ?? "").trim();
  if (override) return override;

  const name = String(input.name || "").trim();
  const category = [input.category, input.subcategory].filter(Boolean).join(", ") || "Дверь";
  const pricePart = formatSeoPrice(Number(input.price));
  const priceSegment = pricePart ? ` — от ${pricePart}` : "";

  const raw = `${name}${priceSegment}. ${category} в Архангельске. Бесплатный замер, доставка и монтаж под ключ. Салон Дверная Точка.`;
  if (raw.length <= 165) return raw;

  const shorter = `${name}${priceSegment}. ${category} в Архангельске. Замер и монтаж под ключ. Дверная Точка.`;
  if (shorter.length <= 165) return shorter;

  return `${name}${priceSegment}. Замер и монтаж в Архангельске. Дверная Точка.`.slice(0, 165);
};

export const buildProductSeoTitle = (input: {
  name: string;
  seoTitleOverride?: string | null;
}): string => {
  const override = String(input.seoTitleOverride ?? "").trim();
  if (override) return override;
  return buildPageTitle(`${String(input.name || "").trim()} — купить в Архангельске`);
};
