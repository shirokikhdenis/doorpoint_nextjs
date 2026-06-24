import { cn } from "@/lib/utils";

export function AdminTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto border border-admin-border", className)}>
      <table className="min-w-full divide-y divide-admin-border text-sm">{children}</table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-admin-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-admin-text-muted">
      {children}
    </thead>
  );
}

export function AdminTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-admin-border-subtle bg-admin-surface">{children}</tbody>;
}

export function AdminTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={cn("hover:bg-[var(--admin-row-hover)]", className)}>{children}</tr>;
}

export function AdminTableCell({
  children,
  className,
  header,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  header?: boolean;
  colSpan?: number;
}) {
  const Tag = header ? "th" : "td";
  return (
    <Tag
      colSpan={colSpan}
      className={cn(
        header ? "px-4 py-3" : "px-4 py-3 align-middle text-admin-text-secondary",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
