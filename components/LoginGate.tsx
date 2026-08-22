'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { checkCredentials } from '../lib/auth';

// Client-side password screen — NOT real security (see lib/auth.ts). Deters casual visitors only.
interface LoginGateProps {
  title: string;
  hint: string;
  usernameLabel: string;
  passwordLabel: string;
  submitText: string;
  errorText: string;
  expectedUsername: string;
  expectedPassword: string;
  children: ReactNode;
  // Different LoginGate instances on the same site (recipient vs. owner) must
  // use different keys — otherwise unlocking one unlocks the other, since
  // localStorage is shared across the whole origin.
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = 'invitatie-unlocked';

export default function LoginGate({
  title,
  hint,
  usernameLabel,
  passwordLabel,
  submitText,
  errorText,
  expectedUsername,
  expectedPassword,
  children,
  storageKey = DEFAULT_STORAGE_KEY,
}: LoginGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(storageKey) === 'true') {
      setUnlocked(true);
    }
  }, [storageKey]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (checkCredentials(username, password, expectedUsername, expectedPassword)) {
      window.localStorage.setItem(storageKey, 'true');
      setUnlocked(true);
      setShowError(false);
    } else {
      setShowError(true);
    }
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="login-gate">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>{title}</h2>
        <p className="login-hint">{hint}</p>
        <label className="login-field">
          {usernameLabel}
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="login-field">
          {passwordLabel}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="off"
          />
        </label>
        <button type="submit">{submitText}</button>
        {showError && <p className="login-error">{errorText}</p>}
      </form>
    </div>
  );
}
