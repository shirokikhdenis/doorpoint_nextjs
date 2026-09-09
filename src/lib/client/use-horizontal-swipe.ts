"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type TouchEvent } from "react";

const DEFAULT_THRESHOLD_PX = 40;

type UseHorizontalSwipeOptions = {
  onNext: () => void;
  onPrev: () => void;
  enabled?: boolean;
  threshold?: number;
};

export function useHorizontalSwipe({
  onNext,
  onPrev,
  enabled = true,
  threshold = DEFAULT_THRESHOLD_PX,
}: UseHorizontalSwipeOptions) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);

  useEffect(() => {
    onNextRef.current = onNext;
    onPrevRef.current = onPrev;
  }, [onNext, onPrev]);

  const onTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!enabled) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      swipedRef.current = false;
      startRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [enabled],
  );

  const onTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (!enabled) return;
      const start = startRef.current;
      const touch = event.changedTouches[0];
      startRef.current = null;
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < threshold) return;
      if (Math.abs(dy) > Math.abs(dx)) return;
      swipedRef.current = true;
      if (dx < 0) onNextRef.current();
      else onPrevRef.current();
    },
    [enabled, threshold],
  );

  const onClickCapture = useCallback(
    (event: MouseEvent) => {
      if (!enabled || !swipedRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      swipedRef.current = false;
    },
    [enabled],
  );

  return { onTouchStart, onTouchEnd, onClickCapture };
}
