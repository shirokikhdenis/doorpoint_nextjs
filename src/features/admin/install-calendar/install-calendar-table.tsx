"use client";

import { Button } from "@/components/ui/button";
import { formatUpcomingDateLabel } from "@/features/admin/install-calendar/calendar-utils";
import type { InteriorInstallation } from "@/features/admin/install-calendar/types";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";

const kindLabel = (kind: InteriorInstallation["kind"]) =>
  kind === "delivery" ? "Доставка" : "Монтаж";

function CellText({ value }: { value: string }) {
  const text = value.trim() || "—";
  return (
    <span className="block min-w-0 truncate" title={text === "—" ? undefined : text}>
      {text}
    </span>
  );
}

const sortJobs = (jobs: InteriorInstallation[]) =>
  [...jobs].sort((left, right) => {
    const byStart = left.installDate.localeCompare(right.installDate);
    if (byStart !== 0) return byStart;
    const byEnd = (left.installEndDate || left.installDate).localeCompare(
      right.installEndDate || right.installDate,
    );
    if (byEnd !== 0) return byEnd;
    if (left.kind !== right.kind) return left.kind === "delivery" ? -1 : 1;
    return left.id - right.id;
  });

type InstallCalendarTableProps = {
  jobs: InteriorInstallation[];
  open: boolean;
  onToggle: () => void;
  onOpenJob: (job: InteriorInstallation) => void;
};

export function InstallCalendarTable({
  jobs,
  open,
  onToggle,
  onOpenJob,
}: InstallCalendarTableProps) {
  const rows = sortJobs(jobs);

  return (
    <AdminCard
      title="Таблица графика"
      description="Те же записи, что на календаре за выбранный месяц."
    >
      <div className="mb-4">
        <Button type="button" variant="outline" size="sm" onClick={onToggle}>
          {open ? "Скрыть таблицу" : `Показать таблицу (${rows.length})`}
        </Button>
      </div>

      {open ? (
        rows.length === 0 ? (
          <AdminEmptyState title="За этот месяц записей нет" />
        ) : (
          <AdminTable className="overflow-hidden" tableClassName="w-full table-fixed">
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableCell header className="w-[7rem]">
                  Тип
                </AdminTableCell>
                <AdminTableCell header className="w-[8rem]">
                  Дата
                </AdminTableCell>
                <AdminTableCell header className="w-[7rem]">
                  № договора
                </AdminTableCell>
                <AdminTableCell header className="w-[11rem]">
                  Клиент
                </AdminTableCell>
                <AdminTableCell header className="w-[9rem]">
                  Телефон
                </AdminTableCell>
                <AdminTableCell header className="w-[14rem]">
                  Адрес
                </AdminTableCell>
                <AdminTableCell header className="w-[8rem]">
                  Бригада
                </AdminTableCell>
                <AdminTableCell header className="w-[12rem]">
                  Краткое описание
                </AdminTableCell>
                <AdminTableCell header className="w-[16rem]">
                  Спецификация
                </AdminTableCell>
                <AdminTableCell header className="w-[12rem]">
                  Заметки
                </AdminTableCell>
                <AdminTableCell header className="w-[6.5rem]" />
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {rows.map((job) => (
                <AdminTableRow key={job.id} className="h-12">
                  <AdminTableCell className="max-w-0 overflow-hidden py-2 font-medium">
                    <CellText value={kindLabel(job.kind)} />
                  </AdminTableCell>
                  <AdminTableCell className="max-w-0 overflow-hidden py-2">
                    <CellText
                      value={formatUpcomingDateLabel(job.installDate, job.installEndDate)}
                    />
                  </AdminTableCell>
                  <AdminTableCell className="max-w-0 overflow-hidden py-2">
                    <CellText value={job.orderNumber} />
                  </AdminTableCell>
                  <AdminTableCell className="max-w-0 overflow-hidden py-2">
                    <CellText value={job.customerName} />
                  </AdminTableCell>
                  <AdminTableCell className="max-w-0 overflow-hidden py-2">
                    <CellText value={job.phone} />
                  </AdminTableCell>
                  <AdminTableCell className="max-w-0 overflow-hidden py-2">
                    <CellText value={job.address} />
                  </AdminTableCell>
                  <AdminTableCell className="max-w-0 overflow-hidden py-2">
                    <CellText value={job.kind === "install" ? job.brigadeName : ""} />
                  </AdminTableCell>
                  <AdminTableCell className="max-w-0 overflow-hidden py-2">
                    <CellText value={job.doorsSummary} />
                  </AdminTableCell>
                  <AdminTableCell className="max-w-0 overflow-hidden py-2">
                    <CellText value={job.specification} />
                  </AdminTableCell>
                  <AdminTableCell className="max-w-0 overflow-hidden py-2">
                    <CellText value={job.notes} />
                  </AdminTableCell>
                  <AdminTableCell className="overflow-hidden py-2 text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => onOpenJob(job)}>
                      Открыть
                    </Button>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        )
      ) : null}
    </AdminCard>
  );
}
