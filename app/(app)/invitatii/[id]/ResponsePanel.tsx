'use client';

import { useActionState, useState } from 'react';
import Field from '@/components/ui/Field';
import SubmitButton from '@/components/ui/SubmitButton';
import { LIMITS } from '@/lib/domain';
import type { ActionState } from '@/lib/result';

type Choice = 'accept' | 'decline' | 'reschedule';

const OPTIONS: { value: Choice; label: string }[] = [
  { value: 'accept', label: 'Da, abia astept' },
  { value: 'decline', label: 'Nu pot de data asta' },
  { value: 'reschedule', label: 'Propun alta ora' },
];

interface ResponsePanelProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  minDateTime: string;
}

export default function ResponsePanel({ action, minDateTime }: ResponsePanelProps) {
  const [state, formAction] = useActionState(action, null);
  const [choice, setChoice] = useState<Choice>('accept');
  const failed = state && !state.ok ? state : null;

  return (
    <form action={formAction} className="card form response-panel">
      <h2>Raspunsul tau</h2>
      <fieldset className="field">
        <legend className="sr-only">Alege raspunsul</legend>
        <div className="choice-grid">
          {OPTIONS.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name="action"
                value={option.value}
                defaultChecked={choice === option.value}
                onChange={() => setChoice(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {choice === 'reschedule' && (
        <Field label="Ce ora ti-ar conveni?" htmlFor="proposedAt" error={failed?.fields?.proposedAt} hint="Ora Romaniei">
          <input id="proposedAt" name="proposedAt" type="datetime-local" required min={minDateTime} />
        </Field>
      )}

      <Field label="Un mesaj (optional)" htmlFor="note" error={failed?.fields?.note}>
        <textarea id="note" name="note" maxLength={LIMITS.responseNoteMax} />
      </Field>

      {failed && (
        <p className="form-error" role="alert">
          {failed.error}
        </p>
      )}
      <SubmitButton label="Trimite raspunsul" />
    </form>
  );
}
