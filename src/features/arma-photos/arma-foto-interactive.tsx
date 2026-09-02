"use client";

import { useCallback, useState } from "react";
import { ARMA_FOTO_FORM } from "@/features/arma-photos/arma-foto-copy";
import { ArmaPhotoGallery } from "@/features/arma-photos/arma-photo-gallery";
import { MeasureLeadForm } from "@/features/store/measure-lead-form";
import type { ArmaPhoto, ArmaPhotoTagCategory } from "@/features/arma-photos/types";

type ArmaFotoInteractiveProps = {
  items: ArmaPhoto[];
  categories: ArmaPhotoTagCategory[];
};

function buildArmaPhotoLeadComment(photo: ArmaPhoto, categories: ArmaPhotoTagCategory[]) {
  const lines = [`Дверь под заказ: ${photo.name}`];
  const assigned = new Set(photo.tagIds);

  for (const category of categories) {
    const matched = category.tags
      .filter((tag) => assigned.has(tag.id))
      .map((tag) => tag.name);
    if (matched.length > 0) {
      lines.push(`${category.name}: ${matched.join(", ")}`);
    }
  }

  return lines.join("\n");
}

export function ArmaFotoInteractive({ items, categories }: ArmaFotoInteractiveProps) {
  const [prefillComment, setPrefillComment] = useState("");
  const [selectedPhotoLabel, setSelectedPhotoLabel] = useState("");

  const handleRequestQuote = useCallback(
    (photo: ArmaPhoto) => {
      setPrefillComment(buildArmaPhotoLeadComment(photo, categories));
      setSelectedPhotoLabel(photo.name);
      window.setTimeout(() => {
        document.getElementById("zamer-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("zamer-comment")?.focus();
      }, 100);
    },
    [categories],
  );

  return (
    <>
      <ArmaPhotoGallery items={items} categories={categories} onRequestQuote={handleRequestQuote} />
      <div className="mt-12">
        <MeasureLeadForm
          embedded
          prefillComment={prefillComment}
          title={ARMA_FOTO_FORM.title}
          cardTitle={ARMA_FOTO_FORM.cardTitle}
          description={ARMA_FOTO_FORM.description}
          benefits={ARMA_FOTO_FORM.benefits}
          selectedPhotoLabel={selectedPhotoLabel || undefined}
          commentPlaceholder={ARMA_FOTO_FORM.commentPlaceholder}
        />
      </div>
    </>
  );
}
