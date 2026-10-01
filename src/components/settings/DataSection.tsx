import { useRef, useState } from 'react';

import { Button } from '@/components/common/Button';
import { Field, FieldGroup } from '@/components/common/Field';
import { DownloadIcon, TrashIcon, UploadIcon } from '@/components/common/Icons';
import { Modal } from '@/components/common/Modal';
import { i18n } from '#i18n';
import { backupSchema, sanitizeNotesWithReport } from '@/lib/notes/noteSchema';
import type { Note } from '@/lib/notes/types';
import { SCHEMA_VERSION } from '@/lib/storage/schema';

export interface DataSectionProps {
  notes: Note[];
  onReplaceAll: (notes: Note[]) => Promise<void>;
  onReset: () => Promise<void>;
  notify: (message: string, tone?: 'info' | 'danger') => void;
}

/**
 * Backup, restore and erase.
 *
 * Import **merges** rather than replaces: an import that silently wipes the notes
 * a user already had would be a catastrophic failure mode, and merging is what
 * people expect from "restore my backup".
 */
export function DataSection({ notes, onReplaceAll, onReset, notify }: DataSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleExport() {
    const payload = {
      app: 'notewisp' as const,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: Date.now(),
      notes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `notewisp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    notify(i18n.t('settingsExportDone'));
  }

  async function handleImport(file: File) {
    setBusy(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const envelope = backupSchema.safeParse(parsed);
      if (!envelope.success) {
        notify(i18n.t('settingsImportFailed'), 'danger');
        return;
      }

      const { notes: imported, dropped } = sanitizeNotesWithReport(envelope.data.notes);
      const existingIds = new Set(notes.map((note) => note.id));
      const merged = [...notes, ...imported.filter((note) => !existingIds.has(note.id))];
      await onReplaceAll(merged);

      notify(
        dropped > 0
          ? i18n.t('settingsImportSkipped', [String(imported.length), String(dropped)])
          : i18n.t('settingsImported', [String(imported.length)]),
      );
    } catch (cause) {
      console.error('[notewisp] import failed', cause);
      notify(i18n.t('settingsImportFailed'), 'danger');
    } finally {
      setBusy(false);
      // Reset so picking the same file twice still fires a change event.
      if (fileInputRef.current !== null) fileInputRef.current.value = '';
    }
  }

  return (
    <>
      <FieldGroup title={i18n.t('settingsData')} hint={i18n.t('settingsDataHint')}>
        <Field label={i18n.t('settingsExport')}>
          <Button
            size="sm"
            variant="secondary"
            icon={<DownloadIcon size={14} />}
            onClick={handleExport}
          >
            {i18n.t('settingsExport')}
          </Button>
        </Field>

        <Field label={i18n.t('settingsImport')}>
          <Button
            size="sm"
            variant="secondary"
            busy={busy}
            icon={<UploadIcon size={14} />}
            onClick={() => fileInputRef.current?.click()}
          >
            {i18n.t('settingsImport')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label={i18n.t('settingsImport')}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file !== undefined) void handleImport(file);
            }}
          />
        </Field>

        <Field label={i18n.t('settingsReset')}>
          <Button
            size="sm"
            variant="danger"
            icon={<TrashIcon size={14} />}
            onClick={() => setConfirmOpen(true)}
          >
            {i18n.t('settingsReset')}
          </Button>
        </Field>
      </FieldGroup>

      <Modal
        open={confirmOpen}
        title={i18n.t('settingsResetTitle')}
        description={i18n.t('settingsResetBody')}
        closeLabel={i18n.t('close')}
        onClose={() => setConfirmOpen(false)}
        footer={
          <Button
            variant="danger"
            fullWidth
            busy={busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                await onReset();
                setBusy(false);
                setConfirmOpen(false);
              })();
            }}
          >
            {i18n.t('settingsResetConfirm')}
          </Button>
        }
      >
        <span />
      </Modal>
    </>
  );
}
