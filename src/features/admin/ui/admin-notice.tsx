import { cn } from "@/lib/utils";

type AdminNoticeVariant = "info" | "success" | "error";

const variantClass: Record<AdminNoticeVariant, string> = {
  info: "border-admin-border bg-admin-surface-muted text-admin-text-secondary",
  success: "border-admin-success-border bg-admin-success-bg text-admin-success-text",
  error: "border-admin-error-border bg-admin-error-bg text-admin-error-text",
};

type AdminNoticeProps = {
  children: React.ReactNode;
  variant?: AdminNoticeVariant;
  className?: string;
  onDismiss?: () => void;
};

export function AdminNotice({
  children,
  variant = "info",
  className,
  onDismiss,
}: AdminNoticeProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start justify-between gap-3 border px-4 py-3 text-sm",
        variantClass[variant],
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-medium opacity-70 hover:opacity-100"
          aria-label="Закрыть"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
