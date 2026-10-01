import { defineExtensionMessaging } from '@webext-core/messaging';

import type { BillingState } from '@/lib/billing/types';
import type { NewNoteInput, Note, NotePatch, NoteStatus } from '@/lib/notes/types';
import type { Settings } from '@/lib/storage/schema';

/** Every request takes an argument, so no caller has to worry about arity rules. */
export type EmptyRequest = Record<string, never>;

/**
 * Everything the UI needs to render in one payload.
 *
 * The background owns all writes, so returning the fresh state from each mutation
 * means the UI never has to re-fetch or reconcile optimistic updates.
 */
export interface NotesStateDto {
  notes: Note[];
  /** Notes occupying a free-tier slot (archived notes do not). */
  activeCount: number;
  /** `null` means unlimited. */
  limit: number | null;
  canCreate: boolean;
  isPaid: boolean;
}

export interface CreateNoteResult {
  ok: boolean;
  reason: 'limit_reached' | null;
  state: NotesStateDto;
}

export interface DeleteNoteResult {
  state: NotesStateDto;
  /** The removed note, so the UI can offer an undo. */
  deleted: Note | null;
}

export interface PaymentActionResult {
  opened: boolean;
}

export interface ProtocolMap {
  getState(request: { refreshBilling?: boolean }): NotesStateDto;
  createNote(input: NewNoteInput): CreateNoteResult;
  updateNote(payload: { id: string; patch: NotePatch }): NotesStateDto;
  setNoteStatus(payload: { id: string; status: NoteStatus }): NotesStateDto;
  toggleNotePin(payload: { id: string }): NotesStateDto;
  deleteNote(payload: { id: string }): DeleteNoteResult;
  restoreNote(payload: { note: Note }): NotesStateDto;
  /** Used by import; timestamps are preserved exactly as they appear in the file. */
  replaceAllNotes(payload: { notes: Note[] }): NotesStateDto;

  getBilling(request: EmptyRequest): BillingState;
  refreshBilling(request: EmptyRequest): BillingState;
  openPaymentPage(payload: { plan?: string }): PaymentActionResult;
  openLoginPage(request: EmptyRequest): PaymentActionResult;

  getSettings(request: EmptyRequest): Settings;
  updateSettings(payload: { patch: Partial<Settings> }): Settings;
  resetAllData(request: EmptyRequest): NotesStateDto;

  openOptionsPage(request: EmptyRequest): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
