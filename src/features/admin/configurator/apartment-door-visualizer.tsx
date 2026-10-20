"use client";

import type { ApartmentCatalog, DoorConfig, DoorSide } from "@/lib/configurator/apartment-types";
import { resolveVisualizerLayers } from "@/lib/configurator/apartment-visual";
import { toPublicImageSrc } from "@/lib/client/image-src";
import { cn } from "@/lib/utils";

type ApartmentDoorVisualizerProps = {
  config: DoorConfig;
  catalog: ApartmentCatalog;
};

function DoorStack({
  config,
  catalog,
  side,
  label,
}: {
  config: DoorConfig;
  catalog: ApartmentCatalog;
  side: DoorSide;
  label: string;
}) {
  const { layers, mirror } = resolveVisualizerLayers(config, catalog, side);
  const hasFilmCasing = layers.some((layer) => layer.id === "casing");
  const hasPaintCasing = layers.some((layer) => layer.id === "casing-paint");
  const rebateStyle = hasFilmCasing
    ? { left: "0.35%", right: "0.35%", top: "0.35%", bottom: "0.3%" }
    : hasPaintCasing
      ? { left: "5.3%", right: "5.3%", top: "0.35%", bottom: "0.3%" }
      : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div className="flex h-[min(calc(100vh-9rem),720px)] w-full items-center justify-center">
        <div
          className="relative h-full max-w-full aspect-[1096/2110]"
          style={{ transform: mirror ? "scaleX(-1)" : undefined }}
        >
          {layers.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-admin-text-muted">Нет фото</div>
          ) : (
            <>
              {rebateStyle ? <div className="absolute bg-black" style={rebateStyle} /> : null}
              {layers.map((layer, index) => {
                const src = toPublicImageSrc(layer.src);
                if (!src) return null;
                return (
                  <img
                    key={`${side}-${layer.id}-${src}`}
                    src={src}
                    alt=""
                    className={cn(
                      "object-contain",
                      index === 0 ? "relative h-full w-full" : "absolute inset-0 h-full w-full",
                    )}
                    style={layer.shiftX ? { transform: `translateX(${layer.shiftX * 100}%)` } : undefined}
                  />
                );
              })}
            </>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-admin-text-muted">{label}</p>
    </div>
  );
}

export function ApartmentDoorVisualizer({ config, catalog }: ApartmentDoorVisualizerProps) {
  return (
    <div className="flex flex-col bg-admin-bg p-4 sm:p-6 lg:sticky lg:top-14 lg:z-10 lg:max-h-[calc(100vh-3.5rem)]">
      <div className="flex items-stretch justify-center gap-3 rounded-3xl border border-admin-border bg-white p-4 sm:gap-6 sm:p-6">
        <DoorStack config={config} catalog={catalog} side="exterior" label="Снаружи" />
        <DoorStack config={config} catalog={catalog} side="interior" label="Изнутри" />
      </div>
    </div>
  );
}
