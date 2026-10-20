import type { ApartmentCatalog, ConfiguratorFurniture, ConfiguratorModel, DoorConfig, DoorFinishState, DoorSide } from "./apartment-types";

export function clampSize(value: number, min: number, max: number): number;
export function createDefaultDoorConfig(catalog?: Partial<ApartmentCatalog>): DoorConfig;
export function finishFromModel(model: ConfiguratorModel | null | undefined): DoorFinishState;
export function getModel(
  catalog: Partial<ApartmentCatalog> | undefined,
  type: DoorSide,
  id: number | null | undefined,
): ConfiguratorModel | null;
export function isCylindricalLock(lock: { properties?: Record<string, string> } | null | undefined): boolean;
export function lockMechanism(lock: { properties?: Record<string, string> } | null | undefined): string;
export function firstMatchingFurniture(
  catalog: Partial<ApartmentCatalog> | undefined,
  filters?: { type?: string; color?: string; shape?: string; id?: number | null },
): ConfiguratorFurniture | null;
export function patchFinish(
  config: DoorConfig,
  catalog: Partial<ApartmentCatalog> | undefined,
  side: DoorSide,
  patch: Partial<DoorFinishState>,
): DoorConfig;
export function randomizeDoorConfig(
  catalog?: Partial<ApartmentCatalog>,
  rng?: () => number,
  current?: Partial<DoorConfig> | null,
): DoorConfig;
export function setExteriorModel(
  config: DoorConfig,
  catalog: Partial<ApartmentCatalog> | undefined,
  modelId: number | null | undefined,
): DoorConfig;
export function setFurniture(
  config: DoorConfig,
  catalog: Partial<ApartmentCatalog> | undefined,
  furnitureId: number | null,
): DoorConfig;
export function setInteriorModel(
  config: DoorConfig,
  catalog: Partial<ApartmentCatalog> | undefined,
  modelId: number,
): DoorConfig;
export function isMetalExteriorModel(model: ConfiguratorModel | null | undefined): boolean;
export function clampDoorSizes(config: DoorConfig): DoorConfig;
export function syncedFilm(model: ConfiguratorModel | null | undefined, finish: DoorFinishState): DoorFinishState;
export function syncedPaint(model: ConfiguratorModel | null | undefined, finish: DoorFinishState): DoorFinishState;
