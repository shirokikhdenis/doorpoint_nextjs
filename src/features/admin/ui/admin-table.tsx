import { cn } from "@/lib/utils";

export function AdminTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto border border-zinc-200", className)}>
      <table className="min-w-full divide-y divide-zinc-200 text-sm">{children}</table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </thead>
  );
}

export function AdminTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-zinc-100 bg-white">{children}</tbody>;
}

export function AdminTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={cn("hover:bg-zinc-50/80", className)}>{children}</tr>;
}

export function AdminTableCell({
  children,
  className,
  header,
}: {
  children?: React.ReactNode;
  className?: string;
  header?: boolean;
}) {
  const Tag = header ? "th" : "td";
  return (
    <Tag
      className={cn(
        header ? "px-4 py-3" : "px-4 py-3 align-middle text-zinc-800",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
