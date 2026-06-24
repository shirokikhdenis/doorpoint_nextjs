const { query } = require("../db/postgres");
const { ensureDoorFinishTables } = require("../db/schemaPatches");
const {
  DEFAULT_DOOR_FINISH_PICKER_SETTINGS,
  normalizeDoorFinishPickerSettings,
} = require("../domain/doorFinishPickerSettings");

let pickerSettingsTableEnsured = false;

const ensureDoorFinishPickerSettingsTable = async () => {
  await ensureDoorFinishTables();
  if (pickerSettingsTableEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS door_finish_picker_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      active_template_id TEXT,
      enabled_template_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    ALTER TABLE door_finish_picker_settings
    ALTER COLUMN active_template_id DROP NOT NULL
  `).catch(() => {});
  await query(
    `
    INSERT INTO door_finish_picker_settings (id, active_template_id, enabled_template_ids)
    VALUES (1, $1, $2::jsonb)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      DEFAULT_DOOR_FINISH_PICKER_SETTINGS.activeTemplateId,
      JSON.stringify(DEFAULT_DOOR_FINISH_PICKER_SETTINGS.enabledTemplateIds),
    ],
  );
  pickerSettingsTableEnsured = true;
};

const getDoorFinishPickerSettings = async () => {
  await ensureDoorFinishPickerSettingsTable();
  const res = await query(
    `
    SELECT
      active_template_id AS "activeTemplateId",
      enabled_template_ids AS "enabledTemplateIds"
    FROM door_finish_picker_settings
    WHERE id = 1
    LIMIT 1
    `,
  );
  return normalizeDoorFinishPickerSettings(res.rows[0] || DEFAULT_DOOR_FINISH_PICKER_SETTINGS);
};

const updateDoorFinishPickerSettings = async (payload) => {
  await ensureDoorFinishPickerSettingsTable();
  const normalized = normalizeDoorFinishPickerSettings(payload);
  const res = await query(
    `
    UPDATE door_finish_picker_settings
    SET
      active_template_id = $1,
      enabled_template_ids = $2::jsonb,
      updated_at = NOW()
    WHERE id = 1
    RETURNING
      active_template_id AS "activeTemplateId",
      enabled_template_ids AS "enabledTemplateIds"
    `,
    [normalized.activeTemplateId, JSON.stringify(normalized.enabledTemplateIds)],
  );
  return normalizeDoorFinishPickerSettings(res.rows[0] || normalized);
};

module.exports = {
  ensureDoorFinishPickerSettingsTable,
  getDoorFinishPickerSettings,
  updateDoorFinishPickerSettings,
};
