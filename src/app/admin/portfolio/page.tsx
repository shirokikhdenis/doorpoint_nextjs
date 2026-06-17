"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import {
  PortfolioImageReorder,
  reorderImagesList,
  type PortfolioImageItem,
} from "@/features/admin/portfolio-image-reorder";
import { toPublicImageSrc } from "@/lib/client/image-src";

type PortfolioImage = PortfolioImageItem;

type PortfolioProject = {
  id: number;
  title: string;
  description: string;
  sortOrder: number;
  images: PortfolioImage[];
};

const emptyCreateForm = () => ({
  title: "",
  description: "",
  sortOrder: 0,
  files: [] as File[],
});

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", description: "", sortOrder: 0 });
  const [savingId, setSavingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [reorderingProjectId, setReorderingProjectId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/portfolio");
    if (!response.ok) throw new Error(await response.text());
    const json = (await response.json()) as { items?: PortfolioProject[] };
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

  const uploadFiles = async (projectId: number, files: File[]) => {
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const response = await fetch(`/api/admin/portfolio/${projectId}/images`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Не удалось загрузить фото");
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description,
          sortOrder: createForm.sortOrder,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось создать карточку");
      }
      const project = (await response.json()) as PortfolioProject;
      if (createForm.files.length > 0) {
        await uploadFiles(project.id, createForm.files);
      }
      setCreateForm(emptyCreateForm());
      await reload();
      setNotice("Карточка портфолио создана");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (project: PortfolioProject) => {
    setEditingId(project.id);
    setEditDraft({
      title: project.title,
      description: project.description,
      sortOrder: project.sortOrder,
    });
  };

  const saveEdit = async (projectId: number) => {
    setSavingId(projectId);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/portfolio/${projectId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось сохранить");
      }
      setEditingId(null);
      await reload();
      setNotice("Изменения сохранены");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteProject = async (project: PortfolioProject) => {
    if (!window.confirm(`Удалить «${project.title}» и все фото?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/portfolio/${project.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Не удалось удалить");
      await reload();
      setNotice("Карточка удалена");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    }
  };

  const handleAddImages = async (projectId: number, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadingId(projectId);
    setError("");
    try {
      await uploadFiles(projectId, Array.from(fileList));
      await reload();
      setNotice("Фото добавлены");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteImage = async (image: PortfolioImage) => {
    if (!window.confirm("Удалить это фото?")) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/portfolio/images/${image.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Не удалось удалить фото");
      await reload();
      setNotice("Фото удалено");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    }
  };

  const handleImageReorder = async (projectId: number, dragId: number, targetId: number) => {
    const project = items.find((entry) => entry.id === projectId);
    if (!project) return;

    const nextImages = reorderImagesList(project.images, dragId, targetId);
    const imageIds = nextImages.map((image) => image.id);
    const previousItems = items;

    setItems((prev) =>
      prev.map((entry) => (entry.id === projectId ? { ...entry, images: nextImages } : entry)),
    );
    setReorderingProjectId(projectId);
    setError("");
    try {
      const response = await fetch(`/api/admin/portfolio/${projectId}/images`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageIds }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось сохранить порядок");
      }
      const updated = (await response.json()) as PortfolioProject;
      setItems((prev) => prev.map((entry) => (entry.id === projectId ? updated : entry)));
    } catch (caught) {
      setItems(previousItems);
      setError(caught instanceof Error ? caught.message : "Ошибка сортировки");
    } finally {
      setReorderingProjectId(null);
    }
  };

  return (
    <AdminPage
      title="Портфолио"
      description="Карточки на странице /portfolio"
    >
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <AdminCard title="Новая карточка">
        <form onSubmit={handleCreate} className="space-y-3">
        <input
          className="w-full rounded border px-3 py-2 text-sm"
          value={createForm.title}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Заголовок"
          required
        />
        <textarea
          className="min-h-24 w-full rounded border px-3 py-2 text-sm"
          value={createForm.description}
          onChange={(event) =>
            setCreateForm((prev) => ({ ...prev, description: event.target.value }))
          }
          placeholder="Описание проекта"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-zinc-700">
            Порядок
            <input
              type="number"
              className="ml-2 w-24 rounded border px-2 py-1"
              value={createForm.sortOrder}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 0 }))
              }
            />
          </label>
          <label className="flex flex-1 cursor-pointer flex-col gap-1 text-sm text-zinc-700">
            Фото (можно несколько)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="text-sm"
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  files: event.target.files ? Array.from(event.target.files) : [],
                }))
              }
            />
          </label>
        </div>
        {createForm.files.length > 0 ? (
          <p className="text-xs text-zinc-500">Выбрано файлов: {createForm.files.length}</p>
        ) : null}
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {creating ? "Создание…" : "Создать карточку"}
        </button>
        </form>
      </AdminCard>

      <AdminCard title={`Карточки (${items.length})`}>
        <div className="space-y-4">
        {loading ? <p className="text-sm text-zinc-500">Загрузка…</p> : null}
        {!loading && items.length === 0 ? (
          <p className="text-sm text-zinc-500">Пока нет карточек портфолио.</p>
        ) : null}

        {items.map((project) => {
          const isEditing = editingId === project.id;
          return (
            <article key={project.id} className="rounded border border-zinc-200 bg-white p-4">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={editDraft.title}
                    onChange={(event) =>
                      setEditDraft((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                  <textarea
                    className="min-h-20 w-full rounded border px-3 py-2 text-sm"
                    value={editDraft.description}
                    onChange={(event) =>
                      setEditDraft((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                  <label className="text-sm text-zinc-700">
                    Порядок
                    <input
                      type="number"
                      className="ml-2 w-24 rounded border px-2 py-1"
                      value={editDraft.sortOrder}
                      onChange={(event) =>
                        setEditDraft((prev) => ({
                          ...prev,
                          sortOrder: Number(event.target.value) || 0,
                        }))
                      }
                    />
                  </label>
                  <PortfolioImageReorder
                    images={project.images}
                    disabled={
                      reorderingProjectId === project.id ||
                      uploadingId === project.id ||
                      savingId === project.id
                    }
                    onReorder={(dragId, targetId) =>
                      handleImageReorder(project.id, dragId, targetId)
                    }
                    onDelete={handleDeleteImage}
                  />

                  <div>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                      <span className="rounded border px-3 py-1.5 hover:bg-zinc-50">
                        {uploadingId === project.id ? "Загрузка…" : "Добавить фото"}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        disabled={uploadingId === project.id || reorderingProjectId === project.id}
                        onChange={(event) => {
                          handleAddImages(project.id, event.target.files);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(project.id)}
                      disabled={savingId === project.id || reorderingProjectId === project.id}
                      className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-60"
                    >
                      {savingId === project.id ? "Сохранение…" : "Сохранить"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded border px-3 py-1.5 text-sm"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-medium">{project.title}</h3>
                    {project.description ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">
                        {project.description}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-zinc-400">Без описания</p>
                    )}
                    <p className="mt-1 text-xs text-zinc-400">
                      id {project.id} · порядок {project.sortOrder} · фото {project.images.length}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(project)}
                      className="rounded border px-3 py-1.5 text-sm hover:bg-zinc-50"
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(project)}
                      className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              )}

              {!isEditing && project.images.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.images.map((image, index) => {
                    const src = toPublicImageSrc(image.imageUrl);
                    return (
                      <div
                        key={image.id}
                        className="relative h-20 w-28 overflow-hidden rounded border border-zinc-200 bg-zinc-50"
                      >
                        {src ? (
                          <Image src={src} alt="" fill className="object-cover" sizes="112px" />
                        ) : null}
                        {index === 0 ? (
                          <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1 text-[10px] text-white">
                            обложка
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </article>
          );
        })}
        </div>
      </AdminCard>
    </AdminPage>
  );
}
