const parseFilename = (contentDisposition: string | null, fallback: string) => {
  if (!contentDisposition) return fallback;
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }
  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  return match?.[1] || fallback;
};

const readErrorMessage = async (response: Response) => {
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  return typeof payload.message === "string" ? payload.message : `Ошибка (${response.status})`;
};

export type DirectCreativeRequestBody = {
  productIds: number[];
  sizeIds: string[];
  scale: number;
  mode: "preview" | "zip";
  siteName?: string;
  ctaText?: string;
  showDiscountBadge?: boolean;
  texts?: Array<{
    productId: number;
    name: string;
    priceLabel: string;
    compareLabel: string;
    photoProductIds?: number[];
  }>;
};

const readCreativeWarnings = (response: Response): string[] => {
  const raw = response.headers.get("x-creative-warnings");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
};

const postDirectCreatives = async (body: DirectCreativeRequestBody) => {
  const response = await fetch("/api/admin/direct-creatives", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response;
};

export const fetchDirectCreativePreview = async (
  body: Omit<DirectCreativeRequestBody, "mode">,
) => {
  const response = await postDirectCreatives({ ...body, mode: "preview" });
  const blob = await response.blob();
  const filename = parseFilename(response.headers.get("content-disposition"), "preview.jpg");
  return { blob, filename, warnings: readCreativeWarnings(response) };
};

export const downloadDirectCreativesZip = async (
  body: Omit<DirectCreativeRequestBody, "mode">,
) => {
  const response = await postDirectCreatives({ ...body, mode: "zip" });
  const blob = await response.blob();
  const filename = parseFilename(
    response.headers.get("content-disposition"),
    "yandex-direct-creatives.zip",
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const fetchDirectCreativeColors = async (productId: number) => {
  const response = await fetch(
    `/api/admin/direct-creatives/colors?productId=${encodeURIComponent(String(productId))}`,
  );
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const payload = (await response.json()) as {
    variants?: Array<{ id: number; color: string; image: string; isCurrent: boolean }>;
  };
  return Array.isArray(payload.variants) ? payload.variants : [];
};
