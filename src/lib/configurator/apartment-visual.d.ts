import type { ApartmentCatalog, DoorConfig, DoorSide, VisualizerLayer } from "./apartment-types";

export function compositeKey(modelName: string, colorName: string): string;
export function compositeUrl(side: DoorSide, modelName: string, colorName: string): string;
export const PEEPHOLE_SIDE_SHIFT: number;
export function hasComposite(
  set: Set<string> | string[] | Record<string, boolean> | undefined,
  modelName: string,
  colorName: string,
): boolean;
export function resolveBaseLayer(
  side: DoorSide,
  config: DoorConfig,
  catalog: Partial<ApartmentCatalog> | undefined,
): { src: string; kind: VisualizerLayer["kind"] };
export function resolveCasingSrc(
  side: DoorSide,
  config: DoorConfig,
  catalog: Partial<ApartmentCatalog> | undefined,
  model: { name: string } | null,
): string;
export function resolveVisualizerLayers(
  config: DoorConfig,
  catalog: Partial<ApartmentCatalog> | undefined,
  side?: DoorSide,
): { layers: VisualizerLayer[]; mirror: boolean };
