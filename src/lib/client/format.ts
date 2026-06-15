/** Цена в рублях для витрины (ru-RU). */
export const formatPrice = (price: number) =>
  `${Number(price || 0).toLocaleString("ru-RU")} ₽`;
