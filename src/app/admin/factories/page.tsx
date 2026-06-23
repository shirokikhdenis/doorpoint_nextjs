"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProductImagePicker } from "@/features/admin/product-image-picker";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { FACTORY_SECTIONS } from "@/lib/factory-sections-config";

type FactoryCardRow = {
  id: number;
  manufacturerName: string;
  isActive: boolean;
  imageUrl: string | null;
  logoUrl: string | null;
  badgeLabel: string | null;
  linkTarget: "collections" | "catalog";
  sortOrder: number;
  productCount: number;
  defaultCoverImage: string | null;
  previewDoorImage: string | null;
  previewLogoImage: string | null;
  collectionsAdminPath: string;
};

type FactoryCardsResponse = {
  section: { id: string; title: string };
  cards: FactoryCardRow[];
};

type CardDraft = {
  isActive: boolean;
  imageUrl: string;
  logoUrl: string;
  badgeLabel: string;
  linkTarget: "collections" | "catalog";
  sortOrder: number;
};

export default function AdminFactoriesPage() {
  const [sectionId, setSectionId] = useState(FACTORY_SECTIONS[0]?.id || "");
  const [data, setData] = useState<FactoryCardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<number, CardDraft>>({});

  const loadCards = useCallback(async (nextSectionId: string) => {
    if (!nextSectionId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/factory-cards?sectionId=${encodeURIComponent(nextSectionId)}`,
      );
      if (!response.ok) throw new Error(await response.text());
      const json = (await response.json()) as FactoryCardsResponse;
      setData(json);
      const nextDrafts: Record<number, CardDraft> = {};
      json.cards.forEach((card) => {
        nextDrafts[card.id] = {
          isActive: card.isActive,
          imageUrl: card.imageUrl || "",
          logoUrl: card.logoUrl || "",
          badgeLabel: card.badgeLabel || "",
          linkTarget: card.linkTarget === "catalog" ? "catalog" : "collections",
          sortOrder: card.sortOrder,
        };
      });
      setDrafts(nextDrafts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCards(sectionId);
  }, [sectionId, loadCards]);

  const saveCard = async (card: FactoryCardRow) => {
    const draft = drafts[card.id];
    if (!draft || savingId) return;
    setSavingId(card.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/factory-cards/${card.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          isActive: draft.isActive,
          imageUrl: draft.imageUrl.trim() || null,
          logoUrl: draft.logoUrl.trim() || null,
          badgeLabel: draft.badgeLabel.trim() || null,
          linkTarget: draft.linkTarget,
          sortOrder: draft.sortOrder,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { message?: string }).message || "Ошибка сохранения");
      }
      setNotice(`Сохранено: ${card.manufacturerName}`);
      await loadCards(sectionId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminPage
      title="Фабрики на витрине"
      description="Карточки на странице /fabriki: логотип фабрики слева, фото двери справа. Без фото двери используется обложка из каталога."
      actions={
        <Link
          href="/fabriki"
          className="rounded border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100"
        >
          Открыть витрину →
        </Link>
      }
    >
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <AdminCard className="p-4">
        <label className="flex max-w-md flex-col gap-1 text-xs text-zinc-600">
          Раздел каталога
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="rounded border border-zinc-200 px-3 py-2 text-sm"
          >
            {FACTORY_SECTIONS.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
        </label>
      </AdminCard>

      {loading ? (
        <AdminCard className="p-6">
          <p className="text-sm text-zinc-500">Загрузка…</p>
        </AdminCard>
      ) : !data?.cards.length ? (
        <AdminCard className="p-6">
          <p className="text-sm text-zinc-500">Нет карточек для выбранного раздела.</p>
        </AdminCard>
      ) : (
        <div className="space-y-4">
          {data.cards.map((card) => {
            const draft = drafts[card.id];
            if (!draft) return null;
            const doorPreview =
              draft.imageUrl.trim() || card.defaultCoverImage || card.previewDoorImage;
            const logoPreview = draft.logoUrl.trim() || card.previewLogoImage;
            return (
              <AdminCard key={card.id} className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="shrink-0 space-y-3">
                    <p className="text-lg font-semibold text-zinc-900">{card.manufacturerName}</p>
                    <p className="text-sm text-zinc-500">{card.productCount} моделей в каталоге</p>

                    <div className="flex flex-wrap gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-zinc-600">Логотип</p>
                        {logoPreview ? (
                          <span className="relative block h-12 w-32 overflow-hidden rounded border border-zinc-200 bg-white p-1">
                            <Image
                              src={logoPreview}
                              alt=""
                              fill
                              className="object-contain object-left"
                              sizes="128px"
                            />
                          </span>
                        ) : (
                          <p className="text-xs text-zinc-400">Не задан</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-zinc-600">Фото двери</p>
                        {doorPreview ? (
                          <span className="relative block h-20 w-28 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                            <Image
                              src={doorPreview}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="112px"
                            />
                          </span>
                        ) : (
                          <p className="text-xs text-zinc-400">Нет фото в каталоге</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [card.id]: { ...draft, isActive: e.target.checked },
                          }))
                        }
                        className="h-4 w-4"
                      />
                      Показывать на витрине
                    </label>

                    <label className="flex max-w-xs flex-col gap-1 text-xs text-zinc-600">
                      Подпись на ярлыке
                      <input
                        type="text"
                        value={draft.badgeLabel}
                        placeholder="Фабрика"
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [card.id]: { ...draft, badgeLabel: e.target.value },
                          }))
                        }
                        className="rounded border border-zinc-200 px-2 py-1.5 text-sm"
                      />
                    </label>

                    <label className="flex max-w-xs flex-col gap-1 text-xs text-zinc-600">
                      Куда ведёт карточка
                      <select
                        value={draft.linkTarget}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [card.id]: {
                              ...draft,
                              linkTarget: e.target.value === "catalog" ? "catalog" : "collections",
                            },
                          }))
                        }
                        className="rounded border border-zinc-200 px-2 py-1.5 text-sm"
                      >
                        <option value="collections">Витрина коллекций</option>
                        <option value="catalog">Каталог всех моделей</option>
                      </select>
                    </label>

                    <label className="flex max-w-[8rem] flex-col gap-1 text-xs text-zinc-600">
                      Порядок
                      <input
                        type="number"
                        value={draft.sortOrder}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [card.id]: { ...draft, sortOrder: Number(e.target.value) || 0 },
                          }))
                        }
                        className="rounded border border-zinc-200 px-2 py-1.5 text-sm"
                      />
                    </label>

                    <div>
                      <p className="mb-1 text-xs font-medium text-zinc-600">Логотип фабрики</p>
                      <ProductImagePicker
                        value={draft.logoUrl}
                        uploadSubdir="factories/logos"
                        allowSvg
                        clearLabel="Убрать логотип"
                        emptyHint="Логотип не задан — на витрине будет показано название фабрики."
                        onChange={(url) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [card.id]: { ...draft, logoUrl: url },
                          }))
                        }
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium text-zinc-600">Фото двери</p>
                      <ProductImagePicker
                        value={draft.imageUrl}
                        uploadSubdir="factories/doors"
                        accept="image/jpeg,image/png,image/webp"
                        clearLabel="Убрать фото (будет из каталога)"
                        emptyHint="Своё фото не задано — на витрине берётся обложка из каталога."
                        onChange={(url) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [card.id]: { ...draft, imageUrl: url },
                          }))
                        }
                      />
                      {!draft.imageUrl.trim() && card.defaultCoverImage ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          Без своего фото будет использована обложка из каталога.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={savingId === card.id}
                        onClick={() => void saveCard(card)}
                        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                      >
                        {savingId === card.id ? "Сохранение…" : "Сохранить"}
                      </button>
                      <Link
                        href={card.collectionsAdminPath}
                        className="rounded border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50"
                      >
                        Коллекции →
                      </Link>
                    </div>
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
