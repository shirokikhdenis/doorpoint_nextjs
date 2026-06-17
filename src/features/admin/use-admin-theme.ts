"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyAdminThemeToDocument,
  type AdminTheme,
  readStoredAdminTheme,
  writeStoredAdminTheme,
} from "@/features/admin/admin-theme";

function getInitialAdminTheme(): AdminTheme {
  if (typeof window === "undefined") return "light";
  return readStoredAdminTheme();
}

export function useAdminTheme() {
  const [theme, setThemeState] = useState<AdminTheme>(getInitialAdminTheme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredAdminTheme();
    setThemeState(stored);
    applyAdminThemeToDocument(stored);
    setReady(true);
  }, []);

  const setTheme = useCallback((next: AdminTheme) => {
    setThemeState(next);
    writeStoredAdminTheme(next);
    applyAdminThemeToDocument(next);
  }, []);

  return { theme, setTheme, ready };
}
