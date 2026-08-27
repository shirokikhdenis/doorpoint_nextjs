"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CATALOG_CARDS_PER_ROW_MAX,
  CATALOG_CARDS_PER_ROW_MIN,
  CATALOG_GRID_ROWS_MAX,
  CATALOG_GRID_ROWS_MIN,
  clampCardsPerRow,
  clampGridRows,
  parseCardImageHeight,
  type CatalogCardImageHeight,
} from "@/features/catalog/catalog-constants";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { Button } from "@/components/ui/button";
import type { HomePromoCard } from "@/features/home/home-promotions";

type VitrineGrid = {
  id: number;
  name: string;
  slug: string;
  cardsPerRow: number;
  gridRows: number;
  cardImageHeight: CatalogCardImageHeight;
};

type EditorRow = {
  cardsPerRow: number;
  gridRows: number;
  cardImageHeight: CatalogCardImageHeight;
};

type ProductCardLayout = {
  relatedFittingsCardsPerRow: number;
  collectionDoorsCardsPerRow: number;
  suggestedHandlesCardsPerRow: number;
  subcategoryDoorsCardsPerRow: number;
};

type HomeLayout = {
  homeHitsCardsPerRow: number;
  homePortfolioCardsPerRow: number;
};

const DEFAULT_PRODUCT_LAYOUT: ProductCardLayout = {
  relatedFittingsCardsPerRow: 6,
  collectionDoorsCardsPerRow: 4,
  suggestedHandlesCardsPerRow: 6,
  subcategoryDoorsCardsPerRow: 4,
};

const DEFAULT_HOME_LAYOUT: HomeLayout = {
  homeHitsCardsPerRow: 4,
  homePortfolioCardsPerRow: 4,
};

const DEFAULT_FACTORY_COLS = 2;

const DEFAULT_PROMO_CARDS: HomePromoCard[] = [
  {
    icon: "price",
    title: "Гарантия лучшей цены",
    description: "Найдете дешевле - сделаем скидку!",
    href: null,
    variant: "default",
  },
  {
    icon: "catalog",
    title: "Двери на любой вкус от ведущих фабрик РФ",
    description: "Перейти в каталог",
    href: "/catalog",
    variant: "default",
  },
  {
    icon: "measure",
    title: "Бесплатный замер",
    description: "Оставить заявку",
    href: "/#zamer-form",
    variant: "offer",
  },
];

const clampFactoryCols = (value: unknown, fallback = DEFAULT_FACTORY_COLS) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(3, Math.max(2, Math.round(n)));
};

const parseVitrines = (value: unknown): VitrineGrid[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      const id = Number(row.id);
      if (!Number.isFinite(id) || id <= 0) return null;
      return {
        id,
        name: String(row.name || ""),
        slug: String(row.slug || ""),
        cardsPerRow: clampCardsPerRow(row.cardsPerRow),
        gridRows: clampGridRows(row.gridRows),
        cardImageHeight: parseCardImageHeight(row.cardImageHeight),
      };
    })
    .filter((entry): entry is VitrineGrid => entry !== null);
};

const parseProductLayout = (value: unknown): ProductCardLayout => {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    relatedFittingsCardsPerRow: clampCardsPerRow(
      row.relatedFittingsCardsPerRow,
      DEFAULT_PRODUCT_LAYOUT.relatedFittingsCardsPerRow,
    ),
    collectionDoorsCardsPerRow: clampCardsPerRow(
      row.collectionDoorsCardsPerRow,
      DEFAULT_PRODUCT_LAYOUT.collectionDoorsCardsPerRow,
    ),
    suggestedHandlesCardsPerRow: clampCardsPerRow(
      row.suggestedHandlesCardsPerRow,
      DEFAULT_PRODUCT_LAYOUT.suggestedHandlesCardsPerRow,
    ),
    subcategoryDoorsCardsPerRow: clampCardsPerRow(
      row.subcategoryDoorsCardsPerRow,
      DEFAULT_PRODUCT_LAYOUT.subcategoryDoorsCardsPerRow,
    ),
  };
};

const parseHomeLayout = (value: unknown): HomeLayout => {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    homeHitsCardsPerRow: clampCardsPerRow(row.homeHitsCardsPerRow, DEFAULT_HOME_LAYOUT.homeHitsCardsPerRow),
    homePortfolioCardsPerRow: clampCardsPerRow(
      row.homePortfolioCardsPerRow,
      DEFAULT_HOME_LAYOUT.homePortfolioCardsPerRow,
    ),
  };
};

