import { catalogFilterSectionHeadingClass } from "@/features/store/storefront-ui";
import { cn } from "@/lib/utils";

type CollapsibleFilterSectionProps = {
  sectionId: string;
  title: React.ReactNode;
  collapsed: boolean;
  onToggle: (sectionId: string) => void;
  activeCount?: number;
  children: React.ReactNode;
};

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", !collapsed && "rotate-180")}
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CollapsibleFilterSection({
  sectionId,
  title,
  collapsed,
  onToggle,
  activeCount = 0,
  children,
}: CollapsibleFilterSectionProps) {
  return (
    <div className="border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => onToggle(sectionId)}
        className={catalogFilterSectionHeadingClass}
        aria-expanded={!collapsed}
        aria-controls={`filter-section-${sectionId}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{title}</span>
          {activeCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 px-1.5 text-[11px] font-semibold text-brand">
              {activeCount}
            </span>
          ) : null}
        </span>
        <ChevronIcon collapsed={collapsed} />
      </button>
      {!collapsed ? <div id={`filter-section-${sectionId}`} className="pb-0.5">{children}</div> : null}
    </div>
  );
}

type StaticFilterSectionProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function StaticFilterSection({ title, children, className }: StaticFilterSectionProps) {
  return (
    <div className={cn("border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0", className)}>
      <div className="mb-2 text-sm font-semibold text-zinc-900">{title}</div>
      {children}
    </div>
  );
}
