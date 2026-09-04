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

const readBookletWarnings = (response: Response): string[] => {
  const raw = response.headers.get("x-booklet-warnings");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
};

export type BookletRequestBody = {
  format: string;
  entryProductIds: number[];
  interiorProductIds: number[];
  showPrices: boolean;
  showComparePrices?: boolean;
  showCoupon?: boolean;
  headline: string;
  subhead?: string;
  couponText?: string;
};

export type BookletMeta = {
  categoryIds: {
    entry: number | null;
    interior: number | null;
  };
  categoryLabels: {
    entry: string;
    interior: string;
  };
  formats: Array<{
    id: string;
    label: string;
    description: string;
    maxEntry: number;
    maxInterior: number;
  }>;
  defaultHeadline: string;
  defaultSubhead?: string;
  defaultCouponText?: string;
  headlinePresets?: Array<{ id: string; label: string; headline: string }>;
};

export const fetchBookletMeta = async (): Promise<BookletMeta> => {
  const response = await fetch("/api/admin/booklets");
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return (await response.json()) as BookletMeta;
};

const postBooklet = async (body: BookletRequestBody) => {
  const response = await fetch("/api/admin/booklets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response;
};

export const fetchBookletPreview = async (body: BookletRequestBody) => {
  const response = await postBooklet(body);
  const blob = await response.blob();
  const filename = parseFilename(response.headers.get("content-disposition"), "buklet.pdf");
  return { blob, filename, warnings: readBookletWarnings(response) };
};

export const downloadBookletPdf = async (body: BookletRequestBody) => {
  const response = await postBooklet(body);
  const blob = await response.blob();
  const filename = parseFilename(response.headers.get("content-disposition"), "buklet.pdf");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return { filename, warnings: readBookletWarnings(response) };
};
