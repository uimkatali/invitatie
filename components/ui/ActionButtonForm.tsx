'use client';

import { useActionState } from 'react';
import type { ActionState } from '@/lib/result';
import SubmitButton from './SubmitButton';

interface ActionButtonFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  pendingLabel?: string;
  variant?: 'primary' | 'ghost' | 'danger';
  confirmText?: string;
}

export default function ActionButtonForm({ action, label, pendingLabel, variant = 'ghost', confirmText }: ActionButtonFormProps) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirmText && !window.confirm(confirmText)) event.preventDefault();
      }}
    >
      <SubmitButton label={label} pendingLabel={pendingLabel} variant={variant} />
      {state && !state.ok && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && state.message && (
        <p className="form-success" role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
