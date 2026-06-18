"use client";

import { FormEvent, useState } from "react";

type ProductSeoEditorProps = {
  productId: number;
  productName: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  onSaved: () => void;
};

export function ProductSeoEditor({
  productId,
  productName,
  seoTitle,
  seoDescription,
  onSaved,
}: ProductSeoEditorProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(seoTitle || "");
  const [description, setDescription] = useState(seoDescription || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openDialog = () => {
    setTitle(seoTitle || "");
    setDescription(seoDescription || "");
    setError("");
    setOpen(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${productId}/seo`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          seoTitle: title.trim() || null,
          seoDescription: description.trim() || null,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }
      setOpen(false);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить SEO");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="text-[10px] text-zinc-500 underline-offset-2 hover:text-brand hover:underline"
      >
        SEO
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`SEO: ${productName}`}
          onClick={() => setOpen(false)}
        >
          <form
            className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
            onSubmit={(event) => void save(event)}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-zinc-900">SEO — {productName}</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Пустые поля — автогенерация из шаблона на сайте.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs text-zinc-600">
                Title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  maxLength={120}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  rows={4}
                  maxLength={320}
                />
              </label>
              {error ? <p className="text-xs text-rose-700">{error}</p> : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-zinc-200 px-3 py-1.5 text-sm"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:bg-zinc-300"
              >
                {saving ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
