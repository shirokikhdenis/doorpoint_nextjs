"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";
import { cn } from "@/lib/utils";

type VkSyncRunError = {
  productId: number;
  sku: string;
  reason: string;
};

type VkSyncRun = {
  id: number;
  operationId: string;
  scope: string;
  dryRun: boolean;
  filters: Record<string, unknown>;
  total: number;
  exportable: number;
  created: number;
  updated: number;
  skippedUnchanged: number;
  skippedInactive: number;
  skippedNoImage: number;
  failed: number;
  status: string;
  errors: VkSyncRunError[];
  startedAt: string;
  finishedAt: string | null;
};

type FailedProductSync = {
  productId: number;
  sku: string;
  productName: string;
  vkItemId: number | null;
  status: string;
  lastError: string | null;
  syncedAt: string | null;
  updatedAt: string;
};

type VkTokenCheck = {
  ok?: boolean;
  tokenKind?: string | null;
  permissions?: string[];
  missingScopes?: string[];
  message?: string;
  hint?: string;
  marketUploadOk?: boolean;
};

type VkSyncStatusResponse = {
  configured: boolean;
  groupId: number | null;
  marketCategoryId: number;
  latestRun: VkSyncRun | null;
  runs: { items: VkSyncRun[]; total: number; limit: number; offset: number };
  failedProducts: FailedProductSync[];
  stats: { synced: number; failed: number; total: number };
  tokenHint?: string;
  refreshConfigured?: boolean;
  clientId?: string | null;
  tokenCheck?: VkTokenCheck | null;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

const scopeLabel = (scope: string) => (scope === "selected" ? "Выбранные" : "По фильтрам");

const statusLabel = (status: string) => {
  if (status === "completed") return "Завершена";
  if (status === "completed_with_errors") return "Завершена с ошибками";
  if (status === "running") return "Выполняется";
  return status;
};

const statusBadgeClass = (status: string) => {
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "completed_with_errors") return "bg-amber-100 text-amber-800";
  if (status === "running") return "bg-sky-100 text-sky-800";
  return "bg-zinc-100 text-zinc-700";
};

