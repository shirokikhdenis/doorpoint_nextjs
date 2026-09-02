import type { ArmaPhoto, ArmaPhotoTagCategory } from "@/features/arma-photos/types";

export function getPhotoTagsByCategory(photo: ArmaPhoto, categories: ArmaPhotoTagCategory[]) {
  const assigned = new Set(photo.tagIds);
  return categories
    .map((category) => ({
      category: category.name,
      tags: category.tags.filter((tag) => assigned.has(tag.id)).map((tag) => tag.name),
    }))
    .filter((row) => row.tags.length > 0);
}
