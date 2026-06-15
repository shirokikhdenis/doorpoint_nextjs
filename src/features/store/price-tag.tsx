import { formatPrice } from "@/lib/client/format";
import { cn } from "@/lib/utils";

type PriceTagProps = {
  price: number;
  className?: string;
};

export function PriceTag({ price, className }: PriceTagProps) {
  return <span className={cn(className)}>{formatPrice(price)}</span>;
}
