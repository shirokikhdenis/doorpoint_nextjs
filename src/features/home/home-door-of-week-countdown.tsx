"use client";

import { useEffect, useState } from "react";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function pluralDays(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

function formatRemaining(ms: number) {
  if (ms <= 0) return "скоро обновится";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const time = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;

  if (days > 0) {
    return `${days} ${pluralDays(days)} ${time}`;
  }

  return time;
}

type HomeDoorOfWeekCountdownProps = {
  endsAt: string;
};

export function HomeDoorOfWeekCountdown({ endsAt }: HomeDoorOfWeekCountdownProps) {
  const target = Date.parse(endsAt);
  const [remaining, setRemaining] = useState(() =>
    Number.isFinite(target) ? Math.max(0, target - Date.now()) : 0,
  );

  useEffect(() => {
    if (!Number.isFinite(target)) return undefined;

    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!Number.isFinite(target)) return null;

  return (
    <p className="text-sm text-zinc-500" aria-live="polite">
      До конца акции:{" "}
      <span className="font-medium tabular-nums text-zinc-700">{formatRemaining(remaining)}</span>
    </p>
  );
}
