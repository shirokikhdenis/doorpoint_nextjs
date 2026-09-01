"use client";

import { Button } from "@/components/ui/button";
import { formatUpcomingDateLabel } from "@/features/admin/install-calendar/calendar-utils";
import type { CalendarEntryKind } from "@/features/admin/install-calendar/types";

type LeadScheduleCellProps = {
  from?: string | null;
  to?: string | null;
  kind: CalendarEntryKind;
  disabled?: boolean;
  onAdd: () => void;
  onEdit: () => void;
};

const formatLabel = (from?: string | null, to?: string | null) => {
  if (!from) return "";
  return formatUpcomingDateLabel(from, to || from) || from;
};

export function LeadScheduleCell({
  from,
  to,
  kind,
  disabled,
  onAdd,
  onEdit,
}: LeadScheduleCellProps) {
  const label = formatLabel(from, to);
  const ariaKind = kind === "delivery" ? "доставку" : "монтаж";

  if (!label) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="h-8 whitespace-nowrap"
        onClick={onAdd}
      >
        Добавить
      </Button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onEdit}
      className="text-left text-sm text-zinc-900 underline-offset-2 hover:underline disabled:text-zinc-400"
      aria-label={`Изменить ${ariaKind}: ${label}`}
    >
      {label}
    </button>
  );
}
