import type {
  BoxDesign,
  Constructive,
  FurnitureColor,
  FurnitureShape,
  FurnitureType,
  HandleSide,
  PeepholePosition,
} from "./apartment-types";

export const NO_PANEL_ID: number;
export const WIDTH_MIN: number;
export const WIDTH_MAX: number;
export const HEIGHT_MIN: number;
export const HEIGHT_MAX: number;
export const SIZE_STEP: number;
export const DEFAULT_WIDTH: number;
export const DEFAULT_HEIGHT: number;

export const CONSTRUCTIVES: Array<{ value: Constructive; label: string; description: string }>;
export const BOX_DESIGNS: Array<{ value: BoxDesign; label: string }>;
export const HANDLE_SIDES: Array<{ value: HandleSide; label: string }>;
export const HANDLE_TYPES: Array<{ value: FurnitureType; label: string }>;
export const FURNITURE_COLORS: Array<{ value: FurnitureColor; label: string; swatch: string }>;
export const FURNITURE_SHAPES: Array<{ value: FurnitureShape; label: string }>;
export const PEEPHOLE_POSITIONS: Array<{ value: PeepholePosition; label: string }>;
export const CYLINDRICAL_MECHANISM: string;
export const MARKUP_PRESETS: number[];
export const DEFAULT_MARKUP_PERCENT: number;
export const MARKUP_MIN: number;
export const MARKUP_MAX: number;
export const SKIP_MODEL_NAMES: Set<string>;
export const DEFAULT_PRIMARY_LOCK_CODE: string;
export const DEFAULT_SECONDARY_LOCK_CODE: string;
