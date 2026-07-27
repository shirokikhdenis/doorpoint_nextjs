"use client";

import { useCallback, useState } from "react";
import type { ExhibitionDoorRow, ExhibitionListResponse } from "./types";

type UseExhibitionResult = {
  items: ExhibitionDoorRow[];
  manufacturers: string[];
  meta: ExhibitionListResponse["meta"] | null;
  loading: boolean;
  error: string;
  load: () => Promise<void>;
  createItem: (payload: Record<string, unknown>) => Promise<ExhibitionDoorRow>;
  updateItem: (id: number, payload: Record<string, unknown>) => Promise<ExhibitionDoorRow>;
  deleteItem: (id: number) => Promise<void>;
};

export function useExhibition(): UseExhibitionResult {
  const [items, setItems] = useState<ExhibitionDoorRow[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [meta, setMeta] = useState<ExhibitionListResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/exhibition");
      const data = (await response.json()) as ExhibitionListResponse & { message?: string };
      if (!response.ok) {
        throw new Error(data.message || "Ошибка загрузки");
      }
      setItems(Array.isArray(data.items) ? data.items : []);
      setManufacturers(Array.isArray(data.manufacturers) ? data.manufacturers : []);
      setMeta(data.meta ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  const createItem = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/admin/exhibition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as ExhibitionDoorRow & {
      message?: string;
    };
    if (!response.ok) {
      throw new Error(data.message || "Ошибка сохранения");
    }
    setItems((prev) => [...prev, data]);
    return data;
  }, []);

  const updateItem = useCallback(async (id: number, payload: Record<string, unknown>) => {
    const response = await fetch(`/api/admin/exhibition/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as ExhibitionDoorRow & {
      message?: string;
    };
    if (!response.ok) {
      throw new Error(data.message || "Ошибка сохранения");
    }
    setItems((prev) => prev.map((item) => (item.id === id ? data : item)));
    return data;
  }, []);

  const deleteItem = useCallback(async (id: number) => {
    const response = await fetch(`/api/admin/exhibition/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(data.message || "Ошибка удаления");
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    items,
    manufacturers,
    meta,
    loading,
    error,
    load,
    createItem,
    updateItem,
    deleteItem,
  };
}
