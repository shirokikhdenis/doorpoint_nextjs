"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminConfirmButton } from "@/features/admin/ui/admin-confirm-button";
import { AdminInputField, AdminSelectField } from "@/features/admin/ui/admin-form-field";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage as AdminPageLayout } from "@/features/admin/ui/admin-page";
import { AdminBootstrap, normalizeAdminBootstrap } from "@/lib/client/normalizers";

export default function AdminPage() {
  const [bootstrap, setBootstrap] = useState<AdminBootstrap>({
    categories: [],
    subcategories: [],
    attributes: [],
    products: [],
    catalogPages: [],
  });
  const [notice, setNotice] = useState("");
  const [noticeVariant, setNoticeVariant] = useState<"info" | "success" | "error">("info");

  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState<number>(0);
  const [attributeName, setAttributeName] = useState("");
  const [attributeCode, setAttributeCode] = useState("");

  const showNotice = (message: string, variant: "info" | "success" | "error" = "info") => {
    setNotice(message);
    setNoticeVariant(variant);
  };

  const reload = async () => {
    const response = await fetch("/api/admin/bootstrap");
    if (!response.ok) throw new Error("Не удалось загрузить bootstrap");
    setBootstrap(normalizeAdminBootstrap(await response.json()));
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/bootstrap");
        if (!response.ok) throw new Error("Не удалось загрузить bootstrap");
        if (!cancelled) {
          setBootstrap(normalizeAdminBootstrap(await response.json()));
        }
      } catch (error) {
        if (!cancelled) {
          showNotice(error instanceof Error ? error.message : "Ошибка", "error");
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const request = async (url: string, method: string, body: unknown) => {
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await response.text());
  };

  const sendDelete = async (url: string) => {
    const response = await fetch(url, { method: "DELETE" });
    if (response.status === 204) return;
    let payload: { message?: string } = {};
    try {
      payload = await response.json();
    } catch {
      payload = { message: await response.text() };
    }
    throw new Error(payload.message || `Ошибка ${response.status}`);
  };

  const submitCategory = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request("/api/admin/categories", "POST", { name: categoryName });
      setCategoryName("");
      await reload();
      showNotice("Категория добавлена", "success");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Ошибка", "error");
    }
  };

  const submitSubcategory = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request("/api/admin/subcategories", "POST", {
        categoryId: subcategoryCategoryId,
        name: subcategoryName,
      });
      setSubcategoryName("");
      await reload();
      showNotice("Подкатегория добавлена", "success");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Ошибка", "error");
    }
  };

  const submitAttribute = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request("/api/admin/attributes", "POST", {
        name: attributeName,
        code: attributeCode,
        type: "text",
      });
      setAttributeName("");
      setAttributeCode("");
      await reload();
      showNotice("Атрибут добавлен", "success");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Ошибка", "error");
    }
  };

  return (
    <AdminPageLayout
      title="Категории"
      description="Структура каталога: категории, подкатегории и быстрое создание атрибутов."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/products">Управление товарами</Link>
        </Button>
      }
    >
      {notice ? (
        <AdminNotice variant={noticeVariant} onDismiss={() => setNotice("")}>
          {notice}
        </AdminNotice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <AdminCard title="Новая категория">
          <form onSubmit={submitCategory} className="space-y-4">
            <AdminInputField
              id="category-name"
              label="Название"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Например: Межкомнатные двери"
              required
            />
            <Button type="submit">Добавить</Button>
          </form>
        </AdminCard>

        <AdminCard title="Новая подкатегория">
          <form onSubmit={submitSubcategory} className="space-y-4">
            <AdminSelectField
              id="subcategory-parent"
              label="Категория"
              value={subcategoryCategoryId}
              onChange={(event) => setSubcategoryCategoryId(Number(event.target.value))}
              required
            >
              <option value={0}>Выберите категорию</option>
              {bootstrap.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </AdminSelectField>
            <AdminInputField
              id="subcategory-name"
              label="Название"
              value={subcategoryName}
              onChange={(event) => setSubcategoryName(event.target.value)}
              placeholder="Например: Экошпон"
              required
            />
            <Button type="submit">Добавить</Button>
          </form>
        </AdminCard>

        <AdminCard
          title="Новый атрибут"
          description={
            <>
              Подробное редактирование — в разделе{" "}
              <Link href="/admin/attributes" className="text-brand hover:underline">
                Атрибуты
              </Link>
              .
            </>
          }
        >
          <form onSubmit={submitAttribute} className="space-y-4">
            <AdminInputField
              id="attribute-name"
              label="Название"
              value={attributeName}
              onChange={(event) => setAttributeName(event.target.value)}
              required
            />
            <AdminInputField
              id="attribute-code"
              label="Код"
              value={attributeCode}
              onChange={(event) => setAttributeCode(event.target.value)}
              placeholder="width"
              required
            />
            <Button type="submit">Добавить</Button>
          </form>
        </AdminCard>
      </div>

      <AdminCard title="Категории и подкатегории">
        {bootstrap.categories.length === 0 ? (
          <p className="text-sm text-zinc-500">Категорий пока нет.</p>
        ) : (
          <ul className="space-y-4">
            {bootstrap.categories.map((category) => {
              const children = bootstrap.subcategories.filter(
                (sub) => sub.categoryId === category.id,
              );
              return (
                <li key={category.id} className="rounded-lg border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-zinc-900">
                      {category.name}{" "}
                      <span className="font-normal text-zinc-500">({category.slug})</span>
                    </div>
                    <AdminConfirmButton
                      confirmMessage={`Удалить категорию «${category.name}» и все её подкатегории?`}
                      onConfirm={async () => {
                        try {
                          await sendDelete(`/api/admin/categories/${category.id}`);
                          await reload();
                          showNotice(`Категория «${category.name}» удалена`, "success");
                        } catch (error) {
                          showNotice(error instanceof Error ? error.message : "Ошибка", "error");
                        }
                      }}
                    >
                      Удалить
                    </AdminConfirmButton>
                  </div>
                  {children.length > 0 ? (
                    <ul className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                      {children.map((sub) => (
                        <li
                          key={sub.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span>
                            {sub.name}{" "}
                            <span className="text-zinc-500">({sub.slug || "—"})</span>
                          </span>
                          <AdminConfirmButton
                            confirmMessage={`Удалить подкатегорию «${sub.name}»?`}
                            onConfirm={async () => {
                              try {
                                await sendDelete(`/api/admin/subcategories/${sub.id}`);
                                await reload();
                                showNotice(`Подкатегория «${sub.name}» удалена`, "success");
                              } catch (error) {
                                showNotice(
                                  error instanceof Error ? error.message : "Ошибка",
                                  "error",
                                );
                              }
                            }}
                          >
                            Удалить
                          </AdminConfirmButton>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-400">Подкатегорий нет</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>
    </AdminPageLayout>
  );
}
