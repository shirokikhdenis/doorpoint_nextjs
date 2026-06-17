import { cn } from "@/lib/utils";

type AdminEmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function AdminEmptyState({ title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-admin-border bg-admin-surface-muted/50 px-6 py-12 text-center">
      <p className="text-base font-medium text-admin-text">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-admin-text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
