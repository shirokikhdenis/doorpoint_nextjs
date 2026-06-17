"use client";

import { useCallback, useEffect, useState } from "react";

type AdminSessionState = {
  isAdmin: boolean;
  loading: boolean;
  refresh: () => void;
};

export function useAdminSession(): AdminSessionState {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/auth/admin", { credentials: "include" });
        const payload = (await response.json().catch(() => null)) as { isAdmin?: boolean } | null;
        if (!cancelled) {
          setIsAdmin(Boolean(payload?.isAdmin));
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  return { isAdmin, loading, refresh };
}
