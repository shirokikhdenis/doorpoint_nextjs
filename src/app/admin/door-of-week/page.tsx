"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import {
  DoorOfWeekSlotPanel,
  type DoorOfWeekBlock,
} from "@/features/admin/door-of-week/door-of-week-slot-panel";

type DoorOfWeekPayload = {
  blocks: DoorOfWeekBlock[];
  nextRotationLabel: string;
};

export default function AdminDoorOfWeekPage() {
  const [payload, setPayload] = useState<DoorOfWeekPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/door-of-week");
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message || "Не удалось загрузить настройки");
    }
    return (await response.json()) as DoorOfWeekPayload;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await reload();
        if (!cancelled) setPayload(data);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handlePayload = (data: unknown) => {
    setSaving(false);
    setPayload(data as DoorOfWeekPayload);
  };

  const handleError = (message: string) => {
    setSaving(false);
    setError(message);
  };

  const handleActionStart = () => {
    setSaving(true);
    setError("");
  };

  return (
    <AdminPage
      title="Дверь недели"
      description="Два независимых блока на главной с еженедельной ротацией товаров."
    >
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}
      {loading || !payload ? (
        <p className="text-sm text-admin-text-muted">Загрузка…</p>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-admin-text-muted">
            Следующая смена: {payload.nextRotationLabel}
          </p>
          <div className="grid gap-6 xl:grid-cols-2">
            {payload.blocks.map((block) => (
              <DoorOfWeekSlotPanel
                key={block.slot}
                block={block}
                saving={saving}
                onActionStart={handleActionStart}
                onPayload={handlePayload}
                onError={handleError}
              />
            ))}
          </div>
        </div>
      )}
    </AdminPage>
  );
}
