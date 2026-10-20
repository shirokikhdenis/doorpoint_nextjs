"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { ApartmentDoorVisualizer } from "@/features/admin/configurator/apartment-door-visualizer";
import {
  ConfiguratorPickerModal,
  type ConfiguratorPickerItem,
} from "@/features/admin/configurator/configurator-picker-modal";
import { fetchApartmentCatalog } from "@/lib/client/admin-configurator";
import { formatPrice } from "@/lib/client/format";
import { toPublicImageSrc } from "@/lib/client/image-src";
import {
  BOX_DESIGNS,
  CONSTRUCTIVES,
  FURNITURE_COLORS,
  FURNITURE_SHAPES,
  HANDLE_SIDES,
  HANDLE_TYPES,
  HEIGHT_MAX,
  HEIGHT_MIN,
  MARKUP_MAX,
  MARKUP_MIN,
  MARKUP_PRESETS,
  DEFAULT_MARKUP_PERCENT,
  NO_PANEL_ID,
  PEEPHOLE_POSITIONS,
  SIZE_STEP,
  WIDTH_MAX,
  WIDTH_MIN,
} from "@/lib/configurator/apartment-constants";
import {
  clampSize,
  createDefaultDoorConfig,
  firstMatchingFurniture,
  getModel,
  isCylindricalLock,
  isMetalExteriorModel,
  lockMechanism,
  patchFinish,
  randomizeDoorConfig,
  setExteriorModel,
  setFurniture,
  setInteriorModel,
} from "@/lib/configurator/apartment-door-config";
import { calculateApartmentPrice, clampMarkupPercent } from "@/lib/configurator/apartment-price";
import { resolveBaseLayer } from "@/lib/configurator/apartment-visual";
import type {
  ApartmentCatalog,
  ConfiguratorNomenclature,
  DoorConfig,
  DoorSide,
} from "@/lib/configurator/apartment-types";
import { cn } from "@/lib/utils";

const MARKUP_STORAGE_KEY = "admin-configurator-markup-percent";

const readStoredMarkup = () => {
  if (typeof window === "undefined") return DEFAULT_MARKUP_PERCENT;
  try {
    const raw = window.localStorage.getItem(MARKUP_STORAGE_KEY);
    const parsed = raw == null ? DEFAULT_MARKUP_PERCENT : Number(raw);
    return clampMarkupPercent(Number.isFinite(parsed) ? parsed : DEFAULT_MARKUP_PERCENT);
  } catch {
    return DEFAULT_MARKUP_PERCENT;
  }
};

type PickerKind =
  | "exterior"
  | "interior"
  | "furniture"
  | "film-exterior-primary"
  | "film-exterior-secondary"
  | "film-exterior-casing"
  | "paint-exterior-primary"
  | "paint-exterior-secondary"
  | "paint-exterior-casing"
  | "film-interior-primary"
  | "film-interior-secondary"
  | "film-interior-casing"
  | "paint-interior-primary"
  | "paint-interior-secondary";

function StepCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-admin-border bg-admin-surface p-4 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-admin-text">
        <span className="mr-2 text-admin-text-muted">{step}.</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T | string;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm",
            value === option.value
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SizeField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-sm">
      <span className="text-admin-text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(value - SIZE_STEP)}>
          −
        </Button>
        <Input
          type="number"
          min={min}
          max={max}
          step={SIZE_STEP}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="text-center"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(value + SIZE_STEP)}>
          +
        </Button>
      </div>
    </label>
  );
}

function SwatchButton({
  selected,
  imageUrl,
  color,
  label,
  onClick,
}: {
  selected: boolean;
  imageUrl?: string;
  color?: string;
  label: string;
  onClick: () => void;
}) {
  const src = toPublicImageSrc(imageUrl);
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "size-10 overflow-hidden rounded-full border",
        selected ? "border-zinc-900 ring-2 ring-zinc-900 ring-offset-2" : "border-zinc-200",
      )}
    >
      {src ? (
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span className="block h-full w-full" style={{ background: color || "#e5e5e5" }} />
      )}
    </button>
  );
}

