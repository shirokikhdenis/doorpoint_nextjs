"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";

type TestimonialRow = {
  id: number;
  authorName: string;
  body: string;
  rating: number | null;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm = () => ({
  authorName: "",
  body: "",
  rating: "" as string | number,
  sortOrder: 0,
  isActive: true,
});

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<TestimonialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState(emptyForm);
  const [savingId, setSavingId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/testimonials");
    if (!response.ok) throw new Error(await response.text());
    const json = (await response.json()) as { items?: TestimonialRow[] };
    setItems(Array.isArray(json.items) ? json.items : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await reload();
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
  }, [reload]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          authorName: form.authorName,
          body: form.body,
          rating: form.rating === "" ? null : Number(form.rating),
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Не удалось создать отзыв");
      setForm(emptyForm());
      await reload();
      setNotice("Отзыв добавлен");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (item: TestimonialRow) => {
    setEditingId(item.id);
    setEditDraft({
      authorName: item.authorName,
      body: item.body,
      rating: item.rating ?? "",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
  };

  const saveEdit = async (id: number) => {
    setSavingId(id);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/testimonials/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          authorName: editDraft.authorName,
          body: editDraft.body,
          rating: editDraft.rating === "" ? null : Number(editDraft.rating),
          sortOrder: editDraft.sortOrder,
          isActive: editDraft.isActive,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Не удалось сохранить");
      setEditingId(null);
      await reload();
      setNotice("Отзыв обновлён");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setSavingId(null);
    }
  };

  const removeItem = async (id: number) => {
    if (!window.confirm("Удалить отзыв?")) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось удалить");
      }
      await reload();
      setNotice("Отзыв удалён");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    }
  };

  return (
    <AdminPage title="Отзывы на главной" description="Отзывы клиентов для блока на главной странице">
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <AdminCard title="Новый отзыв">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => void handleCreate(event)}>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-700">Имя автора</span>
            <input
              className="w-full rounded border border-zinc-200 px-2 py-1.5"
              value={form.authorName}
              onChange={(e) => setForm((prev) => ({ ...prev, authorName: e.target.value }))}
              required
              minLength={2}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-700">Рейтинг (1–5, необязательно)</span>
            <input
              type="number"
              min={1}
              max={5}
              className="w-full rounded border border-zinc-200 px-2 py-1.5"
              value={form.rating}
              onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}
            />
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span className="font-medium text-zinc-700">Текст отзыва</span>
            <textarea
              className="min-h-24 w-full rounded border border-zinc-200 px-2 py-1.5"
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              required
              minLength={10}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-700">Порядок</span>
            <input
              type="number"
              className="w-full rounded border border-zinc-200 px-2 py-1.5"
              value={form.sortOrder}
              onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Показывать на главной
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {creating ? "Сохранение…" : "Добавить отзыв"}
            </button>
          </div>
        </form>
      </AdminCard>

      <AdminCard title="Список отзывов">
        {loading ? (
          <p className="text-sm text-zinc-500">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-500">Отзывов пока нет</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {items.map((item) => (
              <li key={item.id} className="space-y-3 py-4">
                {editingId === item.id ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1 text-sm">
                      <span className="font-medium text-zinc-700">Имя</span>
                      <input
                        className="w-full rounded border border-zinc-200 px-2 py-1.5"
                        value={editDraft.authorName}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, authorName: e.target.value }))
                        }
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="font-medium text-zinc-700">Рейтинг</span>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        className="w-full rounded border border-zinc-200 px-2 py-1.5"
                        value={editDraft.rating}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, rating: e.target.value }))
                        }
                      />
                    </label>
                    <label className="block space-y-1 text-sm sm:col-span-2">
                      <span className="font-medium text-zinc-700">Текст</span>
                      <textarea
                        className="min-h-24 w-full rounded border border-zinc-200 px-2 py-1.5"
                        value={editDraft.body}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, body: e.target.value }))}
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="font-medium text-zinc-700">Порядок</span>
                      <input
                        type="number"
                        className="w-full rounded border border-zinc-200 px-2 py-1.5"
                        value={editDraft.sortOrder}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editDraft.isActive}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, isActive: e.target.checked }))
                        }
                      />
                      Активен
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        type="button"
                        disabled={savingId === item.id}
                        onClick={() => void saveEdit(item.id)}
                        className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-60"
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-zinc-900">
                        {item.authorName}
                        {item.rating ? (
                          <span className="ml-2 text-sm text-amber-600">{"★".repeat(item.rating)}</span>
                        ) : null}
                        {!item.isActive ? (
                          <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                            скрыт
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm leading-relaxed text-zinc-600">{item.body}</p>
                      <p className="text-xs text-zinc-400">Порядок: {item.sortOrder}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="text-sm text-brand hover:underline"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeItem(item.id)}
                        className="text-sm text-rose-700 hover:underline"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </AdminPage>
  );
}
