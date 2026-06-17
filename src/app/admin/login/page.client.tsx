"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

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
    <main className="mx-auto w-full max-w-md p-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Вход в админку</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Войдите через Яндекс ID. Доступ только для администратора сайта.
        </p>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <Link
          href={oauthHref}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#fc3f1d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#e43718]"
        >
          Войти через Яндекс
        </Link>
      </div>
    </main>
  );
}
