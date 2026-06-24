const {
  DEFAULT_DOOR_FINISH_PICKER_TEMPLATE_ID,
  DOOR_FINISH_PICKER_TEMPLATES,
  isDoorFinishPickerTemplateId,
} = require("../../door-finish-picker-templates.js");

const DEFAULT_DOOR_FINISH_PICKER_SETTINGS = {
  activeTemplateId: DEFAULT_DOOR_FINISH_PICKER_TEMPLATE_ID,
  enabledTemplateIds: [DEFAULT_DOOR_FINISH_PICKER_TEMPLATE_ID],
};

const normalizeEnabledTemplateIds = (value) => {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  const normalized = [];
  for (const entry of list) {
    const id = String(entry || "").trim();
    if (!isDoorFinishPickerTemplateId(id) || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }
  return normalized;
};

const normalizeDoorFinishPickerSettings = (payload) => {
  const hasEnabledList = Array.isArray(payload?.enabledTemplateIds);
  const enabledTemplateIds = hasEnabledList
    ? normalizeEnabledTemplateIds(payload.enabledTemplateIds)
    : normalizeEnabledTemplateIds(DEFAULT_DOOR_FINISH_PICKER_SETTINGS.enabledTemplateIds);

  if (enabledTemplateIds.length === 0) {
    return {
      activeTemplateId: null,
      enabledTemplateIds: [],
    };
  }

  const hasActiveKey =
    payload !== null &&
    payload !== undefined &&
    Object.prototype.hasOwnProperty.call(payload, "activeTemplateId");

  if (hasActiveKey) {
    const requested =
      payload.activeTemplateId === null || payload.activeTemplateId === undefined
        ? null
        : String(payload.activeTemplateId).trim();
    const activeTemplateId =
      requested && enabledTemplateIds.includes(requested) ? requested : enabledTemplateIds[0];
    return { activeTemplateId, enabledTemplateIds };
  }

  const defaultActive = DEFAULT_DOOR_FINISH_PICKER_SETTINGS.activeTemplateId;
  const activeTemplateId = enabledTemplateIds.includes(defaultActive)
    ? defaultActive
    : enabledTemplateIds[0];

  return {
    activeTemplateId,
    enabledTemplateIds,
  };
};

const resolveFinishPickerTemplateId = (settings) => {
  const normalized = normalizeDoorFinishPickerSettings(settings);
  if (normalized.enabledTemplateIds.length === 0) return null;
  if (
    normalized.activeTemplateId &&
    normalized.enabledTemplateIds.includes(normalized.activeTemplateId)
  ) {
    return normalized.activeTemplateId;
  }
  return normalized.enabledTemplateIds[0] || null;
};

const listDoorFinishPickerTemplates = () =>
  DOOR_FINISH_PICKER_TEMPLATES.map((template) => ({ ...template }));

module.exports = {
  DEFAULT_DOOR_FINISH_PICKER_SETTINGS,
  normalizeDoorFinishPickerSettings,
  resolveFinishPickerTemplateId,
  listDoorFinishPickerTemplates,
};
