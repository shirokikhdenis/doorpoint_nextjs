export type ArmaPhotoTag = {
  id: number;
  categoryId: number;
  name: string;
  sortOrder: number;
};

export type ArmaPhotoTagCategory = {
  id: number;
  name: string;
  sortOrder: number;
  tags: ArmaPhotoTag[];
};

export type ArmaPhoto = {
  id: string;
  name: string;
  previewUrl: string;
  imageUrl: string;
  modifiedAt: string | null;
  tagIds: number[];
};

export function flattenTags(categories: ArmaPhotoTagCategory[]): ArmaPhotoTag[] {
  return categories.flatMap((category) => category.tags);
}

export function photoMatchesSelectedTags(
  photoTagIds: number[],
  selectedTagIds: number[],
  tags: ArmaPhotoTag[],
): boolean {
  if (selectedTagIds.length === 0) return true;

  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const selectedByCategory = new Map<number, number[]>();
  for (const tagId of selectedTagIds) {
    const tag = tagById.get(tagId);
    if (!tag) continue;
    const bucket = selectedByCategory.get(tag.categoryId) ?? [];
    bucket.push(tagId);
    selectedByCategory.set(tag.categoryId, bucket);
  }

  const assigned = new Set(photoTagIds);
  for (const ids of selectedByCategory.values()) {
    if (!ids.some((id) => assigned.has(id))) return false;
  }
  return true;
}
