import { describe, it, expect } from 'vitest';
import { LIMITS } from '@/lib/domain';
import { echoResponseValues } from './response-values';

describe('echoResponseValues', () => {
  it('keeps the submitted values', () => {
    const values = { action: 'reschedule', proposedAt: '2026-10-10T18:00', note: 'Mai tarziu?' };
    expect(echoResponseValues(values)).toEqual(values);
  });

  it('caps the note at the response note limit', () => {
    const echoed = echoResponseValues({ action: 'accept', proposedAt: '', note: 'x'.repeat(LIMITS.responseNoteMax + 50) });
    expect(echoed.note).toHaveLength(LIMITS.responseNoteMax);
  });
});
