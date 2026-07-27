export type AddProductToExhibitionPayload = {
  productId: number;
  coatingColor?: string;
  productSku?: string;
  price?: number | null;
  kitPrice?: number | null;
};

export type ExhibitionDoorItem = {
  id: number;
  categoryType: "entry" | "interior";
  productId: number | null;
  productName: string;
  productSku: string;
  coatingColor: string;
  coatingType: string;
  manufacturerName: string;
  price: number | null;
  kitPrice: number | null;
  sortOrder: number;
};

const readErrorMessage = async (response: Response) => {
  const payload = await response.json().catch(() => ({}));
  return typeof payload.message === "string" ? payload.message : `Ошибка (${response.status})`;
};

export const addProductToExhibition = async (
  payload: AddProductToExhibitionPayload,
): Promise<ExhibitionDoorItem> => {
  const response = await fetch("/api/admin/exhibition/from-product", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as ExhibitionDoorItem;
};
