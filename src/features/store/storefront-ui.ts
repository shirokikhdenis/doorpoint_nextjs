import { cn } from "@/lib/utils";

/** Трёхколоночная сетка шапки: контакты / логотип / слоган и корзина */
export const storefrontHeaderTripleGridClass =
  "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]";

/** Уровень 1: ссылки по сайту — текст без рамки, активный с подчёркиванием */
const siteNavLinkBase =
  "whitespace-nowrap px-2.5 py-2 text-sm font-medium transition md:px-3 md:text-base";
const siteNavLinkActive =
  "font-semibold text-zinc-900 shadow-[inset_0_-2px_0_0_var(--color-brand)]";
const siteNavLinkIdle = "text-zinc-600 hover:text-zinc-900";

export function siteNavLinkClass(isActive: boolean): string {
  return cn(siteNavLinkBase, isActive ? siteNavLinkActive : siteNavLinkIdle);
}

/** Уровень 2: вкладки витрин каталога */
const catalogTabBase =
  "shrink-0 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium transition -mb-px";
const catalogTabActive = "border-brand text-zinc-900";
const catalogTabIdle = "text-zinc-600 hover:border-zinc-300 hover:text-zinc-900";

export function catalogTabClass(isActive: boolean): string {
  return cn(catalogTabBase, isActive ? catalogTabActive : catalogTabIdle);
}

/** Заголовок колонки фильтров */
export const catalogFilterHeadingClass = "text-base font-semibold text-zinc-900";

/** Заголовок сворачиваемой секции фильтра */
export const catalogFilterSectionHeadingClass =
  "mb-2 flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-zinc-900 hover:text-zinc-700";

/** Поля ввода и select в фильтрах */
export const catalogFilterFieldClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400";

/** Подпись к чекбоксу */
export const catalogFilterOptionLabelClass =
  "flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700";

/** Кнопка-подборка в фильтрах */
export const catalogFilterChipButtonClass =
  "flex w-full items-center rounded-md border px-3 py-2 text-left text-sm font-medium transition";

/** Заголовок группы в колонке фильтров (подборки, характеристики) */
export const catalogFilterStaticSectionHeadingClass =
  "py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500";

/** Кнопка сброса в шапке фильтров */
export const catalogFilterClearButtonClass =
  "shrink-0 text-xs font-medium text-zinc-500 transition hover:text-brand disabled:pointer-events-none disabled:opacity-40";

const chipToneBase = "border transition";
const chipToneActive = "border-brand bg-brand text-white";
const chipToneIdle =
  "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white";

export function chipToneClass(isActive: boolean): string {
  return cn(chipToneBase, isActive ? chipToneActive : chipToneIdle);
}
