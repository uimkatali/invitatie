'use client';

import { useActionState } from 'react';
import Field from '@/components/ui/Field';
import SubmitButton from '@/components/ui/SubmitButton';
import { LIMITS } from '@/lib/domain';
import type { ActionState } from '@/lib/result';

interface MemoryEditorProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  note: string;
  rating: number | null;
}

export default function MemoryEditor({ action, note, rating }: MemoryEditorProps) {
  const [state, formAction] = useActionState(action, null);
  const failed = state && !state.ok ? state : null;
  const currentRating = Number(failed?.values?.rating ?? rating ?? 0);

  return (
    <form action={formAction} className="form">
      <Field label="Cum a fost?" htmlFor="note" error={failed?.fields?.note}>
        <textarea
          id="note"
          name="note"
          required
          maxLength={LIMITS.memoryNoteMax}
          defaultValue={failed?.values?.note ?? note}
        />
      </Field>
      <fieldset className="field">
        <legend>Nota</legend>
        <div className="rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="rating-option">
              <input type="radio" name="rating" value={value} defaultChecked={currentRating === value} required />
              <span aria-hidden="true">♥</span>
              <span className="sr-only">{value} din 5</span>
            </label>
          ))}
        </div>
        {failed?.fields?.rating && <p className="field-error">{failed.fields.rating}</p>}
      </fieldset>
      {failed && (
        <p className="form-error" role="alert">
          {failed.error}
        </p>
      )}
      {state?.ok && (
        <p className="form-success" role="status">
          {state.message}
        </p>
      )}
      <SubmitButton label="Salveaza amintirea" pendingLabel="Se salveaza..." />
    </form>
  );
}
