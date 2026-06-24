import { catalogFilterFieldClass } from "@/features/store/storefront-ui";

type CatalogSortSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
};

export function CatalogSortSelect({ value, onChange, className = "", id }: CatalogSortSelectProps) {
  return (
    <select
      id={id}
      className={`${catalogFilterFieldClass} ${className}`.trim()}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="popularity">По популярности</option>
      <option value="alphabet-asc">По алфавиту (А-Я)</option>
      <option value="alphabet-desc">По алфавиту (Я-А)</option>
      <option value="price-asc">Сначала дешевле</option>
      <option value="price-desc">Сначала дороже</option>
    </select>
  );
}
