import { useCallback, useMemo, useState } from 'react';

import { IconButton } from '@/components/common/Button';
import { LogoIcon, RefreshIcon } from '@/components/common/Icons';
import { ToastHost } from '@/components/common/ToastHost';
import { AboutSection } from '@/components/settings/AboutSection';
import { AccountSection } from '@/components/settings/AccountSection';
import { DataSection } from '@/components/settings/DataSection';
import { PreferencesSection } from '@/components/settings/PreferencesSection';
import { UsageMeter } from '@/components/popup/UsageMeter';
import { i18n } from '#i18n';
import { currentLocale } from '@/hooks/useLocale';
import { useBilling } from '@/hooks/useBilling';
import { useNotes } from '@/hooks/useNotes';
import { useTheme } from '@/hooks/useTheme';
import { useToasts } from '@/hooks/useToasts';
import { PRO_PLAN } from '@/lib/billing/plan';
import { sendMessage } from '@/lib/messaging';
import { callBackground } from '@/lib/messagingClient';
import { snapshotToState, type LocalSnapshot } from '@/lib/snapshot';
import { DEFAULT_SETTINGS, type Settings } from '@/lib/storage/schema';

export interface OptionsAppProps {
  initial: LocalSnapshot;
}

/**
 * The full-page settings view.
 *
 * Shares its section components with the popup panel, so a setting added here is
 * automatically available in the popup too.
 */
export function OptionsApp({ initial }: OptionsAppProps) {
  const locale = currentLocale();
  const [settings, setSettings] = useState<Settings>(initial.settings);
  useTheme(settings.theme);

  const notes = useNotes(useMemo(() => snapshotToState(initial), [initial]));
  const billing = useBilling(initial.billing);
  const toasts = useToasts();

  const [paywallBusy, setPaywallBusy] = useState(false);
  const [paywallFailed, setPaywallFailed] = useState(false);

  const notify = useCallback(
    (message: string, tone: 'info' | 'danger' = 'info') => {
      toasts.push({ message, tone });
    },
    [toasts],
  );

  const handleSettingsChange = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    void (async () => {
      const next = await callBackground(() => sendMessage('updateSettings', { patch }));
      if (next !== null) setSettings(next);
    })();
  }, []);

  const handleUpgrade = useCallback(async () => {
    setPaywallBusy(true);
    setPaywallFailed(false);
    const opened = await billing.upgrade(PRO_PLAN.nickname);
    setPaywallBusy(false);
    if (!opened) setPaywallFailed(true);
  }, [billing]);

  const handleRestore = useCallback(async () => {
    setPaywallBusy(true);
    setPaywallFailed(false);
    const opened = await billing.restore();
    setPaywallBusy(false);
    if (!opened) setPaywallFailed(true);
  }, [billing]);

  const handleReset = useCallback(async () => {
    const result = await callBackground(() => sendMessage('resetAllData', {}));
    if (result === null) {
      notify(i18n.t('errorTitle'), 'danger');
      return;
    }
    setSettings(DEFAULT_SETTINGS);
    await notes.reload();
    notify(i18n.t('settingsResetDone'));
  }, [notify, notes]);

  return (
    <div className="bg-bg/95 relative min-h-screen overflow-hidden">
      {/* Apple Liquid Glass Ambient Light Aurora */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="ambient-glow-1 absolute -top-24 -left-24 size-96 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-transparent blur-3xl" />
        <div className="ambient-glow-2 absolute -right-24 -bottom-24 size-[32rem] rounded-full bg-gradient-to-tl from-sky-400/20 via-blue-500/15 to-transparent blur-3xl" />
        <div className="absolute top-1/3 right-1/4 size-72 rounded-full bg-amber-400/[0.05] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-6 p-6 pb-24">
        <header className="apple-glass flex items-center gap-3 rounded-2xl p-3.5">
          <div className="from-accent/20 flex size-9 items-center justify-center rounded-xl border border-white/40 bg-gradient-to-br to-purple-500/20 shadow-xs dark:border-white/10">
            <LogoIcon size={20} className="text-accent" />
          </div>
          <h1 className="text-text flex-1 text-[16px] font-semibold tracking-tight">
            {i18n.t('settingsTitle')}
          </h1>
          <UsageMeter
            activeCount={notes.state.activeCount}
            limit={notes.state.limit}
            isPaid={notes.state.isPaid}
            onUpgrade={() => void handleUpgrade()}
          />
          <IconButton
            label={i18n.t('settingsRefresh')}
            size={28}
            onClick={() => {
              void billing.refresh();
              void notes.reload();
            }}
          >
            <RefreshIcon size={14} />
          </IconButton>
        </header>

        <PreferencesSection settings={settings} onChange={handleSettingsChange} />

        <AccountSection
          billing={billing.billing}
          locale={locale}
          busy={paywallBusy}
          failed={paywallFailed}
          onUpgrade={() => void handleUpgrade()}
          onRestore={() => void handleRestore()}
          onRefresh={() => void billing.refresh()}
        />

        <DataSection
          notes={notes.state.notes}
          onReplaceAll={notes.replaceAll}
          onReset={handleReset}
          notify={notify}
        />

        <AboutSection />
      </div>

      <ToastHost toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </div>
  );
}
