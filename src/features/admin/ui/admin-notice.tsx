import { cn } from "@/lib/utils";

type AdminNoticeVariant = "info" | "success" | "error";

const variantClass: Record<AdminNoticeVariant, string> = {
  info: "border-zinc-200 bg-zinc-50 text-zinc-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
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
