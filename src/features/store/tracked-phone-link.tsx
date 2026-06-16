"use client";

import type { ReactNode } from "react";
import { SITE_PHONE_TEL } from "@/lib/site-contact";
import { trackYandexGoal, YANDEX_METRIKA_GOALS } from "@/lib/client/yandex-metrika";

type TrackedPhoneLinkProps = {
  children: ReactNode;
  className?: string;
};

export function TrackedPhoneLink({ children, className }: TrackedPhoneLinkProps) {
  return (
    <a
      href={`tel:${SITE_PHONE_TEL}`}
      className={className}
      onClick={() => trackYandexGoal(YANDEX_METRIKA_GOALS.phoneClick)}
    >
      {children}
    </a>
  );
}
