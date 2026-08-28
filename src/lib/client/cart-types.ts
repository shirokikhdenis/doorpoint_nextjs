export type CartHardwareService = {
  id: number;
  name: string;
  price: number;
};

export type CartItem = {
  id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  sku?: string;
  /** Артикул производителя (`attr:manufacturer_id`, на варианте — `variant_attr:manufacturer_id`). */
  manufacturerId?: string;
  color?: string;
  glass?: string;
  finishId?: number;
  finishName?: string;
  glassOptionId?: number;
  glassOptionName?: string;
  hardwareServices?: CartHardwareService[];
  hideCartImage?: boolean;
  noProductLink?: boolean;
};

export type CartLineRef = Pick<
  CartItem,
  "id" | "name" | "color" | "glass" | "finishId" | "glassOptionId" | "hideCartImage"
> & {
  hardwareServiceKey?: string;
};

export type AddCartItemOptions = {
  toast?: string | false;
};
