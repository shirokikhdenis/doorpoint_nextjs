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
  hideCartImage?: boolean;
  noProductLink?: boolean;
};

export type CartLineRef = Pick<
  CartItem,
  "id" | "name" | "color" | "finishId" | "hideCartImage"
>;

export type AddCartItemOptions = {
  toast?: string | false;
};
