const PERCENT_CHUNK = /(\d+\s*%)/g;

/** Подсвечивает фрагменты вида «10%» в тексте акции. */
export function PromotionHighlightText({ text }: { text: string }) {
  const parts = text.split(PERCENT_CHUNK);
  if (parts.length === 1) return text;

  return parts.map((part, index) =>
    /^\d+\s*%$/.test(part) ? (
      <span key={`${index}-${part}`} className="text-red-600">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
