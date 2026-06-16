import { YANDEX_METRIKA_GOALS } from "@/lib/site-seo";

type YmFunction = (
  counterId: number,
  method: "reachGoal",
  goal: string,
  params?: Record<string, unknown>,
) => void;

declare global {
  interface Window {
    ym?: YmFunction;
  }
}

export { YANDEX_METRIKA_GOALS };

export const getYandexMetrikaId = (): number | null => {
  const raw = String(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID || "").trim();
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const trackYandexGoal = (
  goal: string,
  params?: Record<string, unknown>,
): void => {
  if (typeof window === "undefined") return;
  const counterId = getYandexMetrikaId();
  if (!counterId || typeof window.ym !== "function") return;
  window.ym(counterId, "reachGoal", goal, params);
};
