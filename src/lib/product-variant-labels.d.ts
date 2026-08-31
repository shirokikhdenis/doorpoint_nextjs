export function attrValue(
  attributes: Array<{ code?: string; value?: unknown }> | unknown,
  code: string,
): string;

export function manufacturerFromProduct(product: unknown): string;

export function resolveProductVariantLabels(product: unknown): {
  color: string;
  glass: string;
  manufacturer: string;
};
