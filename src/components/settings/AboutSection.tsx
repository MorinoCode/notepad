import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

import { Field, FieldGroup } from '@/components/common/Field';
import { i18n } from '#i18n';
import { PRIVACY_POLICY_URL } from '@/lib/constants';

export function AboutSection() {
  const [shortcut, setShortcut] = useState<string | null>(null);
  const version = browser.runtime.getManifest().version;

  useEffect(() => {
    void (async () => {
      try {
        // Read the live binding rather than hard-coding it, so the options page is
        // correct even after the user remaps the shortcut.
        const commands = await browser.commands.getAll();
        const action = commands.find((command) => command.name === '_execute_action');
        setShortcut(action?.shortcut ?? null);
      } catch {
        setShortcut(null);
      }
    })();
  }, []);

  return (
    <FieldGroup title={i18n.t('settingsAbout')}>
      <Field label={i18n.t('settingsVersion', [version])} />

      <Field label={i18n.t('settingsShortcuts')} hint={i18n.t('settingsShortcutHint')}>
        <kbd className="border-border bg-surface-muted text-muted rounded border px-1.5 py-0.5 font-mono text-[11px]">
          {shortcut !== null && shortcut.length > 0 ? shortcut : '—'}
        </kbd>
      </Field>

      <Field label={i18n.t('settingsPrivacy')}>
        <a
          href={PRIVACY_POLICY_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent text-[12px] underline underline-offset-2"
        >
          {i18n.t('settingsPrivacy')}
        </a>
      </Field>
    </FieldGroup>
  );
}
