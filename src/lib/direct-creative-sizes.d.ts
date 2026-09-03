export const MAX_PRODUCTS: number;
export const MAX_JPEG_BYTES: number;
export const DEFAULT_SCALE: number;
export const ALLOWED_SCALES: number[];
export const DESIGN_SCALE: number;
export const DESIGN_MAX_EDGE: number;
export const DEFAULT_SIZE_IDS: string[];
export const COMPACT_BLOCK_HEIGHT: number;
export const MAX_CTA_LEN: number;
export const MAX_COLLAGE_PHOTOS: number;
export const DEFAULT_CTA_TEXT: string;

export type DirectCreativeLayoutFamily = "portrait" | "card" | "wide" | "landscape";

export type DirectCreativeSize = {
  id: string;
  blockWidth: number;
  blockHeight: number;
  popular: boolean;
  family: DirectCreativeLayoutFamily;
  label: string;
  note?: string;
};

export const DIRECT_CREATIVE_SIZES: DirectCreativeSize[];

export function layoutFamilyForBlock(
  blockWidth: number,
  blockHeight: number,
): DirectCreativeLayoutFamily;

export function getSizeById(id: unknown): DirectCreativeSize | null;

export function resolveScale(raw: unknown): number | null;

export function resolveOutputPixels(
  size: DirectCreativeSize | null | undefined,
  scale: unknown,
): { width: number; height: number } | null;

export function resolveDesignPixels(
  size: DirectCreativeSize | null | undefined,
): { width: number; height: number } | null;

export function resolveLayoutScale(blockWidth: unknown, blockHeight: unknown): number;

export function isCompactBlock(blockHeight: unknown): boolean;

export function formatCreativeBrandLine(siteUrl: unknown): string;

export function sanitizeCreativeFileStem(sku: unknown, productId?: unknown): string;

export function buildCreativeFilename(input?: {
  sku?: unknown;
  productId?: unknown;
  width?: unknown;
  height?: unknown;
}): string;

export const MAX_NAME_LEN: number;
export const MAX_PRICE_LABEL_LEN: number;
export const MAX_SITE_NAME_LEN: number;

export function formatPriceRub(price: unknown): string;
export function formatPriceFrom(price: unknown): string;
export function clipCreativeText(raw: unknown, maxLen: number): string;
