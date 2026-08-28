"use client";

import { LEAD_STATUS_OPTIONS } from "@/lib/client/lead-status";
import { cn } from "@/lib/utils";

type LeadStatusSelectProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
};

export function LeadStatusSelect({
  value,
  disabled,
  onChange,
  id,
  className,
}: LeadStatusSelectProps) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      aria-label="Статус заявки"
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "w-full min-w-[9.5rem] cursor-pointer rounded border border-black/15 bg-transparent px-2 py-1.5 text-xs font-medium outline-none disabled:cursor-wait",
        className,
      )}
    >
      {LEAD_STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
