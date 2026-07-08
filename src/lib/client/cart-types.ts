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
  color?: string;
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
  "id" | "name" | "color" | "finishId" | "glassOptionId" | "hideCartImage"
> & {
  hardwareServiceKey?: string;
};

export type AddCartItemOptions = {
  toast?: string | false;
};
