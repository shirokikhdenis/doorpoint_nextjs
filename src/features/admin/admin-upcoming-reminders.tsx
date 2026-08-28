"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  formatUpcomingDateLabel,
  todayIsoDate,
} from "@/features/admin/install-calendar/calendar-utils";
import type { InteriorInstallation } from "@/features/admin/install-calendar/types";

type UpcomingPayload = {
  delivery?: InteriorInstallation | null;
  install?: InteriorInstallation | null;
};

const scheduleHref = (item: InteriorInstallation) => {
  const today = todayIsoDate();
  const start = item.installDate;
  const end = item.installEndDate || item.installDate;
  const date = today >= start && today <= end ? today : start;
  const params = new URLSearchParams({ date, job: String(item.id) });
  return `/admin/install-calendar?${params.toString()}`;
};

const linkLabel = (item: InteriorInstallation) => {
  const dateLabel = formatUpcomingDateLabel(item.installDate, item.installEndDate);
  const extra = item.orderNumber || item.customerName;
  return extra ? `${dateLabel} · ${extra}` : dateLabel;
};

function ReminderLine({
  prefix,
  item,
}: {
  prefix: string;
  item: InteriorInstallation | null | undefined;
}) {
  return (
    <p className="min-w-0 truncate text-sm text-admin-text-muted">
      <span>{prefix}</span>
      {item ? (
        <Link
          href={scheduleHref(item)}
          className="font-medium text-admin-text underline-offset-2 hover:text-brand hover:underline"
          title={linkLabel(item)}
        >
          {linkLabel(item)}
        </Link>
      ) : (
        <span>нет</span>
      )}
    </p>
  );
}

export function AdminUpcomingReminders() {
  const pathname = usePathname();
  const [upcoming, setUpcoming] = useState<UpcomingPayload>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/interior-installations/upcoming");
        if (!response.ok) return;
        const json = (await response.json()) as UpcomingPayload;
        if (!cancelled) {
          setUpcoming({
            delivery: json.delivery ?? null,
            install: json.install ?? null,
          });
        }
      } catch {
        /* шапка не должна ломать админку, если график недоступен */
      }
    };
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-5">
      <ReminderLine prefix="Ближайшая доставка - " item={upcoming.delivery} />
      <ReminderLine prefix="Ближайший монтаж - " item={upcoming.install} />
    </div>
  );
}