function ColorSelectRow({
  role,
  name,
  imageUrl,
  onClick,
}: {
  role: string;
  name?: string;
  imageUrl?: string;
  onClick: () => void;
}) {
  const src = toPublicImageSrc(imageUrl);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left hover:border-zinc-400"
    >
      <div className="size-11 shrink-0 overflow-hidden rounded-md bg-zinc-100">
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-admin-text-muted">{role}</div>
        <div className="truncate text-sm font-medium">{name || "Не выбрано"}</div>
      </div>
      <span className="text-lg leading-none text-zinc-400" aria-hidden>
        ›
      </span>
    </button>
  );
}

function FinishFields({
  catalog,
  config,
  side,
  onOpenPicker,
  onSelectExteriorKind,
}: {
  catalog: ApartmentCatalog;
  config: DoorConfig;
  side: DoorSide;
  onOpenPicker: (kind: PickerKind) => void;
  onSelectExteriorKind?: (metal: boolean) => void;
}) {
  const finish = config[side];
  const model = getModel(catalog, side, finish.panelModel);
  const film = (id: number | null) => catalog.films.find((item) => item.id === id);
  const paint = (id: number | null) => catalog.paints.find((item) => item.id === id);
  const metal = isMetalExteriorModel(model);
  const thumbSrc = toPublicImageSrc(resolveBaseLayer(side, config, catalog).src);

  const filmRows = [
    model?.hasPrimaryFilmColor
      ? {
          role: "Основной",
          item: film(finish.primaryTexture),
          picker: `film-${side}-primary` as PickerKind,
        }
      : null,
    model?.hasSecondaryFilmColor
      ? {
          role: "Дополнительный",
          item: film(finish.secondaryTexture),
          picker: `film-${side}-secondary` as PickerKind,
        }
      : null,
    model?.hasCasingFilmColor
      ? {
          role: "Наличник",
          item: film(finish.casingTexture),
          picker: `film-${side}-casing` as PickerKind,
        }
      : null,
  ].filter(Boolean) as Array<{ role: string; item?: ConfiguratorNomenclature; picker: PickerKind }>;

  const paintRows = [
    model?.hasPrimaryPaint
      ? {
          role: "Основной",
          item: paint(finish.primaryColor),
          picker: `paint-${side}-primary` as PickerKind,
        }
      : null,
    model?.hasSecondaryPaint
      ? {
          role: "Дополнительный",
          item: paint(finish.secondaryColor),
          picker: `paint-${side}-secondary` as PickerKind,
        }
      : null,
    model?.hasCasingPaint && model.paintColorSource !== "primary-to-casing" && model.paintColorSource !== "secondary-to-casing"
      ? {
          role: "Наличник",
          item: paint(finish.casingColor),
          picker: `paint-${side}-casing` as PickerKind,
        }
      : null,
  ].filter(Boolean) as Array<{ role: string; item?: ConfiguratorNomenclature; picker: PickerKind }>;

  return (
    <div className="space-y-4">
      {side === "exterior" && onSelectExteriorKind ? (
        <div>
          <p className="mb-2 text-xs text-admin-text-muted">Тип наружной отделки</p>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl bg-zinc-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => onSelectExteriorKind(false)}
              className={cn("rounded-lg px-3 py-2", !metal ? "bg-white font-medium shadow-sm" : "text-zinc-600")}
            >
              Декоративная панель
            </button>
            <button
              type="button"
              onClick={() => onSelectExteriorKind(true)}
              className={cn("rounded-lg px-3 py-2", metal ? "bg-white font-medium shadow-sm" : "text-zinc-600")}
            >
              Металлическая панель
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-2">
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-100">
          {thumbSrc ? <img src={thumbSrc} alt="" className="h-full w-full object-contain" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-admin-text-muted">Модель</div>
          <div className="truncate text-base font-semibold">
            {finish.panelModel === NO_PANEL_ID ? "Без панели" : model?.name || "Не выбрано"}
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenPicker(side)}>
          Изменить дизайн
        </Button>
      </div>

      {filmRows.length ? (
        <div>
          <p className="mb-2 text-xs text-admin-text-muted">Цвет плёнки</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {filmRows.map((row) => (
              <ColorSelectRow
                key={row.picker}
                role={row.role}
                name={row.item?.name}
                imageUrl={row.item?.imageUrl}
                onClick={() => onOpenPicker(row.picker)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {paintRows.length ? (
        <div>
          <p className="mb-2 text-xs text-admin-text-muted">Покраска металла</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {paintRows.map((row) => (
              <ColorSelectRow
                key={row.picker}
                role={row.role}
                name={row.item?.name}
                imageUrl={row.item?.imageUrl}
                onClick={() => onOpenPicker(row.picker)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LockPick({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: ConfiguratorNomenclature[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-admin-text-muted">{label}</p>
      <div className="grid grid-cols-1 gap-2">
        {items.map((item) => {
          const src = toPublicImageSrc(item.imageUrl);
          const mechanism = lockMechanism(item);
          const country = item.properties?.Страна;
          const safety = item.properties?.Безопасность;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-2 text-left",
                value === item.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white",
              )}
            >
              <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                {src ? <img src={src} alt="" className="h-full w-full object-contain" /> : null}
              </div>
              <div className="min-w-0">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-admin-text-muted">
                  {[mechanism, country, safety ? `класс ${safety}` : null].filter(Boolean).join(" · ")}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function panelPickerItems(
  catalog: ApartmentCatalog,
  config: DoorConfig,
  markupPercent: number,
  side: DoorSide,
  models: ApartmentCatalog["models"],
  includeNone = false,
): ConfiguratorPickerItem[] {
  const cards: Array<ConfiguratorPickerItem & { price: number }> = [];
  if (includeNone) {
    const next = setInteriorModel(config, catalog, NO_PANEL_ID);
    cards.push({
      id: NO_PANEL_ID,
      name: "Без панели",
      price: calculateApartmentPrice(next, catalog, markupPercent).sale,
    });
  }
  for (const model of models) {
    const next =
      side === "exterior"
        ? setExteriorModel(config, catalog, model.id)
        : setInteriorModel(config, catalog, model.id);
    const preview = resolveBaseLayer(side, next, catalog);
    cards.push({
      id: model.id,
      name: model.name,
      imageUrl: preview.src,
      price: calculateApartmentPrice(next, catalog, markupPercent).sale,
    });
  }
  const min = Math.min(...cards.map((item) => item.price));
  return cards.map((item) => ({
    ...item,
    delta: item.price - min,
  }));
}

export function AdminConfiguratorView() {
  const [catalog, setCatalog] = useState<ApartmentCatalog | null>(null);
  const [config, setConfig] = useState<DoorConfig | null>(null);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(DEFAULT_MARKUP_PERCENT);
  const [markupReady, setMarkupReady] = useState(false);

  useEffect(() => {
    setMarkupPercent(readStoredMarkup());
    setMarkupReady(true);
  }, []);

  useEffect(() => {
    if (!markupReady) return;
    try {
      window.localStorage.setItem(MARKUP_STORAGE_KEY, String(markupPercent));
    } catch {
      /* ignore quota / private mode */
    }
  }, [markupPercent, markupReady]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const next = await fetchApartmentCatalog();
        if (cancelled) return;
        setCatalog(next);
        setConfig(createDefaultDoorConfig(next));
        if (!next.models.length) {
          setError("Справочник пуст. Запустите npm run configurator:import");
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Не удалось загрузить конфигуратор");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const price = useMemo(
    () =>
      config && catalog
        ? calculateApartmentPrice(config, catalog, markupPercent)
        : { total: 0, wholesale: 0, sale: 0, markupPercent, lines: [] },
    [config, catalog, markupPercent],
  );

  const furnitureTypes = useMemo(() => {
    const present = new Set((catalog?.furnitures || []).map((item) => item.type));
    return HANDLE_TYPES.filter((item) => present.has(item.value));
  }, [catalog]);

  const furnitureColors = useMemo(() => {
    const present = new Set(
      (catalog?.furnitures || [])
        .filter((item) => !config || item.type === config.furnitureType)
        .map((item) => item.color),
    );
    return FURNITURE_COLORS.filter((item) => present.has(item.value));
  }, [catalog, config]);

  const furnitureShapes = useMemo(() => {
    const present = new Set(
      (catalog?.furnitures || [])
        .filter((item) => !config || (item.type === config.furnitureType && item.color === config.furnitureColor))
        .map((item) => item.shape),
    );
    return FURNITURE_SHAPES.filter((item) => present.has(item.value));
  }, [catalog, config]);

  const selectedFurniture = catalog && config ? catalog.furnitures.find((item) => item.id === config.furnitureId) : null;
  const primaryLock = catalog && config ? catalog.locks.primary.find((item) => item.id === config.primaryLockId) : null;
  const secondaryLock = catalog && config ? catalog.locks.secondary.find((item) => item.id === config.secondaryLockId) : null;
  const thresholdUiSrc = catalog ? toPublicImageSrc(catalog.layerUrls?.threshold?.ui || "") : "";

  if (!catalog || !config) {
    return (
      <div className="p-6">
        {error ? <AdminNotice variant="error">{error}</AdminNotice> : <p className="text-admin-text-muted">Загрузка конфигуратора…</p>}
      </div>
    );
  }

  const updateFurnitureFilters = (patch: Partial<Pick<DoorConfig, "furnitureType" | "furnitureColor" | "furnitureShape">>) => {
    const nextType = patch.furnitureType ?? config.furnitureType;
    const nextColor = patch.furnitureColor ?? config.furnitureColor;
    const nextShape = patch.furnitureShape ?? config.furnitureShape;
    const match = firstMatchingFurniture(catalog, {
      type: nextType,
      color: nextColor,
      shape: nextShape,
    });
    setConfig(
      setFurniture(
        { ...config, furnitureType: nextType, furnitureColor: nextColor, furnitureShape: nextShape },
        catalog,
        match?.id ?? null,
      ),
    );
  };

  const pickerItems = () => {
    if (picker === "exterior") {
      const metal = isMetalExteriorModel(getModel(catalog, "exterior", config.exterior.panelModel));
      return panelPickerItems(
        catalog,
        config,
        markupPercent,
        "exterior",
        catalog.models.filter((model) => model.type === "exterior" && isMetalExteriorModel(model) === metal),
      );
    }
    if (picker === "interior") {
      return panelPickerItems(
        catalog,
        config,
        markupPercent,
        "interior",
        catalog.models.filter((model) => model.type === "interior"),
        true,
      );
    }
    if (picker === "furniture") {
      return catalog.furnitures
        .filter(
          (item) =>
            item.type === config.furnitureType &&
            item.color === config.furnitureColor &&
            (!config.furnitureShape || item.shape === config.furnitureShape),
        )
        .map((item) => ({
          id: item.id,
          name: item.title,
          imageUrl: item.previewUrl,
          subtitle: item.shape,
        }));
    }
    if (picker?.startsWith("film-")) {
      return catalog.films.map((item) => ({ id: item.id, name: item.name, imageUrl: item.imageUrl }));
    }
    if (picker?.startsWith("paint-")) {
      return catalog.paints.map((item) => ({ id: item.id, name: item.name, imageUrl: item.imageUrl }));
    }
    return [];
  };

  const pickerSelectedId = () => {
    if (picker === "exterior") return config.exterior.panelModel;
    if (picker === "interior") return config.interior.panelModel;
    if (picker === "furniture") return config.furnitureId;
    const finish = picker?.includes("interior") ? config.interior : config.exterior;
    if (picker?.includes("film-") && picker.endsWith("primary")) return finish.primaryTexture;
    if (picker?.includes("film-") && picker.endsWith("secondary")) return finish.secondaryTexture;
    if (picker?.includes("film-") && picker.endsWith("casing")) return finish.casingTexture;
    if (picker?.includes("paint-") && picker.endsWith("primary")) return finish.primaryColor;
    if (picker?.includes("paint-") && picker.endsWith("secondary")) return finish.secondaryColor;
    if (picker?.includes("paint-") && picker.endsWith("casing")) return finish.casingColor;
    return null;
  };

  const pickerTitle = () => {
    if (picker === "exterior") return "Модель наружной панели";
    if (picker === "interior") return "Модель внутренней панели";
    if (picker === "furniture") return "Модели фурнитуры";
    if (picker?.startsWith("film-") && picker.endsWith("primary")) return "Основной цвет плёнки";
    if (picker?.startsWith("film-") && picker.endsWith("secondary")) return "Дополнительный цвет плёнки";
    if (picker?.startsWith("film-") && picker.endsWith("casing")) return "Цвет плёнки наличника";
    if (picker?.startsWith("paint-") && picker.endsWith("primary")) return "Основной цвет покраски";
    if (picker?.startsWith("paint-") && picker.endsWith("secondary")) return "Дополнительный цвет покраски";
    if (picker?.startsWith("paint-") && picker.endsWith("casing")) return "Цвет покраски наличника";
    return "Выбор";
  };

  const onPickerSelect = (id: number) => {
    if (picker === "exterior") setConfig(setExteriorModel(config, catalog, id));
    else if (picker === "interior") setConfig(setInteriorModel(config, catalog, id));
    else if (picker === "furniture") setConfig(setFurniture(config, catalog, id));
    else if (picker === "film-exterior-primary") setConfig(patchFinish(config, catalog, "exterior", { primaryTexture: id }));
    else if (picker === "film-exterior-secondary") setConfig(patchFinish(config, catalog, "exterior", { secondaryTexture: id }));
    else if (picker === "film-exterior-casing") setConfig(patchFinish(config, catalog, "exterior", { casingTexture: id }));
    else if (picker === "paint-exterior-primary") setConfig(patchFinish(config, catalog, "exterior", { primaryColor: id }));
    else if (picker === "paint-exterior-secondary") setConfig(patchFinish(config, catalog, "exterior", { secondaryColor: id }));
    else if (picker === "paint-exterior-casing") setConfig(patchFinish(config, catalog, "exterior", { casingColor: id }));
    else if (picker === "film-interior-primary") setConfig(patchFinish(config, catalog, "interior", { primaryTexture: id }));
    else if (picker === "film-interior-secondary") setConfig(patchFinish(config, catalog, "interior", { secondaryTexture: id }));
    else if (picker === "film-interior-casing") setConfig(patchFinish(config, catalog, "interior", { casingTexture: id }));
    else if (picker === "paint-interior-primary") setConfig(patchFinish(config, catalog, "interior", { primaryColor: id }));
    else if (picker === "paint-interior-secondary") setConfig(patchFinish(config, catalog, "interior", { secondaryColor: id }));
    setPicker(null);
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border bg-admin-surface px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold">Конфигуратор входных</h1>
          <p className="text-sm text-admin-text-muted">Квартира · Comfort / Absolut</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="text-xs text-admin-text-muted">Наценка</div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {MARKUP_PRESETS.map((percent) => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setMarkupPercent(percent)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-sm",
                    markupPercent === percent
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400",
                  )}
                >
                  {percent}%
                </button>
              ))}
              <Input
                type="number"
                min={MARKUP_MIN}
                max={MARKUP_MAX}
                step={1}
                value={markupPercent}
                onChange={(event) => setMarkupPercent(clampMarkupPercent(Number(event.target.value)))}
                className="h-8 w-[4.5rem] px-2 text-center"
                aria-label="Наценка в процентах"
              />
              <span className="text-sm text-admin-text-muted">%</span>
            </div>
          </div>
          <button type="button" className="text-left" onClick={() => setShowBreakdown((open) => !open)}>
            <div className="text-xs text-admin-text-muted">Опт</div>
            <div className={cn("font-semibold", markupPercent > 0 ? "text-base" : "text-xl")}>
              {formatPrice(price.wholesale)}
            </div>
          </button>
          {markupPercent > 0 ? (
            <button type="button" className="text-left" onClick={() => setShowBreakdown((open) => !open)}>
              <div className="text-xs text-admin-text-muted">Продажа</div>
              <div className="text-xl font-semibold">{formatPrice(price.sale)}</div>
            </button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => setConfig(randomizeDoorConfig(catalog, Math.random, config))}>
            Случайная дверь
          </Button>
        </div>
      </div>

      {error ? (
        <div className="px-4 pt-4 sm:px-6">
          <AdminNotice variant="warning">{error}</AdminNotice>
        </div>
      ) : null}

      {showBreakdown ? (
        <div className="border-b border-admin-border bg-admin-surface-muted px-4 py-3 text-sm sm:px-6">
          {price.lines.map((line) => (
            <div key={`${line.label}-${line.amount}`} className="flex justify-between gap-4">
              <span>{line.label}</span>
              <span>{formatPrice(line.amount)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(360px,48%)_1fr]">
        <div className="border-b border-admin-border lg:border-b-0 lg:border-r">
          <ApartmentDoorVisualizer config={config} catalog={catalog} />
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <StepCard step={1} title="Конструктив">
            <p className="mb-2 text-xs text-admin-text-muted">Вид конструктива</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {CONSTRUCTIVES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setConfig({ ...config, doorConstructive: item.value })}
                  className={cn(
                    "rounded-xl border p-3 text-left",
                    config.doorConstructive === item.value ? "border-zinc-900 bg-zinc-50" : "border-zinc-200",
                  )}
                >
                  <div className="font-medium">{item.label}</div>
                  <p className="mt-1 text-xs text-admin-text-muted">{item.description}</p>
                </button>
              ))}
            </div>
            <p className="mb-2 mt-4 text-xs text-admin-text-muted">Вид короба</p>
            <div className="grid grid-cols-2 gap-3">
              {BOX_DESIGNS.map((item) => {
                const src = toPublicImageSrc(catalog.layerUrls?.box?.[item.value] || "");
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setConfig({ ...config, doorBoxDesign: item.value })}
                    className={cn(
                      "overflow-hidden rounded-xl border text-left",
                      config.doorBoxDesign === item.value ? "border-zinc-900 bg-zinc-50" : "border-zinc-200",
                    )}
                  >
                    {src ? (
                      <div className="flex h-28 items-center justify-center bg-zinc-50 p-2">
                        <img src={src} alt="" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : null}
                    <div className="px-3 py-2 text-sm font-medium">{item.label}</div>
                  </button>
                );
              })}
            </div>
            <p className="mb-2 mt-4 text-xs text-admin-text-muted">Установочные размеры</p>
            <div className="flex gap-3">
              <SizeField
                label="Ширина"
                value={config.doorWidth}
                min={WIDTH_MIN}
                max={WIDTH_MAX}
                onChange={(doorWidth) =>
                  setConfig({ ...config, doorWidth: clampSize(doorWidth, WIDTH_MIN, WIDTH_MAX) })
                }
              />
              <SizeField
                label="Высота"
                value={config.doorHeight}
                min={HEIGHT_MIN}
                max={HEIGHT_MAX}
                onChange={(doorHeight) =>
                  setConfig({ ...config, doorHeight: clampSize(doorHeight, HEIGHT_MIN, HEIGHT_MAX) })
                }
              />
            </div>
            <p className="mb-2 mt-4 text-xs text-admin-text-muted">Сторона открывания</p>
            <ChoiceRow
              options={HANDLE_SIDES}
              value={config.doorHandleSide}
              onChange={(doorHandleSide) => setConfig({ ...config, doorHandleSide })}
            />
          </StepCard>

          <StepCard step={2} title="Наружная отделка">
            <FinishFields
              catalog={catalog}
              config={config}
              side="exterior"
              onOpenPicker={setPicker}
              onSelectExteriorKind={(metal) => {
                const current = getModel(catalog, "exterior", config.exterior.panelModel);
                if (isMetalExteriorModel(current) === metal) return;
                const nextModel = catalog.models.find(
                  (model) => model.type === "exterior" && isMetalExteriorModel(model) === metal,
                );
                if (nextModel) setConfig(setExteriorModel(config, catalog, nextModel.id));
              }}
            />
          </StepCard>

          <StepCard step={3} title="Внутренняя отделка">
            <FinishFields catalog={catalog} config={config} side="interior" onOpenPicker={setPicker} />
          </StepCard>

          <StepCard step={4} title="Фурнитура">
            <p className="mb-2 text-xs text-admin-text-muted">Тип ручки</p>
            <ChoiceRow
              options={furnitureTypes}
              value={config.furnitureType}
              onChange={(furnitureType) => updateFurnitureFilters({ furnitureType })}
            />
            <p className="mb-2 mt-4 text-xs text-admin-text-muted">Цвет фурнитуры</p>
            <div className="flex flex-wrap gap-2">
              {furnitureColors.map((item) => (
                <SwatchButton
                  key={item.value}
                  selected={config.furnitureColor === item.value}
                  color={item.swatch}
                  label={item.label}
                  onClick={() => updateFurnitureFilters({ furnitureColor: item.value })}
                />
              ))}
            </div>
            {furnitureShapes.length > 1 ? (
              <>
                <p className="mb-2 mt-4 text-xs text-admin-text-muted">Форма накладки</p>
                <ChoiceRow
                  options={furnitureShapes}
                  value={config.furnitureShape}
                  onChange={(furnitureShape) => updateFurnitureFilters({ furnitureShape })}
                />
              </>
            ) : null}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-admin-text-muted">Модель фурнитуры</p>
                <p className="font-medium">{selectedFurniture?.title || "Не выбрана"}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setPicker("furniture")}>
                Выбрать
              </Button>
            </div>
            <p className="mb-2 mt-4 text-xs text-admin-text-muted">Глазок</p>
            <ChoiceRow
              options={PEEPHOLE_POSITIONS}
              value={config.peepholePosition}
              onChange={(peepholePosition) => setConfig({ ...config, peepholePosition })}
            />
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.nightLatch}
                onChange={(event) => setConfig({ ...config, nightLatch: event.target.checked })}
              />
              Ночная задвижка + вертушок
            </label>
          </StepCard>

          <StepCard step={5} title="Замки">
            <LockPick
              label="Основной замок"
              items={catalog.locks.primary}
              value={config.primaryLockId}
              onChange={(primaryLockId) => {
                const lock = catalog.locks.primary.find((item) => item.id === primaryLockId);
                setConfig({
                  ...config,
                  primaryLockId,
                  primaryCylinderId: isCylindricalLock(lock) ? config.primaryCylinderId || catalog.cylinders[0]?.id || null : null,
                });
              }}
            />
            {isCylindricalLock(primaryLock) ? (
              <div className="mt-4">
                <LockPick
                  label="Цилиндр основного замка"
                  items={catalog.cylinders}
                  value={config.primaryCylinderId}
                  onChange={(primaryCylinderId) => setConfig({ ...config, primaryCylinderId })}
                />
              </div>
            ) : null}
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.secondaryLock}
                onChange={(event) => setConfig({ ...config, secondaryLock: event.target.checked })}
              />
              Дополнительный замок
            </label>
            {config.secondaryLock ? (
              <div className="mt-4 space-y-4">
                <LockPick
                  label="Дополнительный замок"
                  items={catalog.locks.secondary}
                  value={config.secondaryLockId}
                  onChange={(secondaryLockId) => {
                    const lock = catalog.locks.secondary.find((item) => item.id === secondaryLockId);
                    setConfig({
                      ...config,
                      secondaryLockId,
                      secondaryCylinderId: isCylindricalLock(lock)
                        ? config.secondaryCylinderId || catalog.cylinders[0]?.id || null
                        : null,
                    });
                  }}
                />
                {isCylindricalLock(secondaryLock) ? (
                  <LockPick
                    label="Цилиндр дополнительного замка"
                    items={catalog.cylinders}
                    value={config.secondaryCylinderId}
                    onChange={(secondaryCylinderId) => setConfig({ ...config, secondaryCylinderId })}
                  />
                ) : null}
              </div>
            ) : null}
          </StepCard>

          <StepCard step={6} title="Доп. опции">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={config.stainlessSteelDoorsill}
                onChange={(event) => setConfig({ ...config, stainlessSteelDoorsill: event.target.checked })}
              />
              {thresholdUiSrc ? (
                <img src={thresholdUiSrc} alt="" className="size-12 rounded-md object-cover" />
              ) : null}
              Порог из нержавейки
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(config.metalPainting?.undercoat || config.exterior.undercoat)}
                onChange={(event) =>
                  setConfig(patchFinish(config, catalog, "exterior", { undercoat: event.target.checked }))
                }
              />
              Предварительное цинкогрунтование
            </label>
          </StepCard>
        </div>
      </div>

      <ConfiguratorPickerModal
        open={Boolean(picker)}
        title={pickerTitle()}
        items={pickerItems()}
        selectedId={pickerSelectedId()}
        layout={
          picker === "exterior" || picker === "interior"
            ? "panel"
            : picker?.startsWith("film-") || picker?.startsWith("paint-")
              ? "swatch"
              : "door"
        }
        onClose={() => setPicker(null)}
        onSelect={onPickerSelect}
      />
    </div>
  );
}
