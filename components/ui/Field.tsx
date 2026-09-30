import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

interface DescribedByProps {
  hint?: string;
  error?: string;
  hintId: string;
  errorId: string;
}

function withAria(element: ReactElement, { hint, error, hintId, errorId }: DescribedByProps): ReactElement {
  const props = element.props as Record<string, unknown>;
  const existingDescribedBy = typeof props['aria-describedby'] === 'string' ? props['aria-describedby'] : undefined;
  const newIds = [hint ? hintId : null, error ? errorId : null].filter((id): id is string => Boolean(id));
  const describedBy = [existingDescribedBy, ...newIds].filter(Boolean).join(' ') || undefined;

  const patch: Record<string, unknown> = {};
  if (describedBy) patch['aria-describedby'] = describedBy;
  if (error && props['aria-invalid'] === undefined) patch['aria-invalid'] = true;

  return Object.keys(patch).length > 0 ? cloneElement(element, patch) : element;
}

export default function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;
  const content = isValidElement(children) ? withAria(children, { hint, error, hintId, errorId }) : children;

  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {content}
      {hint && (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
