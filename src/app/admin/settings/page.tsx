"use client";

import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminPage } from "@/features/admin/ui/admin-page";
import {
  ADMIN_THEME_LABELS,
  ADMIN_THEMES,
  type AdminTheme,
} from "@/features/admin/admin-theme";
import { useAdminTheme } from "@/features/admin/use-admin-theme";
import { cn } from "@/lib/utils";

const THEME_PREVIEW_CLASS: Record<AdminTheme, string> = {
  light: "bg-admin-bg",
  dark: "bg-[#09090b]",
  xp: "bg-gradient-to-b from-[#8fd08f] via-[#5a9fd4] to-[#3c8d3c]",
};

export default function AdminSettingsPage() {
  const { theme, setTheme, ready } = useAdminTheme();

  return (
    <AdminPage title="Настройки" description="Внешний вид панели администратора.">
      <AdminCard title="Тема оформления" description="Сохраняется в браузере на этом устройстве.">
        <div className="grid gap-3 sm:grid-cols-3">
          {ADMIN_THEMES.map((option) => {
            const selected = theme === option;
            return (
              <button
                key={option}
                type="button"
                disabled={!ready}
                onClick={() => setTheme(option)}
                className={cn(
                  "flex flex-col items-start gap-2 border p-4 text-left transition-colors",
                  selected
                    ? "border-brand bg-brand/5 ring-1 ring-brand/30"
                    : "border-admin-border bg-admin-surface hover:bg-admin-hover",
                  option === "xp" && "font-[\"Comic_Sans_MS\",\"Comic_Sans\",cursive]",
                )}
              >
                <span
                  className={cn("h-16 w-full border border-admin-border", THEME_PREVIEW_CLASS[option])}
                  aria-hidden
                />
                <span className="text-sm font-medium text-admin-text">
                  {ADMIN_THEME_LABELS[option]}
                </span>
                {selected ? (
                  <span className="text-xs text-brand">Текущая тема</span>
                ) : (
                  <span className="text-xs text-admin-text-muted">Выбрать</span>
                )}
              </button>
            );
          })}
        </div>
      </AdminCard>
    </AdminPage>
  );
}
