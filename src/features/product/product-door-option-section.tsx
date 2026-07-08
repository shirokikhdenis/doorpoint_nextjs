"use client";

import type { ReactNode } from "react";

type ProductDoorOptionSectionProps = {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function ProductDoorOptionSection({
  label,
  hint,
  children,
}: ProductDoorOptionSectionProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm text-zinc-600">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
