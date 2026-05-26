"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLayoutChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const isLoginPage = pathname === "/admin/login";
  if (isLoginPage) return <>{children}</>;

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <div className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white">
              Admin Zone
            </span>
            <Link
              href="/"
              className="rounded border border-zinc-300 px-2.5 py-1 text-sm hover:bg-zinc-100"
            >
              На сайт
            </Link>
          </div>
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-60"
          >
            {loggingOut ? "Выход..." : "Выйти"}
          </button>
        </div>
      </div>
      {children}
    </>
  );
}