const parseFactoryCols = (value: unknown) => {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return clampFactoryCols(row.factoryCardsPerRow);
};

const parsePromoCards = (value: unknown): HomePromoCard[] => {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const raw = Array.isArray(row.homePromoCards) ? row.homePromoCards : [];
  return DEFAULT_PROMO_CARDS.map((fallback, index) => {
    const entry = raw[index] && typeof raw[index] === "object" ? (raw[index] as Record<string, unknown>) : {};
    const icon = entry.icon === "catalog" || entry.icon === "measure" || entry.icon === "price" ? entry.icon : fallback.icon;
    return {
      icon,
      title: String(entry.title != null ? entry.title : fallback.title),
      description: String(entry.description != null ? entry.description : fallback.description),
      href: entry.href === undefined ? fallback.href : String(entry.href || "").trim() || null,
      variant: entry.variant === "offer" ? "offer" : "default",
    };
  });
};

function CardsPerRowInput({
  id,
  label,
  value,
  fallback,
  min = CATALOG_CARDS_PER_ROW_MIN,
  max = CATALOG_CARDS_PER_ROW_MAX,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  fallback: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-admin-text-muted" htmlFor={id}>
      {label}
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        onBlur={() => onChange(Math.min(max, Math.max(min, Number.isFinite(value) ? Math.round(value) : fallback)))}
        className="w-24 rounded border border-admin-border bg-admin-surface px-3 py-1.5 text-sm text-admin-text"
      />
    </label>
  );
}

const fieldClass = "w-full rounded border border-admin-border bg-admin-surface px-3 py-1.5 text-sm text-admin-text";

