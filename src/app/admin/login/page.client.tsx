"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "У этого Яндекс-аккаунта нет доступа в админку.",
  oauth_denied: "Вход через Яндекс отменён.",
  oauth_state: "Сессия авторизации истекла. Попробуйте снова.",
  oauth_failed: "Не удалось завершить вход через Яндекс.",
  oauth_not_configured: "OAuth не настроен на сервере.",
};

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const raw = searchParams.get("next") || "/admin";
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/admin";
  }, [searchParams]);

  const errorCode = searchParams.get("error");
  const error =
    (errorCode && ERROR_MESSAGES[errorCode]) ||
    (errorCode ? "Не удалось войти в админку." : "");

  const oauthHref = `/api/admin/oauth/yandex?next=${encodeURIComponent(nextPath)}`;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-admin-text">Doorpoint</span>
            <span className="rounded bg-[var(--admin-badge-bg)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--admin-badge-text)]">
              Admin
            </span>
          </div>
          <CardTitle className="text-2xl">Вход в админку</CardTitle>
          <CardDescription>
            Войдите через Яндекс ID. Доступ только для администратора сайта.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}
          <Link
            href={oauthHref}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#fc3f1d] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#e43718]"
          >
            Войти через Яндекс
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
