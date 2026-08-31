export const INTERIOR_DOORS_CATEGORY_SLUG: string;

export function stripTrailingStars(value: unknown): string;
export function isMeaningfulToken(value: unknown): boolean;
export function appendToken(result: string, token: unknown): string;
export function isBravoInteriorDoor(input?: {
  manufacturer?: unknown;
  categorySlug?: string;
  category?: unknown;
}): boolean;
export function formatProductDisplayName(input?: {
  name?: unknown;
  color?: unknown;
  glass?: unknown;
  manufacturer?: unknown;
  categorySlug?: string;
  category?: unknown;
}): string;
