'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  LOCATION_OPTIONS,
  validateSelections,
  isValid,
  type Selections,
  type SelectionsErrors,
} from '../lib/selections';

const DRAFT_KEY = 'invitatie-selections-draft';

const EMPTY_SELECTIONS: Selections = {
  location: '',
  customLocation: '',
  preferredTime: '',
  homeDetails: '',
  email: '',
};

type SubmitStatus = 'idle' | 'sending' | 'sent' | 'error';

export default function SelectionsForm() {
  const [selections, setSelections] = useState<Selections>(EMPTY_SELECTIONS);
  const [errors, setErrors] = useState<SelectionsErrors>({});
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  // The save effect below must not fire with the still-empty initial state
  // before the load effect has had a chance to apply the stored draft —
  // otherwise it overwrites the real draft in localStorage with blanks.
  const hasLoaded = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(DRAFT_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      setSelections({ ...EMPTY_SELECTIONS, ...parsed });
    } catch {
      // Corrupt draft — ignore and start fresh.
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      return;
    }
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(selections));
  }, [selections]);

  function update<K extends keyof Selections>(key: K, value: Selections[K]) {
    setSelections((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validateSelections(selections);
    setErrors(validationErrors);
    if (!isValid(validationErrors)) return;

    setStatus('sending');
    setErrorMessage('');
    try {
      const response = await fetch('/api/send-selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selections),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus('error');
        setErrorMessage(data.error ?? 'Trimiterea a esuat.');
        return;
      }
      setStatus('sent');
    } catch {
      setStatus('error');
      setErrorMessage('Trimiterea a esuat. Verifica conexiunea.');
    }
  }

  return (
    <form className="selections-form" onSubmit={handleSubmit}>
      <h2>Ce iti doresti pentru urmatorul date?</h2>

      <label className="selections-field">
        Loc / activitate
        <select
          value={selections.location}
          onChange={(event) => update('location', event.target.value as Selections['location'])}
        >
          <option value="">Alege...</option>
          {LOCATION_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.location && <span className="selections-error">{errors.location}</span>}
      </label>

      {selections.location === 'dupa-pofta-inimii' && (
        <label className="selections-field">
          Ce ai in minte?
          <input
            type="text"
            value={selections.customLocation}
            onChange={(event) => update('customLocation', event.target.value)}
          />
          {errors.customLocation && <span className="selections-error">{errors.customLocation}</span>}
        </label>
      )}

      <label className="selections-field">
        Ora preferata
        <input
          type="time"
          value={selections.preferredTime}
          onChange={(event) => update('preferredTime', event.target.value)}
        />
        {errors.preferredTime && <span className="selections-error">{errors.preferredTime}</span>}
      </label>

      {selections.location === 'acasa' && (
        <label className="selections-field">
          Ce sa gatesc / pregatim / cumparam?
          <textarea
            value={selections.homeDetails}
            onChange={(event) => update('homeDetails', event.target.value)}
          />
          {errors.homeDetails && <span className="selections-error">{errors.homeDetails}</span>}
        </label>
      )}

      <label className="selections-field">
        Emailul tau
        <input
          type="email"
          value={selections.email}
          onChange={(event) => update('email', event.target.value)}
        />
        {errors.email && <span className="selections-error">{errors.email}</span>}
      </label>

      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Se trimite...' : 'Trimite'}
      </button>

      {status === 'sent' && <p className="selections-success">Trimis! Multumesc.</p>}
      {status === 'error' && <p className="selections-error">{errorMessage}</p>}
    </form>
  );
}