export default function AdminFrontendCardsPage() {
  const [pages, setPages] = useState<VitrineGrid[]>([]);
  const [drafts, setDrafts] = useState<Record<number, EditorRow>>({});
  const [productLayout, setProductLayout] = useState<ProductCardLayout>(DEFAULT_PRODUCT_LAYOUT);
  const [productDraft, setProductDraft] = useState<ProductCardLayout>(DEFAULT_PRODUCT_LAYOUT);
  const [homeLayout, setHomeLayout] = useState<HomeLayout>(DEFAULT_HOME_LAYOUT);
  const [homeDraft, setHomeDraft] = useState<HomeLayout>(DEFAULT_HOME_LAYOUT);
  const [factoryCols, setFactoryCols] = useState(DEFAULT_FACTORY_COLS);
  const [factoryDraft, setFactoryDraft] = useState(DEFAULT_FACTORY_COLS);
  const [promoCards, setPromoCards] = useState<HomePromoCard[]>(DEFAULT_PROMO_CARDS);
  const [promoDraft, setPromoDraft] = useState<HomePromoCard[]>(DEFAULT_PROMO_CARDS);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | "product" | "home" | "factories" | "promo" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const [pagesResponse, settingsResponse] = await Promise.all([
          fetch("/api/admin/catalog-pages"),
          fetch("/api/admin/storefront-settings"),
        ]);
        if (!pagesResponse.ok) throw new Error("Не удалось загрузить витрины");
        if (!settingsResponse.ok) throw new Error("Не удалось загрузить настройки карточек");
        const nextPages = parseVitrines(await pagesResponse.json());
        const settingsJson = await settingsResponse.json();
        const nextLayout = parseProductLayout(settingsJson);
        const nextHome = parseHomeLayout(settingsJson);
        const nextFactory = parseFactoryCols(settingsJson);
        const nextPromo = parsePromoCards(settingsJson);
        if (cancelled) return;
        setPages(nextPages);
        setDrafts(
          Object.fromEntries(
            nextPages.map((page) => [
              page.id,
              {
                cardsPerRow: page.cardsPerRow,
                gridRows: page.gridRows,
                cardImageHeight: page.cardImageHeight,
              },
            ]),
          ),
        );
        setProductLayout(nextLayout);
        setProductDraft(nextLayout);
        setHomeLayout(nextHome);
        setHomeDraft(nextHome);
        setFactoryCols(nextFactory);
        setFactoryDraft(nextFactory);
        setPromoCards(nextPromo);
        setPromoDraft(nextPromo);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchSettings = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/admin/storefront-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  };

  const saveVitrine = async (page: VitrineGrid, event: FormEvent) => {
    event.preventDefault();
    const draft = drafts[page.id];
    if (!draft || savingId != null) return;
    setSavingId(page.id);
    setError("");
    setNotice("");
    try {
      const cardsPerRow = clampCardsPerRow(draft.cardsPerRow);
      const gridRows = clampGridRows(draft.gridRows);
      const cardImageHeight = parseCardImageHeight(draft.cardImageHeight);
      const response = await fetch(`/api/admin/catalog-pages/${page.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardsPerRow, gridRows, cardImageHeight }),
      });
      if (!response.ok) throw new Error(await response.text());
      const saved = parseVitrines([await response.json()])[0];
      const next = saved ?? { ...page, cardsPerRow, gridRows, cardImageHeight };
      setPages((current) => current.map((item) => (item.id === page.id ? { ...item, ...next } : item)));
      setDrafts((current) => ({
        ...current,
        [page.id]: {
          cardsPerRow: next.cardsPerRow,
          gridRows: next.gridRows,
          cardImageHeight: next.cardImageHeight,
        },
      }));
      setNotice(`Сетка витрины «${page.name}» сохранена.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  const saveProductLayout = async (event: FormEvent) => {
    event.preventDefault();
    if (savingId != null) return;
    setSavingId("product");
    setError("");
    setNotice("");
    try {
      const payload: ProductCardLayout = {
        relatedFittingsCardsPerRow: clampCardsPerRow(
          productDraft.relatedFittingsCardsPerRow,
          DEFAULT_PRODUCT_LAYOUT.relatedFittingsCardsPerRow,
        ),
        collectionDoorsCardsPerRow: clampCardsPerRow(
          productDraft.collectionDoorsCardsPerRow,
          DEFAULT_PRODUCT_LAYOUT.collectionDoorsCardsPerRow,
        ),
        suggestedHandlesCardsPerRow: clampCardsPerRow(
          productDraft.suggestedHandlesCardsPerRow,
          DEFAULT_PRODUCT_LAYOUT.suggestedHandlesCardsPerRow,
        ),
        subcategoryDoorsCardsPerRow: clampCardsPerRow(
          productDraft.subcategoryDoorsCardsPerRow,
          DEFAULT_PRODUCT_LAYOUT.subcategoryDoorsCardsPerRow,
        ),
      };
      const saved = parseProductLayout(await patchSettings(payload));
      setProductLayout(saved);
      setProductDraft(saved);
      setNotice("Сетка карточек на странице товара сохранена.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  const saveHomeLayout = async (event: FormEvent) => {
    event.preventDefault();
    if (savingId != null) return;
    setSavingId("home");
    setError("");
    setNotice("");
    try {
      const payload: HomeLayout = {
        homeHitsCardsPerRow: clampCardsPerRow(homeDraft.homeHitsCardsPerRow, DEFAULT_HOME_LAYOUT.homeHitsCardsPerRow),
        homePortfolioCardsPerRow: clampCardsPerRow(
          homeDraft.homePortfolioCardsPerRow,
          DEFAULT_HOME_LAYOUT.homePortfolioCardsPerRow,
        ),
      };
      const saved = parseHomeLayout(await patchSettings(payload));
      setHomeLayout(saved);
      setHomeDraft(saved);
      setNotice("Сетка главной страницы сохранена.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  const saveFactoryLayout = async (event: FormEvent) => {
    event.preventDefault();
    if (savingId != null) return;
    setSavingId("factories");
    setError("");
    setNotice("");
    try {
      const factoryCardsPerRow = clampFactoryCols(factoryDraft);
      const saved = parseFactoryCols(await patchSettings({ factoryCardsPerRow }));
      setFactoryCols(saved);
      setFactoryDraft(saved);
      setNotice("Сетка фабрик и коллекций сохранена.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  const savePromoCards = async (event: FormEvent) => {
    event.preventDefault();
    if (savingId != null) return;
    setSavingId("promo");
    setError("");
    setNotice("");
    try {
      const homePromoCards = promoDraft.map((card, index) => ({
        icon: card.icon,
        title: card.title.trim() || DEFAULT_PROMO_CARDS[index].title,
        description: card.description.trim() || DEFAULT_PROMO_CARDS[index].description,
        href: card.href?.trim() || null,
        variant: card.variant,
      }));
      const saved = parsePromoCards(await patchSettings({ homePromoCards }));
      setPromoCards(saved);
      setPromoDraft(saved);
      setNotice("Промо-карточки на главной сохранены.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  const fittingsDraft = clampCardsPerRow(
    productDraft.relatedFittingsCardsPerRow,
    DEFAULT_PRODUCT_LAYOUT.relatedFittingsCardsPerRow,
  );
  const collectionDraft = clampCardsPerRow(
    productDraft.collectionDoorsCardsPerRow,
    DEFAULT_PRODUCT_LAYOUT.collectionDoorsCardsPerRow,
  );
  const handlesDraft = clampCardsPerRow(
    productDraft.suggestedHandlesCardsPerRow,
    DEFAULT_PRODUCT_LAYOUT.suggestedHandlesCardsPerRow,
  );
  const subcategoryDraft = clampCardsPerRow(
    productDraft.subcategoryDoorsCardsPerRow,
    DEFAULT_PRODUCT_LAYOUT.subcategoryDoorsCardsPerRow,
  );
  const productDirty =
    fittingsDraft !== productLayout.relatedFittingsCardsPerRow ||
    collectionDraft !== productLayout.collectionDoorsCardsPerRow ||
    handlesDraft !== productLayout.suggestedHandlesCardsPerRow ||
    subcategoryDraft !== productLayout.subcategoryDoorsCardsPerRow;

  const homeHitsDraft = clampCardsPerRow(homeDraft.homeHitsCardsPerRow, DEFAULT_HOME_LAYOUT.homeHitsCardsPerRow);
  const homePortfolioDraft = clampCardsPerRow(
    homeDraft.homePortfolioCardsPerRow,
    DEFAULT_HOME_LAYOUT.homePortfolioCardsPerRow,
  );
  const homeDirty =
    homeHitsDraft !== homeLayout.homeHitsCardsPerRow ||
    homePortfolioDraft !== homeLayout.homePortfolioCardsPerRow;

  const factoryDraftClamped = clampFactoryCols(factoryDraft);
  const factoryDirty = factoryDraftClamped !== factoryCols;
  const promoDirty = JSON.stringify(promoDraft) !== JSON.stringify(promoCards);

  return (
    <AdminPage
      title="Фронтенд-карточки"
      description="Сколько карточек показывать в ряд на витринах, главной, фабриках и странице товара — и тексты трёх промо-карточек под слайдером."
    >
      {notice ? (
        <AdminNotice variant="success" onDismiss={() => setNotice("")}>
          {notice}
        </AdminNotice>
      ) : null}
      {error ? (
        <AdminNotice variant="error" onDismiss={() => setError("")}>
          {error}
        </AdminNotice>
      ) : null}

      {loading ? (
        <AdminCard>
          <p className="text-sm text-admin-text-muted">Загрузка…</p>
        </AdminCard>
      ) : (
        <>
          <AdminCard
            title="Карточка товара"
            description="Сетка блоков на странице товара. Для ручек, дверей коллекции и «Смотрите также» в ряд выводится столько моделей, сколько задано колонок."
          >
            <form onSubmit={(event) => void saveProductLayout(event)} className="flex flex-wrap items-end gap-4">
              <CardsPerRowInput
                id="related-fittings-cols"
                label="Сопутствующая фурнитура"
                value={productDraft.relatedFittingsCardsPerRow}
                fallback={DEFAULT_PRODUCT_LAYOUT.relatedFittingsCardsPerRow}
                onChange={(relatedFittingsCardsPerRow) =>
                  setProductDraft((current) => ({ ...current, relatedFittingsCardsPerRow }))
                }
              />
              <CardsPerRowInput
                id="suggested-handles-cols"
                label="Выберите ручки"
                value={productDraft.suggestedHandlesCardsPerRow}
                fallback={DEFAULT_PRODUCT_LAYOUT.suggestedHandlesCardsPerRow}
                onChange={(suggestedHandlesCardsPerRow) =>
                  setProductDraft((current) => ({ ...current, suggestedHandlesCardsPerRow }))
                }
              />
              <CardsPerRowInput
                id="collection-doors-cols"
                label="Двери из той же коллекции"
                value={productDraft.collectionDoorsCardsPerRow}
                fallback={DEFAULT_PRODUCT_LAYOUT.collectionDoorsCardsPerRow}
                onChange={(collectionDoorsCardsPerRow) =>
                  setProductDraft((current) => ({ ...current, collectionDoorsCardsPerRow }))
                }
              />
              <CardsPerRowInput
                id="subcategory-doors-cols"
                label="Смотрите также"
                value={productDraft.subcategoryDoorsCardsPerRow}
                fallback={DEFAULT_PRODUCT_LAYOUT.subcategoryDoorsCardsPerRow}
                onChange={(subcategoryDoorsCardsPerRow) =>
                  setProductDraft((current) => ({ ...current, subcategoryDoorsCardsPerRow }))
                }
              />
              <p className="mb-1.5 text-xs text-admin-text-faint">
                {CATALOG_CARDS_PER_ROW_MIN}–{CATALOG_CARDS_PER_ROW_MAX} в ряд
              </p>
              <Button type="submit" size="sm" disabled={!productDirty || savingId != null}>
                {savingId === "product" ? "Сохраняем…" : productDirty ? "Сохранить" : "Без изменений"}
              </Button>
            </form>
          </AdminCard>

          <AdminCard
            title="Главная"
            description="Колонки хитов и превью «Наши работы». Сколько работ показать на главной — столько, сколько колонок."
          >
            <form onSubmit={(event) => void saveHomeLayout(event)} className="flex flex-wrap items-end gap-4">
              <CardsPerRowInput
                id="home-hits-cols"
                label="Хиты и блоки товаров"
                value={homeDraft.homeHitsCardsPerRow}
                fallback={DEFAULT_HOME_LAYOUT.homeHitsCardsPerRow}
                onChange={(homeHitsCardsPerRow) => setHomeDraft((current) => ({ ...current, homeHitsCardsPerRow }))}
              />
              <CardsPerRowInput
                id="home-portfolio-cols"
                label="Наши работы"
                value={homeDraft.homePortfolioCardsPerRow}
                fallback={DEFAULT_HOME_LAYOUT.homePortfolioCardsPerRow}
                onChange={(homePortfolioCardsPerRow) =>
                  setHomeDraft((current) => ({ ...current, homePortfolioCardsPerRow }))
                }
              />
              <Button type="submit" size="sm" disabled={!homeDirty || savingId != null}>
                {savingId === "home" ? "Сохраняем…" : homeDirty ? "Сохранить" : "Без изменений"}
              </Button>
            </form>
          </AdminCard>

          <AdminCard
            title="Промо-карточки на главной"
            description="Три карточки под слайдером. Если ссылка пустая, текст под заголовком — обычная подпись; если заполнена — текст кнопки."
          >
            <form onSubmit={(event) => void savePromoCards(event)} className="space-y-6">
              {promoDraft.map((card, index) => (
                <div key={index} className="grid gap-3 rounded-md border border-admin-border p-3 sm:grid-cols-2">
                  <p className="sm:col-span-2 text-sm font-medium text-admin-text">Карточка {index + 1}</p>
                  <label className="flex flex-col gap-1 text-xs text-admin-text-muted">
                    Заголовок
                    <input
                      className={fieldClass}
                      value={card.title}
                      onChange={(event) =>
                        setPromoDraft((current) =>
                          current.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)),
                        )
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-admin-text-muted">
                    Текст / кнопка
                    <input
                      className={fieldClass}
                      value={card.description}
                      onChange={(event) =>
                        setPromoDraft((current) =>
                          current.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)),
                        )
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-admin-text-muted">
                    Ссылка
                    <input
                      className={fieldClass}
                      value={card.href ?? ""}
                      placeholder="/catalog"
                      onChange={(event) =>
                        setPromoDraft((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, href: event.target.value || null } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex flex-col gap-1 text-xs text-admin-text-muted">
                      Иконка
                      <select
                        className={fieldClass}
                        value={card.icon}
                        onChange={(event) =>
                          setPromoDraft((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, icon: event.target.value as HomePromoCard["icon"] }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="price">Ценник</option>
                        <option value="catalog">Дверь</option>
                        <option value="measure">Линейка</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-admin-text-muted">
                      Вид
                      <select
                        className={fieldClass}
                        value={card.variant}
                        onChange={(event) =>
                          setPromoDraft((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, variant: event.target.value === "offer" ? "offer" : "default" }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="default">Обычная</option>
                        <option value="offer">Синяя</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
              <Button type="submit" size="sm" disabled={!promoDirty || savingId != null}>
                {savingId === "promo" ? "Сохраняем…" : promoDirty ? "Сохранить" : "Без изменений"}
              </Button>
            </form>
          </AdminCard>

          <AdminCard title="Фабрики и коллекции" description="Сколько ярлыков в ряд на /fabriki и страницах коллекций.">
            <form onSubmit={(event) => void saveFactoryLayout(event)} className="flex flex-wrap items-end gap-4">
              <CardsPerRowInput
                id="factory-cols"
                label="Карточек в ряд"
                value={factoryDraft}
                fallback={DEFAULT_FACTORY_COLS}
                min={2}
                max={3}
                onChange={setFactoryDraft}
              />
              <p className="mb-1.5 text-xs text-admin-text-faint">2 или 3</p>
              <Button type="submit" size="sm" disabled={!factoryDirty || savingId != null}>
                {savingId === "factories" ? "Сохраняем…" : factoryDirty ? "Сохранить" : "Без изменений"}
              </Button>
            </form>
          </AdminCard>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-admin-text">Витрины каталога</h2>
            {pages.length === 0 ? (
              <AdminEmptyState
                title="Витрин пока нет"
                description="Сначала создайте витрину в разделе «Витрина → Витрины каталога»."
              />
            ) : (
              pages.map((page) => {
                const draft = drafts[page.id] ?? {
                  cardsPerRow: page.cardsPerRow,
                  gridRows: page.gridRows,
                  cardImageHeight: page.cardImageHeight,
                };
                const cardsPerRow = clampCardsPerRow(draft.cardsPerRow);
                const gridRows = clampGridRows(draft.gridRows);
                const cardImageHeight = parseCardImageHeight(draft.cardImageHeight);
                const dirty =
                  cardsPerRow !== page.cardsPerRow ||
                  gridRows !== page.gridRows ||
                  cardImageHeight !== page.cardImageHeight;
                const firstPageCount = cardsPerRow * gridRows;
                return (
                  <AdminCard key={page.id} title={page.name} description={`/${page.slug}`}>
                    <form
                      onSubmit={(event) => void saveVitrine(page, event)}
                      className="flex flex-wrap items-end gap-4"
                    >
                      <CardsPerRowInput
                        id={`vitrine-cols-${page.id}`}
                        label="Карточек в ряд"
                        value={draft.cardsPerRow}
                        fallback={4}
                        onChange={(next) =>
                          setDrafts((current) => {
                            const row = current[page.id] ?? draft;
                            return {
                              ...current,
                              [page.id]: { ...row, cardsPerRow: next },
                            };
                          })
                        }
                      />
                      <label className="flex flex-col gap-1 text-xs text-admin-text-muted">
                        Рядов до «Показать ещё»
                        <input
                          type="number"
                          min={CATALOG_GRID_ROWS_MIN}
                          max={CATALOG_GRID_ROWS_MAX}
                          value={draft.gridRows}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [page.id]: {
                                ...draft,
                                gridRows: Number(event.target.value) || 0,
                              },
                            }))
                          }
                          onBlur={() =>
                            setDrafts((current) => {
                              const row = current[page.id] ?? draft;
                              return {
                                ...current,
                                [page.id]: { ...row, gridRows: clampGridRows(row.gridRows) },
                              };
                            })
                          }
                          className="w-32 rounded border border-admin-border bg-admin-surface px-3 py-1.5 text-sm text-admin-text"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-admin-text-muted">
                        Высота фото
                        <select
                          value={draft.cardImageHeight}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [page.id]: {
                                ...draft,
                                cardImageHeight: parseCardImageHeight(event.target.value),
                              },
                            }))
                          }
                          className="w-40 rounded border border-admin-border bg-admin-surface px-3 py-1.5 text-sm text-admin-text"
                        >
                          <option value="default">Обычная</option>
                          <option value="compact">Компактная</option>
                        </select>
                      </label>
                      <p className="mb-1.5 text-xs text-admin-text-muted">
                        В первой выдаче: {firstPageCount} карточек
                      </p>
                      <Button type="submit" size="sm" disabled={!dirty || savingId != null}>
                        {savingId === page.id ? "Сохраняем…" : dirty ? "Сохранить" : "Без изменений"}
                      </Button>
                    </form>
                  </AdminCard>
                );
              })
            )}
          </div>
        </>
      )}
    </AdminPage>
  );
}
