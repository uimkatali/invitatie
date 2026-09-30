'use client';

import { useActionState } from 'react';
import { loginAction } from '../actions';
import Field from '@/components/ui/Field';
import SubmitButton from '@/components/ui/SubmitButton';

export default function LoginForm() {
  const [state, formAction] = useActionState(loginAction, null);
  const username = state && !state.ok ? state.values?.username ?? '' : '';

  return (
    <form action={formAction} className="form">
      <Field label="Utilizator" htmlFor="username">
        <input id="username" name="username" autoComplete="username" required maxLength={100} defaultValue={username} />
      </Field>
      <Field label="Parola" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} />
      </Field>
      {state && !state.ok && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton label="Intra" pendingLabel="Se verifica..." />
    </form>
  );
}
