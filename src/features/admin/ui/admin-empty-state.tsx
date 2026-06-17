type AdminEmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function AdminEmptyState({ title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-12 text-center">
      <p className="text-base font-medium text-zinc-900">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-zinc-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
