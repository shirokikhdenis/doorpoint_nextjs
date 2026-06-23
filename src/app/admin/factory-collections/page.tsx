"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductImagePicker } from "@/features/admin/product-image-picker";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { FACTORY_SECTIONS } from "@/lib/factory-sections-config";

type CollectionCardRow = {
  id: number;
  collectionName: string;
  description: string;
  isActive: boolean;
  imageUrl: string | null;
  sortOrder: number;
  productCount: number;
  defaultCoverImage: string | null;
  previewImage: string | null;
  inCatalog: boolean;
};

type CollectionCardsResponse = {
  section: { id: string; title: string };
  manufacturer: string;
  cards: CollectionCardRow[];
};

export default function AdminFactoryCollectionsPage() {
  return (
    <Suspense
      fallback={
        <AdminPage title="Коллекции производителя">
          <AdminCard className="p-6">
            <p className="text-sm text-zinc-500">Загрузка…</p>
          </AdminCard>
        </AdminPage>
      }
    >
      <AdminFactoryCollectionsContent />
    </Suspense>
  );
}

function AdminFactoryCollectionsContent() {
  const searchParams = useSearchParams();
  const initialSectionId = searchParams.get("sectionId") || FACTORY_SECTIONS[0]?.id || "";
  const initialManufacturer = searchParams.get("manufacturer") || "";

  const [sectionId, setSectionId] = useState(initialSectionId);
  const [manufacturer, setManufacturer] = useState(initialManufacturer);
  const [data, setData] = useState<CollectionCardsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<
    Record<number, { isActive: boolean; imageUrl: string; sortOrder: number; description: string }>
  >({});

  const section = useMemo(
    () => FACTORY_SECTIONS.find((item) => item.id === sectionId),
    [sectionId],
  );

  const manufacturerOptions = section?.manufacturers ?? [];

  const loadCards = useCallback(async (nextSectionId: string, nextManufacturer: string) => {
    if (!nextSectionId || !nextManufacturer) {
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        sectionId: nextSectionId,
        manufacturer: nextManufacturer,
      });
      const response = await fetch(`/api/admin/collection-cards?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const json = (await response.json()) as CollectionCardsResponse;
      setData(json);
      const nextDrafts: Record<
        number,
        { isActive: boolean; imageUrl: string; sortOrder: number; description: string }
      > = {};
      json.cards.forEach((card) => {
        if (!card.id) return;
        nextDrafts[card.id] = {
          isActive: card.isActive,
          imageUrl: card.imageUrl || "",
          sortOrder: card.sortOrder,
          description: card.description || "описание",
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
    if (!manufacturer && manufacturerOptions[0]) {
      setManufacturer(manufacturerOptions[0]);
      return;
    }
    void loadCards(sectionId, manufacturer);
  }, [sectionId, manufacturer, manufacturerOptions, loadCards]);

  const saveCard = async (card: CollectionCardRow) => {
    const draft = drafts[card.id];
    if (!draft || !card.id || savingId) return;
    setSavingId(card.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/collection-cards/${card.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          isActive: draft.isActive,
          imageUrl: draft.imageUrl.trim() || null,
          sortOrder: draft.sortOrder,
          description: draft.description.trim() || "описание",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { message?: string }).message || "Ошибка сохранения");
      }
      setNotice(`Сохранено: ${card.collectionName}`);
      await loadCards(sectionId, manufacturer);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminPage
      title="Коллекции производителя"
      description="Карточки на страницах /fabriki/…/kollektsii. Список подтягивается из товаров с атрибутом «Коллекция»."
      actions={
        <Link
          href="/admin/factories"
          className="rounded border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100"
        >
          ← Фабрики
        </Link>
      }
    >
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <AdminCard className="p-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex min-w-[14rem] flex-col gap-1 text-xs text-zinc-600">
            Раздел
            <select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setManufacturer("");
              }}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              {FACTORY_SECTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[14rem] flex-col gap-1 text-xs text-zinc-600">
            Производитель
            <select
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Выберите производителя</option>
              {manufacturerOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </AdminCard>

      {!manufacturer ? (
        <AdminCard className="p-6">
          <p className="text-sm text-zinc-500">Выберите производителя.</p>
        </AdminCard>
      ) : loading ? (
        <AdminCard className="p-6">
          <p className="text-sm text-zinc-500">Загрузка…</p>
        </AdminCard>
      ) : !data?.cards.length ? (
        <AdminCard className="p-6">
          <p className="text-sm text-zinc-500">
            У производителя «{manufacturer}» пока нет коллекций в каталоге (атрибут collection у
            товаров).
          </p>
        </AdminCard>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            {data.section.title} · {data.manufacturer}
          </p>
          {data.cards.map((card) => {
            const draft = card.id ? drafts[card.id] : null;
            const preview =
              draft?.imageUrl.trim() || card.defaultCoverImage || card.previewImage || "";
            return (
              <AdminCard key={`${card.collectionName}-${card.id}`} className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="shrink-0 space-y-2">
                    <p className="text-lg font-semibold text-zinc-900">{card.collectionName}</p>
                    <p className="text-sm text-zinc-500">
                      {card.productCount} моделей
                      {!card.inCatalog ? " · нет в каталоге" : ""}
                    </p>
                    {preview ? (
                      <span className="relative block h-28 w-44 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                        <Image src={preview} alt="" fill className="object-cover" sizes="176px" />
                      </span>
                    ) : (
                      <p className="text-xs text-zinc-400">Нет фото</p>
                    )}
                  </div>

                  {draft && card.id ? (
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

                      <label className="flex flex-col gap-1 text-xs text-zinc-600">
                        Описание на карточке
                        <textarea
                          rows={3}
                          value={draft.description}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [card.id]: { ...draft, description: e.target.value },
                            }))
                          }
                          className="min-h-[4.5rem] rounded border border-zinc-200 px-2 py-1.5 text-sm"
                        />
                      </label>

                      <div>
                        <p className="mb-1 text-xs font-medium text-zinc-600">Фото фона карточки</p>
                        <ProductImagePicker
                          value={draft.imageUrl}
                          onChange={(url) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [card.id]: { ...draft, imageUrl: url },
                            }))
                          }
                        />
                      </div>

                      <button
                        type="button"
                        disabled={savingId === card.id}
                        onClick={() => void saveCard(card)}
                        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                      >
                        {savingId === card.id ? "Сохранение…" : "Сохранить"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-800">Сохраните карточку после синхронизации с каталогом.</p>
                  )}
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
