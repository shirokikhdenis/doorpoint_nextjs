export function stepGalleryImage(urls: string[], current: string, delta: number) {
  if (urls.length < 2) return current;
  const index = urls.indexOf(current);
  const from = index >= 0 ? index : 0;
  return urls[(from + delta + urls.length) % urls.length];
}

export function uniqueGalleryImages(urls: Array<string | undefined | null>) {
  const out: string[] = [];
  for (const url of urls) {
    const value = String(url || "").trim();
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}
