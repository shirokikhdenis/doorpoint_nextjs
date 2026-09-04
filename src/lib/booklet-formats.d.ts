export const ENTRY_DOORS_CATEGORY_SLUG: "entry-doors";
export const INTERIOR_DOORS_CATEGORY_SLUG: "interior-doors";
export const DEFAULT_HEADLINE: string;
export const DEFAULT_SUBHEAD: string;
export const DEFAULT_COUPON_TEXT: string;
export const QR_HINT_TEXT: string;
export const MAX_HEADLINE_LEN: number;
export const MAX_SUBHEAD_LEN: number;
export const MAX_COUPON_LEN: number;

export type BookletFormatId = "a4" | "a5" | "a5-booklet";
export type BookletFormatKind = "flyer" | "booklet";

export type BookletFormat = {
  id: BookletFormatId;
  label: string;
  description: string;
  widthMm: number;
  heightMm: number;
  maxEntry: number;
  maxInterior: number;
  kind: BookletFormatKind;
  productsPerPage: number;
};

export type BookletHeadlinePreset = {
  id: string;
  label: string;
  headline: string;
};

export const HEADLINE_PRESETS: BookletHeadlinePreset[];
export const BOOKLET_FORMATS: BookletFormat[];

export function getFormatById(id: unknown): BookletFormat | null;

export function clipText(raw: unknown, maxLen: number): string;
export function clipHeadline(raw: unknown): string;
export function clipSubhead(raw: unknown): string;
export function clipCoupon(raw: unknown): string;

export function uniquePositiveInts(raw: unknown): number[];

export function doorKindFromSlug(slug: unknown): "entry" | "interior" | null;

export function chunkItems<T>(items: T[] | null | undefined, size: number): T[][];

export function buildBookletFilename(formatId: unknown, date?: Date): string;
