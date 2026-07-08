/** Мгновенная прокрутка окна (без анимации). */
export function scrollToInstant(y: number): void {
  if (typeof window === "undefined") return;
  window.history.scrollRestoration = "manual";
  const top = Math.max(0, Number(y) || 0);
  const root = document.scrollingElement ?? document.documentElement;
  root.scrollTop = top;
  root.scrollLeft = 0;
  window.scrollTo(0, top);
  document.documentElement.scrollTop = top;
  document.body.scrollTop = top;
}

/** Мгновенный сброс прокрутки в начало страницы. */
export function scrollToTopInstant(): void {
  scrollToInstant(0);
}

let productScrollResetSuppressedUntil = 0;

/** Не сбрасывать прокрутку при ближайшей смене /product/* (чипы цвета/стекла). */
export function suppressNextProductScrollReset(durationMs = 300): void {
  productScrollResetSuppressedUntil = Date.now() + durationMs;
}

export function isProductScrollResetSuppressed(): boolean {
  return Date.now() < productScrollResetSuppressedUntil;
}
