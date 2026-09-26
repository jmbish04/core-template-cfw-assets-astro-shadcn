/**
 * @fileoverview Barrel for the settings feature islands + shared primitives.
 *
 * Astro pages import the hydrated islands from here so the page front-matter
 * stays thin. The shared ReUI Frame row + save-bar primitives are re-exported
 * for any future settings surface.
 */

export { SettingsNav, SETTINGS_SECTIONS } from "./SettingsNav";
export { PreferencesForm } from "./PreferencesForm";
export { NotificationPrefsMatrix } from "./NotificationPrefsMatrix";
export { WebhooksTable } from "./WebhooksTable";
export { ActivityTimeline } from "./ActivityTimeline";
export { AdvancedPanel } from "./AdvancedPanel";
export { SendTestNotification } from "./SendTestNotification";

export {
  SettingRow,
  SettingsRows,
  SaveBar,
  SavedFlash,
  InlineError,
  RowSkeleton,
  useSavedFlash,
  NOTIFICATIONS_CHANGED,
} from "./shared";
