"use client";

import { Suspense } from "react";
import { InstallCalendarPage } from "@/features/admin/install-calendar/install-calendar-page";

export default function AdminInstallCalendarRoute() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-admin-text-muted">Загрузка…</p>}>
      <InstallCalendarPage />
    </Suspense>
  );
}
