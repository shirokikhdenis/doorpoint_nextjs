export type BookletDoorKind = "entry" | "interior";

export type BookletProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  primaryImageUrl: string;
};
