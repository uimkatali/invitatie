import { LIMITS } from '@/lib/domain';

export type ResponseValues = Record<'action' | 'proposedAt' | 'note', string>;

/** Valorile trimise, repetate in formular dupa o eroare (fara sa depaseasca limita notei). */
export function echoResponseValues(values: ResponseValues): ResponseValues {
  return { ...values, note: values.note.slice(0, LIMITS.responseNoteMax) };
}
