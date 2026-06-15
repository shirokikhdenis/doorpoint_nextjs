export type CartItem = {
  id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  sku?: string;
  color?: string;
  hideCartImage?: boolean;
  noProductLink?: boolean;
};

export type CartLineRef = Pick<CartItem, "id" | "name" | "color" | "hideCartImage">;

export type AddCartItemOptions = {
  toast?: string | false;
};
