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

const downloadPdfBlob = (response: Response, fallbackFilename: string) => {
  const blob = response.blob();
  return blob.then((file) => {
    const filename = parseFilename(response.headers.get("content-disposition"), fallbackFilename);
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  });
};

const readErrorMessage = async (response: Response) => {
  const payload = await response.json().catch(() => ({}));
  return typeof payload.message === "string" ? payload.message : `Ошибка (${response.status})`;
};

export const downloadExhibitionPriceTag = async (id: number) => {
  const response = await fetch(`/api/admin/exhibition/${id}/price-tag`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  await downloadPdfBlob(response, `Cennik-exhibition-${id}.pdf`);
};

export const downloadExhibitionPriceTags = async (ids: number[]) => {
  const response = await fetch("/api/admin/exhibition/price-tags", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  await downloadPdfBlob(response, `Cenniki-vystavka-${ids.length}.pdf`);
};
