import type { ApartmentCatalog, DoorConfig, PriceBreakdown } from "./apartment-types";

export function calculateApartmentPrice(
  config: DoorConfig,
  catalog?: Partial<ApartmentCatalog>,
  markupPercent?: number,
): PriceBreakdown;
export function applyDealerMarkup(wholesale: number, markupPercent?: number): number;
export function clampMarkupPercent(value: number): number;
export function optionDelta(
  options: Array<{ code: string; delta: number }> | undefined,
  code: string,
): number;
