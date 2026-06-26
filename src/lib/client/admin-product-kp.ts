const parseFilename = (contentDisposition: string | null, fallback: string) => {
  if (!contentDisposition) return fallback;
  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  return match?.[1] || fallback;
};

export const downloadProductKp = async (productId: number) => {
  const response = await fetch(`/api/admin/products/${productId}/kp`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      typeof payload.message === "string" ? payload.message : `Ошибка КП (${response.status})`,
    );
  }

  const blob = await response.blob();
  const filename = parseFilename(
    response.headers.get("content-disposition"),
    `KP-product-${productId}.pdf`,
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
