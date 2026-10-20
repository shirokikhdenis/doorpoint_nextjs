export type Constructive = "Comfort" | "Absolut";
export type BoxDesign = "Opened" | "Closed";
export type HandleSide = "Left" | "Right";
export type FurnitureType = "push" | "bugel" | "electronic";
export type FurnitureColor = "black" | "chrome" | "matte-chrome" | "gold" | "bronze";
export type FurnitureShape = "oval" | "rectangular" | "other";
export type PeepholePosition = "None" | "center" | "side";
export type DoorSide = "exterior" | "interior";

export type ConfiguratorModel = {
  id: number;
  name: string;
  type: DoorSide;
  classification: string | null;
  imageUrl: string;
  hasPrimaryFilmColor: boolean;
  hasSecondaryFilmColor: boolean;
  hasCasingFilmColor: boolean;
  hasPrimaryPaint: boolean;
  hasSecondaryPaint: boolean;
  hasCasingPaint: boolean;
  defaultPrimaryFilmColorId: number | null;
  defaultSecondaryFilmColorId: number | null;
  defaultCasingFilmColorId: number | null;
  defaultPrimaryPaintId: number | null;
  defaultSecondaryPaintId: number | null;
  defaultCasingPaintId: number | null;
  filmColorSource: string | null;
  paintColorSource: string | null;
  peepholePosition: string;
  markupAbs: number;
};

export type ConfiguratorNomenclature = {
  id: number;
  kind?: string;
  name: string;
  imageUrl: string;
  basePrice: number;
  unit?: string | null;
  properties?: Record<string, string>;
};

export type FurnitureOverlays = {
  peepholeExterior?: string;
  peepholeInterior?: string;
  peepholePreview?: string;
  primaryExteriorCylindrical?: string;
  primaryInteriorCylindrical?: string;
  primaryExteriorLever?: string;
  primaryInteriorLever?: string;
  secondaryExteriorCylindrical?: string;
  secondaryInteriorCylindrical?: string;
  secondaryExteriorLever?: string;
  secondaryInteriorLever?: string;
  handleExterior?: string;
  handleInterior?: string;
  nightLatchTurner?: string;
  cylinderRod?: string;
  preview?: string;
  interiorPreview?: string;
  nightLatchPreview?: string;
  kit?: Record<string, { id?: number; base_price?: number } | null>;
};

export type ConfiguratorFurniture = {
  id: number;
  title: string;
  type: FurnitureType | string;
  shape: FurnitureShape | string;
  color: FurnitureColor | string;
  previewUrl: string;
  interiorPreviewUrl: string;
  overlays: FurnitureOverlays;
  handleId: number | null;
  primaryCylindricalLockId: number | null;
  primaryLeverLockId: number | null;
  secondaryCylindricalLockId: number | null;
  secondaryLeverLockId: number | null;
  peepholeId: number | null;
  nightLatchId: number | null;
  cylinderRodId: number | null;
};

export type ConfiguratorPriceOption = {
  code: string;
  name: string;
  delta: number;
  category: string;
  comment: string;
};

export type ApartmentCatalog = {
  models: ConfiguratorModel[];
  paints: ConfiguratorNomenclature[];
  films: ConfiguratorNomenclature[];
  handles: ConfiguratorNomenclature[];
  cylinders: ConfiguratorNomenclature[];
  locks: {
    primary: ConfiguratorNomenclature[];
    secondary: ConfiguratorNomenclature[];
  };
  furnitures: ConfiguratorFurniture[];
  priceOptions: ConfiguratorPriceOption[];
  composites: {
    exterior: string[];
    interior: string[];
  };
  layerUrls?: {
    casing?: Record<string, string>;
    casingPaint?: Record<string, string>;
    insert?: Record<string, string>;
    leafInsert?: Record<string, string>;
    hinge?: Record<string, string>;
    threshold?: {
      exterior?: string;
      interior?: string;
      ui?: string;
    };
    box?: {
      Opened?: string;
      Closed?: string;
    };
  };
  thresholdImageUrl: string;
};

export type DoorFinishState = {
  panelModel: number;
  primaryTexture: number | null;
  secondaryTexture: number | null;
  casingTexture: number | null;
  primaryColor: number | null;
  secondaryColor: number | null;
  casingColor: number | null;
  undercoat: boolean;
};

export type DoorConfig = {
  doorConstructive: Constructive;
  doorBoxDesign: BoxDesign;
  doorHandleSide: HandleSide;
  doorWidth: number;
  doorHeight: number;
  exterior: DoorFinishState;
  interior: DoorFinishState;
  furnitureType: FurnitureType | string;
  furnitureColor: FurnitureColor | string;
  furnitureShape: FurnitureShape | string;
  furnitureId: number | null;
  peepholePosition: PeepholePosition;
  nightLatch: boolean;
  secondaryLock: boolean;
  stainlessSteelDoorsill: boolean;
  metalPainting: { undercoat: boolean };
  primaryLockId: number | null;
  secondaryLockId: number | null;
  primaryCylinderId: number | null;
  secondaryCylinderId: number | null;
};

export type PriceBreakdown = {
  total: number;
  wholesale: number;
  sale: number;
  markupPercent: number;
  lines: Array<{ label: string; amount: number }>;
};

export type VisualizerLayer = {
  id: string;
  src: string;
  kind: "composite" | "thumb" | "overlay" | "casing" | "insert" | "leaf-insert" | "hinge" | "empty";
  shiftX?: number;
};
