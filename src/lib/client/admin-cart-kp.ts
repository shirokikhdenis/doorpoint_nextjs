const parseFilename = (contentDisposition: string | null, fallback: string) => {
  if (!contentDisposition) return fallback;
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      /* fall through */
    }
  }
  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  return match?.[1] || fallback;
};

const downloadBlob = async (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const downloadCartKpFormat = async (items: unknown[], format: "pdf" | "png") => {
  const response = await fetch("/api/admin/cart/kp", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items, format }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      typeof payload.message === "string" ? payload.message : `Ошибка КП (${response.status})`,
    );
  }
  const blob = await response.blob();
  const filename = parseFilename(
    response.headers.get("content-disposition"),
    `KP-cart.${format}`,
  );
  await downloadBlob(blob, filename);
};

/** Скачивает PDF и PNG коммерческого предложения по составу корзины. */
export const downloadCartKp = async (items: unknown[]) => {
  await downloadCartKpFormat(items, "pdf");
  await downloadCartKpFormat(items, "png");
};
