export {
  DOOR_FINISH_PICKER_TEMPLATE_MODAL_GRID_TABS,
  DOOR_FINISH_PICKER_TEMPLATE_INLINE_BELOW_CARD,
  DOOR_FINISH_PICKER_TEMPLATES,
  DEFAULT_DOOR_FINISH_PICKER_TEMPLATE_ID,
  isDoorFinishPickerTemplateId,
  getDoorFinishPickerTemplate,
  getFinishPickerPlacement,
} from "./door-finish-picker-templates.js";

export type DoorFinishPickerTemplateId = "modal-grid-tabs" | "inline-below-card";

export type FinishPickerPlacement = "sidebar" | "below-card";

export type DoorFinishPickerTemplate = {
  id: DoorFinishPickerTemplateId;
  title: string;
  description: string;
  placement: FinishPickerPlacement;
};
