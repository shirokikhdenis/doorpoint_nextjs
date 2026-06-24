import { formatPrice } from "@/lib/client/format";

export const formatFinishPriceDelta = (delta: number) => {
  if (!delta) return "без наценки";
  return `+${formatPrice(delta)}`;
};
