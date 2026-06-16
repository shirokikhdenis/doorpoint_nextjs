import {
  COLUMN_VISIBILITY_STORAGE_KEY,
  DEFAULT_COLUMN_VISIBILITY,
} from "./constants";
import type { ColumnVisibility } from "./types";

export const loadColumnVisibility = (): ColumnVisibility => {
  if (typeof window === "undefined") return DEFAULT_COLUMN_VISIBILITY;
  try {
    const raw = window.localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
    if (!raw) return DEFAULT_COLUMN_VISIBILITY;
    const parsed = JSON.parse(raw) as Partial<ColumnVisibility>;
    return { ...DEFAULT_COLUMN_VISIBILITY, ...parsed };
  } catch {
    return DEFAULT_COLUMN_VISIBILITY;
  }
};

export const saveColumnVisibility = (value: ColumnVisibility) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(value));
};
