import { catalogFilterSectionHeadingClass } from "@/features/store/storefront-ui";

type CollapsibleFilterSectionProps = {
  sectionId: string;
  title: React.ReactNode;
  collapsed: boolean;
  onToggle: (sectionId: string) => void;
  children: React.ReactNode;
};

export function CollapsibleFilterSection({
  sectionId,
  title,
  collapsed,
  onToggle,
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
        <span>{title}</span>
        <span className="shrink-0 text-xs text-zinc-400" aria-hidden>
          {collapsed ? "▸" : "▾"}
        </span>
      </button>
      {!collapsed ? <div id={`filter-section-${sectionId}`}>{children}</div> : null}
    </div>
  );
}
