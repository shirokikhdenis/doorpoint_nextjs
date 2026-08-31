export const INTERIOR_DOORS_CATEGORY_SLUG: string;

export function stripTrailingStars(value: unknown): string;
export function isMeaningfulToken(value: unknown): boolean;
export function appendToken(result: string, token: unknown): string;
export function isBravoInteriorDoor(input?: {
  manufacturer?: string;
  categorySlug?: string;
  category?: string;
}): boolean;
export function formatProductDisplayName(input?: {
  name?: string;
  color?: string;
  glass?: string;
  manufacturer?: string;
  categorySlug?: string;
  category?: string;
}): string;
