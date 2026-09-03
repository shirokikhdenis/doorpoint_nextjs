export type DirectCreativeProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  isOnSale: boolean;
  compareAtPrice: number | null;
  primaryImageUrl: string;
  title: string;
  priceLabel: string;
  compareLabel: string;
  colorVariants: Array<{
    id: number;
    color: string;
    image: string;
    isCurrent: boolean;
  }>;
  selectedPhotoIds: number[];
};