export default function AdminVkSyncPage() {
  const [data, setData] = useState<VkSyncStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/vk/status");
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload.message === "string" ? payload.message : `HTTP ${response.status}`);
      }
      setData((await response.json()) as VkSyncStatusResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить статус VK");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const latest = data?.latestRun || null;
  const lastRunErrors = latest?.errors || [];

  return (
    <AdminPage
      title="Синхронизация VK"
      description="Статус последней выгрузки, история запусков и журнал ошибок по SKU."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? "Обновление…" : "Обновить"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/products">К товарам</Link>
          </Button>
        </div>
      }
    >
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <AdminCard title="Подключение VK">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-admin-text-muted">Статус</dt>
              <dd className={cn("font-medium", data?.configured ? "text-emerald-700" : "text-amber-700")}>
                {data?.configured ? "Настроено" : "Не настроено"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-admin-text-muted">Группа</dt>
              <dd>{data?.groupId ? `ID ${data.groupId}` : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-admin-text-muted">Автообновление</dt>
              <dd className={data?.refreshConfigured ? "text-emerald-700" : "text-amber-700"}>
                {data?.refreshConfigured ? "Включено" : "Нет refresh"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-admin-text-muted">App ID</dt>
              <dd>{data?.clientId || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-admin-text-muted">Токен Market</dt>
              <dd className={cn("font-medium", data?.tokenCheck?.ok ? "text-emerald-700" : "text-amber-700")}>
                {data?.tokenCheck?.ok ? "Готов" : data?.tokenCheck?.message || "Не проверен"}
              </dd>
            </div>
            {data?.tokenCheck?.missingScopes && data.tokenCheck.missingScopes.length > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-admin-text-muted">Нет прав</dt>
                <dd className="text-amber-700">{data.tokenCheck.missingScopes.join(", ")}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-admin-text-muted">Категория VK</dt>
              <dd>{data?.marketCategoryId ?? "—"}</dd>
            </div>
            <dd className="pt-2 text-xs text-admin-text-muted">{data?.tokenCheck?.hint || data?.tokenHint}</dd>
          </dl>
        </AdminCard>

        <AdminCard title="Последняя синхронизация">
          {latest ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-admin-text-muted">Запуск</dt>
                <dd>{formatDateTime(latest.startedAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-admin-text-muted">Завершение</dt>
                <dd>{formatDateTime(latest.finishedAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-admin-text-muted">Режим</dt>
                <dd>{scopeLabel(latest.scope)}{latest.dryRun ? " (dry run)" : ""}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-admin-text-muted">Статус</dt>
                <dd>
                  <span className={cn("rounded px-2 py-0.5 text-xs font-medium", statusBadgeClass(latest.status))}>
                    {statusLabel(latest.status)}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-admin-text-muted">Итог</dt>
                <dd className="text-right">
                  +{latest.created} / ~{latest.updated} / !{latest.failed}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-admin-text-muted">Запусков ещё не было.</p>
          )}
        </AdminCard>

        <AdminCard title="Товары в VK">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-admin-text-muted">Синхронизировано</dt>
              <dd className="font-medium text-emerald-700">{data?.stats.synced ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-admin-text-muted">С ошибкой</dt>
              <dd className="font-medium text-amber-700">{data?.stats.failed ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-admin-text-muted">Всего в журнале</dt>
              <dd>{data?.stats.total ?? 0}</dd>
            </div>
          </dl>
        </AdminCard>
      </div>

      <AdminCard
        title="Ошибки последнего запуска"
        description="SKU и причины из последней завершённой синхронизации."
        className="mb-6"
      >
        {lastRunErrors.length > 0 ? (
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableCell header>SKU</AdminTableCell>
                <AdminTableCell header>ID товара</AdminTableCell>
                <AdminTableCell header>Ошибка</AdminTableCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {lastRunErrors.map((item) => (
                <AdminTableRow key={`${item.productId}-${item.sku}`}>
                  <AdminTableCell className="font-mono text-xs">{item.sku || "—"}</AdminTableCell>
                  <AdminTableCell>{item.productId}</AdminTableCell>
                  <AdminTableCell className="text-red-700">{item.reason}</AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <AdminEmptyState
            title={latest?.failed ? "Ошибки не сохранены" : "Ошибок нет"}
            description={
              latest?.failed
                ? "В последнем запуске были ошибки, но детали не записались."
                : "В последнем запуске ошибок не было."
            }
          />
        )}
      </AdminCard>

      <AdminCard
        title="Журнал ошибок по SKU"
        description="Товары, у которых последняя синхронизация с VK завершилась ошибкой."
        className="mb-6"
      >
        {data?.failedProducts.length ? (
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableCell header>SKU</AdminTableCell>
                <AdminTableCell header>Название</AdminTableCell>
                <AdminTableCell header>Обновлено</AdminTableCell>
                <AdminTableCell header>Ошибка</AdminTableCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {data.failedProducts.map((item) => (
                <AdminTableRow key={item.productId}>
                  <AdminTableCell className="font-mono text-xs">{item.sku}</AdminTableCell>
                  <AdminTableCell>{item.productName}</AdminTableCell>
                  <AdminTableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(item.updatedAt)}
                  </AdminTableCell>
                  <AdminTableCell className="text-red-700">{item.lastError || "—"}</AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <AdminEmptyState title="Нет ошибок" description="Нет товаров с ошибками синхронизации." />
        )}
      </AdminCard>

      <AdminCard title="История запусков" description={`Всего запусков: ${data?.runs.total ?? 0}`}>
        {data?.runs.items.length ? (
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableCell header>Дата</AdminTableCell>
                <AdminTableCell header>Режим</AdminTableCell>
                <AdminTableCell header>Статус</AdminTableCell>
                <AdminTableCell header>К выгрузке</AdminTableCell>
                <AdminTableCell header>Создано</AdminTableCell>
                <AdminTableCell header>Обновлено</AdminTableCell>
                <AdminTableCell header>Ошибки</AdminTableCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {data.runs.items.map((run) => (
                <AdminTableRow key={run.operationId}>
                  <AdminTableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(run.startedAt)}
                  </AdminTableCell>
                  <AdminTableCell>{scopeLabel(run.scope)}</AdminTableCell>
                  <AdminTableCell>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", statusBadgeClass(run.status))}>
                      {statusLabel(run.status)}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell>{run.exportable}</AdminTableCell>
                  <AdminTableCell>{run.created}</AdminTableCell>
                  <AdminTableCell>{run.updated}</AdminTableCell>
                  <AdminTableCell className={run.failed > 0 ? "text-amber-700" : ""}>{run.failed}</AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <AdminEmptyState
            title="История пуста"
            description="Запустите выгрузку на странице товаров."
          />
        )}
      </AdminCard>
    </AdminPage>
  );
}
