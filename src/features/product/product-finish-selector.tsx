"use client";

import {
  DOOR_FINISH_PICKER_TEMPLATE_INLINE_BELOW_CARD,
  DOOR_FINISH_PICKER_TEMPLATE_MODAL_GRID_TABS,
  getFinishPickerPlacement,
  type FinishPickerPlacement,
} from "@/lib/door-finish-picker-templates.js";
import { FinishPickerInlinePanel } from "@/features/product/finish-picker-inline-panel";
import {
  FinishPickerModalGridTabs,
  type FinishPickerTemplateProps,
} from "@/features/product/finish-picker-modal-grid-tabs";

export function ProductFinishSelector({
  placement,
  ...props
}: FinishPickerTemplateProps & { placement: FinishPickerPlacement }) {
  const templateId = props.finishOptions.pickerTemplateId;
  if (!templateId) return null;
  if (getFinishPickerPlacement(templateId) !== placement) return null;

  switch (templateId) {
    case DOOR_FINISH_PICKER_TEMPLATE_MODAL_GRID_TABS:
      return <FinishPickerModalGridTabs {...props} />;
    case DOOR_FINISH_PICKER_TEMPLATE_INLINE_BELOW_CARD:
      return <FinishPickerInlinePanel {...props} />;
    default:
      return null;
  }
}
