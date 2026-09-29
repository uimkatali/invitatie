'use client';

import { useActionState, useState } from 'react';
import { createInvitationAction } from './actions';
import Field from '@/components/ui/Field';
import SubmitButton from '@/components/ui/SubmitButton';
import SceneController from '@/components/scene/SceneController';
import { LIMITS, THEMES, THEME_LABELS, type ThemeId } from '@/lib/domain';

export interface InvitationDefaults {
  title: string;
  message: string;
  ideaId: string;
}

interface InvitationFormProps {
  defaults: InvitationDefaults;
  minDateTime: string;
  maxDateTime: string;
}

function isTheme(value: string | undefined): value is ThemeId {
  return THEMES.includes(value as ThemeId);
}

export default function InvitationForm({ defaults, minDateTime, maxDateTime }: InvitationFormProps) {
  const [state, formAction] = useActionState(createInvitationAction, null);
  const failed = state && !state.ok ? state : null;
  const value = (key: string, fallback = '') => failed?.values?.[key] ?? fallback;
  const error = (key: string) => failed?.fields?.[key];
  const submittedTheme = failed?.values?.theme;
  const [theme, setTheme] = useState<ThemeId>(isTheme(submittedTheme) ? submittedTheme : 'amandoua');

  return (
    <form action={formAction} className="card form">
      <SceneController theme={theme} />
      <input type="hidden" name="ideaId" defaultValue={value('ideaId', defaults.ideaId)} />

      <Field label="Titlu" htmlFor="title" error={error('title')}>
        <input
          id="title"
          name="title"
          required
          maxLength={LIMITS.titleMax}
          defaultValue={value('title', defaults.title)}
          aria-invalid={Boolean(error('title'))}
          placeholder="Cina la lumina lumanarilor"
        />
      </Field>

      <Field label="Mesaj" htmlFor="message" error={error('message')}>
        <textarea
          id="message"
          name="message"
          required
          maxLength={LIMITS.messageMax}
          defaultValue={value('message', defaults.message)}
          aria-invalid={Boolean(error('message'))}
        />
      </Field>

      <Field label="Unde" htmlFor="location" error={error('location')}>
        <input
          id="location"
          name="location"
          required
          maxLength={LIMITS.locationMax}
          defaultValue={value('location')}
          aria-invalid={Boolean(error('location'))}
        />
      </Field>

      <Field label="Cand" htmlFor="startsAt" error={error('startsAt')} hint="Ora Romaniei">
        <input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          required
          min={minDateTime}
          max={maxDateTime}
          defaultValue={value('startsAt')}
          aria-invalid={Boolean(error('startsAt'))}
        />
      </Field>

      <Field label="Dress code (optional)" htmlFor="dressCode" error={error('dressCode')}>
        <input id="dressCode" name="dressCode" maxLength={LIMITS.dressCodeMax} defaultValue={value('dressCode')} />
      </Field>

      <fieldset className="field" aria-describedby={error('theme') ? 'theme-error' : undefined}>
        <legend>Tema</legend>
        <div className="choice-grid">
          {THEMES.map((t) => (
            <label key={t} className="choice">
              <input type="radio" name="theme" value={t} defaultChecked={theme === t} onChange={() => setTheme(t)} />
              <span>{THEME_LABELS[t]}</span>
            </label>
          ))}
        </div>
        {error('theme') && (
          <p className="field-error" id="theme-error">
            {error('theme')}
          </p>
        )}
      </fieldset>

      {failed && (
        <p className="form-error" role="alert">
          {failed.error}
        </p>
      )}
      <SubmitButton label="Trimite invitatia" />
    </form>
  );
}
