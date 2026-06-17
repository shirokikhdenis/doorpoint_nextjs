import { cn } from "@/lib/utils";

type AdminPageProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Hide title — shell breadcrumbs already show context */
  hideTitle?: boolean;
};

export function AdminPage({
  title,
  description,
  actions,
  children,
  className,
  hideTitle = false,
}: AdminPageProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[var(--admin-content-max-width)] space-y-6 p-4 sm:p-6 lg:p-8",
        className,
      )}
    >
      {!hideTitle ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              {title}
            </h1>
            {description ? <p className="max-w-2xl text-sm text-zinc-500">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
