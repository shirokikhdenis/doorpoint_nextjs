"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ADMIN_NAV_GROUPS,
  getAdminBreadcrumbs,
  isAdminNavItemActive,
} from "@/features/admin/admin-nav";
import { useAdminTheme } from "@/features/admin/use-admin-theme";
import { cn } from "@/lib/utils";

function AdminSidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-admin-text-faint">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isAdminNavItemActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "block px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand/10 text-brand"
                        : "text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function AdminPanelRoot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { theme } = useAdminTheme();

  return (
    <div
      className={cn("admin-panel", className)}
      data-admin-theme={theme}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";
  if (isLoginPage) {
    return (
      <AdminPanelRoot className="min-h-screen bg-admin-bg">
        {children}
      </AdminPanelRoot>
    );
  }

  const breadcrumbs = getAdminBreadcrumbs(pathname);

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
    <AdminPanelRoot className="flex min-h-screen bg-admin-bg">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[var(--admin-overlay)] lg:hidden"
          aria-label="Закрыть меню"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[var(--admin-sidebar-width)] flex-col border-r border-admin-border bg-admin-surface transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-admin-border px-4">
          <Link
            href="/admin"
            className="font-semibold text-admin-text"
            onClick={() => setMobileOpen(false)}
          >
            Doorpoint
          </Link>
          <span className="ml-2 rounded bg-[var(--admin-badge-bg)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--admin-badge-text)]">
            Admin
          </span>
        </div>
        <AdminSidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-admin-border bg-[var(--admin-header-bg)] px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              Меню
            </Button>
            <nav aria-label="Хлебные крошки" className="hidden min-w-0 truncate text-sm sm:block">
              <ol className="flex flex-wrap items-center gap-1 text-admin-text-muted">
                {breadcrumbs.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                    {index > 0 ? <span aria-hidden="true">/</span> : null}
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-admin-text">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-admin-text">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">На сайт</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loggingOut}
              onClick={() => void onLogout()}
            >
              {loggingOut ? "Выход…" : "Выйти"}
            </Button>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </AdminPanelRoot>
  );
}
