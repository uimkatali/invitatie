'use client';

import { useFormStatus } from 'react-dom';

interface SubmitButtonProps {
  label: string;
  pendingLabel?: string;
  variant?: 'primary' | 'ghost' | 'danger';
}

export default function SubmitButton({ label, pendingLabel = 'Se trimite...', variant = 'primary' }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn-${variant}`} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
