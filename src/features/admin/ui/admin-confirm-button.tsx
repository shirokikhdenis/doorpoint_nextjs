"use client";

import { Button } from "@/components/ui/button";

type AdminConfirmButtonProps = {
  children: React.ReactNode;
  confirmMessage: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
};

export function AdminConfirmButton({
  children,
  confirmMessage,
  onConfirm,
  disabled,
  size = "sm",
  className,
}: AdminConfirmButtonProps) {
  return (
    <Button
      type="button"
      variant="destructive"
      size={size}
      disabled={disabled}
      className={className}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        void onConfirm();
      }}
    >
      {children}
    </Button>
  );
}
