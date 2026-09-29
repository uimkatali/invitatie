'use client';

import { useActionState } from 'react';
import Field from '@/components/ui/Field';
import SubmitButton from '@/components/ui/SubmitButton';
import { LIMITS } from '@/lib/domain';
import { createIdeaAction } from './actions';

export default function IdeaForm() {
  const [state, formAction] = useActionState(createIdeaAction, null);
  const failed = state && !state.ok ? state : null;
  return (
    <form action={formAction} className="card form">
      <h2>Idee noua</h2>
      <Field label="Ce ai vrea sa facem?" htmlFor="idea-title" error={failed?.fields?.title}>
        <input
          id="idea-title"
          name="title"
          required
          maxLength={LIMITS.ideaTitleMax}
          defaultValue={failed?.values?.title ?? ''}
          placeholder="Picnic la apus"
        />
      </Field>
      <Field label="Detalii (optional)" htmlFor="idea-description" error={failed?.fields?.description}>
        <textarea
          id="idea-description"
          name="description"
          maxLength={LIMITS.ideaDescriptionMax}
          defaultValue={failed?.values?.description ?? ''}
        />
      </Field>
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
      <SubmitButton label="Adauga ideea" />
    </form>
  );
}
