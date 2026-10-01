import { Field, FieldGroup, Select, Toggle } from '@/components/common/Field';
import { i18n } from '#i18n';
import { NOTE_STATUSES, type NoteStatus } from '@/lib/notes/types';
import type { Settings, ThemePreference } from '@/lib/storage/schema';
import { statusLabelKey } from '@/components/popup/statusMeta';

export interface PreferencesSectionProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

/**
 * Appearance and behaviour.
 *
 * Shared verbatim by the popup panel and the full options page so the two can
 * never drift apart.
 */
export function PreferencesSection({ settings, onChange }: PreferencesSectionProps) {
  return (
    <>
      <FieldGroup title={i18n.t('settingsAppearance')}>
        <Field label={i18n.t('settingsAppearance')}>
          <Select<ThemePreference>
            label={i18n.t('settingsAppearance')}
            value={settings.theme}
            onChange={(theme) => onChange({ theme })}
            options={[
              { value: 'system', label: i18n.t('themeSystem') },
              { value: 'light', label: i18n.t('themeLight') },
              { value: 'dark', label: i18n.t('themeDark') },
              { value: 'oled', label: i18n.t('themeOled') },
              { value: 'sepia', label: i18n.t('themeSepia') },
            ]}
          />
        </Field>
      </FieldGroup>

      <FieldGroup title={i18n.t('settings')}>
        <Field label={i18n.t('settingsDefaultStatus')}>
          <Select<NoteStatus>
            label={i18n.t('settingsDefaultStatus')}
            value={settings.defaultStatus}
            onChange={(defaultStatus) => onChange({ defaultStatus })}
            options={NOTE_STATUSES.map((status) => ({
              value: status,
              label: i18n.t(statusLabelKey(status)),
            }))}
          />
        </Field>

        <Field label={i18n.t('settingsReminders')} hint={i18n.t('settingsRemindersHint')}>
          <Toggle
            label={i18n.t('settingsReminders')}
            checked={settings.remindersEnabled}
            onChange={(remindersEnabled) => onChange({ remindersEnabled })}
          />
        </Field>
      </FieldGroup>
    </>
  );
}
